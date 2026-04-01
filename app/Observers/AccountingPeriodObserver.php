<?php

namespace App\Observers;

use App\Models\AccountingPeriod;

class AccountingPeriodObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Período Contable';
    }

    protected function getCreatedDescription($model): string
    {
        return "Período contable creado: {$model->name}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            $statusLabels = [
                'open' => 'abierto',
                'closed' => 'cerrado',
            ];
            $label = $statusLabels[$changes['status']] ?? $changes['status'];
            return "Período contable {$model->name} cambió a: {$label}";
        }
        return "Período contable actualizado: {$model->name}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Período contable eliminado: {$model->name}";
    }
}
