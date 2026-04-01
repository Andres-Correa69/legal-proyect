import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { Plus, TrendingUp, TrendingDown, Check, X, AlertTriangle } from "lucide-react";
import {
  inventoryAdjustmentsApi,
  productsApi,
  adjustmentReasonsApi,
  type InventoryAdjustment,
  type InventoryAdjustmentStatus,
  type Product,
  type AdjustmentReason,
  type CreateInventoryAdjustmentData,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import { formatCurrency } from "@/lib/utils";
import type { User } from "@/types";

interface FormErrors {
  product_id?: string;
  adjustment_reason_id?: string;
  quantity?: string;
  notes?: string;
  [key: string]: string | undefined;
}

const statusLabels: Record<InventoryAdjustmentStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  auto_approved: 'Auto-aprobado',
};

const statusColors: Record<InventoryAdjustmentStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-700',
  approved: 'bg-green-500/15 text-green-700',
  rejected: 'bg-red-500/15 text-red-700',
  auto_approved: 'bg-blue-500/15 text-blue-700',
};

export default function InventoryAdjustmentsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canCreate = isSuperAdmin(user) || hasPermission('inventory.adjustments.create', user);
  const canApprove = isSuperAdmin(user) || hasPermission('inventory.adjustments.approve', user);

  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reasons, setReasons] = useState<AdjustmentReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');

  const [formData, setFormData] = useState({
    product_id: '',
    adjustment_reason_id: '',
    quantity: '',
    notes: '',
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
      const params = { company_id: companyFilter.companyIdParam };
      const [adjustmentsData, productsData, reasonsData] = await Promise.all([
        inventoryAdjustmentsApi.getAll(params),
        productsApi.getAll(params),
        adjustmentReasonsApi.getAll(),
      ]);
      setAdjustments(adjustmentsData);
      setProducts(productsData);
      setReasons(reasonsData);
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
      const data: CreateInventoryAdjustmentData = {
        product_id: parseInt(formData.product_id),
        adjustment_reason_id: parseInt(formData.adjustment_reason_id),
        quantity: parseInt(formData.quantity),
        notes: formData.notes || undefined,
      };

      const newAdjustment = await inventoryAdjustmentsApi.create(data);
      setAdjustments(prev => [newAdjustment, ...prev]);
      closeDialog();
    } catch (error: unknown) {
      console.error('Error creating adjustment:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleApprove = async (adjustment: InventoryAdjustment) => {
    if (!confirm('¿Estas seguro de aprobar este ajuste? El stock del producto sera modificado.')) return;

    try {
      const updated = await inventoryAdjustmentsApi.approve(adjustment.id);
      setAdjustments(prev => prev.map(a => a.id === adjustment.id ? updated : a));
    } catch (error) {
      console.error('Error approving adjustment:', error);
      alert('Error al aprobar el ajuste');
    }
  };

  const openRejectDialog = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedAdjustment || !rejectionReason.trim()) {
      alert('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      const updated = await inventoryAdjustmentsApi.reject(selectedAdjustment.id, rejectionReason);
      setAdjustments(prev => prev.map(a => a.id === selectedAdjustment.id ? updated : a));
      setRejectDialogOpen(false);
      setSelectedAdjustment(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting adjustment:', error);
      alert('Error al rechazar el ajuste');
    }
  };

  const openCreateDialog = () => {
    setFormData({
      product_id: '',
      adjustment_reason_id: '',
      quantity: '',
      notes: '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openDetailDialog = (adjustment: InventoryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setDetailDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({
      product_id: '',
      adjustment_reason_id: '',
      quantity: '',
      notes: '',
    });
    setErrors({});
  };

  const getSelectedProduct = () => {
    if (!formData.product_id) return null;
    return products.find(p => p.id === parseInt(formData.product_id));
  };

  const getSelectedReason = () => {
    if (!formData.adjustment_reason_id) return null;
    return reasons.find(r => r.id === parseInt(formData.adjustment_reason_id));
  };

  const filteredAdjustments = adjustments.filter(adjustment => {
    const matchesStatus = filterStatus === 'all' || adjustment.status === filterStatus;
    const matchesProduct = filterProduct === 'all' || adjustment.product_id?.toString() === filterProduct;
    return matchesStatus && matchesProduct;
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AppLayout title="Ajustes de Inventario">
      <Head title="Ajustes de Inventario" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Ajustes de Inventario</h2>
            <p className="text-muted-foreground">
              Gestiona los ajustes de stock con control de aprobacion
            </p>
          </div>
          {canCreate && companyFilter.shouldLoadData && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Ajuste
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo ajuste de inventario para modificar el stock de un producto.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="product_id">Producto *</Label>
                    <Combobox
                      value={formData.product_id}
                      onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                      disabled={formLoading}
                      placeholder="Seleccionar producto"
                      searchPlaceholder="Buscar producto..."
                      emptyText="No se encontraron productos"
                      options={products.filter(p => p.is_active && p.is_trackable).map((product) => ({
                        value: product.id.toString(),
                        label: `${product.name} (Stock: ${product.current_stock})`,
                      }))}
                    />
                    <InputError message={errors.product_id} />
                    {getSelectedProduct() && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Stock actual: <span className="font-medium">{getSelectedProduct()?.current_stock} {getSelectedProduct()?.unit_of_measure}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="adjustment_reason_id">Motivo del Ajuste *</Label>
                    <Select
                      value={formData.adjustment_reason_id}
                      onValueChange={(value) => setFormData({ ...formData, adjustment_reason_id: value })}
                      disabled={formLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasons.filter(r => r.is_active).map((reason) => (
                          <SelectItem key={reason.id} value={reason.id.toString()}>
                            {reason.name}
                            {reason.requires_approval && ' (Requiere aprobacion)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.adjustment_reason_id} />
                    {getSelectedReason() && getSelectedReason()?.requires_approval && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Este ajuste requerira aprobacion antes de aplicarse
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="quantity">Cantidad *</Label>
                    <div className="relative">
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="Ej: -5 para reducir, 10 para aumentar"
                        disabled={formLoading}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use valores negativos para reducir stock, positivos para aumentar
                    </p>
                    <InputError message={errors.quantity} />
                    {formData.quantity && getSelectedProduct() && (
                      <p className="text-xs mt-1">
                        Stock resultante:{' '}
                        <span className={`font-medium ${(getSelectedProduct()!.current_stock + parseInt(formData.quantity || '0')) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getSelectedProduct()!.current_stock + parseInt(formData.quantity || '0')} {getSelectedProduct()?.unit_of_measure}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas / Justificacion</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Describa el motivo del ajuste..."
                      disabled={formLoading}
                      rows={3}
                    />
                    <InputError message={errors.notes} />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Crear Ajuste
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
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
        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="auto_approved">Auto-aprobados</SelectItem>
            </SelectContent>
          </Select>
          <Combobox
            value={filterProduct === 'all' ? '' : filterProduct}
            onValueChange={(value) => setFilterProduct(value || 'all')}
            placeholder="Todos los productos"
            searchPlaceholder="Buscar producto..."
            emptyText="No se encontraron productos"
            className="w-full sm:w-[220px]"
            options={products.map((product) => ({
              value: product.id.toString(),
              label: product.name,
            }))}
          />
        </div>

        {/* Adjustments List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filterStatus !== 'all' || filterProduct !== 'all' ? 'No se encontraron ajustes' : 'No hay ajustes registrados'}
              </p>
              {canCreate && filterStatus === 'all' && filterProduct === 'all' && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer ajuste
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Ajustes</CardTitle>
              <CardDescription>{filteredAdjustments.length} ajuste(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-mono text-sm">
                        {adjustment.adjustment_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{adjustment.product?.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {adjustment.stock_before} → {adjustment.stock_after}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {adjustment.adjustmentReason?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {adjustment.quantity > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={adjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={adjustment.financial_impact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(adjustment.financial_impact)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[adjustment.status]}>
                          {statusLabels[adjustment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(adjustment.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailDialog(adjustment)}
                          >
                            Ver
                          </Button>
                          {canApprove && adjustment.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(adjustment)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejectDialog(adjustment)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalle del Ajuste</DialogTitle>
            <DialogDescription>
              Información completa del ajuste de inventario.
            </DialogDescription>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Numero</Label>
                  <p className="font-mono">{selectedAdjustment.adjustment_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedAdjustment.status]}>
                      {statusLabels[selectedAdjustment.status]}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Producto</Label>
                  <p className="font-medium">{selectedAdjustment.product?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Motivo</Label>
                  <p>{selectedAdjustment.reason?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cantidad</Label>
                  <p className={`font-medium ${selectedAdjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAdjustment.quantity > 0 ? '+' : ''}{selectedAdjustment.quantity}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock Antes</Label>
                  <p>{selectedAdjustment.stock_before}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock Despues</Label>
                  <p>{selectedAdjustment.stock_after}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Costo Unitario</Label>
                  <p>{formatCurrency(selectedAdjustment.unit_cost)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Impacto Financiero</Label>
                  <p className={selectedAdjustment.financial_impact >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(selectedAdjustment.financial_impact)}
                  </p>
                </div>
                {selectedAdjustment.created_by && (
                  <div>
                    <Label className="text-muted-foreground">Creado por</Label>
                    <p>{selectedAdjustment.created_by.name}</p>
                  </div>
                )}
                {selectedAdjustment.approved_by && (
                  <div>
                    <Label className="text-muted-foreground">Aprobado por</Label>
                    <p>{selectedAdjustment.approved_by.name}</p>
                  </div>
                )}
                {selectedAdjustment.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Notas</Label>
                    <p className="text-sm">{selectedAdjustment.notes}</p>
                  </div>
                )}
                {selectedAdjustment.rejection_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-red-600">Motivo de Rechazo</Label>
                    <p className="text-sm text-red-600">{selectedAdjustment.rejection_reason}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Fecha de Creacion</Label>
                  <p className="text-sm">{formatDate(selectedAdjustment.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rechazar Ajuste</DialogTitle>
            <DialogDescription>
              Indique el motivo por el cual rechaza este ajuste de inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Motivo del Rechazo *</Label>
              <Textarea
                id="rejection_reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Indique el motivo del rechazo..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Rechazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
