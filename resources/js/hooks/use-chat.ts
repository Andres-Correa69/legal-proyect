import { useState, useEffect, useCallback, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { chatApi } from '@/lib/api';
import { notifyChatRead } from '@/hooks/use-chat-unread';
import echo from '@/echo';
import type { ChatConversation, ChatMessage, ChatContact } from '@/types';

// Polling: 5s when no WebSocket, 30s as fallback when WebSocket is active
const POLL_INTERVAL = echo ? 30 * 1000 : 5 * 1000;

interface UseChatReturn {
    conversations: ChatConversation[];
    activeConversation: ChatConversation | null;
    messages: ChatMessage[];
    contacts: ChatContact[];
    isLoadingConversations: boolean;
    isLoadingMessages: boolean;
    isLoadingContacts: boolean;
    isSending: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectConversation: (conversation: ChatConversation) => void;
    sendMessage: (body: string, attachment?: File) => Promise<void>;
    startPersonalChat: (userId: number) => Promise<void>;
    createGroupChat: (name: string, participantIds: number[], description?: string) => Promise<void>;
    loadContacts: () => Promise<void>;
    refreshConversations: () => Promise<void>;
    leaveGroup: (conversationId: number) => Promise<void>;
    addParticipants: (conversationId: number, userIds: number[]) => Promise<void>;
    updateGroup: (conversationId: number, data: { name?: string; description?: string }) => Promise<void>;
    deleteMessage: (messageId: number) => Promise<void>;
    deleteConversation: (conversationId: number) => Promise<void>;
}

export function useChat(): UseChatReturn {
    const { props } = usePage<{ auth: { user: { id: number } } }>();
    const currentUserId = props.auth?.user?.id;

    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeConversationRef = useRef<ChatConversation | null>(null);

    // Keep ref in sync with state for use in Echo callbacks
    useEffect(() => {
        activeConversationRef.current = activeConversation;
    }, [activeConversation]);

    // Fetch conversations
    const refreshConversations = useCallback(async () => {
        setIsLoadingConversations(true);
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
        } catch {
            // silently fail
        } finally {
            setIsLoadingConversations(false);
        }
    }, []);

    // Fetch messages for active conversation
    const fetchMessages = useCallback(async (conversationId: number) => {
        try {
            const data = await chatApi.getMessages(conversationId);
            setMessages(data);
        } catch {
            // silently fail
        }
    }, []);

    // Load contacts
    const loadContacts = useCallback(async () => {
        setIsLoadingContacts(true);
        try {
            const data = await chatApi.getContacts();
            setContacts(data);
        } catch {
            // silently fail
        } finally {
            setIsLoadingContacts(false);
        }
    }, []);

    // Select conversation
    const selectConversation = useCallback(async (conversation: ChatConversation) => {
        setActiveConversation(conversation);
        setIsLoadingMessages(true);
        try {
            const data = await chatApi.getMessages(conversation.id);
            setMessages(data);
            await chatApi.markAsRead(conversation.id);
            setConversations(prev =>
                prev.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c)
            );
            notifyChatRead();
        } catch {
            // silently fail
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    // Send message (supports optional file attachment)
    const sendMessage = useCallback(async (body: string, attachment?: File) => {
        if (!activeConversation || (!body.trim() && !attachment)) return;
        setIsSending(true);
        try {
            const message = await chatApi.sendMessage(activeConversation.id, body.trim(), attachment);
            setMessages(prev => [...prev, message]);
            setConversations(prev => {
                const updated = prev.map(c =>
                    c.id === activeConversation.id
                        ? { ...c, latest_message: message, last_message_at: message.created_at, unread_count: 0 }
                        : c
                );
                return updated.sort((a, b) => {
                    const aTime = a.last_message_at || a.created_at;
                    const bTime = b.last_message_at || b.created_at;
                    return new Date(bTime).getTime() - new Date(aTime).getTime();
                });
            });

            // Quick status re-fetch: the recipient may mark as read/delivered within seconds
            const convId = activeConversation.id;
            setTimeout(() => fetchMessages(convId), 2000);
            setTimeout(() => fetchMessages(convId), 5000);
        } catch {
            // silently fail
        } finally {
            setIsSending(false);
        }
    }, [activeConversation, fetchMessages]);

    // Start personal chat
    const startPersonalChat = useCallback(async (userId: number) => {
        try {
            const conversation = await chatApi.createConversation({
                type: 'personal',
                participant_ids: [userId],
            });
            setConversations(prev => {
                const exists = prev.find(c => c.id === conversation.id);
                if (exists) return prev;
                return [conversation, ...prev];
            });
            selectConversation(conversation);
        } catch {
            // silently fail
        }
    }, [selectConversation]);

    // Create group chat
    const createGroupChat = useCallback(async (name: string, participantIds: number[], description?: string) => {
        try {
            const conversation = await chatApi.createConversation({
                type: 'group',
                participant_ids: participantIds,
                name,
                description,
            });
            setConversations(prev => [conversation, ...prev]);
            selectConversation(conversation);
        } catch {
            // silently fail
        }
    }, [selectConversation]);

    // Leave group
    const leaveGroup = useCallback(async (conversationId: number) => {
        try {
            await chatApi.leaveConversation(conversationId);
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(null);
                setMessages([]);
            }
        } catch {
            // silently fail
        }
    }, [activeConversation]);

    // Add participants to group
    const addParticipants = useCallback(async (conversationId: number, userIds: number[]) => {
        try {
            await chatApi.addParticipants(conversationId, userIds);
            await refreshConversations();
        } catch {
            // silently fail
        }
    }, [refreshConversations]);

    // Update group
    const updateGroup = useCallback(async (conversationId: number, data: { name?: string; description?: string }) => {
        try {
            const updated = await chatApi.updateConversation(conversationId, data);
            setConversations(prev =>
                prev.map(c => c.id === conversationId ? { ...c, ...updated } : c)
            );
            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? { ...prev, ...updated } : prev);
            }
        } catch {
            // silently fail
        }
    }, [activeConversation]);

    // Delete a message (own messages only)
    const deleteMessage = useCallback(async (messageId: number) => {
        if (!activeConversation) return;
        try {
            await chatApi.deleteMessage(activeConversation.id, messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch {
            // silently fail
        }
    }, [activeConversation]);

    // Delete a conversation
    const deleteConversation = useCallback(async (conversationId: number) => {
        try {
            await chatApi.deleteConversation(conversationId);
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(null);
                setMessages([]);
            }
            notifyChatRead();
        } catch {
            // silently fail
        }
    }, [activeConversation]);

    // Load conversations on mount
    useEffect(() => {
        refreshConversations();
    }, [refreshConversations]);

    // ─── Real-time: Listen on the active conversation channel (only if Echo available) ───
    useEffect(() => {
        if (!echo || !activeConversation) return;

        const channelName = `chat.conversation.${activeConversation.id}`;

        echo.private(channelName)
            .listen('.message.new', (event: { message: ChatMessage }) => {
                const msg = event.message;

                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                setConversations(prev => {
                    const updated = prev.map(c =>
                        c.id === activeConversation.id
                            ? { ...c, latest_message: msg, last_message_at: msg.created_at }
                            : c
                    );
                    return updated.sort((a, b) => {
                        const aTime = a.last_message_at || a.created_at;
                        const bTime = b.last_message_at || b.created_at;
                        return new Date(bTime).getTime() - new Date(aTime).getTime();
                    });
                });

                chatApi.markAsRead(activeConversation.id).catch(() => {});
                notifyChatRead();
            })
            .listen('.message.deleted', (event: { messageId: number }) => {
                setMessages(prev => prev.filter(m => m.id !== event.messageId));
            })
            .listen('.message.status', (event: { messageIds: number[]; status: 'sent' | 'delivered' | 'read' }) => {
                setMessages(prev =>
                    prev.map(m =>
                        event.messageIds.includes(m.id) ? { ...m, status: event.status } : m
                    )
                );
            });

        return () => {
            echo?.leave(channelName);
        };
    }, [activeConversation?.id]);

    // ─── Real-time: Listen on user channel for unread updates (only if Echo available) ───
    useEffect(() => {
        if (!echo || !currentUserId) return;

        const channelName = `chat.user.${currentUserId}`;

        echo.private(channelName)
            .listen('.unread.update', (event: { conversationId: number }) => {
                const activeId = activeConversationRef.current?.id;
                if (event.conversationId !== activeId) {
                    refreshConversations();
                }
            });

        return () => {
            echo?.leave(channelName);
        };
    }, [currentUserId, refreshConversations]);

    // ─── Polling (primary when no WebSocket, fallback when WebSocket active) ───
    useEffect(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }

        if (activeConversation) {
            pollingRef.current = setInterval(() => {
                fetchMessages(activeConversation.id);
            }, POLL_INTERVAL);
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [activeConversation, fetchMessages]);

    return {
        conversations,
        activeConversation,
        messages,
        contacts,
        isLoadingConversations,
        isLoadingMessages,
        isLoadingContacts,
        isSending,
        searchTerm,
        setSearchTerm,
        selectConversation,
        sendMessage,
        startPersonalChat,
        createGroupChat,
        loadContacts,
        refreshConversations,
        leaveGroup,
        addParticipants,
        updateGroup,
        deleteMessage,
        deleteConversation,
    };
}
