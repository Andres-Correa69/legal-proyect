<?php

namespace App\Observers;

use App\Models\AccountingAccount;
use App\Models\InventoryPurchase;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Sale;
use App\Services\AccountingService;
use Illuminate\Support\Facades\Log;

class AccountingPaymentObserver
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Cuando se crea un pago:
     * - Income (cliente paga): DR Caja → CR CxC (solo para pagos posteriores, no iniciales)
     * - Expense (pago a proveedor): DR CxP → CR Caja (o entrada combinada para compras contado)
     */
    public function created(Payment $payment): void
    {
        try {
            if ($payment->status !== 'completed') {
                return;
            }

            // Pagos iniciales ya son contabilizados por el SaleObserver o PurchaseObserver
            if ($payment->is_initial_payment) {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($payment->company_id)) {
                return;
            }

            if ($payment->isIncome()) {
                $this->createIncomeEntry($payment);
            } else {
                $this->createExpenseEntry($payment);
            }
        } catch (\Exception $e) {
            Log::error('AccountingPaymentObserver::created - Error creando registro contable', [
                'payment_id' => $payment->id,
                'type' => $payment->type,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Cuando se cancela un pago, reversar el asiento
     */
    public function updated(Payment $payment): void
    {
        try {
            if (!$payment->isDirty('status') || $payment->status !== 'cancelled') {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($payment->company_id)) {
                return;
            }

            $this->reversePaymentEntry($payment);
        } catch (\Exception $e) {
            Log::error('AccountingPaymentObserver::updated - Error reversando registro contable', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Pago de ingreso (cliente paga):
     * DR Caja (cuenta de la caja donde se recibio) → monto
     * CR CxC (130505) → monto
     */
    private function createIncomeEntry(Payment $payment): void
    {
        $lines = [];

        // Obtener cuenta de la caja
        $cashAccount = null;
        if ($payment->cash_register_id) {
            $cashAccount = $this->accountingService->getCashRegisterAccount($payment->cash_register_id);
        }
        // Fallback a cuenta default de caja
        if (!$cashAccount) {
            $cashAccount = $this->accountingService->getAccountByCode($payment->company_id, '11050501');
        }

        // Obtener cuenta CxC
        $cxcAccount = $this->accountingService->getAccountByCode($payment->company_id, '13050501');

        if (!$cashAccount || !$cxcAccount) {
            Log::warning('AccountingPaymentObserver: Cuentas no configuradas para pago de ingreso', [
                'payment_id' => $payment->id,
                'company_id' => $payment->company_id,
            ]);
            return;
        }

        $amount = (float) $payment->amount;

        // DR: Caja (entra dinero)
        $lines[] = [
            'account_id' => $cashAccount->id,
            'debit' => $amount,
            'credit' => 0,
            'description' => "Recaudo {$payment->payment_number}",
        ];

        // CR: CxC (cliente ya no debe)
        $lines[] = [
            'account_id' => $cxcAccount->id,
            'debit' => 0,
            'credit' => $amount,
            'description' => "Abono CxC {$payment->payment_number}",
        ];

        $description = "Pago recibido {$payment->payment_number}";
        if ($payment->reference_type === Sale::class) {
            $sale = Sale::find($payment->reference_id);
            if ($sale) {
                $description .= " - Venta {$sale->invoice_number}";
            }
        }

        $this->accountingService->createAutoEntry($payment, 'payment_income_created', $lines, $description);
    }

    /**
     * Pago de egreso:
     * - Si tiene accounting_account_id (egreso libre): DR [cuenta seleccionada] → CR Caja
     * - Si es pago de compra contado sin asiento previo: entrada combinada (DR Inventario + IVA / CR Caja + CxP)
     * - Si es pago de compra credito o con asiento previo: DR CxP → CR Caja
     */
    private function createExpenseEntry(Payment $payment): void
    {
        // Egreso libre: usar la cuenta contable directamente seleccionada
        if ($payment->accounting_account_id) {
            $this->createFreeExpenseEntry($payment);
            return;
        }

        // Pago de compra: verificar si es compra contado sin asiento previo
        if ($payment->reference_type === InventoryPurchase::class && $payment->reference_id) {
            $purchase = InventoryPurchase::find($payment->reference_id);

            if ($purchase && !$purchase->is_credit) {
                // Compra de contado: verificar si ya existe asiento purchase_received
                $existingEntry = JournalEntry::where('reference_type', InventoryPurchase::class)
                    ->where('reference_id', $purchase->id)
                    ->where('auto_source', 'purchase_received')
                    ->where('status', 'posted')
                    ->exists();

                if (!$existingEntry) {
                    // Primer pago de compra contado sin asiento: crear entrada combinada
                    $this->createCashPurchaseEntry($payment, $purchase);
                    return;
                }
            }
        }

        // Flujo estandar: DR CxP / CR Caja
        $this->createStandardExpenseEntry($payment);
    }

    /**
     * Entrada combinada para compra de contado:
     * DR Inventario + DR IVA / CR Caja (pagado) + CR CxP (restante si es parcial)
     */
    private function createCashPurchaseEntry(Payment $payment, InventoryPurchase $purchase): void
    {
        // Obtener cuenta de la caja
        $cashAccount = null;
        if ($payment->cash_register_id) {
            $cashAccount = $this->accountingService->getCashRegisterAccount($payment->cash_register_id);
        }
        if (!$cashAccount) {
            $cashAccount = $this->accountingService->getAccountByCode($payment->company_id, '11050501');
        }

        if (!$cashAccount) {
            Log::warning('AccountingPaymentObserver: Cuenta de caja no configurada para compra contado', [
                'payment_id' => $payment->id,
            ]);
            return;
        }

        $this->accountingService->createPurchaseReceivedEntry($purchase, [
            ['amount' => (float) $payment->amount, 'account_id' => $cashAccount->id],
        ]);
    }

    /**
     * Egreso libre (con accounting_account_id): DR [cuenta seleccionada] → CR Caja
     */
    private function createFreeExpenseEntry(Payment $payment): void
    {
        $lines = [];

        $cashAccount = null;
        if ($payment->cash_register_id) {
            $cashAccount = $this->accountingService->getCashRegisterAccount($payment->cash_register_id);
        }
        if (!$cashAccount) {
            $cashAccount = $this->accountingService->getAccountByCode($payment->company_id, '11050501');
        }

        $debitAccount = AccountingAccount::find($payment->accounting_account_id);

        if (!$cashAccount || !$debitAccount) {
            return;
        }

        $amount = (float) $payment->amount;

        $lines[] = [
            'account_id' => $debitAccount->id,
            'debit' => $amount,
            'credit' => 0,
            'description' => "Egreso {$payment->payment_number}",
        ];

        $lines[] = [
            'account_id' => $cashAccount->id,
            'debit' => 0,
            'credit' => $amount,
            'description' => "Egreso {$payment->payment_number}",
        ];

        $description = $payment->attributes['concept'] ?? "Egreso libre {$payment->payment_number}";

        $this->accountingService->createAutoEntry($payment, 'payment_expense_created', $lines, $description);
    }

    /**
     * Flujo estandar de egreso: DR CxP → CR Caja
     */
    private function createStandardExpenseEntry(Payment $payment): void
    {
        $lines = [];

        // Obtener cuenta de la caja
        $cashAccount = null;
        if ($payment->cash_register_id) {
            $cashAccount = $this->accountingService->getCashRegisterAccount($payment->cash_register_id);
        }
        if (!$cashAccount) {
            $cashAccount = $this->accountingService->getAccountByCode($payment->company_id, '11050501');
        }

        // Determinar la cuenta a debitar
        $debitAccount = null;

        // Egreso por compra: usar CxP del proveedor
        if ($payment->reference_type === InventoryPurchase::class) {
            $purchase = InventoryPurchase::find($payment->reference_id);
            if ($purchase && $purchase->supplier_id) {
                $debitAccount = $this->accountingService->getSupplierAccount($purchase->supplier_id);
            }
        }

        // Fallback: cuenta CxP genérica
        if (!$debitAccount) {
            $debitAccount = $this->accountingService->getAccountByCode($payment->company_id, '22050501');
        }

        if (!$cashAccount || !$debitAccount) {
            Log::warning('AccountingPaymentObserver: Cuentas no configuradas para pago de egreso', [
                'payment_id' => $payment->id,
                'company_id' => $payment->company_id,
            ]);
            return;
        }

        $amount = (float) $payment->amount;

        // DR: Cuenta de egreso (CxP)
        $lines[] = [
            'account_id' => $debitAccount->id,
            'debit' => $amount,
            'credit' => 0,
            'description' => "Pago proveedor {$payment->payment_number}",
        ];

        // CR: Caja (sale dinero)
        $lines[] = [
            'account_id' => $cashAccount->id,
            'debit' => 0,
            'credit' => $amount,
            'description' => "Egreso {$payment->payment_number}",
        ];

        $description = "Pago a proveedor {$payment->payment_number}";

        if ($payment->reference_type === InventoryPurchase::class) {
            $purchase = InventoryPurchase::find($payment->reference_id);
            if ($purchase) {
                $description .= " - Compra {$purchase->purchase_number}";
            }
        }

        $this->accountingService->createAutoEntry($payment, 'payment_expense_created', $lines, $description);
    }

    private function reversePaymentEntry(Payment $payment): void
    {
        $autoSource = $payment->type === 'income' ? 'payment_income_created' : 'payment_expense_created';

        $originalEntry = JournalEntry::where('reference_type', Payment::class)
            ->where('reference_id', $payment->id)
            ->where('status', 'posted')
            ->where('auto_source', $autoSource)
            ->first();

        if ($originalEntry) {
            $originalEntry->load('lines');
            $this->accountingService->createReversalEntry($originalEntry, "Anulacion de pago {$payment->payment_number}");
        }
    }
}
