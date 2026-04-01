<?php

namespace App\Observers;

use App\Models\CashRegisterTransfer;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use Illuminate\Support\Facades\Log;

class AccountingCashTransferObserver
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Cuando se crea una transferencia entre cajas:
     * DR Caja destino → monto
     * CR Caja origen → monto
     */
    public function created(CashRegisterTransfer $transfer): void
    {
        try {
            if ($transfer->status !== 'completed') {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($transfer->company_id)) {
                return;
            }

            $this->createTransferEntry($transfer);
        } catch (\Exception $e) {
            Log::error('AccountingCashTransferObserver::created - Error creando registro contable', [
                'transfer_id' => $transfer->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Cuando se cancela una transferencia, reversar el asiento
     */
    public function updated(CashRegisterTransfer $transfer): void
    {
        try {
            if (!$transfer->isDirty('status') || $transfer->status !== 'cancelled') {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($transfer->company_id)) {
                return;
            }

            $this->reverseTransferEntry($transfer);
        } catch (\Exception $e) {
            Log::error('AccountingCashTransferObserver::updated - Error reversando registro contable', [
                'transfer_id' => $transfer->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function createTransferEntry(CashRegisterTransfer $transfer): void
    {
        // Obtener cuentas de las cajas
        $sourceAccount = $this->accountingService->getCashRegisterAccount($transfer->source_cash_register_id);
        $destAccount = $this->accountingService->getCashRegisterAccount($transfer->destination_cash_register_id);

        // Fallback a cuentas default
        if (!$sourceAccount) {
            $sourceAccount = $this->accountingService->getAccountByCode($transfer->company_id, '11050501');
        }
        if (!$destAccount) {
            $destAccount = $this->accountingService->getAccountByCode($transfer->company_id, '11050501');
        }

        if (!$sourceAccount || !$destAccount) {
            Log::warning('AccountingCashTransferObserver: Cuentas no configuradas para transferencia', [
                'transfer_id' => $transfer->id,
            ]);
            return;
        }

        // Evitar asiento si ambas cajas usan la misma cuenta
        if ($sourceAccount->id === $destAccount->id) {
            return;
        }

        $amount = (float) $transfer->amount;
        $lines = [];

        // DR: Caja destino (entra dinero)
        $lines[] = [
            'account_id' => $destAccount->id,
            'debit' => $amount,
            'credit' => 0,
            'description' => "Transferencia recibida {$transfer->transfer_number}",
        ];

        // CR: Caja origen (sale dinero)
        $lines[] = [
            'account_id' => $sourceAccount->id,
            'debit' => 0,
            'credit' => $amount,
            'description' => "Transferencia enviada {$transfer->transfer_number}",
        ];

        $this->accountingService->createAutoEntry(
            $transfer,
            'cash_transfer_completed',
            $lines,
            "Transferencia {$transfer->transfer_number}"
        );
    }

    private function reverseTransferEntry(CashRegisterTransfer $transfer): void
    {
        $originalEntry = JournalEntry::where('reference_type', CashRegisterTransfer::class)
            ->where('reference_id', $transfer->id)
            ->where('status', 'posted')
            ->where('auto_source', 'cash_transfer_completed')
            ->first();

        if ($originalEntry) {
            $originalEntry->load('lines');
            $this->accountingService->createReversalEntry($originalEntry, "Anulacion de transferencia {$transfer->transfer_number}");
        }
    }
}
