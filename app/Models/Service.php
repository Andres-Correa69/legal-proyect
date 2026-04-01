<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Service extends Model
{
    // Nota: NO usamos BelongsToBranch porque los servicios deben ser visibles
    // para todas las sucursales de la empresa, no solo para la sucursal del usuario
    use HasFactory, SoftDeletes, BelongsToCompany;

    /**
     * Categorías de servicios disponibles (genéricas para cualquier negocio)
     */
    public const CATEGORIES = [
        'consultoria' => 'Consultoría',
        'capacitacion' => 'Capacitación',
        'instalacion' => 'Instalación',
        'mantenimiento' => 'Mantenimiento',
        'soporte' => 'Soporte',
        'reparacion' => 'Reparación',
        'diseno' => 'Diseño',
        'transporte' => 'Transporte',
        'limpieza' => 'Limpieza',
        'profesional' => 'Profesional',
        'general' => 'General',
    ];

    /**
     * Unidades de medida para los servicios
     */
    public const UNITS = [
        'servicio' => 'Servicio',
        'hora' => 'Hora',
        'dia' => 'Día',
        'sesion' => 'Sesión',
        'proyecto' => 'Proyecto',
        'visita' => 'Visita',
        'unidad' => 'Unidad',
    ];

    protected $fillable = [
        'company_id',
        'branch_id',
        'name',
        'slug',
        'description',
        'category',
        'price',
        'base_price',
        'tax_rate',
        'estimated_duration',
        'unit',
        'is_active',
        'created_by_user_id',
        'last_price_change_at',
        'last_price_change_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'base_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'estimated_duration' => 'integer',
        'is_active' => 'boolean',
        'last_price_change_at' => 'datetime',
    ];

    /**
     * Boot del modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Generar slug automáticamente si no se proporciona
        static::creating(function ($service) {
            if (empty($service->slug)) {
                $service->slug = Str::slug($service->name);
            }

            // Asignar usuario creador si está autenticado
            if (auth()->check() && !$service->created_by_user_id) {
                $service->created_by_user_id = auth()->id();
            }
        });

        // Detectar cambios de precio
        static::updating(function ($service) {
            if ($service->isDirty('price') && auth()->check()) {
                $service->last_price_change_at = now();
                $service->last_price_change_by = auth()->id();
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
     * Relación con la sucursal
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Usuario que creó el servicio
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function priceListItems(): HasMany
    {
        return $this->hasMany(PriceListItem::class);
    }

    /**
     * Productos asociados al servicio (many-to-many con datos pivot)
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'service_product')
            ->withPivot('id', 'company_id', 'quantity', 'is_included')
            ->withTimestamps();
    }

    /**
     * Registros pivot de productos del servicio
     */
    public function serviceProducts(): HasMany
    {
        return $this->hasMany(ServiceProduct::class);
    }

    /**
     * Usuario que cambió el precio por última vez
     */
    public function lastPriceChangedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_price_change_by');
    }

    /**
     * Scope para filtrar por categoría
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope para servicios activos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para filtrar por rango de precio
     */
    public function scopePriceRange($query, ?float $min = null, ?float $max = null)
    {
        if ($min !== null) {
            $query->where('price', '>=', $min);
        }
        if ($max !== null) {
            $query->where('price', '<=', $max);
        }
        return $query;
    }

    /**
     * Scope para filtrar por unidad
     */
    public function scopeByUnit($query, string $unit)
    {
        return $query->where('unit', $unit);
    }

    /**
     * Obtiene el nombre de la categoría legible
     */
    public function getCategoryNameAttribute(): string
    {
        return self::CATEGORIES[$this->category] ?? $this->category;
    }

    /**
     * Obtiene el nombre de la unidad legible
     */
    public function getUnitNameAttribute(): string
    {
        return self::UNITS[$this->unit] ?? $this->unit;
    }

    /**
     * Obtiene la duración estimada formateada
     */
    public function getFormattedDurationAttribute(): ?string
    {
        if (!$this->estimated_duration) {
            return null;
        }

        $hours = intdiv($this->estimated_duration, 60);
        $minutes = $this->estimated_duration % 60;

        if ($hours > 0 && $minutes > 0) {
            return "{$hours}h {$minutes}min";
        } elseif ($hours > 0) {
            return "{$hours}h";
        } else {
            return "{$minutes}min";
        }
    }

    /**
     * Calcula el descuento respecto al precio base
     */
    public function getDiscountPercentageAttribute(): ?float
    {
        if (!$this->base_price || $this->base_price <= 0) {
            return null;
        }

        if ($this->price >= $this->base_price) {
            return 0;
        }

        return round((($this->base_price - $this->price) / $this->base_price) * 100, 2);
    }

    /**
     * Verifica si el servicio está activo
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }
}
