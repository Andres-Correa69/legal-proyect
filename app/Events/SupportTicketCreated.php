<?php

namespace App\Events;

use App\Models\SupportConversation;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportTicketCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $ticket;

    public function __construct(SupportConversation $conversation, User $user)
    {
        $this->ticket = [
            'id' => $conversation->id,
            'ticket_number' => $conversation->ticket_number,
            'subject' => $conversation->subject,
            'status' => $conversation->status,
            'priority' => $conversation->priority,
            'company_name' => $conversation->company?->name ?? 'N/A',
            'branch_name' => $conversation->branch?->name ?? null,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'created_at' => $conversation->created_at->toISOString(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('support.admin'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.new';
    }
}
