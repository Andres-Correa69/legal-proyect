<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentInstallment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'installment_number',
        'amount',
        'payment_date',
        'due_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'payment_date' => 'date',
        'due_date' => 'date',
    ];

    /**
     * Relación: Cuota pertenece a un pago
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Verifica si está pagada
     */
    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    /**
     * Verifica si está pendiente
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Verifica si está vencida
     */
    public function isOverdue(): bool
    {
        return $this->status === 'overdue';
    }

    /**
     * Verifica si la cuota está vencida por fecha
     */
    public function checkIfOverdue(): bool
    {
        if ($this->status === 'paid' || !$this->due_date) {
            return false;
        }
        return $this->due_date->isPast();
    }

    /**
     * Actualiza el estado de la cuota
     */
    public function updateStatus(): void
    {
        if ($this->checkIfOverdue()) {
            $this->status = 'overdue';
            $this->save();
        }
    }

    /**
     * Scopes
     */
    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue');
    }
}
