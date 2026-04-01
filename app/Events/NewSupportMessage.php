<?php

namespace App\Events;

use App\Models\SupportMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewSupportMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public int $conversationId;

    public function __construct(SupportMessage $supportMessage)
    {
        $this->conversationId = $supportMessage->conversation_id;

        $this->message = [
            'id' => $supportMessage->id,
            'conversation_id' => $supportMessage->conversation_id,
            'sender_type' => $supportMessage->sender_type,
            'sender_id' => $supportMessage->sender_id,
            'sender_name' => $supportMessage->sender_name,
            'body' => $supportMessage->body,
            'type' => $supportMessage->type,
            'attachment_url' => $supportMessage->attachment_url,
            'attachment_name' => $supportMessage->attachment_name,
            'attachment_type' => $supportMessage->attachment_type,
            'attachment_size' => $supportMessage->attachment_size,
            'read_at' => null,
            'created_at' => $supportMessage->created_at->toISOString(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("support.conversation.{$this->conversationId}"),
            new PrivateChannel('support.admin'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.new';
    }
}
