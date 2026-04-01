import { useState, useEffect, useMemo } from "react";
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
import { Loader2, CheckCircle2, XCircle, RefreshCw, Building2, FileCheck, Info, AlertTriangle, Eye, Send, Code } from "lucide-react";
import {
    electronicInvoicingApi,
    type ElectronicInvoicingStatus,
    type ElectronicInvoicingCatalogs,
    type ElectronicInvoicingRegisterData,
    type ElectronicInvoicingUpdateData,
} from "@/lib/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

// Modo prueba - cambiar a false para enviar realmente a la API
const TEST_MODE = true;

export default function ElectronicInvoicingIndex() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const canManage = hasPermission('electronic-invoicing.manage', user);

    const [status, setStatus] = useState<ElectronicInvoicingStatus | null>(null);
    const [catalogs, setCatalogs] = useState<ElectronicInvoicingCatalogs | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // JSON Preview/Response
    const [jsonPreview, setJsonPreview] = useState<string | null>(null);
    const [apiResponse, setApiResponse] = useState<any>(null);

    // Form state
    const [formData, setFormData] = useState<ElectronicInvoicingRegisterData>({
        tax_id: "",
        type_document_identification_id: 0,
        type_organization_id: 0,
        type_regime_id: 0,
        type_liability_id: 0,
        municipality_id: 0,
        business_name: "",
        merchant_registration: "",
        address: "",
        phone: "",
        email: "",
    });

    // Convert municipalities to combobox options with department name
    const municipalityOptions: ComboboxOption[] = useMemo(() => {
        if (!catalogs?.municipalities) return [];
        const deptMap: Record<string, string> = {};
        if (catalogs.departments) {
            for (const d of catalogs.departments) {
                deptMap[d.code] = d.name;
            }
        }
        return catalogs.municipalities.map((item) => {
            const deptCode = item.code?.substring(0, 2) || '';
            const deptName = deptMap[deptCode];
            return {
                value: item.id.toString(),
                label: deptName ? `${item.name} - ${deptName}` : item.name,
            };
        });
    }, [catalogs?.municipalities, catalogs?.departments]);

    useEffect(() => {
        if (!canManage) {
            window.location.href = '/admin/dashboard';
            return;
        }
        loadData();
    }, [canManage]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [statusData, catalogsData] = await Promise.all([
                electronicInvoicingApi.getStatus(),
                electronicInvoicingApi.getCatalogs(),
            ]);

            setStatus(statusData);
            setCatalogs(catalogsData);

            // If registered, populate form with existing data
            if (statusData.registered && statusData.branch_data) {
                setFormData({
                    tax_id: statusData.branch_data.tax_id || "",
                    type_document_identification_id: statusData.branch_data.type_document_identification_id || 0,
                    type_organization_id: statusData.branch_data.type_organization_id || 0,
                    type_regime_id: statusData.branch_data.type_regime_id || 0,
                    type_liability_id: statusData.branch_data.type_liability_id || 0,
                    municipality_id: statusData.branch_data.municipality_id || 0,
                    business_name: statusData.branch_data.business_name || "",
                    merchant_registration: statusData.branch_data.merchant_registration || "",
                    address: statusData.branch_data.address || "",
                    phone: statusData.branch_data.phone || "",
                    email: statusData.branch_data.email || "",
                });
            }
        } catch (err) {
            setError("Error al cargar datos. Intente nuevamente.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncCatalogs = async () => {
        try {
            setSyncing(true);
            setError(null);
            setSuccess(null);

            const result = await electronicInvoicingApi.syncCatalogs();

            if (result.success) {
                setSuccess("Catalogos sincronizados correctamente");
                // Reload catalogs
                const catalogsData = await electronicInvoicingApi.getCatalogs();
                setCatalogs(catalogsData);
            } else {
                setError(result.message || "Error al sincronizar catalogos");
            }
        } catch (err) {
            setError("Error al sincronizar catalogos");
            console.error(err);
        } finally {
            setSyncing(false);
        }
    };

    const handlePreviewJson = () => {
        setError(null);
        setSuccess(null);
        setApiResponse(null);

        // Validation
        if (!formData.tax_id || !formData.business_name || !formData.email) {
            setError("Por favor complete todos los campos obligatorios");
            return;
        }

        // El tax_id (NIT) va en la URL, no en el body
        // URL: /api/ubl2.1/config/{nit}
        const dataToSend = {
            type_document_identification_id: formData.type_document_identification_id,
            type_organization_id: formData.type_organization_id,
            type_regime_id: formData.type_regime_id,
            type_liability_id: formData.type_liability_id,
            municipality_id: formData.municipality_id,
            business_name: formData.business_name,
            merchant_registration: formData.merchant_registration,
            address: formData.address,
            phone: parseInt(String(formData.phone)) || 0,
            email: formData.email,
        };

        // Si ya esta registrado, no enviar type_document_identification_id
        if (status?.registered) {
            delete (dataToSend as any).type_document_identification_id;
        }

        const previewData = {
            _url: `/api/ubl2.1/config/${formData.tax_id}`,
            _method: status?.registered ? "PUT" : "POST",
            body: dataToSend,
        };

        setJsonPreview(JSON.stringify(previewData, null, 2));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setApiResponse(null);

        // Validation
        if (!formData.tax_id || !formData.business_name || !formData.email) {
            setError("Por favor complete todos los campos obligatorios");
            return;
        }

        // En modo prueba, solo mostrar el JSON
        if (TEST_MODE) {
            handlePreviewJson();
            setSuccess("MODO PRUEBA: JSON generado correctamente. Revise los datos abajo.");
            return;
        }

        try {
            setSubmitting(true);

            let result;
            if (status?.registered) {
                // Update existing registration
                const updateData: ElectronicInvoicingUpdateData = {
                    type_organization_id: formData.type_organization_id,
                    type_regime_id: formData.type_regime_id,
                    type_liability_id: formData.type_liability_id,
                    municipality_id: formData.municipality_id,
                    business_name: formData.business_name,
                    merchant_registration: formData.merchant_registration,
                    address: formData.address,
                    phone: parseInt(String(formData.phone)) || 0,
                    email: formData.email,
                };
                result = await electronicInvoicingApi.update(updateData);
            } else {
                // New registration - phone as integer
                const registerData = {
                    ...formData,
                    phone: parseInt(String(formData.phone)) || 0,
                };
                result = await electronicInvoicingApi.register(registerData);
            }

            // Guardar respuesta completa
            setApiResponse(result);

            if (result.success) {
                setSuccess(result.message || "Empresa creada exitosamente en la DIAN");
                // Reload status
                const newStatus = await electronicInvoicingApi.getStatus();
                setStatus(newStatus);
            } else {
                setError(result.message || "Error al crear la empresa en la DIAN");
            }
        } catch (err: any) {
            setApiResponse(err);
            setError(err.message || "Error al conectar con la API");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const updateFormField = (field: keyof ElectronicInvoicingRegisterData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Limpiar preview cuando se cambia un campo
        setJsonPreview(null);
    };

    if (!canManage) {
        return null;
    }

    if (loading) {
        return (
            <AppLayout title="Facturacion Electronica">
                <Head title="Facturacion Electronica" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Facturacion Electronica">
            <Head title="Facturacion Electronica" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {status?.registered ? "Actualizacion de Empresa DIAN" : "Creacion de Empresa DIAN"}
                        </h2>
                        <p className="text-muted-foreground">
                            {status?.registered
                                ? "Actualice los datos de facturacion electronica de esta sede"
                                : "Registre su empresa en la DIAN para facturacion electronica"
                            }
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TEST_MODE && (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <Code className="h-3 w-3 mr-1" />
                                MODO PRUEBA
                            </Badge>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleSyncCatalogs}
                            disabled={syncing}
                        >
                            {syncing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Sincronizar Catalogos
                        </Button>
                    </div>
                </div>

                {/* Important Warning */}
                <Alert className="border-primary/50">
                    <Info className="h-4 w-4 text-primary" />
                    <AlertTitle>Importante</AlertTitle>
                    <AlertDescription>
                        Los datos ingresados deben corresponder exactamente a la informacion registrada en el <strong>RUT (Registro Unico Tributario)</strong> de la DIAN.
                        Datos incorrectos pueden causar el rechazo de las facturas electronicas.
                    </AlertDescription>
                </Alert>

                {/* Status Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5" />
                            Estado del Registro
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 flex-wrap">
                            {status?.registered ? (
                                <>
                                    <Badge variant="default" className="bg-green-600">
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Registrado
                                    </Badge>
                                    {status.registered_at && (
                                        <span className="text-sm text-muted-foreground">
                                            Desde: {new Date(status.registered_at).toLocaleDateString()}
                                        </span>
                                    )}
                                    {status.has_token && (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                            Token activo
                                        </Badge>
                                    )}
                                    <span className="text-sm text-blue-600">
                                        <Info className="h-4 w-4 inline mr-1" />
                                        Puede actualizar los datos (excepto NIT y tipo de documento)
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Badge variant="secondary">
                                        <XCircle className="h-4 w-4 mr-1" />
                                        No Registrado
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Complete el formulario para registrar esta sede en facturacion electronica
                                    </span>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts */}
                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="border-green-600 bg-green-500/10 dark:bg-green-950/20">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-700 dark:text-green-400">Exito</AlertTitle>
                        <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
                    </Alert>
                )}

                {/* Registration Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            {status?.registered ? "Datos de la Empresa" : "Creacion de Empresa"}
                        </CardTitle>
                        <CardDescription>
                            {status?.registered
                                ? "Actualice los datos de facturacion electronica. El NIT y tipo de documento no pueden ser modificados despues del registro inicial."
                                : "Complete todos los campos con la informacion exacta del RUT para crear la empresa en la DIAN."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* NIT Section */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="tax_id">NIT *</Label>
                                    <Input
                                        id="tax_id"
                                        value={formData.tax_id}
                                        onChange={(e) => updateFormField("tax_id", e.target.value)}
                                        placeholder="Ej: 900123456"
                                        disabled={status?.registered}
                                    />
                                    {status?.registered ? (
                                        <p className="text-xs text-amber-600">
                                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                                            El NIT no puede ser modificado despues del registro
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            Ingrese el NIT sin digito de verificacion
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type_document_identification_id">Tipo de Documento *</Label>
                                    <Select
                                        value={formData.type_document_identification_id?.toString() || ""}
                                        onValueChange={(value) => updateFormField("type_document_identification_id", parseInt(value))}
                                        disabled={status?.registered}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs?.type_document_identifications?.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {status?.registered && (
                                        <p className="text-xs text-amber-600">
                                            <AlertTriangle className="h-3 w-3 inline mr-1" />
                                            No puede ser modificado
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Business Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="business_name">Razon Social *</Label>
                                    <Input
                                        id="business_name"
                                        value={formData.business_name}
                                        onChange={(e) => updateFormField("business_name", e.target.value)}
                                        placeholder="Nombre exacto como aparece en el RUT"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ingrese la razon social exactamente como aparece en el RUT
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="merchant_registration">Registro Mercantil *</Label>
                                    <Input
                                        id="merchant_registration"
                                        value={formData.merchant_registration}
                                        onChange={(e) => updateFormField("merchant_registration", e.target.value)}
                                        placeholder="Numero de matricula mercantil"
                                    />
                                </div>
                            </div>

                            {/* Organization Type & Regime */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="type_organization_id">Tipo de Organizacion *</Label>
                                    <Select
                                        value={formData.type_organization_id?.toString() || ""}
                                        onValueChange={(value) => updateFormField("type_organization_id", parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs?.type_organizations?.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type_regime_id">Tipo de Regimen *</Label>
                                    <Select
                                        value={formData.type_regime_id?.toString() || ""}
                                        onValueChange={(value) => updateFormField("type_regime_id", parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs?.type_regimes?.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Liability & Municipality */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="type_liability_id">Tipo de Responsabilidad *</Label>
                                    <Select
                                        value={formData.type_liability_id?.toString() || ""}
                                        onValueChange={(value) => updateFormField("type_liability_id", parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {catalogs?.type_liabilities?.map((item) => (
                                                <SelectItem key={item.id} value={item.id.toString()}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="municipality_id">Municipio *</Label>
                                    <Combobox
                                        options={municipalityOptions}
                                        value={formData.municipality_id?.toString() || ""}
                                        onValueChange={(value) => updateFormField("municipality_id", parseInt(value) || 0)}
                                        placeholder="Buscar municipio..."
                                        searchPlaceholder="Escriba para buscar..."
                                        emptyText="No se encontro el municipio"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Escriba el nombre del municipio para buscarlo
                                    </p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="address">Direccion *</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => updateFormField("address", e.target.value)}
                                        placeholder="Direccion completa del establecimiento"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefono *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        inputMode="numeric"
                                        value={String(formData.phone)}
                                        onChange={(e) => {
                                            // Solo permitir numeros
                                            const value = e.target.value.replace(/\D/g, '');
                                            updateFormField("phone", value);
                                        }}
                                        placeholder="Ej: 3001234567"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Solo numeros, sin prefijo de pais (+57)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => updateFormField("email", e.target.value)}
                                        placeholder="correo@empresa.com"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Email donde se recibiran notificaciones de la DIAN
                                    </p>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePreviewJson}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver JSON
                                </Button>
                                <Button type="submit" disabled={submitting} size="lg">
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    {status?.registered ? "Actualizar Empresa" : "Crear Empresa en DIAN"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* JSON Preview */}
                {jsonPreview && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                JSON a Enviar
                            </CardTitle>
                            <CardDescription>
                                Este es el JSON que se enviara a la API de la DIAN
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{jsonPreview}</code>
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {/* API Response */}
                {apiResponse && (
                    <Card className={apiResponse.success ? "border-green-500" : "border-red-500"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {apiResponse.success ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                Respuesta de la API
                            </CardTitle>
                            <CardDescription>
                                {apiResponse.success
                                    ? "La empresa fue creada/actualizada exitosamente"
                                    : "Ocurrio un error al procesar la solicitud"
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{JSON.stringify(apiResponse, null, 2)}</code>
                            </pre>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
