<?php

namespace App\Observers;

use App\Models\InventoryPurchase;

class InventoryPurchaseObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Orden de Compra';
    }

    protected function getCreatedDescription($model): string
    {
        return "Orden de compra creada: {$model->purchase_number}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            return "Orden de compra {$model->purchase_number} cambio a estado: {$changes['status']}";
        }
        return "Orden de compra actualizada: {$model->purchase_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Orden de compra eliminada: {$model->purchase_number}";
    }
}
