<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashRegisterSession extends Model
{
    use HasFactory, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'cash_register_id',
        'company_id',
        'branch_id',
        'opened_by_user_id',
        'closed_by_user_id',
        'opening_balance',
        'closing_balance',
        'expected_balance',
        'difference',
        'total_income',
        'total_expense',
        'opened_at',
        'closed_at',
        'notes',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'closing_balance' => 'decimal:2',
        'expected_balance' => 'decimal:2',
        'difference' => 'decimal:2',
        'total_income' => 'decimal:2',
        'total_expense' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    /**
     * Relación: Sesión pertenece a una caja
     */
    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * Relación: Usuario que abrió la sesión
     */
    public function openedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_user_id');
    }

    /**
     * Relación: Usuario que cerró la sesión
     */
    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    /**
     * Relación: Pagos de esta sesión
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'cash_register_session_id');
    }

    /**
     * Calcula el balance esperado
     */
    public function calculateExpectedBalance(): float
    {
        return $this->opening_balance + $this->total_income - $this->total_expense;
    }

    /**
     * Calcula la diferencia entre el balance esperado y el real
     */
    public function calculateDifference(): float
    {
        if ($this->closing_balance === null) {
            return 0;
        }
        return $this->closing_balance - $this->calculateExpectedBalance();
    }

    /**
     * Verifica si hay faltante
     */
    public function hasShortage(): bool
    {
        return $this->difference !== null && $this->difference < 0;
    }

    /**
     * Verifica si hay sobrante
     */
    public function hasSurplus(): bool
    {
        return $this->difference !== null && $this->difference > 0;
    }

    /**
     * Verifica si está balanceada
     */
    public function isBalanced(): bool
    {
        return $this->difference !== null && abs($this->difference) < 0.01;
    }

    /**
     * Verifica si la sesión está abierta
     */
    public function isOpen(): bool
    {
        return $this->closed_at === null;
    }

    /**
     * Scope para sesiones abiertas
     */
    public function scopeOpen($query)
    {
        return $query->whereNull('closed_at');
    }

    /**
     * Scope para sesiones cerradas
     */
    public function scopeClosed($query)
    {
        return $query->whereNotNull('closed_at');
    }
}
