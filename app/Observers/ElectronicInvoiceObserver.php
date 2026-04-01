<?php

namespace App\Observers;

use App\Models\ElectronicInvoice;

class ElectronicInvoiceObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Factura Electrónica DIAN';
    }

    protected function getCreatedDescription($model): string
    {
        return "Factura electrónica emitida: {$model->number} - UUID: {$model->uuid}";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Factura electrónica actualizada: {$model->number}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Factura electrónica eliminada: {$model->number}";
    }
}
