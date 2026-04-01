<?php

namespace App\Observers;

use App\Models\InventoryPurchase;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Services\AccountingService;
use Illuminate\Support\Facades\Log;

class AccountingPurchaseObserver
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Cuando una compra cambia a estado 'received':
     * - Carga pagos iniciales (is_initial_payment) y los incluye como CR Caja/Banco
     * - El restante va a CR CxP
     * - Si es contado sin pagos previos: difiere al PaymentObserver
     */
    public function updated(InventoryPurchase $purchase): void
    {
        try {
            if (!$purchase->isDirty('status') || $purchase->status !== 'received') {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($purchase->company_id)) {
                return;
            }

            // Verificar si ya existe un asiento purchase_received (creado por PaymentObserver para compras contado)
            $existingEntry = JournalEntry::where('reference_type', InventoryPurchase::class)
                ->where('reference_id', $purchase->id)
                ->where('auto_source', 'purchase_received')
                ->where('status', 'posted')
                ->exists();

            if ($existingEntry) {
                return;
            }

            // Cargar pagos iniciales (hechos antes de recibir la mercancia)
            $initialPayments = Payment::where('reference_type', InventoryPurchase::class)
                ->where('reference_id', $purchase->id)
                ->where('is_initial_payment', true)
                ->where('status', 'completed')
                ->get();

            // Compra de contado sin pagos previos: diferir al PaymentObserver
            if (!$purchase->is_credit && $initialPayments->isEmpty()) {
                return;
            }

            // Construir array de creditos en caja/banco agrupados por caja
            $cashCredits = [];
            if ($initialPayments->isNotEmpty()) {
                $grouped = $initialPayments->groupBy('cash_register_id');

                foreach ($grouped as $cashRegisterId => $payments) {
                    $totalForRegister = $payments->sum('amount');

                    $cashAccount = $this->accountingService->getCashRegisterAccount($cashRegisterId)
                        ?? $this->accountingService->getAccountByCode($purchase->company_id, '11050501');

                    if ($cashAccount && $totalForRegister > 0) {
                        $cashCredits[] = [
                            'amount' => $totalForRegister,
                            'account_id' => $cashAccount->id,
                        ];
                    }
                }
            }

            // Crear asiento: DR Inventario + IVA / CR Cash (pagos iniciales) + CR CxP (restante)
            $this->accountingService->createPurchaseReceivedEntry($purchase, $cashCredits);
        } catch (\Exception $e) {
            Log::error('AccountingPurchaseObserver::updated - Error creando registro contable', [
                'purchase_id' => $purchase->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
