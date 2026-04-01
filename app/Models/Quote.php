<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quote extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'branch_id',
        'client_id',
        'seller_id',
        'quote_number',
        'concept',
        'notes',
        'status',
        'quote_date',
        'valid_until',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'converted_sale_id',
        'created_by_user_id',
    ];

    protected $casts = [
        'quote_date' => 'date',
        'valid_until' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }

    public function convertedSale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'converted_sale_id');
    }

    public static function generateQuoteNumber(int $companyId): string
    {
        $last = static::withoutGlobalScopes()
            ->where('company_id', $companyId)
            ->where('quote_number', 'like', 'PRES-%')
            ->orderByRaw("CAST(SUBSTRING(quote_number FROM 6) AS INTEGER) DESC")
            ->value('quote_number');

        $nextNumber = 1;
        if ($last) {
            $currentNumber = (int) substr($last, 5);
            $nextNumber = $currentNumber + 1;
        }

        return 'PRES-' . str_pad($nextNumber, 8, '0', STR_PAD_LEFT);
    }
}
