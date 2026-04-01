<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Si hay un usuario autenticado y no es super admin
        if (auth()->check() && !auth()->user()->isSuperAdmin()) {
            $user = auth()->user();

            // Si el usuario tiene una empresa asignada
            if ($user->company_id) {
                // Filtrar por la empresa del usuario o sus franquicias hijas
                $builder->where(function ($query) use ($user, $model) {
                    $query->where($model->getTable() . '.company_id', $user->company_id);

                    // Si la empresa tiene franquicias, incluirlas
                    if ($user->company && $user->company->hasFranchises()) {
                        $franchiseIds = $user->company->children()->pluck('id')->toArray();
                        if (!empty($franchiseIds)) {
                            $query->orWhereIn($model->getTable() . '.company_id', $franchiseIds);
                        }
                    }
                });
            }
        }
    }
}
