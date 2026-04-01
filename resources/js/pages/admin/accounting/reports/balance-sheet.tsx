import { Head } from "@inertiajs/react";
import { useState } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { BalanceSheetSection } from "@/types";
import {
    ArrowLeft,
    CalendarIcon,
    PieChart,
    Search,
    Download,
    FileText,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
} from "lucide-react";

export default function BalanceSheetPage() {
    const { toast } = useToast();

    const [datePreset, setDatePreset] = useState<string>('');
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sections, setSections] = useState<BalanceSheetSection[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleDatePreset = (value: string) => {
        setDatePreset(value);
        const today = new Date();
        const bogota = (d: Date) => {
            const parts = d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            return parts;
        };
        if (value === 'last_15_days') {
            const from = new Date(today);
            from.setDate(from.getDate() - 15);
            setDateFrom(bogota(from));
            setDateTo(bogota(today));
        } else if (value === 'current_month') {
            const from = new Date(today.getFullYear(), today.getMonth(), 1);
            setDateFrom(bogota(from));
            setDateTo(bogota(today));
        } else if (value === 'previous_month') {
            const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const to = new Date(today.getFullYear(), today.getMonth(), 0);
            setDateFrom(bogota(from));
            setDateTo(bogota(to));
        }
    };

    // Calculate totals
    const activos = sections.find(
        (s) => s.title.toLowerCase().includes("activo")
    );
    const pasivos = sections.find(
        (s) => s.title.toLowerCase().includes("pasivo")
    );
    const patrimonio = sections.find(
        (s) => s.title.toLowerCase().includes("patrimonio") || s.title.toLowerCase().includes("capital")
    );

    const totalActivos = activos?.total ?? 0;
    const totalPasivos = pasivos?.total ?? 0;
    const totalPatrimonio = patrimonio?.total ?? 0;
    const pasivosYPatrimonio = totalPasivos + totalPatrimonio;
    const isBalanced = Math.abs(totalActivos - pasivosYPatrimonio) < 0.01;

    const handleSearch = async () => {
        if (!dateFrom || !dateTo) {
            toast({
                title: "Fechas requeridas",
                description: "Seleccione la fecha inicial y final del periodo",
                variant: "destructive",
            });
            return;
        }

        if (dateFrom > dateTo) {
            toast({
                title: "Rango invalido",
                description: "La fecha inicial no puede ser mayor a la fecha final",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const data = await accountingApi.reports.balanceSheet(dateFrom, dateTo);
            setSections(data);
            setHasSearched(true);
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el estado de situacion financiera";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: "pdf" | "excel") => {
        setExporting(true);
        try {
            const blob = await accountingApi.reports.exportReport({
                format,
                report_type: "balance-sheet",
                date_from: dateFrom,
                date_to: dateTo,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `estado-situacion-financiera-${dateFrom}-${dateTo}.${format === "pdf" ? "pdf" : "xlsx"}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: "Exportado", description: `Reporte exportado en formato ${format.toUpperCase()}` });
        } catch (error: any) {
            const msg = error?.message || "Error al exportar el reporte";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Estado de Situacion Financiera" />

            <div className="space-y-6">
                {/* Header */}
                <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.visit("/admin/accounting/reports")}
                                className="h-8 w-8"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                                <PieChart className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Estado de Situacion Financiera</h1>
                                <p className="text-sm text-muted-foreground">
                                    Situacion financiera de la empresa en un periodo determinado
                                </p>
                            </div>
                            {hasSearched && sections.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                                            {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                            Exportar
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-card z-50">
                                        <DropdownMenuItem onClick={() => handleExport("pdf")}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Exportar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport("excel")}>
                                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                                            Exportar Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Stats cards */}
                        {hasSearched && sections.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <PieChart className="h-4 w-4 text-[#2463eb]" />
                                        <span className="text-xs text-muted-foreground">Activos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalActivos)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="h-2 w-2 rounded-full bg-red-500/100" />
                                        <span className="text-xs text-muted-foreground">Pasivos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalPasivos)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="h-2 w-2 rounded-full bg-green-500/100" />
                                        <span className="text-xs text-muted-foreground">Patrimonio</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalPatrimonio)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        {isBalanced ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-xs text-muted-foreground">Ecuacion</span>
                                    </div>
                                    <p className={`text-lg font-semibold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                                        {isBalanced ? "Cuadra" : "No Cuadra"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="shadow-xl border border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Rango</label>
                                <Select value={datePreset} onValueChange={handleDatePreset}>
                                    <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]">
                                        <SelectValue placeholder="Seleccionar rango" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="last_15_days">Últimos 15 días</SelectItem>
                                        <SelectItem value="current_month">Mes actual</SelectItem>
                                        <SelectItem value="previous_month">Mes anterior</SelectItem>
                                        <SelectItem value="custom">Personalizado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {datePreset === 'custom' && (
                                <>
                                    <div className="space-y-1 w-full sm:w-auto">
                                        <Label className="text-xs text-muted-foreground">Fecha Inicial</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("h-9 w-full sm:w-[180px] justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
                                                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                    {dateFrom ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DatePickerReport
                                                    selected={dateFrom ? new Date(dateFrom + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const y = date.getFullYear();
                                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                                            const d = String(date.getDate()).padStart(2, '0');
                                                            setDateFrom(`${y}-${m}-${d}`);
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-1 w-full sm:w-auto">
                                        <Label className="text-xs text-muted-foreground">Fecha Final</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("h-9 w-full sm:w-[180px] justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
                                                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                    {dateTo ? new Date(dateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DatePickerReport
                                                    selected={dateTo ? new Date(dateTo + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const y = date.getFullYear();
                                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                                            const d = String(date.getDate()).padStart(2, '0');
                                                            setDateTo(`${y}-${m}-${d}`);
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </>
                            )}
                            <Button onClick={handleSearch} size="sm" className="gap-2 h-9 w-full sm:w-auto" disabled={loading}>
                                {loading ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                                Consultar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">Consultando estado de situacion financiera...</p>
                        </div>
                    </div>
                ) : hasSearched ? (
                    sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <PieChart className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No se encontraron datos para el periodo seleccionado
                            </p>
                        </div>
                    ) : (
                        <Card className="border shadow-sm">
                            <CardContent className="p-4 sm:p-6">
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {/* Report Title */}
                                    <div className="text-center">
                                        <h2 className="text-base font-bold">Estado de Situacion Financiera</h2>
                                        <p className="text-xs text-muted-foreground">
                                            Del {dateFrom} al {dateTo}
                                        </p>
                                    </div>

                                    <Separator />

                                    {/* Sections */}
                                    {sections.map((section, sectionIndex) => (
                                        <div key={sectionIndex} className="space-y-2">
                                            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">
                                                {section.title}
                                            </h3>

                                            {/* Account Lines */}
                                            {section.accounts.map((account, accountIndex) => (
                                                <div
                                                    key={accountIndex}
                                                    className="flex justify-between items-center py-1 px-2 hover:bg-muted/30 rounded"
                                                >
                                                    <span className="text-sm">
                                                        <span className="font-mono text-xs text-muted-foreground mr-2">
                                                            {account.code}
                                                        </span>
                                                        {account.name}
                                                    </span>
                                                    <span className="text-sm font-medium tabular-nums">
                                                        {formatCurrency(account.amount)}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Section Total */}
                                            <div className="flex justify-between items-center py-2 px-2 border-t border-dashed mt-1">
                                                <span className="text-sm font-semibold">
                                                    Total {section.title}
                                                </span>
                                                <span className="text-sm font-bold tabular-nums">
                                                    {formatCurrency(section.total)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    <Separator className="my-4" />

                                    {/* Accounting Equation Verification */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center py-2 px-4 bg-muted/50 rounded-lg">
                                            <span className="text-sm font-bold">Total Activos</span>
                                            <span className="text-sm font-bold tabular-nums">
                                                {formatCurrency(totalActivos)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-4 bg-muted/50 rounded-lg">
                                            <span className="text-sm font-bold">Pasivos + Patrimonio</span>
                                            <span className="text-sm font-bold tabular-nums">
                                                {formatCurrency(pasivosYPatrimonio)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Balance Check */}
                                    <div className={`text-center text-sm font-medium py-3 px-4 rounded-lg ${
                                        isBalanced
                                            ? "bg-green-500/10 text-green-700 dark:bg-green-950 dark:text-green-300"
                                            : "bg-red-500/10 text-red-700 dark:bg-red-950 dark:text-red-300"
                                    }`}>
                                        {isBalanced
                                            ? "Ecuacion contable verificada: Activos = Pasivos + Patrimonio"
                                            : `Diferencia de ${formatCurrency(Math.abs(totalActivos - pasivosYPatrimonio))} - La ecuacion contable NO cuadra`
                                        }
                                    </div>

                                    {/* Summary */}
                                    <div className="text-xs text-muted-foreground space-y-1 px-2">
                                        <p>Activos: {formatCurrency(totalActivos)}</p>
                                        <p>Pasivos: {formatCurrency(totalPasivos)}</p>
                                        <p>Patrimonio: {formatCurrency(totalPatrimonio)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <PieChart className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Seleccione un rango de fechas y presione "Consultar"
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
