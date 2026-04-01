<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'branch_id',
        'client_id',
        'seller_id',
        'invoice_number',
        'type',
        'status',
        'payment_status',
        'invoice_date',
        'due_date',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'retention_amount',
        'total_amount',
        'paid_amount',
        'balance',
        'commission_percentage',
        'commission_amount',
        'commission_paid',
        'commission_paid_at',
        'notes',
        'retentions',
        'created_by_user_id',
        'price_list_id',
        'email_status',
        'email_retry_count',
        'credit_note_amount',
        'debit_note_amount',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'retention_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'commission_percentage' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'commission_paid' => 'boolean',
        'commission_paid_at' => 'datetime',
        'retentions' => 'array',
        'credit_note_amount' => 'decimal:2',
        'debit_note_amount' => 'decimal:2',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function priceList(): BelongsTo
    {
        return $this->belongsTo(PriceList::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function electronicInvoices(): HasMany
    {
        return $this->hasMany(ElectronicInvoice::class);
    }

    public function internalNotes(): HasMany
    {
        return $this->hasMany(InternalNote::class);
    }

    /**
     * Total efectivo considerando notas crédito y débito internas
     */
    public function effectiveTotal(): float
    {
        return (float) $this->total_amount
            + (float) ($this->debit_note_amount ?? 0)
            - (float) ($this->credit_note_amount ?? 0);
    }

    public function updatePaymentStatus(): void
    {
        $this->paid_amount = $this->payments()->sum('amount');
        $effectiveTotal = $this->effectiveTotal();
        $this->balance = $effectiveTotal - $this->paid_amount;

        if ($this->paid_amount >= $effectiveTotal) {
            $this->payment_status = 'paid';
        } elseif ($this->paid_amount > 0) {
            $this->payment_status = 'partial';
        } else {
            $this->payment_status = 'pending';
        }

        $this->save();
    }

    public static function generateInvoiceNumber(int $companyId, string $type): string
    {
        $prefix = match ($type) {
            'pos' => 'POS',
            'electronic' => 'FE',
            'account' => 'CC',
            'credit' => 'CR',
            default => 'FAC',
        };

        $lastSale = self::where('company_id', $companyId)
            ->where('type', $type)
            ->orderBy('id', 'desc')
            ->first();

        $lastNumber = 0;
        if ($lastSale) {
            preg_match('/(\d+)$/', $lastSale->invoice_number, $matches);
            $lastNumber = isset($matches[1]) ? (int)$matches[1] : 0;
        }

        return $prefix . '-' . str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
    }

    public function getTypeLabel(): string
    {
        return match ($this->type) {
            'pos' => 'Factura POS',
            'electronic' => 'Factura Electronica',
            'account' => 'Cuenta de Cobro',
            'credit' => 'Credito',
            default => 'Factura',
        };
    }

    public function getStatusLabel(): string
    {
        return match ($this->status) {
            'draft' => 'Borrador',
            'pending' => 'Pendiente',
            'completed' => 'Completada',
            'cancelled' => 'Cancelada',
            default => $this->status,
        };
    }

    public function getPaymentStatusLabel(): string
    {
        return match ($this->payment_status) {
            'pending' => 'Pendiente',
            'partial' => 'Parcial',
            'paid' => 'Pagada',
            default => $this->payment_status,
        };
    }
}
