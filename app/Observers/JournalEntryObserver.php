<?php

namespace App\Observers;

use App\Models\JournalEntry;

class JournalEntryObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Registro Contable';
    }

    protected function getCreatedDescription($model): string
    {
        return "Registro contable creado: {$model->entry_number} - \${$model->total_debit}";
    }

    protected function getUpdatedDescription($model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status'])) {
            $statusLabels = [
                'draft' => 'borrador',
                'posted' => 'contabilizado',
                'voided' => 'anulado',
            ];
            $label = $statusLabels[$changes['status']] ?? $changes['status'];
            return "Registro contable {$model->entry_number} cambió a: {$label}";
        }
        return "Registro contable actualizado: {$model->entry_number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Registro contable eliminado: {$model->entry_number}";
    }
}
