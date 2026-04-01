<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrustedDevice extends Model
{
    protected $fillable = [
        'user_id',
        'device_hash',
        'device_name',
        'ip_address',
        'user_agent',
        'browser',
        'platform',
        'last_used_at',
        'trusted_until',
    ];

    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'trusted_until' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isTrusted(): bool
    {
        if ($this->trusted_until === null) {
            return true;
        }
        return $this->trusted_until->isFuture();
    }

    public function updateLastUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }

    public static function generateDeviceHash(string $userAgent, string $ip): string
    {
        return hash('sha256', $userAgent);
    }
}
