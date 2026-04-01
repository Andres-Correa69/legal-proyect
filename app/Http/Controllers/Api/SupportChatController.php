<?php

namespace App\Http\Controllers\Api;

use App\Events\NewSupportMessage;
use App\Events\SupportTicketCreated;
use App\Events\SupportTicketUpdated;
use App\Http\Controllers\Controller;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SupportChatController extends Controller
{
    /**
     * List support conversations for the authenticated user
     */
    public function conversations(Request $request): JsonResponse
    {
        $userId = auth()->id();
        $type = $request->query('type', 'ticket');

        $conversations = SupportConversation::forUser($userId)
            ->where('type', $type)
            ->with(['latestMessage'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->get();

        $conversations->each(function ($conversation) {
            $conversation->unread_count = $conversation->messages()
                ->where('sender_type', 'admin')
                ->whereNull('read_at')
                ->count();
        });

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * Get or create the user's support chat conversation (no ticket form needed)
     */
    public function getOrCreateChat(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Find existing open chat
        $conversation = SupportConversation::forUser($user->id)
            ->where('type', 'chat')
            ->where('status', '!=', 'resolved')
            ->with(['latestMessage'])
            ->first();

        if (!$conversation) {
            $conversation = SupportConversation::create([
                'type' => 'chat',
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'subject' => 'Chat de soporte',
                'status' => 'pending',
                'last_message_at' => now(),
            ]);

            $conversation->load('latestMessage');

            try {
                broadcast(new SupportTicketCreated($conversation, $user));
            } catch (\Throwable $e) {
                // Silently fail
            }
        }

        $conversation->unread_count = $conversation->messages()
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'data' => $conversation,
        ]);
    }

    /**
     * Get all chat conversations for the user (including resolved ones)
     */
    public function chatConversations(Request $request): JsonResponse
    {
        $userId = auth()->id();

        $conversations = SupportConversation::forUser($userId)
            ->where('type', 'chat')
            ->with(['latestMessage'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at')
            ->get();

        $conversations->each(function ($conversation) {
            $conversation->unread_count = $conversation->messages()
                ->where('sender_type', 'admin')
                ->whereNull('read_at')
                ->count();
        });

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * Create a new support ticket
     */
    public function createConversation(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'subject' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = auth()->user();

        $conversation = DB::transaction(function () use ($request, $user) {
            $ticketNumber = SupportConversation::generateTicketNumber();

            $conversation = SupportConversation::create([
                'type' => 'ticket',
                'ticket_number' => $ticketNumber,
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'user_id' => $user->id,
                'subject' => $request->subject,
                'description' => $request->description,
                'last_message_at' => now(),
            ]);

            // Create initial message from description
            SupportMessage::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'client',
                'sender_id' => $user->id,
                'sender_name' => $user->name,
                'body' => $request->description,
                'type' => 'text',
            ]);

            return $conversation;
        });

        // Upload attachments as separate messages (outside transaction for S3 calls)
        if ($request->hasFile('attachments')) {
            $service = app(CompanyFileStorageService::class);
            $company = $user->company;

            foreach ($request->file('attachments') as $file) {
                $url = $service->uploadSupportAttachment($company, $file);
                if (!$url) continue;

                $serverMime = $file->getMimeType();
                $clientMime = $file->getClientMimeType();
                $originalName = $file->getClientOriginalName();

                $attachmentType = 'document';
                if (str_starts_with($serverMime, 'image/')) {
                    $attachmentType = 'image';
                } elseif (str_starts_with($serverMime, 'audio/') || str_starts_with($clientMime, 'audio/')) {
                    $attachmentType = 'audio';
                } elseif (str_starts_with($serverMime, 'video/')) {
                    $attachmentType = str_starts_with($originalName, 'audio_') ? 'audio' : 'video';
                }

                $labels = ['image' => 'Imagen', 'video' => 'Video', 'audio' => 'Audio', 'document' => 'Documento'];

                $msg = SupportMessage::create([
                    'conversation_id' => $conversation->id,
                    'sender_type' => 'client',
                    'sender_id' => $user->id,
                    'sender_name' => $user->name,
                    'body' => $labels[$attachmentType] ?? 'Archivo adjunto',
                    'type' => 'text',
                    'attachment_url' => $url,
                    'attachment_name' => $originalName,
                    'attachment_type' => $attachmentType,
                    'attachment_size' => $file->getSize(),
                ]);

                try {
                    broadcast(new NewSupportMessage($msg));
                } catch (\Throwable $e) {}
            }
        }

        $conversation->load('latestMessage');
        $conversation->unread_count = 0;

        // Broadcast new ticket for admin listeners
        try {
            broadcast(new SupportTicketCreated($conversation, $user));
        } catch (\Throwable $e) {
            // Silently fail if WebSocket is down
        }

        return response()->json([
            'success' => true,
            'data' => $conversation,
            'message' => "Ticket {$conversation->ticket_number} creado exitosamente",
        ], 201);
    }

    /**
     * Get messages for a support conversation
     */
    public function messages(Request $request, int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = SupportConversation::forUser($userId)->findOrFail($conversationId);

        $query = $conversation->messages()
            ->orderByDesc('created_at');

        if ($request->filled('before_id')) {
            $query->where('id', '<', $request->before_id);
        }

        if ($request->filled('after_id')) {
            $query->where('id', '>', $request->after_id)
                ->orderBy('created_at');
        }

        $messages = $query->limit(50)->get();

        if (!$request->filled('after_id')) {
            $messages = $messages->reverse()->values();
        }

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * Send a message in a support conversation
     */
    public function sendMessage(Request $request, int $conversationId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'body' => 'nullable|string|max:5000',
            'attachment' => 'nullable|file|max:20480',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!$request->body && !$request->hasFile('attachment')) {
            return response()->json([
                'success' => false,
                'message' => 'Debes enviar un mensaje o un archivo adjunto',
            ], 422);
        }

        $user = auth()->user();
        $conversation = SupportConversation::forUser($user->id)->findOrFail($conversationId);

        if ($conversation->status === 'resolved') {
            return response()->json([
                'success' => false,
                'message' => 'Este ticket ya fue resuelto',
            ], 422);
        }

        $messageData = [
            'conversation_id' => $conversation->id,
            'sender_type' => 'client',
            'sender_id' => $user->id,
            'sender_name' => $user->name,
            'body' => $request->body ?? '',
            'type' => 'text',
        ];

        // Handle attachment
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $service = app(CompanyFileStorageService::class);
            $company = $user->company;

            $url = $service->uploadSupportAttachment($company, $file);

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
                $attachmentType = 'audio';
            } elseif (str_starts_with($serverMime, 'video/')) {
                $attachmentType = str_starts_with($originalName, 'audio_') ? 'audio' : 'video';
            }

            $messageData['attachment_url'] = $url;
            $messageData['attachment_name'] = $originalName;
            $messageData['attachment_type'] = $attachmentType;
            $messageData['attachment_size'] = $file->getSize();

            if (empty($messageData['body'])) {
                $labels = ['image' => 'Imagen', 'video' => 'Video', 'audio' => 'Audio', 'document' => 'Documento'];
                $messageData['body'] = $labels[$attachmentType] ?? 'Archivo adjunto';
            }
        }

        $message = SupportMessage::create($messageData);
        $conversation->update(['last_message_at' => now()]);

        try {
            broadcast(new NewSupportMessage($message));
        } catch (\Throwable $e) {
            // Silently fail if WebSocket is down
        }

        return response()->json([
            'success' => true,
            'data' => $message,
            'message' => 'Mensaje enviado',
        ], 201);
    }

    /**
     * Mark admin messages as read
     */
    public function markAsRead(Request $request, int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = SupportConversation::forUser($userId)->findOrFail($conversationId);

        $updated = $conversation->messages()
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => ['updated' => $updated],
        ]);
    }

    /**
     * Get total unread support messages count
     */
    public function unreadCount(): JsonResponse
    {
        $userId = auth()->id();

        $total = SupportMessage::whereHas('conversation', function ($q) use ($userId) {
            $q->where('user_id', $userId)->where('status', '!=', 'resolved');
        })
            ->where('sender_type', 'admin')
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['total' => $total],
        ]);
    }

    /**
     * Close a support ticket (by the user)
     */
    public function closeConversation(Request $request, int $conversationId): JsonResponse
    {
        $userId = auth()->id();
        $conversation = SupportConversation::forUser($userId)->findOrFail($conversationId);

        if ($conversation->status === 'resolved') {
            return response()->json([
                'success' => false,
                'message' => 'Este ticket ya fue resuelto',
            ], 422);
        }

        $conversation->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by_name' => auth()->user()->name,
            'resolution_notes' => 'Cerrado por el usuario',
        ]);

        // System message
        SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'client',
            'sender_id' => $userId,
            'sender_name' => auth()->user()->name,
            'body' => 'Ticket cerrado por el usuario',
            'type' => 'system',
        ]);

        $conversation->update(['last_message_at' => now()]);

        try {
            broadcast(new SupportTicketUpdated($conversation));
        } catch (\Throwable $e) {
            // Silently fail
        }

        return response()->json([
            'success' => true,
            'data' => $conversation->fresh(),
            'message' => 'Ticket cerrado exitosamente',
        ]);
    }
}
