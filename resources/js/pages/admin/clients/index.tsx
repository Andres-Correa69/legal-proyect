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
import { clientsApi } from "@/lib/api";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { formatCurrency } from "@/lib/utils";
import type { User } from "@/types";
import { BirthdayModal } from "@/components/client/BirthdayModal";
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Search,
  FileText,
  Eye,
  MoreVertical,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  DollarSign,
  Calendar,
  Cake,
  Upload,
} from "lucide-react";

type SortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc" | "total_desc" | "total_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "date_desc", label: "Más reciente" },
  { value: "date_asc", label: "Más antiguo" },
  { value: "total_desc", label: "Mayor facturado" },
  { value: "total_asc", label: "Menor facturado" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ClientsIndex() {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const companyFilter = useSuperAdminCompanyFilter();

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    return [...new Set(clients.map(c => c.city_name).filter(Boolean))] as string[];
  }, [clients]);

  // Client-side filtering
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        client.name.toLowerCase().includes(term) ||
        client.email.toLowerCase().includes(term) ||
        client.document_id?.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term);

      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activo' ? client.is_active : !client.is_active);

      const matchesCity = filterCity === '' || filterCity === 'todos' || client.city_name === filterCity;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [clients, searchTerm, filterStatus, filterCity]);

  // Client-side sorting
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "total_desc":
          return (Number((b as any).total_invoiced) || 0) - (Number((a as any).total_invoiced) || 0);
        case "total_asc":
          return (Number((a as any).total_invoiced) || 0) - (Number((b as any).total_invoiced) || 0);
        default:
          return 0;
      }
    });
  }, [filteredClients, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedClients.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

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

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const clientsData = await clientsApi.getAll({ company_id: companyFilter.companyIdParam });
      setClients(clientsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estas seguro de eliminar este cliente?')) return;
    try {
      await clientsApi.delete(id);
      setClients(prevClients => prevClients.filter(client => client.id !== id));
    } catch (error: any) {
      console.error('Error al eliminar cliente:', error);
      await loadData();
    }
  };

  const formatLocation = (client: User) => {
    const parts = [];
    if (client.city_name) parts.push(client.city_name);
    if (client.state_name) parts.push(client.state_name);
    return parts.join(', ');
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <AppLayout title="Clientes">
      <Head title="Clientes" />

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
                  placeholder="Buscar por nombre, CC, teléfono o email..."
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
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="todos">Todas</SelectItem>
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

              <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setBirthdayModalOpen(true)}>
                <Cake className="h-4 w-4" />
                <span className="hidden sm:inline">Cumpleaños</span>
              </Button>

              <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => router.visit('/admin/bulk-import?type=clients')}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar</span>
              </Button>

              <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => router.visit('/admin/clients/create')}>
                <Plus className="h-4 w-4" />
                Nuevo Cliente
              </Button>
            </div>
          </div>

          {/* Client Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterStatus ? 'No se encontraron clientes con los filtros seleccionados' : 'No hay clientes registrados'}
                  </div>
                ) : (
                  paginatedClients.map((client) => (
                    <div
                      key={client.id}
                      className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                    >
                      {/* Mobile Layout (< 768px) */}
                      <div className="md:hidden">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => router.visit(`/admin/clients/${client.id}`)}
                                className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate text-left flex-1 min-w-0"
                              >
                                {client.name}
                              </button>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.visit(`/admin/clients/${client.id}`)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.visit(`/admin/clients/${client.id}/edit`)}>
                                      <Edit className="h-4 w-4 text-primary" />
                                      <span className="text-primary">Editar cliente</span>
                                    </DropdownMenuItem>
                                    {client.phone && (
                                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`https://wa.me/${client.phone!.replace(/\D/g, '')}`, '_blank')}>
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                        <span className="text-primary">Enviar WhatsApp</span>
                                      </DropdownMenuItem>
                                    )}
                                    {client.email && (
                                      <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`mailto:${client.email}`, '_blank')}>
                                        <Mail className="h-4 w-4 text-primary" />
                                        <span className="text-primary">Enviar correo</span>
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(client.id)}>
                                      <Trash2 className="h-4 w-4" />
                                      <span>Eliminar cliente</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {client.document_type && client.document_id && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {client.document_type}: {client.document_id}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant={client.is_active ? "default" : "secondary"}
                                className={client.is_active ? "bg-green-500/100" : ""}>
                                {client.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Mobile - Details Grid */}
                        <div className="grid grid-cols-2 gap-2 w-full pt-3 mt-3 border-t">
                          {client.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Teléfono
                              </p>
                              <p className="text-sm font-medium">{client.phone}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Facturas
                            </p>
                            <p className="text-sm font-medium">{(client as any).invoices_count ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" /> Total facturado
                            </p>
                            <p className="text-sm font-medium text-primary">{formatCurrency(Number((client as any).total_invoiced) || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Última venta
                            </p>
                            <p className="text-sm font-medium">
                              {(client as any).last_sale_date ? formatDate((client as any).last_sale_date) : "Sin ventas"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout (>= 768px) */}
                      <div className="hidden md:block">
                        <div className="flex items-center gap-4">
                          {/* Client Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {getInitials(client.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <button
                                onClick={() => router.visit(`/admin/clients/${client.id}`)}
                                className="text-primary hover:text-primary/80 hover:underline font-semibold truncate block text-left"
                              >
                                {client.name}
                              </button>
                              {client.document_type && client.document_id && (
                                <p className="text-xs text-muted-foreground">
                                  {client.document_type}: {client.document_id}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={client.is_active ? "default" : "secondary"}
                                  className={client.is_active ? "bg-green-500/100" : ""}>
                                  {client.is_active ? "Activo" : "Inactivo"}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Contact - hidden on tablet, visible on lg */}
                          <div className="hidden lg:block flex-shrink-0 w-40">
                            <p className="text-xs text-muted-foreground">Contacto</p>
                            {client.phone && (
                              <p className="text-sm font-medium flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {client.phone}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" /> {client.email}
                            </p>
                          </div>

                          {/* Invoices Count */}
                          <div className="flex-shrink-0 w-20 text-center">
                            <p className="text-xs text-muted-foreground">Facturas</p>
                            <p className="text-lg font-semibold flex items-center justify-center gap-1">
                              <FileText className="h-4 w-4 text-primary" /> {(client as any).invoices_count ?? 0}
                            </p>
                          </div>

                          {/* Total Invoiced */}
                          <div className="flex-shrink-0 w-28 lg:w-32">
                            <p className="text-xs text-muted-foreground">Facturado</p>
                            <p className="text-sm lg:text-base font-bold text-primary truncate">
                              {formatCurrency(Number((client as any).total_invoiced) || 0)}
                            </p>
                          </div>

                          {/* Last Sale - hidden on tablet */}
                          <div className="hidden xl:block flex-shrink-0 w-28">
                            <p className="text-xs text-muted-foreground">Última Venta</p>
                            <p className="text-sm font-medium">
                              {(client as any).last_sale_date ? formatDate((client as any).last_sale_date) : "Sin ventas"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.visit(`/admin/clients/${client.id}`)}
                              className="h-9 px-3 gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden lg:inline">Ver</span>
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.visit(`/admin/clients/${client.id}/edit`)}>
                                  <Edit className="h-4 w-4 text-primary" />
                                  <span className="text-primary">Editar cliente</span>
                                </DropdownMenuItem>
                                {client.phone && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`https://wa.me/${client.phone!.replace(/\D/g, '')}`, '_blank')}>
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Enviar WhatsApp</span>
                                  </DropdownMenuItem>
                                )}
                                {client.email && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.open(`mailto:${client.email}`, '_blank')}>
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Enviar correo</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive" onClick={() => handleDelete(client.id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span>Eliminar cliente</span>
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
            {!loading && sortedClients.length > 0 && (
              <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Mostrando <span className="font-semibold">{sortedClients.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedClients.length)}</span> de{" "}
                    <span className="font-semibold">{sortedClients.length}</span> clientes.
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
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Clientes</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary">{filteredClients.length}</p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Facturas</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">
                        {filteredClients.reduce((sum, c) => sum + (Number((c as any).invoices_count) || 0), 0)}
                      </p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Facturado</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {formatCurrency(filteredClients.reduce((sum, c) => sum + (Number((c as any).total_invoiced) || 0), 0))}
                      </p>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-muted-foreground">Clientes Activos</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {filteredClients.filter(c => c.is_active).length}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
      </Card>
        )}
      </div>

      <BirthdayModal open={birthdayModalOpen} onOpenChange={setBirthdayModalOpen} />
    </AppLayout>
  );
}
