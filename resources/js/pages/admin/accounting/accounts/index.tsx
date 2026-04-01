import { Head, Link, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { accountingApi } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import type { AccountingAccount, User } from "@/types";
import {
    Plus,
    ChevronRight,
    ChevronDown,
    Edit2,
    Search,
    Power,
    FileText,
    BookOpen,
    FileSpreadsheet,
} from "lucide-react";

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
    asset: "Activo",
    liability: "Pasivo",
    equity: "Patrimonio",
    revenue: "Ingreso",
    expense: "Gasto",
    cost: "Costo",
};

const TYPE_COLORS: Record<string, string> = {
    asset: "bg-blue-500/15 text-blue-700",
    liability: "bg-red-500/15 text-red-700",
    equity: "bg-purple-500/15 text-purple-700",
    revenue: "bg-green-500/15 text-green-700",
    expense: "bg-orange-500/15 text-orange-700",
    cost: "bg-amber-500/15 text-amber-700",
};

const NATURE_LABELS: Record<string, string> = {
    debit: "Debito",
    credit: "Credito",
};

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface FlatRow {
    account: AccountingAccount;
    depth: number;
    hasChildren: boolean;
}

interface FormErrors {
    name?: string;
    description?: string;
    is_active?: string;
    [key: string]: string | undefined;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function flattenTree(
    nodes: AccountingAccount[],
    expandedIds: Set<number>,
    depth: number = 0
): FlatRow[] {
    const rows: FlatRow[] = [];
    for (const node of nodes) {
        const hasChildren = !!(node.children && node.children.length > 0);
        rows.push({ account: node, depth, hasChildren });
        if (hasChildren && expandedIds.has(node.id)) {
            rows.push(...flattenTree(node.children!, expandedIds, depth + 1));
        }
    }
    return rows;
}

function filterTree(
    nodes: AccountingAccount[],
    search: string,
    typeFilter: string
): AccountingAccount[] {
    const filtered: AccountingAccount[] = [];
    for (const node of nodes) {
        const matchesSearch =
            !search ||
            node.code.toLowerCase().includes(search) ||
            node.name.toLowerCase().includes(search);
        const matchesType = typeFilter === "all" || node.type === typeFilter;

        const filteredChildren = node.children
            ? filterTree(node.children, search, typeFilter)
            : [];

        if ((matchesSearch && matchesType) || filteredChildren.length > 0) {
            filtered.push({
                ...node,
                children:
                    filteredChildren.length > 0 ? filteredChildren : node.children,
            });
        }
    }
    return filtered;
}

function collectAllIds(nodes: AccountingAccount[]): number[] {
    const ids: number[] = [];
    for (const node of nodes) {
        ids.push(node.id);
        if (node.children) {
            ids.push(...collectAllIds(node.children));
        }
    }
    return ids;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export default function AccountsIndex() {
    const { props } = usePage<{ auth: { user: User } }>();
    const user = props.auth?.user;
    const canManage =
        isSuperAdmin(user) || hasPermission("accounting.manage", user);
    const { toast } = useToast();

    // Data
    const [tree, setTree] = useState<AccountingAccount[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    // Summary stats
    const stats = useMemo(() => {
        const allAccounts = collectAllIds(tree);
        const countByType = (type: string) => {
            const countInNodes = (nodes: AccountingAccount[]): number => {
                let c = 0;
                for (const n of nodes) {
                    if (n.type === type) c++;
                    if (n.children) c += countInNodes(n.children);
                }
                return c;
            };
            return countInNodes(tree);
        };
        const countActive = (nodes: AccountingAccount[]): number => {
            let c = 0;
            for (const n of nodes) {
                if (n.is_active) c++;
                if (n.children) c += countActive(n.children);
            }
            return c;
        };
        return {
            total: allAccounts.length,
            active: countActive(tree),
            assets: countByType("asset"),
            liabilities: countByType("liability"),
            equity: countByType("equity"),
            revenue: countByType("revenue"),
            expense: countByType("expense"),
        };
    }, [tree]);

    // Tree expansion
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    // Edit dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] =
        useState<AccountingAccount | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        is_active: true,
    });
    const [editErrors, setEditErrors] = useState<FormErrors>({});
    const [editLoading, setEditLoading] = useState(false);

    // Toggle active loading tracker
    const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

    // Export
    const [exporting, setExporting] = useState(false);

    // -------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------

    const loadTree = useCallback(async () => {
        try {
            setLoading(true);
            const data = await accountingApi.accounts.getTree();
            setTree(data);
        } catch (error) {
            console.error("Error loading accounts tree:", error);
            toast({
                title: "Error",
                description: "No se pudo cargar el plan de cuentas.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadTree();
    }, [loadTree]);

    // -------------------------------------------------------------------
    // Filtered + flattened rows
    // -------------------------------------------------------------------

    const searchLower = search.toLowerCase().trim();

    const filteredTree = useMemo(
        () => filterTree(tree, searchLower, typeFilter),
        [tree, searchLower, typeFilter]
    );

    // When a filter is active, expand everything so the user can see matches
    const effectiveExpanded = useMemo(() => {
        if (searchLower || typeFilter !== "all") {
            return new Set(collectAllIds(filteredTree));
        }
        return expandedIds;
    }, [filteredTree, expandedIds, searchLower, typeFilter]);

    const flatRows = useMemo(
        () => flattenTree(filteredTree, effectiveExpanded),
        [filteredTree, effectiveExpanded]
    );

    // -------------------------------------------------------------------
    // Tree toggle
    // -------------------------------------------------------------------

    const toggleExpand = useCallback((id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // -------------------------------------------------------------------
    // Edit dialog handlers
    // -------------------------------------------------------------------

    const openEditDialog = useCallback((account: AccountingAccount) => {
        setEditingAccount(account);
        setEditForm({
            name: account.name,
            description: account.description || "",
            is_active: account.is_active,
        });
        setEditErrors({});
        setEditDialogOpen(true);
    }, []);

    const closeEditDialog = useCallback(() => {
        setEditDialogOpen(false);
        setEditingAccount(null);
        setEditForm({ name: "", description: "", is_active: true });
        setEditErrors({});
    }, []);

    const handleEditSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!editingAccount) return;

            setEditLoading(true);
            setEditErrors({});

            try {
                const updated = await accountingApi.accounts.update(
                    editingAccount.id,
                    {
                        name: editForm.name,
                        description: editForm.description || undefined,
                        is_active: editForm.is_active,
                    }
                );
                updateAccountInTree(updated);
                toast({
                    title: "Cuenta actualizada",
                    description: `La cuenta "${updated.name}" se actualizo correctamente.`,
                });
                closeEditDialog();
            } catch (error: unknown) {
                console.error("Error updating account:", error);
                if (error && typeof error === "object" && "errors" in error) {
                    setEditErrors(
                        (error as { errors: FormErrors }).errors
                    );
                } else {
                    toast({
                        title: "Error",
                        description: "No se pudo actualizar la cuenta.",
                        variant: "destructive",
                    });
                }
            } finally {
                setEditLoading(false);
            }
        },
        [editingAccount, editForm, closeEditDialog, toast]
    );

    // -------------------------------------------------------------------
    // Toggle active
    // -------------------------------------------------------------------

    const toggleActive = useCallback(
        async (account: AccountingAccount) => {
            setTogglingIds((prev) => new Set(prev).add(account.id));

            try {
                const updated = await accountingApi.accounts.update(account.id, {
                    is_active: !account.is_active,
                });
                updateAccountInTree(updated);
                toast({
                    title: updated.is_active
                        ? "Cuenta activada"
                        : "Cuenta desactivada",
                    description: `La cuenta "${updated.name}" fue ${updated.is_active ? "activada" : "desactivada"}.`,
                });
            } catch (error) {
                console.error("Error toggling account:", error);
                toast({
                    title: "Error",
                    description: "No se pudo cambiar el estado de la cuenta.",
                    variant: "destructive",
                });
            } finally {
                setTogglingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(account.id);
                    return next;
                });
            }
        },
        [toast]
    );

    // -------------------------------------------------------------------
    // Export
    // -------------------------------------------------------------------

    const handleExport = useCallback(
        async (format: "pdf" | "excel") => {
            setExporting(true);
            try {
                const blob = await accountingApi.accounts.exportPlan({ format });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download =
                    format === "pdf"
                        ? "Plan_de_Cuentas.pdf"
                        : "Plan_de_Cuentas.xlsx";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast({
                    title: "Exportación exitosa",
                    description: `El plan de cuentas se exportó en formato ${format === "pdf" ? "PDF" : "Excel"}.`,
                });
            } catch (error) {
                console.error("Error exporting:", error);
                toast({
                    title: "Error",
                    description: "No se pudo exportar el plan de cuentas.",
                    variant: "destructive",
                });
            } finally {
                setExporting(false);
            }
        },
        [toast]
    );

    // -------------------------------------------------------------------
    // Tree updater — recursively replace the updated account in the tree
    // -------------------------------------------------------------------

    const updateAccountInTree = (updated: AccountingAccount) => {
        const replaceInNodes = (
            nodes: AccountingAccount[]
        ): AccountingAccount[] =>
            nodes.map((n) => {
                if (n.id === updated.id) {
                    return { ...n, ...updated, children: n.children };
                }
                if (n.children) {
                    return { ...n, children: replaceInNodes(n.children) };
                }
                return n;
            });

        setTree((prev) => replaceInNodes(prev));
    };

    // -------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------

    return (
        <AppLayout title="Plan de Cuentas">
            <Head title="Plan de Cuentas" />

            <div className="space-y-6">
                {/* Header + Stats */}
                <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
                    <div className="px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                                <BookOpen className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-xl font-semibold text-foreground">Plan de Cuentas</h1>
                                <p className="text-sm text-muted-foreground">Gestiona las cuentas contables de tu empresa</p>
                            </div>
                            {!loading && tree.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport("pdf")}
                                        disabled={exporting}
                                    >
                                        {exporting ? <Spinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                                        PDF
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleExport("excel")}
                                        disabled={exporting}
                                    >
                                        {exporting ? <Spinner className="h-4 w-4 mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                                        Excel
                                    </Button>
                                </div>
                            )}
                        </div>
                        {!loading && tree.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BookOpen className="h-4 w-4 text-[#2463eb]" />
                                            <span className="text-xs text-muted-foreground">Total Cuentas</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stats.total}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                                            <span className="text-xs text-muted-foreground">Activas</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stats.active}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                                            <span className="text-xs text-muted-foreground">Activos</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stats.assets}</p>
                                    </CardContent>
                                </Card>
                                <Card className="shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-2 w-2 rounded-full bg-green-500/100" />
                                            <span className="text-xs text-muted-foreground">Ingresos</span>
                                        </div>
                                        <p className="text-2xl font-bold">{stats.revenue}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Spinner className="h-8 w-8" />
                    </div>
                ) : flatRows.length === 0 && !search && typeFilter === "all" ? (
                    <Card className="shadow-xl border border-border">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                No hay cuentas contables registradas
                            </p>
                            {canManage && (
                                <Link href="/admin/accounting/accounts/create">
                                    <Button className="mt-4">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crear primera cuenta
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-xl border border-border">
                        <CardContent className="p-4 sm:p-6">
                            {/* Filters + Button inside card header */}
                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4">
                                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por codigo o nombre..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Tipo de cuenta" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        <SelectItem value="asset">Activo</SelectItem>
                                        <SelectItem value="liability">Pasivo</SelectItem>
                                        <SelectItem value="equity">Patrimonio</SelectItem>
                                        <SelectItem value="revenue">Ingreso</SelectItem>
                                        <SelectItem value="expense">Gasto</SelectItem>
                                        <SelectItem value="cost">Costo</SelectItem>
                                    </SelectContent>
                                </Select>
                                {canManage && (
                                    <Link href="/admin/accounting/accounts/create" className="sm:ml-auto">
                                        <Button size="sm" className="gap-2 w-full sm:w-auto">
                                            <Plus className="h-4 w-4" />
                                            Nueva Cuenta
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            {/* Count */}
                            <div className="text-sm text-muted-foreground mb-3">
                                Mostrando {flatRows.length} cuentas
                            </div>

                            {flatRows.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No se encontraron cuentas con los filtros aplicados
                                </div>
                            )}
                            {flatRows.length > 0 && (
                                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                                    <table className="w-full">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                                Codigo
                                            </th>
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                                Nombre
                                            </th>
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                                Tipo
                                            </th>
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                                Naturaleza
                                            </th>
                                            <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                                                Estado
                                            </th>
                                            {canManage && (
                                                <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                                                    Acciones
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flatRows.map((row) => (
                                            <tr
                                                key={row.account.id}
                                                className="border-b transition-colors hover:bg-muted/50"
                                            >
                                                {/* Codigo with expand/collapse */}
                                                <td className="p-4">
                                                    <div
                                                        className="flex items-center"
                                                        style={{
                                                            paddingLeft: `${row.depth * 1.5}rem`,
                                                        }}
                                                    >
                                                        {row.hasChildren ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleExpand(
                                                                        row.account.id
                                                                    )
                                                                }
                                                                className="mr-2 flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                                                            >
                                                                {effectiveExpanded.has(
                                                                    row.account.id
                                                                ) ? (
                                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <span className="mr-2 w-5" />
                                                        )}
                                                        <span className="font-mono text-sm font-medium">
                                                            {row.account.code}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Nombre */}
                                                <td className="p-4">
                                                    <span
                                                        className={
                                                            row.account.is_parent
                                                                ? "font-semibold"
                                                                : ""
                                                        }
                                                    >
                                                        {row.account.name}
                                                    </span>
                                                </td>

                                                {/* Tipo */}
                                                <td className="p-4">
                                                    <Badge
                                                        variant="secondary"
                                                        className={`${TYPE_COLORS[row.account.type] || ""} border-0`}
                                                    >
                                                        {TYPE_LABELS[
                                                            row.account.type
                                                        ] || row.account.type}
                                                    </Badge>
                                                </td>

                                                {/* Naturaleza */}
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {NATURE_LABELS[
                                                        row.account.nature
                                                    ] || row.account.nature}
                                                </td>

                                                {/* Estado */}
                                                <td className="p-4">
                                                    <Badge
                                                        variant={
                                                            row.account.is_active
                                                                ? "outline"
                                                                : "secondary"
                                                        }
                                                    >
                                                        {row.account.is_active
                                                            ? "Activa"
                                                            : "Inactiva"}
                                                    </Badge>
                                                </td>

                                                {/* Acciones */}
                                                {canManage && (
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openEditDialog(
                                                                        row.account
                                                                    )
                                                                }
                                                                title="Editar cuenta"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    toggleActive(
                                                                        row.account
                                                                    )
                                                                }
                                                                disabled={togglingIds.has(
                                                                    row.account.id
                                                                )}
                                                                title={
                                                                    row.account
                                                                        .is_active
                                                                        ? "Desactivar cuenta"
                                                                        : "Activar cuenta"
                                                                }
                                                            >
                                                                {togglingIds.has(
                                                                    row.account.id
                                                                ) ? (
                                                                    <Spinner className="h-4 w-4" />
                                                                ) : (
                                                                    <Power
                                                                        className={`h-4 w-4 ${
                                                                            row
                                                                                .account
                                                                                .is_active
                                                                                ? "text-green-600"
                                                                                : "text-muted-foreground"
                                                                        }`}
                                                                    />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                    </table>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Editar Cuenta</DialogTitle>
                    </DialogHeader>
                    {editingAccount && (
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {/* Read-only info */}
                            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">
                                        Codigo:
                                    </span>
                                    <span className="font-mono font-medium">
                                        {editingAccount.code}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">
                                        Tipo:
                                    </span>
                                    <Badge
                                        variant="secondary"
                                        className={`${TYPE_COLORS[editingAccount.type] || ""} border-0`}
                                    >
                                        {TYPE_LABELS[editingAccount.type] ||
                                            editingAccount.type}
                                    </Badge>
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nombre *</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.name}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Nombre de la cuenta"
                                    disabled={editLoading}
                                    required
                                />
                                <InputError message={editErrors.name} />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">
                                    Descripcion
                                </Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Descripcion de la cuenta..."
                                    disabled={editLoading}
                                    rows={3}
                                />
                                <InputError message={editErrors.description} />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between">
                                <Label
                                    htmlFor="edit-is-active"
                                    className="font-normal"
                                >
                                    Cuenta activa
                                </Label>
                                <Switch
                                    id="edit-is-active"
                                    checked={editForm.is_active}
                                    onCheckedChange={(checked) =>
                                        setEditForm({
                                            ...editForm,
                                            is_active: checked,
                                        })
                                    }
                                    disabled={editLoading}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeEditDialog}
                                    disabled={editLoading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editLoading}>
                                    {editLoading && (
                                        <Spinner className="mr-2 h-4 w-4" />
                                    )}
                                    Guardar Cambios
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
