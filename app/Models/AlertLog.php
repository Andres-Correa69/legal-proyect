<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertLog extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'alert_rule_id',
        'company_id',
        'data',
        'email_sent',
        'email_error',
        'triggered_at',
    ];

    protected $casts = [
        'data' => 'array',
        'email_sent' => 'boolean',
        'triggered_at' => 'datetime',
    ];

    public function alertRule(): BelongsTo
    {
        return $this->belongsTo(AlertRule::class);
    }
}
