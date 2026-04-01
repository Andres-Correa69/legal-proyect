import { useState, useEffect, useCallback } from 'react';
import { supportApi } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

const POLL_INTERVAL = 15 * 1000;

let cachedUnreadCount = 0;

type UnreadListener = () => void;
const listeners = new Set<UnreadListener>();

export function notifySupportRead() {
    listeners.forEach((fn) => fn());
}

export function useSupportUnread() {
    const { hasPermission } = usePermissions();
    const canView = hasPermission('support.view');

    const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!canView) return;
        setIsLoading(true);
        try {
            const data = await supportApi.getUnreadCount();
            cachedUnreadCount = data.total;
            setUnreadCount(data.total);
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, [canView]);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
        listeners.add(fetchUnreadCount);

        return () => {
            clearInterval(interval);
            listeners.delete(fetchUnreadCount);
        };
    }, [fetchUnreadCount]);

    return { unreadCount, isLoading, refresh: fetchUnreadCount };
}
