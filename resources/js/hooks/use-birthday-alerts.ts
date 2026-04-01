import { useState, useEffect, useCallback } from 'react';
import { birthdayApi, type BirthdayStats } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';

interface UseBirthdayAlertsReturn {
    birthdayData: BirthdayStats | null;
    isLoading: boolean;
    totalBirthdays: number;
    refresh: () => Promise<void>;
}

const POLL_INTERVAL = 30 * 60 * 1000; // 30 minutos (los cumpleaños no cambian tan frecuentemente)

let cachedBirthdayData: BirthdayStats | null = null;

export function useBirthdayAlerts(): UseBirthdayAlertsReturn {
    const { hasPermission } = usePermissions();
    const [birthdayData, setBirthdayData] = useState<BirthdayStats | null>(cachedBirthdayData);
    const [isLoading, setIsLoading] = useState(false);
    const canViewClients = hasPermission('clients.view');

    const fetchBirthdays = useCallback(async () => {
        if (!canViewClients) return;

        setIsLoading(true);
        try {
            const data = await birthdayApi.getStats();
            cachedBirthdayData = data;
            setBirthdayData(data);
        } catch (err) {
            console.error('Error fetching birthdays:', err);
        } finally {
            setIsLoading(false);
        }
    }, [canViewClients]);

    const totalBirthdays = (birthdayData?.today_count ?? 0) + (birthdayData?.week_count ?? 0);

    const refresh = useCallback(async () => {
        await fetchBirthdays();
    }, [fetchBirthdays]);

    useEffect(() => {
        if (!cachedBirthdayData) {
            fetchBirthdays();
        }
        const interval = setInterval(fetchBirthdays, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchBirthdays]);

    return {
        birthdayData,
        isLoading,
        totalBirthdays,
        refresh,
    };
}
