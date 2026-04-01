<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'company_id',
    ];

    /**
     * Relación: Un rol puede pertenecer a una empresa (si es customizado)
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Relación muchos a muchos: Un rol puede tener muchos usuarios
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    /**
     * Relación muchos a muchos: Un rol puede tener muchos permisos
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    /**
     * Verifica si es un rol del sistema (sin company_id)
     */
    public function isSystemRole(): bool
    {
        return $this->company_id === null;
    }

    /**
     * Verifica si el rol tiene un permiso específico
     */
    public function hasPermission(string $permissionSlug): bool
    {
        return $this->permissions()->where('slug', $permissionSlug)->exists();
    }

    /**
     * Scope para roles visibles por una empresa
     */
    public function scopeVisibleForCompany($query, ?int $companyId)
    {
        return $query->where(function ($q) use ($companyId) {
            $q->whereNull('company_id'); // Roles del sistema
            if ($companyId) {
                $q->orWhere('company_id', $companyId); // Roles de su empresa
            }
        });
    }

    /**
     * Scope para roles del sistema
     */
    public function scopeSystem($query)
    {
        return $query->whereNull('company_id');
    }
}
