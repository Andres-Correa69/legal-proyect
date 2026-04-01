import { useEffect, useState } from "react";
import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTwoFactor } from "@/hooks/use-two-factor";
import {
    Shield,
    ShieldOff,
    Smartphone,
    Monitor,
    Trash2,
    Loader2,
    CheckCircle,
    AlertTriangle
} from "lucide-react";

export default function SecurityPage() {
    const {
        status,
        trustedDevices,
        isLoading,
        fetchStatus,
        fetchTrustedDevices,
        disable,
        removeTrustedDevice
    } = useTwoFactor();

    const [showDisableDialog, setShowDisableDialog] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();
        fetchTrustedDevices();
    }, [fetchStatus, fetchTrustedDevices]);

    const handleDisable = async () => {
        setError(null);
        const result = await disable(password);
        if (result.success) {
            setShowDisableDialog(false);
            setPassword("");
        } else {
            setError(result.message || "Error al desactivar 2FA");
        }
    };

    const handleRemoveDevice = async (deviceId: number) => {
        if (confirm("Estas seguro de eliminar este dispositivo?")) {
            await removeTrustedDevice(deviceId);
        }
    };

    const getDeviceIcon = (platform: string) => {
        if (platform.includes('Android') || platform.includes('iOS')) {
            return <Smartphone className="h-5 w-5" />;
        }
        return <Monitor className="h-5 w-5" />;
    };

    return (
        <AppLayout title="Seguridad">
            <Head title="Seguridad" />

            <div className="max-w-4xl mx-auto space-y-6">
                {/* Estado de 2FA */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Autenticacion en 2 pasos
                        </CardTitle>
                        <CardDescription>
                            Protege tu cuenta con verificacion adicional por correo electronico
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {status?.email_2fa_enabled ? (
                                    <>
                                        <CheckCircle className="h-8 w-8 text-green-600" />
                                        <div>
                                            <p className="font-medium text-green-700">Activado</p>
                                            <p className="text-sm text-muted-foreground">
                                                Desde {status.enabled_at ? new Date(status.enabled_at).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                                        <div>
                                            <p className="font-medium text-yellow-700">No activado</p>
                                            <p className="text-sm text-muted-foreground">
                                                Tu cuenta no tiene proteccion adicional
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            {status?.email_2fa_enabled && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowDisableDialog(true)}
                                >
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    Desactivar
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Dispositivos confiables */}
                {status?.email_2fa_enabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dispositivos confiables</CardTitle>
                            <CardDescription>
                                Estos dispositivos pueden iniciar sesion sin codigo de verificacion
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : trustedDevices.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    No hay dispositivos confiables
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {trustedDevices.map((device) => (
                                        <div
                                            key={device.id}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getDeviceIcon(device.platform)}
                                                <div>
                                                    <p className="font-medium">{device.device_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        IP: {device.ip_address} -
                                                        Ultimo uso: {new Date(device.last_used_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {device.trusted_until && (
                                                    <Badge variant="outline">
                                                        Expira: {new Date(device.trusted_until).toLocaleDateString()}
                                                    </Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveDevice(device.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dialog para desactivar 2FA */}
            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Desactivar autenticacion en 2 pasos</DialogTitle>
                        <DialogDescription>
                            Ingresa tu contrasena para confirmar la desactivacion.
                            Tu cuenta quedara menos protegida.
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password">Contrasena</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Tu contrasena actual"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDisable}
                            disabled={isLoading || !password}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Desactivando...
                                </>
                            ) : (
                                "Desactivar 2FA"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
