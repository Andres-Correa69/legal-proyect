import { useState, useEffect, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import { chatApi } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import echo from '@/echo';

// Polling: 30s when no WebSocket, 60s as fallback when WebSocket is active
const POLL_INTERVAL = echo ? 60 * 1000 : 30 * 1000;

// Cache a nivel de modulo (persiste entre navegacion Inertia)
let cachedUnreadCount = 0;

// Listeners para sincronizar entre hooks
type UnreadListener = () => void;
const listeners = new Set<UnreadListener>();

/** Llama esto desde useChat para que el header se actualice inmediatamente */
export function notifyChatRead() {
    listeners.forEach((fn) => fn());
}

export function useChatUnread() {
    const { hasPermission } = usePermissions();
    const canViewChat = hasPermission('chat.view');
    const { props } = usePage<{ auth: { user: { id: number } } }>();
    const currentUserId = props.auth?.user?.id;

    const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!canViewChat) return;
        setIsLoading(true);
        try {
            const data = await chatApi.getUnreadCount();
            cachedUnreadCount = data.total;
            setUnreadCount(data.total);
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, [canViewChat]);

    // Initial fetch + polling
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);

        // Registrar listener para refrescos inmediatos
        listeners.add(fetchUnreadCount);

        return () => {
            clearInterval(interval);
            listeners.delete(fetchUnreadCount);
        };
    }, [fetchUnreadCount]);

    // ─── Real-time: Listen for unread updates via WebSocket (only if Echo available) ───
    useEffect(() => {
        if (!echo || !currentUserId || !canViewChat) return;

        const channelName = `chat.user.${currentUserId}`;

        echo.private(channelName)
            .listen('.unread.update', () => {
                fetchUnreadCount();
            });

        return () => {
            echo?.leave(channelName);
        };
    }, [currentUserId, canViewChat, fetchUnreadCount]);

    return { unreadCount, isLoading, refresh: fetchUnreadCount };
}
