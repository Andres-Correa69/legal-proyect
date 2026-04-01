<?php

namespace App\Http\Controllers\Api;

use App\Events\ChatMessageDeleted;
use App\Events\ChatMessageStatusUpdated;
use App\Events\ChatUnreadUpdate;
use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\User;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ChatController extends Controller
{
    /**
     * List conversations for the authenticated user
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $conversations = ChatConversation::forUser($userId)
            ->with([
                'activeParticipants.user:id,name,email,avatar_url',
                'latestMessage.sender:id,name,avatar_url',
                'activeParticipants.user.roles:id,name,slug',
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->get();

        // Calculate unread count for each conversation
        $conversations->each(function ($conversation) use ($userId) {
            $participant = $conversation->activeParticipants->firstWhere('user_id', $userId);
            $lastReadAt = $participant?->last_read_at;

            if ($lastReadAt) {
                $conversation->unread_count = $conversation->messages()
                    ->where('created_at', '>', $lastReadAt)
                    ->where('sender_id', '!=', $userId)
                    ->count();
            } else {
                $conversation->unread_count = $conversation->messages()
                    ->where('sender_id', '!=', $userId)
                    ->count();
            }
        });

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * Create a new conversation (personal or group)
     */
    public function createConversation(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:personal,group',
            'participant_ids' => 'required|array|min:1',
            'participant_ids.*' => 'integer|exists:users,id',
            'name' => 'required_if:type,group|nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = auth()->id();
        $companyId = auth()->user()->company_id;
        $type = $request->type;
        $participantIds = $request->participant_ids;

        // Verify all participants belong to the same company
        $validUsers = User::where('company_id', $companyId)
            ->whereIn('id', $participantIds)
            ->count();

        if ($validUsers !== count($participantIds)) {
            return response()->json([
                'success' => false,
                'message' => 'Todos los participantes deben pertenecer a tu empresa',
            ], 403);
        }

        // For personal chats, check if conversation already exists
        if ($type === 'personal') {
            if (count($participantIds) !== 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Un chat personal debe tener exactamente un participante',
                ], 422);
            }

            $otherUserId = $participantIds[0];

            if ($otherUserId === $userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes crear un chat contigo mismo',
                ], 422);
            }

            // Find existing personal conversation between these two users
            $existing = ChatConversation::where('type', 'personal')
                ->whereHas('activeParticipants', function ($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->whereHas('activeParticipants', function ($q) use ($otherUserId) {
                    $q->where('user_id', $otherUserId);
                })
                ->with([
                    'activeParticipants.user:id,name,email,avatar_url',
                    'latestMessage.sender:id,name,avatar_url',
                ])
                ->first();

            if ($existing) {
                $existing->unread_count = 0;
                return response()->json([
                    'success' => true,
                    'data' => $existing,
                    'message' => 'Conversacion existente',
                ]);
            }
        }

        // Create conversation
        $conversation = DB::transaction(function () use ($request, $userId, $companyId, $type, $participantIds) {
            $conversation = ChatConversation::create([
                'company_id' => $companyId,
                'type' => $type,
                'name' => $type === 'group' ? $request->name : null,
                'description' => $type === 'group' ? $request->description : null,
                'created_by' => $userId,
            ]);

            // Add creator as participant (admin for groups)
            ChatParticipant::create([
                'conversation_id' => $conversation->id,
                'user_id' => $userId,
                'role' => $type === 'group' ? 'admin' : 'member',
                'last_read_at' => now(),
            ]);

            // Add other participants
            foreach ($participantIds as $participantId) {
                if ($participantId !== $userId) {
                    ChatParticipant::create([
                        'conversation_id' => $conversation->id,
                        'user_id' => $participantId,
                        'role' => 'member',
                    ]);
                }
            }

            // System message for group creation
            if ($type === 'group') {
                $creatorName = auth()->user()->name;
                ChatMessage::create([
                    'conversation_id' => $conversation->id,
                    'company_id' => $companyId,
                    'sender_id' => $userId,
                    'body' => "$creatorName creo el grupo",
                    'type' => 'system',
                ]);
                $conversation->update(['last_message_at' => now()]);
            }

            return $conversation;
        });

        $conversation->load([
            'activeParticipants.user:id,name,email,avatar_url',
            'latestMessage.sender:id,name,avatar_url',
        ]);
        $conversation->unread_count = 0;

        return response()->json([
            'success' => true,
            'data' => $conversation,
            'message' => 'Conversacion creada',
        ], 201);
    }

    /**
     * Get messages for a conversation
     */
    public function messages(Request $request, int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)->findOrFail($conversationId);

        $query = $conversation->messages()
            ->with('sender:id,name,avatar_url')
            ->orderByDesc('created_at');

        // Cursor-based pagination
        if ($request->filled('before_id')) {
            $query->where('id', '<', $request->before_id);
        }

        $messages = $query->limit(50)->get()->reverse()->values();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * Send a message to a conversation (supports text + optional attachment)
     */
    public function sendMessage(Request $request, int $conversationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'body' => 'nullable|string|max:5000',
            'attachment' => 'nullable|file|max:20480', // 20MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Must have body or attachment
        if (!$request->body && !$request->hasFile('attachment')) {
            return response()->json([
                'success' => false,
                'message' => 'Debes enviar un mensaje o un archivo adjunto',
            ], 422);
        }

        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)->findOrFail($conversationId);

        $messageData = [
            'conversation_id' => $conversation->id,
            'company_id' => auth()->user()->company_id,
            'sender_id' => $userId,
            'body' => $request->body ?? '',
            'type' => 'text',
        ];

        // Handle attachment
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $service = app(CompanyFileStorageService::class);
            $company = auth()->user()->company;

            $url = $service->uploadChatAttachment($company, $file);

            if (!$url) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al subir el archivo adjunto',
                ], 500);
            }

            $serverMime = $file->getMimeType();
            $clientMime = $file->getClientMimeType();
            $originalName = $file->getClientOriginalName();

            $attachmentType = 'document';
            if (str_starts_with($serverMime, 'image/')) {
                $attachmentType = 'image';
            } elseif (str_starts_with($serverMime, 'audio/') || str_starts_with($clientMime, 'audio/')) {
                // Check client mime too: browser MediaRecorder sends audio/webm but
                // PHP detects webm container as video/webm
                $attachmentType = 'audio';
            } elseif (str_starts_with($serverMime, 'video/')) {
                // Voice notes recorded as webm: if filename starts with "audio_", treat as audio
                if (str_starts_with($originalName, 'audio_')) {
                    $attachmentType = 'audio';
                } else {
                    $attachmentType = 'video';
                }
            }

            $messageData['attachment_url'] = $url;
            $messageData['attachment_name'] = $file->getClientOriginalName();
            $messageData['attachment_type'] = $attachmentType;
            $messageData['attachment_size'] = $file->getSize();

            if (empty($messageData['body'])) {
                $labels = [
                    'image' => 'Imagen',
                    'video' => 'Video',
                    'audio' => 'Audio',
                    'document' => 'Documento',
                ];
                $messageData['body'] = $labels[$attachmentType] ?? 'Archivo adjunto';
            }
        }

        $message = ChatMessage::create($messageData);

        $conversation->update(['last_message_at' => now()]);

        // Auto-mark as read for sender
        ChatParticipant::where('conversation_id', $conversation->id)
            ->where('user_id', $userId)
            ->update(['last_read_at' => now()]);

        $message->load('sender:id,name,avatar_url');

        // Broadcast real-time events (wrapped in try-catch so sending never fails if WebSocket is down)
        try {
            broadcast(new NewChatMessage($message))->toOthers();

            // Notify other participants for unread badge update
            $otherParticipants = ChatParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', '!=', $userId)
                ->whereNull('left_at')
                ->pluck('user_id');

            foreach ($otherParticipants as $participantUserId) {
                broadcast(new ChatUnreadUpdate($participantUserId, $conversation->id));
            }
        } catch (\Throwable $e) {
            \Log::warning('Chat broadcast failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $message,
            'message' => 'Mensaje enviado',
        ], 201);
    }

    /**
     * Mark conversation as read
     */
    public function markAsRead(int $conversationId): JsonResponse
    {
        $userId = auth()->id();

        // Verify user is a participant
        ChatConversation::forUser($userId)->findOrFail($conversationId);

        ChatParticipant::where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->update(['last_read_at' => now()]);

        // Update message status to 'read' for messages sent by others that aren't read yet
        $updatedIds = ChatMessage::withoutGlobalScopes()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $userId)
            ->whereIn('status', ['sent', 'delivered'])
            ->pluck('id')
            ->toArray();

        if (!empty($updatedIds)) {
            ChatMessage::withoutGlobalScopes()
                ->whereIn('id', $updatedIds)
                ->update(['status' => 'read']);

            try {
                \Log::info('Chat status: marking ' . count($updatedIds) . ' messages as read in conversation ' . $conversationId);
                broadcast(new ChatMessageStatusUpdated($conversationId, $updatedIds, 'read'));
            } catch (\Throwable $e) {
                \Log::warning('Chat status broadcast failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Marcado como leido',
        ]);
    }

    /**
     * Mark messages as delivered (called when recipient receives via WebSocket/polling)
     */
    public function markAsDelivered(Request $request, int $conversationId): JsonResponse
    {
        $userId = auth()->id();

        // Verify user is a participant
        ChatConversation::forUser($userId)->findOrFail($conversationId);

        // Update 'sent' messages from others to 'delivered'
        $updatedIds = ChatMessage::withoutGlobalScopes()
            ->where('conversation_id', $conversationId)
            ->where('sender_id', '!=', $userId)
            ->where('status', 'sent')
            ->pluck('id')
            ->toArray();

        if (!empty($updatedIds)) {
            ChatMessage::withoutGlobalScopes()
                ->whereIn('id', $updatedIds)
                ->update(['status' => 'delivered']);

            try {
                broadcast(new ChatMessageStatusUpdated($conversationId, $updatedIds, 'delivered'));
            } catch (\Throwable $e) {
                \Log::warning('Chat status broadcast failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Marcado como entregado',
        ]);
    }

    /**
     * Get company contacts available for chat
     */
    public function contacts(): JsonResponse
    {
        $user = auth()->user();

        $contacts = User::where('company_id', $user->company_id)
            ->where('id', '!=', $user->id)
            ->where('is_active', true)
            ->whereDoesntHave('roles', function ($q) {
                $q->where('slug', 'client');
            })
            ->with('roles:id,name,slug')
            ->select(['id', 'name', 'email', 'avatar_url', 'branch_id'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $contacts,
        ]);
    }

    /**
     * Get total unread count across all conversations (for header badge)
     */
    public function unreadCount(): JsonResponse
    {
        $userId = auth()->id();

        $total = 0;

        $participants = ChatParticipant::where('user_id', $userId)
            ->whereNull('left_at')
            ->get(['conversation_id', 'last_read_at']);

        foreach ($participants as $participant) {
            $query = ChatMessage::where('conversation_id', $participant->conversation_id)
                ->where('sender_id', '!=', $userId);

            if ($participant->last_read_at) {
                $query->where('created_at', '>', $participant->last_read_at);
            }

            $total += $query->count();
        }

        return response()->json([
            'success' => true,
            'data' => ['total' => $total],
        ]);
    }

    /**
     * Update a group conversation
     */
    public function updateConversation(Request $request, int $conversationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)
            ->where('type', 'group')
            ->findOrFail($conversationId);

        $conversation->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'data' => $conversation,
            'message' => 'Grupo actualizado',
        ]);
    }

    /**
     * Add participants to a group conversation
     */
    public function addParticipants(Request $request, int $conversationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)
            ->where('type', 'group')
            ->findOrFail($conversationId);

        $companyId = auth()->user()->company_id;

        // Verify users belong to the same company
        $validUsers = User::where('company_id', $companyId)
            ->whereIn('id', $request->user_ids)
            ->get(['id', 'name']);

        $added = [];
        foreach ($validUsers as $newUser) {
            $existing = ChatParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', $newUser->id)
                ->first();

            if ($existing && $existing->left_at) {
                // Re-add user who left
                $existing->update(['left_at' => null, 'joined_at' => now()]);
                $added[] = $newUser->name;
            } elseif (!$existing) {
                ChatParticipant::create([
                    'conversation_id' => $conversation->id,
                    'user_id' => $newUser->id,
                    'role' => 'member',
                ]);
                $added[] = $newUser->name;
            }
        }

        if (!empty($added)) {
            $adderName = auth()->user()->name;
            ChatMessage::create([
                'conversation_id' => $conversation->id,
                'company_id' => $companyId,
                'sender_id' => $userId,
                'body' => "$adderName agrego a " . implode(', ', $added),
                'type' => 'system',
            ]);
            $conversation->update(['last_message_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Participantes agregados',
        ]);
    }

    /**
     * Leave a group conversation
     */
    public function leaveConversation(int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)
            ->where('type', 'group')
            ->findOrFail($conversationId);

        ChatParticipant::where('conversation_id', $conversation->id)
            ->where('user_id', $userId)
            ->update(['left_at' => now()]);

        $userName = auth()->user()->name;
        ChatMessage::create([
            'conversation_id' => $conversation->id,
            'company_id' => auth()->user()->company_id,
            'sender_id' => $userId,
            'body' => "$userName salio del grupo",
            'type' => 'system',
        ]);
        $conversation->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Has salido del grupo',
        ]);
    }

    /**
     * Delete a message (only sender can delete their own messages)
     */
    public function deleteMessage(int $conversationId, int $messageId): JsonResponse
    {
        $userId = auth()->id();

        // Verify user is participant
        ChatConversation::forUser($userId)->findOrFail($conversationId);

        $message = ChatMessage::where('conversation_id', $conversationId)
            ->where('id', $messageId)
            ->where('sender_id', $userId)
            ->firstOrFail();

        // Delete attachment from S3 if exists
        if ($message->attachment_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($message->attachment_url);
        }

        $message->delete(); // soft delete

        // Broadcast deletion to other participants (don't fail if WebSocket is down)
        try {
            broadcast(new ChatMessageDeleted($conversationId, $messageId))->toOthers();
        } catch (\Throwable $e) {
            \Log::warning('Chat broadcast (delete) failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Mensaje eliminado',
        ]);
    }

    /**
     * Delete a conversation (for the current user)
     * Personal: soft-deletes if both users leave
     * Group: user leaves the group
     */
    public function deleteConversation(int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = ChatConversation::forUser($userId)->findOrFail($conversationId);

        if ($conversation->type === 'group') {
            // For groups, leaving = deleting from their perspective
            ChatParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', $userId)
                ->update(['left_at' => now()]);

            $userName = auth()->user()->name;
            ChatMessage::create([
                'conversation_id' => $conversation->id,
                'company_id' => auth()->user()->company_id,
                'sender_id' => $userId,
                'body' => "$userName salio del grupo",
                'type' => 'system',
            ]);
            $conversation->update(['last_message_at' => now()]);
        } else {
            // For personal chats, mark participant as left
            ChatParticipant::where('conversation_id', $conversation->id)
                ->where('user_id', $userId)
                ->update(['left_at' => now()]);

            // If both participants have left, soft-delete the conversation
            $activeCount = ChatParticipant::where('conversation_id', $conversation->id)
                ->whereNull('left_at')
                ->count();

            if ($activeCount === 0) {
                $conversation->delete();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Conversacion eliminada',
        ]);
    }
}
