<?php

namespace App\Observers;

use App\Models\ProductCategory;

class ProductCategoryObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Categoría de Producto';
    }
}
