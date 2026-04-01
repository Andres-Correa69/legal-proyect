<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany;

    public const TYPES = [
        'appointment' => 'Cita',
        'reminder' => 'Recordatorio',
        'follow_up' => 'Seguimiento',
        'call' => 'Llamada',
        'meeting' => 'Reunión',
        'holiday' => 'Día Festivo',
    ];

    public const STATUSES = [
        'scheduled' => 'Programada',
        'completed' => 'Completada',
        'cancelled' => 'Cancelada',
        'no_show' => 'No asistió',
    ];

    public const PRIORITIES = [
        'low' => 'Baja',
        'normal' => 'Normal',
        'high' => 'Alta',
        'urgent' => 'Urgente',
    ];

    protected $fillable = [
        'company_id',
        'branch_id',
        'title',
        'description',
        'type',
        'status',
        'priority',
        'starts_at',
        'ends_at',
        'all_day',
        'client_id',
        'supplier_id',
        'related_sale_id',
        'color',
        'location',
        'notes',
        'created_by_user_id',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'all_day' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appointment) {
            if (auth()->check() && !$appointment->created_by_user_id) {
                $appointment->created_by_user_id = auth()->id();
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function relatedSale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'related_sale_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(AppointmentReminder::class);
    }

    public function googleCalendarSyncs(): HasMany
    {
        return $this->hasMany(GoogleCalendarSync::class);
    }

    public function getTypeLabel(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    public function getStatusLabel(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    public function getPriorityLabel(): string
    {
        return self::PRIORITIES[$this->priority] ?? $this->priority;
    }

    public function scopeUpcoming($query)
    {
        return $query->where('starts_at', '>=', now())
                     ->where('status', 'scheduled')
                     ->orderBy('starts_at');
    }

    public function scopeByDateRange($query, string $from, string $to)
    {
        return $query->whereBetween('starts_at', [$from, $to]);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
