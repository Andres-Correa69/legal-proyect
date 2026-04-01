<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollEmployeeEarning extends Model
{
    protected $fillable = [
        'payroll_employee_id',
        'concept',
        'data',
        'payment',
        'is_active',
    ];

    protected $casts = [
        'data' => 'array',
        'payment' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function payrollEmployee(): BelongsTo
    {
        return $this->belongsTo(PayrollEmployee::class);
    }
}
