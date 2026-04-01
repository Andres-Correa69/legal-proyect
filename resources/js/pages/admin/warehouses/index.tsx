import { Head, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import {
  Plus,
  Trash2,
  Warehouse,
  MapPin,
  Building2,
  Search,
  MoreVertical,
  Pencil,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { warehousesApi, branchesApi, locationsApi, type Warehouse as WarehouseType, type Branch, type Location as LocationType } from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { User } from "@/types";

interface FormErrors {
  name?: string;
  code?: string;
  branch_id?: string;
  address?: string;
  [key: string]: string | undefined;
}

export default function WarehousesIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canManage = isSuperAdmin(user) || hasPermission('warehouses.manage', user);

  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewWarehouse, setViewWarehouse] = useState<WarehouseType | null>(null);
  const [viewLocations, setViewLocations] = useState<LocationType[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    branch_id: '',
    address: '',
    is_active: true,
    is_default: false,
  });

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warehousesData, branchesData] = await Promise.all([
        warehousesApi.getAll({ company_id: companyFilter.companyIdParam }),
        branchesApi.getAll(),
      ]);
      setWarehouses(warehousesData);
      setBranches(branchesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrors({});

    try {
      const data = {
        ...formData,
        branch_id: parseInt(formData.branch_id),
      };

      if (editingWarehouse) {
        const updatedWarehouse = await warehousesApi.update(editingWarehouse.id, data);
        setWarehouses(prev =>
          prev.map(w => w.id === editingWarehouse.id ? updatedWarehouse : w)
        );
      } else {
        const newWarehouse = await warehousesApi.create(data);
        setWarehouses(prev => [...prev, newWarehouse]);
      }

      closeDialog();
    } catch (error: unknown) {
      console.error('Error saving warehouse:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (warehouse: WarehouseType) => {
    setWarehouseToDelete(warehouse);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!warehouseToDelete) return;
    try {
      setDeleting(true);
      await warehousesApi.delete(warehouseToDelete.id);
      setWarehouses(prev => prev.filter(w => w.id !== warehouseToDelete.id));
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      alert('No se puede eliminar la bodega. Puede que tenga ubicaciones asociadas.');
    } finally {
      setDeleting(false);
    }
  };

  const openViewDialog = async (warehouse: WarehouseType) => {
    setViewWarehouse(warehouse);
    setViewLoading(true);
    try {
      const locs = await locationsApi.getAll(warehouse.id);
      setViewLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
      setViewLocations([]);
    } finally {
      setViewLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      code: '',
      branch_id: branches[0]?.id.toString() || '',
      address: '',
      is_active: true,
      is_default: false,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || '',
      branch_id: warehouse.branch_id.toString(),
      address: warehouse.address || '',
      is_active: warehouse.is_active,
      is_default: warehouse.is_default,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingWarehouse(null);
    setFormData({
      name: '',
      code: '',
      branch_id: '',
      address: '',
      is_active: true,
      is_default: false,
    });
    setErrors({});
  };

  const stats = useMemo(() => {
    const active = warehouses.filter(w => w.is_active).length;
    const inactive = warehouses.length - active;
    const locations = warehouses.reduce((sum, w) => sum + ((w as any).locations_count || 0), 0);
    return { total: warehouses.length, active, inactive, locations };
  }, [warehouses]);

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(warehouse => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        warehouse.name.toLowerCase().includes(term) ||
        warehouse.code?.toLowerCase().includes(term) ||
        warehouse.address?.toLowerCase().includes(term);
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activa' ? warehouse.is_active : !warehouse.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [warehouses, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredWarehouses.length);
  const paginatedWarehouses = filteredWarehouses.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  return (
    <AppLayout title="Bodegas">
      <Head title="Bodegas" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Warehouse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Bodegas</h1>
                <p className="text-sm text-muted-foreground">Gestiona tus bodegas y puntos de almacenamiento</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Warehouse className="h-4 w-4 text-primary" />
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
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Ubicaciones</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.locations}</p>
                </CardContent>
              </Card>
            </div>
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
        {/* Main Card */}
        <Card className="shadow-xl">
          <CardContent className="p-4 sm:p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar bodegas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="inactiva">Inactivas</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Bodega
                </Button>
              )}
            </div>

            {/* Count */}
            {!loading && filteredWarehouses.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Mostrando {startIndex + 1}-{endIndex} de {filteredWarehouses.length}
              </p>
            )}

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : paginatedWarehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus ? 'No se encontraron bodegas' : 'No hay bodegas registradas'}
                </p>
                {canManage && !searchTerm && !filterStatus && (
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera bodega
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedWarehouses.map((warehouse) => (
                  <div key={warehouse.id} className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                          <Warehouse className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{warehouse.name}</p>
                            {warehouse.code && <span className="text-xs text-muted-foreground font-mono">{warehouse.code}</span>}
                            <Badge className={`${warehouse.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                              {warehouse.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            {warehouse.is_default && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 border text-[10px]">Principal</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {warehouse.branch && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{warehouse.branch.name}</span>}
                            {warehouse.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /><span className="truncate max-w-[200px]">{warehouse.address}</span></span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(warehouse)} title="Ver ubicaciones">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card z-50">
                              <DropdownMenuItem onClick={() => openEditDialog(warehouse)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(warehouse)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filas por pagina:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </>)}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              {editingWarehouse ? 'Editar Bodega' : 'Nueva Bodega'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div>
              <Label htmlFor="name" className="mb-3 block">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Bodega Principal"
                disabled={formLoading}
                required
              />
              <InputError message={errors.name} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code" className="mb-3 block">Codigo</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="BOD-001"
                  disabled={formLoading}
                />
                <InputError message={errors.code} />
              </div>

              <div>
                <Label htmlFor="branch_id" className="mb-3 block">Sucursal *</Label>
                <Combobox
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                  disabled={formLoading}
                  placeholder="Seleccionar sucursal"
                  searchPlaceholder="Buscar sucursal..."
                  emptyText="No se encontraron sucursales"
                  options={branches.map((branch) => ({
                    value: branch.id.toString(),
                    label: branch.name,
                  }))}
                />
                <InputError message={errors.branch_id} />
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="mb-3 block">Direccion</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle 123 #45-67, Ciudad"
                disabled={formLoading}
                rows={2}
              />
              <InputError message={errors.address} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                disabled={formLoading}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="is_default" className="font-normal">Bodega por defecto</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {editingWarehouse ? 'Guardar Cambios' : 'Crear Bodega'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Warehouse Locations Dialog */}
      <Dialog open={!!viewWarehouse} onOpenChange={(open) => !open && setViewWarehouse(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Ubicaciones en &quot;{viewWarehouse?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8" />
              </div>
            ) : viewLocations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No hay ubicaciones en esta bodega</p>
              </div>
            ) : (
              <div className="space-y-2">
                {viewLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{loc.name}</p>
                        {loc.code && <span className="text-xs text-muted-foreground font-mono">{loc.code}</span>}
                      </div>
                      {loc.parent && (
                        <p className="text-xs text-muted-foreground">Dentro de: {loc.parent.name}</p>
                      )}
                    </div>
                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tipo</p>
                        <Badge className={`${
                          loc.type === 'zone' ? 'bg-blue-500/15 text-blue-700' :
                          loc.type === 'aisle' ? 'bg-green-500/15 text-green-700' :
                          loc.type === 'shelf' ? 'bg-orange-500/15 text-orange-700' :
                          'bg-purple-500/15 text-purple-700'
                        } border text-[10px]`}>
                          {loc.type === 'zone' ? 'Zona' : loc.type === 'aisle' ? 'Pasillo' : loc.type === 'shelf' ? 'Estante' : 'Contenedor'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Productos</p>
                        <p className="text-sm font-semibold">{loc.products_count || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar bodega</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar la bodega "{warehouseToDelete?.name}"? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
