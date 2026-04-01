<?php

namespace App\Models;

use App\Traits\BelongsToBranch;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceOrder extends Model
{
    use HasFactory, SoftDeletes, BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'client_id',
        'assigned_to',
        'created_by',
        'sale_id',
        'order_number',
        'status',
        'priority',
        'type',
        'title',
        'description',
        'equipment_info',
        'scheduled_date',
        'scheduled_time',
        'started_at',
        'completed_at',
        'estimated_duration',
        'actual_duration',
        'diagnosis',
        'resolution_notes',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total_amount',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public const STATUS_LABELS = [
        'pending' => 'Pendiente',
        'confirmed' => 'Confirmada',
        'in_progress' => 'En Progreso',
        'on_hold' => 'En Espera',
        'completed' => 'Completada',
        'cancelled' => 'Cancelada',
        'invoiced' => 'Facturada',
    ];

    public const PRIORITY_LABELS = [
        'low' => 'Baja',
        'medium' => 'Media',
        'high' => 'Alta',
        'urgent' => 'Urgente',
    ];

    public const TYPE_LABELS = [
        'repair' => 'Reparación',
        'maintenance' => 'Mantenimiento',
        'installation' => 'Instalación',
        'inspection' => 'Inspección',
        'consultation' => 'Consulta',
        'other' => 'Otro',
    ];

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

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ServiceOrderAttachment::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(ServiceOrderStatusHistory::class);
    }

    public static function generateOrderNumber(int $companyId): string
    {
        $lastNumber = (int) \Illuminate\Support\Facades\DB::table('service_orders')
            ->where('company_id', $companyId)
            ->selectRaw("MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) as max_num")
            ->value('max_num');

        return 'OS-' . str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
    }

    public function recalculateTotals(): void
    {
        $this->subtotal = $this->items()->sum('subtotal');
        $this->discount_amount = $this->items()->sum('discount_amount');
        $this->tax_amount = $this->items()->sum('tax_amount');
        $this->total_amount = $this->items()->sum('total');
        $this->save();
    }
}
