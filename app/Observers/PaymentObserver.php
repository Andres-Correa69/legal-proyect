<?php

namespace App\Observers;

use App\Models\Payment;

class PaymentObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Pago';
    }

    protected function getCreatedDescription($model): string
    {
        $type = $model->type === 'income' ? 'Ingreso' : 'Egreso';
        return "{$type} registrado: {$model->payment_number} - \${$model->amount}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status']) && $changes['status'] === 'cancelled') {
            return "Pago cancelado: {$model->payment_number}";
        }
        return "Pago actualizado: {$model->payment_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Pago eliminado: {$model->payment_number}";
    }
}
