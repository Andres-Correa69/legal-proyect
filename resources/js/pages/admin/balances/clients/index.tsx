import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  balanceInquiryApi,
  type ClientBalance,
  type ClientBalanceDetail,
  type ClientBalanceResponse,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Users, Eye, Filter, TrendingDown, TrendingUp, DollarSign, Receipt, CreditCard, Plus, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClientBalancesIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('payments.view', user);

  const [clientBalances, setClientBalances] = useState<ClientBalance[]>([]);
  const [totals, setTotals] = useState<ClientBalanceResponse['totals'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientBalanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    payment_status: 'all',
    date_from: '',
    date_to: '',
  });
  const [datePreset, setDatePreset] = useState<string>('all');

  const applyFilters = async (overrideFilters?: typeof filters) => {
    const f = overrideFilters || filters;
    try {
      setLoading(true);
      setGeneralError('');
      const params: any = {};
      if (f.search) params.search = f.search;
      if (f.payment_status && f.payment_status !== 'all') params.payment_status = f.payment_status;
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to) params.date_to = f.date_to;

      const response = await balanceInquiryApi.clients(params);
      setClientBalances(response.clients || []);
      setTotals(response.totals || null);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    applyFilters();
  }, [canView]);

  if (!canView) {
    return null;
  }

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
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
      default: fromStr = ''; break;
    }
    const newFilters = { ...filters, date_from: fromStr, date_to: preset === 'all' ? '' : toStr };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      const params: { format: 'pdf' | 'excel'; search?: string; payment_status?: string; date_from?: string; date_to?: string } = { format };
      if (filters.search) params.search = filters.search;
      if (filters.payment_status && filters.payment_status !== 'all') {
        params.payment_status = filters.payment_status;
      }
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const blob = await balanceInquiryApi.exportClients(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saldos_clientes_${new Date().getTime()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Exportación exitosa',
        description: `El reporte se descargó en formato ${format === 'pdf' ? 'PDF' : 'Excel'}`,
      });
    } catch (error: any) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error al exportar',
        description: error.message || 'No se pudo generar el reporte',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const loadClientDetail = async (clientId: number) => {
    try {
      setDetailLoading(true);
      setGeneralError('');
      const params: any = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const detail = await balanceInquiryApi.client(clientId, params);
      setSelectedClientDetail(detail);
      setDialogOpen(true);
    } catch (error: any) {
      console.error('Error loading client detail:', error);
      setGeneralError(error.message || 'Error al cargar detalle del cliente');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive">Pendiente</Badge>;
      case 'partial':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Parcial</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Pagado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Saldos Clientes">
      <Head title="Saldos Clientes" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saldos de Clientes</h2>
            <p className="text-muted-foreground">Consulta las cuentas por cobrar y saldos pendientes de clientes</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exporting || loading}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={exporting || loading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {totals && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.clients_count}</div>
                <p className="text-xs text-muted-foreground">
                  {totals.clients_with_debt} con saldo pendiente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totals.total_sales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals.total_paid)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.total_balance_due)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <div className="relative w-full lg:w-64">
            <Input
              placeholder="Nombre, email o documento..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          <Select value={filters.payment_status} onValueChange={(value) => updateFilter('payment_status', value)}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="with_debt">Con saldo pendiente</SelectItem>
              <SelectItem value="pending">Solo pendientes</SelectItem>
              <SelectItem value="partial">Solo parciales</SelectItem>
              <SelectItem value="paid">Solo pagados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={handleDatePreset}>
            <SelectTrigger className="w-full lg:w-[180px]">
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
          {datePreset === 'custom' && (
            <>
              <Input type="date" value={filters.date_from} onChange={(e) => updateFilter('date_from', e.target.value)} className="w-full lg:w-[150px]" />
              <Input type="date" value={filters.date_to} onChange={(e) => updateFilter('date_to', e.target.value)} className="w-full lg:w-[150px]" />
            </>
          )}
        </div>

        {generalError && !dialogOpen && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Saldos por Cliente</CardTitle>
            <CardDescription>Lista de clientes con sus saldos de ventas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : clientBalances.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay clientes con ventas registradas
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Total Ventas</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Saldo Pendiente</TableHead>
                      <TableHead className="text-center">Ventas</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientBalances.map((balance) => (
                      <TableRow key={balance.client_id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{balance.client_name}</span>
                            {balance.email && (
                              <p className="text-xs text-muted-foreground">{balance.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {balance.document_type && balance.document_id ? (
                            <span className="text-sm">{balance.document_type}: {balance.document_id}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(balance.total_sales)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(balance.total_paid)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(balance.balance_due)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{balance.sales_count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(balance.payment_status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadClientDetail(balance.client_id)}
                            disabled={detailLoading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para ver detalle del cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
            <DialogDescription>
              Historial de ventas y pagos del cliente
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-2" />
              <p>Cargando...</p>
            </div>
          ) : selectedClientDetail ? (
            <div className="space-y-6">
              {/* Info del cliente */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{selectedClientDetail.client.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      {selectedClientDetail.client.email || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Teléfono:</span>{' '}
                      {selectedClientDetail.client.phone || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Documento:</span>{' '}
                      {selectedClientDetail.client.document_type && selectedClientDetail.client.document_id
                        ? `${selectedClientDetail.client.document_type}: ${selectedClientDetail.client.document_id}`
                        : '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dirección:</span>{' '}
                      {selectedClientDetail.client.address || '-'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Total Ventas</div>
                    <div className="text-lg font-bold">{formatCurrency(selectedClientDetail.totals.total_sales)}</div>
                    <div className="text-xs text-muted-foreground">{selectedClientDetail.totals.sales_count} ventas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Total Pagado</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(selectedClientDetail.totals.total_paid)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Saldo Pendiente</div>
                    <div className="text-lg font-bold text-red-600">{formatCurrency(selectedClientDetail.totals.total_balance_due)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-xs text-muted-foreground">Ventas Pendientes</div>
                    <div className="text-lg font-bold">{selectedClientDetail.totals.pending_sales + selectedClientDetail.totals.partial_sales}</div>
                    <div className="text-xs text-muted-foreground">de {selectedClientDetail.totals.sales_count}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Botón para registrar pago si hay saldo pendiente */}
              {selectedClientDetail.totals.total_balance_due > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => router.visit('/admin/payments')}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </div>
              )}

              {/* Ventas del cliente */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Ventas
                </h4>
                {selectedClientDetail.sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay ventas registradas</p>
                ) : (
                  <div className="overflow-x-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Factura</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Pagado</TableHead>
                          <TableHead className="text-right">Pendiente</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClientDetail.sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">{sale.invoice_number}</TableCell>
                            <TableCell>{sale.type_label}</TableCell>
                            <TableCell>{formatDate(sale.date)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(sale.total_amount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(sale.paid_amount)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(sale.balance)}</TableCell>
                            <TableCell>{getPaymentStatusBadge(sale.payment_status)}</TableCell>
                            <TableCell>
                              {sale.balance > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.visit('/admin/payments')}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Pagar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Pagos del cliente */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Historial de Pagos
                </h4>
                {selectedClientDetail.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay pagos registrados</p>
                ) : (
                  <div className="overflow-x-auto rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Referencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClientDetail.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell className="font-mono text-sm">{payment.invoice_number}</TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell className="text-right text-green-600 font-semibold">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{payment.reference || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
