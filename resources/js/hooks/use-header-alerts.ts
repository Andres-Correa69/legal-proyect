import { useState, useEffect, useCallback } from 'react';
import { invoiceAlertsApi, purchaseAlertsApi, type InvoiceAlertData, type PurchaseAlertData } from '@/lib/api';
import { usePermissions } from '@/lib/permissions';
import { playAlertSound, playDismissSound } from '@/lib/sounds';

interface UseHeaderAlertsReturn {
    alertData: InvoiceAlertData | null;
    purchaseAlertData: PurchaseAlertData | null;
    isLoading: boolean;
    totalAlerts: number;
    totalSalesAlerts: number;
    totalPurchaseAlerts: number;
    isRead: boolean;
    markAsRead: () => void;
    onAlertClick: () => void;
    refresh: () => Promise<void>;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutos
const READ_KEY = 'invoice_alerts_read';
const READ_COUNT_KEY = 'invoice_alerts_read_count';

// Variables a nivel de módulo — persisten mientras la SPA esté viva
// (no se resetean al navegar entre páginas con Inertia)
// Se resetean al refrescar la página o hacer login (nuevo page load)
let hasPlayedSessionSound = false;
let cachedAlertData: InvoiceAlertData | null = null;
let cachedPurchaseAlertData: PurchaseAlertData | null = null;
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
        // sessionStorage no disponible
    }
}

function clearReadStorage(): void {
    try {
        sessionStorage.removeItem(READ_KEY);
        sessionStorage.removeItem(READ_COUNT_KEY);
    } catch {
        // sessionStorage no disponible
    }
}

export function useHeaderAlerts(): UseHeaderAlertsReturn {
    const { hasPermission } = usePermissions();
    const [alertData, setAlertData] = useState<InvoiceAlertData | null>(cachedAlertData);
    const [purchaseAlertData, setPurchaseAlertData] = useState<PurchaseAlertData | null>(cachedPurchaseAlertData);
    const [isLoading, setIsLoading] = useState(false);
    const [isRead, setIsRead] = useState(false);
    const canViewSales = hasPermission('sales.view');
    const canViewPurchases = hasPermission('inventory.purchases.view');

    const fetchAlerts = useCallback(async () => {
        if (!canViewSales && !canViewPurchases) return;

        setIsLoading(true);
        try {
            const promises: [Promise<InvoiceAlertData | null>, Promise<PurchaseAlertData | null>] = [
                canViewSales ? invoiceAlertsApi.getAlerts() : Promise.resolve(null),
                canViewPurchases ? purchaseAlertsApi.getAlerts().catch(() => null) : Promise.resolve(null),
            ];

            const [salesData, purchaseData] = await Promise.all(promises);

            if (salesData) {
                cachedAlertData = salesData;
                setAlertData(salesData);
            }
            if (purchaseData) {
                cachedPurchaseAlertData = purchaseData;
                setPurchaseAlertData(purchaseData);
            }

            const totalCount = (salesData?.total_alerts ?? 0) + (purchaseData?.total_alerts ?? 0);

            // Primera carga de la sesión (login / refresh de página):
            // limpiar estado leído anterior y sonar si hay alertas
            if (isFirstLoadOfSession) {
                isFirstLoadOfSession = false;
                clearReadStorage();
                setIsRead(false);

                if (!hasPlayedSessionSound && totalCount > 0) {
                    hasPlayedSessionSound = true;
                    playAlertSound();
                }
            } else {
                // Navegación intra-SPA: respetar estado de sessionStorage
                const wasRead = getIsReadFromStorage(totalCount);
                setIsRead(wasRead);
            }
        } catch (err) {
            console.error('Error fetching alerts:', err);
        } finally {
            setIsLoading(false);
        }
    }, [canViewSales, canViewPurchases]);

    const totalSalesAlerts = alertData?.total_alerts ?? 0;
    const totalPurchaseAlerts = purchaseAlertData?.total_alerts ?? 0;
    const totalAlerts = totalSalesAlerts + totalPurchaseAlerts;

    const markAsRead = useCallback(() => {
        setIsRead(true);
        setReadInStorage(true, totalAlerts);
        playDismissSound();
    }, [totalAlerts]);

    // Sonido al hacer click en una alerta individual
    const onAlertClick = useCallback(() => {
        playAlertSound();
    }, []);

    const refresh = useCallback(async () => {
        hasPlayedSessionSound = true;
        await fetchAlerts();
    }, [fetchAlerts]);

    // Fetch on mount + polling cada 5 min
    useEffect(() => {
        if (!cachedAlertData && !cachedPurchaseAlertData) {
            fetchAlerts();
        }
        const interval = setInterval(fetchAlerts, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    return {
        alertData,
        purchaseAlertData,
        isLoading,
        totalAlerts,
        totalSalesAlerts,
        totalPurchaseAlerts,
        isRead,
        markAsRead,
        onAlertClick,
        refresh,
    };
}
