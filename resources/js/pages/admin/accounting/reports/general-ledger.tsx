import { Head } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
import type { AccountingAccount, GeneralLedgerRow, GeneralLedgerResponse } from "@/types";
import { ArrowLeft, BookOpen, CalendarIcon, Download, FileSpreadsheet, FileText as FileTextIcon, Search } from "lucide-react";

export default function GeneralLedgerPage() {
    const { toast } = useToast();

    const [leafAccounts, setLeafAccounts] = useState<AccountingAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [datePreset, setDatePreset] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [ledgerData, setLedgerData] = useState<GeneralLedgerResponse | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [exporting, setExporting] = useState(false);

    const rows = ledgerData?.movements ?? [];

    // Load leaf accounts
    useEffect(() => {
        const loadAccounts = async () => {
            setAccountsLoading(true);
            try {
                const data = await accountingApi.accounts.getLeaf();
                setLeafAccounts(data);
            } catch (error: any) {
                console.error("Error loading leaf accounts:", error);
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las cuentas",
                    variant: "destructive",
                });
            } finally {
                setAccountsLoading(false);
            }
        };
        loadAccounts();
    }, []);

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

    const selectedAccount = leafAccounts.find(
        (a) => a.id.toString() === selectedAccountId
    );

    const accountOptions = useMemo(() =>
        leafAccounts.map((a) => ({
            value: a.id.toString(),
            label: `${a.code} - ${a.name}`,
        })),
        [leafAccounts]
    );

    const stats = useMemo(() => {
        if (!ledgerData || !rows.length) return null;
        const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
        const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
        return {
            count: rows.length,
            totalDebit,
            totalCredit,
            previousBalance: ledgerData.previous_balance,
            finalBalance: ledgerData.final_balance,
        };
    }, [ledgerData, rows]);

    const handleSearch = async () => {
        if (!selectedAccountId) {
            toast({
                title: "Cuenta requerida",
                description: "Seleccione una cuenta contable",
                variant: "destructive",
            });
            return;
        }
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
            const data = await accountingApi.reports.generalLedger(
                parseInt(selectedAccountId),
                dateFrom,
                dateTo
            );
            setLedgerData(data);
            setHasSearched(true);
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el libro mayor";
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
                report_type: "general-ledger",
                date_from: dateFrom,
                date_to: dateTo,
                // account_id passed via the generic body
                ...(selectedAccountId ? { account_id: parseInt(selectedAccountId) } as any : {}),
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `libro-mayor.${format === "pdf" ? "pdf" : "xlsx"}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({
                title: "Exportado",
                description: `Reporte exportado en formato ${format === "pdf" ? "PDF" : "Excel"}`,
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "No se pudo exportar el reporte",
                variant: "destructive",
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Libro Mayor" />

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
                                <BookOpen className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Libro Mayor</h1>
                                <p className="text-sm text-muted-foreground">
                                    Movimientos detallados por cuenta contable
                                </p>
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
                                        <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 cursor-pointer">
                                            <FileTextIcon className="h-4 w-4" />
                                            Exportar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2 cursor-pointer">
                                            <FileSpreadsheet className="h-4 w-4" />
                                            Exportar Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>

                        {/* Stats Cards */}
                        {hasSearched && rows.length > 0 && stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BookOpen className="h-4 w-4 text-[#2463eb]" />
                                        <span className="text-xs text-muted-foreground">Movimientos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{stats.count}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Debitos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.totalDebit)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-red-500/100" />
                                        <span className="text-xs text-muted-foreground">Total Creditos</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.totalCredit)}</p>
                                </div>
                                <div className="bg-background rounded-lg border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                                        <span className="text-xs text-muted-foreground">Saldo Final</span>
                                    </div>
                                    <p className="text-lg font-semibold">{formatCurrency(stats.finalBalance)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="shadow-xl border border-border">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="space-y-1 flex-1 w-full sm:w-auto sm:min-w-[280px]">
                                <Label className="text-xs text-muted-foreground">Cuenta Contable</Label>
                                <Combobox
                                    options={accountOptions}
                                    value={selectedAccountId}
                                    onValueChange={setSelectedAccountId}
                                    placeholder="Seleccionar cuenta..."
                                    searchPlaceholder="Buscar por código o nombre..."
                                    emptyText="No se encontraron cuentas."
                                    loading={accountsLoading}
                                    className="h-9 text-sm"
                                />
                            </div>
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

                {/* Selected Account Info */}
                {hasSearched && selectedAccount && (
                    <div className="bg-muted/50 rounded-lg p-3 border">
                        <p className="text-sm font-semibold">
                            {selectedAccount.code} - {selectedAccount.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Tipo: {selectedAccount.type} | Naturaleza: {selectedAccount.nature === "debit" ? "Debito" : "Credito"}
                        </p>
                    </div>
                )}

                {/* Results Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">Consultando libro mayor...</p>
                        </div>
                    </div>
                ) : hasSearched ? (
                    <Card className="shadow-xl border border-border">
                        <CardContent className="p-0">
                            {rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                                    <p className="text-sm text-muted-foreground">
                                        No se encontraron movimientos para esta cuenta en el periodo seleccionado
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="h-12 px-4">Fecha</TableHead>
                                                <TableHead className="h-12 px-4">No. Registro</TableHead>
                                                <TableHead className="h-12 px-4">Descripcion</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Debito</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Credito</TableHead>
                                                <TableHead className="h-12 px-4 text-right">Saldo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* Saldo Anterior */}
                                            <TableRow className="bg-blue-500/10/50 dark:bg-blue-950/20">
                                                <TableCell colSpan={5} className="p-4 text-sm font-semibold text-right">
                                                    Saldo Anterior
                                                </TableCell>
                                                <TableCell className="p-4 text-sm text-right font-semibold">
                                                    {formatCurrency(ledgerData?.previous_balance ?? 0)}
                                                </TableCell>
                                            </TableRow>
                                            {rows.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="p-4 text-sm whitespace-nowrap">
                                                        {row.date}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm font-mono">
                                                        {row.entry_number}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm">
                                                        {row.description}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right">
                                                        {row.debit > 0 ? formatCurrency(row.debit) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right">
                                                        {row.credit > 0 ? formatCurrency(row.credit) : "-"}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-sm text-right font-medium">
                                                        {formatCurrency(row.balance)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {/* Saldo Final */}
                                            <TableRow className="bg-muted/50 border-t-2">
                                                <TableCell colSpan={5} className="p-4 text-sm font-semibold text-right">
                                                    Saldo Final
                                                </TableCell>
                                                <TableCell className={`p-4 text-sm text-right font-bold ${(ledgerData?.final_balance ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                    {formatCurrency(ledgerData?.final_balance ?? 0)}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Seleccione una cuenta, el rango de fechas y presione "Consultar"
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
