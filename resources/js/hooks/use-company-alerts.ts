import { useState, useEffect, useCallback } from 'react';
import { alertRulesApi } from '@/lib/api';
import type { AlertLog, AlertStats } from '@/types';
import { usePermissions } from '@/lib/permissions';

interface UseCompanyAlertsReturn {
    recentLogs: AlertLog[];
    stats: AlertStats | null;
    isLoading: boolean;
    totalAlerts: number;
    refresh: () => Promise<void>;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

let cachedLogs: AlertLog[] | null = null;
let cachedStats: AlertStats | null = null;

export function useCompanyAlerts(): UseCompanyAlertsReturn {
    const { hasPermission } = usePermissions();
    const canView = hasPermission('alerts.view');

    const [recentLogs, setRecentLogs] = useState<AlertLog[]>(cachedLogs || []);
    const [stats, setStats] = useState<AlertStats | null>(cachedStats);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!canView) return;
        setIsLoading(true);
        try {
            const [logsData, statsData] = await Promise.all([
                alertRulesApi.getRecentLogs(),
                alertRulesApi.getStats(),
            ]);
            cachedLogs = logsData;
            cachedStats = statsData;
            setRecentLogs(logsData);
            setStats(statsData);
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, [canView]);

    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!cachedLogs) fetchData();
        const interval = setInterval(fetchData, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    return {
        recentLogs,
        stats,
        isLoading,
        totalAlerts: stats?.today_triggers ?? 0,
        refresh,
    };
}
