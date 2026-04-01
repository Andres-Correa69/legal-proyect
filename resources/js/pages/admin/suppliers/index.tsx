import { Head, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { suppliersApi, type Supplier } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Search,
  Eye,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Truck,
  MapPin,
  UserCircle,
  Upload,
} from "lucide-react";

type SortOption = "name_asc" | "name_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

export default function SuppliersIndex() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const { toast } = useToast();

  // Unique municipalities for filter
  const uniqueCities = useMemo(() => {
    return [...new Set(suppliers.map(s => s.municipality?.name).filter(Boolean))] as string[];
  }, [suppliers]);

  // Client-side filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        supplier.name.toLowerCase().includes(term) ||
        supplier.email?.toLowerCase().includes(term) ||
        supplier.tax_id?.toLowerCase().includes(term) ||
        supplier.phone?.toLowerCase().includes(term) ||
        supplier.contact_name?.toLowerCase().includes(term);

      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activo' ? supplier.is_active : !supplier.is_active);

      const matchesCity = filterCity === '' || filterCity === 'todos' || supplier.municipality?.name === filterCity;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [suppliers, searchTerm, filterStatus, filterCity]);

  // Client-side sorting
  const sortedSuppliers = useMemo(() => {
    return [...filteredSuppliers].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [filteredSuppliers, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedSuppliers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSuppliers = sortedSuppliers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCity, sortBy, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await suppliersApi.getAll({ company_id: companyFilter.companyIdParam });
      setSuppliers(data);
    } catch (error: any) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
    try {
      await suppliersApi.delete(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast({ title: "Proveedor eliminado", description: "El proveedor fue eliminado exitosamente" });
    } catch (error: any) {
      const msg = error?.message || 'No se pudo eliminar el proveedor';
      toast({ title: "Error", description: msg, variant: "destructive" });
      await loadData();
    }
  };

  return (
    <AppLayout title="Proveedores">
      <Head title="Proveedores" />
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
      <Card className="shadow-xl p-4 sm:p-6">

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, NIT, teléfono o email..."
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
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Municipio" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="todos">Todos</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => router.visit('/admin/bulk-import?type=suppliers')}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </Button>

              <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => router.visit('/admin/suppliers/create')}>
                <Plus className="h-4 w-4" />
                Nuevo Proveedor
              </Button>
            </div>
          </div>

          {/* Supplier Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedSuppliers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterStatus ? 'No se encontraron proveedores con los filtros seleccionados' : 'No hay proveedores registrados'}
                  </div>
                ) : (
                  paginatedSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                    >
                      {/* Mobile Layout (< 768px) */}
                      <div className="md:hidden">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              <Truck className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => router.visit(`/admin/suppliers/${supplier.id}`)}
                                className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate text-left flex-1 min-w-0"
                              >
                                {supplier.name}
                              </button>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => router.visit(`/admin/suppliers/${supplier.id}`)}
                                  className="h-7 w-7"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.visit(`/admin/suppliers/${supplier.id}/edit`)}>
                                      <Edit className="h-4 w-4 text-primary" />
                                      <span className="text-primary">Editar proveedor</span>
                                    </DropdownMenuItem>
                                    {supplier.email && (
                                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`mailto:${supplier.email}`, '_blank')}>
                                        <Mail className="h-4 w-4 text-primary" />
                                        <span className="text-primary">Enviar correo</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(supplier.id)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span>Eliminar proveedor</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {supplier.document_type && supplier.tax_id && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {supplier.document_type}: {supplier.tax_id}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant={supplier.is_active ? "default" : "secondary"}
                                className={supplier.is_active ? "bg-green-500/100" : ""}>
                                {supplier.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Mobile - Details Grid */}
                        <div className="grid grid-cols-2 gap-2 w-full pt-3 mt-3 border-t">
                          {supplier.contact_name && (
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserCircle className="h-3 w-3" /> Contacto
                              </p>
                              <p className="text-sm font-medium">{supplier.contact_name}</p>
                            </div>
                          )}
                          {supplier.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Teléfono
                              </p>
                              <p className="text-sm font-medium">{supplier.phone}</p>
                            </div>
                          )}
                          {supplier.email && (
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Email
                              </p>
                              <p className="text-sm font-medium truncate">{supplier.email}</p>
                            </div>
                          )}
                          {supplier.municipality?.name && (
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Municipio
                              </p>
                              <p className="text-sm font-medium">{supplier.municipality.name}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout (>= 768px) */}
                      <div className="hidden md:block">
                        <div className="flex items-center gap-4">
                          {/* Supplier Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                <Truck className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <button
                                onClick={() => router.visit(`/admin/suppliers/${supplier.id}`)}
                                className="text-primary hover:text-primary/80 hover:underline font-semibold truncate block text-left"
                              >
                                {supplier.name}
                              </button>
                              {supplier.document_type && supplier.tax_id && (
                                <p className="text-xs text-muted-foreground">
                                  {supplier.document_type}: {supplier.tax_id}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={supplier.is_active ? "default" : "secondary"}
                                  className={supplier.is_active ? "bg-green-500/100" : ""}>
                                  {supplier.is_active ? "Activo" : "Inactivo"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Contact - hidden on tablet, visible on lg */}
                          <div className="hidden lg:block flex-shrink-0 w-40">
                            <p className="text-xs text-muted-foreground">Contacto</p>
                            {supplier.contact_name && (
                              <p className="text-sm font-medium flex items-center gap-1">
                                <UserCircle className="h-3 w-3" /> {supplier.contact_name}
                              </p>
                            )}
                            {supplier.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {supplier.phone}
                              </p>
                            )}
                          </div>

                          {/* Email */}
                          <div className="hidden lg:block flex-shrink-0 w-44">
                            <p className="text-xs text-muted-foreground">Email</p>
                            <p className="text-sm font-medium truncate">
                              {supplier.email || "—"}
                            </p>
                          </div>

                          {/* Municipality */}
                          <div className="flex-shrink-0 w-32">
                            <p className="text-xs text-muted-foreground">Municipio</p>
                            <p className="text-sm font-medium truncate">
                              {supplier.municipality?.name || "—"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => router.visit(`/admin/suppliers/${supplier.id}`)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.visit(`/admin/suppliers/${supplier.id}/edit`)}>
                                  <Edit className="h-4 w-4 text-primary" />
                                  <span className="text-primary">Editar proveedor</span>
                                </DropdownMenuItem>
                                {supplier.email && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`mailto:${supplier.email}`, '_blank')}>
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Enviar correo</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(supplier.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span>Eliminar proveedor</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Footer */}
            {!loading && sortedSuppliers.length > 0 && (
              <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando <span className="font-semibold">{sortedSuppliers.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedSuppliers.length)}</span> de{" "}
                    <span className="font-semibold">{sortedSuppliers.length}</span> proveedores.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Mostrar:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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
                    <span className="text-sm text-muted-foreground">por página</span>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground whitespace-nowrap">
                      Página <span className="font-medium">{safePage}</span> de <span className="font-medium">{totalPages}</span>
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
                            {page === 'ellipsis' ? (
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
            {!loading && (
              <Card className="bg-muted/30 mt-6">
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Proveedores</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">{filteredSuppliers.length}</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Activos</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {filteredSuppliers.filter(s => s.is_active).length}
                      </p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Inactivos</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">
                        {filteredSuppliers.filter(s => !s.is_active).length}
                      </p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Con Municipio</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {filteredSuppliers.filter(s => s.municipality?.name).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
      </Card>
      )}
      </div>

    </AppLayout>
  );
}
