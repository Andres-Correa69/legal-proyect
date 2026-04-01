<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdjustmentReason extends Model
{
    use HasFactory, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'description',
        'requires_approval',
        'approval_threshold_quantity',
        'approval_threshold_amount',
        'is_active',
    ];

    protected $casts = [
        'requires_approval' => 'boolean',
        'approval_threshold_quantity' => 'integer',
        'approval_threshold_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(InventoryAdjustment::class);
    }

    public function requiresApprovalFor(int $quantity, float $amount): bool
    {
        if (!$this->requires_approval) {
            return false;
        }

        if ($this->approval_threshold_quantity !== null && abs($quantity) >= $this->approval_threshold_quantity) {
            return true;
        }

        if ($this->approval_threshold_amount !== null && abs($amount) >= $this->approval_threshold_amount) {
            return true;
        }

        return $this->approval_threshold_quantity === null && $this->approval_threshold_amount === null;
    }
}
