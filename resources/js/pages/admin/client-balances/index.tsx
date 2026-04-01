import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  type ClientBalanceTotals,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Eye,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

export default function ClientBalancesIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission('payments.view', user);

  const [clients, setClients] = useState<ClientBalance[]>([]);
  const [totals, setTotals] = useState<ClientBalanceTotals>({
    total_sales: 0,
    total_paid: 0,
    total_balance_due: 0,
    clients_count: 0,
    clients_with_debt: 0,
  });
  const [loading, setLoading] = useState(true);
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

  const loadData = async (overrideFilters?: typeof filters) => {
    const f = overrideFilters || filters;
    try {
      setLoading(true);
      setGeneralError('');
      const params: any = {};
      if (f.search) params.search = f.search;
      if (f.payment_status !== 'all') params.payment_status = f.payment_status;
      if (f.date_from) params.date_from = f.date_from;
      if (f.date_to) params.date_to = f.date_to;

      const response = await balanceInquiryApi.clients(params);
      setClients(response.clients || []);
      setTotals(response.totals || {
        total_sales: 0,
        total_paid: 0,
        total_balance_due: 0,
        clients_count: 0,
        clients_with_debt: 0,
      });
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos de saldos');
    } finally {
      setLoading(false);
    }
  };

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

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    loadData(newFilters);
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
    loadData(newFilters);
  };

  const viewClientDetail = (clientId: number) => {
    router.visit(`/admin/balances/clients/${clientId}`);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      const params: any = { format };
      if (filters.search) params.search = filters.search;
      if (filters.payment_status !== 'all') params.payment_status = filters.payment_status;
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
      toast({ title: 'Exportación exitosa', description: `Reporte descargado en formato ${format === 'pdf' ? 'PDF' : 'Excel'}` });
    } catch (error: any) {
      toast({ title: 'Error al exportar', description: error.message || 'No se pudo generar el reporte', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500/15 text-green-700"><CheckCircle className="mr-1 h-3 w-3" />Pagado</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-500/15 text-yellow-700"><Clock className="mr-1 h-3 w-3" />Parcial</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-red-500/15 text-red-700"><AlertCircle className="mr-1 h-3 w-3" />Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Saldos de Clientes">
      <Head title="Saldos de Clientes" />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Saldos de Clientes</h2>
            <p className="text-muted-foreground">Consulta y gestiona los saldos pendientes de clientes</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exporting || loading}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={exporting || loading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.total_sales)}</div>
              <p className="text-xs text-muted-foreground">{totals.clients_count} clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.total_paid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.total_balance_due)}</div>
              <p className="text-xs text-muted-foreground">{totals.clients_with_debt} con deuda</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Porcentaje Cobrado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.total_sales > 0
                  ? ((totals.total_paid / totals.total_sales) * 100).toFixed(1)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
          <Input
            placeholder="Nombre, documento, email..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full lg:w-64"
          />
          <Select value={filters.payment_status} onValueChange={(value) => updateFilter('payment_status', value)}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="with_debt">Con Deuda</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
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

        {generalError && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>Clientes con ventas registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : clients.length === 0 ? (
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
                      <TableHead>Contacto</TableHead>
                      <TableHead className="text-right">Total Ventas</TableHead>
                      <TableHead className="text-right">Pagado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>
                          {client.document_type && client.document_id
                            ? `${client.document_type}: ${client.document_id}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {client.email && <div>{client.email}</div>}
                            {client.phone && <div className="text-muted-foreground">{client.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(client.total_sales)}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(client.total_paid)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(client.balance_due)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getPaymentStatusBadge(client.payment_status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewClientDetail(client.client_id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalle
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
    </AppLayout>
  );
}
