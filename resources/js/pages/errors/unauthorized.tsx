import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { ShieldAlert, ArrowLeft, Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    status?: number;
    message?: string;
    requiredPermission?: string;
    type?: 'superpower' | 'permission' | 'super-admin';
}

export default function Unauthorized({ status = 403, message, type }: Props) {
    const isSuperpower = type === 'superpower';

    const defaultMessage = isSuperpower
        ? 'Este módulo no está habilitado para tu empresa. Contacta al administrador para activarlo.'
        : 'No tienes los permisos necesarios para acceder a esta sección.';

    const displayMessage = message || defaultMessage;

    return (
        <AppLayout>
            <Head title="Acceso Denegado" />

            <div className="flex min-h-[70vh] items-center justify-center p-6">
                <div className="w-full max-w-lg text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                        <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
                    </div>

                    {/* Status code */}
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                        Error {status}
                    </p>

                    {/* Title */}
                    <h1 className="mb-3 text-2xl font-bold text-foreground">
                        Acceso Denegado
                    </h1>

                    {/* Message */}
                    <p className="mb-8 text-muted-foreground leading-relaxed">
                        {displayMessage}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Button>
                        <Button
                            onClick={() => router.visit('/admin/dashboard')}
                            className="gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Ir al Dashboard
                        </Button>
                    </div>

                    {/* Support note */}
                    <div className="mt-10 rounded-lg border border-border bg-muted/50 p-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>
                                Si crees que esto es un error, contacta al equipo de soporte o a tu administrador.
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
