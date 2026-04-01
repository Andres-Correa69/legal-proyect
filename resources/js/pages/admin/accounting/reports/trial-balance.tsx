import { Head } from "@inertiajs/react";
import { useState, useMemo } from "react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { TrialBalanceRow } from "@/types";
import { ArrowLeft, CalendarIcon, Download, FileSpreadsheet, FileText, Scale, Search } from "lucide-react";
import { router } from "@inertiajs/react";

export default function TrialBalancePage() {
    const { toast } = useToast();

    const [datePreset, setDatePreset] = useState<string>('');
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [rows, setRows] = useState<TrialBalanceRow[]>([]);
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

    const totalDebitMovement = useMemo(() => rows.reduce((sum, row) => sum + row.debit_movement, 0), [rows]);
    const totalCreditMovement = useMemo(() => rows.reduce((sum, row) => sum + row.credit_movement, 0), [rows]);
    const totalPreviousBalance = useMemo(() => rows.reduce((sum, row) => sum + row.previous_balance, 0), [rows]);
    const totalBalance = useMemo(() => rows.reduce((sum, row) => sum + row.total_balance, 0), [rows]);
    const totalFinalBalance = useMemo(() => rows.reduce((sum, row) => sum + row.final_balance, 0), [rows]);

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
            const data = await accountingApi.reports.trialBalance(dateFrom, dateTo);
            setRows(data);
            setHasSearched(true);
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el balance de comprobacion";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        setExporting(true);
        try {
            const blob = await accountingApi.reports.exportReport({
                format,
                report_type: 'trial-balance',
                date_from: dateFrom,
                date_to: dateTo,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `balance-comprobacion.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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
            <Head title="Balance de Comprobacion" />

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
                                <Scale className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Balance de Comprobacion</h1>
                                <p className="text-sm text-muted-foreground">Resumen de movimientos y saldos de todas las cuentas</p>
                            </div>
                            {hasSearched && rows.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="gap-2" disabled={exporting}>
                                            {exporting ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                                            Exportar
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-card z-50">
                                        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                                            <FileText className="h-4 w-4" />
                                            Exportar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                                            <FileSpreadsheet className="h-4 w-4" />
                                            Exportar Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Stats Cards */}
                        {hasSearched && rows.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Scale className="h-4 w-4 text-[#2463eb]" />
                                        <span className="text-xs text-muted-foreground">Cuentas</span>
                                    </div>
                                    <p className="text-lg font-semibold">{rows.length}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Debitos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalDebitMovement)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-red-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Creditos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalCreditMovement)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                                        <span className="text-xs text-muted-foreground">Saldo Final</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(totalFinalBalance)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters + Table */}
                <Card className="shadow-xl border border-border">
                    <CardContent className="p-4">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row items-end gap-3 mb-4">
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

                        {/* Results */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                    <Spinner className="h-8 w-8" />
                                    <p className="text-sm text-muted-foreground">Consultando balance...</p>
                                </div>
                            </div>
                        ) : hasSearched ? (
                            rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <Scale className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No se encontraron movimientos en el periodo seleccionado
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto -mx-4 -mb-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="h-12 px-4">Codigo</TableHead>
                                                <TableHead className="h-12 px-4">Nombre Cuenta</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Saldo Anterior</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Movimiento Debito</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Movimiento Credito</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Saldo Final</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.account_id}>
                                                    <TableCell className="p-4 font-mono text-sm">
                                                        {row.account_code}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm">
                                                        {row.account_name}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right">
                                                        {row.previous_balance !== 0 ? formatCurrency(row.previous_balance) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right">
                                                        {row.debit_movement > 0 ? formatCurrency(row.debit_movement) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right">
                                                        {row.credit_movement > 0 ? formatCurrency(row.credit_movement) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right font-medium">
                                                        {row.final_balance !== 0 ? formatCurrency(row.final_balance) : "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Totals Row */}
                                            <TableRow className="bg-muted/50 font-semibold border-t-2">
                                                <TableCell className="p-4" colSpan={2}>
                                                    Totales
                                                </TableCell>
                                                <TableCell className="p-4 text-right">
                                                    {formatCurrency(totalPreviousBalance)}
                                                </TableCell>
                                                <TableCell className="p-4 text-right">
                                                    {formatCurrency(totalDebitMovement)}
                                                </TableCell>
                                                <TableCell className="p-4 text-right">
                                                    {formatCurrency(totalCreditMovement)}
                                                </TableCell>
                                                <TableCell className="p-4 text-right">
                                                    {formatCurrency(totalFinalBalance)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Scale className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Seleccione un rango de fechas y presione "Consultar" para ver el balance
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Balance Check */}
                {hasSearched && rows.length > 0 && (
                    <div className={`text-center text-sm font-medium py-2 rounded-lg ${
                        Math.abs(totalDebitMovement - totalCreditMovement) < 0.01
                            ? "bg-green-500/10 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-red-500/10 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}>
                        {Math.abs(totalDebitMovement - totalCreditMovement) < 0.01
                            ? "El balance esta cuadrado: Debitos = Creditos"
                            : `Diferencia: ${formatCurrency(Math.abs(totalDebitMovement - totalCreditMovement))} - El balance NO cuadra`
                        }
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
