<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryPurchase extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'warehouse_id',
        'supplier_id',
        'purchase_number',
        'status',
        'payment_status',
        'is_credit',
        'credit_due_date',
        'subtotal',
        'tax_amount',
        'total_amount',
        'retention_amount',
        'retentions',
        'total_paid',
        'balance_due',
        'expected_date',
        'received_at',
        'notes',
        'created_by_user_id',
        'approved_by_user_id',
        'received_by_user_id',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'retention_amount' => 'decimal:2',
        'retentions' => 'array',
        'total_paid' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'is_credit' => 'boolean',
        'credit_due_date' => 'date',
        'expected_date' => 'date',
        'received_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($purchase) {
            if (empty($purchase->purchase_number)) {
                $purchase->purchase_number = self::generatePurchaseNumber();
            }
        });
    }

    public static function generatePurchaseNumber(): string
    {
        $prefix = 'PO-' . date('Ymd') . '-';
        $lastPurchase = self::withTrashed()
            ->where('purchase_number', 'like', $prefix . '%')
            ->orderBy('purchase_number', 'desc')
            ->first();

        if ($lastPurchase) {
            $lastNumber = (int) substr($lastPurchase->purchase_number, -4);
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

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryPurchaseItem::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'reference');
    }

    public function receiptAcknowledgment(): HasOne
    {
        return $this->hasOne(ReceiptAcknowledgment::class);
    }

    public function goodsReceipt(): HasOne
    {
        return $this->hasOne(GoodsReceipt::class);
    }

    public function documentSupport(): HasOne
    {
        return $this->hasOne(DocumentSupport::class);
    }

    public function expressAcceptance(): HasOne
    {
        return $this->hasOne(ExpressAcceptance::class);
    }

    public function calculateTotals(): void
    {
        $this->load('items');
        $this->subtotal = $this->items->sum(function ($item) {
            return $item->quantity_ordered * $item->unit_cost;
        });
        $this->tax_amount = $this->items->sum('tax_amount');
        $this->total_amount = $this->subtotal + $this->tax_amount;
        $this->balance_due = $this->total_amount - $this->total_paid;
        $this->save();
    }

    public function canBeApproved(): bool
    {
        return in_array($this->status, ['draft', 'pending']);
    }

    public function canBeReceived(): bool
    {
        return in_array($this->status, ['approved', 'partial']);
    }

    public function isFullyReceived(): bool
    {
        return $this->items->every(function ($item) {
            return $item->quantity_received >= $item->quantity_ordered;
        });
    }

    /**
     * Calcula el saldo pendiente de pago
     */
    public function calculateBalanceDue(): float
    {
        return max(0, $this->total_amount - ($this->total_paid ?? 0));
    }

    /**
     * Actualiza el estado de pago basado en el total pagado
     */
    public function updatePaymentStatus(): void
    {
        $this->balance_due = $this->calculateBalanceDue();

        if ($this->total_paid >= $this->total_amount) {
            $this->payment_status = 'paid';
        } elseif ($this->total_paid > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }

        $this->save();
    }

    /**
     * Verifica si la compra está pagada completamente
     */
    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    /**
     * Obtiene el total de pagos realizados (excluye cancelados)
     */
    public function getTotalPaid(): float
    {
        return $this->payments()
            ->where('status', 'completed')
            ->sum('amount');
    }
}
