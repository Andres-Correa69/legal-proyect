import { Head } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
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

import { useToast } from "@/hooks/use-toast";
import { accountingApi, suppliersApi, clientsApi, type Supplier } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import type { AccountingAccount, ThirdPartySubledgerEntry, User } from "@/types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Users, Search, ChevronDown, ChevronRight, User as UserIcon, Truck, Download, FileText, FileSpreadsheet, CalendarIcon } from "lucide-react";

export default function ThirdPartySubledgerPage() {
    const { toast } = useToast();

    const [leafAccounts, setLeafAccounts] = useState<AccountingAccount[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [clients, setClients] = useState<User[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
    const [selectedThirdParty, setSelectedThirdParty] = useState<string>("");
    const [datePreset, setDatePreset] = useState<string>('');
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<ThirdPartySubledgerEntry[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [openParties, setOpenParties] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);

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

    const thirdPartyOptions = useMemo(() => {
        const supplierOptions = suppliers.map((s) => ({
            value: `supplier:${s.id}`,
            label: `${s.name}${s.tax_id ? ` (${s.tax_id})` : ""} — Proveedor`,
        }));
        const clientOptions = clients.map((c) => ({
            value: `client:${c.id}`,
            label: `${c.name}${c.document_id ? ` (${c.document_id})` : ""} — Cliente`,
        }));
        return [...supplierOptions, ...clientOptions].sort((a, b) =>
            a.label.localeCompare(b.label),
        );
    }, [suppliers, clients]);

    useEffect(() => {
        const loadData = async () => {
            setAccountsLoading(true);
            try {
                const [accountsData, suppliersData, clientsData] = await Promise.all([
                    accountingApi.accounts.getLeaf(),
                    suppliersApi.getAll(),
                    clientsApi.getAll(),
                ]);
                setLeafAccounts(accountsData);
                setSuppliers(suppliersData);
                setClients(clientsData);
            } catch (error: any) {
                console.error("Error loading data:", error);
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los datos",
                    variant: "destructive",
                });
            } finally {
                setAccountsLoading(false);
            }
        };
        loadData();
    }, []);

    const toggleParty = (key: string) => {
        setOpenParties((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const expandAll = () => {
        setOpenParties(new Set(entries.map((e) => `${e.third_party.type}:${e.third_party.id}`)));
    };

    const collapseAll = () => {
        setOpenParties(new Set());
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
            const accountId = selectedAccountId && selectedAccountId !== "all"
                ? parseInt(selectedAccountId)
                : undefined;
            let tpType: string | undefined;
            let tpId: number | undefined;
            if (selectedThirdParty) {
                const [type, id] = selectedThirdParty.split(":");
                tpType = type;
                tpId = parseInt(id);
            }
            const data = await accountingApi.reports.thirdPartySubledger(
                dateFrom,
                dateTo,
                accountId,
                tpType,
                tpId
            );
            setEntries(data);
            setHasSearched(true);
            setOpenParties(new Set(data.map((e) => `${e.third_party.type}:${e.third_party.id}`)));
        } catch (error: any) {
            const msg = error?.message || "Error al consultar el auxiliar por tercero";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!dateFrom || !dateTo) return;
        setExporting(true);
        try {
            const accountId = selectedAccountId && selectedAccountId !== "all"
                ? parseInt(selectedAccountId)
                : undefined;
            let tpType: string | undefined;
            let tpId: number | undefined;
            if (selectedThirdParty) {
                const [type, id] = selectedThirdParty.split(":");
                tpType = type;
                tpId = parseInt(id);
            }
            const blob = await accountingApi.reports.exportThirdPartySubledger({
                format,
                date_from: dateFrom,
                date_to: dateTo,
                account_id: accountId,
                third_party_type: tpType,
                third_party_id: tpId,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auxiliar_tercero_${new Date().getTime()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({ title: "Exportado", description: `Reporte exportado en formato ${format.toUpperCase()}` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Error al exportar", variant: "destructive" });
        } finally {
            setExporting(false);
        }
    };

    const getPartyIcon = (type: string) => {
        switch (type) {
            case "client":
                return <UserIcon className="h-3.5 w-3.5" />;
            case "supplier":
                return <Truck className="h-3.5 w-3.5" />;
            default:
                return <Users className="h-3.5 w-3.5" />;
        }
    };

    const getPartyBadge = (type: string) => {
        switch (type) {
            case "client":
                return <Badge variant="outline" className="text-[10px] rounded-full text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-800">Cliente</Badge>;
            case "supplier":
                return <Badge variant="outline" className="text-[10px] rounded-full text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-800">Proveedor</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] rounded-full">Sin tercero</Badge>;
        }
    };

    const grandTotalDebit = entries.reduce((sum, e) => sum + e.total_debit, 0);
    const grandTotalCredit = entries.reduce((sum, e) => sum + e.total_credit, 0);
    const grandTotalDifference = grandTotalDebit - grandTotalCredit;

    return (
        <AppLayout>
            <Head title="Auxiliar por Tercero" />

            <div className="space-y-6">
                {/* Header */}
                <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => router.visit("/admin/accounting/reports")} className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                                <Users className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Auxiliar por Tercero</h1>
                                <p className="text-sm text-muted-foreground">Movimientos contables agrupados por tercero</p>
                            </div>
                            {hasSearched && entries.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" disabled={exporting}>
                                            {exporting ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                            Exportar
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-card z-50">
                                        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 text-xs cursor-pointer">
                                            <FileText className="h-3.5 w-3.5" />
                                            Exportar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 text-xs cursor-pointer">
                                            <FileSpreadsheet className="h-3.5 w-3.5" />
                                            Exportar Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        {hasSearched && entries.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Users className="h-4 w-4 text-[#2463eb]" />
                                            <span className="text-xs text-muted-foreground">Terceros</span>
                                        </div>
                                        <p className="text-2xl font-bold">{entries.length}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                                            <span className="text-xs text-muted-foreground">Total Debitos</span>
                                        </div>
                                        <p className="text-2xl font-bold">{formatCurrency(grandTotalDebit)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-red-500/100" />
                                            <span className="text-xs text-muted-foreground">Total Creditos</span>
                                        </div>
                                        <p className="text-2xl font-bold">{formatCurrency(grandTotalCredit)}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                                            <span className="text-xs text-muted-foreground">Diferencia</span>
                                        </div>
                                        <p className={`text-2xl font-bold ${grandTotalDifference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                            {formatCurrency(grandTotalDifference)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <Card className="shadow-xl border border-border">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="space-y-1 flex-1 w-full sm:w-auto sm:min-w-[250px]">
                                <Label className="text-xs text-muted-foreground">Tercero (opcional)</Label>
                                {accountsLoading ? (
                                    <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
                                        <Spinner className="h-4 w-4" />
                                        Cargando...
                                    </div>
                                ) : (
                                    <Combobox
                                        value={selectedThirdParty}
                                        onValueChange={setSelectedThirdParty}
                                        placeholder="Todos los terceros"
                                        searchPlaceholder="Buscar tercero..."
                                        emptyText="No se encontraron terceros"
                                        className="h-9 text-sm"
                                        options={[
                                            { value: "", label: "Todos los terceros" },
                                            ...thirdPartyOptions,
                                        ]}
                                    />
                                )}
                            </div>
                            <div className="space-y-1 flex-1 w-full sm:w-auto sm:min-w-[250px]">
                                <Label className="text-xs text-muted-foreground">Cuenta Contable (opcional)</Label>
                                {accountsLoading ? (
                                    <div className="flex items-center gap-2 h-9 px-3 text-sm text-muted-foreground">
                                        <Spinner className="h-4 w-4" />
                                        Cargando cuentas...
                                    </div>
                                ) : (
                                    <Combobox
                                        options={[
                                            { value: "all", label: "Todas las cuentas" },
                                            ...leafAccounts.map((a) => ({
                                                value: a.id.toString(),
                                                label: `${a.code} - ${a.name}`,
                                            })),
                                        ]}
                                        value={selectedAccountId}
                                        onValueChange={setSelectedAccountId}
                                        placeholder="Todas las cuentas"
                                        searchPlaceholder="Buscar por código o nombre..."
                                        emptyText="No se encontraron cuentas."
                                        className="h-9 text-sm"
                                    />
                                )}
                            </div>
                        </div>
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
                            <p className="text-sm text-muted-foreground">Consultando auxiliar por tercero...</p>
                        </div>
                    </div>
                ) : hasSearched ? (
                    entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                            <p className="text-sm text-muted-foreground">
                                No se encontraron movimientos con terceros en el periodo seleccionado
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Summary & controls */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    {entries.length} tercero{entries.length !== 1 ? "s" : ""} con movimientos
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

                            {/* Third party entries */}
                            {entries.map((entry) => {
                                const tpKey = `${entry.third_party.type}:${entry.third_party.id}`;
                                const isOpen = openParties.has(tpKey);
                                return (
                                    <Collapsible
                                        key={tpKey}
                                        open={isOpen}
                                        onOpenChange={() => toggleParty(tpKey)}
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
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                            {getPartyIcon(entry.third_party.type)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold">{entry.third_party.name}</p>
                                                                {getPartyBadge(entry.third_party.type)}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {entry.third_party.document && `${entry.third_party.document} · `}
                                                                {entry.movements.length} movimiento{entry.movements.length !== 1 ? "s" : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 sm:gap-6 text-sm">
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Debito</p>
                                                            <p className="font-medium">{formatCurrency(entry.total_debit)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Credito</p>
                                                            <p className="font-medium">{formatCurrency(entry.total_credit)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] uppercase text-muted-foreground">Diferencia</p>
                                                            <p className={`font-semibold ${entry.total_debit - entry.total_credit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                                {formatCurrency(entry.total_debit - entry.total_credit)}
                                                            </p>
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
                                                                <TableHead className="h-10 px-4 text-xs">Cuenta</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs">Descripción</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Débito</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Crédito</TableHead>
                                                                <TableHead className="h-10 px-4 text-xs text-right">Saldo</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {/* Saldo Anterior row */}
                                                            <TableRow className="bg-blue-500/10/50 dark:bg-blue-950/20">
                                                                <TableCell colSpan={6} className="p-4 text-sm font-semibold text-right">
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
                                                                    <TableCell className="p-4 text-sm whitespace-nowrap">
                                                                        <span className="font-mono text-xs text-muted-foreground">{row.account_code}</span>
                                                                        {" "}{row.account_name}
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
                                                                    <TableCell className={`p-4 text-sm text-right font-medium ${row.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                                        {formatCurrency(row.balance)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {/* Subtotals */}
                                                            <TableRow className="bg-muted/50 border-t-2">
                                                                <TableCell colSpan={4} className="p-4 text-sm font-semibold text-right">
                                                                    Subtotal
                                                                </TableCell>
                                                                <TableCell className="p-4 text-sm text-right font-semibold">
                                                                    {formatCurrency(entry.total_debit)}
                                                                </TableCell>
                                                                <TableCell className="p-4 text-sm text-right font-semibold">
                                                                    {formatCurrency(entry.total_credit)}
                                                                </TableCell>
                                                                <TableCell className="p-4 text-sm text-right" />
                                                            </TableRow>
                                                            {/* Saldo Final */}
                                                            <TableRow className="bg-muted/50">
                                                                <TableCell colSpan={6} className="p-4 text-sm font-semibold text-right">
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
                            <Card className="border-2 border-primary/20 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold">Totales Generales</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {entries.length} tercero{entries.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 sm:gap-6 text-sm">
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground">Debito</p>
                                                <p className="font-bold">{formatCurrency(grandTotalDebit)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground">Credito</p>
                                                <p className="font-bold">{formatCurrency(grandTotalCredit)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase text-muted-foreground">Diferencia</p>
                                                <p className={`font-bold ${grandTotalDifference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                    {formatCurrency(grandTotalDifference)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Seleccione las fechas, opcionalmente un tercero y/o cuenta, y presione "Consultar"
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
