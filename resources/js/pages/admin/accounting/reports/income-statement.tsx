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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { IncomeStatementSection } from "@/types";
import { ArrowLeft, CalendarIcon, TrendingUp, Search, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function IncomeStatementPage() {
    const { toast } = useToast();

    const [datePreset, setDatePreset] = useState<string>('');
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [sections, setSections] = useState<IncomeStatementSection[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Calculate net income/loss
    const ingresos = sections.find((s) => s.title.toLowerCase().includes("ingreso"));
    const costos = sections.find(
        (s) => s.title.toLowerCase().includes("costo") || s.title.toLowerCase().includes("venta")
    );
    const gastos = sections.find((s) => s.title.toLowerCase().includes("gasto"));

    const totalIngresos = ingresos?.total ?? 0;
    const totalCostos = costos?.total ?? 0;
    const totalGastos = gastos?.total ?? 0;
    const netResult = totalIngresos - totalCostos - totalGastos;

    const handleDatePreset = (value: string) => {
        setDatePreset(value);
        const today = new Date();
        const bogota = (d: Date) => {
            const parts = d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
            return parts; // returns YYYY-MM-DD
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
        // 'custom' → leave dates as is, user picks manually
    };

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
            const data = await accountingApi.reports.incomeStatement(dateFrom, dateTo);
            setSections(data);
            setHasSearched(true);
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el estado de resultados";
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
                report_type: "income-statement",
                date_from: dateFrom,
                date_to: dateTo,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `estado-resultados-${dateFrom}-${dateTo}.${format === "pdf" ? "pdf" : "xlsx"}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
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
            <Head title="Estado de Resultados Integral" />

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
                                <TrendingUp className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Estado de Resultados Integral</h1>
                                <p className="text-sm text-muted-foreground">Ingresos, costos y gastos del periodo</p>
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

                        {/* Stats Cards */}
                        {hasSearched && sections.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500/100" />
                                        <span className="text-xs text-muted-foreground">Ingresos</span>
                                    </div>
                                    <p className="text-sm font-semibold">{formatCurrency(totalIngresos)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-red-500/100" />
                                        <span className="text-xs text-muted-foreground">Costos</span>
                                    </div>
                                    <p className="text-sm font-semibold">{formatCurrency(totalCostos)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                                        <span className="text-xs text-muted-foreground">Gastos</span>
                                    </div>
                                    <p className="text-sm font-semibold">{formatCurrency(totalGastos)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                                        <span className="text-xs text-muted-foreground">Resultado Neto</span>
                                    </div>
                                    <p className={`text-sm font-semibold ${netResult >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(Math.abs(netResult))}
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
                            <p className="text-sm text-muted-foreground">Consultando estado de resultados...</p>
                        </div>
                    </div>
                ) : hasSearched ? (
                    sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
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
                                        <h2 className="text-base font-bold">Estado de Resultados Integral</h2>
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

                                    {/* Net Result */}
                                    <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${
                                        netResult >= 0
                                            ? "bg-green-500/10 dark:bg-green-950"
                                            : "bg-red-500/10 dark:bg-red-950"
                                    }`}>
                                        <span className={`text-base font-bold ${
                                            netResult >= 0
                                                ? "text-green-700 dark:text-green-300"
                                                : "text-red-700 dark:text-red-300"
                                        }`}>
                                            {netResult >= 0 ? "Utilidad Neta" : "Perdida Neta"}
                                        </span>
                                        <span className={`text-base font-bold tabular-nums ${
                                            netResult >= 0
                                                ? "text-green-700 dark:text-green-300"
                                                : "text-red-700 dark:text-red-300"
                                        }`}>
                                            {formatCurrency(Math.abs(netResult))}
                                        </span>
                                    </div>

                                    {/* Breakdown */}
                                    <div className="text-xs text-muted-foreground space-y-1 px-2">
                                        <p>Ingresos: {formatCurrency(totalIngresos)}</p>
                                        <p>(-) Costos de Venta: {formatCurrency(totalCostos)}</p>
                                        <p>(-) Gastos Operacionales: {formatCurrency(totalGastos)}</p>
                                        <p className="font-medium text-foreground pt-1">
                                            = {netResult >= 0 ? "Utilidad" : "Perdida"} Neta: {formatCurrency(Math.abs(netResult))}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Seleccione un rango de fechas y presione "Consultar"
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
