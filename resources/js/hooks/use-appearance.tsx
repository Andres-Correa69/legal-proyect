import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

function setCookie(name: string, value: string, days: number = 365) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
}

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

function applyTheme(mode: Appearance) {
    const resolvedTheme = mode === 'system' ? getSystemTheme() : mode;

    if (resolvedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
    }
}

export function initializeTheme() {
    const savedTheme = localStorage.getItem('appearance') as Appearance | null;
    const theme = savedTheme || 'light';
    applyTheme(theme);
}

export function useAppearance() {
    const [appearance, setAppearanceState] = useState<Appearance>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('appearance') as Appearance) || 'light';
        }
        return 'light';
    });

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearanceState(mode);
        localStorage.setItem('appearance', mode);
        setCookie('appearance', mode);
        applyTheme(mode);
    }, []);

    useEffect(() => {
        applyTheme(appearance);

        // Escuchar cambios en el sistema si está en modo 'system'
        if (appearance === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [appearance]);

    const resolvedTheme = appearance === 'system' ? getSystemTheme() : appearance;

    return {
        appearance,
        updateAppearance,
        theme: resolvedTheme,
        setTheme: updateAppearance,
    } as const;
}
