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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import {
  Plus,
  Trash2,
  Search,
  MoreVertical,
  Pencil,
  LayoutGrid,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { productAreasApi, productCategoriesApi, type ProductArea, type ProductCategory } from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import type { User } from "@/types";

interface FormErrors {
  name?: string;
  slug?: string;
  description?: string;
  [key: string]: string | undefined;
}

export default function ProductAreasIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canView = isSuperAdmin(user) || hasPermission('areas.view', user);
  const canManage = isSuperAdmin(user) || hasPermission('areas.manage', user);

  const [areas, setAreas] = useState<ProductArea[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ProductArea | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<ProductArea | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewArea, setViewArea] = useState<ProductArea | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadAreas();
  }, [canView]);

  const loadAreas = async () => {
    try {
      setLoading(true);
      const [areasData, categoriesData] = await Promise.all([
        productAreasApi.getAll(),
        productCategoriesApi.getAll(),
      ]);
      setAreas(areasData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrors({});

    try {
      if (editingArea) {
        const updatedArea = await productAreasApi.update(editingArea.id, formData);
        setAreas(prev =>
          prev.map(a => a.id === editingArea.id ? updatedArea : a)
        );
      } else {
        const newArea = await productAreasApi.create(formData);
        setAreas(prev => [...prev, newArea]);
      }

      closeDialog();
    } catch (error: unknown) {
      console.error('Error saving area:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (area: ProductArea) => {
    setAreaToDelete(area);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!areaToDelete) return;
    try {
      setDeleting(true);
      await productAreasApi.delete(areaToDelete.id);
      setAreas(prev => prev.filter(a => a.id !== areaToDelete.id));
      setDeleteDialogOpen(false);
      setAreaToDelete(null);
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('No se puede eliminar el area. Puede que tenga productos asociados.');
    } finally {
      setDeleting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingArea(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (area: ProductArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || '',
      is_active: area.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingArea(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setErrors({});
  };

  const stats = useMemo(() => {
    const active = areas.filter(a => a.is_active).length;
    const inactive = areas.length - active;
    const totalItems = areas.reduce((acc, a) => acc + (a.products_count || 0), 0);
    return { total: areas.length, active, inactive, totalItems };
  }, [areas]);

  const filteredAreas = useMemo(() => {
    return areas.filter(area => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        area.name.toLowerCase().includes(term) ||
        area.description?.toLowerCase().includes(term);
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activa' ? area.is_active : !area.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [areas, searchTerm, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAreas.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAreas.length);
  const paginated = filteredAreas.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <AppLayout title="Areas de Productos">
      <Head title="Areas de Productos" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Áreas</h1>
                <p className="text-sm text-muted-foreground">Gestiona las áreas de tu negocio</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="h-4 w-4 text-primary" />
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
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Items asociados</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalItems}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl p-4 sm:p-6">
          <CardContent className="p-0 space-y-4">
            {/* Toolbar: Search + Filter + Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar areas..."
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
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
              {canManage && (
                <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Area
                </Button>
              )}
            </div>

            {/* Count info */}
            {!loading && filteredAreas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Mostrando {startIndex + 1}-{endIndex} de {filteredAreas.length}
              </p>
            )}

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : filteredAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus ? 'No se encontraron areas' : 'No hay areas registradas'}
                </p>
                {canManage && !searchTerm && !filterStatus && (
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera area
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {paginated.map((area) => (
                  <div key={area.id} className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                          <LayoutGrid className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{area.name}</p>
                            <Badge className={`${area.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                              {area.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          {area.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{area.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground">Items</p>
                          <p className="font-bold text-sm">{area.products_count || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewArea(area)} title="Ver detalle">
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
                              <DropdownMenuItem onClick={() => openEditDialog(area)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(area)} className="text-destructive">
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
            {!loading && filteredAreas.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Mostrar:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((page, idx) =>
                    typeof page === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">...</span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    )
                  )}
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
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              {editingArea ? 'Editar Área' : 'Nueva Área'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div>
              <Label htmlFor="name" className="mb-3 block">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Tecnología, Alimentos..."
                disabled={formLoading}
                required
              />
              <InputError message={errors.name} />
            </div>

            <div>
              <Label htmlFor="description" className="mb-3 block">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del área..."
                disabled={formLoading}
                rows={3}
              />
              <InputError message={errors.description} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {editingArea ? 'Guardar Cambios' : 'Crear Área'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Area Categories Dialog */}
      <Dialog open={!!viewArea} onOpenChange={(open) => !open && setViewArea(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Categorías en &quot;{viewArea?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {(() => {
              const areaCategories = viewArea ? categories.filter(c => c.area_id === viewArea.id) : [];
              if (areaCategories.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">No hay categorías en esta área</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {areaCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Estado</p>
                          <Badge className={`${cat.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                            {cat.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Productos</p>
                          <p className="text-sm font-semibold">{cat.products_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar area</AlertDialogTitle>
            <AlertDialogDescription>
              {areaToDelete
                ? `Estas seguro de eliminar el area "${areaToDelete.name}"? Esta accion no se puede deshacer.`
                : 'Estas seguro de eliminar esta area?'}
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
