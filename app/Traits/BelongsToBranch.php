<?php

namespace App\Traits;

use App\Models\Branch;
use App\Scopes\BranchScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToBranch
{
    protected static function bootBelongsToBranch(): void
    {
        // Aplicar el global scope para filtrar por sucursal
        static::addGlobalScope(new BranchScope);

        // Al crear un nuevo modelo, asignar automáticamente la sucursal del usuario autenticado
        static::creating(function ($model) {
            if (auth()->check() && !$model->branch_id && !auth()->user()->isSuperAdmin()) {
                $model->branch_id = auth()->user()->branch_id;
            }
        });
    }

    /**
     * Relación con la sucursal
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Scope para incluir todos los registros (sin filtro de sucursal)
     */
    public function scopeWithAllBranches($query)
    {
        return $query->withoutGlobalScope(BranchScope::class);
    }

    /**
     * Scope para filtrar por sucursal específica
     */
    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }
}
