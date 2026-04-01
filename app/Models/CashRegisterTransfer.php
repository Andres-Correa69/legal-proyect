<?php

namespace App\Models;

use App\Scopes\CompanyScope;
use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CashRegisterTransfer extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'transfer_number',
        'source_cash_register_id',
        'destination_cash_register_id',
        'amount',
        'notes',
        'created_by_user_id',
        'status',
        'cancellation_reason',
        'cancelled_by_user_id',
        'cancelled_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'cancelled_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->transfer_number)) {
                $model->transfer_number = self::generateTransferNumber();
            }
        });
    }

    /**
     * Genera un número único de transferencia
     */
    public static function generateTransferNumber(): string
    {
        do {
            $number = 'TRF-' . strtoupper(Str::random(6));
        } while (self::where('transfer_number', $number)->exists());

        return $number;
    }

    /**
     * Relación: Caja origen
     * Se omite el CompanyScope para evitar filtros que impidan cargar la relación
     */
    public function sourceCashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'source_cash_register_id')
            ->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * Relación: Caja destino
     * Se omite el CompanyScope para evitar filtros que impidan cargar la relación
     */
    public function destinationCashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class, 'destination_cash_register_id')
            ->withoutGlobalScope(CompanyScope::class);
    }

    /**
     * Relación: Usuario que creó la transferencia
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Relación: Usuario que canceló la transferencia
     */
    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_user_id');
    }

    /**
     * Verifica si está completada
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Verifica si está cancelada
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Scope por estado
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para transferencias completadas
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope para transferencias canceladas
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope por empresa
     */
    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope por caja origen
     */
    public function scopeFrom($query, int $cashRegisterId)
    {
        return $query->where('source_cash_register_id', $cashRegisterId);
    }

    /**
     * Scope por caja destino
     */
    public function scopeTo($query, int $cashRegisterId)
    {
        return $query->where('destination_cash_register_id', $cashRegisterId);
    }

    /**
     * Scope entre fechas
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Formatea el monto con símbolo de moneda
     */
    public function getFormattedAmount(): string
    {
        return '$' . number_format($this->amount, 2);
    }
}
