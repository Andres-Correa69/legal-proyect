<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class SupportConversation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'type',
        'ticket_number',
        'company_id',
        'branch_id',
        'user_id',
        'subject',
        'description',
        'status',
        'priority',
        'assigned_admin_id',
        'assigned_admin_name',
        'last_message_at',
        'resolved_at',
        'resolved_by_name',
        'resolution_notes',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'conversation_id')
            ->latestOfMany();
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeOpen($query)
    {
        return $query->where('status', '!=', 'resolved');
    }

    public static function generateTicketNumber(): string
    {
        $year = now()->year;

        $sequence = DB::table('support_ticket_sequences')
            ->where('year', $year)
            ->lockForUpdate()
            ->first();

        if ($sequence) {
            $nextNumber = $sequence->last_number + 1;
            DB::table('support_ticket_sequences')
                ->where('year', $year)
                ->update(['last_number' => $nextNumber]);
        } else {
            $nextNumber = 1;
            DB::table('support_ticket_sequences')
                ->insert(['year' => $year, 'last_number' => $nextNumber]);
        }

        return sprintf('OMS-%d-%03d', $year, $nextNumber);
    }
}
