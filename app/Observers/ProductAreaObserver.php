<?php

namespace App\Observers;

use App\Models\ProductArea;

class ProductAreaObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Área de Producto';
    }
}
