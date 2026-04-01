<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InternalNote extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'branch_id',
        'sale_id',
        'note_number',
        'type',
        'status',
        'reason',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'issue_date',
        'created_by_user_id',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
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
        return $this->hasMany(InternalNoteItem::class);
    }

    public function isCredit(): bool
    {
        return $this->type === 'credit';
    }

    public function isDebit(): bool
    {
        return $this->type === 'debit';
    }

    public function getTypeLabel(): string
    {
        return match ($this->type) {
            'credit' => 'Nota Crédito Interna',
            'debit' => 'Nota Débito Interna',
            default => 'Nota Interna',
        };
    }

    public static function generateNoteNumber(int $companyId, string $type): string
    {
        $prefix = match ($type) {
            'credit' => 'NCI',
            'debit' => 'NDI',
            default => 'NI',
        };

        $lastNote = self::where('company_id', $companyId)
            ->where('type', $type)
            ->orderBy('id', 'desc')
            ->first();

        $lastNumber = 0;
        if ($lastNote) {
            preg_match('/(\d+)$/', $lastNote->note_number, $matches);
            $lastNumber = isset($matches[1]) ? (int)$matches[1] : 0;
        }

        return $prefix . '-' . str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
    }
}
