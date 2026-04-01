<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use App\Models\AccountingAccount;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Payment extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'cash_register_id',
        'cash_register_session_id',
        'payment_method_id',
        'type',
        'reference_type',
        'reference_id',
        'payment_number',
        'amount',
        'payment_date',
        'is_partial',
        'is_initial_payment',
        'status',
        'notes',
        'concept',
        'accounting_account_id',
        'cancellation_reason',
        'created_by_user_id',
        'cancelled_by_user_id',
        'cancelled_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'payment_date' => 'date',
        'is_partial' => 'boolean',
        'is_initial_payment' => 'boolean',
        'cancelled_at' => 'datetime',
    ];

    protected $appends = ['concept', 'paid_at', 'is_cancelled'];

    /**
     * Accessor para el concepto - genera un concepto descriptivo basado en la referencia
     */
    public function getConceptAttribute(): string
    {
        // Si hay concepto explícito (egreso libre), usarlo primero
        if (!empty($this->attributes['concept'])) {
            return $this->attributes['concept'];
        }

        // Si hay notas definidas, usarlas como concepto
        if (!empty($this->notes)) {
            return $this->notes;
        }

        // Generar concepto basado en el tipo de referencia
        if ($this->reference_type && $this->reference_id) {
            if ($this->reference_type === InventoryPurchase::class) {
                $purchase = InventoryPurchase::find($this->reference_id);
                if ($purchase) {
                    return 'Pago de compra ' . $purchase->purchase_number;
                }
                return 'Pago de compra #' . $this->reference_id;
            }

            if ($this->reference_type === Sale::class) {
                $sale = Sale::find($this->reference_id);
                if ($sale) {
                    return 'Pago de venta ' . $sale->invoice_number;
                }
                return 'Pago de venta #' . $this->reference_id;
            }
        }

        // Concepto por defecto basado en el tipo
        return $this->type === 'income' ? 'Ingreso' : 'Egreso';
    }

    /**
     * Accessor para la fecha de pago (alias de payment_date para frontend)
     */
    public function getPaidAtAttribute(): ?string
    {
        return $this->payment_date?->toISOString();
    }

    /**
     * Accessor para verificar si está cancelado
     */
    public function getIsCancelledAttribute(): bool
    {
        return $this->status === 'cancelled';
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->payment_number)) {
                $model->payment_number = self::generatePaymentNumber();
            }
        });
    }

    /**
     * Genera un número único de pago
     */
    public static function generatePaymentNumber(): string
    {
        $prefix = 'PAY-' . date('Ymd') . '-';
        $lastPayment = self::where('payment_number', 'like', $prefix . '%')
            ->orderBy('payment_number', 'desc')
            ->first();

        if ($lastPayment) {
            $lastNumber = (int) substr($lastPayment->payment_number, -4);
            $newNumber = str_pad($lastNumber + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $newNumber = '0001';
        }

        return $prefix . $newNumber;
    }

    /**
     * Relación: Cuenta contable (para egresos libres)
     */
    public function accountingAccount(): BelongsTo
    {
        return $this->belongsTo(AccountingAccount::class);
    }

    /**
     * Relación: Referencia polimórfica
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Relación: Método de pago
     */
    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    /**
     * Relación: Caja
     */
    public function cashRegister(): BelongsTo
    {
        return $this->belongsTo(CashRegister::class);
    }

    /**
     * Relación: Sesión de caja
     */
    public function cashRegisterSession(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class);
    }

    /**
     * Relación: Usuario que creó el pago
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /**
     * Relación: Usuario que canceló el pago
     */
    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_user_id');
    }

    /**
     * Relación: Cuotas del pago
     */
    public function installments(): HasMany
    {
        return $this->hasMany(PaymentInstallment::class);
    }

    /**
     * Verifica si es ingreso
     */
    public function isIncome(): bool
    {
        return $this->type === 'income';
    }

    /**
     * Verifica si es egreso
     */
    public function isExpense(): bool
    {
        return $this->type === 'expense';
    }

    /**
     * Verifica si está completado
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Verifica si está cancelado
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Verifica si es parcial
     */
    public function isPartial(): bool
    {
        return $this->is_partial;
    }

    /**
     * Scope por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope por estado
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para ingresos
     */
    public function scopeIncomes($query)
    {
        return $query->where('type', 'income');
    }

    /**
     * Scope para egresos
     */
    public function scopeExpenses($query)
    {
        return $query->where('type', 'expense');
    }
}
