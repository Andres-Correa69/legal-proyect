import { useState, useEffect, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    payrollApi,
    type PayrollData,
    type PayrollEmployeeData,
    type PayrollNumberingRangeData,
    type BranchUserData,
    
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
    FileText,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Users,
    Send,
    AlertCircle,
    Loader2,
    Pencil,
    Eye,
    FileDown,
    ExternalLink,
    Ban,
    Hash,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    draft: {
        label: "Borrador",
        className: "bg-muted text-foreground border-border hover:bg-muted",
    },
    in_progress: {
        label: "En proceso",
        className: "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15",
    },
    issued: {
        label: "Emitida",
        className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15",
    },
    cancelled: {
        label: "Cancelada",
        className: "bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15",
    },
};

interface EmployeeRow {
    userId: number;
    name: string;
    documentId: string | null;
    payrollEmployee: PayrollEmployeeData | null;
}

export default function PayrollShow() {
    const { id } = usePage<{ id: number }>().props;
    const [loading, setLoading] = useState(true);
    const [payroll, setPayroll] = useState<PayrollData | null>(null);
    const [payrollEmployees, setPayrollEmployees] = useState<PayrollEmployeeData[]>([]);
    const [branchUsers, setBranchUsers] = useState<BranchUserData[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [emitting, setEmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Confirmation dialog state
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [emitProgress, setEmitProgress] = useState({ total: 0, done: 0, success: 0, failed: 0 });
    const [emitResults, setEmitResults] = useState<{ name: string; success: boolean; message: string; errors?: Record<string, string[]>; errorMessages?: string[]; payload?: Record<string, unknown> }[]>([]);
    const [viewPayloadIndex, setViewPayloadIndex] = useState<number | null>(null);

    // Annulment state
    const [annullingId, setAnnullingId] = useState<number | null>(null);
    const [numberingRanges, setNumberingRanges] = useState<PayrollNumberingRangeData[]>([]);
    const [selectedNoteRangeId, setSelectedNoteRangeId] = useState<number | null>(null);
    const [annulDialogOpen, setAnnulDialogOpen] = useState(false);
    const [annulRow, setAnnulRow] = useState<EmployeeRow | null>(null);
    const [annulRangeId, setAnnulRangeId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await payrollApi.getById(id);
            setPayroll(data.payroll);
            setPayrollEmployees(data.payroll_employees);
            setBranchUsers(data.branch_users);
            setNumberingRanges(data.numbering_ranges ?? []);
            const activeNote = (data.numbering_ranges ?? []).find((r) => r.type === 'payroll_note' && r.is_active);
            if (activeNote) setSelectedNoteRangeId(activeNote.id);
        } catch (err: any) {
            setError(err?.message || "Error al cargar los datos de la nómina.");
        } finally {
            setLoading(false);
        }
    };

    // Merge branch users with payroll employees
    const employeeRows: EmployeeRow[] = useMemo(() => {
        if (!branchUsers.length) return [];

        const peMap = new Map<number, PayrollEmployeeData>();
        payrollEmployees.forEach((pe) => peMap.set(pe.employee_id, pe));

        return branchUsers.map((user) => ({
            userId: user.id,
            name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
            documentId: user.document_id,
            payrollEmployee: peMap.get(user.id) ?? null,
        }));
    }, [branchUsers, payrollEmployees]);

    // Selectable = not yet accepted, or annulled but not re-emitted
    const isSelectable = (row: EmployeeRow) => {
        if (!row.payrollEmployee) return true;
        if (row.payrollEmployee.annulled && !row.payrollEmployee.accepted) return true;
        if (row.payrollEmployee.accepted) return false;
        return true;
    };

    const selectableRows = useMemo(() => employeeRows.filter(isSelectable), [employeeRows]);

    const toggleSelect = (userId: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === selectableRows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(selectableRows.map((r) => r.userId)));
        }
    };

    const getMonthLabel = (dateString: string): string => {
        const raw = dateString.split("T")[0];
        const date = new Date(raw + "T12:00:00");
        return format(date, "MMMM yyyy", { locale: es });
    };

    const getNumeracion = (): string => {
        if (!payroll) return "-";
        if (payroll.prefix && payroll.number !== null) {
            return `${payroll.prefix}-${String(payroll.number).padStart(4, "0")}`;
        }
        return payroll.number !== null ? String(payroll.number) : "-";
    };

    const getEmissionStatus = (row: EmployeeRow) => {
        if (!row.payrollEmployee) {
            return (
                <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted border">
                    <Clock className="h-3 w-3 mr-1" />
                    Por emitir
                </Badge>
            );
        }
        if (row.payrollEmployee.annulled && !row.payrollEmployee.accepted) {
            return (
                <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/20 hover:bg-orange-500/15 border">
                    <XCircle className="h-3 w-3 mr-1" />
                    Anulada
                </Badge>
            );
        }
        if (row.payrollEmployee.accepted) {
            return (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15 border">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Emitida
                </Badge>
            );
        }
        if (row.payrollEmployee.rejected) {
            return (
                <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15 border">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazada
                </Badge>
            );
        }
        return (
            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 border">
                <Clock className="h-3 w-3 mr-1" />
                Pendiente
            </Badge>
        );
    };

    const openConfirmDialog = () => {
        setEmitResults([]);
        setEmitProgress({ total: 0, done: 0, success: 0, failed: 0 });
        setConfirmDialogOpen(true);
    };

    const handleBulkEmit = async () => {
        if (selectedIds.size === 0 || !payroll) return;
        setEmitting(true);

        const peMap = new Map<number, PayrollEmployeeData>();
        payrollEmployees.forEach((pe) => peMap.set(pe.employee_id, pe));

        // Build list of employees to send
        const toSend: { userId: number; name: string; pe: PayrollEmployeeData }[] = [];
        const immediateErrors: { name: string; success: boolean; message: string }[] = [];

        for (const userId of selectedIds) {
            const pe = peMap.get(userId);
            const name = branchUsers.find(u => u.id === userId)?.name || `Empleado ${userId}`;
            if (!pe) {
                immediateErrors.push({ name, success: false, message: "No tiene registro de nómina. Edite primero sus devengados." });
            } else {
                toSend.push({ userId, name, pe });
            }
        }

        const total = toSend.length + immediateErrors.length;
        setEmitProgress({ total, done: immediateErrors.length, success: 0, failed: immediateErrors.length });
        setEmitResults([...immediateErrors]);

        // Send all in parallel
        const promises = toSend.map(async ({ name, pe }) => {
            try {
                const result = await payrollApi.sendEmployee(payroll.id, pe.id);
                const msg = result.is_mock ? "[MOCK] Emitida correctamente" : "Emitida correctamente";
                return { name, success: true, message: msg, payload: result.request_payload };
            } catch (err: any) {
                return {
                    name,
                    success: false,
                    message: err?.message || "Error desconocido",
                    errors: err?.errors as Record<string, string[]> | undefined,
                    errorMessages: err?.errors_messages as string[] | undefined,
                    payload: err?.request_payload as Record<string, unknown> | undefined,
                };
            }
        });

        // Process results as they complete
        const settled = await Promise.allSettled(promises);
        const results = [...immediateErrors];
        let successCount = 0;
        let failedCount = immediateErrors.length;

        for (const result of settled) {
            if (result.status === "fulfilled") {
                results.push(result.value);
                if (result.value.success) successCount++;
                else failedCount++;
            } else {
                results.push({ name: "Desconocido", success: false, message: "Error inesperado" });
                failedCount++;
            }
        }

        setEmitProgress({ total, done: total, success: successCount, failed: failedCount });
        setEmitResults(results);
        setEmitting(false);
        setSelectedIds(new Set());
        loadData();
    };

    const noteRangesAll = useMemo(() => numberingRanges.filter((r) => r.type === 'payroll_note'), [numberingRanges]);

    const openAnnulDialog = (row: EmployeeRow) => {
        setAnnulRow(row);
        setAnnulRangeId(selectedNoteRangeId);
        setAnnulDialogOpen(true);
    };

    const handleAnnulConfirm = async () => {
        if (!payroll || !annulRow?.payrollEmployee) return;

        setAnnulDialogOpen(false);
        setAnnullingId(annulRow.payrollEmployee.id);
        try {
            const result = await payrollApi.annulEmployee(payroll.id, annulRow.payrollEmployee.id, annulRangeId ?? undefined);
            toast({
                title: "Nómina anulada",
                description: result.is_mock
                    ? "[MOCK] Nota de ajuste procesada correctamente."
                    : "La nota de ajuste fue aceptada por la DIAN.",
            });
            loadData();
        } catch (err: any) {
            toast({
                title: "Error al anular",
                description: err?.message || "Error desconocido al anular la nómina.",
                variant: "destructive",
            });
        } finally {
            setAnnullingId(null);
            setAnnulRow(null);
        }
    };

    if (loading) {
        return (
            <AppLayout title="Detalle Nómina">
                <Head title="Detalle Nómina" />
                <div className="flex items-center justify-center py-20 gap-2">
                    <Spinner className="mr-2" />
                    <span className="text-muted-foreground">Cargando nómina...</span>
                </div>
            </AppLayout>
        );
    }

    if (error || !payroll) {
        return (
            <AppLayout title="Detalle Nómina">
                <Head title="Detalle Nómina" />
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error || "No se encontró la nómina."}</AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => router.visit("/admin/payroll")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const statusConfig = STATUS_CONFIG[payroll.status] || STATUS_CONFIG.draft;

    return (
        <AppLayout title="Detalle Nómina">
            <Head title={`Nómina ${getNumeracion()}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit("/admin/payroll")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="bg-primary/10 p-2.5 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">
                                Nómina {getNumeracion()}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {getMonthLabel(payroll.settlement_start_date)} — Detalle de emisión
                            </p>
                        </div>
                    </div>
                    <Badge className={`${statusConfig.className} border text-sm px-3 py-1`}>
                        {statusConfig.label}
                    </Badge>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Users className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Empleados</p>
                                    <p className="text-2xl font-bold">{branchUsers.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-500/15 p-2 rounded-lg">
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Emitidas</p>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {payroll.issued_count}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-500/15 p-2 rounded-lg">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Rechazadas</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {payroll.rejected_count}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-muted p-2 rounded-lg">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Por emitir</p>
                                    <p className="text-2xl font-bold">
                                        {branchUsers.length - payroll.issued_count}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Numbering ranges - only this payroll's prefix + note range */}
                {(() => {
                    const payrollRange = numberingRanges.find((r) => r.type === 'payroll' && r.prefix === payroll.prefix);
                    const noteRanges = numberingRanges.filter((r) => r.type === 'payroll_note');
                    const selectedNoteRange = noteRanges.find((r) => r.id === selectedNoteRangeId) ?? noteRanges.find((r) => r.is_active);
                    if (!payrollRange && !noteRanges.length) return null;
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {payrollRange && (
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-500/15 p-2 rounded-lg">
                                                <Hash className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Consecutivo nómina</p>
                                                <p className="text-lg font-bold font-mono">
                                                    {payrollRange.prefix}-{String(payrollRange.current_consecutive).padStart(4, '0')}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    de {payrollRange.consecutive_start} a {payrollRange.consecutive_end}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {noteRanges.length > 0 && (
                                <Card>
                                    <CardContent className="pt-4 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-500/15 p-2 rounded-lg">
                                                <Hash className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground mb-1">Consecutivo nota ajuste</p>
                                                {noteRanges.length === 1 ? (
                                                    <>
                                                        <p className="text-lg font-bold font-mono">
                                                            {noteRanges[0].prefix}-{String(noteRanges[0].current_consecutive).padStart(4, '0')}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            de {noteRanges[0].consecutive_start} a {noteRanges[0].consecutive_end}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Select
                                                            value={selectedNoteRangeId ? String(selectedNoteRangeId) : undefined}
                                                            onValueChange={(v) => setSelectedNoteRangeId(Number(v))}
                                                        >
                                                            <SelectTrigger className="h-8 text-sm w-full">
                                                                <SelectValue placeholder="Seleccionar rango..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card z-50">
                                                                {noteRanges.map((nr) => (
                                                                    <SelectItem key={nr.id} value={String(nr.id)}>
                                                                        {nr.prefix}-{String(nr.current_consecutive).padStart(4, '0')}
                                                                        {nr.is_active ? " (activo)" : ""}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {selectedNoteRange && (
                                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                                de {selectedNoteRange.consecutive_start} a {selectedNoteRange.consecutive_end}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    );
                })()}

                {/* Info text */}
                <p className="text-sm text-muted-foreground">
                    Estos son los empleados de la sede. Selecciona los que deseas incluir en esta emisión de nómina electrónica.
                </p>

                {/* Employees Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="h-12 px-4 w-12">
                                        <Checkbox
                                            checked={selectableRows.length > 0 && selectedIds.size === selectableRows.length}
                                            onCheckedChange={toggleSelectAll}
                                            disabled={selectableRows.length === 0}
                                        />
                                    </TableHead>
                                    <TableHead className="h-12 px-4">Nombre</TableHead>
                                    <TableHead className="h-12 px-4">Identificación</TableHead>
                                    <TableHead className="h-12 px-4">Estado emisión</TableHead>
                                    <TableHead className="h-12 px-4 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employeeRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-4 text-center text-muted-foreground">
                                            No hay empleados registrados en esta sede
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    employeeRows.map((row) => {
                                        const selectable = isSelectable(row);
                                        return (
                                            <TableRow key={row.userId}>
                                                <TableCell className="p-4 w-12">
                                                    {selectable && (
                                                        <Checkbox
                                                            checked={selectedIds.has(row.userId)}
                                                            onCheckedChange={() => toggleSelect(row.userId)}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="p-4 font-medium">
                                                    {row.name}
                                                </TableCell>
                                                <TableCell className="p-4 font-mono text-sm">
                                                    {row.documentId || "-"}
                                                </TableCell>
                                                <TableCell className="p-4">
                                                    {getEmissionStatus(row)}
                                                </TableCell>
                                                <TableCell className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Emission PDF & QR */}
                                                        {row.payrollEmployee?.accepted && row.payrollEmployee?.has_pdf && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                onClick={() => window.open(`/api/electronic-invoicing/payrolls/employees/${row.payrollEmployee!.id}/pdf`, '_blank')}
                                                                title="Ver PDF"
                                                            >
                                                                <FileDown className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {row.payrollEmployee?.accepted && row.payrollEmployee?.qr_link && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                                onClick={() => window.open(row.payrollEmployee!.qr_link!, '_blank')}
                                                                title="Ver en DIAN"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {row.payrollEmployee?.annulled && row.payrollEmployee?.annulment_qr_link && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                                                onClick={() => window.open(row.payrollEmployee!.annulment_qr_link!, '_blank')}
                                                                title="Ver anulación en DIAN"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {/* Annul button - only if accepted and not annulled */}
                                                        {row.payrollEmployee?.accepted && !row.payrollEmployee?.annulled && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                                                onClick={() => openAnnulDialog(row)}
                                                                disabled={annullingId === row.payrollEmployee!.id}
                                                                title="Anular nómina"
                                                            >
                                                                {annullingId === row.payrollEmployee!.id
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Ban className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => router.visit(`/admin/payroll/${id}/employee/${row.userId}`)}
                                                            title="Editar devengados y deducciones"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => router.visit(`/admin/payroll/${id}/employee/${row.userId}/detail`)}
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Bottom Action Bar */}
                {selectableRows.length > 0 && (
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {selectedIds.size > 0
                                        ? `${selectedIds.size} empleado(s) seleccionado(s)`
                                        : "Selecciona empleados para emitir nómina"}
                                </p>
                                <Button
                                    disabled={selectedIds.size === 0 || emitting}
                                    onClick={openConfirmDialog}
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    Emitir nómina ({selectedIds.size})
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Confirmation + Progress Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={(open) => { if (!emitting) setConfirmDialogOpen(open); }}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {emitting ? "Emitiendo nómina electrónica..." : emitProgress.done > 0 ? "Resultado de emisión" : "Confirmar emisión"}
                        </DialogTitle>
                        <DialogDescription>
                            {emitting
                                ? `Enviando ${selectedIds.size} nómina(s) a la DIAN. No cierres esta ventana.`
                                : emitProgress.done > 0
                                    ? `${emitProgress.success} exitosa(s), ${emitProgress.failed} con errores de ${emitProgress.total} total.`
                                    : `¿Estás seguro de emitir la nómina electrónica para ${selectedIds.size} empleado(s)?`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Progress bar during emission */}
                    {emitting && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 py-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">
                                    Procesando {selectedIds.size} empleado(s) en paralelo...
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Results list after emission */}
                    {!emitting && emitResults.length > 0 && (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {emitResults.map((r, i) => (
                                <div key={i}>
                                    <div className={`flex items-start gap-2 text-sm p-2 rounded ${r.success ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                        {r.success ? (
                                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium">{r.name}</span>
                                            <p className="text-xs text-muted-foreground">{r.message}</p>
                                            {r.errorMessages && r.errorMessages.length > 0 && (
                                                <ul className="mt-1 space-y-0.5">
                                                    {r.errorMessages.map((msg, j) => (
                                                        <li key={j} className="text-xs text-red-600">• {msg}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            {r.errors && Object.keys(r.errors).length > 0 && (
                                                <ul className="mt-1 space-y-0.5">
                                                    {Object.entries(r.errors).map(([field, msgs]) => (
                                                        msgs.map((msg, j) => (
                                                            <li key={`${field}-${j}`} className="text-xs text-red-600">
                                                                • {msg}
                                                            </li>
                                                        ))
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        {r.payload && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs"
                                                onClick={() => setViewPayloadIndex(viewPayloadIndex === i ? null : i)}
                                            >
                                                {viewPayloadIndex === i ? "Ocultar JSON" : "Ver JSON"}
                                            </Button>
                                        )}
                                    </div>
                                    {r.payload && viewPayloadIndex === i && (
                                        <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
                                            {JSON.stringify(r.payload, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        {/* Before emission: confirm/cancel */}
                        {!emitting && emitProgress.done === 0 && (
                            <>
                                <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleBulkEmit}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Confirmar emisión
                                </Button>
                            </>
                        )}
                        {/* After emission: close */}
                        {!emitting && emitProgress.done > 0 && (
                            <Button onClick={() => setConfirmDialogOpen(false)}>
                                Cerrar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Annulment confirmation dialog */}
            <Dialog open={annulDialogOpen} onOpenChange={setAnnulDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ban className="h-5 w-5 text-orange-600" />
                            Anular nómina
                        </DialogTitle>
                        <DialogDescription>
                            ¿Está seguro de anular la nómina de <strong>{annulRow?.name}</strong>? Esta acción enviará una nota de ajuste a la DIAN.
                        </DialogDescription>
                    </DialogHeader>

                    {noteRangesAll.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Resolución de anulación</label>
                            <Select
                                value={annulRangeId ? String(annulRangeId) : undefined}
                                onValueChange={(v) => setAnnulRangeId(Number(v))}
                            >
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Seleccionar resolución..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card z-50">
                                    {noteRangesAll.map((nr) => (
                                        <SelectItem key={nr.id} value={String(nr.id)}>
                                            {nr.prefix}-{String(nr.current_consecutive).padStart(4, '0')}
                                            {nr.is_active ? " (por defecto)" : ""}
                                            {" — "}{nr.name || `de ${nr.consecutive_start} a ${nr.consecutive_end}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setAnnulDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleAnnulConfirm}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            Anular nómina
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
