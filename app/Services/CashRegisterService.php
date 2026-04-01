<?php

namespace App\Services;

use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\CashRegisterTransfer;
use Illuminate\Support\Facades\DB;

class CashRegisterService
{
    /**
     * Abre una nueva sesión de caja
     */
    public function openSession(CashRegister $cashRegister, float $openingBalance, int $userId): CashRegisterSession
    {
        // Validar que sea caja menor
        if (!$cashRegister->isMinor()) {
            throw new \Exception('Solo se pueden abrir sesiones en cajas menores');
        }

        // Validar que no haya una sesión abierta
        if ($cashRegister->hasOpenSession()) {
            throw new \Exception('Ya existe una sesión abierta para esta caja');
        }

        return DB::transaction(function () use ($cashRegister, $openingBalance, $userId) {
            // Crear la sesión
            $session = CashRegisterSession::create([
                'cash_register_id' => $cashRegister->id,
                'company_id' => $cashRegister->company_id,
                'branch_id' => $cashRegister->branch_id,
                'opened_by_user_id' => $userId,
                'opened_at' => now(),
                'opening_balance' => $openingBalance,
            ]);

            // Actualizar estado de la caja
            $cashRegister->status = 'open';
            $cashRegister->current_balance = $openingBalance;
            $cashRegister->save();

            return $session->fresh(['cashRegister', 'openedBy']);
        });
    }

    /**
     * Cierra una sesión de caja
     */
    public function closeSession(
        CashRegisterSession $session,
        float $actualBalance,
        int $userId,
        ?int $transferToCashRegisterId = null,
        ?string $notes = null
    ): CashRegisterSession {
        // Validar que la sesión esté abierta
        if (!$session->isOpen()) {
            throw new \Exception('La sesión ya está cerrada');
        }

        return DB::transaction(function () use ($session, $actualBalance, $userId, $transferToCashRegisterId, $notes) {
            $cashRegister = $session->cashRegister;

            // Calcular balances
            $expectedBalance = $session->calculateExpectedBalance();
            $difference = $actualBalance - $expectedBalance;

            // Registrar cierre
            $session->closed_at = now();
            $session->closed_by_user_id = $userId;
            $session->expected_balance = $expectedBalance;
            $session->closing_balance = $actualBalance;
            $session->difference = $difference;
            $session->notes = $notes;
            $session->save();

            // Actualizar caja
            $cashRegister->status = 'closed';
            $cashRegister->current_balance = $actualBalance;
            $cashRegister->save();

            // Si se seleccionó una caja destino, transferir el saldo
            if ($transferToCashRegisterId && $actualBalance > 0) {
                $this->transferOnClose($session, $transferToCashRegisterId, $userId);
            }

            return $session->fresh(['cashRegister', 'openedBy', 'closedBy']);
        });
    }

    /**
     * Transfiere el saldo a otra caja al cerrar sesión
     */
    protected function transferOnClose(CashRegisterSession $session, int $targetCashRegisterId, int $userId): void
    {
        $cashRegister = $session->cashRegister;

        $targetCashRegister = CashRegister::where('company_id', $cashRegister->company_id)
            ->where('id', $targetCashRegisterId)
            ->where('is_active', true)
            ->first();

        if (!$targetCashRegister) {
            throw new \Exception('La caja destino no existe o no está activa');
        }

        if ($targetCashRegister->id === $cashRegister->id) {
            throw new \Exception('La caja destino debe ser diferente a la caja actual');
        }

        // Crear transferencia
        $transferNumber = 'TRANS-' . now()->format('YmdHis') . '-' . rand(1000, 9999);

        CashRegisterTransfer::create([
            'company_id' => $cashRegister->company_id,
            'branch_id' => $cashRegister->branch_id,
            'transfer_number' => $transferNumber,
            'source_cash_register_id' => $cashRegister->id,
            'destination_cash_register_id' => $targetCashRegister->id,
            'amount' => $session->closing_balance,
            'created_by_user_id' => $userId,
            'status' => 'completed',
            'notes' => "Transferencia al cerrar caja (Sesión #{$session->id})",
        ]);

        // Actualizar balances
        $cashRegister->current_balance = 0;
        $cashRegister->save();

        $targetCashRegister->addToBalance($session->closing_balance);
    }

    /**
     * Obtiene el resumen de una sesión
     */
    public function getSessionSummary(CashRegisterSession $session): array
    {
        // Calcular totales de pagos
        $totalIncome = $session->payments()
            ->where('type', 'income')
            ->where('status', 'completed')
            ->sum('amount');

        $totalExpense = $session->payments()
            ->where('type', 'expense')
            ->where('status', 'completed')
            ->sum('amount');

        // Calcular saldo esperado
        $expectedBalance = $session->opening_balance + $totalIncome - $totalExpense;

        return [
            'opening_balance' => $session->opening_balance,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'expected_balance' => $expectedBalance,
        ];
    }

    /**
     * Realiza una transferencia entre cajas
     */
    public function transferBetweenRegisters(
        CashRegister $fromRegister,
        CashRegister $toRegister,
        float $amount,
        int $userId,
        ?string $notes = null
    ): CashRegisterTransfer {
        // Validaciones
        if ($fromRegister->id === $toRegister->id) {
            throw new \Exception('La caja origen y destino deben ser diferentes');
        }

        if ($amount <= 0) {
            throw new \Exception('El monto debe ser mayor a cero');
        }

        if ($fromRegister->current_balance < $amount) {
            throw new \Exception('Saldo insuficiente en la caja origen');
        }

        return DB::transaction(function () use ($fromRegister, $toRegister, $amount, $userId, $notes) {
            // Crear la transferencia
            $transfer = CashRegisterTransfer::create([
                'company_id' => $fromRegister->company_id,
                'branch_id' => $fromRegister->branch_id,
                'source_cash_register_id' => $fromRegister->id,
                'destination_cash_register_id' => $toRegister->id,
                'amount' => $amount,
                'notes' => $notes,
                'created_by_user_id' => $userId,
                'status' => 'completed',
            ]);

            // Actualizar balances
            $fromRegister->subtractFromBalance($amount);
            $toRegister->addToBalance($amount);

            return $transfer->fresh([
                'sourceCashRegister',
                'destinationCashRegister',
                'createdBy',
            ]);
        });
    }

    /**
     * Cancela una transferencia
     */
    public function cancelTransfer(
        CashRegisterTransfer $transfer,
        int $userId,
        string $reason
    ): CashRegisterTransfer {
        // Validar que no esté ya cancelada
        if ($transfer->isCancelled()) {
            throw new \Exception('La transferencia ya está cancelada');
        }

        return DB::transaction(function () use ($transfer, $userId, $reason) {
            $fromRegister = $transfer->sourceCashRegister;
            $toRegister = $transfer->destinationCashRegister;

            // Revertir los saldos (operación inversa)
            $fromRegister->addToBalance($transfer->amount);
            $toRegister->subtractFromBalance($transfer->amount);

            // Actualizar la transferencia
            $transfer->status = 'cancelled';
            $transfer->cancellation_reason = $reason;
            $transfer->cancelled_by_user_id = $userId;
            $transfer->cancelled_at = now();
            $transfer->save();

            return $transfer->fresh([
                'sourceCashRegister',
                'destinationCashRegister',
                'createdBy',
                'cancelledBy',
            ]);
        });
    }
}
