import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTwoFactor } from "@/hooks/use-two-factor";
import { Loader2, Shield, CheckCircle } from "lucide-react";

interface TwoFactorActivationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type Step = 'intro' | 'code' | 'success';

export function TwoFactorActivationDialog({
    open,
    onOpenChange,
    onSuccess,
}: TwoFactorActivationDialogProps) {
    const { initiateActivation, confirmActivation, isLoading } = useTwoFactor();
    const [step, setStep] = useState<Step>('intro');
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            // Reset state when dialog closes
            setStep('intro');
            setCode("");
            setError(null);
            setSuccessMessage(null);
        }
    }, [open]);

    const handleInitiate = async () => {
        setError(null);
        const result = await initiateActivation();
        if (result.success) {
            setStep('code');
            setSuccessMessage(result.message || "Codigo enviado a tu correo");
        } else {
            setError(result.message || "Error al enviar codigo");
        }
    };

    const handleConfirm = async () => {
        setError(null);
        const result = await confirmActivation(code);
        if (result.success) {
            setStep('success');
            setTimeout(() => {
                onOpenChange(false);
                onSuccess?.();
            }, 2000);
        } else {
            setError(result.message || "Codigo invalido");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {step === 'intro' && (
                    <>
                        <DialogHeader>
                            <div className="flex justify-center mb-4">
                                <div className="h-16 w-16 bg-blue-500/15 rounded-full flex items-center justify-center">
                                    <Shield className="h-8 w-8 text-blue-600" />
                                </div>
                            </div>
                            <DialogTitle className="text-center">
                                Activar autenticacion en 2 pasos
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Protege tu cuenta con un codigo de verificacion que
                                enviaremos a tu correo electronico cada vez que
                                inicies sesion desde un dispositivo nuevo.
                            </DialogDescription>
                        </DialogHeader>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <DialogFooter className="sm:justify-center gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleInitiate} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Enviar codigo"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === 'code' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Ingresa el codigo</DialogTitle>
                            <DialogDescription>
                                Hemos enviado un codigo de 6 digitos a tu correo electronico.
                            </DialogDescription>
                        </DialogHeader>
                        {successMessage && (
                            <div className="bg-green-500/10 border border-green-500/20 text-green-700 text-sm p-3 rounded-md">
                                {successMessage}
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-700 text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="activation-code">Codigo de verificacion</Label>
                            <Input
                                id="activation-code"
                                type="text"
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-widest"
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setStep('intro')}>
                                Volver
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                disabled={isLoading || code.length !== 6}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    "Activar"
                                )}
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {step === 'success' && (
                    <div className="py-6 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-green-500/15 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <DialogTitle className="mb-2">Activado exitosamente</DialogTitle>
                        <DialogDescription>
                            La autenticacion en 2 pasos ha sido activada para tu cuenta.
                        </DialogDescription>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
