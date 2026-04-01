import { Head, usePage } from "@inertiajs/react";
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
  type SupplierBalance,
  type SupplierBalanceDetail,
  type BalanceSummary,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { Building2, Eye, Filter, TrendingDown, TrendingUp, Users, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BalanceInquiryIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('payments.view', user);

  const [supplierBalances, setSupplierBalances] = useState<SupplierBalance[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<SupplierBalanceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Filters
  const [filters, setFilters] = useState({
    has_pending: 'all',
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
      if (f.has_pending && f.has_pending !== 'all') params.has_pending = f.has_pending === 'true';
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to) params.date_to = f.date_to;

      try {
        const balancesData = await balanceInquiryApi.suppliers(params);
        setSupplierBalances(balancesData);
      } catch (error: any) {
        setGeneralError(error.message || 'Error al cargar datos de proveedores');
      }
      try {
        const summaryData = await balanceInquiryApi.summary(params);
        setSummary(summaryData);
      } catch {
        setSummary({ total_suppliers: 0, total_purchases_amount: 0, total_paid_amount: 0, total_pending_amount: 0, suppliers_with_pending: 0 });
      }
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
      const params: { format: 'pdf' | 'excel'; has_pending?: string; date_from?: string; date_to?: string } = { format };
      if (filters.has_pending && filters.has_pending !== 'all') {
        params.has_pending = filters.has_pending;
      }
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const blob = await balanceInquiryApi.exportSuppliers(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saldos_proveedores_${new Date().getTime()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
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

  const loadSupplierDetail = async (supplierId: number) => {
    try {
      setDetailLoading(true);
      const params: any = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const detail = await balanceInquiryApi.supplier(supplierId, params);
      setSelectedSupplierDetail(detail);
      setDialogOpen(true);
    } catch (error: any) {
      console.error('Error loading supplier detail:', error);
      setGeneralError(error.message || 'Error al cargar detalle del proveedor');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('es-CO', {
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
        return <Badge variant="outline">Parcial</Badge>;
      case 'paid':
        return <Badge variant="default">Pagado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Saldos Proveedores">
      <Head title="Saldos Proveedores" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saldos Proveedores</h2>
            <p className="text-muted-foreground">Consulta los saldos pendientes por proveedor</p>
          </div>
          <div className="flex gap-2">
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

        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_suppliers}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.suppliers_with_pending} con saldo pendiente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_purchases_amount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_paid_amount)}
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
                  {formatCurrency(summary.total_pending_amount)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <Select value={filters.has_pending} onValueChange={(value) => updateFilter('has_pending', value)}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="true">Con saldo pendiente</SelectItem>
              <SelectItem value="false">Sin saldo pendiente</SelectItem>
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
            <CardTitle>Saldos por Proveedor</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : supplierBalances.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay saldos registrados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Total Compras</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Total Pendiente</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Último Pago</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierBalances.map((balance) => (
                      <TableRow key={balance.supplier_id}>
                        <TableCell className="font-medium">{balance.supplier_name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(balance.total_purchases)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(balance.total_paid)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(balance.total_pending)}
                        </TableCell>
                        <TableCell>
                          {balance.last_purchase_date
                            ? formatDate(balance.last_purchase_date)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {balance.last_payment_date
                            ? formatDate(balance.last_payment_date)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadSupplierDetail(balance.supplier_id)}
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

        {/* Supplier Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle de Saldos - {selectedSupplierDetail?.supplier.name}</DialogTitle>
              <DialogDescription>
                Historial de compras y pagos del proveedor
              </DialogDescription>
            </DialogHeader>
            {selectedSupplierDetail && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Compras</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedSupplierDetail.total_purchases)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Pagado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedSupplierDetail.total_paid)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Pendiente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedSupplierDetail.total_pending)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Compras</h3>
                  {selectedSupplierDetail.purchases.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No hay compras registradas
                    </p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                            <TableHead>Estado Pago</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplierDetail.purchases.map((purchase) => (
                            <TableRow key={purchase.id}>
                              <TableCell className="font-mono text-sm">
                                {purchase.purchase_number}
                              </TableCell>
                              <TableCell>{formatDate(purchase.created_at)}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(purchase.total_amount)}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {formatCurrency(purchase.paid_amount)}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency(purchase.pending_amount)}
                              </TableCell>
                              <TableCell>
                                {getPaymentStatusBadge(purchase.payment_status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Pagos Recientes</h3>
                  {selectedSupplierDetail.recent_payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No hay pagos registrados
                    </p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Concepto</TableHead>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplierDetail.recent_payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-sm">
                                {payment.payment_number}
                              </TableCell>
                              <TableCell>{formatDate(payment.paid_at)}</TableCell>
                              <TableCell>{payment.concept}</TableCell>
                              <TableCell>{payment.payment_method?.name}</TableCell>
                              <TableCell className="text-right text-green-600 font-semibold">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
