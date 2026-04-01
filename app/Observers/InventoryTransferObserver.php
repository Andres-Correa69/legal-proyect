<?php

namespace App\Observers;

use App\Models\InventoryTransfer;

class InventoryTransferObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Transferencia de Inventario';
    }

    protected function getCreatedDescription($model): string
    {
        return "Transferencia creada: {$model->transfer_number}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            return "Transferencia {$model->transfer_number} cambio a estado: {$changes['status']}";
        }
        return "Transferencia actualizada: {$model->transfer_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Transferencia eliminada: {$model->transfer_number}";
    }
}
