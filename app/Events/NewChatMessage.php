<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public int $conversationId;

    public function __construct(ChatMessage $chatMessage)
    {
        $this->conversationId = $chatMessage->conversation_id;

        // Serialize the message with sender info for the frontend
        $this->message = [
            'id' => $chatMessage->id,
            'conversation_id' => $chatMessage->conversation_id,
            'sender_id' => $chatMessage->sender_id,
            'body' => $chatMessage->body,
            'type' => $chatMessage->type,
            'attachment_url' => $chatMessage->attachment_url,
            'attachment_name' => $chatMessage->attachment_name,
            'attachment_type' => $chatMessage->attachment_type,
            'attachment_size' => $chatMessage->attachment_size,
            'status' => $chatMessage->status ?? 'sent',
            'created_at' => $chatMessage->created_at->toISOString(),
            'updated_at' => $chatMessage->updated_at->toISOString(),
            'sender' => $chatMessage->sender ? [
                'id' => $chatMessage->sender->id,
                'name' => $chatMessage->sender->name,
                'avatar_url' => $chatMessage->sender->avatar_url,
            ] : null,
        ];
    }

    /**
     * Broadcast on the conversation's private channel.
     * All participants of this conversation will receive the event.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("chat.conversation.{$this->conversationId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.new';
    }
}
