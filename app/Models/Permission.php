<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'group',
        'description',
        'is_super_admin_only',
        'is_hidden',
    ];

    protected $casts = [
        'is_super_admin_only' => 'boolean',
        'is_hidden' => 'boolean',
    ];

    /**
     * Relación muchos a muchos: Un permiso puede pertenecer a muchos roles
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    /**
     * Scope para filtrar por grupo
     */
    public function scopeByGroup($query, string $group)
    {
        return $query->where('group', $group);
    }

    /**
     * Obtiene todos los grupos únicos de permisos
     */
    public static function getGroups(): array
    {
        return self::distinct()->pluck('group')->filter()->toArray();
    }
}
