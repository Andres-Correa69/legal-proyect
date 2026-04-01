import { useState, useCallback, useEffect, useRef } from 'react';
import { supportApi } from '@/lib/api';
import { notifySupportRead } from '@/hooks/use-support-unread';
import echo from '@/echo';
import type { SupportConversation, SupportMessage } from '@/types';

const POLL_INTERVAL = echo ? 5 * 1000 : 3 * 1000;

/**
 * Hook for the direct support chat (no ticket form, just open and type).
 * Auto-creates a chat conversation if none exists.
 *
 * - On mount: checks if an existing chat exists (without creating one)
 * - initChat: creates or opens the chat and loads messages
 * - sendMessage: fire-and-forget, never blocks
 * - If conversation not ready when sending, queues and retries after init
 */
export function useSupportDirectChat() {
    const [conversation, setConversation] = useState<SupportConversation | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const conversationRef = useRef<SupportConversation | null>(null);
    const initPromiseRef = useRef<Promise<void> | null>(null);

    // Full message re-fetch
    const fetchMessages = useCallback(async (convId: number) => {
        try {
            const msgs = await supportApi.getMessages(convId);
            setMessages(msgs);
        } catch {
            // silently fail
        }
    }, []);

    // On mount: silently check if an existing chat exists (without creating one)
    useEffect(() => {
        supportApi.getChatConversations()
            .then((chats) => {
                const openChat = chats.find((c) => c.status !== 'resolved');
                if (openChat) {
                    setConversation(openChat);
                    conversationRef.current = openChat;
                }
            })
            .catch(() => {
                // silently fail
            });
    }, []);

    const initChat = useCallback(async () => {
        // If already initing, reuse the promise
        if (initPromiseRef.current) {
            await initPromiseRef.current;
            return;
        }

        const doInit = async () => {
            setIsLoading(true);
            try {
                const chat = await supportApi.getOrCreateChat();
                setConversation(chat);
                conversationRef.current = chat;

                // Load messages
                setIsLoadingMessages(true);
                const msgs = await supportApi.getMessages(chat.id);
                setMessages(msgs);

                if (chat.unread_count > 0) {
                    await supportApi.markAsRead(chat.id);
                    notifySupportRead();
                }
            } finally {
                setIsLoading(false);
                setIsLoadingMessages(false);
                initPromiseRef.current = null;
            }
        };

        initPromiseRef.current = doInit();
        await initPromiseRef.current;
    }, []);

    // Fire-and-forget send
    const sendMessage = useCallback((body: string, attachment?: File) => {
        const doSend = async () => {
            // If no conversation yet, init first
            if (!conversationRef.current) {
                await initChat();
            }
            if (!conversationRef.current) return; // still null after init = something is very wrong

            const convId = conversationRef.current.id;

            try {
                const message = await supportApi.sendMessage(convId, body, attachment);
                setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            } catch {
                // silently fail — polling will catch it
            }

            // Re-fetch full messages after a delay
            setTimeout(() => fetchMessages(convId), 2000);
            setTimeout(() => fetchMessages(convId), 5000);
        };

        doSend();
    }, [fetchMessages, initChat]);

    // Polling for new messages
    useEffect(() => {
        if (!conversationRef.current) return;
        const convId = conversationRef.current.id;

        const interval = setInterval(async () => {
            try {
                const msgs = await supportApi.getMessages(convId);
                setMessages((prev) => {
                    if (msgs.length !== prev.length || (msgs.length > 0 && msgs[msgs.length - 1].id !== prev[prev.length - 1]?.id)) {
                        return msgs;
                    }
                    return prev;
                });
                const hasUnread = msgs.some((m) => m.sender_type === 'admin' && !m.read_at);
                if (hasUnread) {
                    await supportApi.markAsRead(convId);
                    notifySupportRead();
                }
            } catch {
                // silently fail
            }
        }, POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [conversation?.id]);

    // WebSocket listener
    useEffect(() => {
        if (!echo || !conversationRef.current) return;

        const channelName = `support.conversation.${conversationRef.current.id}`;

        try {
            echo.private(channelName)
                .listen('.message.new', (e: { message: SupportMessage }) => {
                    if (e.message.sender_type === 'admin') {
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === e.message.id)) return prev;
                            return [...prev, e.message];
                        });
                        supportApi.markAsRead(conversationRef.current!.id);
                        notifySupportRead();
                    }
                })
                .listen('.ticket.updated', (e: { ticket: Partial<SupportConversation> }) => {
                    setConversation((prev) => prev ? { ...prev, ...e.ticket } : prev);
                    if (e.ticket.status === 'resolved') {
                        conversationRef.current = conversationRef.current
                            ? { ...conversationRef.current, ...e.ticket }
                            : null;
                    }
                });
        } catch {
            // silently fail
        }

        return () => {
            try { echo?.leave(channelName); } catch { /* */ }
        };
    }, [conversation?.id]);

    return {
        conversation,
        messages,
        isLoading,
        isLoadingMessages,
        initChat,
        sendMessage,
    };
}
