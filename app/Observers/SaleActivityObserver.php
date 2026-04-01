<?php

namespace App\Observers;

use App\Models\Sale;

class SaleActivityObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Venta';
    }

    protected function getCreatedDescription($model): string
    {
        return "Venta creada: {$model->invoice_number} - Total: \${$model->total_amount}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            $statusLabels = [
                'draft' => 'borrador',
                'completed' => 'completada',
                'cancelled' => 'anulada',
            ];
            $label = $statusLabels[$changes['status']] ?? $changes['status'];
            return "Venta {$model->invoice_number} cambió a estado: {$label}";
        }
        if (isset($changes['payment_status'])) {
            $paymentLabels = [
                'pending' => 'pendiente',
                'partial' => 'parcial',
                'paid' => 'pagada',
            ];
            $label = $paymentLabels[$changes['payment_status']] ?? $changes['payment_status'];
            return "Venta {$model->invoice_number} - pago: {$label}";
        }
        return "Venta actualizada: {$model->invoice_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Venta eliminada: {$model->invoice_number}";
    }
}
