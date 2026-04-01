<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransferItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_transfer_id',
        'product_id',
        'quantity_requested',
        'quantity_transferred',
    ];

    protected $casts = [
        'quantity_requested' => 'integer',
        'quantity_transferred' => 'integer',
    ];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(InventoryTransfer::class, 'inventory_transfer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getPendingQuantityAttribute(): int
    {
        return $this->quantity_requested - $this->quantity_transferred;
    }

    public function isFullyTransferred(): bool
    {
        return $this->quantity_transferred >= $this->quantity_requested;
    }
}
