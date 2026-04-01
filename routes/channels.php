<?php

use App\Models\ChatParticipant;
use App\Models\SupportConversation;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

// User notification channel (personal, for unread badge updates)
Broadcast::channel('chat.user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Conversation channel — only participants can listen
Broadcast::channel('chat.conversation.{conversationId}', function ($user, $conversationId) {
    return ChatParticipant::where('conversation_id', $conversationId)
        ->where('user_id', $user->id)
        ->whereNull('left_at')
        ->exists();
});

// Support conversation channel — ticket owner can listen
Broadcast::channel('support.conversation.{conversationId}', function ($user, $conversationId) {
    return SupportConversation::where('id', $conversationId)
        ->where('user_id', $user->id)
        ->exists();
});

// Support admin channel — for new ticket notifications (Administrador listens here)
Broadcast::channel('support.admin', function ($user) {
    return true;
});
