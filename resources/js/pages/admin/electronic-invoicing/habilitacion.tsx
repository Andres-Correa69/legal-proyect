import { useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { hasPermission } from "@/lib/permissions";
import type { SharedData } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Loader2, CheckCircle2, XCircle, FileCheck, Shield, FileText,
    FileMinus, FilePlus, Rocket, Upload, AlertTriangle, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
    habilitacionApi,
    type HabilitacionStatus,
    type SetEnvironmentData,
} from "@/lib/api";

interface StepStatus {
    completed: boolean;
    error?: boolean;
}

interface StepDef {
    label: string;
    icon: React.ElementType;
    status: StepStatus;
}

function getFirstIncompleteStep(steps: StepDef[]): number {
    const idx = steps.findIndex((s) => !s.status.completed);
    return idx === -1 ? steps.length - 1 : idx;
}

export default function HabilitacionDIAN() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const canManage = hasPermission("electronic-invoicing.manage", user);

    const [status, setStatus] = useState<HabilitacionStatus["data"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    // Environment form
    const [envForm, setEnvForm] = useState<SetEnvironmentData>({
        type_environment_id: 2,
        software_id: "",
        pin: "",
        certificate: "",
        certificate_password: "",
    });

    const loadStatus = async () => {
        try {
            setLoading(true);
            const res = await habilitacionApi.getStatus();
            setStatus(res.data);
            // Pre-fill form if data exists
            if (res.data.software_id) {
                setEnvForm((prev) => ({
                    ...prev,
                    software_id: res.data.software_id || "",
                    pin: res.data.pin || "",
                }));
            }
        } catch (err: any) {
            setError("Error cargando estado de habilitación");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canManage) loadStatus();
    }, [canManage]);

    const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1] || (reader.result as string);
            setEnvForm((prev) => ({ ...prev, certificate: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleSetEnvironment = async () => {
        setActionLoading("environment");
        setError(null);
        setSuccess(null);
        try {
            const res = await habilitacionApi.setEnvironment(envForm);
            if (res.success) {
                setSuccess("Ambiente configurado exitosamente");
                await loadStatus();
            } else {
                setError(res.message || "Error configurando ambiente");
            }
        } catch (err: any) {
            setError(err.message || "Error configurando ambiente");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendInvoice = async () => {
        setActionLoading("invoice");
        setError(null);
        setSuccess(null);
        try {
            const res = await habilitacionApi.sendInvoice();
            if (res.success) {
                setSuccess(res.message || "Factura enviada exitosamente");
                await loadStatus();
            } else {
                setError(res.message || "Error enviando factura");
            }
        } catch (err: any) {
            setError(err.message || "Error enviando factura");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendCreditNote = async () => {
        setActionLoading("credit");
        setError(null);
        setSuccess(null);
        try {
            const res = await habilitacionApi.sendCreditNote();
            if (res.success) {
                setSuccess(res.message || "Nota crédito enviada exitosamente");
                await loadStatus();
            } else {
                setError(res.message || "Error enviando nota crédito");
            }
        } catch (err: any) {
            setError(err.message || "Error enviando nota crédito");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendDebitNote = async () => {
        setActionLoading("debit");
        setError(null);
        setSuccess(null);
        try {
            const res = await habilitacionApi.sendDebitNote();
            if (res.success) {
                setSuccess(res.message || "Nota débito enviada exitosamente");
                await loadStatus();
            } else {
                setError(res.message || "Error enviando nota débito");
            }
        } catch (err: any) {
            setError(err.message || "Error enviando nota débito");
        } finally {
            setActionLoading(null);
        }
    };

    const handleEnableProduction = async () => {
        setActionLoading("production");
        setError(null);
        setSuccess(null);
        try {
            const res = await habilitacionApi.enableProduction();
            if (res.success) {
                setSuccess(res.message || "Habilitado a producción exitosamente");
                await loadStatus();
            } else {
                setError(res.message || "Error habilitando producción");
            }
        } catch (err: any) {
            setError(err.message || "Error habilitando producción");
        } finally {
            setActionLoading(null);
        }
    };

    // Compute step statuses
    const successfulInvoices = status?.invoices?.filter((i) => i.success) || [];
    const steps: StepDef[] = [
        {
            label: "Configurar Ambiente",
            icon: Shield,
            status: { completed: status?.environment_set || false },
        },
        {
            label: "Factura de Prueba 1",
            icon: FileText,
            status: {
                completed: successfulInvoices.length >= 1,
                error: (status?.invoices?.length ?? 0) > 0 && successfulInvoices.length < 1,
            },
        },
        {
            label: "Factura de Prueba 2",
            icon: FileText,
            status: {
                completed: successfulInvoices.length >= 2,
                error: (status?.invoices?.length ?? 0) > 1 && successfulInvoices.length < 2,
            },
        },
        {
            label: "Nota Crédito",
            icon: FileMinus,
            status: {
                completed: status?.credit_note?.success || false,
                error: status?.credit_note !== null && !status?.credit_note?.success,
            },
        },
        {
            label: "Nota Débito",
            icon: FilePlus,
            status: {
                completed: status?.debit_note?.success || false,
                error: status?.debit_note !== null && !status?.debit_note?.success,
            },
        },
        {
            label: "Habilitar PDN",
            icon: Rocket,
            status: { completed: status?.is_production || false },
        },
    ];

    // Auto-set currentStep when status loads
    useEffect(() => {
        if (status) {
            setCurrentStep(getFirstIncompleteStep(steps));
        }
    }, [status?.environment_set, successfulInvoices.length, status?.credit_note?.success, status?.debit_note?.success, status?.is_production]);

    const canNavigateTo = (idx: number) => {
        if (idx === 0) return true;
        // Can navigate to a step if the previous step is completed
        return steps[idx - 1].status.completed;
    };

    const handleStepClick = (idx: number) => {
        if (canNavigateTo(idx)) {
            setCurrentStep(idx);
            setError(null);
            setSuccess(null);
        }
    };

    if (!canManage) {
        return (
            <AppLayout>
                <Head title="Habilitación DIAN" />
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertTitle>Sin permisos</AlertTitle>
                        <AlertDescription>No tienes permisos para acceder a esta sección.</AlertDescription>
                    </Alert>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title="Habilitación DIAN" />
            <div className="p-6 space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Habilitación DIAN</h1>
                        <p className="text-muted-foreground">
                            Proceso para pasar de pruebas a producción (PDN)
                        </p>
                    </div>
                    {status && (
                        <Badge variant={status.is_production ? "default" : "secondary"} className="text-sm">
                            {status.is_production ? "Producción (PDN)" : "En Pruebas"}
                        </Badge>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Exitoso</AlertTitle>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !status?.registered ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Sede no registrada</AlertTitle>
                        <AlertDescription>
                            Debe registrar la sede en facturación electrónica antes de iniciar la habilitación.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        {/* Wizard Stepper */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Progreso de Habilitación</CardTitle>
                                <CardDescription>
                                    Paso {currentStep + 1} de {steps.length} — {steps[currentStep].label}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center overflow-x-auto pb-2">
                                    {steps.map((step, idx) => {
                                        const isActive = idx === currentStep;
                                        const isAccessible = canNavigateTo(idx);
                                        const Icon = step.icon;

                                        return (
                                            <div key={idx} className="flex items-center flex-1 last:flex-none">
                                                {/* Step circle + label */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleStepClick(idx)}
                                                    disabled={!isAccessible}
                                                    className={`flex flex-col items-center gap-1.5 group ${
                                                        isAccessible ? "cursor-pointer" : "cursor-not-allowed"
                                                    }`}
                                                >
                                                    <div
                                                        className={`rounded-full p-2 transition-all ${
                                                            step.status.completed
                                                                ? "bg-green-500/15 text-green-600"
                                                                : step.status.error
                                                                  ? "bg-red-500/15 text-red-600"
                                                                  : isActive
                                                                    ? "bg-primary/10 text-primary ring-2 ring-primary"
                                                                    : "bg-muted text-muted-foreground"
                                                        } ${isAccessible && !isActive ? "group-hover:ring-2 group-hover:ring-primary/30" : ""}`}
                                                    >
                                                        {step.status.completed ? (
                                                            <CheckCircle2 className="h-5 w-5" />
                                                        ) : step.status.error ? (
                                                            <XCircle className="h-5 w-5" />
                                                        ) : (
                                                            <Icon className="h-5 w-5" />
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-xs text-center font-medium leading-tight max-w-[80px] ${
                                                            isActive
                                                                ? "text-primary"
                                                                : step.status.completed
                                                                  ? "text-green-600"
                                                                  : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {step.label}
                                                    </span>
                                                </button>

                                                {/* Connector line */}
                                                {idx < steps.length - 1 && (
                                                    <div
                                                        className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                                                            step.status.completed ? "bg-green-400" : "bg-muted"
                                                        }`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Step Content */}
                        {currentStep === 0 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5" />
                                                Paso 1: Configurar Ambiente
                                            </CardTitle>
                                            <CardDescription>
                                                Ingrese los datos del certificado digital para configurar el ambiente de pruebas
                                            </CardDescription>
                                        </div>
                                        {status.environment_set && (
                                            <Badge variant="default" className="bg-green-600">Completado</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="software_id">Software ID (UUID)</Label>
                                            <Input
                                                id="software_id"
                                                value={envForm.software_id}
                                                onChange={(e) => setEnvForm((p) => ({ ...p, software_id: e.target.value }))}
                                                placeholder="a1a9c99f-d2a1-42ec-a2b0-443f85077dde"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pin">PIN del Software</Label>
                                            <Input
                                                id="pin"
                                                value={envForm.pin}
                                                onChange={(e) => setEnvForm((p) => ({ ...p, pin: e.target.value }))}
                                                placeholder="12345"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="certificate">Certificado Digital (archivo o base64)</Label>
                                            <Input
                                                id="certificate_file"
                                                type="file"
                                                accept=".p12,.pfx,.pem"
                                                onChange={handleCertificateUpload}
                                            />
                                            <Input
                                                id="certificate"
                                                value={envForm.certificate}
                                                onChange={(e) => setEnvForm((p) => ({ ...p, certificate: e.target.value }))}
                                                placeholder="O pegue el certificado en base64 aquí..."
                                            />
                                            {envForm.certificate && (
                                                <p className="text-xs text-green-600">Certificado cargado ({Math.round(envForm.certificate.length / 1024)}KB)</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="certificate_password">Password del Certificado</Label>
                                            <Input
                                                id="certificate_password"
                                                type="password"
                                                value={envForm.certificate_password}
                                                onChange={(e) => setEnvForm((p) => ({ ...p, certificate_password: e.target.value }))}
                                                placeholder="Contraseña del certificado"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSetEnvironment}
                                        disabled={
                                            actionLoading === "environment" ||
                                            !envForm.software_id ||
                                            !envForm.pin ||
                                            !envForm.certificate ||
                                            !envForm.certificate_password
                                        }
                                    >
                                        {actionLoading === "environment" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Upload className="mr-2 h-4 w-4" />
                                        Configurar Ambiente
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 1 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileText className="h-5 w-5" />
                                                Paso 2: Factura de Prueba 1
                                            </CardTitle>
                                            <CardDescription>
                                                Envíe la primera factura de prueba con datos fijos a la DIAN
                                            </CardDescription>
                                        </div>
                                        {successfulInvoices.length >= 1 && (
                                            <Badge variant="default" className="bg-green-600">Completado</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {status.invoices?.slice(0, 1).map((inv, idx) => (
                                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${inv.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                            {inv.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Factura #{inv.number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    UUID: {inv.uuid || "N/A"} | Fecha: {inv.issue_date || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {successfulInvoices.length < 1 && (
                                        <Button
                                            onClick={handleSendInvoice}
                                            disabled={actionLoading === "invoice" || !status.environment_set}
                                        >
                                            {actionLoading === "invoice" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <FileCheck className="mr-2 h-4 w-4" />
                                            Enviar Factura de Prueba 1
                                        </Button>
                                    )}
                                    {!status.environment_set && (
                                        <p className="text-xs text-muted-foreground">
                                            Debe configurar el ambiente primero (Paso 1)
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 2 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileText className="h-5 w-5" />
                                                Paso 3: Factura de Prueba 2
                                            </CardTitle>
                                            <CardDescription>
                                                Envíe la segunda factura de prueba con datos fijos a la DIAN
                                            </CardDescription>
                                        </div>
                                        {successfulInvoices.length >= 2 && (
                                            <Badge variant="default" className="bg-green-600">Completado</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {status.invoices?.slice(1, 2).map((inv, idx) => (
                                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${inv.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                            {inv.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Factura #{inv.number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    UUID: {inv.uuid || "N/A"} | Fecha: {inv.issue_date || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {successfulInvoices.length < 2 && (
                                        <Button
                                            onClick={handleSendInvoice}
                                            disabled={actionLoading === "invoice" || successfulInvoices.length < 1}
                                        >
                                            {actionLoading === "invoice" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <FileCheck className="mr-2 h-4 w-4" />
                                            Enviar Factura de Prueba 2
                                        </Button>
                                    )}
                                    {successfulInvoices.length < 1 && (
                                        <p className="text-xs text-muted-foreground">
                                            Debe enviar la primera factura de prueba primero
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 3 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <FileMinus className="h-5 w-5" />
                                                Paso 4: Nota Crédito
                                            </CardTitle>
                                            <CardDescription>
                                                Envíe una nota crédito referenciando la primera factura de prueba
                                            </CardDescription>
                                        </div>
                                        {status.credit_note?.success && (
                                            <Badge variant="default" className="bg-green-600">Completado</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {status.credit_note && (
                                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status.credit_note.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                            {status.credit_note.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Nota Crédito #{status.credit_note.number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    UUID: {status.credit_note.uuid || "N/A"} | Fecha: {status.credit_note.issue_date || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!status.credit_note?.success && (
                                        <Button
                                            onClick={handleSendCreditNote}
                                            disabled={actionLoading === "credit" || successfulInvoices.length < 1}
                                        >
                                            {actionLoading === "credit" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <FileMinus className="mr-2 h-4 w-4" />
                                            Enviar Nota Crédito
                                        </Button>
                                    )}
                                    {successfulInvoices.length < 1 && (
                                        <p className="text-xs text-muted-foreground">
                                            Debe enviar al menos 1 factura de prueba primero
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 4 && (
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <FilePlus className="h-5 w-5" />
                                                Paso 5: Nota Débito
                                            </CardTitle>
                                            <CardDescription>
                                                Envíe una nota débito referenciando la segunda factura de prueba
                                            </CardDescription>
                                        </div>
                                        {status.debit_note?.success && (
                                            <Badge variant="default" className="bg-green-600">Completado</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {status.debit_note && (
                                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${status.debit_note.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                            {status.debit_note.success ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">Nota Débito #{status.debit_note.number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    UUID: {status.debit_note.uuid || "N/A"} | Fecha: {status.debit_note.issue_date || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!status.debit_note?.success && (
                                        <Button
                                            onClick={handleSendDebitNote}
                                            disabled={actionLoading === "debit" || successfulInvoices.length < 2}
                                        >
                                            {actionLoading === "debit" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <FilePlus className="mr-2 h-4 w-4" />
                                            Enviar Nota Débito
                                        </Button>
                                    )}
                                    {successfulInvoices.length < 2 && (
                                        <p className="text-xs text-muted-foreground">
                                            Debe enviar las 2 facturas de prueba primero
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 5 && (
                            <Card className={status.can_enable_production ? "border-green-500/30 bg-green-500/10/50" : ""}>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Rocket className="h-5 w-5" />
                                                Paso 6: Habilitar Producción (PDN)
                                            </CardTitle>
                                            <CardDescription>
                                                {status.is_production
                                                    ? "La sede ya está habilitada en producción. Configure la resolución DIAN."
                                                    : "Una vez completados los 4 documentos, habilite la facturación en producción"}
                                            </CardDescription>
                                        </div>
                                        {status.is_production && (
                                            <Badge variant="default" className="bg-green-600">Producción</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {status.is_production ? (
                                        <Alert>
                                            <CheckCircle2 className="h-4 w-4" />
                                            <AlertTitle>Habilitado en Producción</AlertTitle>
                                            <AlertDescription>
                                                Ahora debe configurar la resolución DIAN en la sección de Configuración FE para comenzar a facturar.
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Button
                                            onClick={handleEnableProduction}
                                            disabled={actionLoading === "production" || !status.can_enable_production}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {actionLoading === "production" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            <Rocket className="mr-2 h-4 w-4" />
                                            Habilitar Producción (PDN)
                                        </Button>
                                    )}
                                    {!status.can_enable_production && !status.is_production && (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Complete los pasos 1-5 para habilitar esta opción
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCurrentStep((prev) => prev - 1);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                disabled={currentStep === 0}
                                className={currentStep === 0 ? "invisible" : ""}
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Anterior
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                Paso {currentStep + 1} de {steps.length}
                            </span>

                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCurrentStep((prev) => prev + 1);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                disabled={currentStep === steps.length - 1 || !steps[currentStep].status.completed}
                                className={currentStep === steps.length - 1 ? "invisible" : ""}
                            >
                                Siguiente
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
