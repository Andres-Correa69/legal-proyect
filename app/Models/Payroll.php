<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    use BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'prefix',
        'number',
        'settlement_start_date',
        'settlement_end_date',
        'issue_date',
        'status',
        'payroll_period_id',
        'notes',
        'created_by_user_id',
    ];

    protected $casts = [
        'settlement_start_date' => 'date',
        'settlement_end_date' => 'date',
        'issue_date' => 'date',
        'number' => 'integer',
        'payroll_period_id' => 'integer',
    ];

    public function employees(): HasMany
    {
        return $this->hasMany(PayrollEmployee::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
