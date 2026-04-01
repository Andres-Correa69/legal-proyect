import { useState, useEffect, useCallback } from 'react';
import { appointmentsApi } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import type { AppointmentReminder, CalendarRemindersCount } from '@/types';

interface UseCalendarRemindersReturn {
    data: CalendarRemindersCount | null;
    reminders: AppointmentReminder[];
    isLoading: boolean;
    pendingCount: number;
    isRead: boolean;
    markAsRead: () => void;
    markOneRead: (id: number) => Promise<void>;
    markAllRead: () => Promise<void>;
    dismissOne: (id: number) => Promise<void>;
    refresh: () => Promise<void>;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const READ_KEY = 'calendar_reminders_read';
const READ_COUNT_KEY = 'calendar_reminders_read_count';

let cachedData: CalendarRemindersCount | null = null;
let cachedReminders: AppointmentReminder[] = [];
let isFirstLoadOfSession = true;

function getIsReadFromStorage(currentCount: number): boolean {
    try {
        const stored = sessionStorage.getItem(READ_KEY);
        const storedCount = sessionStorage.getItem(READ_COUNT_KEY);
        if (stored === 'true' && storedCount === String(currentCount)) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function setReadInStorage(read: boolean, count: number): void {
    try {
        sessionStorage.setItem(READ_KEY, String(read));
        sessionStorage.setItem(READ_COUNT_KEY, String(count));
    } catch {
        // sessionStorage not available
    }
}

function clearReadStorage(): void {
    try {
        sessionStorage.removeItem(READ_KEY);
        sessionStorage.removeItem(READ_COUNT_KEY);
    } catch {
        // sessionStorage not available
    }
}

export function useCalendarReminders(): UseCalendarRemindersReturn {
    const { hasPermission } = usePermissions();
    const [data, setData] = useState<CalendarRemindersCount | null>(cachedData);
    const [reminders, setReminders] = useState<AppointmentReminder[]>(cachedReminders);
    const [isLoading, setIsLoading] = useState(false);
    const [isRead, setIsRead] = useState(false);
    const canView = hasPermission('appointments.view');

    const fetchReminders = useCallback(async () => {
        if (!canView) return;

        setIsLoading(true);
        try {
            const [countResult, remindersList] = await Promise.all([
                appointmentsApi.getRemindersCount(),
                appointmentsApi.getReminders(),
            ]);

            cachedData = countResult;
            cachedReminders = remindersList;
            setData(countResult);
            setReminders(remindersList);

            if (isFirstLoadOfSession) {
                isFirstLoadOfSession = false;
                clearReadStorage();
                setIsRead(false);
            } else {
                const wasRead = getIsReadFromStorage(countResult.total);
                setIsRead(wasRead);
            }
        } catch (err) {
            console.error('Error fetching calendar reminders:', err);
        } finally {
            setIsLoading(false);
        }
    }, [canView]);

    const markAsRead = useCallback(() => {
        const count = cachedData?.total ?? 0;
        setIsRead(true);
        setReadInStorage(true, count);
    }, []);

    const markOneRead = useCallback(async (id: number) => {
        try {
            await appointmentsApi.markReminderRead(id);
            await fetchReminders();
        } catch (err) {
            console.error('Error marking reminder as read:', err);
        }
    }, [fetchReminders]);

    const markAllRead = useCallback(async () => {
        try {
            await appointmentsApi.markAllRemindersRead();
            markAsRead();
            await fetchReminders();
        } catch (err) {
            console.error('Error marking all reminders as read:', err);
        }
    }, [fetchReminders, markAsRead]);

    const dismissOne = useCallback(async (id: number) => {
        try {
            await appointmentsApi.dismissReminder(id);
            await fetchReminders();
        } catch (err) {
            console.error('Error dismissing reminder:', err);
        }
    }, [fetchReminders]);

    const refresh = useCallback(async () => {
        await fetchReminders();
    }, [fetchReminders]);

    useEffect(() => {
        if (!cachedData) {
            fetchReminders();
        }
        const interval = setInterval(fetchReminders, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchReminders]);

    return {
        data,
        reminders,
        isLoading,
        pendingCount: data?.total ?? 0,
        isRead,
        markAsRead,
        markOneRead,
        markAllRead,
        dismissOne,
        refresh,
    };
}
