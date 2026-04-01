<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'business_name',
        'legal_representative',
        'email',
        'password',
        'company_id',
        'branch_id',
        'document_id',
        'document_type',
        'phone',
        'whatsapp_country',
        'whatsapp_number',
        'address',
        'birth_date',
        'gender',
        'occupation',
        'avatar_url',
        'signature_url',
        'is_active',
        'country_code',
        'country_name',
        'state_code',
        'state_name',
        'city_name',
        'neighborhood',
        'commune',
        'referral_source',
        'contact_preference',
        'preferred_schedule',
        'observations',
        'tags',
        'social_networks',
        'email_2fa_enabled',
        'email_2fa_enabled_at',
        // Employment fields
        'salary',
        'contract_type',
        'admission_date',
        'bank_name',
        'account_type',
        'account_number',
        'eps_name',
        'pension_fund_name',
        'arl_name',
        'compensation_fund_name',
        'risk_level',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'birth_date' => 'date',
            'is_active' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
            'email_2fa_enabled' => 'boolean',
            'email_2fa_enabled_at' => 'datetime',
            'tags' => 'array',
            'social_networks' => 'array',
            'salary' => 'float',
            'admission_date' => 'date',
            'risk_level' => 'integer',
        ];
    }

    /**
     * Relación: Usuario pertenece a una empresa
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Relación: Usuario pertenece a una sucursal
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Relación: Usuario tiene muchos roles
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    /**
     * Verifica si el usuario tiene un rol específico
     */
    public function hasRole(string $roleSlug): bool
    {
        if ($this->relationLoaded('roles')) {
            return $this->roles->contains('slug', $roleSlug);
        }
        return $this->roles()->where('slug', $roleSlug)->exists();
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    public function hasPermission(string $permissionSlug): bool
    {
        // Super Admin tiene acceso a todo
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->relationLoaded('roles')) {
            foreach ($this->roles as $role) {
                if ($role->relationLoaded('permissions')) {
                    if ($role->permissions->where('slug', $permissionSlug)->isNotEmpty()) {
                        return true;
                    }
                } else {
                    if ($role->hasPermission($permissionSlug)) {
                        return true;
                    }
                }
            }
            return false;
        }

        return $this->roles()->whereHas('permissions', function ($query) use ($permissionSlug) {
            $query->where('slug', $permissionSlug);
        })->exists();
    }

    /**
     * Verifica si el usuario es Super Admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    /**
     * Verifica si el usuario es Admin
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin') || $this->isSuperAdmin();
    }

    /**
     * Verifica si el usuario puede acceder a una empresa específica
     */
    public function canAccessCompany(int $companyId): bool
    {
        // Super admin puede acceder a todo
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Verificar si el usuario pertenece a la empresa
        if ($this->company_id === $companyId) {
            return true;
        }

        // Verificar si la empresa del usuario es padre de la empresa solicitada
        if ($this->company && $this->company->children()->where('id', $companyId)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Verifica si el usuario puede acceder a una sucursal específica
     */
    public function canAccessBranch(int $branchId): bool
    {
        // Super admin puede acceder a todo
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Verificar si el usuario pertenece a la sucursal
        if ($this->branch_id === $branchId) {
            return true;
        }

        $branch = Branch::where('id', $branchId)
            ->select('company_id')
            ->first();

        if ($branch && $this->canAccessCompany($branch->company_id)) {
            return true;
        }

        return false;
    }

    /**
     * Asigna roles al usuario
     */
    public function assignRoles(array $roleIds): void
    {
        $this->roles()->sync($roleIds);
    }

    /**
     * Scope para usuarios activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para usuarios de una empresa
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope para usuarios de una sucursal
     */
    public function scopeForBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Relación: Usuario tiene muchos códigos de 2FA
     */
    public function twoFactorCodes(): HasMany
    {
        return $this->hasMany(TwoFactorCode::class);
    }

    /**
     * Relación: Usuario tiene muchos dispositivos confiables
     */
    public function trustedDevices(): HasMany
    {
        return $this->hasMany(TrustedDevice::class);
    }

    /**
     * Relación: Usuario tiene muchas ventas como cliente
     */
    public function salesAsClient(): HasMany
    {
        return $this->hasMany(Sale::class, 'client_id');
    }

    /**
     * Relación: Usuario tiene muchas ventas como vendedor
     */
    public function salesAsSeller(): HasMany
    {
        return $this->hasMany(Sale::class, 'seller_id');
    }



    /**
     * Verifica si el usuario tiene 2FA por email habilitado
     */
    public function hasEmail2FAEnabled(): bool
    {
        return $this->email_2fa_enabled === true;
    }

    /**
     * Activa la autenticación 2FA por email
     */
    public function enableEmail2FA(): void
    {
        $this->update([
            'email_2fa_enabled' => true,
            'email_2fa_enabled_at' => now(),
        ]);
    }

    /**
     * Desactiva la autenticación 2FA por email
     */
    public function disableEmail2FA(): void
    {
        $this->update([
            'email_2fa_enabled' => false,
            'email_2fa_enabled_at' => null,
        ]);
    }
}
