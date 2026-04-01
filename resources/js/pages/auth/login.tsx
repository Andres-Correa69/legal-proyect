import { FormEvent, useState } from "react";
import { Head } from "@inertiajs/react";
import AuthLayout from "@/layouts/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Shield, ArrowLeft, AlertTriangle, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";

type LoginStep = 'credentials' | 'two-factor';

export default function Login() {
    const { login, loginWith2FA, resend2FACode, isLoading } = useAuth();
    const [step, setStep] = useState<LoginStep>('credentials');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [code, setCode] = useState("");
    const [trustDevice, setTrustDevice] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [generalError, setGeneralError] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const handleCredentialsSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        setGeneralError("");

        const result = await login({ email, password, remember });

        if (result.subscriptionExpired) {
            setShowSubscriptionModal(true);
            return;
        }

        if (result.requires2FA) {
            setStep('two-factor');
            setSuccessMessage("Se ha enviado un codigo de verificacion a tu correo");
            return;
        }

        if (!result.success) {
            if (result.errors) {
                setErrors(result.errors);
            }
            if (result.error) {
                setGeneralError(result.error);
            }
        }
    };

    const handleTwoFactorSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrors({});
        setGeneralError("");
        setSuccessMessage("");

        const result = await loginWith2FA({
            email,
            password,
            code,
            remember,
            trust_device: trustDevice,
        });

        if (result.subscriptionExpired) {
            setShowSubscriptionModal(true);
            return;
        }

        if (!result.success) {
            if (result.errors) {
                setErrors(result.errors);
            }
            if (result.error) {
                setGeneralError(result.error);
            }
        }
    };

    const handleResendCode = async () => {
        setSuccessMessage("");
        setGeneralError("");
        const result = await resend2FACode(email);
        if (result.success) {
            setSuccessMessage("Se ha enviado un nuevo codigo a tu correo");
        } else {
            setGeneralError(result.message || "Error al reenviar codigo");
        }
    };

    const handleBackToCredentials = () => {
        setStep('credentials');
        setCode("");
        setErrors({});
        setGeneralError("");
        setSuccessMessage("");
    };

    if (step === 'two-factor') {
        return (
            <AuthLayout
                title="Verificacion en 2 pasos"
                description="Ingresa el codigo que enviamos a tu correo"
            >
                <Head title="Verificacion 2FA" />
                <div className="space-y-5">
                    <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
                        <div className="flex justify-center mb-2">
                            <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center ring-1 ring-blue-200">
                                <Shield className="h-7 w-7 text-blue-600" />
                            </div>
                        </div>

                        {successMessage && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl">
                                {successMessage}
                            </div>
                        )}

                        {generalError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
                                {generalError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="code" className="text-slate-700 text-sm">Codigo de verificacion</Label>
                            <Input
                                id="code"
                                type="text"
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                autoComplete="one-time-code"
                                autoFocus
                                className={`text-center text-2xl tracking-widest rounded-xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 shadow-sm transition-colors ${errors.code ? "border-red-400" : ""}`}
                                maxLength={6}
                            />
                            {errors.code && (
                                <p className="text-red-600 text-xs mt-1">{errors.code}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="trust-device"
                                checked={trustDevice}
                                onCheckedChange={(checked) => setTrustDevice(checked === true)}
                            />
                            <Label htmlFor="trust-device" className="text-sm font-normal cursor-pointer text-slate-500">
                                Confiar en este dispositivo por 30 dias
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all duration-200 group"
                            disabled={isLoading || code.length !== 6}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    Verificar codigo
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </Button>

                        <div className="flex justify-between items-center text-sm pt-1">
                            <button
                                type="button"
                                onClick={handleBackToCredentials}
                                className="text-slate-400 hover:text-slate-700 flex items-center transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Volver
                            </button>
                            <button
                                type="button"
                                onClick={handleResendCode}
                                className="text-blue-600 hover:text-blue-700 transition-colors"
                                disabled={isLoading}
                            >
                                Reenviar codigo
                            </button>
                        </div>
                    </form>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Iniciar Sesion"
            description="Ingresa tus credenciales para acceder al sistema"
        >
            <Head title="Iniciar Sesion" />

            <div className="space-y-5">
                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                    {generalError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl">
                            {generalError}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-slate-700 text-sm">Correo electronico</Label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                                className={`pl-11 rounded-xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 shadow-sm transition-colors ${errors.email ? "border-red-400" : ""}`}
                            />
                        </div>
                        {errors.email && (
                            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-slate-700 text-sm">Contrasena</Label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className={`pl-11 pr-11 rounded-xl bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 h-12 shadow-sm transition-colors ${errors.password ? "border-red-400" : ""}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="remember"
                            checked={remember}
                            onCheckedChange={(checked) => setRemember(checked === true)}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-slate-500">
                            Recordar sesion
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all duration-200 group"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Iniciando sesion...
                            </>
                        ) : (
                            <>
                                Iniciar sesion
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                        )}
                    </Button>
                </form>

                <p className="text-center text-xs text-slate-400 pt-2">
                    Sistema de Gestión - LEGAL SISTEMA
                </p>
            </div>

            {/* Modal Suscripcion Vencida */}
            <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <DialogTitle className="text-center">
                            Suscripcion Vencida
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Renuevala para ingresar al sistema. Contacta al administrador para mas informacion.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowSubscriptionModal(false)}
                        >
                            Entendido
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AuthLayout>
    );
}
