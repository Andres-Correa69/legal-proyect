import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { branchesApi, usersApi, companiesApi } from "@/lib/api";
import type { Company, SharedData, User as UserType } from "@/types";
import type { Branch } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Mail,
  Phone,
  MapPinned,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Hash,
  Eye,
  Users,
  Shield,
  ChevronsUpDown,
  Check,
  FileText,
  Upload,
  Loader2,
} from "lucide-react";

export default function BranchesIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('branches.view', user);
  const canManage = userIsSuperAdmin;

  const initialCompanyId = !userIsSuperAdmin && user?.company_id
    ? user.company_id.toString()
    : '';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    company_id: initialCompanyId,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [companyFilterOpen, setCompanyFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [viewUsers, setViewUsers] = useState<UserType[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [rutUploading, setRutUploading] = useState(false);

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

  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const companyIdForApi = companyFilter.companyIdParam
        ?? (!userIsSuperAdmin && user?.company_id ? user.company_id : undefined);
      const branchesData = await branchesApi.getAll(companyIdForApi);
      setBranches(branchesData);

      if (userIsSuperAdmin) {
        // Companies are already loaded by the hook
        setCompanies(companyFilter.companies);
      } else if (user?.company_id) {
        setCompanies([{ id: user.company_id, name: user.company?.name || 'Mi Empresa' } as Company]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    const active = branches.filter(b => b.is_active).length;
    const inactive = branches.length - active;
    const uniqueCompanies = new Set(branches.map(b => b.company_id)).size;
    return { total: branches.length, active, inactive, companies: uniqueCompanies };
  }, [branches]);

  // Unique companies from branches for filter
  const branchCompanies = useMemo(() => {
    const map = new Map<number, string>();
    branches.forEach(b => {
      if (b.company) map.set(b.company_id, b.company.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [branches]);

  // Client-side filtering
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        branch.name.toLowerCase().includes(term) ||
        (branch.code || '').toLowerCase().includes(term) ||
        (branch.email || '').toLowerCase().includes(term) ||
        (branch.phone || '').toLowerCase().includes(term) ||
        (branch.address || '').toLowerCase().includes(term) ||
        (branch.company?.name || '').toLowerCase().includes(term);

      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activa' ? branch.is_active : !branch.is_active);

      const matchesCompany = filterCompany === '' || filterCompany === 'todos' ||
        branch.company_id.toString() === filterCompany;

      return matchesSearch && matchesStatus && matchesCompany;
    });
  }, [branches, searchTerm, filterStatus, filterCompany]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredBranches.length);
  const paginatedBranches = filteredBranches.slice(startIndex, endIndex);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id) {
      setGeneralError('Debes seleccionar una empresa');
      return;
    }
    setErrors({});
    setGeneralError('');
    setFormLoading(true);

    try {
      const data = {
        name: formData.name,
        code: formData.code || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        company_id: parseInt(formData.company_id),
        is_active: true,
      };

      if (editingBranch) {
        const updatedBranch = await branchesApi.update(editingBranch.id, data);
        setBranches(prevBranches =>
          prevBranches.map(branch =>
            branch.id === editingBranch.id ? updatedBranch : branch
          )
        );
      } else {
        const newBranch = await branchesApi.create(data);
        setBranches(prevBranches => [...prevBranches, newBranch]);
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving branch:', error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || 'Error al guardar sucursal');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    try {
      setDeleting(true);
      await branchesApi.delete(branchToDelete.id);
      setBranches(prevBranches => prevBranches.filter(branch => branch.id !== branchToDelete.id));
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      setGeneralError(error.message || 'Error al eliminar sucursal');
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    const defaultCompanyId = !userIsSuperAdmin && user?.company_id
      ? user.company_id.toString()
      : '';

    setFormData({
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      company_id: defaultCompanyId,
      is_active: true,
    });
    setEditingBranch(null);
    setErrors({});
    setGeneralError('');
  };

  const openViewDialog = async (branch: Branch) => {
    setViewBranch(branch);
    setViewLoading(true);
    try {
      const allUsers = await usersApi.getAll();
      setViewUsers(allUsers.filter(u => u.branch_id === branch.id));
    } catch (error) {
      console.error('Error loading users:', error);
      setViewUsers([]);
    } finally {
      setViewLoading(false);
    }
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || '',
      email: branch.email || '',
      phone: branch.phone || '',
      address: branch.address || '',
      company_id: branch.company_id.toString(),
      is_active: branch.is_active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  return (
    <AppLayout title="Sucursales">
      <Head title="Sucursales" />
      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Sucursales</h1>
                <p className="text-sm text-muted-foreground">Gestiona las sucursales de las empresas</p>
              </div>
            </div>
            {!loading && branches.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total</span>
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
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                      <span className="text-xs text-muted-foreground">Inactivas</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.inactive}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span className="text-xs text-muted-foreground">Empresas</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.companies}</p>
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
        {generalError && !dialogOpen && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {/* ===== Main Content ===== */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Spinner className="mr-2" />
            <span className="text-muted-foreground">Cargando sucursales...</span>
          </div>
        ) : branches.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No hay sucursales registradas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera sucursal para empezar a gestionar tus puntos de operacion
              </p>
              {canManage && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primera sucursal
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="p-4 sm:p-6">
              {/* ===== Search and Filters ===== */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, codigo, email, direccion..."
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
                    <SelectItem value="activa">Activas</SelectItem>
                    <SelectItem value="inactiva">Inactivas</SelectItem>
                  </SelectContent>
                </Select>

                {userIsSuperAdmin && branchCompanies.length > 1 && (
                  <Popover open={companyFilterOpen} onOpenChange={setCompanyFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={companyFilterOpen} className="w-full sm:w-[220px] justify-between font-normal">
                        <span className="truncate">
                          {filterCompany && filterCompany !== "todos"
                            ? branchCompanies.find(c => c.id.toString() === filterCompany)?.name || "Empresa"
                            : "Todas las empresas"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0 bg-card z-50" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar empresa..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron empresas</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos"
                              onSelect={() => { setFilterCompany("todos"); setCompanyFilterOpen(false); }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${!filterCompany || filterCompany === "todos" ? "opacity-100" : "opacity-0"}`} />
                              Todas las empresas
                            </CommandItem>
                            {branchCompanies.map(c => (
                              <CommandItem
                                key={c.id}
                                value={c.name}
                                onSelect={() => { setFilterCompany(c.id.toString()); setCompanyFilterOpen(false); }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${filterCompany === c.id.toString() ? "opacity-100" : "opacity-0"}`} />
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {canManage && (
                  <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Nueva Sucursal
                  </Button>
                )}
              </div>

              {/* ===== Count indicator ===== */}
              <p className="text-sm text-muted-foreground mb-4">
                Mostrando <span className="font-semibold">{filteredBranches.length > 0 ? startIndex + 1 : 0}-{endIndex}</span> de <span className="font-semibold">{filteredBranches.length}</span>
              </p>

              {/* ===== Branch List ===== */}
              {filteredBranches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron sucursales con los filtros seleccionados
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedBranches.map((branch) => (
                    <div key={branch.id} className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${branch.is_active ? 'bg-emerald-500/100/10' : 'bg-muted'}`}>
                            <MapPinned className={`h-4 w-4 ${branch.is_active ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-foreground">{branch.name}</p>
                              {branch.code && <span className="text-xs text-muted-foreground font-mono flex items-center gap-0.5"><Hash className="h-3 w-3" />{branch.code}</span>}
                              <Badge className={`${branch.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                                {branch.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                              {branch.company && <Badge variant="outline" className="text-[10px] gap-1"><Building2 className="h-3 w-3" />{branch.company.name}</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                              {branch.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{branch.email}</span>}
                              {branch.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{branch.phone}</span>}
                              {branch.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate max-w-[200px]">{branch.address}</span></span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(branch)} title="Ver usuarios">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                                <DropdownMenuItem onClick={() => openEditDialog(branch)}><Pencil className="h-4 w-4 mr-2" />Editar sucursal</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openDeleteDialog(branch)} className="text-red-600 focus:text-red-600"><Trash2 className="h-4 w-4 mr-2" />Eliminar sucursal</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ===== Pagination Footer ===== */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Mostrando {filteredBranches.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredBranches.length}</span>
                  <div className="flex items-center gap-2">
                    <span>Mostrar:</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>
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

      {/* ===== Create/Edit Branch Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                {editingBranch ? (
                  <Pencil className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editingBranch
                    ? 'Modifica los datos de la sucursal'
                    : 'Ingresa los datos de la nueva sucursal'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="Ej: Sucursal Norte"
                />
                <InputError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="code" className="mb-3 block">Codigo</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Ej: SUC-001"
                  disabled={formLoading}
                />
                <InputError message={errors.code} />
              </div>
            </div>
            {userIsSuperAdmin ? (
              <div>
                <Label htmlFor="company_id" className="mb-3 block">Empresa *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, company_id: value })
                  }
                  disabled={formLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
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
            ) : (
              <div>
                <Label className="mb-3 block">Empresa</Label>
                <div className="px-3 py-2 bg-muted rounded-md border">
                  <p className="text-sm font-medium">
                    {companies[0]?.name || user?.company?.name || 'Mi Empresa'}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="mb-3 block">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={formLoading}
                  placeholder="sucursal@empresa.com"
                />
                <InputError message={errors.email} />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-3 block">Telefono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={formLoading}
                  placeholder="300 123 4567"
                />
                <InputError message={errors.phone} />
              </div>
            </div>
            <div>
              <Label htmlFor="address" className="mb-3 block">Direccion</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                disabled={formLoading}
                placeholder="Calle 123 # 45 - 67"
              />
              <InputError message={errors.address} />
            </div>
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
                {editingBranch ? 'Guardar cambios' : 'Crear sucursal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== View Branch Users Dialog ===== */}
      <Dialog open={!!viewBranch} onOpenChange={(open) => !open && setViewBranch(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Usuarios en &quot;{viewBranch?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : viewUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No hay usuarios en esta sucursal</p>
              </div>
            ) : (
              <div className="space-y-2">
                {viewUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <Badge className={`${u.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Rol</p>
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Shield className="h-3 w-3" />
                          {u.roles?.[0]?.name || 'Sin rol'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RUT Section */}
          {viewBranch && canManage && (
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                RUT de la sede
              </p>
              {viewBranch.rut_url ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">RUT cargado</p>
                    <a href={viewBranch.rut_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      Ver PDF
                    </a>
                  </div>
                  <div className="flex gap-1">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" className="gap-1 pointer-events-none" disabled={rutUploading}>
                        {rutUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Reemplazar
                      </Button>
                      <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !viewBranch) return;
                        setRutUploading(true);
                        try {
                          const result = await companiesApi.uploadBranchRut(viewBranch.id, file);
                          setViewBranch({ ...viewBranch, rut_url: result.rut_url || result.data?.rut_url });
                          await loadData();
                        } catch {} finally { setRutUploading(false); }
                      }} />
                    </label>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                      if (!viewBranch || !confirm("¿Eliminar el RUT?")) return;
                      try {
                        await companiesApi.deleteBranchRut(viewBranch.id);
                        setViewBranch({ ...viewBranch, rut_url: null });
                        await loadData();
                      } catch {}
                    }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  {rutUploading ? (
                    <><Loader2 className="h-6 w-6 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Subiendo...</p></>
                  ) : (
                    <><Upload className="h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click para subir el RUT (PDF)</p></>
                  )}
                  <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !viewBranch) return;
                    setRutUploading(true);
                    try {
                      const result = await companiesApi.uploadBranchRut(viewBranch.id, file);
                      setViewBranch({ ...viewBranch, rut_url: result.rut_url || result.data?.rut_url });
                      await loadData();
                    } catch {} finally { setRutUploading(false); }
                  }} />
                </label>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sucursal</AlertDialogTitle>
            <AlertDialogDescription>
              Estas a punto de eliminar la sucursal <strong>{branchToDelete?.name}</strong>.
              Esta accion no se puede deshacer.
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
