import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import {
  Plus,
  ListChecks,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import {
  adjustmentReasonsApi,
  type AdjustmentReason,
} from "@/lib/api";

interface Props {
  reasons: AdjustmentReason[];
  setReasons: React.Dispatch<React.SetStateAction<AdjustmentReason[]>>;
  loading: boolean;
  canManage: boolean;
}

export function ReasonsTab({ reasons, setReasons, loading, canManage }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<AdjustmentReason | null>(null);
  const [deletingReason, setDeletingReason] = useState<AdjustmentReason | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    requires_approval: false,
    approval_threshold_amount: '',
    approval_threshold_quantity: '',
  });

  const filteredReasons = useMemo(() => {
    if (!searchTerm) return reasons;
    const term = searchTerm.toLowerCase();
    return reasons.filter(r =>
      r.code.toLowerCase().includes(term) ||
      r.name.toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term)
    );
  }, [reasons, searchTerm]);

  const handleOpenDialog = (reason?: AdjustmentReason) => {
    if (reason) {
      setEditingReason(reason);
      setFormData({
        code: reason.code,
        name: reason.name,
        description: reason.description || '',
        requires_approval: reason.requires_approval,
        approval_threshold_amount: reason.approval_threshold_amount?.toString() || '',
        approval_threshold_quantity: reason.approval_threshold_quantity?.toString() || '',
      });
    } else {
      setEditingReason(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        requires_approval: false,
        approval_threshold_amount: '',
        approval_threshold_quantity: '',
      });
    }
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        is_active: true,
        requires_approval: Boolean(formData.requires_approval),
      };
      if (formData.approval_threshold_amount?.trim()) {
        payload.approval_threshold_amount = parseFloat(formData.approval_threshold_amount);
      }
      if (formData.approval_threshold_quantity?.trim()) {
        payload.approval_threshold_quantity = parseInt(formData.approval_threshold_quantity);
      }

      if (editingReason) {
        const updated = await adjustmentReasonsApi.update(editingReason.id, payload as any);
        setReasons(prev => prev.map(r => r.id === editingReason.id ? updated : r));
      } else {
        const created = await adjustmentReasonsApi.create(payload as any);
        setReasons(prev => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (error: any) {
      if (error.errors) setErrors(error.errors);
      else alert(error.message || 'Error al guardar el motivo');
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    if (!deletingReason) return;
    try {
      await adjustmentReasonsApi.delete(deletingReason.id);
      setReasons(prev => prev.filter(r => r.id !== deletingReason.id));
      setDeleteDialogOpen(false);
      setDeletingReason(null);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar el motivo');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      {!loading && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar motivos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          {canManage && (
            <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />Nuevo Motivo
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2">
          <Spinner className="mr-2" /><span className="text-muted-foreground">Cargando motivos...</span>
        </div>
      ) : filteredReasons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListChecks className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No hay motivos de ajuste</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm ? 'No se encontraron con los filtros aplicados' : 'Crea tu primer motivo de ajuste'}
            </p>
            {canManage && !searchTerm && (
              <Button onClick={() => handleOpenDialog()} className="gap-2"><Plus className="h-4 w-4" />Crear primer motivo</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Aprobacion</TableHead>
                  {canManage && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReasons.map((reason) => (
                  <TableRow key={reason.id}>
                    <TableCell className="font-mono text-sm font-medium">{reason.code}</TableCell>
                    <TableCell className="font-medium">{reason.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{reason.description || '-'}</TableCell>
                    <TableCell>
                      {reason.requires_approval ? (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border gap-1">
                          <ShieldCheck className="h-3 w-3" />Requiere
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Auto</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card z-50">
                            <DropdownMenuItem onClick={() => handleOpenDialog(reason)}>
                              <Edit className="h-4 w-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingReason(reason); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/100/10 p-2.5 rounded-lg"><ListChecks className="h-5 w-5 text-amber-600" /></div>
              <div>
                <DialogTitle>{editingReason ? 'Editar Motivo' : 'Nuevo Motivo de Ajuste'}</DialogTitle>
                <DialogDescription className="mt-1">
                  {editingReason ? 'Modifica los datos del motivo' : 'Crea un nuevo motivo para ajustes de inventario'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-3 block">Codigo *</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                <InputError message={errors.code?.[0]} />
              </div>
              <div>
                <Label className="mb-3 block">Nombre *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <InputError message={errors.name?.[0]} />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Descripcion</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="requires_approval"
                checked={formData.requires_approval}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
              />
              <Label htmlFor="requires_approval">Requiere Aprobacion</Label>
            </div>

            {formData.requires_approval && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-3 block">Umbral de Monto (COP)</Label>
                  <Input type="number" step="0.01" value={formData.approval_threshold_amount} onChange={(e) => setFormData({ ...formData, approval_threshold_amount: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-3 block">Umbral de Cantidad</Label>
                  <Input type="number" value={formData.approval_threshold_quantity} onChange={(e) => setFormData({ ...formData, approval_threshold_quantity: e.target.value })} />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={formLoading}>Cancelar</Button>
              <Button type="submit" disabled={formLoading}>{formLoading && <Spinner className="mr-2" size="sm" />}{editingReason ? 'Guardar Cambios' : 'Crear Motivo'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar motivo de ajuste?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar el motivo "{deletingReason?.name}"? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
