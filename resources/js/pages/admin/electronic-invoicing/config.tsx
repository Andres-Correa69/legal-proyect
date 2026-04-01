import { useState, useEffect, type ReactNode } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Settings, Save, Pencil, ShieldAlert, FileText, List, Info, Eye, Plus, Trash2 } from "lucide-react";
import {
    electronicInvoicingApi,
    payrollNumberingRangeApi,
    type ElectronicInvoicingConfigData,
    type PayrollNumberingRangeData,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface NumberingField {
    label: string;
    id: string;
    value: string | number | null;
    onChange: (value: string) => void;
    placeholder: string;
    type?: "text" | "number" | "date";
    maxLength?: number;
}

interface NumberingSectionProps {
    icon: ReactNode;
    title: string;
    configuredDescription: string;
    editDescription: string;
    isConfigured: boolean;
    editing: boolean;
    saving: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onSave: () => void;
    readOnlyFields: { label: string; value: string | number | null }[];
    editFields: NumberingField[];
    currentConsecutive: number;
    /** If set, shows "Ver Resolución DIAN" button that calls this callback */
    onViewResolution?: () => void;
    /** If true, shows info that this is internal numbering, not a DIAN resolution */
    isInternalNumbering?: boolean;
}

function NumberingSection({
    icon,
    title,
    configuredDescription,
    editDescription,
    isConfigured,
    editing,
    saving,
    onEdit,
    onCancel,
    onSave,
    readOnlyFields,
    editFields,
    currentConsecutive,
    onViewResolution,
    isInternalNumbering,
}: NumberingSectionProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {icon}
                            {title}
                        </CardTitle>
                        <CardDescription>
                            {!editing ? configuredDescription : editDescription}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {!editing && onViewResolution && (
                            <Button type="button" variant="outline" size="sm" onClick={onViewResolution}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Resolución DIAN
                            </Button>
                        )}
                        {!editing && (
                            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isInternalNumbering && !editing && (
                    <div className="flex items-center gap-2 mb-4 text-red-600">
                        <Info className="h-4 w-4 shrink-0" />
                        <p className="text-sm font-medium">
                            Consecutivo interno del sistema — no corresponde a una resolución DIAN.
                        </p>
                    </div>
                )}
                {!editing ? (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {readOnlyFields.map((field) => (
                                <div key={field.label} className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label}</p>
                                    <p className="text-lg font-semibold">{field.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4">
                            <div className="grid gap-6 md:grid-cols-3">
                                {editFields.filter(f => f.type === "number").map((field) => (
                                    <div key={field.id} className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{field.label.replace(/ \*$/, "")}</p>
                                        <p className="text-lg font-mono">{field.value != null ? Number(field.value) : "-"}</p>
                                    </div>
                                ))}
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consecutivo Actual</p>
                                    <p className="text-lg font-mono font-bold text-primary">{currentConsecutive}</p>
                                </div>
                            </div>
                        </div>

                        {isConfigured && (
                            <div className="flex items-center gap-2 pt-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-700 dark:text-green-400">Configuracion guardada</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {editFields.filter(f => f.type !== "number").map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.id}>{field.label}</Label>
                                    <Input
                                        id={field.id}
                                        type={field.type || "text"}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        placeholder={field.placeholder}
                                        maxLength={field.maxLength}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {editFields.filter(f => f.type === "number").map((field) => (
                                <div key={field.id} className="space-y-2">
                                    <Label htmlFor={field.id}>{field.label}</Label>
                                    <Input
                                        id={field.id}
                                        type="number"
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        placeholder={field.placeholder}
                                    />
                                </div>
                            ))}
                            <div className="space-y-2">
                                <Label>Consecutivo Actual</Label>
                                <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-muted-foreground font-mono">
                                    {currentConsecutive}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            {isConfigured && (
                                <Button type="button" variant="outline" onClick={onCancel}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="button" disabled={saving} onClick={onSave}>
                                {saving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Guardar
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ElectronicInvoicingConfig() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const canConfig = hasPermission('electronic-invoicing.config', user);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingCn, setSavingCn] = useState(false);
    const [savingDn, setSavingDn] = useState(false);
    const [savingAr, setSavingAr] = useState(false);
    const [savingRb, setSavingRb] = useState(false);
    const [savingEa, setSavingEa] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [editingCn, setEditingCn] = useState(false);
    const [editingDn, setEditingDn] = useState(false);
    const [editingAr, setEditingAr] = useState(false);
    const [editingRb, setEditingRb] = useState(false);
    const [editingEa, setEditingEa] = useState(false);
    const [savingDs, setSavingDs] = useState(false);
    const [editingDs, setEditingDs] = useState(false);
    const [savingDsCn, setSavingDsCn] = useState(false);
    const [editingDsCn, setEditingDsCn] = useState(false);
    const [savingPos, setSavingPos] = useState(false);
    const [editingPos, setEditingPos] = useState(false);
    const [savingPosCn, setSavingPosCn] = useState(false);
    const [savingPayrollGlobal, setSavingPayrollGlobal] = useState(false);
    const [editingPayrollGlobal, setEditingPayrollGlobal] = useState(false);
    const [editingPosCn, setEditingPosCn] = useState(false);
    // Payroll numbering ranges
    const [payrollRanges, setPayrollRanges] = useState<PayrollNumberingRangeData[]>([]);
    const [showAddRange, setShowAddRange] = useState(false);
    const [editingRangeId, setEditingRangeId] = useState<number | null>(null);
    const [rangeForm, setRangeForm] = useState({ name: "", type: "payroll" as "payroll" | "payroll_note", prefix: "", consecutive_start: "", consecutive_end: "" });
    const [savingRange, setSavingRange] = useState(false);
    const [deletingRangeId, setDeletingRangeId] = useState<number | null>(null);
    const [resolutionsOpen, setResolutionsOpen] = useState(false);
    const [resolutionsLoading, setResolutionsLoading] = useState(false);
    const [resolutionsData, setResolutionsData] = useState<any>(null);
    const [resolutionsError, setResolutionsError] = useState<string | null>(null);
    const [resolutionFilterTypeId, setResolutionFilterTypeId] = useState<number | null>(null);
    const [resolutionFilterTitle, setResolutionFilterTitle] = useState<string>("");

    const [formData, setFormData] = useState<ElectronicInvoicingConfigData>({
        resolution_id: null,
        prefix: "",
        consecutive_start: null,
        consecutive_end: null,
        cn_prefix: "",
        cn_consecutive_start: null,
        cn_consecutive_end: null,
        dn_prefix: "",
        dn_consecutive_start: null,
        dn_consecutive_end: null,
        ar_prefix: "",
        ar_consecutive_start: null,
        ar_consecutive_end: null,
        rb_prefix: "",
        rb_consecutive_start: null,
        rb_consecutive_end: null,
        ea_prefix: "",
        ea_consecutive_start: null,
        ea_consecutive_end: null,
        ds_prefix: "",
        ds_resolution: "",
        ds_resolution_date: "",
        ds_consecutive_start: null,
        ds_consecutive_end: null,
        ds_date_from: "",
        ds_date_to: "",
        ds_cn_prefix: "",
        ds_cn_resolution: "",
        ds_cn_resolution_date: "",
        ds_cn_consecutive_start: null,
        ds_cn_consecutive_end: null,
        ds_cn_date_from: "",
        ds_cn_date_to: "",
        pos_prefix: "",
        pos_resolution_id: "",
        pos_consecutive_start: null,
        pos_consecutive_end: null,
        pos_software_id: "",
        pos_pin: "",
        pos_cn_prefix: "",
        pos_cn_consecutive_start: null,
        pos_cn_consecutive_end: null,
        payroll_software_id: "",
        payroll_pin: "",
    });

    const [currentConsecutive, setCurrentConsecutive] = useState(0);
    const [cnCurrentConsecutive, setCnCurrentConsecutive] = useState(0);
    const [dnCurrentConsecutive, setDnCurrentConsecutive] = useState(0);
    const [arCurrentConsecutive, setArCurrentConsecutive] = useState(0);
    const [rbCurrentConsecutive, setRbCurrentConsecutive] = useState(0);
    const [eaCurrentConsecutive, setEaCurrentConsecutive] = useState(0);
    const [dsCurrentConsecutive, setDsCurrentConsecutive] = useState(0);
    const [dsCnCurrentConsecutive, setDsCnCurrentConsecutive] = useState(0);
    const [posCurrentConsecutive, setPosCurrentConsecutive] = useState(0);
    const [posCnCurrentConsecutive, setPosCnCurrentConsecutive] = useState(0);
    const [hasToken, setHasToken] = useState(false);

    const isConfigured = !!(formData.resolution_id && formData.prefix && formData.consecutive_start && formData.consecutive_end);
    const isCnConfigured = !!(formData.cn_prefix && formData.cn_consecutive_start && formData.cn_consecutive_end);
    const isDnConfigured = !!(formData.dn_prefix && formData.dn_consecutive_start && formData.dn_consecutive_end);
    const isArConfigured = !!(formData.ar_prefix && formData.ar_consecutive_start && formData.ar_consecutive_end);
    const isRbConfigured = !!(formData.rb_prefix && formData.rb_consecutive_start && formData.rb_consecutive_end);
    const isEaConfigured = !!(formData.ea_prefix && formData.ea_consecutive_start && formData.ea_consecutive_end);
    const isDsConfigured = !!(formData.ds_prefix && formData.ds_resolution && formData.ds_consecutive_start && formData.ds_consecutive_end);
    const isDsCnConfigured = !!(formData.ds_cn_prefix && formData.ds_cn_resolution && formData.ds_cn_consecutive_start && formData.ds_cn_consecutive_end);
    const isPosConfigured = !!(formData.pos_prefix && formData.pos_resolution_id && formData.pos_software_id && formData.pos_pin && formData.pos_consecutive_start && formData.pos_consecutive_end);
    const isPosCnConfigured = !!(formData.pos_cn_prefix && formData.pos_cn_consecutive_start && formData.pos_cn_consecutive_end);
    const isPayrollGlobalConfigured = !!(formData.payroll_software_id && formData.payroll_pin);

    useEffect(() => {
        if (canConfig) loadConfig();
    }, [canConfig]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await electronicInvoicingApi.getConfig();

            if (result.success && result.data) {
                setFormData({
                    resolution_id: result.data.resolution_id,
                    prefix: result.data.prefix || "",
                    consecutive_start: result.data.consecutive_start,
                    consecutive_end: result.data.consecutive_end,
                    cn_prefix: result.data.cn_prefix || "",
                    cn_consecutive_start: result.data.cn_consecutive_start,
                    cn_consecutive_end: result.data.cn_consecutive_end,
                    dn_prefix: result.data.dn_prefix || "",
                    dn_consecutive_start: result.data.dn_consecutive_start,
                    dn_consecutive_end: result.data.dn_consecutive_end,
                    ar_prefix: result.data.ar_prefix || "",
                    ar_consecutive_start: result.data.ar_consecutive_start,
                    ar_consecutive_end: result.data.ar_consecutive_end,
                    rb_prefix: result.data.rb_prefix || "",
                    rb_consecutive_start: result.data.rb_consecutive_start,
                    rb_consecutive_end: result.data.rb_consecutive_end,
                    ea_prefix: result.data.ea_prefix || "",
                    ea_consecutive_start: result.data.ea_consecutive_start,
                    ea_consecutive_end: result.data.ea_consecutive_end,
                    ds_prefix: result.data.ds_prefix || "",
                    ds_resolution: result.data.ds_resolution || "",
                    ds_resolution_date: result.data.ds_resolution_date || "",
                    ds_consecutive_start: result.data.ds_consecutive_start,
                    ds_consecutive_end: result.data.ds_consecutive_end,
                    ds_date_from: result.data.ds_date_from || "",
                    ds_date_to: result.data.ds_date_to || "",
                    ds_cn_prefix: result.data.ds_cn_prefix || "",
                    ds_cn_resolution: result.data.ds_cn_resolution || "",
                    ds_cn_resolution_date: result.data.ds_cn_resolution_date || "",
                    ds_cn_consecutive_start: result.data.ds_cn_consecutive_start,
                    ds_cn_consecutive_end: result.data.ds_cn_consecutive_end,
                    ds_cn_date_from: result.data.ds_cn_date_from || "",
                    ds_cn_date_to: result.data.ds_cn_date_to || "",
                    pos_prefix: result.data.pos_prefix || "",
                    pos_resolution_id: result.data.pos_resolution_id || "",
                    pos_consecutive_start: result.data.pos_consecutive_start,
                    pos_consecutive_end: result.data.pos_consecutive_end,
                    pos_software_id: result.data.pos_software_id || "",
                    pos_pin: result.data.pos_pin || "",
                    pos_cn_prefix: result.data.pos_cn_prefix || "",
                    pos_cn_consecutive_start: result.data.pos_cn_consecutive_start,
                    pos_cn_consecutive_end: result.data.pos_cn_consecutive_end,
                    payroll_software_id: result.data.payroll_software_id || "",
                    payroll_pin: result.data.payroll_pin || "",
                });
                setCurrentConsecutive(result.data.current_consecutive || 0);
                setCnCurrentConsecutive(result.data.cn_current_consecutive || 0);
                setDnCurrentConsecutive(result.data.dn_current_consecutive || 0);
                setArCurrentConsecutive(result.data.ar_current_consecutive || 0);
                setRbCurrentConsecutive(result.data.rb_current_consecutive || 0);
                setEaCurrentConsecutive(result.data.ea_current_consecutive || 0);
                setDsCurrentConsecutive(result.data.ds_current_consecutive || 0);
                setDsCnCurrentConsecutive(result.data.ds_cn_current_consecutive || 0);
                setPosCurrentConsecutive(result.data.pos_current_consecutive || 0);
                setPosCnCurrentConsecutive(result.data.pos_cn_current_consecutive || 0);
                setPayrollRanges(result.data.payroll_numbering_ranges || []);
                setHasToken(result.data.has_token);

                setEditing(false);
                setEditingCn(false);
                setEditingDn(false);
                setEditingAr(false);
                setEditingRb(false);
                setEditingEa(false);
                setEditingDs(false);
                setEditingDsCn(false);
                setEditingPos(false);
                setEditingPosCn(false);
                setEditingPayrollGlobal(false);
            }
        } catch (err: any) {
            setError(err.message || "Error al cargar la configuracion");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setError(null);
        if (!formData.resolution_id || !formData.prefix || !formData.consecutive_start || !formData.consecutive_end) {
            setError("Todos los campos de factura son obligatorios");
            return;
        }
        try {
            setSaving(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditing(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCn = async () => {
        setError(null);
        if (!formData.cn_prefix || !formData.cn_consecutive_start || !formData.cn_consecutive_end) {
            setError("Todos los campos de notas credito son obligatorios");
            return;
        }
        try {
            setSavingCn(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingCn(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingCn(false);
        }
    };

    const handleSaveDn = async () => {
        setError(null);
        if (!formData.dn_prefix || !formData.dn_consecutive_start || !formData.dn_consecutive_end) {
            setError("Todos los campos de notas debito son obligatorios");
            return;
        }
        try {
            setSavingDn(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingDn(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingDn(false);
        }
    };

    const handleSaveAr = async () => {
        setError(null);
        if (!formData.ar_prefix || !formData.ar_consecutive_start || !formData.ar_consecutive_end) {
            setError("Todos los campos de acuse de recibo son obligatorios");
            return;
        }
        try {
            setSavingAr(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingAr(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingAr(false);
        }
    };

    const handleSaveRb = async () => {
        setError(null);
        if (!formData.rb_prefix || !formData.rb_consecutive_start || !formData.rb_consecutive_end) {
            setError("Todos los campos de recibo del bien son obligatorios");
            return;
        }
        try {
            setSavingRb(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingRb(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingRb(false);
        }
    };

    const handleSaveEa = async () => {
        setError(null);
        if (!formData.ea_prefix || !formData.ea_consecutive_start || !formData.ea_consecutive_end) {
            setError("Todos los campos de aceptación expresa son obligatorios");
            return;
        }
        try {
            setSavingEa(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingEa(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingEa(false);
        }
    };

    const handleSaveDs = async () => {
        setError(null);
        if (!formData.ds_prefix || !formData.ds_resolution || !formData.ds_consecutive_start || !formData.ds_consecutive_end) {
            setError("Prefijo, resolución y consecutivos son obligatorios para documento soporte");
            return;
        }
        try {
            setSavingDs(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingDs(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingDs(false);
        }
    };

    const handleSaveDsCn = async () => {
        setError(null);
        if (!formData.ds_cn_prefix || !formData.ds_cn_resolution || !formData.ds_cn_consecutive_start || !formData.ds_cn_consecutive_end) {
            setError("Prefijo, resolución y consecutivos son obligatorios para NC documento soporte");
            return;
        }
        try {
            setSavingDsCn(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingDsCn(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingDsCn(false);
        }
    };

    const handleSavePos = async () => {
        setError(null);
        if (!formData.pos_prefix || !formData.pos_resolution_id || !formData.pos_software_id || !formData.pos_pin || !formData.pos_consecutive_start || !formData.pos_consecutive_end) {
            setError("Todos los campos de factura POS son obligatorios");
            return;
        }
        try {
            setSavingPos(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingPos(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingPos(false);
        }
    };

    const handleSavePosCn = async () => {
        setError(null);
        if (!formData.pos_cn_prefix || !formData.pos_cn_consecutive_start || !formData.pos_cn_consecutive_end) {
            setError("Todos los campos de NC factura POS son obligatorios");
            return;
        }
        try {
            setSavingPosCn(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingPosCn(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingPosCn(false);
        }
    };

    const handleSavePayrollGlobal = async () => {
        setError(null);
        if (!formData.payroll_software_id || !formData.payroll_pin) {
            setError("Software ID y PIN de nómina electrónica son obligatorios");
            return;
        }
        try {
            setSavingPayrollGlobal(true);
            const result = await electronicInvoicingApi.updateConfig(formData);
            if (result.success) {
                setEditingPayrollGlobal(false);
                loadConfig();
            } else {
                setError(result.message || "Error al guardar");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la configuracion");
        } finally {
            setSavingPayrollGlobal(false);
        }
    };

    const handleSaveRange = async () => {
        if (!rangeForm.name || !rangeForm.prefix || !rangeForm.consecutive_start || !rangeForm.consecutive_end) {
            setError("Todos los campos del rango de numeración son obligatorios");
            return;
        }
        setError(null);
        try {
            setSavingRange(true);
            if (editingRangeId) {
                await payrollNumberingRangeApi.update(editingRangeId, {
                    name: rangeForm.name,
                    type: rangeForm.type,
                    prefix: rangeForm.prefix,
                    consecutive_start: parseInt(rangeForm.consecutive_start),
                    consecutive_end: parseInt(rangeForm.consecutive_end),
                });
                toast({ title: "Rango actualizado", description: "El rango de numeración fue actualizado exitosamente." });
            } else {
                await payrollNumberingRangeApi.create({
                    name: rangeForm.name,
                    type: rangeForm.type,
                    prefix: rangeForm.prefix,
                    consecutive_start: parseInt(rangeForm.consecutive_start),
                    consecutive_end: parseInt(rangeForm.consecutive_end),
                });
                toast({ title: "Rango creado", description: "El rango de numeración fue creado exitosamente." });
            }
            setShowAddRange(false);
            setEditingRangeId(null);
            setRangeForm({ name: "", type: "payroll", prefix: "", consecutive_start: "", consecutive_end: "" });
            loadConfig();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Error al guardar el rango";
            setError(msg);
        } finally {
            setSavingRange(false);
        }
    };

    const handleDeleteRange = async (rangeId: number) => {
        try {
            setDeletingRangeId(rangeId);
            await payrollNumberingRangeApi.remove(rangeId);
            toast({ title: "Rango eliminado", description: "El rango de numeración fue eliminado exitosamente." });
            loadConfig();
        } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Error al eliminar el rango";
            setError(msg);
        } finally {
            setDeletingRangeId(null);
        }
    };

    const openEditRange = (range: PayrollNumberingRangeData) => {
        setEditingRangeId(range.id);
        setRangeForm({
            name: range.name,
            type: range.type ?? "payroll",
            prefix: range.prefix,
            consecutive_start: String(range.consecutive_start ?? ""),
            consecutive_end: String(range.consecutive_end ?? ""),
        });
        setShowAddRange(true);
    };

    const openAddRange = () => {
        setEditingRangeId(null);
        setRangeForm({ name: "", type: "payroll", prefix: "", consecutive_start: "", consecutive_end: "" });
        setShowAddRange(true);
    };

    const handleLoadResolutions = async (typeDocumentId?: number, title?: string) => {
        setResolutionsLoading(true);
        setResolutionsError(null);
        setResolutionsData(null);
        setResolutionFilterTypeId(typeDocumentId ?? null);
        setResolutionFilterTitle(title ?? "Resoluciones de la Empresa");
        setResolutionsOpen(true);
        try {
            const result = await electronicInvoicingApi.getResolutions();
            if (result.success) {
                setResolutionsData(result.data);
            } else {
                setResolutionsError(result.message || 'Error al consultar resoluciones');
            }
        } catch (err: any) {
            setResolutionsError(err.message || 'Error al consultar resoluciones');
        } finally {
            setResolutionsLoading(false);
        }
    };

    const getFilteredResolutions = () => {
        if (!resolutionsData || !Array.isArray(resolutionsData)) return resolutionsData;
        if (!resolutionFilterTypeId) return resolutionsData;
        return resolutionsData.filter((res: any) => res.type_document_id === resolutionFilterTypeId);
    };

    if (!canConfig) {
        return (
            <AppLayout title="Configuracion FE">
                <Head title="Configuracion FE" />
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <ShieldAlert className="h-12 w-12 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">No tiene permisos para acceder a esta seccion.</p>
                </div>
            </AppLayout>
        );
    }

    if (loading) {
        return (
            <AppLayout title="Configuracion FE">
                <Head title="Configuracion FE" />
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Configuracion FE">
            <Head title="Configuracion FE" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Configuracion de Facturacion Electronica
                        </h2>
                        <p className="text-muted-foreground">
                            Datos de la resolucion DIAN asignada
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {hasToken && (
                            <Button variant="outline" size="sm" onClick={() => handleLoadResolutions()}>
                                <List className="h-4 w-4 mr-2" />
                                Ver Todas las Resoluciones
                            </Button>
                        )}
                        <Badge
                            variant="outline"
                            className={hasToken ? "text-green-600 border-green-600" : "text-red-600 border-red-600"}
                        >
                            {hasToken ? "Token configurado" : "Sin token - Registre la empresa primero"}
                        </Badge>
                    </div>
                </div>

                {!hasToken && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Token no configurado</AlertTitle>
                        <AlertDescription>
                            Debe registrar la empresa en Facturacion DIAN &gt; Creacion de Empresa para obtener el token.
                            Sin el token no se podran generar facturas electronicas.
                        </AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Facturas */}
                <NumberingSection
                    icon={<Settings className="h-5 w-5" />}
                    title="Resolucion Facturas Electronicas"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion asignada por la DIAN"
                    isConfigured={isConfigured}
                    editing={editing}
                    saving={saving}
                    onEdit={() => setEditing(true)}
                    onCancel={() => { setEditing(false); loadConfig(); }}
                    onSave={handleSave}
                    currentConsecutive={currentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(1, "Resolución Factura Electrónica") : undefined}
                    readOnlyFields={[
                        { label: "ID de Resolucion", value: formData.resolution_id ?? null },
                        { label: "Prefijo", value: formData.prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "ID de Resolucion DIAN *",
                            id: "resolution_id",
                            value: formData.resolution_id ?? null,
                            onChange: (v) => setFormData({ ...formData, resolution_id: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1876",
                            type: "text",
                        },
                        {
                            label: "Prefijo *",
                            id: "prefix",
                            value: formData.prefix || "",
                            onChange: (v) => setFormData({ ...formData, prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: FE",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "consecutive_start",
                            value: formData.consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 990000000",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "consecutive_end",
                            value: formData.consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Notas Credito */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion Notas Credito"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion para notas credito"
                    isConfigured={isCnConfigured}
                    editing={editingCn}
                    saving={savingCn}
                    onEdit={() => setEditingCn(true)}
                    onCancel={() => { setEditingCn(false); loadConfig(); }}
                    onSave={handleSaveCn}
                    currentConsecutive={cnCurrentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(4, "Resolución Notas Crédito") : undefined}
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.cn_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo *",
                            id: "cn_prefix",
                            value: formData.cn_prefix || "",
                            onChange: (v) => setFormData({ ...formData, cn_prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: NC",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "cn_consecutive_start",
                            value: formData.cn_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, cn_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "cn_consecutive_end",
                            value: formData.cn_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, cn_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Notas Debito */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion Notas Debito"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion para notas debito"
                    isConfigured={isDnConfigured}
                    editing={editingDn}
                    saving={savingDn}
                    onEdit={() => setEditingDn(true)}
                    onCancel={() => { setEditingDn(false); loadConfig(); }}
                    onSave={handleSaveDn}
                    currentConsecutive={dnCurrentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(5, "Resolución Notas Débito") : undefined}
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.dn_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo *",
                            id: "dn_prefix",
                            value: formData.dn_prefix || "",
                            onChange: (v) => setFormData({ ...formData, dn_prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: ND",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "dn_consecutive_start",
                            value: formData.dn_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, dn_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "dn_consecutive_end",
                            value: formData.dn_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, dn_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Acuse de Recibo */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Numeracion Acuse de Recibo"
                    configuredDescription="Numeracion configurada correctamente"
                    editDescription="Ingrese los datos de numeracion para acuses de recibo"
                    isConfigured={isArConfigured}
                    editing={editingAr}
                    saving={savingAr}
                    onEdit={() => setEditingAr(true)}
                    onCancel={() => { setEditingAr(false); loadConfig(); }}
                    onSave={handleSaveAr}
                    currentConsecutive={arCurrentConsecutive}
                    isInternalNumbering
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.ar_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo * (CP##)",
                            id: "ar_prefix",
                            value: formData.ar_prefix || "CP",
                            onChange: (v) => {
                                const upper = v.toUpperCase();
                                const val = upper.startsWith("CP") ? upper.slice(0, 4) : "CP" + upper.replace(/^CP*/i, "").slice(0, 2);
                                setFormData({ ...formData, ar_prefix: val });
                            },
                            placeholder: "Ej: CPAR",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "ar_consecutive_start",
                            value: formData.ar_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, ar_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "ar_consecutive_end",
                            value: formData.ar_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, ar_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Recibo del Bien */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Numeracion Recibo del Bien"
                    configuredDescription="Numeracion configurada correctamente"
                    editDescription="Ingrese los datos de numeracion para recibo del bien"
                    isConfigured={isRbConfigured}
                    editing={editingRb}
                    saving={savingRb}
                    onEdit={() => setEditingRb(true)}
                    onCancel={() => { setEditingRb(false); loadConfig(); }}
                    onSave={handleSaveRb}
                    currentConsecutive={rbCurrentConsecutive}
                    isInternalNumbering
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.rb_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo * (CP##)",
                            id: "rb_prefix",
                            value: formData.rb_prefix || "CP",
                            onChange: (v) => {
                                const upper = v.toUpperCase();
                                const val = upper.startsWith("CP") ? upper.slice(0, 4) : "CP" + upper.replace(/^CP*/i, "").slice(0, 2);
                                setFormData({ ...formData, rb_prefix: val });
                            },
                            placeholder: "Ej: CPRB",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "rb_consecutive_start",
                            value: formData.rb_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, rb_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "rb_consecutive_end",
                            value: formData.rb_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, rb_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Aceptación Expresa */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Numeracion Aceptación Expresa"
                    configuredDescription="Numeracion configurada correctamente"
                    editDescription="Ingrese los datos de numeracion para aceptación expresa"
                    isConfigured={isEaConfigured}
                    editing={editingEa}
                    saving={savingEa}
                    onEdit={() => setEditingEa(true)}
                    onCancel={() => { setEditingEa(false); loadConfig(); }}
                    onSave={handleSaveEa}
                    currentConsecutive={eaCurrentConsecutive}
                    isInternalNumbering
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.ea_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo * (CP##)",
                            id: "ea_prefix",
                            value: formData.ea_prefix || "CP",
                            onChange: (v) => {
                                const upper = v.toUpperCase();
                                const val = upper.startsWith("CP") ? upper.slice(0, 4) : "CP" + upper.replace(/^CP*/i, "").slice(0, 2);
                                setFormData({ ...formData, ea_prefix: val });
                            },
                            placeholder: "Ej: CPEA",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "ea_consecutive_start",
                            value: formData.ea_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, ea_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "ea_consecutive_end",
                            value: formData.ea_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, ea_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Documento Soporte */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion Documento Soporte"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion para documento soporte"
                    isConfigured={isDsConfigured}
                    editing={editingDs}
                    saving={savingDs}
                    onEdit={() => setEditingDs(true)}
                    onCancel={() => { setEditingDs(false); loadConfig(); }}
                    onSave={handleSaveDs}
                    currentConsecutive={dsCurrentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(12, "Resolución Documento Soporte") : undefined}
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.ds_prefix ?? null },
                        { label: "Resolucion", value: formData.ds_resolution ?? null },
                        { label: "Fecha Resolucion", value: formData.ds_resolution_date ?? null },
                        { label: "Vigencia Desde", value: formData.ds_date_from ?? null },
                        { label: "Vigencia Hasta", value: formData.ds_date_to ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo *",
                            id: "ds_prefix",
                            value: formData.ds_prefix || "",
                            onChange: (v) => setFormData({ ...formData, ds_prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: DS",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "No. Resolucion *",
                            id: "ds_resolution",
                            value: formData.ds_resolution || "",
                            onChange: (v) => setFormData({ ...formData, ds_resolution: v }),
                            placeholder: "Ej: 18764000001",
                            type: "text",
                        },
                        {
                            label: "Fecha Resolucion",
                            id: "ds_resolution_date",
                            value: formData.ds_resolution_date || "",
                            onChange: (v) => setFormData({ ...formData, ds_resolution_date: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Vigencia Desde",
                            id: "ds_date_from",
                            value: formData.ds_date_from || "",
                            onChange: (v) => setFormData({ ...formData, ds_date_from: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Vigencia Hasta",
                            id: "ds_date_to",
                            value: formData.ds_date_to || "",
                            onChange: (v) => setFormData({ ...formData, ds_date_to: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "ds_consecutive_start",
                            value: formData.ds_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, ds_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "ds_consecutive_end",
                            value: formData.ds_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, ds_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Factura POS */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion Factura POS"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion para factura POS electronica"
                    isConfigured={isPosConfigured}
                    editing={editingPos}
                    saving={savingPos}
                    onEdit={() => setEditingPos(true)}
                    onCancel={() => { setEditingPos(false); loadConfig(); }}
                    onSave={handleSavePos}
                    currentConsecutive={posCurrentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(10, "Resolución Factura POS") : undefined}
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.pos_prefix ?? null },
                        { label: "ID Resolucion", value: formData.pos_resolution_id ?? null },
                        { label: "Software ID", value: formData.pos_software_id ?? null },
                        { label: "PIN", value: formData.pos_pin ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo *",
                            id: "pos_prefix",
                            value: formData.pos_prefix || "",
                            onChange: (v) => setFormData({ ...formData, pos_prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: POS",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "ID Resolucion DIAN *",
                            id: "pos_resolution_id",
                            value: formData.pos_resolution_id || "",
                            onChange: (v) => setFormData({ ...formData, pos_resolution_id: v }),
                            placeholder: "Ej: 18764000001",
                            type: "text",
                        },
                        {
                            label: "Software ID *",
                            id: "pos_software_id",
                            value: formData.pos_software_id || "",
                            onChange: (v) => setFormData({ ...formData, pos_software_id: v }),
                            placeholder: "ID del software POS",
                            type: "text",
                        },
                        {
                            label: "PIN *",
                            id: "pos_pin",
                            value: formData.pos_pin || "",
                            onChange: (v) => setFormData({ ...formData, pos_pin: v }),
                            placeholder: "PIN del software POS",
                            type: "text",
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "pos_consecutive_start",
                            value: formData.pos_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, pos_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "pos_consecutive_end",
                            value: formData.pos_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, pos_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* NC Factura POS */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion NC Factura POS"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de numeracion para nota credito de factura POS"
                    isConfigured={isPosCnConfigured}
                    editing={editingPosCn}
                    saving={savingPosCn}
                    onEdit={() => setEditingPosCn(true)}
                    onCancel={() => { setEditingPosCn(false); loadConfig(); }}
                    onSave={handleSavePosCn}
                    currentConsecutive={posCnCurrentConsecutive}
                    isInternalNumbering
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.pos_cn_prefix ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo * (CP##)",
                            id: "pos_cn_prefix",
                            value: formData.pos_cn_prefix || "CP",
                            onChange: (v) => {
                                const upper = v.toUpperCase();
                                const val = upper.startsWith("CP") ? upper.slice(0, 4) : "CP" + upper.replace(/^CP*/i, "").slice(0, 2);
                                setFormData({ ...formData, pos_cn_prefix: val });
                            },
                            placeholder: "Ej: CPPN",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "pos_cn_consecutive_start",
                            value: formData.pos_cn_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, pos_cn_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "pos_cn_consecutive_end",
                            value: formData.pos_cn_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, pos_cn_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* NC Documento Soporte */}
                <NumberingSection
                    icon={<FileText className="h-5 w-5" />}
                    title="Resolucion NC Documento Soporte"
                    configuredDescription="Resolucion configurada correctamente"
                    editDescription="Ingrese los datos de la resolucion para nota credito de documento soporte"
                    isConfigured={isDsCnConfigured}
                    editing={editingDsCn}
                    saving={savingDsCn}
                    onEdit={() => setEditingDsCn(true)}
                    onCancel={() => { setEditingDsCn(false); loadConfig(); }}
                    onSave={handleSaveDsCn}
                    currentConsecutive={dsCnCurrentConsecutive}
                    onViewResolution={hasToken ? () => handleLoadResolutions(13, "Resolución NC Documento Soporte") : undefined}
                    readOnlyFields={[
                        { label: "Prefijo", value: formData.ds_cn_prefix ?? null },
                        { label: "Resolucion", value: formData.ds_cn_resolution ?? null },
                        { label: "Fecha Resolucion", value: formData.ds_cn_resolution_date ?? null },
                        { label: "Vigencia Desde", value: formData.ds_cn_date_from ?? null },
                        { label: "Vigencia Hasta", value: formData.ds_cn_date_to ?? null },
                    ]}
                    editFields={[
                        {
                            label: "Prefijo *",
                            id: "ds_cn_prefix",
                            value: formData.ds_cn_prefix || "",
                            onChange: (v) => setFormData({ ...formData, ds_cn_prefix: v.toUpperCase().slice(0, 4) }),
                            placeholder: "Ej: NDS",
                            type: "text",
                            maxLength: 4,
                        },
                        {
                            label: "No. Resolucion *",
                            id: "ds_cn_resolution",
                            value: formData.ds_cn_resolution || "",
                            onChange: (v) => setFormData({ ...formData, ds_cn_resolution: v }),
                            placeholder: "Ej: 18764000001",
                            type: "text",
                        },
                        {
                            label: "Fecha Resolucion",
                            id: "ds_cn_resolution_date",
                            value: formData.ds_cn_resolution_date || "",
                            onChange: (v) => setFormData({ ...formData, ds_cn_resolution_date: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Vigencia Desde",
                            id: "ds_cn_date_from",
                            value: formData.ds_cn_date_from || "",
                            onChange: (v) => setFormData({ ...formData, ds_cn_date_from: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Vigencia Hasta",
                            id: "ds_cn_date_to",
                            value: formData.ds_cn_date_to || "",
                            onChange: (v) => setFormData({ ...formData, ds_cn_date_to: v }),
                            placeholder: "",
                            type: "date",
                        },
                        {
                            label: "Consecutivo Desde *",
                            id: "ds_cn_consecutive_start",
                            value: formData.ds_cn_consecutive_start ?? null,
                            onChange: (v) => setFormData({ ...formData, ds_cn_consecutive_start: v ? parseInt(v) : null }),
                            placeholder: "Ej: 1",
                            type: "number",
                        },
                        {
                            label: "Consecutivo Hasta *",
                            id: "ds_cn_consecutive_end",
                            value: formData.ds_cn_consecutive_end ?? null,
                            onChange: (v) => setFormData({ ...formData, ds_cn_consecutive_end: v ? parseInt(v) : null }),
                            placeholder: "Ej: 99999999999",
                            type: "number",
                        },
                    ]}
                />

                {/* Nómina Electrónica - Global Config */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Nómina Electrónica
                                </CardTitle>
                                <CardDescription>
                                    {!editingPayrollGlobal
                                        ? "Configuración global de nómina electrónica (Software ID y PIN)"
                                        : "Ingrese el Software ID y PIN de nómina electrónica"}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {!editingPayrollGlobal && hasToken && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleLoadResolutions(102, "Resolución Nómina Electrónica")}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Ver Resolución DIAN
                                    </Button>
                                )}
                                {!editingPayrollGlobal && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingPayrollGlobal(true)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!editingPayrollGlobal ? (
                            <div className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Software ID</p>
                                        <p className="text-lg font-semibold">{formData.payroll_software_id || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">PIN</p>
                                        <p className="text-lg font-semibold">{formData.payroll_pin || "-"}</p>
                                    </div>
                                </div>
                                {isPayrollGlobalConfigured && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-700 dark:text-green-400">Configuracion guardada</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="payroll_software_id">Software ID *</Label>
                                        <Input
                                            id="payroll_software_id"
                                            value={formData.payroll_software_id || ""}
                                            onChange={(e) => setFormData({ ...formData, payroll_software_id: e.target.value })}
                                            placeholder="ID del software DIAN"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="payroll_pin">PIN *</Label>
                                        <Input
                                            id="payroll_pin"
                                            value={formData.payroll_pin || ""}
                                            onChange={(e) => setFormData({ ...formData, payroll_pin: e.target.value })}
                                            placeholder="PIN del software"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    {isPayrollGlobalConfigured && (
                                        <Button type="button" variant="outline" onClick={() => { setEditingPayrollGlobal(false); loadConfig(); }}>
                                            Cancelar
                                        </Button>
                                    )}
                                    <Button type="button" disabled={savingPayrollGlobal} onClick={handleSavePayrollGlobal}>
                                        {savingPayrollGlobal ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Guardar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Nómina Electrónica - Rangos de Numeración */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <List className="h-5 w-5" />
                                    Rangos de Numeración - Nómina
                                </CardTitle>
                                <CardDescription>
                                    Gestione los rangos de consecutivos para nómina electrónica. Cada rango tiene un prefijo único.
                                </CardDescription>
                            </div>
                            <Button type="button" size="sm" className="flex-shrink-0 w-full sm:w-auto" onClick={openAddRange}>
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Rango
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {payrollRanges.length === 0 && !showAddRange ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No hay rangos de numeración configurados</p>
                                <p className="text-xs mt-1">Agregue un rango para comenzar a emitir nóminas electrónicas</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {payrollRanges.map((range) => (
                                    <div key={range.id} className="rounded-lg border p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold">{range.name}</span>
                                                <Badge className={range.type === 'payroll_note'
                                                    ? "bg-orange-500/15 text-orange-700 border-orange-500/20 hover:bg-orange-500/15 border"
                                                    : "bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15 border"
                                                }>
                                                    {range.type === 'payroll_note' ? "Nota de ajuste" : "Nómina"}
                                                </Badge>
                                                <Badge className={range.is_active
                                                    ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15 border"
                                                    : "bg-muted text-foreground border-border hover:bg-muted border"
                                                }>
                                                    {range.is_active ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => openEditRange(range)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                                    disabled={deletingRangeId === range.id}
                                                    onClick={() => handleDeleteRange(range.id)}
                                                >
                                                    {deletingRangeId === range.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prefijo</p>
                                                <p className="font-mono font-semibold">{range.prefix}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consecutivo Desde</p>
                                                <p className="font-mono">{range.consecutive_start ?? "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consecutivo Hasta</p>
                                                <p className="font-mono">{range.consecutive_end ?? "-"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Consecutivo Actual</p>
                                                <p className="font-mono font-bold text-primary">{range.current_consecutive}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add/Edit Range Form */}
                        {showAddRange && (
                            <div className={`rounded-lg border-2 border-primary/20 bg-muted/30 p-4 space-y-4 ${payrollRanges.length > 0 ? "mt-4" : ""}`}>
                                <p className="font-medium text-sm">
                                    {editingRangeId ? "Editar rango de numeración" : "Nuevo rango de numeración"}
                                </p>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="range_name">Nombre *</Label>
                                        <Input
                                            id="range_name"
                                            value={rangeForm.name}
                                            onChange={(e) => setRangeForm({ ...rangeForm, name: e.target.value })}
                                            placeholder="Ej: Nómina Mensual"
                                            maxLength={100}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="range_type">Tipo *</Label>
                                        <Select value={rangeForm.type} onValueChange={(v) => setRangeForm({ ...rangeForm, type: v as "payroll" | "payroll_note" })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar tipo" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                <SelectItem value="payroll">Nómina</SelectItem>
                                                <SelectItem value="payroll_note">Nota de ajuste</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="range_prefix">Prefijo * (CP##)</Label>
                                        <Input
                                            id="range_prefix"
                                            value={rangeForm.prefix}
                                            onChange={(e) => {
                                                const upper = e.target.value.toUpperCase();
                                                const val = upper.startsWith("CP") ? upper.slice(0, 4) : "CP" + upper.replace(/^CP*/i, "").slice(0, 2);
                                                setRangeForm({ ...rangeForm, prefix: val });
                                            }}
                                            placeholder="Ej: CPNE"
                                            maxLength={4}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="range_consecutive_start">Consecutivo Desde *</Label>
                                        <Input
                                            id="range_consecutive_start"
                                            type="number"
                                            value={rangeForm.consecutive_start}
                                            onChange={(e) => setRangeForm({ ...rangeForm, consecutive_start: e.target.value })}
                                            placeholder="Ej: 1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="range_consecutive_end">Consecutivo Hasta *</Label>
                                        <Input
                                            id="range_consecutive_end"
                                            type="number"
                                            value={rangeForm.consecutive_end}
                                            onChange={(e) => setRangeForm({ ...rangeForm, consecutive_end: e.target.value })}
                                            placeholder="Ej: 99999999999"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddRange(false); setEditingRangeId(null); }}>
                                        Cancelar
                                    </Button>
                                    <Button type="button" size="sm" disabled={savingRange} onClick={handleSaveRange}>
                                        {savingRange ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        {editingRangeId ? "Actualizar" : "Crear"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Resoluciones Dialog */}
            <Dialog open={resolutionsOpen} onOpenChange={setResolutionsOpen}>
                <DialogContent className="bg-card max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <List className="h-5 w-5" />
                            {resolutionFilterTitle}
                        </DialogTitle>
                        <DialogDescription>
                            {resolutionFilterTypeId
                                ? "Resolución registrada en la DIAN para este tipo de documento"
                                : "Todas las resoluciones registradas en la DIAN para esta empresa"}
                        </DialogDescription>
                    </DialogHeader>

                    {resolutionsLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}

                    {resolutionsError && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{resolutionsError}</AlertDescription>
                        </Alert>
                    )}

                    {resolutionsData && !resolutionsLoading && (() => {
                        const filtered = getFilteredResolutions();
                        return (
                        <div className="space-y-4">
                            {Array.isArray(filtered) ? (
                                filtered.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                        {resolutionFilterTypeId
                                            ? "No se encontró resolución para este tipo de documento"
                                            : "No se encontraron resoluciones"}
                                    </p>
                                ) : (
                                    filtered.map((res: any, index: number) => (
                                        <Card key={index}>
                                            <CardContent className="pt-4 space-y-3">
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    {res.type_document_id && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Tipo Documento</p>
                                                            <p className="font-semibold">{res.type_document?.name || res.type_document_id}</p>
                                                        </div>
                                                    )}
                                                    {res.prefix && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Prefijo</p>
                                                            <p className="font-semibold">{res.prefix}</p>
                                                        </div>
                                                    )}
                                                    {res.resolution != null && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Resolucion</p>
                                                            <p className="font-semibold">{res.resolution}</p>
                                                        </div>
                                                    )}
                                                    {res.resolution_date && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Fecha Resolucion</p>
                                                            <p className="font-semibold">{res.resolution_date}</p>
                                                        </div>
                                                    )}
                                                    {res.technical_key && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Clave Tecnica</p>
                                                            <p className="font-mono text-sm break-all">{res.technical_key}</p>
                                                        </div>
                                                    )}
                                                    {res.from != null && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Desde</p>
                                                            <p className="font-mono font-semibold">{res.from}</p>
                                                        </div>
                                                    )}
                                                    {res.to != null && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Hasta</p>
                                                            <p className="font-mono font-semibold">{res.to}</p>
                                                        </div>
                                                    )}
                                                    {res.date_from && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Vigencia Desde</p>
                                                            <p className="font-semibold">{res.date_from}</p>
                                                        </div>
                                                    )}
                                                    {res.date_to && (
                                                        <div>
                                                            <p className="text-xs font-medium text-muted-foreground uppercase">Vigencia Hasta</p>
                                                            <p className="font-semibold">{res.date_to}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )
                            ) : (
                                <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
                                    {JSON.stringify(filtered, null, 2)}
                                </pre>
                            )}
                        </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
