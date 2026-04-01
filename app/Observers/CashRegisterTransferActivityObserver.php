<?php

namespace App\Observers;

use App\Models\CashRegisterTransfer;

class CashRegisterTransferActivityObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Transferencia de Caja';
    }

    protected function getCreatedDescription($model): string
    {
        $from = $model->fromRegister->name ?? "#{$model->from_cash_register_id}";
        $to = $model->toRegister->name ?? "#{$model->to_cash_register_id}";
        return "Transferencia de caja: {$from} → {$to} - \${$model->amount}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status']) && $changes['status'] === 'cancelled') {
            return "Transferencia de caja cancelada: #{$model->id} - \${$model->amount}";
        }
        return "Transferencia de caja actualizada: #{$model->id}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Transferencia de caja eliminada: #{$model->id}";
    }
}
