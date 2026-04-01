import { useState } from 'react';
import { router } from '@inertiajs/react';
import { authApi, twoFactorApi, type LoginRequest, type LoginWithTwoFactorRequest } from '@/lib/api';
import type { ApiError } from '@/types';

interface LoginResult {
    success: boolean;
    requires2FA?: boolean;
    subscriptionExpired?: boolean;
    error?: string;
    errors?: Record<string, string>;
}

interface UseAuthReturn {
    login: (credentials: LoginRequest) => Promise<LoginResult>;
    loginWith2FA: (data: LoginWithTwoFactorRequest) => Promise<LoginResult>;
    resend2FACode: (email: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
    isLoading: boolean;
}

export function useAuth(): UseAuthReturn {
    const [isLoading, setIsLoading] = useState(false);

    const login = async (credentials: LoginRequest): Promise<LoginResult> => {
        setIsLoading(true);

        try {
            const response = await authApi.login(credentials);

            // Verificar si requiere 2FA
            if ('requires_2fa' in response && response.requires_2fa) {
                setIsLoading(false);
                return {
                    success: false,
                    requires2FA: true
                };
            }

            // Login exitoso sin 2FA
            router.visit('/admin/dashboard', {
                preserveState: false,
                preserveScroll: false,
            });

            return { success: true };
        } catch (error) {
            setIsLoading(false);
            const apiError = error as ApiError;

            // Verificar si la suscripcion esta vencida
            if (apiError.subscription_expired) {
                return {
                    success: false,
                    subscriptionExpired: true,
                };
            }

            const formattedErrors: Record<string, string> = {};

            if (apiError.errors) {
                Object.keys(apiError.errors).forEach((key) => {
                    const errorArray = apiError.errors![key];
                    formattedErrors[key] = Array.isArray(errorArray)
                        ? errorArray[0]
                        : errorArray;
                });
            }

            return {
                success: false,
                error: apiError.message || 'Error al iniciar sesion',
                errors: Object.keys(formattedErrors).length > 0 ? formattedErrors : undefined,
            };
        }
    };

    const loginWith2FA = async (data: LoginWithTwoFactorRequest): Promise<LoginResult> => {
        setIsLoading(true);

        try {
            await twoFactorApi.verifyLogin(data);

            router.visit('/admin/dashboard', {
                preserveState: false,
                preserveScroll: false,
            });

            return { success: true };
        } catch (error) {
            setIsLoading(false);
            const apiError = error as ApiError;

            // Verificar si la suscripcion esta vencida
            if (apiError.subscription_expired) {
                return {
                    success: false,
                    subscriptionExpired: true,
                };
            }

            const formattedErrors: Record<string, string> = {};

            if (apiError.errors) {
                Object.keys(apiError.errors).forEach((key) => {
                    const errorArray = apiError.errors![key];
                    formattedErrors[key] = Array.isArray(errorArray)
                        ? errorArray[0]
                        : errorArray;
                });
            }

            return {
                success: false,
                error: apiError.message || 'Error al verificar codigo',
                errors: Object.keys(formattedErrors).length > 0 ? formattedErrors : undefined,
            };
        }
    };

    const resend2FACode = async (email: string) => {
        try {
            const response = await twoFactorApi.sendLoginCode(email);
            return { success: true, message: response.message };
        } catch (error) {
            const apiError = error as ApiError;
            return { success: false, message: apiError.message };
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Error al cerrar sesion:', error);
        } finally {
            router.visit('/login');
        }
    };

    return {
        login,
        loginWith2FA,
        resend2FACode,
        logout,
        isLoading,
    };
}
