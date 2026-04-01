import { Head, router, usePage } from "@inertiajs/react";
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
import { usersApi } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { SharedData, User } from "@/types";
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
  MessageSquare,
  Shield,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";

type SortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "date_desc", label: "Más reciente" },
  { value: "date_asc", label: "Más antiguo" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20];

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ROLE_COLORS: Record<string, string> = {
  "super-admin": "bg-red-500/100",
  admin: "bg-purple-600",
  employee: "bg-blue-500/100",
  cashier: "bg-amber-500/100",
  warehouse: "bg-teal-600",
};

export default function UsersIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const companyFilter = useSuperAdminCompanyFilter();

  // Unique roles for filter
  const uniqueRoles = useMemo(() => {
    const rolesMap = new Map<string, string>();
    users.forEach((u) => {
      u.roles?.forEach((r) => {
        if (!rolesMap.has(r.slug)) rolesMap.set(r.slug, r.name);
      });
    });
    return Array.from(rolesMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [users]);

  // Client-side filtering
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.document_id?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term);

      const matchesStatus =
        filterStatus === "" ||
        filterStatus === "todos" ||
        (filterStatus === "activo" ? user.is_active : !user.is_active);

      const matchesRole =
        filterRole === "" ||
        filterRole === "todos" ||
        user.roles?.some((r) => r.slug === filterRole);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, filterStatus, filterRole]);

  // Client-side sorting
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "date_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [filteredUsers, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterRole, sortBy, itemsPerPage]);

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

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersData = await usersApi.getAll({ company_id: companyFilter.companyIdParam });
      setUsers(usersData);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estas seguro de eliminar este usuario?")) return;
    try {
      await usersApi.delete(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (error: any) {
      console.error("Error al eliminar usuario:", error);
      await loadData();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeColor = (slug: string) => {
    return ROLE_COLORS[slug] || "bg-muted/500";
  };

  const formatLocation = (user: User) => {
    const parts = [];
    if (user.city_name) parts.push(user.city_name);
    if (user.state_name) parts.push(user.state_name);
    return parts.join(", ");
  };

  return (
    <AppLayout title="Usuarios">
      <Head title="Usuarios" />
      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Usuarios</h1>
                <p className="text-sm text-muted-foreground">Gestiona los usuarios del sistema</p>
              </div>
            </div>
            {!loading && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{filteredUsers.length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                      <span className="text-xs text-muted-foreground">Activos</span>
                    </div>
                    <p className="text-2xl font-bold">{filteredUsers.filter((u) => u.is_active).length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span className="text-xs text-muted-foreground">Inactivos</span>
                    </div>
                    <p className="text-2xl font-bold">{filteredUsers.filter((u) => !u.is_active).length}</p>
                  </div>
                </Card>
                <Card className="shadow-sm">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                      <span className="text-xs text-muted-foreground">Roles distintos</span>
                    </div>
                    <p className="text-2xl font-bold">{uniqueRoles.length}</p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

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
                placeholder="Buscar por nombre, email, documento o teléfono..."
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

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="todos">Todos</SelectItem>
                {uniqueRoles.map(([slug, name]) => (
                  <SelectItem key={slug} value={slug}>
                    {name}
                  </SelectItem>
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

            {hasPermission('users.bulk-salary', user) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 w-full sm:w-auto"
                onClick={() => router.visit("/admin/users/bulk-salary")}
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Ajuste Masivo</span>
              </Button>
            )}

            <Button
              size="sm"
              className="gap-2 w-full sm:w-auto"
              onClick={() => router.visit("/admin/users/create")}
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
        </div>

        {/* User Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="mr-2" />
            <p>Cargando...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || filterStatus || filterRole
                  ? "No se encontraron usuarios con los filtros seleccionados"
                  : "No hay usuarios registrados"}
              </div>
            ) : (
              paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                >
                  {/* Mobile Layout (< 768px) */}
                  <div className="md:hidden">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => router.visit(`/admin/users/${user.id}`)}
                            className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate text-left flex-1 min-w-0"
                          >
                            {user.name}
                          </button>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => router.visit(`/admin/users/${user.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => router.visit(`/admin/users/${user.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 text-primary" />
                                  <span className="text-primary">Editar usuario</span>
                                </DropdownMenuItem>
                                {user.phone && (
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer"
                                    onClick={() =>
                                      window.open(
                                        `https://wa.me/${user.phone!.replace(/\D/g, "")}`,
                                        "_blank",
                                      )
                                    }
                                  >
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Enviar WhatsApp</span>
                                  </DropdownMenuItem>
                                )}
                                {user.email && (
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer"
                                    onClick={() => window.open(`mailto:${user.email}`, "_blank")}
                                  >
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="text-primary">Enviar correo</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer text-destructive"
                                  onClick={() => handleDelete(user.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Eliminar usuario</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={user.is_active ? "bg-green-500/100" : ""}
                          >
                            {user.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                          {user.roles?.map((role) => (
                            <Badge
                              key={role.id}
                              variant="default"
                              className={`${getRoleBadgeColor(role.slug)} text-white text-[10px]`}
                            >
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Mobile - Details Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-3 mt-3 border-t">
                      {user.document_id && (
                        <div>
                          <p className="text-xs text-muted-foreground">Documento</p>
                          <p className="text-sm font-medium">{user.document_id}</p>
                        </div>
                      )}
                      {user.phone && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Teléfono
                          </p>
                          <p className="text-sm font-medium">{user.phone}</p>
                        </div>
                      )}
                      {user.branch && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Sucursal
                          </p>
                          <p className="text-sm font-medium">{user.branch.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Creado
                        </p>
                        <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout (>= 768px) */}
                  <div className="hidden md:block">
                    <div className="flex items-center gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <button
                            onClick={() => router.visit(`/admin/users/${user.id}`)}
                            className="text-primary hover:text-primary/80 hover:underline font-semibold truncate block text-left"
                          >
                            {user.name}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={user.is_active ? "default" : "secondary"}
                              className={user.is_active ? "bg-green-500/100" : ""}
                            >
                              {user.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Contact - hidden on tablet, visible on lg */}
                      <div className="hidden lg:block flex-shrink-0 w-40">
                        <p className="text-xs text-muted-foreground">Contacto</p>
                        {user.phone && (
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {user.phone}
                          </p>
                        )}
                        {user.document_id && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Doc: {user.document_id}
                          </p>
                        )}
                      </div>

                      {/* Roles */}
                      <div className="flex-shrink-0 w-32 lg:w-40">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                          <Shield className="h-3 w-3" /> Roles
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.map((role) => (
                            <Badge
                              key={role.id}
                              variant="default"
                              className={`${getRoleBadgeColor(role.slug)} text-white text-[10px]`}
                            >
                              {role.name}
                            </Badge>
                          ))}
                          {(!user.roles || user.roles.length === 0) && (
                            <span className="text-xs text-muted-foreground">Sin rol</span>
                          )}
                        </div>
                      </div>

                      {/* Branch */}
                      <div className="hidden xl:block flex-shrink-0 w-32">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Sucursal
                        </p>
                        <p className="text-sm font-medium truncate">
                          {user.branch?.name || "Sin asignar"}
                        </p>
                        {formatLocation(user) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3" /> {formatLocation(user)}
                          </p>
                        )}
                      </div>

                      {/* Created date */}
                      <div className="hidden xl:block flex-shrink-0 w-28">
                        <p className="text-xs text-muted-foreground">Creado</p>
                        <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.visit(`/admin/users/${user.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => router.visit(`/admin/users/${user.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 text-primary" />
                              <span className="text-primary">Editar usuario</span>
                            </DropdownMenuItem>
                            {user.phone && (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/${user.phone!.replace(/\D/g, "")}`,
                                    "_blank",
                                  )
                                }
                              >
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <span className="text-primary">Enviar WhatsApp</span>
                              </DropdownMenuItem>
                            )}
                            {user.email && (
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => window.open(`mailto:${user.email}`, "_blank")}
                              >
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-primary">Enviar correo</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-destructive"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Eliminar usuario</span>
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
        {!loading && sortedUsers.length > 0 && (
          <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Mostrando{" "}
                <span className="font-semibold">
                  {sortedUsers.length > 0 ? startIndex + 1 : 0}-
                  {Math.min(endIndex, sortedUsers.length)}
                </span>{" "}
                de <span className="font-semibold">{sortedUsers.length}</span> usuarios.
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
                <span className="text-sm text-muted-foreground">por página</span>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Página <span className="font-medium">{safePage}</span> de{" "}
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

      </Card>
        )}
      </div>
    </AppLayout>
  );
}
