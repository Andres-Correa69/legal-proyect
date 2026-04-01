<?php

namespace App\Observers;

use App\Models\Role;

class RoleObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Rol';
    }
}
