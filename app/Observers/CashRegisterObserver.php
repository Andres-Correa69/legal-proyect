<?php

namespace App\Observers;

use App\Models\CashRegister;

class CashRegisterObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Caja Registradora';
    }
}
