<?php

namespace App\Observers;

use App\Models\AccountingAccount;

class AccountingAccountObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Cuenta Contable';
    }

    protected function getCreatedDescription($model): string
    {
        return "Cuenta contable creada: {$model->code} - {$model->name}";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Cuenta contable actualizada: {$model->code} - {$model->name}";
    }

    protected function getDeletedDescription($model): string
    {
        return "Cuenta contable eliminada: {$model->code} - {$model->name}";
    }
}
