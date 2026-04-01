import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  cashTransfersApi,
  cashRegistersApi,
  type CashRegisterTransfer,
  type CashRegister,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Ban, Filter, Plus, CalendarIcon, MoreVertical } from "lucide-react";

export default function CashTransfersHistoryIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('cash-transfers.view', user);
  const canCancel = hasPermission('cash-transfers.cancel', user);

  const [transfers, setTransfers] = useState<CashRegisterTransfer[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<CashRegisterTransfer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [transferToCancel, setTransferToCancel] = useState<CashRegisterTransfer | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    from_cash_register_id: 'all',
    to_cash_register_id: 'all',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadData();
  }, [canView]);

  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersData, registersData] = await Promise.all([
        cashTransfersApi.getAll(),
        cashRegistersApi.getAll(),
      ]);
      setTransfers(transfersData);
      setCashRegisters(registersData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.status && filters.status !== 'all') params.status = filters.status;
      if (filters.from_cash_register_id && filters.from_cash_register_id !== 'all') {
        params.source_cash_register_id = parseInt(filters.from_cash_register_id);
      }
      if (filters.to_cash_register_id && filters.to_cash_register_id !== 'all') {
        params.destination_cash_register_id = parseInt(filters.to_cash_register_id);
      }
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const transfersData = await cashTransfersApi.getAll(params);
      setTransfers(transfersData);
    } catch (error: any) {
      console.error('Error applying filters:', error);
      setGeneralError(error.message || 'Error al filtrar datos');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      from_cash_register_id: 'all',
      to_cash_register_id: 'all',
      date_from: '',
      date_to: '',
    });
    loadData();
  };

  const handleCancelTransfer = async () => {
    if (!transferToCancel || !cancelReason.trim()) {
      setGeneralError('Debes proporcionar una razón para cancelar la transferencia');
      return;
    }

    try {
      setFormLoading(true);
      const updatedTransfer = await cashTransfersApi.cancel(transferToCancel.id, cancelReason);
      setTransfers(prev => prev.map(t => t.id === updatedTransfer.id ? updatedTransfer : t));
      setCancelDialogOpen(false);
      setTransferToCancel(null);
      setCancelReason('');
      setGeneralError('');
    } catch (error: any) {
      console.error('Error cancelling transfer:', error);
      setGeneralError(error.message || 'Error al cancelar transferencia');
    } finally {
      setFormLoading(false);
    }
  };

  const openViewDialog = (transfer: CashRegisterTransfer) => {
    setSelectedTransfer(transfer);
    setViewDialogOpen(true);
  };

  const openCancelDialog = (transfer: CashRegisterTransfer) => {
    setTransferToCancel(transfer);
    setCancelReason('');
    setGeneralError('');
    setCancelDialogOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'completed':
        return <Badge variant="default">Completada</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Historial de Transferencias">
      <Head title="Historial de Transferencias" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Historial de Transferencias</h2>
            <p className="text-muted-foreground">Consulta el historial de transferencias entre cajas</p>
          </div>
          <Button onClick={() => router.visit('/admin/cash-transfers')}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transferencia
          </Button>
        </div>

        {generalError && !viewDialogOpen && !cancelDialogOpen && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <Label>Estado</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Desde Caja</Label>
                <Select value={filters.from_cash_register_id} onValueChange={(value) => setFilters({ ...filters, from_cash_register_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cashRegisters.map((register) => (
                      <SelectItem key={register.id} value={register.id.toString()}>
                        {register.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hacia Caja</Label>
                <Select value={filters.to_cash_register_id} onValueChange={(value) => setFilters({ ...filters, to_cash_register_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {cashRegisters.map((register) => (
                      <SelectItem key={register.id} value={register.id.toString()}>
                        {register.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !filters.date_from && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {filters.date_from ? new Date(filters.date_from + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePickerReport
                      selected={filters.date_from ? new Date(filters.date_from + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setFilters({ ...filters, date_from: `${y}-${m}-${d}` });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !filters.date_to && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {filters.date_to ? new Date(filters.date_to + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DatePickerReport
                      selected={filters.date_to ? new Date(filters.date_to + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setFilters({ ...filters, date_to: `${y}-${m}-${d}` });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Transferencias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : transfers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay transferencias registradas
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hacia</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado por</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-mono text-sm">{transfer.transfer_number}</TableCell>
                        <TableCell>{formatDate(transfer.transferred_at)}</TableCell>
                        <TableCell>
                          {transfer.from_cash_register?.name}
                          {transfer.from_session && (
                            <span className="text-muted-foreground text-sm block">
                              Sesión: {transfer.from_session.session_number}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transfer.to_cash_register?.name || transfer.to_session?.cash_register?.name}
                          {transfer.to_session && (
                            <span className="text-muted-foreground text-sm block">
                              Sesión: {transfer.to_session.session_number}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(transfer.amount)}</TableCell>
                        <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                        <TableCell>{transfer.created_by?.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openViewDialog(transfer)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canCancel && transfer.status !== 'cancelled' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card">
                                  <DropdownMenuItem className="text-red-600" onClick={() => openCancelDialog(transfer)}>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancelar Transferencia
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Transfer Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Transferencia</DialogTitle>
            </DialogHeader>
            {selectedTransfer && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Número</Label>
                    <p className="font-mono">{selectedTransfer.transfer_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div>{getStatusBadge(selectedTransfer.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Fecha</Label>
                    <p>{formatDate(selectedTransfer.transferred_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Monto</Label>
                    <p className="text-lg font-semibold">{formatCurrency(selectedTransfer.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Desde</Label>
                    <p className="font-medium">{selectedTransfer.from_cash_register?.name}</p>
                    {selectedTransfer.from_session && (
                      <p className="text-sm text-muted-foreground">
                        Sesión: {selectedTransfer.from_session.session_number}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Hacia</Label>
                    <p className="font-medium">
                      {selectedTransfer.to_cash_register?.name || selectedTransfer.to_session?.cash_register?.name || 'No especificado'}
                    </p>
                    {selectedTransfer.to_session && (
                      <p className="text-sm text-muted-foreground">
                        Sesión: {selectedTransfer.to_session.session_number}
                      </p>
                    )}
                  </div>
                  {selectedTransfer.notes && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Notas</Label>
                      <p>{selectedTransfer.notes}</p>
                    </div>
                  )}
                  {selectedTransfer.created_by && (
                    <div>
                      <Label className="text-muted-foreground">Creado por</Label>
                      <p>{selectedTransfer.created_by.name}</p>
                    </div>
                  )}
                  {selectedTransfer.status === 'cancelled' && selectedTransfer.cancellation_reason && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Razón de Cancelación</Label>
                      <p className="text-red-600">{selectedTransfer.cancellation_reason}</p>
                      {selectedTransfer.cancelled_by && (
                        <p className="text-sm text-muted-foreground">
                          Cancelado por: {selectedTransfer.cancelled_by.name}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Transfer Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar Transferencia</DialogTitle>
              <DialogDescription>
                Proporciona una razón para cancelar esta transferencia
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {generalError && cancelDialogOpen && (
                <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                  {generalError}
                </div>
              )}
              <div>
                <Label htmlFor="cancel_reason">Razón de Cancelación *</Label>
                <Textarea
                  id="cancel_reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  disabled={formLoading}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCancelDialogOpen(false);
                    setTransferToCancel(null);
                    setCancelReason('');
                    setGeneralError('');
                  }}
                  disabled={formLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCancelTransfer}
                  disabled={formLoading}
                  variant="destructive"
                >
                  {formLoading && <Spinner className="mr-2" size="sm" />}
                  Confirmar Cancelación
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
