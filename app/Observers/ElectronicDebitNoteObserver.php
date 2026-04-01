<?php

namespace App\Observers;

use App\Models\ElectronicDebitNote;

class ElectronicDebitNoteObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Nota Débito Electrónica';
    }

    protected function getCreatedDescription($model): string
    {
        return "Nota débito electrónica emitida: {$model->number}";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Nota débito electrónica actualizada: {$model->number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Nota débito electrónica eliminada: {$model->number}";
    }
}
