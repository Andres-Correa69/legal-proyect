import { Head, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  MapPin,
  Warehouse,
  Layers,
  ChevronRight,
  Search,
  MoreVertical,
  Pencil,
  ChevronLeft,
  Eye,
  Package,
} from "lucide-react";
import {
  locationsApi,
  warehousesApi,
  type Location as LocationType,
  type Warehouse as WarehouseType,
  type LocationType as LocType,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { User } from "@/types";

interface FormErrors {
  name?: string;
  code?: string;
  warehouse_id?: string;
  type?: string;
  parent_id?: string;
  [key: string]: string | undefined;
}

const locationTypeLabels: Record<LocType, string> = {
  zone: 'Zona',
  aisle: 'Pasillo',
  shelf: 'Estante',
  bin: 'Contenedor',
};

const locationTypeColors: Record<LocType, string> = {
  zone: 'bg-blue-500/15 text-blue-700',
  aisle: 'bg-green-500/15 text-green-700',
  shelf: 'bg-orange-500/15 text-orange-700',
  bin: 'bg-purple-500/15 text-purple-700',
};

export default function LocationsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canManage = isSuperAdmin(user) || hasPermission('locations.manage', user);

  const [locations, setLocations] = useState<LocationType[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationType | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewLocation, setViewLocation] = useState<LocationType | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    warehouse_id: '',
    type: 'zone' as LocType,
    parent_id: '',
    is_active: true,
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
      const [locationsData, warehousesData] = await Promise.all([
        locationsApi.getAll({ company_id: companyFilter.companyIdParam }),
        warehousesApi.getAll({ company_id: companyFilter.companyIdParam }),
      ]);
      setLocations(locationsData);
      setWarehouses(warehousesData);
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
        warehouse_id: parseInt(formData.warehouse_id),
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      };

      if (editingLocation) {
        const updatedLocation = await locationsApi.update(editingLocation.id, data);
        setLocations(prev =>
          prev.map(l => l.id === editingLocation.id ? updatedLocation : l)
        );
      } else {
        const newLocation = await locationsApi.create(data);
        setLocations(prev => [...prev, newLocation]);
      }

      closeDialog();
    } catch (error: unknown) {
      console.error('Error saving location:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (location: LocationType) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;
    try {
      setDeleting(true);
      await locationsApi.delete(locationToDelete.id);
      setLocations(prev => prev.filter(l => l.id !== locationToDelete.id));
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('No se puede eliminar la ubicacion. Puede que tenga productos o sub-ubicaciones asociadas.');
    } finally {
      setDeleting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      code: '',
      warehouse_id: warehouses[0]?.id.toString() || '',
      type: 'zone',
      parent_id: '',
      is_active: true,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (location: LocationType) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      code: location.code || '',
      warehouse_id: location.warehouse_id.toString(),
      type: location.type,
      parent_id: location.parent_id?.toString() || '',
      is_active: location.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLocation(null);
    setFormData({
      name: '',
      code: '',
      warehouse_id: '',
      type: 'zone',
      parent_id: '',
      is_active: true,
    });
    setErrors({});
  };

  // Obtener ubicaciones que pueden ser padres (del mismo almacen, excluyendo la actual)
  const getParentOptions = () => {
    if (!formData.warehouse_id) return [];
    return locations.filter(l =>
      l.warehouse_id === parseInt(formData.warehouse_id) &&
      (!editingLocation || l.id !== editingLocation.id)
    );
  };

  const stats = useMemo(() => {
    const zones = locations.filter(l => l.type === 'zone').length;
    const aisles = locations.filter(l => l.type === 'aisle').length;
    const shelves = locations.filter(l => l.type === 'shelf' || l.type === 'bin').length;
    return { total: locations.length, zones, aisles, shelves };
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        location.name.toLowerCase().includes(term) ||
        location.code?.toLowerCase().includes(term);
      const matchesWarehouse = filterWarehouse === 'all' || location.warehouse_id.toString() === filterWarehouse;
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activa' ? location.is_active : !location.is_active);
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [locations, searchTerm, filterWarehouse, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterWarehouse, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLocations.length);
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  return (
    <AppLayout title="Ubicaciones">
      <Head title="Ubicaciones" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Ubicaciones</h1>
                <p className="text-sm text-muted-foreground">Gestiona las ubicaciones dentro de tus bodegas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                    <span className="text-xs text-muted-foreground">Zonas</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.zones}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-green-500/100" />
                    <span className="text-xs text-muted-foreground">Pasillos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.aisles}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-orange-500/100" />
                    <span className="text-xs text-muted-foreground">Estantes</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.shelves}</p>
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
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ubicaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Combobox
                value={filterWarehouse}
                onValueChange={(v) => setFilterWarehouse(v || 'all')}
                placeholder="Todas las bodegas"
                searchPlaceholder="Buscar bodega..."
                emptyText="No se encontraron bodegas"
                className="w-full sm:w-[200px]"
                options={[
                  { value: 'all', label: 'Todas las bodegas' },
                  ...warehouses.map((warehouse) => ({
                    value: warehouse.id.toString(),
                    label: warehouse.name,
                  })),
                ]}
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ubicacion
                </Button>
              )}
            </div>

            {/* Count */}
            <p className="text-xs text-muted-foreground mb-3">
              Mostrando {filteredLocations.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredLocations.length}
            </p>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : paginatedLocations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterWarehouse !== 'all' || (filterStatus && filterStatus !== 'todos')
                    ? 'No se encontraron ubicaciones'
                    : 'No hay ubicaciones registradas'}
                </p>
                {canManage && !searchTerm && filterWarehouse === 'all' && (!filterStatus || filterStatus === 'todos') && (
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera ubicacion
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{location.name}</p>
                            {location.code && (
                              <span className="text-xs text-muted-foreground font-mono">{location.code}</span>
                            )}
                            <Badge className={`${locationTypeColors[location.type]} border text-[10px]`}>
                              {locationTypeLabels[location.type]}
                            </Badge>
                            <Badge
                              className={`${
                                location.is_active
                                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20'
                                  : 'bg-muted text-muted-foreground border-border'
                              } border text-[10px]`}
                            >
                              {location.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {location.warehouse && (
                              <span className="flex items-center gap-1">
                                <Warehouse className="h-3 w-3" />
                                {location.warehouse.name}
                              </span>
                            )}
                            {location.parent && (
                              <span className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                Dentro de: {location.parent.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground">Productos</p>
                          <p className="font-bold text-sm">{location.products_count || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewLocation(location)} title="Ver detalle">
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
                              <DropdownMenuItem onClick={() => openEditDialog(location)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(location)}
                                className="text-destructive"
                              >
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

            {/* Pagination Footer */}
            {filteredLocations.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Mostrar:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
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
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </span>
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
              <MapPin className="h-5 w-5 text-primary" />
              {editingLocation ? 'Editar Ubicacion' : 'Nueva Ubicacion'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div>
              <Label htmlFor="warehouse_id" className="mb-3 block">Bodega *</Label>
              <Combobox
                value={formData.warehouse_id}
                onValueChange={(value) => setFormData({ ...formData, warehouse_id: value, parent_id: '' })}
                disabled={formLoading}
                placeholder="Seleccionar bodega"
                searchPlaceholder="Buscar bodega..."
                emptyText="No se encontraron bodegas"
                options={warehouses.map((warehouse) => ({
                  value: warehouse.id.toString(),
                  label: warehouse.name,
                }))}
              />
              <InputError message={errors.warehouse_id} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="mb-3 block">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Zona A"
                  disabled={formLoading}
                  required
                />
                <InputError message={errors.name} />
              </div>

              <div>
                <Label htmlFor="code" className="mb-3 block">Codigo</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ZA-001"
                  disabled={formLoading}
                />
                <InputError message={errors.code} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type" className="mb-3 block">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as LocType })}
                  disabled={formLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="zone">Zona</SelectItem>
                    <SelectItem value="aisle">Pasillo</SelectItem>
                    <SelectItem value="shelf">Estante</SelectItem>
                    <SelectItem value="bin">Contenedor</SelectItem>
                  </SelectContent>
                </Select>
                <InputError message={errors.type} />
              </div>

              <div>
                <Label htmlFor="parent_id" className="mb-3 block">Ubicacion Padre</Label>
                <Combobox
                  value={formData.parent_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value === 'none' ? '' : value })}
                  disabled={formLoading || !formData.warehouse_id}
                  placeholder="Sin padre (raiz)"
                  searchPlaceholder="Buscar ubicacion..."
                  emptyText="No se encontraron ubicaciones"
                  options={[
                    { value: 'none', label: 'Sin padre (raiz)' },
                    ...getParentOptions().map((loc) => ({
                      value: loc.id.toString(),
                      label: `${loc.name} (${locationTypeLabels[loc.type]})`,
                    })),
                  ]}
                />
                <InputError message={errors.parent_id} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {editingLocation ? 'Guardar Cambios' : 'Crear Ubicacion'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Location Details Dialog */}
      <Dialog open={!!viewLocation} onOpenChange={(open) => !open && setViewLocation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Detalle de &quot;{viewLocation?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {(() => {
              if (!viewLocation) return null;
              const childLocations = locations.filter(l => l.parent_id === viewLocation.id);
              return (
                <div className="space-y-4">
                  {/* Location info */}
                  <div className="border rounded-lg p-3 bg-muted/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Bodega</p>
                        <p className="font-medium">{viewLocation.warehouse?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Tipo</p>
                        <Badge className={`${locationTypeColors[viewLocation.type]} border text-[10px]`}>
                          {locationTypeLabels[viewLocation.type]}
                        </Badge>
                      </div>
                      {viewLocation.code && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Codigo</p>
                          <p className="font-mono text-xs">{viewLocation.code}</p>
                        </div>
                      )}
                      {viewLocation.parent && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Ubicacion padre</p>
                          <p className="font-medium">{viewLocation.parent.name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-muted-foreground">Productos</p>
                        <p className="font-semibold">{viewLocation.products_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Estado</p>
                        <Badge className={`${viewLocation.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                          {viewLocation.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Sub-locations */}
                  {childLocations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Sub-ubicaciones ({childLocations.length})</p>
                      <div className="space-y-2">
                        {childLocations.map((child) => (
                          <div key={child.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{child.name}</p>
                                {child.code && <span className="text-xs text-muted-foreground font-mono">{child.code}</span>}
                              </div>
                            </div>
                            <div className="flex gap-4 shrink-0 text-right">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Tipo</p>
                                <Badge className={`${locationTypeColors[child.type]} border text-[10px]`}>
                                  {locationTypeLabels[child.type]}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Productos</p>
                                <p className="text-sm font-semibold">{child.products_count || 0}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {childLocations.length === 0 && (
                    <div className="text-center py-4">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No hay sub-ubicaciones</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ubicacion</AlertDialogTitle>
            <AlertDialogDescription>
              {locationToDelete
                ? `¿Estas seguro de eliminar la ubicacion "${locationToDelete.name}"? Esta accion no se puede deshacer.`
                : ''}
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
