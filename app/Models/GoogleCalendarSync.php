<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class GoogleCalendarSync extends Model
{
    use BelongsToCompany;

    protected $table = 'google_calendar_sync';

    protected $fillable = [
        'company_id',
        'branch_id',
        'appointment_id',
        'calendar_id',
        'event_id',
        'sync_direction',
        'last_synced_at',
        'sync_status',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'last_synced_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('sync_status', 'pending');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('sync_status', 'failed');
    }

    public function scopeSynced(Builder $query): Builder
    {
        return $query->where('sync_status', 'success');
    }
}
