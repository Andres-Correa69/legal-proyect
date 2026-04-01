<?php

namespace App\Observers;

use App\Models\InventoryAdjustment;

class InventoryAdjustmentObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Ajuste de Inventario';
    }

    protected function getCreatedDescription($model): string
    {
        return "Ajuste de inventario creado: {$model->adjustment_number}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            return "Ajuste {$model->adjustment_number} cambio a estado: {$changes['status']}";
        }
        return "Ajuste de inventario actualizado: {$model->adjustment_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Ajuste de inventario eliminado: {$model->adjustment_number}";
    }
}
