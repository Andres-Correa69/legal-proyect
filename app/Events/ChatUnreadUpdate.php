<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatUnreadUpdate implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $userId;
    public int $conversationId;

    public function __construct(int $userId, int $conversationId)
    {
        $this->userId = $userId;
        $this->conversationId = $conversationId;
    }

    /**
     * Notify specific user that they have a new unread message.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("chat.user.{$this->userId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'unread.update';
    }
}
