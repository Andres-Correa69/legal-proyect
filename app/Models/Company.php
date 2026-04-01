<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'tax_id',
        'parent_id',
        'is_active',
        'settings',
        'logo_url',
        'logo_icon_url',
        // Electronic Invoicing fields
        'electronic_invoicing_token',
        'electronic_invoicing_registered',
        'electronic_invoicing_registered_at',
        'ei_type_document_identification_id',
        'ei_type_organization_id',
        'ei_type_regime_id',
        'ei_type_liability_id',
        'ei_municipality_id',
        'ei_business_name',
        'ei_merchant_registration',
        'ei_address',
        'ei_phone',
        'ei_email',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'electronic_invoicing_registered' => 'boolean',
        'electronic_invoicing_registered_at' => 'datetime',
    ];

    /**
     * Relación: Una empresa puede tener muchas sucursales
     */
    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Relación: Una empresa puede tener muchos usuarios
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Relación: Una empresa puede tener una empresa padre (franquicia)
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'parent_id');
    }

    /**
     * Relación: Una empresa puede tener muchas empresas hijas (franquicias)
     */
    public function children(): HasMany
    {
        return $this->hasMany(Company::class, 'parent_id');
    }

    /**
     * Relación: Una empresa puede tener roles personalizados
     */
    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    /**
     * Verifica si es una franquicia
     */
    public function isFranchise(): bool
    {
        return $this->parent_id !== null;
    }

    /**
     * Verifica si tiene franquicias hijas
     */
    public function hasFranchises(): bool
    {
        return $this->children()->exists();
    }

    /**
     * Obtiene la sucursal principal
     */
    public function mainBranch(): ?Branch
    {
        return $this->branches()->where('is_main', true)->first();
    }

    /**
     * Scope para empresas activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para empresas principales (no franquicias)
     */
    public function scopeMain($query)
    {
        return $query->whereNull('parent_id');
    }
}
