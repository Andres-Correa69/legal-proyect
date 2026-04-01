import { useState, useCallback, useEffect, useRef } from 'react';
import { supportApi } from '@/lib/api';
import { notifySupportRead } from '@/hooks/use-support-unread';
import echo from '@/echo';
import type { SupportConversation, SupportMessage } from '@/types';

const POLL_INTERVAL = echo ? 5 * 1000 : 3 * 1000;

export function useSupportChat() {
    const [conversations, setConversations] = useState<SupportConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<SupportConversation | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const activeConversationRef = useRef<SupportConversation | null>(null);

    // Full message re-fetch (same pattern as internal chat)
    const fetchMessages = useCallback(async (convId: number) => {
        try {
            const msgs = await supportApi.getMessages(convId);
            setMessages(msgs);
        } catch {
            // silently fail
        }
    }, []);

    const refreshConversations = useCallback(async () => {
        setIsLoadingConversations(true);
        try {
            const data = await supportApi.getConversations('ticket');
            setConversations(data);
        } catch {
            // silently fail
        } finally {
            setIsLoadingConversations(false);
        }
    }, []);

    const selectConversation = useCallback(async (conversation: SupportConversation) => {
        setActiveConversation(conversation);
        activeConversationRef.current = conversation;
        setIsLoadingMessages(true);
        try {
            const msgs = await supportApi.getMessages(conversation.id);
            setMessages(msgs);

            if (conversation.unread_count > 0) {
                await supportApi.markAsRead(conversation.id);
                setConversations((prev) =>
                    prev.map((c) => (c.id === conversation.id ? { ...c, unread_count: 0 } : c))
                );
                notifySupportRead();
            }
        } catch {
            // silently fail
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    // Fire-and-forget send + re-fetch
    const sendMessage = useCallback((body: string, attachment?: File) => {
        if (!activeConversationRef.current) return;
        const convId = activeConversationRef.current.id;

        supportApi.sendMessage(convId, body, attachment)
            .then((message) => {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                refreshConversations();
            })
            .catch(() => {
                // silently fail — polling will catch it
            });

        // Re-fetch full messages after a delay
        setTimeout(() => fetchMessages(convId), 2000);
        setTimeout(() => fetchMessages(convId), 5000);
    }, [fetchMessages, refreshConversations]);

    const createConversation = useCallback(async (subject: string, description: string, attachments?: File[]) => {
        const conversation = await supportApi.createConversation({ subject, description, attachments });
        setConversations((prev) => [conversation, ...prev]);
        await selectConversation(conversation);
        return conversation;
    }, [selectConversation]);

    const closeConversation = useCallback(async () => {
        if (!activeConversationRef.current) return;
        try {
            await supportApi.closeConversation(activeConversationRef.current.id);
            refreshConversations();
            setActiveConversation(null);
            activeConversationRef.current = null;
            setMessages([]);
        } catch {
            // silently fail
        }
    }, [refreshConversations]);

    // Initial load
    useEffect(() => {
        refreshConversations();
    }, [refreshConversations]);

    // Polling — full refetch every interval
    useEffect(() => {
        if (!activeConversationRef.current) return;
        const convId = activeConversationRef.current.id;

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
    }, [activeConversation?.id]);

    // WebSocket: listen for new messages on active conversation
    useEffect(() => {
        if (!echo || !activeConversationRef.current) return;

        const channelName = `support.conversation.${activeConversationRef.current.id}`;

        try {
            echo.private(channelName)
                .listen('.message.new', (e: { message: SupportMessage }) => {
                    if (e.message.sender_type === 'admin') {
                        setMessages((prev) => {
                            if (prev.some((m) => m.id === e.message.id)) return prev;
                            return [...prev, e.message];
                        });
                        supportApi.markAsRead(activeConversationRef.current!.id);
                        notifySupportRead();
                    }
                })
                .listen('.ticket.updated', (e: { ticket: Partial<SupportConversation> }) => {
                    setActiveConversation((prev) => prev ? { ...prev, ...e.ticket } : prev);
                    refreshConversations();
                });
        } catch {
            // silently fail
        }

        return () => {
            try { echo?.leave(channelName); } catch { /* */ }
        };
    }, [activeConversation?.id, refreshConversations]);

    return {
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isSending,
        refreshConversations,
        selectConversation,
        sendMessage,
        createConversation,
        closeConversation,
    };
}
