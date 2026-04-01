import { Head, router, usePage } from "@inertiajs/react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { priceListsApi, type PriceList } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  DollarSign,
  Plus,
  Trash2,
  Search,
  Eye,
  MoreVertical,
  Pencil,
  Package,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { User } from "@/types";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

export default function PriceListsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canManage = isSuperAdmin(user) || hasPermission("price-lists.manage", user);
  const { toast } = useToast();

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const companyFilter = useSuperAdminCompanyFilter();

  // Client-side filtering
  const filteredPriceLists = useMemo(() => {
    return priceLists.filter((pl) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        pl.name.toLowerCase().includes(term) ||
        (pl.description || "").toLowerCase().includes(term);

      const matchesStatus =
        filterStatus === "" ||
        filterStatus === "todos" ||
        (filterStatus === "activo" ? pl.is_active : !pl.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [priceLists, searchTerm, filterStatus]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPriceLists.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPriceLists = filteredPriceLists.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  // Stats
  const stats = useMemo(
    () => ({
      total: priceLists.length,
      active: priceLists.filter((p) => p.is_active).length,
      totalItems: priceLists.reduce((sum, p) => sum + (p.items_count || 0), 0),
      totalSales: priceLists.reduce((sum, p) => sum + ((p as any).sales_count || 0), 0),
    }),
    [priceLists]
  );

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await priceListsApi.getAll();
      setPriceLists(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las listas de precios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await priceListsApi.delete(deleteId);
      setPriceLists((prev) => prev.filter((pl) => pl.id !== deleteId));
      toast({ title: "Lista eliminada", description: "La lista de precios fue eliminada exitosamente" });
    } catch (error: any) {
      const msg = error?.message || "No se pudo eliminar la lista de precios";
      toast({ title: "Error", description: msg, variant: "destructive" });
      await loadData();
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Listas de Precios">
      <Head title="Listas de Precios" />

      <div className="space-y-6">
        {companyFilter.isSuperAdmin && (
          <SuperAdminCompanyFilter
            companies={companyFilter.companies}
            loadingCompanies={companyFilter.loadingCompanies}
            selectedCompanyId={companyFilter.selectedCompanyId}
            setSelectedCompanyId={companyFilter.setSelectedCompanyId}
            isFiltered={companyFilter.isFiltered}
            handleFilter={companyFilter.handleFilter}
            handleClear={companyFilter.handleClear}
          />
        )}

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && <SuperAdminEmptyState />}

        {companyFilter.shouldLoadData && (
          <>
            {/* Header */}
            <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
              <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                    <DollarSign className="h-5 w-5 text-[#2463eb]" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold text-foreground">Listas de Precios</h1>
                    <p className="text-sm text-muted-foreground">
                      Gestiona las listas de precios para tus productos y servicios
                    </p>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => router.visit("/admin/price-lists/create")} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nueva Lista
                    </Button>
                  )}
                </div>

                {/* Stats Cards */}
                {!loading && priceLists.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-[#2463eb]" />
                        <span className="text-xs text-muted-foreground">Total Listas</span>
                      </div>
                      <p className="text-lg font-semibold">{stats.total}</p>
                    </div>
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Activas</span>
                      </div>
                      <p className="text-lg font-semibold">{stats.active}</p>
                    </div>
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">Total Productos</span>
                      </div>
                      <p className="text-lg font-semibold">{stats.totalItems}</p>
                    </div>
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="h-4 w-4 text-purple-500" />
                        <span className="text-xs text-muted-foreground">Total Ventas</span>
                      </div>
                      <p className="text-lg font-semibold">{stats.totalSales}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filters + Table Card */}
            <Card className="shadow-xl border border-[#e1e7ef]">
              <CardContent className="p-4 sm:p-6">
                {/* Filters */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre o descripcion..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="activo">Activas</SelectItem>
                        <SelectItem value="inactivo">Inactivas</SelectItem>
                      </SelectContent>
                    </Select>

                    {canManage && (
                      <Button size="sm" onClick={() => router.visit("/admin/price-lists/create")} className="gap-2 whitespace-nowrap h-10">
                        <Plus className="h-4 w-4" />
                        Nueva Lista
                      </Button>
                    )}
                  </div>
                </div>

                {/* Content */}
                {loading ? (
                  <div className="flex items-center justify-center py-12 gap-2">
                    <Spinner className="h-5 w-5" />
                    <span className="text-muted-foreground text-sm">Cargando listas...</span>
                  </div>
                ) : paginatedPriceLists.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {priceLists.length === 0
                        ? "No hay listas de precios creadas"
                        : "No se encontraron resultados con los filtros seleccionados"}
                    </p>
                    {priceLists.length === 0 && canManage && (
                      <Button
                        size="sm"
                        onClick={() => router.visit("/admin/price-lists/create")}
                        className="mt-3 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Crear primera lista
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-12 px-4">Nombre</TableHead>
                            <TableHead className="h-12 px-4">Descripcion</TableHead>
                            <TableHead className="h-12 px-4 text-center">Productos</TableHead>
                            <TableHead className="h-12 px-4 text-center">Ventas</TableHead>
                            <TableHead className="h-12 px-4 text-center">Prioridad</TableHead>
                            <TableHead className="h-12 px-4 text-center">Estado</TableHead>
                            <TableHead className="h-12 px-4 text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPriceLists.map((pl) => (
                            <TableRow
                              key={pl.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => router.visit(`/admin/price-lists/${pl.id}`)}
                            >
                              <TableCell className="p-4 font-medium">{pl.name}</TableCell>
                              <TableCell className="p-4 text-muted-foreground text-sm max-w-[200px] truncate">
                                {pl.description || "\u2014"}
                              </TableCell>
                              <TableCell className="p-4 text-center">
                                <Badge variant="secondary" className="rounded-full">
                                  {pl.items_count || 0}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-4 text-center text-sm">
                                {(pl as any).sales_count || 0}
                              </TableCell>
                              <TableCell className="p-4 text-center text-sm">{pl.priority}</TableCell>
                              <TableCell className="p-4 text-center">
                                <Badge
                                  variant={pl.is_active ? "default" : "secondary"}
                                  className="rounded-full"
                                >
                                  {pl.is_active ? "Activa" : "Inactiva"}
                                </Badge>
                              </TableCell>
                              <TableCell className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.visit(`/admin/price-lists/${pl.id}`)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={() => router.visit(`/admin/price-lists/${pl.id}/edit`)}
                                        >
                                          <Pencil className="h-4 w-4 text-primary" />
                                          <span className="text-primary">Editar lista</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => setDeleteId(pl.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Eliminar lista</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {paginatedPriceLists.map((pl) => (
                        <div
                          key={pl.id}
                          className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-[#2463eb]/10 p-2 rounded-lg flex-shrink-0">
                              <DollarSign className="h-5 w-5 text-[#2463eb]" />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => router.visit(`/admin/price-lists/${pl.id}`)}
                                  className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate text-left flex-1 min-w-0"
                                >
                                  {pl.name}
                                </button>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.visit(`/admin/price-lists/${pl.id}`)}
                                    className="h-7 w-7"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={() => router.visit(`/admin/price-lists/${pl.id}/edit`)}
                                        >
                                          <Pencil className="h-4 w-4 text-primary" />
                                          <span className="text-primary">Editar lista</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => setDeleteId(pl.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Eliminar lista</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                              {pl.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{pl.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge
                                  variant={pl.is_active ? "default" : "secondary"}
                                  className={`rounded-full ${pl.is_active ? "bg-green-500" : ""}`}
                                >
                                  {pl.is_active ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Mobile - Details Grid */}
                          <div className="grid grid-cols-3 gap-2 w-full pt-3 mt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Package className="h-3 w-3" /> Productos
                              </p>
                              <p className="text-sm font-medium">{pl.items_count || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3" /> Ventas
                              </p>
                              <p className="text-sm font-medium">{(pl as any).sales_count || 0}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Prioridad</p>
                              <p className="text-sm font-medium">{pl.priority}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Pagination Footer */}
                {!loading && filteredPriceLists.length > 0 && (
                  <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Mostrando{" "}
                        <span className="font-semibold">
                          {filteredPriceLists.length > 0 ? startIndex + 1 : 0}-
                          {Math.min(endIndex, filteredPriceLists.length)}
                        </span>{" "}
                        de <span className="font-semibold">{filteredPriceLists.length}</span> listas.
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Mostrar:</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => setItemsPerPage(Number(value))}
                        >
                          <SelectTrigger className="w-[80px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card z-50">
                            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option.toString()}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">por pagina</span>
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          Pagina <span className="font-medium">{safePage}</span> de{" "}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(safePage - 1)}
                                disabled={safePage === 1}
                                className="gap-1"
                              >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Anterior</span>
                              </Button>
                            </PaginationItem>

                            {getPageNumbers().map((page, index) => (
                              <PaginationItem key={index} className="hidden sm:block">
                                {page === "ellipsis" ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationLink
                                    onClick={() => handlePageChange(page)}
                                    isActive={safePage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                )}
                              </PaginationItem>
                            ))}

                            <PaginationItem>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(safePage + 1)}
                                disabled={safePage === totalPages}
                                className="gap-1"
                              >
                                <span className="hidden sm:inline">Siguiente</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Stats */}
                {!loading && priceLists.length > 0 && (
                  <Card className="bg-muted/30 mt-6">
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                        <div className="text-center sm:text-left">
                          <p className="text-xs sm:text-sm text-muted-foreground">Total Listas</p>
                          <p className="text-xl sm:text-2xl font-bold text-primary">{filteredPriceLists.length}</p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-xs sm:text-sm text-muted-foreground">Activas</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-600">
                            {filteredPriceLists.filter((p) => p.is_active).length}
                          </p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-xs sm:text-sm text-muted-foreground">Inactivas</p>
                          <p className="text-xl sm:text-2xl font-bold text-amber-600">
                            {filteredPriceLists.filter((p) => !p.is_active).length}
                          </p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-xs sm:text-sm text-muted-foreground">Total Productos</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">
                            {filteredPriceLists.reduce((sum, p) => sum + (p.items_count || 0), 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar lista de precios</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara la lista y todos sus items asociados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Spinner className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
