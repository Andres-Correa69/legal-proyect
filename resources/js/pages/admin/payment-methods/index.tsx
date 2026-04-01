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
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { paymentMethodsApi, cashRegistersApi, type PaymentMethod, type CashRegister } from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Hash,
  Star,
  FileText,
  Eye,
  Banknote,
  Building2,
} from "lucide-react";

export default function PaymentMethodsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('payment-methods.view', user);
  const canManage = hasPermission('payment-methods.manage', user);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMethod, setViewMethod] = useState<PaymentMethod | null>(null);
  const [viewCashRegisters, setViewCashRegisters] = useState<CashRegister[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

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
      const methodsData = await paymentMethodsApi.getAll({ company_id: companyFilter.companyIdParam });
      setPaymentMethods(methodsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const isSystemMethod = (method: PaymentMethod): boolean => {
    return !method.company_id;
  };

  // Summary stats
  const stats = useMemo(() => {
    const active = paymentMethods.filter(m => m.is_active).length;
    const inactive = paymentMethods.length - active;
    const system = paymentMethods.filter(m => isSystemMethod(m)).length;
    const custom = paymentMethods.length - system;
    return { total: paymentMethods.length, active, inactive, system, custom };
  }, [paymentMethods]);

  // Client-side filtering
  const filteredMethods = useMemo(() => {
    return paymentMethods.filter(method => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        method.name.toLowerCase().includes(term) ||
        (method.code || '').toLowerCase().includes(term) ||
        (method.description || '').toLowerCase().includes(term);

      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activo' ? method.is_active : !method.is_active);

      const matchesType = filterType === '' || filterType === 'todos' ||
        (filterType === 'sistema' ? isSystemMethod(method) : !isSystemMethod(method));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [paymentMethods, searchTerm, filterStatus, filterType]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMethods.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredMethods.length);
  const paginatedMethods = filteredMethods.slice(startIndex, endIndex);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatus, filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError('');
    setFormLoading(true);

    try {
      const data = {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        is_active: formData.is_active,
      };

      if (editingMethod) {
        const updatedMethod = await paymentMethodsApi.update(editingMethod.id, data);
        setPaymentMethods(prev =>
          prev.map(m => m.id === editingMethod.id ? updatedMethod : m)
        );
      } else {
        const newMethod = await paymentMethodsApi.create(data);
        setPaymentMethods(prev => [...prev, newMethod]);
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach(key => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || 'Error al guardar metodo de pago');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!methodToDelete) return;
    if (isSystemMethod(methodToDelete)) {
      setGeneralError('No se pueden eliminar metodos de pago del sistema');
      setDeleteDialogOpen(false);
      return;
    }

    try {
      setDeleting(true);
      await paymentMethodsApi.delete(methodToDelete.id);
      setPaymentMethods(prev => prev.filter(m => m.id !== methodToDelete.id));
      setDeleteDialogOpen(false);
      setMethodToDelete(null);
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      setGeneralError(error.message || 'Error al eliminar metodo de pago');
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (method: PaymentMethod) => {
    setMethodToDelete(method);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    setEditingMethod(null);
    setErrors({});
    setGeneralError('');
  };

  const openEditDialog = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      code: method.code || '',
      description: method.description || '',
      is_active: method.is_active,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openViewDialog = async (method: PaymentMethod) => {
    setViewMethod(method);
    setViewCashRegisters([]);
    setViewLoading(true);
    try {
      const allRegisters = await cashRegistersApi.getAll();
      setViewCashRegisters(allRegisters.filter(cr => cr.payment_method_id === method.id));
    } catch (error) {
      console.error('Error loading cash registers:', error);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <AppLayout title="Metodos de Pago">
      <Head title="Metodos de Pago" />
      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Métodos de Pago</h1>
                <p className="text-sm text-muted-foreground">Gestiona los métodos de pago disponibles</p>
              </div>
            </div>
            {!loading && paymentMethods.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                      <span className="text-xs text-muted-foreground">Activos</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span className="text-xs text-muted-foreground">Del Sistema</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.system}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-amber-500/100" />
                      <span className="text-xs text-muted-foreground">Personalizados</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.custom}</p>
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

        {companyFilter.shouldLoadData && (<>
        {/* ===== Error Banner ===== */}
        {generalError && !dialogOpen && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {/* ===== Methods List ===== */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2">
            <Spinner className="mr-2" />
            <span className="text-muted-foreground">Cargando metodos de pago...</span>
          </div>
        ) : paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No hay metodos de pago registrados</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer metodo de pago para empezar a gestionar las transacciones
              </p>
              {canManage && (
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer metodo
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardContent className="p-4 sm:p-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center mb-4">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, codigo, descripcion..."
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

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                    <SelectItem value="personalizado">Personalizados</SelectItem>
                  </SelectContent>
                </Select>

                {canManage && (
                  <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Nuevo Metodo
                  </Button>
                )}
              </div>

              {/* Count indicator */}
              <div className="text-sm text-muted-foreground mb-4">
                Mostrando {filteredMethods.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredMethods.length}
              </div>

              {/* List rows */}
              {filteredMethods.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="bg-muted/50 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No se encontraron metodos de pago con los filtros seleccionados
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedMethods.map((method) => {
                    const system = isSystemMethod(method);
                    return (
                      <div key={method.id} className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${method.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                              <CreditCard className={`h-4 w-4 ${method.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm text-foreground">{method.name}</p>
                                {method.code && <span className="text-xs text-muted-foreground font-mono flex items-center gap-0.5"><Hash className="h-3 w-3" />{method.code}</span>}
                                <Badge className={`${method.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                                  {method.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                                {system && <Badge variant="outline" className="text-[10px] gap-1"><Shield className="h-3 w-3" />Sistema</Badge>}
                                {method.is_default && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border text-[10px] gap-1"><Star className="h-3 w-3" />Predeterminado</Badge>}
                              </div>
                              {method.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{method.description}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(method)} title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                                  <DropdownMenuItem onClick={() => openEditDialog(method)}><Pencil className="h-4 w-4 mr-2" />Editar metodo</DropdownMenuItem>
                                  {!system && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDeleteDialog(method)} className="text-red-600 focus:text-red-600"><Trash2 className="h-4 w-4 mr-2" />Eliminar metodo</DropdownMenuItem>
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
                  <span>Mostrando {filteredMethods.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredMethods.length}</span>
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
                      <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </>)}
      </div>

      {/* ===== Create/Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                {editingMethod ? (
                  <Pencil className="h-5 w-5 text-primary" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {editingMethod ? 'Editar Metodo de Pago' : 'Nuevo Metodo de Pago'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {editingMethod
                    ? 'Modifica los datos del metodo de pago'
                    : 'Ingresa los datos del nuevo metodo de pago'}
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
                  placeholder="Ej: Efectivo"
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
                  placeholder="Ej: CASH, CARD"
                  disabled={formLoading}
                />
                <InputError message={errors.code} />
              </div>
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
                placeholder="Descripcion del metodo de pago"
              />
              <InputError message={errors.description} />
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
                {editingMethod ? 'Guardar cambios' : 'Crear metodo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== View Method Details Dialog ===== */}
      <Dialog open={!!viewMethod} onOpenChange={(open) => !open && setViewMethod(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Detalle de &quot;{viewMethod?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {viewMethod && (
              <>
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nombre</p>
                      <p className="font-medium">{viewMethod.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Codigo</p>
                      <p className="font-mono text-xs">{viewMethod.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Estado</p>
                      <Badge className={`${viewMethod.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                        {viewMethod.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Tipo</p>
                      <Badge className={`${isSystemMethod(viewMethod) ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-amber-500/15 text-amber-700 border-amber-500/20'} border text-[10px]`}>
                        {isSystemMethod(viewMethod) ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    </div>
                    {viewMethod.is_default && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Predeterminado</p>
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border text-[10px] gap-1">
                          <Star className="h-3 w-3" />Si
                        </Badge>
                      </div>
                    )}
                    {viewMethod.description && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground">Descripcion</p>
                        <p className="text-sm">{viewMethod.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cash Registers Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Cajas Asociadas</h4>
                    <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 border text-[10px]">
                      {viewLoading ? '...' : viewCashRegisters.length}
                    </Badge>
                  </div>
                  {viewLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2">
                      <Spinner size="sm" />
                      <span className="text-sm text-muted-foreground">Cargando cajas...</span>
                    </div>
                  ) : viewCashRegisters.length === 0 ? (
                    <div className="text-center py-6 border rounded-lg bg-muted/10">
                      <Banknote className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No hay cajas asociadas a este metodo</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                      {viewCashRegisters.map(cr => {
                        const typeLabels: Record<string, string> = { minor: 'Caja Menor', major: 'Caja Mayor', bank: 'Cuenta Bancaria' };
                        const typeColors: Record<string, string> = { minor: 'bg-blue-500/15 text-blue-700 border-blue-500/20', major: 'bg-purple-500/15 text-purple-700 border-purple-500/20', bank: 'bg-teal-500/15 text-teal-700 border-teal-500/20' };
                        return (
                          <div key={cr.id} className="border rounded-lg p-3 bg-muted/10 flex items-center gap-3">
                            <div className={`p-1.5 rounded-md shrink-0 ${cr.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Banknote className={`h-3.5 w-3.5 ${cr.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">{cr.name}</p>
                                <Badge className={`${typeColors[cr.type] || 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                                  {typeLabels[cr.type] || cr.type}
                                </Badge>
                                <Badge className={`${cr.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                                  {cr.is_active ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </div>
                              {cr.branch && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {cr.branch.name}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar metodo de pago</AlertDialogTitle>
            <AlertDialogDescription>
              Estas a punto de eliminar el metodo de pago <strong>{methodToDelete?.name}</strong>.
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
