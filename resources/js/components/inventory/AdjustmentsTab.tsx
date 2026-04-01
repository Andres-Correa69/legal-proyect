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
  TrendingUp,
  TrendingDown,
  Check,
  X,
  AlertTriangle,
  Search,
  Eye,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import {
  inventoryAdjustmentsApi,
  type InventoryAdjustment,
  type InventoryAdjustmentStatus,
  type Product,
  type AdjustmentReason,
  type CreateInventoryAdjustmentData,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

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
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/20',
  approved: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
  rejected: 'bg-red-500/15 text-red-700 border-red-500/20',
  auto_approved: 'bg-blue-500/15 text-blue-700 border-blue-500/20',
};

interface Props {
  adjustments: InventoryAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<InventoryAdjustment[]>>;
  products: Product[];
  reasons: AdjustmentReason[];
  loading: boolean;
  canCreate: boolean;
  canApprove: boolean;
}

export function AdjustmentsTab({
  adjustments, setAdjustments, products, reasons, loading,
  canCreate, canApprove,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProduct, setFilterProduct] = useState('');

  const [formData, setFormData] = useState({
    product_id: '',
    adjustment_reason_id: '',
    quantity: '',
    notes: '',
  });

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(a => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (a.adjustment_number || '').toLowerCase().includes(term) ||
        (a.product?.name || '').toLowerCase().includes(term);
      const matchesStatus = filterStatus === '' || filterStatus === 'todos' || a.status === filterStatus;
      const matchesProduct = filterProduct === '' || filterProduct === 'todos' || a.product_id?.toString() === filterProduct;
      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [adjustments, searchTerm, filterStatus, filterProduct]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getSelectedProduct = () => {
    if (!formData.product_id) return null;
    return products.find(p => p.id === parseInt(formData.product_id));
  };

  const getSelectedReason = () => {
    if (!formData.adjustment_reason_id) return null;
    return reasons.find(r => r.id === parseInt(formData.adjustment_reason_id));
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
      if (error && typeof error === 'object' && 'errors' in error) setErrors((error as { errors: FormErrors }).errors);
    } finally { setFormLoading(false); }
  };

  const handleApprove = async (adjustment: InventoryAdjustment) => {
    if (!confirm('¿Aprobar este ajuste? El stock del producto sera modificado.')) return;
    try {
      const updated = await inventoryAdjustmentsApi.approve(adjustment.id);
      setAdjustments(prev => prev.map(a => a.id === adjustment.id ? updated : a));
    } catch { alert('Error al aprobar el ajuste'); }
  };

  const handleReject = async () => {
    if (!selectedAdjustment || !rejectionReason.trim()) { alert('Debe indicar un motivo de rechazo'); return; }
    try {
      const updated = await inventoryAdjustmentsApi.reject(selectedAdjustment.id, rejectionReason);
      setAdjustments(prev => prev.map(a => a.id === selectedAdjustment.id ? updated : a));
      setRejectDialogOpen(false); setSelectedAdjustment(null); setRejectionReason('');
    } catch { alert('Error al rechazar el ajuste'); }
  };

  const openCreateDialog = () => {
    setFormData({ product_id: '', adjustment_reason_id: '', quantity: '', notes: '' });
    setErrors({}); setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData({ product_id: '', adjustment_reason_id: '', quantity: '', notes: '' });
    setErrors({});
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      {!loading && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por numero, producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="approved">Aprobados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="auto_approved">Auto-aprobados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Producto" /></SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />Nuevo Ajuste
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Spinner className="mr-2" /><span className="text-muted-foreground">Cargando ajustes...</span>
        </div>
      ) : filteredAdjustments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No hay ajustes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || filterStatus || filterProduct ? 'No se encontraron con los filtros aplicados' : 'Crea tu primer ajuste de inventario'}
            </p>
            {canCreate && !searchTerm && !filterStatus && !filterProduct && (
              <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Crear primer ajuste</Button>
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
                    <TableCell className="font-mono text-sm">{adjustment.adjustment_number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{adjustment.product?.name}</span>
                        <span className="text-xs text-muted-foreground">{adjustment.stock_before} → {adjustment.stock_after}</span>
                      </div>
                    </TableCell>
                    <TableCell>{adjustment.adjustmentReason?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {adjustment.quantity > 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
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
                      <Badge className={`border text-xs ${statusColors[adjustment.status]}`}>
                        {statusLabels[adjustment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(adjustment.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedAdjustment(adjustment); setDetailDialogOpen(true); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canApprove && adjustment.status === 'pending' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card">
                              <DropdownMenuItem onClick={() => handleApprove(adjustment)} className="text-green-600">
                                <Check className="h-4 w-4 mr-2" />Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedAdjustment(adjustment); setRejectionReason(''); setRejectDialogOpen(true); }} className="text-red-600">
                                <X className="h-4 w-4 mr-2" />Rechazar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/100/10 p-2.5 rounded-lg"><Plus className="h-5 w-5 text-orange-600" /></div>
              <div>
                <DialogTitle>Nuevo Ajuste de Inventario</DialogTitle>
                <DialogDescription className="mt-1">Modifica el stock de un producto con justificacion</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="mb-3 block">Producto *</Label>
              <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })} disabled={formLoading}>
                <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {products.filter(p => p.is_active && p.is_trackable).map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.current_stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputError message={errors.product_id} />
              {getSelectedProduct() && (
                <p className="text-xs text-muted-foreground mt-1">
                  Stock actual: <span className="font-medium">{getSelectedProduct()?.current_stock} {getSelectedProduct()?.unit_of_measure}</span>
                </p>
              )}
            </div>

            <div>
              <Label className="mb-3 block">Motivo del Ajuste *</Label>
              <Select value={formData.adjustment_reason_id} onValueChange={(v) => setFormData({ ...formData, adjustment_reason_id: v })} disabled={formLoading}>
                <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {reasons.filter(r => r.is_active).map(r => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name}{r.requires_approval && ' (Requiere aprobacion)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <InputError message={errors.adjustment_reason_id} />
              {getSelectedReason()?.requires_approval && (
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />Este ajuste requerira aprobacion antes de aplicarse
                </div>
              )}
            </div>

            <div>
              <Label className="mb-3 block">Cantidad *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ej: -5 para reducir, 10 para aumentar"
                disabled={formLoading}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Valores negativos reducen stock, positivos aumentan</p>
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
              <Label className="mb-3 block">Notas / Justificacion</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Describa el motivo del ajuste..."
                disabled={formLoading}
                rows={3}
              />
              <InputError message={errors.notes} />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={formLoading}>Cancelar</Button>
              <Button type="submit" disabled={formLoading}>{formLoading && <Spinner className="mr-2" size="sm" />}Crear Ajuste</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/100/10 p-2.5 rounded-lg"><SlidersHorizontal className="h-5 w-5 text-orange-600" /></div>
              <div>
                <DialogTitle>Detalle del Ajuste</DialogTitle>
                <DialogDescription className="mt-1">{selectedAdjustment?.adjustment_number}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground text-xs">Estado</Label><div className="mt-1"><Badge className={`border ${statusColors[selectedAdjustment.status]}`}>{statusLabels[selectedAdjustment.status]}</Badge></div></div>
                <div><Label className="text-muted-foreground text-xs">Fecha</Label><p className="text-sm">{formatDate(selectedAdjustment.created_at)}</p></div>
                <div className="col-span-2"><Label className="text-muted-foreground text-xs">Producto</Label><p className="font-medium text-sm">{selectedAdjustment.product?.name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Motivo</Label><p className="text-sm">{selectedAdjustment.adjustmentReason?.name}</p></div>
                <div>
                  <Label className="text-muted-foreground text-xs">Cantidad</Label>
                  <p className={`font-medium text-sm ${selectedAdjustment.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedAdjustment.quantity > 0 ? '+' : ''}{selectedAdjustment.quantity}
                  </p>
                </div>
                <div><Label className="text-muted-foreground text-xs">Stock Antes</Label><p className="text-sm">{selectedAdjustment.stock_before}</p></div>
                <div><Label className="text-muted-foreground text-xs">Stock Despues</Label><p className="text-sm">{selectedAdjustment.stock_after}</p></div>
                <div><Label className="text-muted-foreground text-xs">Costo Unitario</Label><p className="text-sm">{formatCurrency(selectedAdjustment.unit_cost)}</p></div>
                <div>
                  <Label className="text-muted-foreground text-xs">Impacto Financiero</Label>
                  <p className={`text-sm ${selectedAdjustment.financial_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedAdjustment.financial_impact)}
                  </p>
                </div>
                {selectedAdjustment.createdBy && <div><Label className="text-muted-foreground text-xs">Creado por</Label><p className="text-sm">{selectedAdjustment.createdBy.name}</p></div>}
                {selectedAdjustment.approvedBy && <div><Label className="text-muted-foreground text-xs">Aprobado por</Label><p className="text-sm">{selectedAdjustment.approvedBy.name}</p></div>}
                {selectedAdjustment.notes && <div className="col-span-2"><Label className="text-muted-foreground text-xs">Notas</Label><p className="text-sm">{selectedAdjustment.notes}</p></div>}
                {selectedAdjustment.rejection_reason && <div className="col-span-2"><Label className="text-muted-foreground text-xs text-red-600">Motivo de Rechazo</Label><p className="text-sm text-red-600">{selectedAdjustment.rejection_reason}</p></div>}
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
                <DialogTitle>Rechazar Ajuste</DialogTitle>
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
