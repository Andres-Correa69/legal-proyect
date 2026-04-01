<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryAdjustment extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'product_id',
        'adjustment_reason_id',
        'adjustment_number',
        'quantity',
        'stock_before',
        'stock_after',
        'unit_cost',
        'financial_impact',
        'status',
        'notes',
        'rejection_reason',
        'created_by_user_id',
        'approved_by_user_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'stock_before' => 'integer',
        'stock_after' => 'integer',
        'unit_cost' => 'decimal:2',
        'financial_impact' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function ($adjustment) {
            if (empty($adjustment->adjustment_number)) {
                $adjustment->adjustment_number = self::generateAdjustmentNumber();
            }
        });
    }

    public static function generateAdjustmentNumber(): string
    {
        $prefix = 'ADJ-' . date('Ymd') . '-';
        $lastAdjustment = self::withTrashed()
            ->where('adjustment_number', 'like', $prefix . '%')
            ->orderBy('adjustment_number', 'desc')
            ->first();

        if ($lastAdjustment) {
            $lastNumber = (int) substr($lastAdjustment->adjustment_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function adjustmentReason(): BelongsTo
    {
        return $this->belongsTo(AdjustmentReason::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return in_array($this->status, ['approved', 'auto_approved']);
    }

    public function canBeApproved(): bool
    {
        return $this->status === 'pending';
    }

    public function isPositiveAdjustment(): bool
    {
        return $this->quantity > 0;
    }

    public function isNegativeAdjustment(): bool
    {
        return $this->quantity < 0;
    }
}
