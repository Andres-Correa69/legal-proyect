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
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, MoreVertical, Pencil, Tag, Package, Eye } from "lucide-react";
import { productCategoriesApi, productAreasApi, productsApi, type ProductCategory, type ProductArea, type Product } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { User } from "@/types";

interface FormErrors {
  name?: string;
  slug?: string;
  description?: string;
  [key: string]: string | undefined;
}

export default function ProductCategoriesIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canManage = isSuperAdmin(user) || hasPermission('categories.manage', user);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [areas, setAreas] = useState<ProductArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewCategory, setViewCategory] = useState<ProductCategory | null>(null);
  const [viewProducts, setViewProducts] = useState<Product[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    area_id: '' as string,
    description: '',
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
      const [categoriesData, areasData] = await Promise.all([
        productCategoriesApi.getAll({ company_id: companyFilter.companyIdParam }),
        productAreasApi.getAll(),
      ]);
      setCategories(categoriesData);
      setAreas(areasData);
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
        name: formData.name,
        area_id: formData.area_id ? parseInt(formData.area_id) : null,
        description: formData.description || undefined,
        is_active: true,
      };

      if (editingCategory) {
        const updatedCategory = await productCategoriesApi.update(editingCategory.id, data);
        setCategories(prev =>
          prev.map(c => c.id === editingCategory.id ? updatedCategory : c)
        );
      } else {
        const newCategory = await productCategoriesApi.create(data);
        setCategories(prev => [...prev, newCategory]);
      }

      closeDialog();
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    setDeleting(true);
    try {
      await productCategoriesApi.delete(category.id);
      setCategories(prev => prev.filter(c => c.id !== category.id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('No se puede eliminar la categoria. Puede que tenga productos asociados.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      area_id: '',
      description: '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      area_id: category.area_id?.toString() || '',
      description: category.description || '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      area_id: '',
      description: '',
    });
    setErrors({});
  };

  const openViewDialog = async (category: ProductCategory) => {
    setViewCategory(category);
    setViewLoading(true);
    try {
      const products = await productsApi.getAll({ category_id: category.id });
      setViewProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
      setViewProducts([]);
    } finally {
      setViewLoading(false);
    }
  };

  const openDeleteDialog = (category: ProductCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const stats = useMemo(() => {
    const active = categories.filter(c => c.is_active).length;
    const inactive = categories.length - active;
    const totalProducts = categories.reduce((acc, c) => acc + (c.products_count || 0), 0);
    return { total: categories.length, active, inactive, totalProducts };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        category.name.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term);
      const matchesArea = filterArea === 'all' ||
        (filterArea === 'none' ? !category.area_id : category.area_id?.toString() === filterArea);
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' ||
        (filterStatus === 'activa' ? category.is_active : !category.is_active);
      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [categories, searchTerm, filterArea, filterStatus]);

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCategories.length);
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterArea, filterStatus]);

  return (
    <AppLayout title="Categorias de Productos">
      <Head title="Categorias de Productos" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Categorías</h1>
                <p className="text-sm text-muted-foreground">Organiza tus productos y servicios por categorías</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-4 w-4 text-primary" />
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
                    <span className="text-xs text-muted-foreground">Productos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
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
            {/* Filters row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por area" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todas las areas</SelectItem>
                  <SelectItem value="none">Sin area</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  Nueva Categoria
                </Button>
              )}
            </div>

            {/* Showing count */}
            <p className="text-sm text-muted-foreground mb-4">
              Mostrando {filteredCategories.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredCategories.length}
            </p>

            {/* Categories list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : paginatedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterArea !== 'all' || (filterStatus && filterStatus !== 'todos')
                    ? 'No se encontraron categorias'
                    : 'No hay categorias registradas'}
                </p>
                {canManage && !searchTerm && filterArea === 'all' && (!filterStatus || filterStatus === 'todos') && (
                  <Button className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera categoria
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedCategories.map((category) => (
                  <div key={category.id} className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                          <Tag className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{category.name}</p>
                            <Badge className={`${category.is_active ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'} border text-[10px]`}>
                              {category.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            {category.area && (
                              <Badge variant="outline" className="text-[10px]">
                                {category.area.name}
                              </Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{category.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-muted-foreground">Productos</p>
                          <p className="font-bold text-sm">{category.products_count || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(category)} title="Ver productos">
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
                              <DropdownMenuItem onClick={() => openEditDialog(category)}>
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(category)} className="text-destructive">
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

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Mostrando {filteredCategories.length > 0 ? startIndex + 1 : 0}-{endIndex} de {filteredCategories.length}</span>
                <div className="flex items-center gap-2">
                  <span>Mostrar:</span>
                  <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
      </>)}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div>
              <Label htmlFor="name" className="mb-3 block">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Electrónica, Alimentos..."
                disabled={formLoading}
                required
              />
              <InputError message={errors.name} />
            </div>

            <div>
              <Label htmlFor="area_id" className="mb-3 block">Área</Label>
              <Select
                value={formData.area_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, area_id: value === 'none' ? '' : value })
                }
                disabled={formLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="none">Sin área</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputError message={errors.area_id} />
            </div>

            <div>
              <Label htmlFor="description" className="mb-3 block">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la categoría..."
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
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Products Dialog */}
      <Dialog open={!!viewCategory} onOpenChange={(open) => { if (!open) { setViewCategory(null); setViewProducts([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Productos en &quot;{viewCategory?.name}&quot;
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {viewLoading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : viewProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No hay productos en esta categoría</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {viewProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku || 'Sin SKU'}</p>
                    </div>
                    <div className="flex gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Precio</p>
                        <p className="text-sm font-semibold">{formatCurrency(p.sale_price || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Stock</p>
                        <p className="text-sm font-semibold">{p.current_stock ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete
                ? `¿Estas seguro de eliminar la categoria "${categoryToDelete.name}"? Esta accion no se puede deshacer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoryToDelete && handleDelete(categoryToDelete)}
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
