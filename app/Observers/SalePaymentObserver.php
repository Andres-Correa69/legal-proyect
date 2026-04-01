<?php

namespace App\Observers;

use App\Models\SalePayment;

class SalePaymentObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Abono de Venta';
    }

    protected function getCreatedDescription($model): string
    {
        $sale = $model->sale;
        $invoiceNumber = $sale?->invoice_number ?? "#{$model->sale_id}";
        $method = $model->payment_method_name ?? 'N/A';
        return "Abono registrado en {$invoiceNumber} - \${$model->amount} ({$method})";
    }

    protected function getUpdatedDescription($model): string
    {
        $sale = $model->sale;
        $invoiceNumber = $sale?->invoice_number ?? "#{$model->sale_id}";
        return "Abono actualizado en {$invoiceNumber} - \${$model->amount}";
    }

    protected function getDeletedDescription($model): string
    {
        $sale = $model->sale;
        $invoiceNumber = $sale?->invoice_number ?? "#{$model->sale_id}";
        return "Abono eliminado de {$invoiceNumber} - \${$model->amount}";
    }
}
