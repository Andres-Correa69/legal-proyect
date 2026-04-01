<?php

namespace App\Observers;

use App\Models\Branch;

class BranchObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Sucursal';
    }
}
