<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class JournalEntry extends Model
{
    use SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'entry_number',
        'date',
        'description',
        'reference_type',
        'reference_id',
        'status',
        'total_debit',
        'total_credit',
        'source',
        'auto_source',
        'created_by_user_id',
        'posted_at',
        'voided_at',
        'notes',
        'void_reason',
    ];

    protected $casts = [
        'date' => 'date',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    // -- Relaciones --

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    // -- Helpers --

    /**
     * Verifica si el asiento esta balanceado (debitos = creditos)
     */
    public function isBalanced(): bool
    {
        return abs($this->total_debit - $this->total_credit) < 0.01;
    }

    /**
     * Publica el asiento (draft → posted)
     */
    public function post(): void
    {
        $this->update([
            'status' => 'posted',
            'posted_at' => now(),
        ]);
    }

    /**
     * Anula el asiento (posted → voided)
     */
    public function void(string $reason): void
    {
        $this->update([
            'status' => 'voided',
            'voided_at' => now(),
            'void_reason' => $reason,
        ]);
    }

    /**
     * Genera un numero de asiento unico para la empresa
     */
    public static function generateEntryNumber(int $companyId): string
    {
        $prefix = 'AST-' . date('Y') . '-';
        $lastEntry = self::where('company_id', $companyId)
            ->where('entry_number', 'like', $prefix . '%')
            ->orderBy('entry_number', 'desc')
            ->first();

        if ($lastEntry) {
            $lastNumber = (int) substr($lastEntry->entry_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $newNumber;
    }

    // -- Scopes --

    public function scopePosted($query)
    {
        return $query->where('status', 'posted');
    }

    public function scopeByDateRange($query, string $dateFrom, string $dateTo)
    {
        return $query->whereBetween('date', [$dateFrom, $dateTo]);
    }
}
