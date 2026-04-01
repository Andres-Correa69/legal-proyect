import { useState, useEffect, useCallback } from "react";
import { Head } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Combobox } from "@/components/ui/combobox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useToast } from "@/hooks/use-toast";
import { accountingApi } from "@/lib/api";
import type { AccountingAccount, AccountingSaleTypeMapping } from "@/types";
import { Settings, CreditCard, Truck, Receipt, Save, Unlink } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

interface CashRegisterRow {
    cash_register: { id: number; name: string; type: string; bank_name?: string };
    account?: { id: number; code: string; name: string } | null;
}

interface SupplierRow {
    supplier: { id: number; name: string; document_number?: string };
    account?: { id: number; code: string; name: string } | null;
}

// ── Transaction type config ───────────────────────────────────────────

const TRANSACTION_GROUPS = [
    {
        label: "Ingresos por Productos",
        types: [
            { key: "sale_revenue_products_excluded", label: "Venta Productos Excluidos" },
            { key: "sale_revenue_products_exempt",   label: "Venta Productos Exentos (0%)" },
            { key: "sale_revenue_products_5",        label: "Venta Productos IVA 5%" },
            { key: "sale_revenue_products_19",       label: "Venta Productos IVA 19%" },
        ],
    },
    {
        label: "Ingresos por Servicios",
        types: [
            { key: "sale_revenue_services_excluded", label: "Venta Servicios Excluidos" },
            { key: "sale_revenue_services_exempt",   label: "Venta Servicios Exentos (0%)" },
            { key: "sale_revenue_services_5",        label: "Venta Servicios IVA 5%" },
            { key: "sale_revenue_services_19",       label: "Venta Servicios IVA 19%" },
        ],
    },
    {
        label: "IVA por Pagar",
        types: [
            { key: "sale_tax_5",  label: "IVA por Pagar 5%" },
            { key: "sale_tax_19", label: "IVA por Pagar 19%" },
        ],
    },
    {
        label: "Cuentas por Cobrar",
        types: [
            { key: "sale_cxc", label: "Cuentas por Cobrar (CxC)" },
        ],
    },
    {
        label: "Compras a Proveedores",
        types: [
            { key: "purchase_inventory", label: "Inventario Entrada — Mercancías (1435)" },
            { key: "purchase_tax_5",     label: "IVA Descontable Compras 5% (24081003)" },
            { key: "purchase_tax_19",    label: "IVA Descontable Compras 19% (24081001)" },
            { key: "purchase_cxp",       label: "Cuentas por Pagar Proveedores (2205)" },
        ],
    },
    {
        label: "Costo de Venta",
        types: [
            { key: "sale_cost_of_goods", label: "Costo de Venta (6135)" },
            { key: "sale_inventory",     label: "Inventario — Salida (1435)" },
        ],
    },
    {
        label: "Retenciones (pasivo)",
        types: [
            { key: "sale_retention_fuente", label: "Retención en la Fuente (2365)" },
            { key: "sale_retention_iva",    label: "Retención de IVA — ReteIVA (2367)" },
            { key: "sale_retention_ica",    label: "Retención ICA — ReteICA (2368)" },
        ],
    },
];

// ── Component ─────────────────────────────────────────────────────────

