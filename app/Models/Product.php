<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'category_id',
        'area_id',
        'location_id',
        'supplier_id',
        'sku',
        'barcode',
        'name',
        'image_url',
        'description',
        'brand',
        'purchase_price',
        'sale_price',
        'tax_rate',
        'average_cost',
        'current_stock',
        'min_stock',
        'max_stock',
        'unit_of_measure',
        'is_active',
        'is_trackable',
        'auto_purchase_enabled',
        'last_stock_update_at',
        'last_stock_update_by',
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'average_cost' => 'decimal:2',
        'current_stock' => 'integer',
        'min_stock' => 'integer',
        'max_stock' => 'integer',
        'is_active' => 'boolean',
        'is_trackable' => 'boolean',
        'auto_purchase_enabled' => 'boolean',
        'last_stock_update_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(ProductArea::class, 'area_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function lastStockUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_stock_update_by');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(InventoryPurchaseItem::class);
    }

    public function priceListItems(): HasMany
    {
        return $this->hasMany(PriceListItem::class);
    }

    public function transferItems(): HasMany
    {
        return $this->hasMany(InventoryTransferItem::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(InventoryAdjustment::class);
    }

    /**
     * Genera un SKU unico para la empresa
     */
    public static function generateSku(int $companyId): string
    {
        $lastNumber = static::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->whereRaw("sku ~ '^PROD-\\d{1,9}$'")
            ->selectRaw("MAX(CAST(SUBSTRING(sku FROM 6) AS INTEGER)) as max_num")
            ->value('max_num');

        $nextNumber = ($lastNumber ?? 0) + 1;

        return 'PROD-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->min_stock;
    }

    public function isOverStock(): bool
    {
        return $this->max_stock !== null && $this->current_stock > $this->max_stock;
    }

    public function updateAverageCost(float $newCost, int $quantity): void
    {
        if ($this->current_stock + $quantity > 0) {
            $totalValue = ($this->average_cost * $this->current_stock) + ($newCost * $quantity);
            $this->average_cost = $totalValue / ($this->current_stock + $quantity);
            $this->save();
        }
    }

    /**
     * Actualiza el stock del producto de forma rapida
     * @param int $quantity Cantidad a modificar
     * @param string $operation 'add' (sumar), 'subtract' (restar), 'set' (establecer)
     * @param string|null $notes Notas del ajuste
     * @return array Informacion del cambio realizado
     */
    public function updateStock(int $quantity, string $operation = 'set', ?string $notes = null): array
    {
        if (!$this->is_trackable) {
            throw new \Exception('Este producto no es rastreable');
        }

        $oldStock = $this->current_stock;

        switch ($operation) {
            case 'add':
                $newStock = $oldStock + $quantity;
                break;
            case 'subtract':
                $newStock = max(0, $oldStock - $quantity);
                break;
            case 'set':
            default:
                $newStock = max(0, $quantity);
                break;
        }

        $this->current_stock = $newStock;
        $this->last_stock_update_at = now();
        if (auth()->check()) {
            $this->last_stock_update_by = auth()->id();
        }
        $this->save();

        return [
            'old_stock' => $oldStock,
            'new_stock' => $newStock,
            'difference' => $newStock - $oldStock,
            'operation' => $operation,
            'notes' => $notes,
        ];
    }

    /**
     * Verifica si el producto necesita reabastecimiento
     */
    public function needsRestock(): bool
    {
        if (!$this->is_trackable || $this->min_stock === null) {
            return false;
        }
        return $this->current_stock <= $this->min_stock;
    }

    /**
     * Calcula la cantidad sugerida para compra
     */
    public function getSuggestedPurchaseQuantity(): int
    {
        if (!$this->needsRestock()) {
            return 0;
        }

        $currentStock = $this->current_stock ?? 0;
        $minStock = $this->min_stock ?? 0;

        // Si tiene max_stock, comprar hasta ese nivel
        if ($this->max_stock !== null) {
            return max($minStock, $this->max_stock - $currentStock);
        }

        // Si no, comprar 2x el stock minimo
        return max($minStock, ($minStock * 2) - $currentStock);
    }
}
