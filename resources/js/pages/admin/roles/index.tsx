import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { Company, Permission, SharedData } from "@/types";
import type { RoleWithPermissions } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  Key,
  Search,
  CheckCircle2,
  MoreVertical,
  Users,
  Building2,
  Lock,
  Eye,
} from "lucide-react";

// Color config per role slug for visual distinction
const ROLE_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  "super-admin": { bg: "bg-red-500/100/10", icon: "text-red-600", border: "border-red-500/20" },
  "admin": { bg: "bg-indigo-500/100/10", icon: "text-indigo-600", border: "border-indigo-500/20" },
  "employee": { bg: "bg-emerald-500/100/10", icon: "text-emerald-600", border: "border-emerald-500/20" },
  "cashier": { bg: "bg-amber-500/100/10", icon: "text-amber-600", border: "border-amber-500/20" },
  "warehouse": { bg: "bg-cyan-500/100/10", icon: "text-cyan-600", border: "border-cyan-500/20" },
  "client": { bg: "bg-violet-500/10", icon: "text-violet-600", border: "border-violet-200" },
  "technician": { bg: "bg-orange-500/100/10", icon: "text-orange-600", border: "border-orange-500/20" },
};

const DEFAULT_ROLE_COLOR = { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/20" };

function getRoleColor(slug: string) {
  return ROLE_COLORS[slug] || DEFAULT_ROLE_COLOR;
}

export default function RolesIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('roles.view', user);
  const canManage = hasPermission('roles.manage', user);

  // ALL useState hooks must be declared before any conditional returns
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<RoleWithPermissions | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    company_id: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewRole, setViewRole] = useState<RoleWithPermissions | null>(null);

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [canView, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  // Auto-open create modal from sidebar "+" or ?create=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1' && canManage) {
      setDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [canManage]);

  // Return null after hooks if no permission
  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        rolesApi.getAll({ company_id: companyFilter.companyIdParam }),
        permissionsApi.getAll(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);

      if (userIsSuperAdmin) {
        // Companies are already loaded by the hook
        setCompanies(companyFilter.companies);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setFormLoading(true);

    try {
      const data: any = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || undefined,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
      };

      if (editingRole) {
        const updatedRole = await rolesApi.update(editingRole.id, data);
        setRoles(prevRoles =>
          prevRoles.map(role =>
            role.id === editingRole.id ? updatedRole : role
          )
        );
        setDialogOpen(false);
        resetForm();
      } else {
        const newRole = await rolesApi.create(data);
        setDialogOpen(false);
        resetForm();
        router.visit(`/admin/roles/${newRole.id}`);
      }
    } catch (error: any) {
      console.error('Error saving role:', error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || 'Error al guardar rol');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAssignPermissions = async () => {
    if (!selectedRoleForPermissions) return;
    setFormLoading(true);
    setGeneralError('');

    try {
      const updatedRole = await rolesApi.assignPermissions(
        selectedRoleForPermissions.id,
        selectedPermissions
      );
      setRoles(prevRoles =>
        prevRoles.map(role =>
          role.id === selectedRoleForPermissions.id ? updatedRole : role
        )
      );
      setPermissionsDialogOpen(false);
      setSelectedRoleForPermissions(null);
      setSelectedPermissions([]);
    } catch (error: any) {
      console.error('Error assigning permissions:', error);
      setGeneralError(error.message || 'Error al asignar permisos');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    try {
      setDeleting(true);
      await rolesApi.delete(roleToDelete.id);
      setRoles(prevRoles => prevRoles.filter(role => role.id !== roleToDelete.id));
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      setGeneralError(error.message || 'Error al eliminar rol');
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (role: RoleWithPermissions) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const isSystemRole = (role: RoleWithPermissions) => {
    return ['super-admin', 'employee', 'client', 'technician'].includes(role.slug);
  };

  // Summary stats
  const stats = useMemo(() => {
    const system = roles.filter(r => isSystemRole(r)).length;
    const custom = roles.length - system;
    const totalPerms = permissions.length;
    return { total: roles.length, system, custom, totalPerms };
  }, [roles, permissions]);

  // Client-side filtering
  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        role.name.toLowerCase().includes(term) ||
        role.slug.toLowerCase().includes(term) ||
        role.description?.toLowerCase().includes(term) ||
        role.company?.name?.toLowerCase().includes(term);

      const matchesType = filterType === '' || filterType === 'todos' ||
        (filterType === 'sistema' ? isSystemRole(role) : !isSystemRole(role));

      return matchesSearch && matchesType;
    });
  }, [roles, searchTerm, filterType]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredRoles.length);
  const paginatedRoles = filteredRoles.slice(startIndex, endIndex);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      company_id: '',
    });
    setEditingRole(null);
    setErrors({});
    setGeneralError('');
  };

  const openEditDialog = (role: RoleWithPermissions) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      company_id: role.company_id?.toString() || '',
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openPermissionsDialog = (role: RoleWithPermissions) => {
    setSelectedRoleForPermissions(role);
    setSelectedPermissions(role.permissions?.map(p => p.id) || []);
    setPermissionSearch('');
    setPermissionsDialogOpen(true);
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllPermissionsInGroup = (group: string, permissionsInGroup: Permission[]) => {
    const groupPermissionIds = permissionsInGroup.map(p => p.id);
    const allSelected = groupPermissionIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !groupPermissionIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...groupPermissionIds])]);
    }
  };

  // Group labels for display
  const groupLabels: Record<string, string> = {
    'dashboard': 'Dashboard',
    'sales': 'Ventas',
    'users': 'Usuarios',
    'roles': 'Roles',
    'companies': 'Empresas',
    'branches': 'Sucursales',
    'clients': 'Clientes',
    'cash-registers': 'Cajas Registradoras',
    'cash-transfers': 'Transferencias de Caja',
    'payments': 'Pagos',
    'payment-methods': 'Metodos de Pago',
    'cash-reports': 'Reportes de Caja',
    'inventory': 'Inventario',
    'products': 'Productos',
    'services': 'Servicios',
    'warehouses': 'Bodegas',
    'suppliers': 'Proveedores',
    'inventory-purchases': 'Compras',
    'inventory-transfers': 'Transferencias de Inventario',
    'inventory-adjustments': 'Ajustes de Inventario',
    'inventory-movements': 'Movimientos',
    'reports': 'Reportes',
    'audit': 'Auditoria',
    'settings': 'Configuracion',
    'electronic-invoicing': 'Facturacion Electronica',
    'accounting': 'Contabilidad',
    'appointments': 'Calendario y Citas',
  };

  // Filter permissions by search, then group
  const filteredPermissions = permissionSearch.trim()
    ? permissions.filter(p =>
        p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.slug.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        (groupLabels[p.group || ''] || p.group || '').toLowerCase().includes(permissionSearch.toLowerCase())
      )
    : permissions;

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const group = permission.group || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <AppLayout title="Roles">
      <Head title="Roles" />
      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Roles y Permisos</h1>
                <p className="text-sm text-muted-foreground">Gestiona los roles y permisos del sistema</p>
              </div>
            </div>
            {!loading && roles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Roles</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                      <span className="text-xs text-muted-foreground">Del Sistema</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.system}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                      <span className="text-xs text-muted-foreground">Personalizados</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.custom}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span className="text-xs text-muted-foreground">Permisos Totales</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.totalPerms}</p>
                  </CardContent>
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
        <>
        {/* ===== Error Banner ===== */}
        {generalError && !dialogOpen && !permissionsDialogOpen && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {/* ===== Roles List ===== */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Spinner className="mr-2" />
            <span className="text-muted-foreground">Cargando roles...</span>
          </div>
        ) : roles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No hay roles registrados</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer rol para empezar a gestionar permisos
              </p>
              {canManage && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer rol
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="p-4 sm:p-6">
              {/* Search/filters toolbar */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, slug o descripcion..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sistema">Del sistema</SelectItem>
                    <SelectItem value="personalizado">Personalizados</SelectItem>
                  </SelectContent>
                </Select>

                {canManage && (
                  <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Nuevo Rol
                  </Button>
                )}
              </div>

              {/* Showing count */}
              <div className="text-sm text-muted-foreground mb-3">
                Mostrando {filteredRoles.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredRoles.length}
              </div>

              {/* List rows */}
              {filteredRoles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron roles con los filtros seleccionados
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedRoles.map((role) => {
                    const color = getRoleColor(role.slug);
                    const system = isSystemRole(role);
                    const permCount = role.permissions?.length || 0;

                    return (
                      <div
                        key={role.id}
                        className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${color.bg}`}>
                              {system ? (
                                <ShieldAlert className={`h-4 w-4 ${color.icon}`} />
                              ) : (
                                <ShieldCheck className={`h-4 w-4 ${color.icon}`} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-foreground">{role.name}</p>
                                {system && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Lock className="h-3 w-3" />
                                    Sistema
                                  </Badge>
                                )}
                                {role.company && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {role.company.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {role.description || role.slug}
                              </p>
                              {/* Permission tags inline */}
                              {role.permissions && role.permissions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {role.permissions.slice(0, 3).map((p) => (
                                    <Badge
                                      key={p.id}
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0 h-5 font-normal"
                                    >
                                      {p.name}
                                    </Badge>
                                  ))}
                                  {role.permissions.length > 3 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0 h-5 cursor-pointer"
                                      onClick={() => openPermissionsDialog(role)}
                                    >
                                      +{role.permissions.length - 3} mas
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[11px] text-muted-foreground">Permisos</p>
                              <p className="font-bold text-sm">{permCount}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.visit(`/admin/roles/${role.id}`)} title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                                  <DropdownMenuItem onClick={() => router.visit(`/admin/roles/${role.id}`)}>
                                    <Key className="h-4 w-4 mr-2" />
                                    Gestionar permisos
                                  </DropdownMenuItem>
                                  {!system && (
                                    <>
                                      <DropdownMenuItem onClick={() => openEditDialog(role)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar rol
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openDeleteDialog(role)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar rol
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Mostrando {filteredRoles.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredRoles.length}</span>
                  <div className="flex items-center gap-2">
                    <span>Mostrar:</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(v) => {
                        setItemsPerPage(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>

      {/* ===== Create/Edit Role Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                {editingRole ? (
                  <Pencil className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editingRole
                    ? 'Modifica los datos del rol'
                    : 'Ingresa los datos del nuevo rol'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {generalError && (
              <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                {generalError}
              </div>
            )}
            <div>
              <Label htmlFor="name" className="mb-3 block">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={formLoading}
                placeholder="Ej: Gerente de Ventas"
              />
              <InputError message={errors.name} />
            </div>
            <div>
              <Label htmlFor="slug" className="mb-3 block">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="Se genera automaticamente si se deja vacio"
                disabled={formLoading}
              />
              <InputError message={errors.slug} />
            </div>
            <div>
              <Label htmlFor="description" className="mb-3 block">Descripcion</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={formLoading}
                placeholder="Descripcion del rol (opcional)"
              />
              <InputError message={errors.description} />
            </div>
            {userIsSuperAdmin && (
              <div>
                <Label htmlFor="company_id" className="mb-3 block">Empresa (opcional)</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, company_id: value === 'none' ? '' : value })
                  }
                  disabled={formLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol del sistema (sin empresa)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="none">Rol del sistema</SelectItem>
                    {companies.map((company) => (
                      <SelectItem
                        key={company.id}
                        value={company.id.toString()}
                      >
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <InputError message={errors.company_id} />
              </div>
            )}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Spinner className="mr-2" size="sm" />}
                {editingRole ? 'Guardar cambios' : 'Crear rol'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Permissions Dialog ===== */}
      <Dialog open={permissionsDialogOpen} onOpenChange={(open) => {
        setPermissionsDialogOpen(open);
        if (!open) {
          setSelectedRoleForPermissions(null);
          setSelectedPermissions([]);
          setPermissionSearch('');
        }
      }}>
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col p-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-lg">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg">
                    Permisos de {selectedRoleForPermissions?.name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedPermissions.length} de {permissions.length} permisos seleccionados
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar permiso por nombre, grupo o descripcion..."
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {generalError && (
            <div className="mx-6 mt-4 rounded-md bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
              {generalError}
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {Object.keys(groupedPermissions).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron permisos con "{permissionSearch}"
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([group, perms]) => {
                const selectedInGroup = perms.filter(p => selectedPermissions.includes(p.id)).length;
                const allSelected = perms.every(p => selectedPermissions.includes(p.id));

                return (
                  <div key={group} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{groupLabels[group] || group}</h4>
                        <Badge variant={selectedInGroup === perms.length ? "default" : "secondary"} className="text-xs">
                          {selectedInGroup}/{perms.length}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleAllPermissionsInGroup(group, perms)}
                      >
                        {allSelected ? 'Quitar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0">
                      {perms.map((permission) => {
                        const isSelected = selectedPermissions.includes(permission.id);
                        return (
                          <label
                            key={permission.id}
                            htmlFor={`permission-${permission.id}`}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'bg-blue-500/10/50' : ''}`}
                          >
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={isSelected}
                              onCheckedChange={() => togglePermission(permission.id)}
                              disabled={formLoading}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-medium leading-none">
                                {permission.name}
                              </span>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {permission.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-blue-600 ml-auto shrink-0 mt-0.5" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedPermissions.length}</span> permisos seleccionados
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPermissionsDialogOpen(false);
                  setSelectedRoleForPermissions(null);
                  setSelectedPermissions([]);
                }}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleAssignPermissions} disabled={formLoading}>
                {formLoading && <Spinner className="mr-2" size="sm" />}
                Guardar Permisos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== View Role Details Dialog ===== */}
      <Dialog open={!!viewRole} onOpenChange={(open) => !open && setViewRole(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Detalle del Rol &quot;{viewRole?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {viewRole && (() => {
              const color = getRoleColor(viewRole.slug);
              const system = isSystemRole(viewRole);
              const rolePermissions = viewRole.permissions || [];

              // Group permissions for display
              const grouped = rolePermissions.reduce((acc, p) => {
                const group = p.group || 'General';
                if (!acc[group]) acc[group] = [];
                acc[group].push(p);
                return acc;
              }, {} as Record<string, Permission[]>);

              return (
                <div className="space-y-4">
                  {/* Role info */}
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Slug</p>
                        <p className="font-mono text-xs">{viewRole.slug}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tipo</p>
                        <Badge className={`${system ? 'bg-amber-500/15 text-amber-700 border-amber-500/20' : 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20'} border text-[10px]`}>
                          {system ? 'Sistema' : 'Personalizado'}
                        </Badge>
                      </div>
                      {viewRole.description && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-muted-foreground">Descripcion</p>
                          <p className="text-sm">{viewRole.description}</p>
                        </div>
                      )}
                      {viewRole.company && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Empresa</p>
                          <p className="font-medium">{viewRole.company.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total Permisos</p>
                        <p className="font-semibold">{rolePermissions.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions grouped */}
                  {rolePermissions.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium mb-2">Permisos ({rolePermissions.length})</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {Object.entries(grouped).map(([group, perms]) => (
                          <div key={group} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                              <span className="text-xs font-semibold">{groupLabels[group] || group}</span>
                              <Badge variant="secondary" className="text-[10px]">{perms.length}</Badge>
                            </div>
                            <div className="px-3 py-2 flex flex-wrap gap-1">
                              {perms.map(p => (
                                <Badge key={p.id} variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                                  {p.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No tiene permisos asignados</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              Estas a punto de eliminar el rol <strong>{roleToDelete?.name}</strong>.
              Esta accion no se puede deshacer. Los usuarios con este rol perderan los permisos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
