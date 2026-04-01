import { Head } from "@inertiajs/react";
import { useState, useMemo } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { JournalEntry } from "@/types";
import {
    ArrowLeft,
    CalendarIcon,
    FileText,
    Search,
    ChevronDown,
    ChevronRight,
    Download,
    FileSpreadsheet,
} from "lucide-react";

export default function JournalBookPage() {
    const { toast } = useToast();

    const [datePreset, setDatePreset] = useState<string>('');
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

    const stats = useMemo(() => ({
        total: entries.length,
        totalDebit: entries.reduce((sum, e) => sum + Number(e.total_debit || 0), 0),
        totalCredit: entries.reduce((sum, e) => sum + Number(e.total_credit || 0), 0),
    }), [entries]);

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

    const toggleEntry = (entryId: number) => {
        setExpandedEntries((prev) => {
            const next = new Set(prev);
            if (next.has(entryId)) {
                next.delete(entryId);
            } else {
                next.add(entryId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setExpandedEntries(new Set(entries.map((e) => e.id)));
    };

    const collapseAll = () => {
        setExpandedEntries(new Set());
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
            const data = await accountingApi.reports.journalBook(dateFrom, dateTo);
            setEntries(data);
            setHasSearched(true);
            // Auto-expand all entries on load
            setExpandedEntries(new Set(data.map((e) => e.id)));
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el libro diario";
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
                report_type: "journal-book",
                date_from: dateFrom,
                date_to: dateTo,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `libro-diario-${dateFrom}-${dateTo}.${format === "pdf" ? "pdf" : "xlsx"}`;
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
            <Head title="Libro Diario" />

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
                                <FileText className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Libro Diario</h1>
                                <p className="text-sm text-muted-foreground">
                                    Registro cronologico de transacciones contables
                                </p>
                            </div>
                            {hasSearched && entries.length > 0 && (
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
                        {hasSearched && entries.length > 0 && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="h-4 w-4 text-[#2463eb]" />
                                        <span className="text-xs text-muted-foreground">Total Registros</span>
                                    </div>
                                    <p className="text-lg font-semibold">{stats.total}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="h-2 w-2 rounded-full bg-green-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Debito</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.totalDebit)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="h-2 w-2 rounded-full bg-red-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Credito</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.totalCredit)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="h-2 w-2 rounded-full bg-amber-500/100" />
                                        <span className="text-xs text-muted-foreground">Registros Expandidos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{expandedEntries.size}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters + Results */}
                <Card className="shadow-xl border border-border">
                    <CardContent className="p-4 sm:p-6">
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row items-end gap-3 mb-6">
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
                                    <p className="text-sm text-muted-foreground">Consultando libro diario...</p>
                                </div>
                            </div>
                        ) : hasSearched ? (
                            entries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No se encontraron registros contables en el periodo seleccionado
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Expand/Collapse Controls */}
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-muted-foreground">
                                            {entries.length} registro{entries.length !== 1 ? "s" : ""} encontrado{entries.length !== 1 ? "s" : ""}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={expandAll} className="h-7 text-xs">
                                                Expandir todo
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={collapseAll} className="h-7 text-xs">
                                                Colapsar todo
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Entries */}
                                    {entries.map((entry) => {
                                        const isExpanded = expandedEntries.has(entry.id);
                                        return (
                                            <Card key={entry.id} className="border shadow-sm">
                                                {/* Entry Header */}
                                                <button
                                                    className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
                                                    onClick={() => toggleEntry(entry.id)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold font-mono">
                                                                    {entry.entry_number}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {entry.date}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {entry.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4 flex-shrink-0 text-xs">
                                                        <span className="text-muted-foreground">
                                                            Debe: <span className="font-medium text-foreground">{formatCurrency(entry.total_debit)}</span>
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            Haber: <span className="font-medium text-foreground">{formatCurrency(entry.total_credit)}</span>
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Entry Lines */}
                                                {isExpanded && entry.lines && entry.lines.length > 0 && (
                                                    <CardContent className="p-0 border-t">
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="h-10 px-4 text-xs">Cuenta</TableHead>
                                                                        <TableHead className="h-10 px-4 text-xs text-right">Debito</TableHead>
                                                                        <TableHead className="h-10 px-4 text-xs text-right">Credito</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {entry.lines.map((line) => (
                                                                        <TableRow key={line.id}>
                                                                            <TableCell className="p-4 text-sm">
                                                                                <span className="font-mono text-xs mr-2">
                                                                                    {line.accounting_account?.code}
                                                                                </span>
                                                                                {line.accounting_account?.name}
                                                                                {line.description && (
                                                                                    <span className="text-xs text-muted-foreground ml-2">
                                                                                        ({line.description})
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell className="p-4 text-sm text-right">
                                                                                {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                                                                            </TableCell>
                                                                            <TableCell className="p-4 text-sm text-right">
                                                                                {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </CardContent>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Seleccione un rango de fechas y presione "Consultar" para ver los registros
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
