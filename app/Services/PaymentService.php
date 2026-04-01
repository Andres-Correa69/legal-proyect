<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentInstallment;
use App\Models\PaymentMethod;
use App\Models\InventoryPurchase;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\AccountingAccount;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    /**
     * Registra un pago de egreso (a proveedor por compra)
     */
    public function registerExpense(
        InventoryPurchase $purchase,
        CashRegister $cashRegister,
        int $paymentMethodId,
        float $amount,
        int $userId,
        ?string $notes = null,
        ?array $installments = null,
        ?string $paymentDate = null
    ): Payment {
        // Validaciones
        $this->validatePurchasePayment($purchase, $amount);
        $this->validateCashRegister($cashRegister);

        // Validar saldo suficiente
        if ($cashRegister->current_balance < $amount) {
            throw new \Exception('Saldo insuficiente en la caja seleccionada');
        }

        DB::beginTransaction();
        try {
            // Obtener sesión activa si es caja menor
            $sessionId = $this->getActiveSessionId($cashRegister);

            // Crear el pago
            // Si la compra aun no fue recibida, marcar como pago inicial
            // para que el PurchaseObserver lo incluya en el asiento combinado
            $isInitial = !in_array($purchase->status, ['received']);

            $payment = Payment::create([
                'company_id' => $purchase->company_id,
                'branch_id' => $purchase->branch_id,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethodId,
                'type' => 'expense',
                'reference_type' => InventoryPurchase::class,
                'reference_id' => $purchase->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $amount,
                'payment_date' => $paymentDate ? \Carbon\Carbon::parse($paymentDate) : now(),
                'is_partial' => $amount < $purchase->calculateBalanceDue(),
                'is_initial_payment' => $isInitial,
                'status' => 'completed',
                'notes' => $notes,
                'created_by_user_id' => $userId,
            ]);

            // Si tiene cuotas, crearlas
            if ($installments && count($installments) > 0) {
                $this->createInstallments($payment, $installments);
            }

            // Actualizar la compra
            $this->updatePurchasePayment($purchase, $amount);

            // Actualizar el saldo de la caja (restar)
            $cashRegister->subtractFromBalance($amount);

            // Actualizar totales de la sesión si existe
            if ($sessionId) {
                $this->updateSessionTotals($sessionId, $amount, 'expense');
            }

            DB::commit();
            return $payment->fresh(['installments', 'reference']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Registra un pago de ingreso (de cliente - para futuro módulo de ventas)
     */
    public function registerIncome(
        $reference,
        CashRegister $cashRegister,
        int $paymentMethodId,
        float $amount,
        int $userId,
        ?string $notes = null,
        ?array $installments = null
    ): Payment {
        // Validaciones
        if ($amount <= 0) {
            throw new \Exception('El monto debe ser mayor a cero');
        }

        $this->validateCashRegister($cashRegister);

        DB::beginTransaction();
        try {
            // Obtener sesión activa si es caja menor
            $sessionId = $this->getActiveSessionId($cashRegister);

            // Crear el pago
            $payment = Payment::create([
                'company_id' => $reference->company_id,
                'branch_id' => $reference->branch_id ?? null,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethodId,
                'type' => 'income',
                'reference_type' => get_class($reference),
                'reference_id' => $reference->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $amount,
                'payment_date' => now(),
                'is_partial' => false,
                'status' => 'completed',
                'notes' => $notes,
                'created_by_user_id' => $userId,
            ]);

            // Si tiene cuotas, crearlas
            if ($installments && count($installments) > 0) {
                $this->createInstallments($payment, $installments);
            }

            // Actualizar el saldo de la caja
            $cashRegister->addToBalance($amount);

            // Actualizar totales de la sesión si existe
            if ($sessionId) {
                $this->updateSessionTotals($sessionId, $amount, 'income');
            }

            DB::commit();
            return $payment->fresh(['installments', 'reference']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Registra un egreso libre (sin compra asociada) con cuenta contable directa
     */
    public function registerFreeExpense(
        AccountingAccount $account,
        CashRegister $cashRegister,
        int $paymentMethodId,
        float $amount,
        int $userId,
        string $concept,
        int $companyId,
        ?int $branchId = null,
        ?string $notes = null
    ): Payment {
        if ($amount <= 0) {
            throw new \Exception('El monto debe ser mayor a cero');
        }

        $this->validateCashRegister($cashRegister);

        if ($cashRegister->current_balance < $amount) {
            throw new \Exception('Saldo insuficiente en la caja seleccionada');
        }

        DB::beginTransaction();
        try {
            $sessionId = $this->getActiveSessionId($cashRegister);

            $payment = Payment::create([
                'company_id'             => $companyId,
                'branch_id'              => $branchId,
                'cash_register_id'       => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id'      => $paymentMethodId,
                'type'                   => 'expense',
                'reference_type'         => null,
                'reference_id'           => null,
                'payment_number'         => Payment::generatePaymentNumber(),
                'amount'                 => $amount,
                'payment_date'           => now(),
                'is_partial'             => false,
                'status'                 => 'completed',
                'concept'                => $concept,
                'accounting_account_id'  => $account->id,
                'notes'                  => $notes,
                'created_by_user_id'     => $userId,
            ]);

            $cashRegister->subtractFromBalance($amount);

            if ($sessionId) {
                $this->updateSessionTotals($sessionId, $amount, 'expense');
            }

            DB::commit();
            return $payment->fresh(['paymentMethod', 'cashRegister', 'accountingAccount']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Cancela un pago
     */
    public function cancelPayment(Payment $payment, int $userId, string $reason): Payment
    {
        if ($payment->isCancelled()) {
            throw new \Exception('El pago ya está cancelado');
        }

        DB::beginTransaction();
        try {
            // Revertir el saldo de la caja
            if ($payment->isIncome()) {
                $payment->cashRegister->subtractFromBalance($payment->amount);
            } else {
                $payment->cashRegister->addToBalance($payment->amount);
            }

            // Revertir el pago en la referencia si es compra
            if ($payment->reference_type === InventoryPurchase::class) {
                $purchase = $payment->reference;
                $purchase->total_paid -= $payment->amount;
                $purchase->updatePaymentStatus();
            }

            // Revertir totales de sesión si existe
            if ($payment->cash_register_session_id) {
                $this->revertSessionTotals($payment->cash_register_session_id, $payment->amount, $payment->type);
            }

            // Marcar como cancelado
            $payment->status = 'cancelled';
            $payment->cancellation_reason = $reason;
            $payment->cancelled_by_user_id = $userId;
            $payment->cancelled_at = now();
            $payment->save();

            DB::commit();
            return $payment->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Valida un pago de compra
     */
    protected function validatePurchasePayment(InventoryPurchase $purchase, float $amount): void
    {
        if ($amount <= 0) {
            throw new \Exception('El monto debe ser mayor a cero');
        }

        // Calcular el balance pendiente actual
        $balanceDue = $purchase->calculateBalanceDue();

        if ($amount > $balanceDue) {
            throw new \Exception('El monto excede el saldo pendiente de la compra');
        }

        if ($purchase->isPaid()) {
            throw new \Exception('La compra ya está completamente pagada');
        }
    }

    /**
     * Valida que la caja pueda recibir pagos
     */
    protected function validateCashRegister(CashRegister $cashRegister): void
    {
        if (!$cashRegister->isActive()) {
            throw new \Exception('La caja no está activa');
        }

        // Si es caja menor, debe tener sesión abierta
        if ($cashRegister->isMinor() && !$cashRegister->hasOpenSession()) {
            throw new \Exception('La caja menor no tiene una sesión abierta. Debe abrirse la caja antes de registrar pagos.');
        }
    }

    /**
     * Obtiene el ID de la sesión activa si existe
     */
    protected function getActiveSessionId(CashRegister $cashRegister): ?int
    {
        if (!$cashRegister->isMinor()) {
            return null;
        }

        $session = $cashRegister->currentSession();
        return $session ? $session->id : null;
    }

    /**
     * Actualiza el pago de la compra
     */
    protected function updatePurchasePayment(InventoryPurchase $purchase, float $amount): void
    {
        $purchase->total_paid = ($purchase->total_paid ?? 0) + $amount;
        $purchase->updatePaymentStatus();
    }

    /**
     * Actualiza los totales de la sesión
     */
    protected function updateSessionTotals(int $sessionId, float $amount, string $type): void
    {
        $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
        if (!$session) {
            return;
        }

        if ($type === 'income') {
            $session->total_income += $amount;
        } else {
            $session->total_expense += $amount;
        }

        $session->save();
    }

    /**
     * Revierte los totales de la sesión al cancelar un pago
     */
    protected function revertSessionTotals(int $sessionId, float $amount, string $type): void
    {
        $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
        if (!$session) {
            return;
        }

        if ($type === 'income') {
            $session->total_income -= $amount;
        } else {
            $session->total_expense -= $amount;
        }

        $session->save();
    }

    /**
     * Crea las cuotas del pago
     */
    protected function createInstallments(Payment $payment, array $installments): void
    {
        foreach ($installments as $index => $installment) {
            PaymentInstallment::create([
                'payment_id' => $payment->id,
                'installment_number' => $index + 1,
                'amount' => $installment['amount'],
                'payment_date' => $installment['payment_date'],
                'due_date' => $installment['due_date'] ?? null,
                'status' => $installment['status'] ?? 'paid',
                'notes' => $installment['notes'] ?? null,
            ]);
        }
    }

    /**
     * Obtiene el resumen de pagos de una compra
     */
    public function getPurchasePaymentSummary(InventoryPurchase $purchase): array
    {
        $payments = $purchase->payments()
            ->where('status', 'completed')
            ->with('paymentMethod', 'cashRegister')
            ->get();

        return [
            'total_amount' => $purchase->total_amount,
            'total_paid' => $purchase->total_paid ?? 0,
            'balance_due' => $purchase->balance_due ?? $purchase->total_amount,
            'payment_status' => $purchase->payment_status,
            'payments' => $payments,
            'payment_count' => $payments->count(),
        ];
    }

    /**
     * Registra un pago de ingreso por venta (abono de cliente)
     * Similar a Zyscore: actualiza la caja y opcionalmente la sesión
     * También crea un registro en la tabla payments para visualización general
     */
    public function registerIncomeFromSale(
        Sale $sale,
        CashRegister $cashRegister,
        int $paymentMethodId,
        float $amount,
        int $userId,
        ?string $reference = null,
        ?string $notes = null
    ): SalePayment {
        // Validar que el monto sea válido
        if ($amount <= 0) {
            throw new \Exception('El monto debe ser mayor a cero');
        }

        // Validar que el monto no exceda el balance pendiente
        $currentBalance = (float)($sale->balance ?? $sale->total_amount);
        if ($amount > $currentBalance) {
            throw new \Exception('El monto excede el saldo pendiente de la venta ($' . number_format($currentBalance, 2) . ')');
        }

        // Validar que la venta no esté pagada
        if ($sale->payment_status === 'paid') {
            throw new \Exception('La venta ya está completamente pagada');
        }

        // Validar que la venta no esté cancelada
        if ($sale->status === 'cancelled') {
            throw new \Exception('No se puede registrar pagos a una venta cancelada');
        }

        // Validar la caja
        $this->validateCashRegister($cashRegister);

        DB::beginTransaction();
        try {
            $paymentMethod = PaymentMethod::findOrFail($paymentMethodId);

            // Obtener sesión activa si es caja menor
            $sessionId = $this->getActiveSessionId($cashRegister);

            // Crear el pago de la venta (SalePayment)
            $salePayment = SalePayment::create([
                'sale_id' => $sale->id,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethodId,
                'payment_method_name' => $paymentMethod->name,
                'amount' => $amount,
                'payment_date' => now(),
                'reference' => $reference,
                'notes' => $notes,
                'created_by_user_id' => $userId,
            ]);

            // También crear un registro en la tabla Payment para visualización en el módulo de pagos
            Payment::create([
                'company_id' => $sale->company_id,
                'branch_id' => $sale->branch_id ?? null,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethodId,
                'type' => 'income',
                'reference_type' => Sale::class,
                'reference_id' => $sale->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $amount,
                'payment_date' => now(),
                'is_partial' => $amount < $currentBalance,
                'status' => 'completed',
                'notes' => $notes ?? ('Pago de venta ' . $sale->invoice_number),
                'created_by_user_id' => $userId,
            ]);

            // Actualizar el estado de pago de la venta
            $sale->updatePaymentStatus();

            // Actualizar el saldo de la caja (SUMA para ingresos)
            $cashRegister->addToBalance($amount);

            // Actualizar totales de la sesión si existe
            if ($sessionId) {
                $this->updateSessionTotals($sessionId, $amount, 'income');
            }

            DB::commit();
            return $salePayment->fresh(['sale', 'paymentMethod', 'cashRegister']);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Obtiene el resumen de pagos de una venta
     */
    public function getSalePaymentSummary(Sale $sale): array
    {
        $payments = $sale->payments()
            ->with('paymentMethod', 'createdBy')
            ->orderBy('payment_date', 'desc')
            ->get();

        return [
            'total_amount' => (float)$sale->total_amount,
            'total_paid' => (float)($sale->paid_amount ?? 0),
            'balance_due' => (float)($sale->balance ?? $sale->total_amount),
            'payment_status' => $sale->payment_status,
            'payment_status_label' => $sale->getPaymentStatusLabel(),
            'payments' => $payments,
            'payment_count' => $payments->count(),
        ];
    }
}
