<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AlertRule extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'created_by',
        'name',
        'type',
        'conditions',
        'recipients',
        'frequency',
        'is_active',
        'last_checked_at',
        'last_triggered_at',
    ];

    protected $casts = [
        'conditions' => 'array',
        'recipients' => 'array',
        'is_active' => 'boolean',
        'last_checked_at' => 'datetime',
        'last_triggered_at' => 'datetime',
    ];

    public const TYPES = [
        'low_stock',
        'sales_decrease',
        'inactive_clients',
        'no_movement_products',
        'sales_target',
        'upcoming_invoices',
        'high_expenses',
    ];

    public const FREQUENCIES = ['hourly', 'daily', 'weekly'];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AlertLog::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeDueForCheck($query, string $frequency)
    {
        return $query->where('frequency', $frequency)
            ->where('is_active', true)
            ->where(function ($q) use ($frequency) {
                $q->whereNull('last_checked_at');
                switch ($frequency) {
                    case 'hourly':
                        $q->orWhere('last_checked_at', '<', now()->subHour());
                        break;
                    case 'daily':
                        $q->orWhere('last_checked_at', '<', now()->subDay());
                        break;
                    case 'weekly':
                        $q->orWhere('last_checked_at', '<', now()->subWeek());
                        break;
                }
            });
    }
}
