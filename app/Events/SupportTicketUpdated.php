<?php

namespace App\Events;

use App\Models\SupportConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportTicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $ticket;
    public int $conversationId;

    public function __construct(SupportConversation $conversation)
    {
        $this->conversationId = $conversation->id;

        $this->ticket = [
            'id' => $conversation->id,
            'ticket_number' => $conversation->ticket_number,
            'status' => $conversation->status,
            'priority' => $conversation->priority,
            'assigned_admin_name' => $conversation->assigned_admin_name,
            'resolved_at' => $conversation->resolved_at?->toISOString(),
            'resolved_by_name' => $conversation->resolved_by_name,
            'resolution_notes' => $conversation->resolution_notes,
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("support.conversation.{$this->conversationId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }
}
