<?php

namespace App\Observers;

use Illuminate\Database\Eloquent\Model;

class InternalNoteObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Nota Interna';
    }

    protected function getCreatedDescription(Model $model): string
    {
        $typeLabel = $model->isCredit() ? 'Crédito' : 'Débito';
        $invoiceNumber = $model->sale?->invoice_number ?? 'N/A';
        return "Nota {$typeLabel} Interna creada: {$model->note_number} - Total: \${$model->total_amount} - Venta: {$invoiceNumber}";
    }

    protected function getUpdatedDescription(Model $model): string
    {
        $changes = $model->getChanges();
        if (isset($changes['status']) && $changes['status'] === 'cancelled') {
            return "Nota Interna anulada: {$model->note_number}";
        }
        return "Nota Interna actualizada: {$model->note_number}";
    }

    protected function getDeletedDescription(Model $model): string
    {
        return "Nota Interna eliminada: {$model->note_number}";
    }
}
