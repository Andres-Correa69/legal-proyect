import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  ArrowLeftRight,
  Trash2,
  Check,
  X,
  Truck,
  Package,
  Search,
  Eye,
  MoreVertical,
} from "lucide-react";
import {
  inventoryTransfersApi,
  type InventoryTransfer,
  type InventoryTransferStatus,
  type Warehouse,
  type Location,
  type Product,
  type CreateInventoryTransferData,
} from "@/lib/api";

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
  requested: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/20',
  approved: 'bg-blue-500/15 text-blue-700 border-blue-500/20',
  in_transit: 'bg-purple-500/15 text-purple-700 border-purple-500/20',
  completed: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-700 border-red-500/20',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  transfers: InventoryTransfer[];
  setTransfers: React.Dispatch<React.SetStateAction<InventoryTransfer[]>>;
  warehouses: Warehouse[];
  locations: Location[];
  products: Product[];
  loading: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canComplete: boolean;
}

export function TransfersTab({
  transfers, setTransfers, warehouses, locations, products, loading,
  canCreate, canApprove, canComplete,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InventoryTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');

  const [formData, setFormData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    source_location_id: '',
    destination_location_id: '',
    notes: '',
  });
  const [items, setItems] = useState<TransferItem[]>([]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (t.transfer_number || '').toLowerCase().includes(term) ||
        (t.source_warehouse?.name || '').toLowerCase().includes(term) ||
        (t.destination_warehouse?.name || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' || t.status === filterStatus;
      const matchesWarehouse = filterWarehouse === '' || filterWarehouse === 'todos' ||
        t.source_warehouse_id.toString() === filterWarehouse ||
        t.destination_warehouse_id.toString() === filterWarehouse;
      return matchesSearch && matchesStatus && matchesWarehouse;
    });
  }, [transfers, searchTerm, filterStatus, filterWarehouse]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { setErrors({ items: 'Debe agregar al menos un producto' }); return; }
    setFormLoading(true);
    setErrors({});
    try {
      const data: CreateInventoryTransferData = {
        source_warehouse_id: parseInt(formData.source_warehouse_id),
        destination_warehouse_id: parseInt(formData.destination_warehouse_id),
        source_location_id: formData.source_location_id ? parseInt(formData.source_location_id) : undefined,
        destination_location_id: formData.destination_location_id ? parseInt(formData.destination_location_id) : undefined,
        notes: formData.notes || undefined,
        items: items.map(item => ({ product_id: item.product_id, quantity_requested: item.quantity_requested })),
      };
      const created = await inventoryTransfersApi.create(data);
      setTransfers(prev => [created, ...prev]);
      closeDialog();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'errors' in error) setErrors((error as any).errors);
    } finally { setFormLoading(false); }
  };

  const handleApprove = async (t: InventoryTransfer) => {
    if (!confirm('¿Aprobar esta transferencia?')) return;
    try { const u = await inventoryTransfersApi.approve(t.id); setTransfers(prev => prev.map(x => x.id === t.id ? u : x)); } catch { alert('Error al aprobar'); }
  };

  const handleStartTransit = async (t: InventoryTransfer) => {
    if (!confirm('¿Marcar como en transito?')) return;
    try { const u = await inventoryTransfersApi.startTransit(t.id); setTransfers(prev => prev.map(x => x.id === t.id ? u : x)); } catch { alert('Error al iniciar transito'); }
  };

  const handleComplete = async (t: InventoryTransfer) => {
    if (!confirm('¿Completar la transferencia?')) return;
    try { const u = await inventoryTransfersApi.complete(t.id); setTransfers(prev => prev.map(x => x.id === t.id ? u : x)); } catch { alert('Error al completar'); }
  };

  const handleReject = async () => {
    if (!selectedTransfer || !rejectionReason.trim()) { alert('Debe indicar un motivo'); return; }
    try {
      const u = await inventoryTransfersApi.reject(selectedTransfer.id, rejectionReason);
      setTransfers(prev => prev.map(x => x.id === selectedTransfer.id ? u : x));
      setRejectDialogOpen(false); setSelectedTransfer(null); setRejectionReason('');
    } catch { alert('Error al rechazar'); }
  };

  const openCreateDialog = () => {
    setFormData({ source_warehouse_id: warehouses[0]?.id.toString() || '', destination_warehouse_id: '', source_location_id: '', destination_location_id: '', notes: '' });
    setItems([]); setErrors({}); setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({ source_warehouse_id: '', destination_warehouse_id: '', source_location_id: '', destination_location_id: '', notes: '' });
    setItems([]); setErrors({});
  };

  const addItem = () => setItems(prev => [...prev, { product_id: 0, quantity_requested: 1 }]);
  const updateItem = (index: number, field: keyof TransferItem, value: number) => {
    setItems(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value, ...(field === 'product_id' ? { product: products.find(p => p.id === value) } : {}) }; return u; });
  };
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const getSourceLocations = () => formData.source_warehouse_id ? locations.filter(l => l.warehouse_id === parseInt(formData.source_warehouse_id)) : [];
  const getDestLocations = () => formData.destination_warehouse_id ? locations.filter(l => l.warehouse_id === parseInt(formData.destination_warehouse_id)) : [];

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      {!loading && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por numero, bodega..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="requested">Solicitadas</SelectItem>
              <SelectItem value="approved">Aprobadas</SelectItem>
              <SelectItem value="in_transit">En Transito</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="rejected">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Bodega" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todas</SelectItem>
              {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />Nueva Transferencia
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Spinner className="mr-2" /><span className="text-muted-foreground">Cargando transferencias...</span>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No hay transferencias</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || filterStatus || filterWarehouse ? 'No se encontraron con los filtros aplicados' : 'Crea tu primera transferencia de inventario'}
            </p>
            {canCreate && !searchTerm && !filterStatus && !filterWarehouse && (
              <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Crear primera transferencia</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
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
                {filteredTransfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.transfer_number}</TableCell>
                    <TableCell>
                      <span className="font-medium">{t.source_warehouse?.name}</span>
                      {t.source_location && <span className="block text-xs text-muted-foreground">{t.source_location.name}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{t.destination_warehouse?.name}</span>
                      {t.destination_location && <span className="block text-xs text-muted-foreground">{t.destination_location.name}</span>}
                    </TableCell>
                    <TableCell><Badge className={`border text-xs ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge></TableCell>
                    <TableCell className="text-sm">{t.items?.length || 0} producto(s)</TableCell>
                    <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedTransfer(t); setDetailDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(canApprove && t.status === 'requested') || (canComplete && (t.status === 'approved' || t.status === 'in_transit')) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card">
                              {canApprove && t.status === 'requested' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApprove(t)} className="text-green-600">
                                    <Check className="h-4 w-4 mr-2" />Aprobar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => { setSelectedTransfer(t); setRejectionReason(''); setRejectDialogOpen(true); }} className="text-red-600">
                                    <X className="h-4 w-4 mr-2" />Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canComplete && t.status === 'approved' && (
                                <DropdownMenuItem onClick={() => handleStartTransit(t)} className="text-purple-600">
                                  <Truck className="h-4 w-4 mr-2" />Iniciar Tránsito
                                </DropdownMenuItem>
                              )}
                              {canComplete && t.status === 'in_transit' && (
                                <DropdownMenuItem onClick={() => handleComplete(t)} className="text-green-600">
                                  <Package className="h-4 w-4 mr-2" />Completar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/100/10 p-2.5 rounded-lg"><Plus className="h-5 w-5 text-blue-600" /></div>
              <div>
                <DialogTitle>Nueva Transferencia</DialogTitle>
                <DialogDescription className="mt-1">Complete los datos para crear una transferencia de inventario</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-3 block">Bodega Origen *</Label>
                <Select value={formData.source_warehouse_id} onValueChange={(v) => setFormData({ ...formData, source_warehouse_id: v, source_location_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-card z-50">{warehouses.filter(w => w.id.toString() !== formData.destination_warehouse_id).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <InputError message={errors.source_warehouse_id} />
              </div>
              <div>
                <Label className="mb-3 block">Bodega Destino *</Label>
                <Select value={formData.destination_warehouse_id} onValueChange={(v) => setFormData({ ...formData, destination_warehouse_id: v, destination_location_id: '' })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-card z-50">{warehouses.filter(w => w.id.toString() !== formData.source_warehouse_id).map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
                <InputError message={errors.destination_warehouse_id} />
              </div>
              <div>
                <Label className="mb-3 block">Ubicacion Origen</Label>
                <Select value={formData.source_location_id || 'none'} onValueChange={(v) => setFormData({ ...formData, source_location_id: v === 'none' ? '' : v })} disabled={!formData.source_warehouse_id}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent className="bg-card z-50"><SelectItem value="none">Sin especificar</SelectItem>{getSourceLocations().map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-3 block">Ubicacion Destino</Label>
                <Select value={formData.destination_location_id || 'none'} onValueChange={(v) => setFormData({ ...formData, destination_location_id: v === 'none' ? '' : v })} disabled={!formData.destination_warehouse_id}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent className="bg-card z-50"><SelectItem value="none">Sin especificar</SelectItem>{getDestLocations().map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="mb-3 block">Notas</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas adicionales..." rows={2} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Productos a Transferir *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Agregar</Button>
              </div>
              <InputError message={errors.items} />
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">No hay productos agregados</p>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="w-[120px]">Cantidad</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {items.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={item.product_id ? item.product_id.toString() : ''} onValueChange={(v) => updateItem(i, 'product_id', parseInt(v))}>
                              <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                              <SelectContent className="bg-card z-50">{products.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.current_stock})</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" min="1" value={item.quantity_requested} onChange={(e) => updateItem(i, 'quantity_requested', parseInt(e.target.value) || 1)} /></TableCell>
                          <TableCell><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>Cancelar</Button>
              <Button type="submit" disabled={formLoading}>{formLoading && <Spinner className="mr-2" size="sm" />}Crear Transferencia</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/100/10 p-2.5 rounded-lg"><ArrowLeftRight className="h-5 w-5 text-blue-600" /></div>
              <div>
                <DialogTitle>Detalle de Transferencia</DialogTitle>
                <DialogDescription className="mt-1">{selectedTransfer?.transfer_number}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Estado</Label><div className="mt-1"><Badge className={`border ${statusColors[selectedTransfer.status]}`}>{statusLabels[selectedTransfer.status]}</Badge></div></div>
                <div><Label className="text-muted-foreground text-xs">Fecha</Label><p className="text-sm">{formatDate(selectedTransfer.created_at)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Bodega Origen</Label><p className="font-medium text-sm">{selectedTransfer.source_warehouse?.name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Bodega Destino</Label><p className="font-medium text-sm">{selectedTransfer.destination_warehouse?.name}</p></div>
                {selectedTransfer.requested_by && <div><Label className="text-muted-foreground text-xs">Solicitado por</Label><p className="text-sm">{selectedTransfer.requested_by.name}</p></div>}
                {selectedTransfer.approved_by && <div><Label className="text-muted-foreground text-xs">Aprobado por</Label><p className="text-sm">{selectedTransfer.approved_by.name}</p></div>}
                {selectedTransfer.notes && <div className="col-span-2"><Label className="text-muted-foreground text-xs">Notas</Label><p className="text-sm">{selectedTransfer.notes}</p></div>}
                {selectedTransfer.rejection_reason && <div className="col-span-2"><Label className="text-muted-foreground text-xs text-red-600">Motivo de Rechazo</Label><p className="text-sm text-red-600">{selectedTransfer.rejection_reason}</p></div>}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Productos</Label>
                <div className="border rounded-md mt-1">
                  <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Solicitado</TableHead><TableHead className="text-right">Transferido</TableHead></TableRow></TableHeader>
                    <TableBody>{selectedTransfer.items?.map(item => (
                      <TableRow key={item.id}><TableCell className="text-sm">{item.product?.name}</TableCell><TableCell className="text-right text-sm">{item.quantity_requested}</TableCell><TableCell className="text-right text-sm">{item.quantity_transferred}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
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
            <div className="flex items-center gap-3">
              <div className="bg-red-500/100/10 p-2.5 rounded-lg"><X className="h-5 w-5 text-red-600" /></div>
              <div>
                <DialogTitle>Rechazar Transferencia</DialogTitle>
                <DialogDescription className="mt-1">Indique el motivo del rechazo</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-3 block">Motivo del Rechazo *</Label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Indique el motivo..." rows={3} />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject}>Rechazar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
