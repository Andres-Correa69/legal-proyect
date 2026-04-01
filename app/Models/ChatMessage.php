<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatMessage extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'conversation_id',
        'company_id',
        'sender_id',
        'body',
        'type',
        'attachment_url',
        'attachment_name',
        'attachment_type',
        'attachment_size',
        'status',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
