<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AccountingAccount extends Model
{
    use SoftDeletes, BelongsToCompany;

    protected $fillable = [
        'company_id',
        'parent_id',
        'code',
        'name',
        'type',
        'nature',
        'level',
        'is_active',
        'is_parent',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_parent' => 'boolean',
        'level' => 'integer',
    ];

    // -- Relaciones --

    public function parent(): BelongsTo
    {
        return $this->belongsTo(AccountingAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(AccountingAccount::class, 'parent_id');
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function cashRegisters(): BelongsToMany
    {
        return $this->belongsToMany(CashRegister::class, 'accounting_account_cash_register')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(Supplier::class, 'accounting_account_supplier')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    // -- Scopes --

    public function scopeLeaf(Builder $query): Builder
    {
        return $query->where('is_parent', false);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    // -- Helpers --

    /**
     * Calcula el saldo de la cuenta en un rango de fechas
     */
    public function getBalance(?string $dateFrom = null, ?string $dateTo = null): float
    {
        $query = $this->journalEntryLines()
            ->whereHas('journalEntry', fn (Builder $q) => $q->where('status', 'posted'));

        if ($dateFrom) {
            $query->whereHas('journalEntry', fn (Builder $q) => $q->where('date', '>=', $dateFrom));
        }
        if ($dateTo) {
            $query->whereHas('journalEntry', fn (Builder $q) => $q->where('date', '<=', $dateTo));
        }

        $totalDebit = (clone $query)->sum('debit');
        $totalCredit = (clone $query)->sum('credit');

        // Cuentas debito: saldo = debitos - creditos
        // Cuentas credito: saldo = creditos - debitos
        return $this->nature === 'debit'
            ? $totalDebit - $totalCredit
            : $totalCredit - $totalDebit;
    }

    /**
     * Determina la naturaleza automatica segun el tipo de cuenta
     */
    public static function getNatureByType(string $type): string
    {
        return in_array($type, ['asset', 'expense', 'cost']) ? 'debit' : 'credit';
    }
}