export default function AccountingConfigPage() {
    const { toast } = useToast();

    // Leaf accounts for selects
    const [leafAccounts, setLeafAccounts] = useState<AccountingAccount[]>([]);
    const [leafLoading, setLeafLoading] = useState(true);

    // Tab: Cash Registers
    const [cashRows, setCashRows] = useState<CashRegisterRow[]>([]);
    const [cashLoading, setCashLoading] = useState(true);
    const [cashSaving, setCashSaving] = useState<Set<number>>(new Set());

    // Tab: Suppliers
    const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);
    const [supplierLoading, setSupplierLoading] = useState(true);
    const [supplierSaving, setSupplierSaving] = useState<Set<number>>(new Set());

    // Tab: Transaction Type Accounts
    const [saleTypeMappings, setSaleTypeMappings] = useState<AccountingSaleTypeMapping[]>([]);
    const [saleTypeLoading, setSaleTypeLoading] = useState(true);
    const [saleTypeSaving, setSaleTypeSaving] = useState(false);
    // Local edits: Record<transactionType, accountId | null>
    const [saleTypeEdits, setSaleTypeEdits] = useState<Record<string, number | null>>({});

    // ── Load leaf accounts ────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLeafLoading(true);
            try {
                const data = await accountingApi.accounts.getLeaf();
                setLeafAccounts(data);
            } catch (error) {
                console.error("Error loading leaf accounts:", error);
                toast({ title: "Error", description: "No se pudieron cargar las cuentas contables", variant: "destructive" });
            } finally {
                setLeafLoading(false);
            }
        };
        load();
    }, []);

    // ── Cash Register Tab ─────────────────────────────────────────────

    const loadCashRegisters = useCallback(async () => {
        setCashLoading(true);
        try {
            const data = await accountingApi.config.getCashRegisterAccounts();
            setCashRows(data);
        } catch (error) {
            console.error("Error loading cash register accounts:", error);
            toast({ title: "Error", description: "No se pudieron cargar las cajas", variant: "destructive" });
        } finally {
            setCashLoading(false);
        }
    }, []);

    useEffect(() => { loadCashRegisters(); }, [loadCashRegisters]);

    const handleLinkCashRegister = useCallback(async (cashRegisterId: number, accountId: number) => {
        setCashSaving((prev) => new Set(prev).add(cashRegisterId));
        try {
            await accountingApi.accounts.linkCashRegister(accountId, cashRegisterId);
            toast({ title: "Vinculado", description: "Cuenta contable vinculada a la caja exitosamente" });
            await loadCashRegisters();
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "No se pudo vincular la cuenta", variant: "destructive" });
        } finally {
            setCashSaving((prev) => { const n = new Set(prev); n.delete(cashRegisterId); return n; });
        }
    }, [loadCashRegisters]);

    const handleUnlinkCashRegister = useCallback(async (cashRegisterId: number, accountId: number) => {
        setCashSaving((prev) => new Set(prev).add(cashRegisterId));
        try {
            await accountingApi.accounts.unlinkCashRegister(accountId, cashRegisterId);
            toast({ title: "Desvinculado", description: "Cuenta contable desvinculada de la caja" });
            await loadCashRegisters();
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "No se pudo desvincular", variant: "destructive" });
        } finally {
            setCashSaving((prev) => { const n = new Set(prev); n.delete(cashRegisterId); return n; });
        }
    }, [loadCashRegisters]);

    // ── Supplier Tab ──────────────────────────────────────────────────

    const loadSuppliers = useCallback(async () => {
        setSupplierLoading(true);
        try {
            const data = await accountingApi.config.getSupplierAccounts();
            setSupplierRows(data);
        } catch (error) {
            console.error("Error loading supplier accounts:", error);
            toast({ title: "Error", description: "No se pudieron cargar los proveedores", variant: "destructive" });
        } finally {
            setSupplierLoading(false);
        }
    }, []);

    useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

    const handleLinkSupplier = useCallback(async (supplierId: number, accountId: number) => {
        setSupplierSaving((prev) => new Set(prev).add(supplierId));
        try {
            await accountingApi.accounts.linkSupplier(accountId, supplierId);
            toast({ title: "Vinculado", description: "Cuenta contable vinculada al proveedor exitosamente" });
            await loadSuppliers();
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "No se pudo vincular la cuenta", variant: "destructive" });
        } finally {
            setSupplierSaving((prev) => { const n = new Set(prev); n.delete(supplierId); return n; });
        }
    }, [loadSuppliers]);

    const handleUnlinkSupplier = useCallback(async (supplierId: number, accountId: number) => {
        setSupplierSaving((prev) => new Set(prev).add(supplierId));
        try {
            await accountingApi.accounts.unlinkSupplier(accountId, supplierId);
            toast({ title: "Desvinculado", description: "Cuenta contable desvinculada del proveedor" });
            await loadSuppliers();
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "No se pudo desvincular", variant: "destructive" });
        } finally {
            setSupplierSaving((prev) => { const n = new Set(prev); n.delete(supplierId); return n; });
        }
    }, [loadSuppliers]);

    // ── Sale Type Tab ─────────────────────────────────────────────────

    const loadSaleTypeAccounts = useCallback(async () => {
        setSaleTypeLoading(true);
        try {
            const data = await accountingApi.config.getSaleTypeAccounts();
            setSaleTypeMappings(data);
            const edits: Record<string, number | null> = {};
            for (const m of data) {
                edits[m.transaction_type] = m.accounting_account_id;
            }
            setSaleTypeEdits(edits);
        } catch (error) {
            console.error("Error loading sale type accounts:", error);
            toast({ title: "Error", description: "No se pudieron cargar la configuracion de ventas", variant: "destructive" });
        } finally {
            setSaleTypeLoading(false);
        }
    }, []);

    useEffect(() => { loadSaleTypeAccounts(); }, [loadSaleTypeAccounts]);

    const handleSaveSaleTypeMappings = async () => {
        const mappings: { transaction_type: string; accounting_account_id: number }[] = [];
        for (const [transactionType, accountId] of Object.entries(saleTypeEdits)) {
            if (accountId) {
                mappings.push({ transaction_type: transactionType, accounting_account_id: accountId });
            }
        }

        if (mappings.length === 0) {
            toast({ title: "Sin cambios", description: "No hay mapeos configurados para guardar" });
            return;
        }

        setSaleTypeSaving(true);
        try {
            await accountingApi.config.updateSaleTypeAccounts(mappings);
            toast({ title: "Guardado", description: "Configuracion de cuentas contables actualizada exitosamente" });
            await loadSaleTypeAccounts();
        } catch (error: any) {
            toast({ title: "Error", description: error?.message || "No se pudo guardar la configuracion", variant: "destructive" });
        } finally {
            setSaleTypeSaving(false);
        }
    };

    // ── Account select helper ─────────────────────────────────────────

    const renderAccountSelect = (
        currentAccountId: number | null | undefined,
        onChange: (accountId: number) => void,
        disabled?: boolean
    ) => (
        <Combobox
            value={currentAccountId?.toString() || ""}
            onValueChange={(val) => {
                if (val) onChange(parseInt(val));
            }}
            disabled={disabled || leafLoading}
            loading={leafLoading}
            placeholder="Seleccionar cuenta..."
            searchPlaceholder="Buscar cuenta..."
            emptyText="No se encontraron cuentas"
            options={leafAccounts.map((acc) => ({
                value: String(acc.id),
                label: `${acc.code} - ${acc.name}`,
            }))}
            className="h-9 text-sm w-full min-w-0 sm:min-w-[200px]"
        />
    );

    // ── Render ─────────────────────────────────────────────────────────

    return (
        <AppLayout title="Configuracion Contable">
            <Head title="Configuracion Contable" />

            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2.5 rounded-lg">
                            <Settings className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Configuracion Contable
                            </h2>
                            <p className="text-muted-foreground">
                                Vincula cuentas contables a cajas, proveedores y tipos de transaccion
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="cash-registers">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="cash-registers" className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span className="hidden sm:inline">Cajas</span>
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="gap-2">
                            <Truck className="h-4 w-4" />
                            <span className="hidden sm:inline">Proveedores</span>
                        </TabsTrigger>
                        <TabsTrigger value="sale-types" className="gap-2">
                            <Receipt className="h-4 w-4" />
                            <span className="hidden sm:inline">Cuentas Contables</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab: Cash Registers ────────────────────────── */}
                    <TabsContent value="cash-registers">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    Cuentas por Caja Registradora
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Asigna una cuenta contable a cada caja para el registro automatico de movimientos.
                                </p>
                            </CardHeader>
                            <CardContent>
                                {cashLoading ? (
                                    <div className="flex items-center justify-center py-12 gap-2">
                                        <Spinner size="md" />
                                        <span className="text-muted-foreground">Cargando cajas...</span>
                                    </div>
                                ) : cashRows.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No hay cajas registradoras configuradas</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Caja</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Banco</TableHead>
                                                    <TableHead className="min-w-[250px]">Cuenta Contable</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cashRows.map((row) => (
                                                    <TableRow key={row.cash_register.id}>
                                                        <TableCell className="font-medium">
                                                            {row.cash_register.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {row.cash_register.type === "cash" ? "Efectivo" : row.cash_register.type === "bank" ? "Banco" : row.cash_register.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {row.cash_register.bank_name || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.account ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="font-mono text-xs">
                                                                        {row.account.code}
                                                                    </Badge>
                                                                    <span className="text-sm">{row.account.name}</span>
                                                                </div>
                                                            ) : (
                                                                renderAccountSelect(
                                                                    null,
                                                                    (accountId) => handleLinkCashRegister(row.cash_register.id, accountId),
                                                                    cashSaving.has(row.cash_register.id)
                                                                )
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {cashSaving.has(row.cash_register.id) ? (
                                                                <Spinner className="h-4 w-4 ml-auto" />
                                                            ) : row.account ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUnlinkCashRegister(row.cash_register.id, row.account!.id)}
                                                                    title="Desvincular cuenta"
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Unlink className="h-4 w-4" />
                                                                </Button>
                                                            ) : null}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Tab: Suppliers ──────────────────────────────── */}
                    <TabsContent value="suppliers">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-muted-foreground" />
                                    Cuentas por Proveedor
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Asigna una cuenta contable (Cuentas por Pagar) a cada proveedor.
                                </p>
                            </CardHeader>
                            <CardContent>
                                {supplierLoading ? (
                                    <div className="flex items-center justify-center py-12 gap-2">
                                        <Spinner size="md" />
                                        <span className="text-muted-foreground">Cargando proveedores...</span>
                                    </div>
                                ) : supplierRows.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>No hay proveedores registrados</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Documento</TableHead>
                                                    <TableHead className="min-w-[250px]">Cuenta Contable</TableHead>
                                                    <TableHead className="text-right">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {supplierRows.map((row) => (
                                                    <TableRow key={row.supplier.id}>
                                                        <TableCell className="font-medium">
                                                            {row.supplier.name}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">
                                                            {row.supplier.document_number || "—"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.account ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="outline" className="font-mono text-xs">
                                                                        {row.account.code}
                                                                    </Badge>
                                                                    <span className="text-sm">{row.account.name}</span>
                                                                </div>
                                                            ) : (
                                                                renderAccountSelect(
                                                                    null,
                                                                    (accountId) => handleLinkSupplier(row.supplier.id, accountId),
                                                                    supplierSaving.has(row.supplier.id)
                                                                )
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {supplierSaving.has(row.supplier.id) ? (
                                                                <Spinner className="h-4 w-4 ml-auto" />
                                                            ) : row.account ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleUnlinkSupplier(row.supplier.id, row.account!.id)}
                                                                    title="Desvincular cuenta"
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Unlink className="h-4 w-4" />
                                                                </Button>
                                                            ) : null}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Tab: Cuentas Contables ──────────────────────── */}
                    <TabsContent value="sale-types">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Receipt className="h-5 w-5 text-muted-foreground" />
                                            Configuracion de Cuentas Contables
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Asigna las cuentas contables para ventas, compras, costos y retenciones. Aplica a todos los tipos de transaccion.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleSaveSaleTypeMappings}
                                        disabled={saleTypeSaving || leafLoading}
                                        className="gap-2"
                                    >
                                        {saleTypeSaving ? (
                                            <Spinner className="h-4 w-4" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        Guardar
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {saleTypeLoading ? (
                                    <div className="flex items-center justify-center py-12 gap-2">
                                        <Spinner size="md" />
                                        <span className="text-muted-foreground">Cargando configuracion...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {TRANSACTION_GROUPS.map((group) => (
                                            <div key={group.label}>
                                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                                    {group.label}
                                                </h4>
                                                <div className="rounded-md border overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-[280px]">Tipo de Transaccion</TableHead>
                                                                <TableHead>Cuenta Contable</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {group.types.map(({ key, label }) => {
                                                                const currentAccountId = saleTypeEdits[key] || null;
                                                                return (
                                                                    <TableRow key={key}>
                                                                        <TableCell className="font-medium text-sm">
                                                                            {label}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Combobox
                                                                                value={currentAccountId?.toString() || ""}
                                                                                onValueChange={(val) => {
                                                                                    setSaleTypeEdits((prev) => ({
                                                                                        ...prev,
                                                                                        [key]: val ? parseInt(val) : null,
                                                                                    }));
                                                                                }}
                                                                                disabled={leafLoading}
                                                                                loading={leafLoading}
                                                                                placeholder="Sin asignar"
                                                                                searchPlaceholder="Buscar cuenta..."
                                                                                emptyText="No se encontraron cuentas"
                                                                                options={leafAccounts.map((acc) => ({
                                                                                    value: String(acc.id),
                                                                                    label: `${acc.code} - ${acc.name}`,
                                                                                }))}
                                                                                className="h-9 text-sm w-full min-w-[250px]"
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
