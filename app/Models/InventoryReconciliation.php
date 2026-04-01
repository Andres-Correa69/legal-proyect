<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryReconciliation extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'reconciliation_number',
        'warehouse_id',
        'location_id',
        'category_id',
        'status',
        'is_blind_count',
        'notes',
        'cancellation_reason',
        'total_products',
        'total_counted',
        'total_matches',
        'total_surpluses',
        'total_shortages',
        'total_surplus_value',
        'total_shortage_value',
        'net_financial_impact',
        'created_by_user_id',
        'counted_by_user_id',
        'reviewed_by_user_id',
        'approved_by_user_id',
        'applied_by_user_id',
        'counting_started_at',
        'counting_completed_at',
        'reviewed_at',
        'approved_at',
        'applied_at',
        'cancelled_at',
    ];

    protected $casts = [
        'is_blind_count' => 'boolean',
        'total_products' => 'integer',
        'total_counted' => 'integer',
        'total_matches' => 'integer',
        'total_surpluses' => 'integer',
        'total_shortages' => 'integer',
        'total_surplus_value' => 'decimal:2',
        'total_shortage_value' => 'decimal:2',
        'net_financial_impact' => 'decimal:2',
        'counting_started_at' => 'datetime',
        'counting_completed_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'applied_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($reconciliation) {
            if (empty($reconciliation->reconciliation_number)) {
                $reconciliation->reconciliation_number = self::generateNumber();
            }
        });
    }

    public static function generateNumber(): string
    {
        $prefix = 'REC-' . date('Ymd') . '-';
        $last = self::withTrashed()
            ->where('reconciliation_number', 'like', $prefix . '%')
            ->orderBy('reconciliation_number', 'desc')
            ->first();

        $newNumber = $last ? (int) substr($last->reconciliation_number, -4) + 1 : 1;
        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    // Relationships
    public function company(): BelongsTo { return $this->belongsTo(Company::class); }
    public function branch(): BelongsTo { return $this->belongsTo(Branch::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function location(): BelongsTo { return $this->belongsTo(Location::class); }
    public function category(): BelongsTo { return $this->belongsTo(ProductCategory::class, 'category_id'); }
    public function items(): HasMany { return $this->hasMany(InventoryReconciliationItem::class); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by_user_id'); }
    public function countedBy(): BelongsTo { return $this->belongsTo(User::class, 'counted_by_user_id'); }
    public function reviewedBy(): BelongsTo { return $this->belongsTo(User::class, 'reviewed_by_user_id'); }
    public function approvedBy(): BelongsTo { return $this->belongsTo(User::class, 'approved_by_user_id'); }
    public function appliedBy(): BelongsTo { return $this->belongsTo(User::class, 'applied_by_user_id'); }

    // Status helpers
    public function isDraft(): bool { return $this->status === 'draft'; }
    public function isInProgress(): bool { return $this->status === 'in_progress'; }
    public function isInReview(): bool { return $this->status === 'review'; }
    public function isApproved(): bool { return $this->status === 'approved'; }
    public function isApplied(): bool { return $this->status === 'applied'; }
    public function isCancelled(): bool { return $this->status === 'cancelled'; }

    public function canStartCounting(): bool { return $this->status === 'draft'; }
    public function canFinishCounting(): bool { return $this->status === 'in_progress'; }
    public function canBeApproved(): bool { return $this->status === 'review'; }
    public function canBeApplied(): bool { return $this->status === 'approved'; }
    public function canBeCancelled(): bool { return in_array($this->status, ['draft', 'in_progress', 'review']); }

    public function recalculateSummary(): void
    {
        $items = $this->items()->where('is_counted', true)->get();

        $totalCounted = $items->count();
        $matches = $items->where('difference', 0)->count();
        $surpluses = $items->where('difference', '>', 0);
        $shortages = $items->where('difference', '<', 0);

        $this->update([
            'total_counted' => $totalCounted,
            'total_matches' => $matches,
            'total_surpluses' => $surpluses->count(),
            'total_shortages' => $shortages->count(),
            'total_surplus_value' => $surpluses->sum('financial_impact'),
            'total_shortage_value' => abs($shortages->sum('financial_impact')),
            'net_financial_impact' => $items->sum('financial_impact'),
        ]);
    }
}
