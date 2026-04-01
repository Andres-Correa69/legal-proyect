import { useState, useCallback } from 'react';
import { twoFactorApi, type TwoFactorStatus, type TrustedDevice } from '@/lib/api';
import type { ApiError } from '@/types';

interface UseTwoFactorReturn {
    status: TwoFactorStatus | null;
    trustedDevices: TrustedDevice[];
    isLoading: boolean;
    error: string | null;

    fetchStatus: () => Promise<void>;
    fetchTrustedDevices: () => Promise<void>;
    initiateActivation: () => Promise<{ success: boolean; message?: string }>;
    confirmActivation: (code: string) => Promise<{ success: boolean; message?: string }>;
    disable: (password: string) => Promise<{ success: boolean; message?: string }>;
    removeTrustedDevice: (deviceId: number) => Promise<{ success: boolean; message?: string }>;
}

export function useTwoFactor(): UseTwoFactorReturn {
    const [status, setStatus] = useState<TwoFactorStatus | null>(null);
    const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await twoFactorApi.getStatus();
            setStatus(data);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al obtener estado de 2FA');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTrustedDevices = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await twoFactorApi.getTrustedDevices();
            setTrustedDevices(data);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al obtener dispositivos');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const initiateActivation = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await twoFactorApi.initiateActivation();
            return { success: true, message: response.message };
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al iniciar activacion');
            return { success: false, message: apiError.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const confirmActivation = useCallback(async (code: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await twoFactorApi.confirmActivation(code);
            await fetchStatus();
            return { success: true, message: response.message };
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al confirmar activacion');
            return { success: false, message: apiError.message };
        } finally {
            setIsLoading(false);
        }
    }, [fetchStatus]);

    const disable = useCallback(async (password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await twoFactorApi.disable(password);
            await fetchStatus();
            return { success: true, message: response.message };
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al desactivar 2FA');
            return { success: false, message: apiError.message };
        } finally {
            setIsLoading(false);
        }
    }, [fetchStatus]);

    const removeTrustedDevice = useCallback(async (deviceId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await twoFactorApi.removeTrustedDevice(deviceId);
            await fetchTrustedDevices();
            return { success: true, message: response.message };
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Error al eliminar dispositivo');
            return { success: false, message: apiError.message };
        } finally {
            setIsLoading(false);
        }
    }, [fetchTrustedDevices]);

    return {
        status,
        trustedDevices,
        isLoading,
        error,
        fetchStatus,
        fetchTrustedDevices,
        initiateActivation,
        confirmActivation,
        disable,
        removeTrustedDevice,
    };
}
