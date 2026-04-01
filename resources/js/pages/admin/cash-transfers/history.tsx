import { Head, router, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  cashTransfersApi,
  cashRegistersApi,
  type CashRegisterTransfer,
  type CashRegister,
  type TransferStatus,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import {
  Eye,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ArrowRightLeft,
  FileDown,
  Plus,
} from "lucide-react";

type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date_desc", label: "Más reciente" },
  { value: "date_asc", label: "Más antigua" },
  { value: "amount_desc", label: "Mayor monto" },
  { value: "amount_asc", label: "Menor monto" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20] as const;

export default function CashTransfersHistory() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission('cash-transfers.view', user);
  const canCancel = hasPermission('cash-transfers.cancel', user);

  const [transfers, setTransfers] = useState<CashRegisterTransfer[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');

  // Summary stats
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_transfers: 0,
    total_cancelled: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterDest, setFilterDest] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [datePreset, setDatePreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<CashRegisterTransfer | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');

  // Refs for tracking filter changes
  const initialLoadDone = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (!canView) {
      router.visit('/admin/dashboard');
      return;
    }
    loadInitialData();
  }, [canView]);

  // Auto-apply search with debounce
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      loadTransfers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Auto-apply select filters immediately
  useEffect(() => {
    if (!initialLoadDone.current) return;
    setCurrentPage(1);
    loadTransfers();
  }, [filterStatus, filterSource, filterDest, dateFrom, dateTo]);

  // Reload on page/perPage change
  useEffect(() => {
    if (!initialLoadDone.current) return;
    loadTransfers();
  }, [currentPage, perPage]);

  if (!canView) {
    return null;
  }

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [cashRegistersData] = await Promise.all([
        cashRegistersApi.getAll(),
      ]);
      setCashRegisters(cashRegistersData.filter(cr => cr.is_active));
      await loadTransfers();
      initialLoadDone.current = true;
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const params: any = {
        page: currentPage,
        per_page: perPage,
      };

      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterSource && filterSource !== 'all') {
        params.source_cash_register_id = filterSource;
      }
      if (filterDest && filterDest !== 'all') {
        params.destination_cash_register_id = filterDest;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (dateFrom) {
        params.date_from = dateFrom;
      }
      if (dateTo) {
        params.date_to = dateTo;
      }

      const response = await cashTransfersApi.getAll(params);
      setTransfers(response.data.data);
      setCurrentPage(response.data.current_page || 1);
      setLastPage(response.data.last_page || 1);
      setTotal(response.data.total || 0);
      setSummary(response.summary);
    } catch (error: any) {
      console.error('Error loading transfers:', error);
      setGeneralError(error.message || 'Error al cargar transferencias');
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];
    let fromStr = '';
    switch (preset) {
      case '7d': { const d = new Date(today); d.setDate(d.getDate() - 7); fromStr = d.toISOString().split('T')[0]; break; }
      case '15d': { const d = new Date(today); d.setDate(d.getDate() - 15); fromStr = d.toISOString().split('T')[0]; break; }
      case '1m': { const d = new Date(today); d.setMonth(d.getMonth() - 1); fromStr = d.toISOString().split('T')[0]; break; }
      case '2m': { const d = new Date(today); d.setMonth(d.getMonth() - 2); fromStr = d.toISOString().split('T')[0]; break; }
      case 'custom': return;
      default: setDateFrom(''); setDateTo(''); return;
    }
    setDateFrom(fromStr);
    setDateTo(toStr);
  };

  // Client-side sort on current page data
  const sortedTransfers = useMemo(() => {
    const rows = [...transfers];
    rows.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "date_desc":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    return rows;
  }, [transfers, sortBy]);

  const openDetailDialog = async (transfer: CashRegisterTransfer) => {
    try {
      setFormLoading(true);
      const fullTransfer = await cashTransfersApi.getById(transfer.id);
      setSelectedTransfer(fullTransfer);
      setDetailDialogOpen(true);
    } catch (error: any) {
      console.error('Error loading transfer details:', error);
      setGeneralError(error.message || 'Error al cargar los detalles de la transferencia');
    } finally {
      setFormLoading(false);
    }
  };

  const openCancelDialog = (transfer: CashRegisterTransfer) => {
    setSelectedTransfer(transfer);
    setCancelReason('');
    setCancelReasonError('');
    setCancelDialogOpen(true);
  };

  const handleCancelTransfer = async () => {
    if (!selectedTransfer) return;

    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      setCancelReasonError('La razón debe tener al menos 10 caracteres');
      return;
    }

    if (cancelReason.trim().length > 500) {
      setCancelReasonError('La razón no puede exceder 500 caracteres');
      return;
    }

    try {
      setFormLoading(true);
      await cashTransfersApi.cancel(selectedTransfer.id, cancelReason.trim());
      setCancelDialogOpen(false);
      setSelectedTransfer(null);
      setCancelReason('');
      await loadTransfers();
    } catch (error: any) {
      console.error('Error cancelling transfer:', error);
      setGeneralError(error.message || 'Error al cancelar la transferencia');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const formatDateLong = (date: string) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/100/10 text-emerald-600">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completada
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-500/100/10 text-red-600">
            <XCircle className="h-3 w-3 mr-1" /> Cancelada
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/100/10 text-yellow-600">
            <Clock className="h-3 w-3 mr-1" /> Pendiente
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Pagination helpers
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, total);

  return (
    <AppLayout title="Historial de Transferencias">
      <Head title="Historial de Transferencias" />
      <div className="space-y-4">
        {/* Header - identical to FacturacionSettingsShell */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Historial de Transferencias</h1>
          <p className="text-sm text-muted-foreground">Consulta, filtra y exporta transferencias entre cajas.</p>
        </header>

        {generalError && !detailDialogOpen && !cancelDialogOpen && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {/* Card wrapper - identical to FacturacionSettingsShell */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Total Movido</p>
                  <p className="text-xl font-semibold">{formatCurrency(summary.total_amount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Transferencias</p>
                  <p className="text-xl font-semibold">{summary.total_transfers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                  <p className="text-xl font-semibold">{summary.total_cancelled}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-6">
              <div className="flex-1 flex flex-wrap gap-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por número TRF-..."
                  className="max-w-[200px]"
                />
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterSource} onValueChange={(v) => setFilterSource(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas</SelectItem>
                    {cashRegisters.map((cr) => (
                      <SelectItem key={cr.id} value={cr.id.toString()}>{cr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDest} onValueChange={(v) => setFilterDest(v)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas</SelectItem>
                    {cashRegisters.map((cr) => (
                      <SelectItem key={cr.id} value={cr.id.toString()}>{cr.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={datePreset} onValueChange={handleDatePreset}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Fecha" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las fechas</SelectItem>
                    <SelectItem value="7d">7 Días Anteriores</SelectItem>
                    <SelectItem value="15d">15 Días Anteriores</SelectItem>
                    <SelectItem value="1m">Último Mes</SelectItem>
                    <SelectItem value="2m">Últimos 2 Meses</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={() => router.visit('/admin/cash-transfers')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva
                </Button>
              </div>
            </div>

            {/* Custom date range inputs (only when custom preset selected) */}
            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Label className="text-sm text-muted-foreground">Desde:</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                  className="w-[160px]"
                />
                <Label className="text-sm text-muted-foreground">Hasta:</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }}
                  className="w-[160px]"
                />
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTransfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell className="font-mono text-sm">{transfer.transfer_number}</TableCell>
                          <TableCell>
                            {formatDate(transfer.created_at)}
                          </TableCell>
                          <TableCell>{transfer.source_cash_register?.name || "—"}</TableCell>
                          <TableCell>{transfer.destination_cash_register?.name || "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transfer.amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openDetailDialog(transfer)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canCancel && transfer.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openCancelDialog(transfer)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedTransfers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                            No hay transferencias para mostrar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">
                      Mostrando {total > 0 ? startIndex + 1 : 0}-{endIndex} de {total}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">Mostrar:</span>
                      <Select
                        value={perPage.toString()}
                        onValueChange={(v) => {
                          setPerPage(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt.toString()}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="whitespace-nowrap">por página</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{lastPage}</span> transferencias
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* View Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Transferencia</DialogTitle>
            </DialogHeader>
            {formLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando detalles...</p>
              </div>
            ) : selectedTransfer ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-lg">{selectedTransfer.transfer_number}</span>
                  <Badge className={selectedTransfer.status === "completed" ? "bg-emerald-500/100/10 text-emerald-600" : selectedTransfer.status === "cancelled" ? "bg-red-500/100/10 text-red-600" : "bg-yellow-500/100/10 text-yellow-600"}>
                    {selectedTransfer.status === "completed" ? "Completada" : selectedTransfer.status === "cancelled" ? "Cancelada" : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateLong(selectedTransfer.created_at)}
                </p>
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="text-center p-3 bg-muted rounded-lg min-w-[120px]">
                    <p className="text-xs text-muted-foreground">Origen</p>
                    <p className="font-medium">{selectedTransfer.source_cash_register?.name || "—"}</p>
                  </div>
                  <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                  <div className="text-center p-3 bg-muted rounded-lg min-w-[120px]">
                    <p className="text-xs text-muted-foreground">Destino</p>
                    <p className="font-medium">{selectedTransfer.destination_cash_register?.name || "—"}</p>
                  </div>
                </div>
                <div className="text-center py-2 border-y">
                  <p className="text-sm text-muted-foreground">Monto Transferido</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedTransfer.amount)}</p>
                </div>
                {selectedTransfer.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notas</p>
                    <p className="text-sm text-muted-foreground">{selectedTransfer.notes}</p>
                  </div>
                )}
                {selectedTransfer.created_by && (
                  <div>
                    <p className="text-sm font-medium mb-1">Creado por</p>
                    <p className="text-sm text-muted-foreground">{selectedTransfer.created_by.name}</p>
                  </div>
                )}
                {selectedTransfer.status === 'cancelled' && selectedTransfer.cancellation_reason && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Razón de cancelación:</strong> {selectedTransfer.cancellation_reason}
                      {selectedTransfer.cancelled_at && (
                        <p className="text-xs mt-1">
                          Cancelada el {formatDate(selectedTransfer.cancelled_at)}
                        </p>
                      )}
                      {selectedTransfer.cancelled_by && (
                        <p className="text-xs mt-1">
                          Por: {selectedTransfer.cancelled_by.name}
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
              {selectedTransfer && canCancel && selectedTransfer.status === 'completed' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    openCancelDialog(selectedTransfer);
                  }}
                >
                  Cancelar Transferencia
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar Transferencia</DialogTitle>
            </DialogHeader>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Esta acción revertirá los saldos de las cajas involucradas. Esta operación no se puede deshacer.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancel_reason">Razón de Cancelación</Label>
                <Textarea
                  id="cancel_reason"
                  placeholder="Explique el motivo de la cancelación..."
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelReasonError('');
                  }}
                  disabled={formLoading}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Mínimo 10 caracteres</p>
                <InputError message={cancelReasonError} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setSelectedTransfer(null);
                  setCancelReason('');
                  setCancelReasonError('');
                }}
                disabled={formLoading}
              >
                Volver
              </Button>
              <Button
                onClick={handleCancelTransfer}
                disabled={formLoading || !cancelReason.trim() || cancelReason.trim().length < 10}
                variant="destructive"
              >
                {formLoading && <Spinner className="mr-2" size="sm" />}
                Confirmar Cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
