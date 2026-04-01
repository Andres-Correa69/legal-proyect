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
import { Combobox } from "@/components/ui/combobox";
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountSubledgerEntry, AccountingAccount } from "@/types";
import { ArrowLeft, CalendarIcon, FileSearch, Search, ChevronDown, ChevronRight, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function AccountSubledgerPage() {
    const { toast } = useToast();

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [datePreset, setDatePreset] = useState<string>("");
    const [codeFrom, setCodeFrom] = useState("");
    const [codeTo, setCodeTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [entries, setEntries] = useState<AccountSubledgerEntry[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [openAccounts, setOpenAccounts] = useState<Set<number>>(new Set());
    const [leafAccounts, setLeafAccounts] = useState<AccountingAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);

    // Load leaf accounts for autocomplete
    useEffect(() => {
        const loadAccounts = async () => {
            setAccountsLoading(true);
            try {
                const data = await accountingApi.accounts.getLeaf();
                setLeafAccounts(data);
            } catch {
                // Silently fail — user can still type manually
            } finally {
                setAccountsLoading(false);
            }
        };
        loadAccounts();
    }, []);

    const accountOptions = useMemo(() =>
        leafAccounts.map((a) => ({
            value: a.code,
            label: `${a.code} - ${a.name}`,
        })),
        [leafAccounts]
    );

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

    const toggleAccount = (accountId: number) => {
        setOpenAccounts((prev) => {
            const next = new Set(prev);
            if (next.has(accountId)) {
                next.delete(accountId);
            } else {
                next.add(accountId);
            }
            return next;
        });
    };

    const expandAll = () => {
        setOpenAccounts(new Set(entries.map((e) => e.account.id)));
    };

    const collapseAll = () => {
        setOpenAccounts(new Set());
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
            const data = await accountingApi.reports.accountSubledger(
                dateFrom,
                dateTo,
                codeFrom || undefined,
                codeTo || undefined
            );
            setEntries(data);
            setHasSearched(true);
            // Auto-expand all
            setOpenAccounts(new Set(data.map((e) => e.account.id)));
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el auxiliar de cuenta";
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
                report_type: 'account-subledger',
                date_from: dateFrom,
                date_to: dateTo,
                code_from: codeFrom || undefined,
                code_to: codeTo || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auxiliar-cuenta-contable.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: "Exportado", description: `Reporte exportado en formato ${format === 'pdf' ? 'PDF' : 'Excel'}` });
        } catch (error: any) {
            const msg = error?.message || "Error al exportar el reporte";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    // Totals
    const grandTotalDebit = entries.reduce((sum, e) => sum + e.total_debit, 0);
    const grandTotalCredit = entries.reduce((sum, e) => sum + e.total_credit, 0);

    return (
        <AppLayout>
            <Head title="Auxiliar de Cuenta Contable" />

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
                            <FileSearch className="h-5 w-5 text-[#2463eb]" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-semibold text-foreground">Auxiliar de Cuenta Contable</h1>
                            <p className="text-sm text-muted-foreground">Movimientos detallados por rango de cuentas</p>
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

                    {/* Stats cards */}
                    {hasSearched && entries.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-background rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileSearch className="h-4 w-4 text-[#2463eb]" />
                                    <span className="text-xs text-muted-foreground">Cuentas</span>
                                </div>
                                <p className="text-lg font-semibold">{entries.length}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-green-500/100" />
                                    <span className="text-xs text-muted-foreground">Total Debitos</span>
                                </div>
                                <p className="text-lg font-semibold">{formatCurrency(grandTotalDebit)}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-red-500/100" />
                                    <span className="text-xs text-muted-foreground">Total Creditos</span>
                                </div>
                                <p className="text-lg font-semibold">{formatCurrency(grandTotalCredit)}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                                    <span className="text-xs text-muted-foreground">Diferencia</span>
                                </div>
                                <p className="text-lg font-semibold">{formatCurrency(grandTotalDebit - grandTotalCredit)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
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
                            <div className="space-y-1 flex-1 w-full sm:w-auto sm:min-w-[220px]">
                                <Label className="text-xs text-muted-foreground">Cuenta Desde (opcional)</Label>
                                <Combobox
                                    options={accountOptions}
                                    value={codeFrom}
                                    onValueChange={setCodeFrom}
                                    placeholder="Ej: 1105"
                                    searchPlaceholder="Buscar cuenta..."
                                    emptyText="No se encontraron cuentas"
                                    loading={accountsLoading}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1 flex-1 w-full sm:w-auto sm:min-w-[220px]">
                                <Label className="text-xs text-muted-foreground">Cuenta Hasta (opcional)</Label>
                                <Combobox
                                    options={accountOptions}
                                    value={codeTo}
                                    onValueChange={setCodeTo}
                                    placeholder="Ej: 1199"
                                    searchPlaceholder="Buscar cuenta..."
                                    emptyText="No se encontraron cuentas"
                                    loading={accountsLoading}
                                    className="h-9 text-sm"
                                />
                            </div>
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
                            <p className="text-sm text-muted-foreground">Consultando auxiliar de cuentas...</p>
                        </div>
                    </div>
                ) : hasSearched ? (
                    entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileSearch className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No se encontraron movimientos en el rango seleccionado
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Summary & controls */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {entries.length} cuenta{entries.length !== 1 ? "s" : ""} con movimientos
                                </p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={expandAll} className="text-xs h-7">
                                        Expandir todo
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs h-7">
                                        Colapsar todo
                                    </Button>
                                </div>
                            </div>

                            {/* Account entries */}
                            {entries.map((entry) => {
                                const isOpen = openAccounts.has(entry.account.id);
                                return (
                                    <Collapsible
                                        key={entry.account.id}
                                        open={isOpen}
                                        onOpenChange={() => toggleAccount(entry.account.id)}
                                    >
                                        <Card className="border shadow-sm">
                                            <CollapsibleTrigger asChild>
                                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        {isOpen ? (
                                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-semibold">
                                                                {entry.account.code} - {entry.account.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {entry.movements.length} movimiento{entry.movements.length !== 1 ? "s" : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-sm">
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Debito</p>
                                                            <p className="font-medium">{formatCurrency(entry.total_debit)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Credito</p>
                                                            <p className="font-medium">{formatCurrency(entry.total_credit)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Saldo</p>
                                                            <p className="font-bold">{formatCurrency(entry.final_balance)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="border-t overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="h-10 px-4 text-xs">Fecha</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs">No. Registro</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs">Descripción</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Débito</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Crédito</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Saldo</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {/* Saldo Anterior */}
                                                            <TableRow className="bg-blue-500/10/50 dark:bg-blue-950/20">
                                                                <TableCell colSpan={5} className="p-4 text-sm font-semibold text-right">
                                                                    Saldo Anterior
                                                                </TableCell>
                                                                <TableCell className="p-4 text-sm text-right font-semibold">
                                                                    {formatCurrency(entry.previous_balance)}
                                                                </TableCell>
                                                            </TableRow>
                                                            {entry.movements.map((row, idx) => (
                                                                <TableRow key={idx}>
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
                                                                <TableCell className={`p-4 text-sm text-right font-bold ${entry.final_balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                                    {formatCurrency(entry.final_balance)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CollapsibleContent>
                                        </Card>
                                    </Collapsible>
                                );
                            })}

                            {/* Grand totals */}
                            <Card className="border shadow-sm bg-muted/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold">Totales Generales</p>
                                        <div className="flex items-center gap-6 text-sm">
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground">Debito</p>
                                                <p className="font-bold">{formatCurrency(grandTotalDebit)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground">Credito</p>
                                                <p className="font-bold">{formatCurrency(grandTotalCredit)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileSearch className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Seleccione el rango de fechas y opcionalmente un rango de cuentas, luego presione "Consultar"
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
