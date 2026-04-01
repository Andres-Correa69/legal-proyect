<?php

namespace App\Traits;

use App\Models\Company;
use App\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToCompany
{
    protected static function bootBelongsToCompany(): void
    {
        // Aplicar el global scope para filtrar por empresa
        static::addGlobalScope(new CompanyScope);

        // Al crear un nuevo modelo, asignar automáticamente la empresa del usuario autenticado
        static::creating(function ($model) {
            if (auth()->check() && !$model->company_id && !auth()->user()->isSuperAdmin()) {
                $model->company_id = auth()->user()->company_id;
            }
        });
    }

    /**
     * Relación con la empresa
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Scope para incluir todos los registros (sin filtro de empresa)
     * Útil para super admins
     */
    public function scopeWithAllCompanies($query)
    {
        return $query->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * Scope para filtrar por empresa específica
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }
}
