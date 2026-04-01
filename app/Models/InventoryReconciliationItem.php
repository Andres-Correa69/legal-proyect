<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryReconciliationItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_reconciliation_id',
        'product_id',
        'system_stock',
        'physical_count',
        'difference',
        'unit_cost',
        'financial_impact',
        'variance_percentage',
        'notes',
        'is_counted',
        'adjustment_id',
    ];

    protected $casts = [
        'system_stock' => 'integer',
        'physical_count' => 'integer',
        'difference' => 'integer',
        'unit_cost' => 'decimal:2',
        'financial_impact' => 'decimal:2',
        'variance_percentage' => 'decimal:2',
        'is_counted' => 'boolean',
    ];

    public function reconciliation(): BelongsTo
    {
        return $this->belongsTo(InventoryReconciliation::class, 'inventory_reconciliation_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function adjustment(): BelongsTo
    {
        return $this->belongsTo(InventoryAdjustment::class, 'adjustment_id');
    }
}
