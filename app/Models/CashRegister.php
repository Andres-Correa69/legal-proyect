<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CashRegister extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'payment_method_id',
        'type',
        'name',
        'bank_name',
        'account_number',
        'account_type',
        'status',
        'current_balance',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Relación: Método de pago asociado a esta caja
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Relación: Una caja tiene muchas sesiones
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(CashRegisterSession::class);
    }

    /**
     * Relación: La sesión actual abierta
     */
    public function current_session(): HasOne
    {
        return $this->hasOne(CashRegisterSession::class)->whereNull('closed_at')->latestOfMany();
    }

    /**
     * Relación: Una caja tiene muchas transferencias como origen
     */
    public function transfersOut(): HasMany
    {
        return $this->hasMany(CashRegisterTransfer::class, 'source_cash_register_id');
    }

    /**
     * Relación: Una caja tiene muchas transferencias como destino
     */
    public function transfersIn(): HasMany
    {
        return $this->hasMany(CashRegisterTransfer::class, 'destination_cash_register_id');
    }

    /**
     * Verifica si la caja está activa
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Verifica si es caja menor
     */
    public function isMinor(): bool
    {
        return $this->type === 'minor';
    }

    /**
     * Verifica si es caja mayor
     */
    public function isMajor(): bool
    {
        return $this->type === 'major';
    }

    /**
     * Verifica si es cuenta bancaria
     */
    public function isBank(): bool
    {
        return $this->type === 'bank';
    }

    /**
     * Verifica si está abierta
     */
    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    /**
     * Verifica si está cerrada
     */
    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    /**
     * Verifica si tiene una sesión abierta
     */
    public function hasOpenSession(): bool
    {
        return $this->sessions()->whereNull('closed_at')->exists();
    }

    /**
     * Obtiene la sesión abierta actual
     */
    public function currentSession(): ?CashRegisterSession
    {
        // Usar withoutGlobalScopes para evitar que BranchScope filtre
        return CashRegisterSession::withoutGlobalScopes()
            ->where('cash_register_id', $this->id)
            ->whereNull('closed_at')
            ->first();
    }

    /**
     * Agrega monto al balance
     */
    public function addToBalance(float $amount): void
    {
        $this->increment('current_balance', $amount);
    }

    /**
     * Resta monto del balance
     */
    public function subtractFromBalance(float $amount): void
    {
        $this->decrement('current_balance', $amount);
    }

    /**
     * Scope para cajas activas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para cajas abiertas
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
