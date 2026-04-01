<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Si hay un usuario autenticado y no es super admin
        if (auth()->check() && !auth()->user()->isSuperAdmin()) {
            $user = auth()->user();

            // Si el usuario tiene una sucursal específica asignada, filtrar por ella
            if ($user->branch_id) {
                $builder->where($model->getTable() . '.branch_id', $user->branch_id);
            }
        }
    }
}
