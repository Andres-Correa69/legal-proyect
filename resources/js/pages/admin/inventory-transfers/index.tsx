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
import { Plus, ArrowLeftRight, Trash2, Check, X, Truck, Package } from "lucide-react";
import {
  inventoryTransfersApi,
  warehousesApi,
  locationsApi,
  productsApi,
  type InventoryTransfer,
  type InventoryTransferStatus,
  type Warehouse,
  type Location,
  type Product,
  type CreateInventoryTransferData,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { User } from "@/types";

interface FormErrors {
  source_warehouse_id?: string;
  destination_warehouse_id?: string;
  source_location_id?: string;
  destination_location_id?: string;
  notes?: string;
  items?: string;
  [key: string]: string | undefined;
}

interface TransferItem {
  product_id: number;
  quantity_requested: number;
  product?: Product;
}

const statusLabels: Record<InventoryTransferStatus, string> = {
  requested: 'Solicitada',
  approved: 'Aprobada',
  in_transit: 'En Transito',
  completed: 'Completada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

const statusColors: Record<InventoryTransferStatus, string> = {
  requested: 'bg-yellow-500/15 text-yellow-700',
  approved: 'bg-blue-500/15 text-blue-700',
  in_transit: 'bg-purple-500/15 text-purple-700',
  completed: 'bg-green-500/15 text-green-700',
  rejected: 'bg-red-500/15 text-red-700',
  cancelled: 'bg-muted text-foreground',
};

export default function InventoryTransfersIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canView = isSuperAdmin(user) || hasPermission('inventory.transfers.view', user);
  const canCreate = isSuperAdmin(user) || hasPermission('inventory.transfers.create', user);
  const canApprove = isSuperAdmin(user) || hasPermission('inventory.transfers.approve', user);
  const canComplete = isSuperAdmin(user) || hasPermission('inventory.transfers.complete', user);

  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InventoryTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('all');

  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    source_location_id: '',
    destination_location_id: '',
    notes: '',
  });

  const [items, setItems] = useState<TransferItem[]>([]);

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
      const [transfersData, warehousesData, productsData] = await Promise.all([
        inventoryTransfersApi.getAll(params),
        warehousesApi.getAll(params),
        productsApi.getAll(params),
      ]);
      setTransfers(transfersData);
      setWarehouses(warehousesData);
      setProducts(productsData);

      // Cargar todas las ubicaciones
      const locationsData = await locationsApi.getAll(params);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrors({ items: 'Debe agregar al menos un producto a la transferencia' });
      return;
    }

    setFormLoading(true);
    setErrors({});

    try {
      const data: CreateInventoryTransferData = {
        source_warehouse_id: parseInt(formData.source_warehouse_id),
        destination_warehouse_id: parseInt(formData.destination_warehouse_id),
        source_location_id: formData.source_location_id ? parseInt(formData.source_location_id) : undefined,
        destination_location_id: formData.destination_location_id ? parseInt(formData.destination_location_id) : undefined,
        notes: formData.notes || undefined,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity_requested: item.quantity_requested,
        })),
      };

      const newTransfer = await inventoryTransfersApi.create(data);
      setTransfers(prev => [newTransfer, ...prev]);
      closeDialog();
    } catch (error: unknown) {
      console.error('Error creating transfer:', error);
      if (error && typeof error === 'object' && 'errors' in error) {
        setErrors((error as { errors: FormErrors }).errors);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleApprove = async (transfer: InventoryTransfer) => {
    if (!confirm('¿Estas seguro de aprobar esta transferencia?')) return;

    try {
      const updated = await inventoryTransfersApi.approve(transfer.id);
      setTransfers(prev => prev.map(t => t.id === transfer.id ? updated : t));
    } catch (error) {
      console.error('Error approving transfer:', error);
      alert('Error al aprobar la transferencia');
    }
  };

  const handleStartTransit = async (transfer: InventoryTransfer) => {
    if (!confirm('¿Marcar la transferencia como en transito?')) return;

    try {
      const updated = await inventoryTransfersApi.startTransit(transfer.id);
      setTransfers(prev => prev.map(t => t.id === transfer.id ? updated : t));
    } catch (error) {
      console.error('Error starting transit:', error);
      alert('Error al iniciar transito');
    }
  };

  const handleComplete = async (transfer: InventoryTransfer) => {
    if (!confirm('¿Confirmar recepcion y completar la transferencia?')) return;

    try {
      const updated = await inventoryTransfersApi.complete(transfer.id);
      setTransfers(prev => prev.map(t => t.id === transfer.id ? updated : t));
    } catch (error) {
      console.error('Error completing transfer:', error);
      alert('Error al completar la transferencia');
    }
  };

  const openRejectDialog = (transfer: InventoryTransfer) => {
    setSelectedTransfer(transfer);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason.trim()) {
      alert('Debe indicar un motivo de rechazo');
      return;
    }

    try {
      const updated = await inventoryTransfersApi.reject(selectedTransfer.id, rejectionReason);
      setTransfers(prev => prev.map(t => t.id === selectedTransfer.id ? updated : t));
      setRejectDialogOpen(false);
      setSelectedTransfer(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      alert('Error al rechazar la transferencia');
    }
  };

  const openCreateDialog = () => {
    setFormData({
      source_warehouse_id: warehouses[0]?.id.toString() || '',
      destination_warehouse_id: '',
      source_location_id: '',
      destination_location_id: '',
      notes: '',
    });
    setItems([]);
    setErrors({});
    setDialogOpen(true);
  };

  const openDetailDialog = (transfer: InventoryTransfer) => {
    setSelectedTransfer(transfer);
    setDetailDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({
      source_warehouse_id: '',
      destination_warehouse_id: '',
      source_location_id: '',
      destination_location_id: '',
      notes: '',
    });
    setItems([]);
    setErrors({});
  };

  const addItem = () => {
    setItems(prev => [...prev, { product_id: 0, quantity_requested: 1 }]);
  };

  const updateItem = (index: number, field: keyof TransferItem, value: number) => {
    setItems(prev => {
      const updated = [...prev];
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        updated[index] = { ...updated[index], [field]: value, product };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const getSourceLocations = () => {
    if (!formData.source_warehouse_id) return [];
    return locations.filter(l => l.warehouse_id === parseInt(formData.source_warehouse_id));
  };

  const getDestinationLocations = () => {
    if (!formData.destination_warehouse_id) return [];
    return locations.filter(l => l.warehouse_id === parseInt(formData.destination_warehouse_id));
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesStatus = filterStatus === 'all' || transfer.status === filterStatus;
    const matchesWarehouse = filterWarehouse === 'all' ||
      transfer.source_warehouse_id.toString() === filterWarehouse ||
      transfer.destination_warehouse_id.toString() === filterWarehouse;
    return matchesStatus && matchesWarehouse;
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
    <AppLayout title="Transferencias de Inventario">
      <Head title="Transferencias de Inventario" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transferencias de Inventario</h2>
            <p className="text-muted-foreground">
              Gestiona las transferencias entre bodegas
            </p>
          </div>
          {canCreate && companyFilter.shouldLoadData && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Transferencia
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Transferencia</DialogTitle>
                  <DialogDescription>
                    Complete los datos para crear una nueva transferencia de inventario
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="source_warehouse_id">Bodega Origen *</Label>
                      <Combobox
                        value={formData.source_warehouse_id}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          source_warehouse_id: value,
                          source_location_id: '',
                        })}
                        disabled={formLoading}
                        placeholder="Seleccionar bodega"
                        searchPlaceholder="Buscar bodega..."
                        emptyText="No se encontraron bodegas"
                        options={warehouses.filter(w => w.id.toString() !== formData.destination_warehouse_id).map((warehouse) => ({
                          value: warehouse.id.toString(),
                          label: warehouse.name,
                        }))}
                      />
                      <InputError message={errors.source_warehouse_id} />
                    </div>

                    <div>
                      <Label htmlFor="destination_warehouse_id">Bodega Destino *</Label>
                      <Combobox
                        value={formData.destination_warehouse_id}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          destination_warehouse_id: value,
                          destination_location_id: '',
                        })}
                        disabled={formLoading}
                        placeholder="Seleccionar bodega"
                        searchPlaceholder="Buscar bodega..."
                        emptyText="No se encontraron bodegas"
                        options={warehouses.filter(w => w.id.toString() !== formData.source_warehouse_id).map((warehouse) => ({
                          value: warehouse.id.toString(),
                          label: warehouse.name,
                        }))}
                      />
                      <InputError message={errors.destination_warehouse_id} />
                    </div>

                    <div>
                      <Label htmlFor="source_location_id">Ubicacion Origen</Label>
                      <Combobox
                        value={formData.source_location_id}
                        onValueChange={(value) => setFormData({ ...formData, source_location_id: value })}
                        disabled={formLoading || !formData.source_warehouse_id}
                        placeholder="Opcional"
                        searchPlaceholder="Buscar ubicacion..."
                        emptyText="No se encontraron ubicaciones"
                        options={getSourceLocations().map((location) => ({
                          value: location.id.toString(),
                          label: location.name,
                        }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="destination_location_id">Ubicacion Destino</Label>
                      <Combobox
                        value={formData.destination_location_id}
                        onValueChange={(value) => setFormData({ ...formData, destination_location_id: value })}
                        disabled={formLoading || !formData.destination_warehouse_id}
                        placeholder="Opcional"
                        searchPlaceholder="Buscar ubicacion..."
                        emptyText="No se encontraron ubicaciones"
                        options={getDestinationLocations().map((location) => ({
                          value: location.id.toString(),
                          label: location.name,
                        }))}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Notas adicionales..."
                        disabled={formLoading}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Productos a Transferir *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar Producto
                      </Button>
                    </div>
                    <InputError message={errors.items} />

                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                        No hay productos agregados
                      </p>
                    ) : (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="w-[120px]">Cantidad</TableHead>
                              <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Combobox
                                    value={item.product_id ? item.product_id.toString() : ''}
                                    onValueChange={(value) => updateItem(index, 'product_id', parseInt(value))}
                                    placeholder="Seleccionar producto"
                                    searchPlaceholder="Buscar producto..."
                                    emptyText="No se encontraron productos"
                                    options={products.filter(p => p.is_active).map((product) => ({
                                      value: product.id.toString(),
                                      label: `${product.name} (Stock: ${product.current_stock})`,
                                    }))}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity_requested}
                                    onChange={(e) => updateItem(index, 'quantity_requested', parseInt(e.target.value) || 1)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Crear Transferencia
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
              <SelectItem value="requested">Solicitadas</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="in_transit">En Transito</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Combobox
            value={filterWarehouse === 'all' ? '' : filterWarehouse}
            onValueChange={(value) => setFilterWarehouse(value || 'all')}
            placeholder="Todas las bodegas"
            searchPlaceholder="Buscar bodega..."
            emptyText="No se encontraron bodegas"
            className="w-full sm:w-[200px]"
            options={warehouses.map((warehouse) => ({
              value: warehouse.id.toString(),
              label: warehouse.name,
            }))}
          />
        </div>

        {/* Transfers List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {filterStatus !== 'all' || filterWarehouse !== 'all' ? 'No se encontraron transferencias' : 'No hay transferencias registradas'}
              </p>
              {canCreate && filterStatus === 'all' && filterWarehouse === 'all' && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera transferencia
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Transferencias</CardTitle>
              <CardDescription>{filteredTransfers.length} transferencia(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-sm">
                        {transfer.transfer_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{transfer.source_warehouse?.name}</span>
                          {transfer.source_location && (
                            <span className="text-xs text-muted-foreground">{transfer.source_location.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{transfer.destination_warehouse?.name}</span>
                          {transfer.destination_location && (
                            <span className="text-xs text-muted-foreground">{transfer.destination_location.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[transfer.status]}>
                          {statusLabels[transfer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {transfer.items?.length || 0} producto(s)
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(transfer.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailDialog(transfer)}
                          >
                            Ver
                          </Button>
                          {canApprove && transfer.status === 'requested' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(transfer)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejectDialog(transfer)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canComplete && transfer.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartTransit(transfer)}
                              className="text-purple-600 hover:text-purple-700"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          {canComplete && transfer.status === 'in_transit' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleComplete(transfer)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalle de Transferencia</DialogTitle>
            <DialogDescription>
              Informacion detallada de la transferencia de inventario
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Numero</Label>
                  <p className="font-mono">{selectedTransfer.transfer_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedTransfer.status]}>
                      {statusLabels[selectedTransfer.status]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bodega Origen</Label>
                  <p>{selectedTransfer.source_warehouse?.name}</p>
                  {selectedTransfer.source_location && (
                    <p className="text-sm text-muted-foreground">{selectedTransfer.source_location.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Bodega Destino</Label>
                  <p>{selectedTransfer.destination_warehouse?.name}</p>
                  {selectedTransfer.destination_location && (
                    <p className="text-sm text-muted-foreground">{selectedTransfer.destination_location.name}</p>
                  )}
                </div>
                {selectedTransfer.requested_by && (
                  <div>
                    <Label className="text-muted-foreground">Solicitado por</Label>
                    <p>{selectedTransfer.requested_by.name}</p>
                  </div>
                )}
                {selectedTransfer.approved_by && (
                  <div>
                    <Label className="text-muted-foreground">Aprobado por</Label>
                    <p>{selectedTransfer.approved_by.name}</p>
                  </div>
                )}
                {selectedTransfer.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Notas</Label>
                    <p className="text-sm">{selectedTransfer.notes}</p>
                  </div>
                )}
                {selectedTransfer.rejection_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-red-600">Motivo de Rechazo</Label>
                    <p className="text-sm text-red-600">{selectedTransfer.rejection_reason}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Productos</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Solicitado</TableHead>
                      <TableHead className="text-right">Transferido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTransfer.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell className="text-right">{item.quantity_requested}</TableCell>
                        <TableCell className="text-right">{item.quantity_transferred}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rechazar Transferencia</DialogTitle>
            <DialogDescription>
              Indique el motivo por el cual rechaza esta transferencia
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
