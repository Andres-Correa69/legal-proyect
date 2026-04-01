<?php

namespace App\Observers;

use App\Models\PaymentMethod;

class PaymentMethodObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Método de Pago';
    }
}
