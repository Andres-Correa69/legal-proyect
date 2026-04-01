import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    payrollApi,
    payrollNumberingRangeApi,
    type PayrollData,
    type PayrollNumberingRangeData,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import {
    FileText,
    Plus,
    Eye,
    Users,
    CheckCircle,
    XCircle,
    Loader2,
    AlertCircle,
    Clock,
    Search,
    CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { cn } from "@/lib/utils";

type DateFilterValue = "all" | "hoy" | "ayer" | "7dias" | "30dias" | "estemes" | "personalizado";

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

const MONTHS = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
];

function getYearOptions(): string[] {
    const currentYear = new Date().getFullYear();
    return [String(currentYear - 1), String(currentYear), String(currentYear + 1)];
}

function getLastDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

export default function PayrollIndex() {
    const [payrolls, setPayrolls] = useState<PayrollData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [loadingConfig, setLoadingConfig] = useState(false);
    const [numberingRanges, setNumberingRanges] = useState<PayrollNumberingRangeData[]>([]);
    const [selectedRangeId, setSelectedRangeId] = useState<string>("");

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await payrollApi.getAll();
            setPayrolls(data);
        } catch (error: any) {
            console.error("Error loading payrolls:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = async () => {
        setSelectedMonth("");
        setSelectedYear("");
        setSelectedRangeId("");
        setCreateError(null);
        setShowCreateModal(true);
        setLoadingConfig(true);
        try {
            const ranges = await payrollNumberingRangeApi.getAll();
            const activeRanges = ranges.filter((r) => r.is_active && r.type === 'payroll');
            setNumberingRanges(activeRanges);
            if (activeRanges.length === 0) {
                setCreateError("No hay rangos de numeración configurados. Configure primero en Configuración FE.");
            } else if (activeRanges.length === 1) {
                setSelectedRangeId(String(activeRanges[0].id));
            }
        } catch {
            setCreateError("Error al cargar los rangos de numeración.");
        } finally {
            setLoadingConfig(false);
        }
    };

    const selectedRange = numberingRanges.find((r) => String(r.id) === selectedRangeId) ?? null;

    const handleCreate = async () => {
        if (!selectedMonth || !selectedYear) {
            setCreateError("Debe seleccionar mes y año.");
            return;
        }
        if (!selectedRange) {
            setCreateError("Debe seleccionar un rango de numeración.");
            return;
        }
        setCreateError(null);

        const month = parseInt(selectedMonth);
        const year = parseInt(selectedYear);
        const lastDay = getLastDayOfMonth(year, month);
        const pad = (n: number) => String(n).padStart(2, "0");

        const settlementStart = `${year}-${pad(month)}-01`;
        const settlementEnd = `${year}-${pad(month)}-${pad(lastDay)}`;
        const issueDate = format(new Date(), "yyyy-MM-dd");
        const nextConsecutive = selectedRange.current_consecutive + 1;

        try {
            setCreating(true);
            await payrollApi.create({
                settlement_start_date: settlementStart,
                settlement_end_date: settlementEnd,
                issue_date: issueDate,
                numbering_range_id: selectedRange.id,
            });
            toast({
                title: "Nómina creada",
                description: `Emisión de nómina ${selectedRange.prefix}-${String(nextConsecutive).padStart(4, "0")} para ${MONTHS[month - 1].label} ${year} creada exitosamente.`,
            });
            setShowCreateModal(false);
            loadData();
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || "Error al crear la nómina.";
            setCreateError(msg);
        } finally {
            setCreating(false);
        }
    };

    const getMonthLabel = (dateString: string): string => {
        const raw = dateString.split("T")[0];
        const date = new Date(raw + "T12:00:00");
        return format(date, "MMMM yyyy", { locale: es });
    };

    const getNumeracion = (payroll: PayrollData): string => {
        if (payroll.prefix && payroll.number !== null) {
            return `${payroll.prefix}-${String(payroll.number).padStart(4, "0")}`;
        }
        return payroll.number !== null ? String(payroll.number) : "-";
    };

    const stats = useMemo(() => {
        const totalEmployees = payrolls.reduce((sum, p) => sum + p.employees_count, 0);
        const totalIssued = payrolls.reduce((sum, p) => sum + p.issued_count, 0);
        const totalRejected = payrolls.reduce((sum, p) => sum + p.rejected_count, 0);
        const drafts = payrolls.filter((p) => p.status === "draft" || p.status === "in_progress").length;
        return { totalEmployees, totalIssued, totalRejected, drafts };
    }, [payrolls]);

    const filteredPayrolls = useMemo(() => {
        let result = payrolls;

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((p) => {
                const monthLabel = getMonthLabel(p.settlement_start_date).toLowerCase();
                const numeracion = getNumeracion(p).toLowerCase();
                return monthLabel.includes(q) || numeracion.includes(q);
            });
        }

        // Status filter
        if (statusFilter !== "all") {
            result = result.filter((p) => p.status === statusFilter);
        }

        // Date filter
        if (dateFilter !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let fromDate: Date | null = null;
            let toDate: Date | null = null;

            switch (dateFilter) {
                case "hoy":
                    fromDate = new Date(today);
                    toDate = new Date(today);
                    toDate.setHours(23, 59, 59, 999);
                    break;
                case "ayer": {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    fromDate = yesterday;
                    toDate = new Date(yesterday);
                    toDate.setHours(23, 59, 59, 999);
                    break;
                }
                case "7dias":
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 7);
                    toDate = new Date();
                    break;
                case "30dias":
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 30);
                    toDate = new Date();
                    break;
                case "estemes":
                    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    toDate = new Date();
                    break;
                case "personalizado":
                    if (customDateFrom) fromDate = new Date(customDateFrom + "T00:00:00");
                    if (customDateTo) toDate = new Date(customDateTo + "T23:59:59");
                    break;
            }

            if (fromDate || toDate) {
                result = result.filter((p) => {
                    const issueDate = new Date(p.issue_date.split("T")[0] + "T12:00:00");
                    if (fromDate && issueDate < fromDate) return false;
                    if (toDate && issueDate > toDate) return false;
                    return true;
                });
            }
        }

        return result;
    }, [payrolls, search, statusFilter, dateFilter, customDateFrom, customDateTo]);

    return (
        <AppLayout title="Nómina Electrónica">
            <Head title="Nómina Electrónica" />

            <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="max-w-[1400px] mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                                    <FileText className="h-5 w-5 text-[#2463eb]" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-foreground">Nóminas Electrónicas</h1>
                                    <p className="text-sm text-muted-foreground">Gestiona las emisiones de nómina electrónica</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                {payrolls.length} nóminas
                            </Badge>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-blue-500/15 p-2 rounded-lg">
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Nóminas</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">{payrolls.length}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Emisiones registradas</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-emerald-500/15 p-2 rounded-lg">
                                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Emitidos</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">{stats.totalIssued}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Documentos emitidos</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-amber-500/15 p-2 rounded-lg">
                                            <Clock className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Pendientes</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-600">{stats.drafts}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Borrador / En proceso</p>
                                </div>
                            </Card>
                            <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-red-500/15 p-2 rounded-lg">
                                            <XCircle className="h-5 w-5 text-red-600" />
                                        </div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Rechazados</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-red-600">{stats.totalRejected}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-[1400px] mx-auto px-4 py-6">
                    <Card className="shadow-xl border border-border p-0">
                        {/* Filter Bar */}
                        <div className="p-4 sm:p-6 pb-0">
                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por mes o numeración..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[160px]">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="draft">Borrador</SelectItem>
                                        <SelectItem value="in_progress">En proceso</SelectItem>
                                        <SelectItem value="issued">Emitida</SelectItem>
                                        <SelectItem value="cancelled">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterValue)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Fecha" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todas las fechas</SelectItem>
                                        <SelectItem value="hoy">Hoy</SelectItem>
                                        <SelectItem value="ayer">Ayer</SelectItem>
                                        <SelectItem value="7dias">7 Días Anteriores</SelectItem>
                                        <SelectItem value="30dias">30 Días Anteriores</SelectItem>
                                        <SelectItem value="estemes">Este Mes</SelectItem>
                                        <SelectItem value="personalizado">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>

                                {dateFilter === "personalizado" && (
                                    <>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full sm:w-[180px] h-10 justify-start text-left font-normal text-sm", !customDateFrom && "text-muted-foreground")}>
                                                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                    {customDateFrom ? new Date(customDateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DatePickerReport
                                                    selected={customDateFrom ? new Date(customDateFrom + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const y = date.getFullYear();
                                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                                            const d = String(date.getDate()).padStart(2, '0');
                                                            setCustomDateFrom(`${y}-${m}-${d}`);
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full sm:w-[180px] h-10 justify-start text-left font-normal text-sm", !customDateTo && "text-muted-foreground")}>
                                                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                    {customDateTo ? new Date(customDateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DatePickerReport
                                                    selected={customDateTo ? new Date(customDateTo + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const y = date.getFullYear();
                                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                                            const d = String(date.getDate()).padStart(2, '0');
                                                            setCustomDateTo(`${y}-${m}-${d}`);
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </>
                                )}

                                <Button
                                    onClick={openCreateModal}
                                    className="h-10 rounded-md px-3 gap-2 bg-[#2463eb] hover:bg-[#2463eb]/90 whitespace-nowrap"
                                >
                                    <Plus className="h-4 w-4" />
                                    Nueva emisión
                                </Button>
                            </div>
                        </div>

                        {loading ? (
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-center py-12 gap-2">
                                    <Spinner className="mr-2" />
                                    <span className="text-muted-foreground">Cargando nóminas...</span>
                                </div>
                            </CardContent>
                        ) : filteredPayrolls.length === 0 ? (
                            <CardContent className="pt-6">
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    {payrolls.length === 0 ? (
                                        <>
                                            <p>No hay emisiones de nómina registradas</p>
                                            <p className="text-sm mt-1">Crea una nueva emisión para comenzar</p>
                                        </>
                                    ) : (
                                        <>
                                            <p>No se encontraron resultados</p>
                                            <p className="text-sm mt-1">Intenta ajustar los filtros de búsqueda</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        ) : (
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 px-4">Mes</TableHead>
                                            <TableHead className="h-12 px-4">Numeración</TableHead>
                                            <TableHead className="h-12 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Users className="h-4 w-4" />
                                                    Empleados
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                                    Emitidos
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <XCircle className="h-4 w-4 text-red-600" />
                                                    Rechazados
                                                </div>
                                            </TableHead>
                                            <TableHead className="h-12 px-4">Estado</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPayrolls.map((payroll) => {
                                            const statusConfig =
                                                STATUS_CONFIG[payroll.status] || STATUS_CONFIG.draft;
                                            return (
                                                <TableRow key={payroll.id}>
                                                    <TableCell className="p-4 font-medium capitalize">
                                                        {getMonthLabel(payroll.settlement_start_date)}
                                                    </TableCell>
                                                    <TableCell className="p-4 font-mono text-sm">
                                                        {getNumeracion(payroll)}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-center">
                                                        <span className="font-semibold">{payroll.employees_count}</span>
                                                    </TableCell>
                                                    <TableCell className="p-4 text-center">
                                                        <span className="font-semibold text-emerald-600">{payroll.issued_count}</span>
                                                    </TableCell>
                                                    <TableCell className="p-4 text-center">
                                                        <span className="font-semibold text-red-600">{payroll.rejected_count}</span>
                                                    </TableCell>
                                                    <TableCell className="p-4">
                                                        <Badge className={`${statusConfig.className} border`}>
                                                            {statusConfig.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.visit(`/admin/payroll/${payroll.id}`)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Ver detalle
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Nueva emisión de nómina</DialogTitle>
                        <DialogDescription>
                            Selecciona el periodo y rango de numeración
                        </DialogDescription>
                    </DialogHeader>

                    {loadingConfig ? (
                        <div className="flex items-center justify-center py-8 gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Cargando configuración...</span>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 py-2">
                                {createError && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{createError}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label>Periodo a emitir *</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Mes" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {MONTHS.map((m) => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Año" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {getYearOptions().map((y) => (
                                                    <SelectItem key={y} value={y}>
                                                        {y}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Rango de numeración */}
                                {numberingRanges.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Rango de numeración *</Label>
                                        {numberingRanges.length === 1 ? (
                                            <div className="rounded-md border bg-muted/50 p-3">
                                                <span className="font-semibold">{numberingRanges[0].name}</span>
                                                <span className="text-muted-foreground ml-2">({numberingRanges[0].prefix})</span>
                                            </div>
                                        ) : (
                                            <Select value={selectedRangeId} onValueChange={setSelectedRangeId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar rango" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card z-50">
                                                    {numberingRanges.map((r) => (
                                                        <SelectItem key={r.id} value={String(r.id)}>
                                                            {r.name} ({r.prefix})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                )}

                                {/* Numeración info */}
                                {selectedRange && (
                                    <div className="space-y-2">
                                        <Label>Numeración</Label>
                                        <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Prefijo</span>
                                                <span className="font-mono font-semibold">{selectedRange.prefix}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">Siguiente consecutivo</span>
                                                <span className="font-mono font-semibold text-primary">
                                                    {selectedRange.prefix}-{String(selectedRange.current_consecutive + 1).padStart(4, "0")}
                                                </span>
                                            </div>
                                            {selectedRange.consecutive_end && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">Rango hasta</span>
                                                    <span className="font-mono text-sm">{selectedRange.consecutive_end}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={creating}
                                >
                                    Cancelar
                                </Button>
                                <Button onClick={handleCreate} disabled={creating || !selectedRange}>
                                    {creating ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                    )}
                                    Crear nómina
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
