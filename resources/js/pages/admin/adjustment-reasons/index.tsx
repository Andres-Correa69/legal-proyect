import AppLayout from '@/layouts/app-layout';
import type { SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { hasPermission, isSuperAdmin } from '@/lib/permissions';
import { adjustmentReasonsApi, type AdjustmentReason, type CreateAdjustmentReasonData, type UpdateAdjustmentReasonData } from '@/lib/api';
import { ListChecks, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import InputError from '@/components/input-error';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function AdjustmentReasonsPage() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const canAccess = isSuperAdmin(user) || hasPermission('inventory.adjustments.manage', user);

    useEffect(() => {
        if (!canAccess) {
            window.location.href = '/dashboard';
        }
    }, [canAccess]);

    if (!canAccess) {
        return null;
    }

    const [reasons, setReasons] = useState<AdjustmentReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingReason, setEditingReason] = useState<AdjustmentReason | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        is_active: true,
        requires_approval: false,
        approval_threshold_amount: '',
        approval_threshold_quantity: '',
    });

    useEffect(() => {
        loadReasons();
    }, [search]);

    const loadReasons = async () => {
        try {
            setLoading(true);
            const data = await adjustmentReasonsApi.getAll({
                is_active: 'all',
                search: search || undefined,
            });
            setReasons(data);
        } catch (error: any) {
            console.error('Error loading reasons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (reason?: AdjustmentReason) => {
        if (reason) {
            setEditingReason(reason);
            setFormData({
                code: reason.code,
                name: reason.name,
                description: reason.description || '',
                is_active: reason.is_active,
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
                is_active: true,
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
            const payload: any = {
                code: formData.code,
                name: formData.name,
                description: formData.description || null,
                is_active: true,
                requires_approval: Boolean(formData.requires_approval),
            };

            if (formData.approval_threshold_amount && formData.approval_threshold_amount.trim() !== '') {
                payload.approval_threshold_amount = parseFloat(formData.approval_threshold_amount);
            }

            if (formData.approval_threshold_quantity && formData.approval_threshold_quantity.trim() !== '') {
                payload.approval_threshold_quantity = parseInt(formData.approval_threshold_quantity);
            }

            if (editingReason) {
                await adjustmentReasonsApi.update(editingReason.id, payload);
            } else {
                await adjustmentReasonsApi.create(payload);
            }

            setDialogOpen(false);
            loadReasons();
        } catch (error: any) {
            console.error('Error completo:', error);
            if (error.errors) {
                setErrors(error.errors);
                const firstError = Object.values(error.errors)[0];
                if (firstError && Array.isArray(firstError) && firstError.length > 0) {
                    alert(firstError[0]);
                }
            } else {
                alert(error.message || 'Error al guardar el motivo');
            }
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este motivo de ajuste?')) {
            return;
        }

        try {
            await adjustmentReasonsApi.delete(id);
            loadReasons();
        } catch (error: any) {
            alert(error.message || 'Error al eliminar el motivo');
        }
    };

    return (
        <AppLayout title="Motivos de Ajuste">
            <Head title="Motivos de Ajuste" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Motivos de Ajuste</h2>
                        <p className="text-muted-foreground">
                            Gestiona los motivos para realizar ajustes de inventario
                        </p>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuevo Motivo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingReason ? 'Editar Motivo' : 'Nuevo Motivo de Ajuste'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingReason ? 'Modifica los datos del motivo' : 'Crea un nuevo motivo para ajustes de inventario'}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="code">Código *</Label>
                                        <Input
                                            id="code"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            required
                                        />
                                        <InputError message={errors.code?.[0]} />
                                    </div>
                                    <div>
                                        <Label htmlFor="name">Nombre *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                        <InputError message={errors.name?.[0]} />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="description">Descripción</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="requires_approval"
                                        checked={formData.requires_approval}
                                        onCheckedChange={(checked) => setFormData({ ...formData, requires_approval: checked })}
                                    />
                                    <Label htmlFor="requires_approval">Requiere Aprobación</Label>
                                </div>

                                {formData.requires_approval && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="approval_threshold_amount">Umbral de Monto (COP)</Label>
                                            <Input
                                                id="approval_threshold_amount"
                                                type="number"
                                                step="0.01"
                                                value={formData.approval_threshold_amount}
                                                onChange={(e) => setFormData({ ...formData, approval_threshold_amount: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="approval_threshold_quantity">Umbral de Cantidad</Label>
                                            <Input
                                                id="approval_threshold_quantity"
                                                type="number"
                                                value={formData.approval_threshold_quantity}
                                                onChange={(e) => setFormData({ ...formData, approval_threshold_quantity: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={formLoading}>
                                        {formLoading ? <Spinner className="mr-2" /> : null}
                                        {editingReason ? 'Actualizar' : 'Crear'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar motivos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Spinner />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Requiere Aprobación</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reasons.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No hay motivos de ajuste registrados
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        reasons.map((reason) => (
                                            <TableRow key={reason.id}>
                                                <TableCell className="font-medium">{reason.code}</TableCell>
                                                <TableCell>{reason.name}</TableCell>
                                                <TableCell>{reason.description || '-'}</TableCell>
                                                <TableCell>
                                                    {reason.requires_approval ? (
                                                        <Badge variant="outline">Sí</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">No</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenDialog(reason)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(reason.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
