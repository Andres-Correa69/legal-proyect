<?php

namespace App\Observers;

use App\Models\ProductType;

class ProductTypeObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Tipo de Producto';
    }
}
