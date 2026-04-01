<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingPeriod extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'year',
        'month',
        'status',
        'closed_at',
        'closed_by_user_id',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'closed_at' => 'datetime',
    ];

    // -- Relaciones --

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_user_id');
    }

    // -- Metodos --

    public function close(int $userId): void
    {
        $this->update([
            'status' => 'closed',
            'closed_at' => now(),
            'closed_by_user_id' => $userId,
        ]);
    }

    public function reopen(): void
    {
        $this->update([
            'status' => 'open',
            'closed_at' => null,
            'closed_by_user_id' => null,
        ]);
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }
}
