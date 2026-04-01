<?php

namespace App\Observers;

use App\Models\Supplier;

class SupplierObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Proveedor';
    }
}
