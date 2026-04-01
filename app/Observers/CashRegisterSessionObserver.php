<?php

namespace App\Observers;

use App\Models\CashRegisterSession;

class CashRegisterSessionObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Sesión de Caja';
    }

    protected function getCreatedDescription($model): string
    {
        $registerName = $model->cashRegister->name ?? "#{$model->cash_register_id}";
        return "Sesión de caja abierta: {$registerName} - Base: \${$model->opening_amount}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        $registerName = $model->cashRegister->name ?? "#{$model->cash_register_id}";
        if (isset($changes['status']) && $changes['status'] === 'closed') {
            return "Sesión de caja cerrada: {$registerName} - Cierre: \${$model->closing_amount}";
        }
        return "Sesión de caja actualizada: {$registerName}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Sesión de caja eliminada: #{$model->id}";
    }
}
