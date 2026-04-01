<?php

namespace App\Observers;

use App\Models\ElectronicCreditNote;

class ElectronicCreditNoteObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Nota Crédito Electrónica';
    }

    protected function getCreatedDescription($model): string
    {
        $type = $model->type === 'void' ? '(Anulación)' : '(Ajuste)';
        return "Nota crédito electrónica emitida {$type}: {$model->number}";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Nota crédito electrónica actualizada: {$model->number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Nota crédito electrónica eliminada: {$model->number}";
    }
}
