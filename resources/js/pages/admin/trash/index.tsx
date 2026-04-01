import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { trashApi } from "@/lib/api";
import type { TrashType } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Trash2,
    RotateCcw,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import type { SharedData } from "@/types";

interface ColumnConfig {
    key: string;
    label: string;
    render: (item: Record<string, any>) => React.ReactNode;
}

interface TypeConfig {
    title: string;
    description: string;
    columns: ColumnConfig[];
    restorable: boolean;
}

const TYPE_CONFIGS: Record<TrashType, TypeConfig> = {
    sales: {
        title: "Facturas anuladas",
        description: "Facturas que han sido anuladas en el sistema",
        restorable: false,
        columns: [
            {
                key: "invoice_number",
                label: "# Factura",
                render: (item) => (
                    <span className="font-medium">
                        {item.invoice_number || "—"}
                    </span>
                ),
            },
            {
                key: "client",
                label: "Cliente",
                render: (item) => item.client?.name || "—",
            },
            {
                key: "total",
                label: "Total",
                render: (item) => formatCurrency(Number(item.total || 0)),
            },
            {
                key: "status",
                label: "Estado",
                render: (item) => (
                    <Badge
                        variant="secondary"
                        className="bg-red-500/15 text-red-700 border-red-500/20"
                    >
                        Anulada
                    </Badge>
                ),
            },
            {
                key: "seller",
                label: "Vendedor",
                render: (item) => item.seller?.name || "—",
            },
        ],
    },
    clients: {
        title: "Clientes eliminados",
        description: "Clientes que han sido eliminados del sistema",
        restorable: true,
        columns: [
            {
                key: "name",
                label: "Nombre",
                render: (item) => (
                    <span className="font-medium">{item.name}</span>
                ),
            },
            {
                key: "email",
                label: "Email",
                render: (item) => item.email || "—",
            },
            {
                key: "document_id",
                label: "Documento",
                render: (item) => item.document_id || "—",
            },
            {
                key: "phone",
                label: "Teléfono",
                render: (item) => item.phone || "—",
            },
        ],
    },
    products: {
        title: "Productos eliminados",
        description: "Productos que han sido eliminados del sistema",
        restorable: true,
        columns: [
            {
                key: "name",
                label: "Nombre",
                render: (item) => (
                    <span className="font-medium">{item.name}</span>
                ),
            },
            {
                key: "sku",
                label: "SKU",
                render: (item) => item.sku || "—",
            },
            {
                key: "category",
                label: "Categoría",
                render: (item) => item.category?.name || "—",
            },
            {
                key: "sale_price",
                label: "Precio Venta",
                render: (item) => formatCurrency(Number(item.sale_price || 0)),
            },
        ],
    },
};

export default function TrashIndex() {
    const { auth, type: pageType } = usePage<
        SharedData & { type: TrashType }
    >().props;
    const user = auth.user;
    const { toast } = useToast();

    const trashType = pageType as TrashType;
    const config = TYPE_CONFIGS[trashType];

    const canRestore =
        config.restorable &&
        (isSuperAdmin(user) || hasPermission("trash.restore", user));

    const [items, setItems] = useState<Record<string, any>[]>([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [confirmRestore, setConfirmRestore] = useState<Record<
        string,
        any
    > | null>(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset page when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    // Fetch trashed items
    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await trashApi.getAll(trashType, {
                search: debouncedSearch || undefined,
                page,
                per_page: 15,
            });
            setItems(data.items.data);
            setLastPage(data.items.last_page);
            setTotal(data.items.total);
        } catch (error: any) {
            toast({
                title: "Error",
                description:
                    error?.message || "Error al cargar los registros",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [trashType, debouncedSearch, page]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleRestore = async (item: Record<string, any>) => {
        setRestoring(item.id);
        try {
            await trashApi.restore(trashType, item.id);
            toast({
                title: "Restaurado",
                description: "El registro ha sido restaurado exitosamente.",
            });
            fetchItems();
        } catch (error: any) {
            toast({
                title: "Error",
                description:
                    error?.message || "Error al restaurar el registro",
                variant: "destructive",
            });
        } finally {
            setRestoring(null);
            setConfirmRestore(null);
        }
    };

    const getItemName = (item: Record<string, any>) => {
        return (
            item.name ||
            item.invoice_number ||
            item.sku ||
            `#${item.id}`
        );
    };

    return (
        <AppLayout title={config.title}>
            <Head title={config.title} />

            <div className="space-y-6">
                <Card className="shadow-sm p-4 sm:p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.visit("/admin/profile")}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-red-500/15">
                                <Trash2 className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold">
                                    {config.title}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {config.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Spinner size="lg" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                                <Trash2 className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-medium text-foreground">
                                No hay registros
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {debouncedSearch
                                    ? "No se encontraron resultados para tu búsqueda"
                                    : "No hay registros eliminados en esta sección"}
                            </p>
                            {debouncedSearch && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => setSearch("")}
                                >
                                    Limpiar búsqueda
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {config.columns.map((col) => (
                                                <TableHead key={col.key}>
                                                    {col.label}
                                                </TableHead>
                                            ))}
                                            <TableHead>
                                                {trashType === "sales"
                                                    ? "Anulada el"
                                                    : "Eliminado el"}
                                            </TableHead>
                                            {canRestore && (
                                                <TableHead className="text-right">
                                                    Acciones
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id}>
                                                {config.columns.map((col) => (
                                                    <TableCell key={col.key}>
                                                        {col.render(item)}
                                                    </TableCell>
                                                ))}
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDateTime(
                                                            item.deleted_at,
                                                        )}
                                                    </span>
                                                </TableCell>
                                                {canRestore && (
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setConfirmRestore(
                                                                    item,
                                                                )
                                                            }
                                                            disabled={
                                                                restoring ===
                                                                item.id
                                                            }
                                                        >
                                                            <RotateCcw className="h-4 w-4 mr-1" />
                                                            Restaurar
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {lastPage > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        {total} resultado
                                        {total !== 1 ? "s" : ""}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={page <= 1}
                                            onClick={() =>
                                                setPage((p) => p - 1)
                                            }
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        {Array.from(
                                            {
                                                length: Math.min(lastPage, 5),
                                            },
                                            (_, i) => {
                                                const startPage = Math.max(
                                                    1,
                                                    Math.min(
                                                        page - 2,
                                                        lastPage - 4,
                                                    ),
                                                );
                                                const pageNum = startPage + i;
                                                if (pageNum > lastPage)
                                                    return null;
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={
                                                            pageNum === page
                                                                ? "outline"
                                                                : "ghost"
                                                        }
                                                        size="icon"
                                                        onClick={() =>
                                                            setPage(pageNum)
                                                        }
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            },
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={page >= lastPage}
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            {/* Restore Confirmation Dialog */}
            {canRestore && (
                <AlertDialog
                    open={!!confirmRestore}
                    onOpenChange={(open) => !open && setConfirmRestore(null)}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Restaurar registro
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que deseas restaurar{" "}
                                <span className="font-medium text-foreground">
                                    {confirmRestore
                                        ? getItemName(confirmRestore)
                                        : ""}
                                </span>
                                ? Volverá a estar disponible en el sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() =>
                                    confirmRestore &&
                                    handleRestore(confirmRestore)
                                }
                                disabled={restoring !== null}
                            >
                                {restoring !== null ? (
                                    <>
                                        <Spinner
                                            size="sm"
                                            className="mr-2"
                                        />
                                        Restaurando...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="h-4 w-4 mr-2" />
                                        Restaurar
                                    </>
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </AppLayout>
    );
}
