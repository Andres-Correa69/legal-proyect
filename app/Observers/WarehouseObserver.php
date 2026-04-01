<?php

namespace App\Observers;

use App\Models\Warehouse;

class WarehouseObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Bodega';
    }
}
