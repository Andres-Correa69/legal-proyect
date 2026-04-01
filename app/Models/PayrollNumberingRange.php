<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use App\Traits\BelongsToBranch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollNumberingRange extends Model
{
    use BelongsToCompany, BelongsToBranch;

    protected $fillable = [
        'company_id',
        'branch_id',
        'name',
        'type',
        'prefix',
        'consecutive_start',
        'consecutive_end',
        'current_consecutive',
        'is_active',
    ];

    protected $casts = [
        'consecutive_start' => 'integer',
        'consecutive_end' => 'integer',
        'current_consecutive' => 'integer',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
