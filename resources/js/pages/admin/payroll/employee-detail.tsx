import { useState, useEffect, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    payrollEmployeeApi,
    type PayrollData,
    type PayrollEmployeeData,
    type PayrollHistoryItem,
    type BranchUserData,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
    ArrowLeft,
    AlertCircle,
    DollarSign,
    Briefcase,
    FileText,
    CalendarDays,
    CheckCircle,
    XCircle,
    Clock,
    Mail,
    Phone,
    MapPin,
    User,
    FileDown,
    ExternalLink,
    Info,
    Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { UserCommissionsView } from "@/components/user/UserCommissionsView";

const detailTabs = [
    { id: "info", label: "Información", icon: Info },
    { id: "payroll", label: "Nómina Electrónica", icon: Receipt },
    { id: "commissions", label: "Comisiones", icon: DollarSign },
];

export default function EmployeeDetail() {
    const { payrollId, userId } = usePage<{ payrollId: number; userId: number }>().props;

    const [activeTab, setActiveTab] = useState("info");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payroll, setPayroll] = useState<PayrollData | null>(null);
    const [employee, setEmployee] = useState<BranchUserData | null>(null);
    const [payrollEmployee, setPayrollEmployee] = useState<PayrollEmployeeData | null>(null);
    const [emissionHistory, setEmissionHistory] = useState<PayrollHistoryItem[]>([]);
    const [statusFilter, setStatusFilter] = useState<"all" | "emitted" | "annulled">("all");
    const [datePreset, setDatePreset] = useState("all");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    useEffect(() => {
        loadData();
    }, [payrollId, userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await payrollEmployeeApi.getDetail(payrollId, userId);
            setPayroll(data.payroll);
            setEmployee(data.employee);
            setPayrollEmployee(data.payroll_employee);
            setEmissionHistory(data.payroll_history ?? []);
        } catch (err: any) {
            setError(err?.message || "Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const employeeName = useMemo(() => {
        if (!employee) return "";
        return employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    }, [employee]);

    const issuedCount = useMemo(() => emissionHistory.filter((h: PayrollHistoryItem) => h.accepted).length, [emissionHistory]);

    const getDateRange = (preset: string): { from: string; to: string } | null => {
        if (preset === "all") return null;
        const now = new Date();
        const to = now.toISOString().split("T")[0];
        if (preset === "last_15_days") {
            const from = new Date(now);
            from.setDate(from.getDate() - 15);
            return { from: from.toISOString().split("T")[0], to };
        }
        if (preset === "current_month") {
            const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
            return { from, to };
        }
        if (preset === "previous_month") {
            const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
            return { from, to: lastDay };
        }
        if (preset === "custom") {
            if (!customFrom && !customTo) return null;
            return { from: customFrom || "1900-01-01", to: customTo || "2099-12-31" };
        }
        return null;
    };

    const filteredHistory = useMemo(() => {
        let filtered = emissionHistory;
        if (statusFilter === "emitted") filtered = filtered.filter((h) => h.accepted && !h.annulled);
        if (statusFilter === "annulled") filtered = filtered.filter((h) => h.annulled);
        const range = getDateRange(datePreset);
        if (range) {
            filtered = filtered.filter((h) => {
                const date = (h.sent_at || h.payroll?.settlement_start_date || "").split("T")[0];
                if (!date) return true;
                if (date < range.from) return false;
                if (date > range.to) return false;
                return true;
            });
        }
        return filtered;
    }, [emissionHistory, statusFilter, datePreset, customFrom, customTo]);

    const getMonthLabel = (dateString: string): string => {
        const raw = dateString.split("T")[0];
        const date = new Date(raw + "T12:00:00");
        return format(date, "MMMM yyyy", { locale: es });
    };

    const getInitials = (name: string): string => {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.charAt(0).toUpperCase();
    };

    const getEmissionNumeracion = (item: EmissionHistoryItem): string => {
        if (item.number) return item.number;
        // Fallback to payroll batch number
        const p = item.payroll_employee?.payroll;
        if (!p) return "-";
        if (p.prefix && p.number !== null) {
            return `${p.prefix}-${String(p.number).padStart(4, "0")}`;
        }
        return p.number !== null ? String(p.number) : "-";
    };

    const getEmissionPeriod = (item: EmissionHistoryItem): string => {
        const p = item.payroll_employee?.payroll;
        if (!p) return "-";
        const start = p.settlement_start_date.split("T")[0];
        const end = p.settlement_end_date.split("T")[0];
        return `${start} — ${end}`;
    };

    const getEmissionStatus = (item: EmissionHistoryItem) => {
        if (item.is_valid) {
            return (
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15 border">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Emitida
                </Badge>
            );
        }
        if (item.status_message) {
            return (
                <Badge className="bg-red-500/15 text-red-700 border-red-500/20 hover:bg-red-500/15 border">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazada
                </Badge>
            );
        }
        if (item.sent_at) {
            return (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15 border">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendiente
                </Badge>
            );
        }
        return (
            <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted border">
                <Clock className="h-3 w-3 mr-1" />
                Borrador
            </Badge>
        );
    };

    if (loading) {
        return (
            <AppLayout title="Detalle Empleado">
                <Head title="Detalle Empleado" />
                <div className="flex items-center justify-center py-20 gap-2">
                    <Spinner className="mr-2" />
                    <span className="text-muted-foreground">Cargando datos del empleado...</span>
                </div>
            </AppLayout>
        );
    }

    if (error || !payroll || !employee || !payrollEmployee) {
        return (
            <AppLayout title="Detalle Empleado">
                <Head title="Detalle Empleado" />
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error || "No se encontraron los datos."}</AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => router.visit(`/admin/payroll/${payrollId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Detalle Empleado - Nómina">
            <Head title={`${employeeName} - Detalle`} />

            <div className="-mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6 min-h-screen bg-background">
                {/* Sticky Header */}
                <header className="bg-card border-b border-border sticky top-14 z-10">
                    <div className="max-w-[1400px] mx-auto px-4">
                        {/* Row 1: Back + Avatar + Name */}
                        <div className="flex items-center gap-3 py-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => router.visit(`/admin/payroll/${payrollId}`)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>

                            <Avatar className="h-10 w-10 flex-shrink-0 bg-primary">
                                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                                    {getInitials(employeeName)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-sm sm:text-base font-bold text-foreground capitalize truncate">
                                        {employeeName}
                                    </h1>
                                    <Badge variant="default" className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0">
                                        ACTIVO
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {employee.occupation || "Empleado"} — {payroll.branch?.name || "Sede"}
                                </p>
                            </div>
                        </div>

                        {/* Row 2: Metrics bar */}
                        <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto hide-scrollbar">
                            <div className="flex items-center gap-0 py-2 flex-shrink-0">
                                <div className="flex items-center gap-1.5 pr-5">
                                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground leading-none">Período</p>
                                        <p className="text-sm font-bold capitalize">
                                            {getMonthLabel(payroll.settlement_start_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                                    <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground leading-none">Salario</p>
                                        <p className="text-sm font-bold">
                                            {formatCurrency(Number(payrollEmployee.salary))}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground leading-none">Nóminas emitidas</p>
                                        <p className="text-sm font-bold">{issuedCount}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-[10px] text-muted-foreground leading-none">Cargo</p>
                                        <p className="text-sm font-bold">{employee.occupation || "Sin asignar"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs row */}
                    <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
                        <nav className="flex items-center bg-muted/30 rounded-lg p-1 overflow-x-auto hide-scrollbar">
                            {detailTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1
                                            ${isActive
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                            }
                                        `}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </header>

                {/* Tab Content */}
                <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4">
                    {/* Información tab */}
                    {activeTab === "info" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardContent className="pt-6 pb-6">
                                    <h3 className="text-sm font-semibold text-foreground mb-4">Información del empleado</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Tipo documento</span>
                                            <span className="font-medium">{employee.document_type || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Nro. identificación</span>
                                            <span className="font-medium font-mono">{employee.document_id || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">País</span>
                                            <span className="font-medium">{employee.country_name || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Ciudad</span>
                                            <span className="font-medium">{employee.city_name || employee.state_name || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Dirección</span>
                                            <span className="font-medium">{employee.address || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Teléfono</span>
                                            <span className="font-medium">{employee.phone || "-"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Correo electrónico</span>
                                            <span className="font-medium">{employee.email || "-"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6 pb-6">
                                    <h3 className="text-sm font-semibold text-foreground mb-4">Información de nómina</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Fecha emisión</span>
                                            <span className="font-medium">{payroll.issue_date.split("T")[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Inicio liquidación</span>
                                            <span className="font-medium">{payroll.settlement_start_date.split("T")[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Fin liquidación</span>
                                            <span className="font-medium">{payroll.settlement_end_date.split("T")[0]}</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex items-center gap-3 text-sm">
                                            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Total devengados</span>
                                            <span className="font-medium text-emerald-600">
                                                {formatCurrency(Number(payrollEmployee.accrued_total))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Total deducciones</span>
                                            <span className="font-medium text-red-600">
                                                {formatCurrency(Number(payrollEmployee.deductions_total))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="text-muted-foreground w-40 shrink-0">Neto a pagar</span>
                                            <span className="font-bold text-lg">
                                                {formatCurrency(Number(payrollEmployee.total))}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Nómina Electrónica tab */}
                    {activeTab === "payroll" && (
                        <Card>
                            <CardContent className="p-0">
                                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
                                    <div className="flex items-center gap-2">
                                        {([
                                            { key: "all", label: "Todas" },
                                            { key: "emitted", label: "Emitidas" },
                                            { key: "annulled", label: "Anuladas" },
                                        ] as const).map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => setStatusFilter(opt.key)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                                    statusFilter === opt.key
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <div className="space-y-1">
                                            <span className="text-xs font-medium text-muted-foreground">Rango</span>
                                            <Select value={datePreset} onValueChange={setDatePreset}>
                                                <SelectTrigger className="h-9 text-sm w-[180px]">
                                                    <SelectValue placeholder="Seleccionar rango" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card z-50">
                                                    <SelectItem value="all">Todas las fechas</SelectItem>
                                                    <SelectItem value="last_15_days">Últimos 15 días</SelectItem>
                                                    <SelectItem value="current_month">Mes actual</SelectItem>
                                                    <SelectItem value="previous_month">Mes anterior</SelectItem>
                                                    <SelectItem value="custom">Personalizado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {datePreset === "custom" && (
                                            <>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Fecha Inicial</span>
                                                    <input
                                                        type="date"
                                                        value={customFrom}
                                                        onChange={(e) => setCustomFrom(e.target.value)}
                                                        className="flex h-9 w-[160px] rounded-md border border-input bg-background px-3 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs text-muted-foreground">Fecha Final</span>
                                                    <input
                                                        type="date"
                                                        value={customTo}
                                                        onChange={(e) => setCustomTo(e.target.value)}
                                                        className="flex h-9 w-[160px] rounded-md border border-input bg-background px-3 text-sm"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 px-4">Nómina</TableHead>
                                            <TableHead className="h-12 px-4">Período</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Ingresos</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Deducciones</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Pago total</TableHead>
                                            <TableHead className="h-12 px-4">Estado</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="p-4 text-center text-muted-foreground">
                                                    {statusFilter === "all" ? "No hay nóminas registradas para este empleado" : "No hay nóminas con este estado"}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredHistory.map((item) => {
                                                const isAnnulment = item.annulled;
                                                return (
                                                    <TableRow key={item.id} className={isAnnulment ? "bg-orange-500/10/50" : ""}>
                                                        <TableCell className="p-4 font-mono text-sm">
                                                            {isAnnulment
                                                                ? <span className="text-orange-600">Nota de ajuste</span>
                                                                : getHistoryNumeracion(item)
                                                            }
                                                        </TableCell>
                                                        <TableCell className="p-4 text-sm">
                                                            {isAnnulment
                                                                ? (item.annulled_at ? item.annulled_at.split("T")[0] : "-")
                                                                : getHistoryPeriod(item)
                                                            }
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right font-mono text-emerald-600">
                                                            {isAnnulment ? "-" : formatCurrency(Number(item.accrued_total ?? 0))}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right font-mono text-red-600">
                                                            {isAnnulment ? "-" : formatCurrency(Number(item.deductions_total ?? 0))}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right font-mono font-semibold">
                                                            {isAnnulment ? "-" : formatCurrency(Number(item.total ?? 0))}
                                                        </TableCell>
                                                        <TableCell className="p-4">
                                                            {isAnnulment ? (
                                                                <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/20 hover:bg-orange-500/15 border">
                                                                    <XCircle className="h-3 w-3 mr-1" />
                                                                    Anulada
                                                                </Badge>
                                                            ) : (
                                                                getHistoryStatus(item)
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {item.accepted && item.has_pdf && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                        onClick={() => window.open(`/api/electronic-invoicing/payrolls/employees/${item.id}/pdf`, '_blank')}
                                                                        title="Ver PDF"
                                                                    >
                                                                        <FileDown className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {item.accepted && item.qr_link && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                                                        onClick={() => window.open(item.qr_link!, '_blank')}
                                                                        title="Ver en DIAN"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Button>
                                                                )}
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
                    )}

                    {/* Comisiones tab */}
                    {activeTab === "commissions" && (
                        <UserCommissionsView userId={userId} />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
