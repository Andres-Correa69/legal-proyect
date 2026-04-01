import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  balanceInquiryApi,
  salesApi,
  type ClientBalanceDetail,
  type ClientSaleInfo,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  CalendarPlus,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";

interface ShowProps {
  clientId: number;
}

export default function ClientBalanceShow() {
  const { auth, clientId } = usePage<SharedData & ShowProps>().props;
  const user = auth.user;
  const canView = hasPermission('payments.view', user);
  const canCreatePayment = hasPermission('payments.create-income', user);
  const canManageSales = hasPermission('sales.manage', user);

  const [clientDetail, setClientDetail] = useState<ClientBalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesSearch, setSalesSearch] = useState('');
  const [paymentsSearch, setPaymentsSearch] = useState('');

  const filteredSales = useMemo(() => {
    if (!clientDetail) return [];
    if (!salesSearch.trim()) return clientDetail.sales;
    const q = salesSearch.toLowerCase();
    return clientDetail.sales.filter(
      (s) =>
        s.invoice_number.toLowerCase().includes(q) ||
        s.type_label.toLowerCase().includes(q) ||
        s.payment_status_label?.toLowerCase().includes(q)
    );
  }, [clientDetail, salesSearch]);

  const filteredPayments = useMemo(() => {
    if (!clientDetail) return [];
    if (!paymentsSearch.trim()) return clientDetail.payments;
    const q = paymentsSearch.toLowerCase();
    return clientDetail.payments.filter(
      (p) =>
        p.invoice_number.toLowerCase().includes(q) ||
        p.payment_method.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q))
    );
  }, [clientDetail, paymentsSearch]);

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadClientDetail();
  }, [canView, clientId]);

  if (!canView) return null;

  const loadClientDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const detail = await balanceInquiryApi.client(clientId);
      setClientDetail(detail);
    } catch (err: any) {
      console.error('Error loading client detail:', err);
      setError(err.message || 'Error al cargar detalle del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const url = balanceInquiryApi.exportClientBalanceUrl(clientId);
    window.open(url, '_blank');
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
    <AppLayout title="Estado de Cuenta">
      <Head title="Estado de Cuenta" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.visit('/admin/balances/clients')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Estado de Cuenta</h2>
              {clientDetail && (
                <p className="text-muted-foreground">
                  {clientDetail.client.name}
                  {clientDetail.client.document_id && (
                    <span className="ml-2">
                      — {clientDetail.client.document_type}: {clientDetail.client.document_id}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          {clientDetail && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Spinner className="mr-2" />
            <p>Cargando estado de cuenta...</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
            {error}
          </div>
        )}

        {clientDetail && (
          <>
            {/* Client Info + Totals */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2 p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Email:</span>
                  <span className="truncate">{clientDetail.client.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Telefono:</span>
                  <span>{clientDetail.client.phone || '-'}</span>
                </div>
                {clientDetail.client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">Direccion:</span>
                    <span className="truncate">{clientDetail.client.address}</span>
                  </div>
                )}
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Ventas</div>
                <div className="text-2xl font-bold">{clientDetail.totals.sales_count}</div>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">Total Facturado</div>
                <div className="text-lg font-bold">{formatCurrency(clientDetail.totals.total_sales)}</div>
              </div>
              <div className="p-4 border rounded-lg text-center bg-green-500/10">
                <div className="text-xs text-muted-foreground">Total Pagado</div>
                <div className="text-lg font-bold text-green-600">{formatCurrency(clientDetail.totals.total_paid)}</div>
              </div>
              <div className="p-4 border rounded-lg text-center bg-red-500/10">
                <div className="text-xs text-muted-foreground">Pendiente</div>
                <div className="text-lg font-bold text-red-600">{formatCurrency(clientDetail.totals.total_balance_due)}</div>
              </div>
            </div>

            {/* Charts */}
            {clientDetail.totals.total_sales > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avance de Cobro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart style={{ cursor: 'default' }}>
                          <Pie
                            data={[
                              { name: 'Pagado', value: clientDetail.totals.total_paid },
                              { name: 'Pendiente', value: clientDetail.totals.total_balance_due },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius="35%"
                            outerRadius="55%"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            isAnimationActive={false}
                            cursor="default"
                            style={{ outline: 'none' }}
                          >
                            <Cell fill="#F97415" style={{ outline: 'none' }} />
                            <Cell fill="#d1d5db" style={{ outline: 'none' }} />
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bar Chart - Per Invoice */}
                {clientDetail.sales.length > 0 && clientDetail.sales.length <= 20 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avance por Factura</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart
                            data={clientDetail.sales.map(s => ({
                              name: s.invoice_number,
                              pagado: s.paid_amount,
                              pendiente: s.balance,
                            }))}
                            layout="vertical"
                            margin={{ left: 10, right: 10 }}
                            style={{ cursor: 'default' }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="pagado" stackId="a" fill="#F97415" name="Pagado" isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                            <Bar dataKey="pendiente" stackId="a" fill="#d1d5db" name="Pendiente" isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment History */}
                {clientDetail.payments.length > 1 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Historial de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[180px] sm:h-[200px] md:h-[220px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          <BarChart
                            data={(() => {
                              const grouped: Record<string, number> = {};
                              clientDetail.payments.forEach(p => {
                                const month = p.payment_date.substring(0, 7);
                                grouped[month] = (grouped[month] || 0) + p.amount;
                              });
                              return Object.entries(grouped)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([month, total]) => ({
                                  mes: new Date(month + '-01').toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
                                  total,
                                }));
                            })()}
                            margin={{ left: 10, right: 10 }}
                            style={{ cursor: 'default' }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="total" fill="#F97415" name="Pagos" radius={[4, 4, 0, 0]} isAnimationActive={false} cursor="default" style={{ outline: 'none' }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Tabs: Ventas | Pagos | Calendario */}
            <Tabs defaultValue="sales">
              <TabsList>
                <TabsTrigger value="sales">Ventas ({clientDetail.sales.length})</TabsTrigger>
                <TabsTrigger value="payments">Pagos ({clientDetail.payments.length})</TabsTrigger>
                <TabsTrigger value="calendar">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Calendario
                </TabsTrigger>
              </TabsList>

              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar factura, tipo..."
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredSales.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        {salesSearch.trim() ? `No se encontraron resultados para "${salesSearch}"` : 'No hay ventas registradas'}
                      </p>
                    ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Factura</TableHead>
                            <TableHead className="whitespace-nowrap">Tipo</TableHead>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="whitespace-nowrap">Vencimiento</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Pagado</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Saldo</TableHead>
                            <TableHead className="text-center whitespace-nowrap">Estado</TableHead>
                            <TableHead className="whitespace-nowrap">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{sale.invoice_number}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{sale.type_label}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{formatDate(sale.date)}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{sale.due_date ? formatDate(sale.due_date) : '-'}</TableCell>
                              <TableCell className="text-right text-sm whitespace-nowrap">{formatCurrency(sale.total_amount)}</TableCell>
                              <TableCell className="text-right text-sm text-green-600 whitespace-nowrap">{formatCurrency(sale.paid_amount)}</TableCell>
                              <TableCell className="text-right text-sm text-red-600 font-semibold whitespace-nowrap">{formatCurrency(sale.balance)}</TableCell>
                              <TableCell className="text-center">
                                {getPaymentStatusBadge(sale.payment_status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => router.visit(`/admin/sales/${sale.id}`)}
                                    title="Ver factura"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canCreatePayment && sale.balance > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => router.visit(`/admin/payments?sale_id=${sale.id}`)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      Pagar
                                    </Button>
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
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar factura, metodo, referencia..."
                        value={paymentsSearch}
                        onChange={(e) => setPaymentsSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPayments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        {paymentsSearch.trim() ? `No se encontraron resultados para "${paymentsSearch}"` : 'No hay pagos registrados'}
                      </p>
                    ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                            <TableHead className="whitespace-nowrap">Factura</TableHead>
                            <TableHead className="whitespace-nowrap">Metodo</TableHead>
                            <TableHead className="whitespace-nowrap">Referencia</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                            <TableHead className="whitespace-nowrap">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="text-sm whitespace-nowrap">{formatDate(payment.payment_date)}</TableCell>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{payment.invoice_number}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{payment.payment_method}</TableCell>
                              <TableCell className="text-sm">{payment.reference || '-'}</TableCell>
                              <TableCell className="text-right text-sm text-green-600 font-semibold whitespace-nowrap">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => router.visit(`/admin/sales/${payment.sale_id}`)}
                                  title="Ver factura"
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
              </TabsContent>

              {/* Calendar Tab */}
              <TabsContent value="calendar" className="mt-4">
                <ClientInvoiceCalendar
                  sales={clientDetail.sales}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  canManageSales={canManageSales}
                  onSalesUpdated={loadClientDetail}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// ─── Client Invoice Calendar ──────────────────────────────────────────────────

const WEEKDAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getInvoiceUrgencyColor(sale: ClientSaleInfo): string {
  if (sale.payment_status === 'paid') return "bg-green-500/15 text-green-700 border-green-500/20";
  if (!sale.due_date) return "bg-muted text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(sale.due_date);
  dueDate.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  if (dueDate < today) return "bg-red-500/15 text-red-700 border-red-500/20"; // Vencida
  if (dueDate <= in7Days) return "bg-amber-500/15 text-amber-700 border-amber-500/20"; // Vence en 7 dias
  return "bg-blue-500/15 text-blue-700 border-blue-500/20"; // Mas de 7 dias
}

interface ClientInvoiceCalendarProps {
  sales: ClientSaleInfo[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  canManageSales: boolean;
  onSalesUpdated: () => void;
}

function ClientInvoiceCalendar({ sales, formatCurrency, formatDate, canManageSales, onSalesUpdated }: ClientInvoiceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Dialog for viewing invoices on a date
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewDialogDate, setViewDialogDate] = useState<string>('');
  const [viewDialogSales, setViewDialogSales] = useState<ClientSaleInfo[]>([]);
  // Dialog for assigning a sale to a date
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDialogDate, setAssignDialogDate] = useState<string>('');
  const [selectedSaleToAssign, setSelectedSaleToAssign] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [calendarSearch, setCalendarSearch] = useState('');

  // Filter invoices that have due_date and are not fully paid
  const invoicesWithDueDates = useMemo(() => {
    return sales.filter(s =>
      s.due_date &&
      s.status !== 'cancelled' &&
      (s.payment_status === 'pending' || s.payment_status === 'partial')
    );
  }, [sales]);

  // All invoices with due_date for the calendar (including paid)
  const allInvoicesWithDueDates = useMemo(() => {
    return sales.filter(s => s.due_date);
  }, [sales]);

  // Sales without due_date (available to assign)
  const salesWithoutDueDate = useMemo(() => {
    return sales.filter(s => !s.due_date && s.status !== 'cancelled');
  }, [sales]);

  // Map dates to invoices
  const dateToInvoices = useMemo(() => {
    const map = new Map<string, ClientSaleInfo[]>();
    allInvoicesWithDueDates.forEach(sale => {
      if (sale.due_date) {
        const dateKey = sale.due_date.split('T')[0].split(' ')[0];
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, sale]);
      }
    });
    return map;
  }, [allInvoicesWithDueDates]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const overdue = invoicesWithDueDates.filter(s => {
      const d = new Date(s.due_date!);
      d.setHours(0, 0, 0, 0);
      return d < today;
    });
    const dueIn7Days = invoicesWithDueDates.filter(s => {
      const d = new Date(s.due_date!);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= in7Days;
    });
    const upcoming = invoicesWithDueDates.filter(s => {
      const d = new Date(s.due_date!);
      d.setHours(0, 0, 0, 0);
      return d > in7Days;
    });

    return {
      overdue: { count: overdue.length, amount: overdue.reduce((sum, s) => sum + s.balance, 0) },
      dueIn7Days: { count: dueIn7Days.length, amount: dueIn7Days.reduce((sum, s) => sum + s.balance, 0) },
      upcoming: { count: upcoming.length, amount: upcoming.reduce((sum, s) => sum + s.balance, 0) },
    };
  }, [invoicesWithDueDates]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = getStartOfMonth(currentMonth);
    const monthEnd = getEndOfMonth(currentMonth);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    let startDow = monthStart.getDay() - 1; // Monday=0
    if (startDow < 0) startDow = 6;

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - i - 1);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      days.push({ date: new Date(d), isCurrentMonth: true });
    }

    while (days.length % 7 !== 0) {
      const lastDate = days[days.length - 1].date;
      const next = new Date(lastDate);
      next.setDate(next.getDate() + 1);
      days.push({ date: next, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = currentMonth.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  const handleDayClick = (date: Date, dateKey: string, invoices: ClientSaleInfo[], isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    if (invoices.length > 0) {
      // Show invoices for this date
      const dateLabel = date.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      setViewDialogDate(dateLabel);
      setViewDialogSales(invoices);
      setViewDialogOpen(true);
    } else if (canManageSales && salesWithoutDueDate.length > 0) {
      // Open assign dialog
      setAssignDialogDate(dateKey);
      setSelectedSaleToAssign('');
      setAssignDialogOpen(true);
    }
  };

  const handleAssignDueDate = async () => {
    if (!selectedSaleToAssign || !assignDialogDate) return;
    setAssignLoading(true);
    try {
      await salesApi.updateDueDate(parseInt(selectedSaleToAssign), assignDialogDate);
      setAssignDialogOpen(false);
      onSalesUpdated();
    } catch (err: any) {
      console.error('Error updating due date:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const formatDateLabel = (dateKey: string) => {
    const d = new Date(dateKey + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-2 border-red-500/20 bg-red-500/10/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-red-500/15 p-1.5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Vencidas</h3>
            {stats.overdue.count > 0 && (
              <Badge variant="destructive" className="text-xs ml-auto">
                {stats.overdue.count}
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(stats.overdue.amount)}</p>
        </Card>

        <Card className="p-4 border-2 border-amber-500/20 bg-amber-500/10/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-amber-500/15 p-1.5 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Vencen en 7 dias</h3>
            {stats.dueIn7Days.count > 0 && (
              <Badge className="text-xs ml-auto bg-amber-500/15 text-amber-700 border-amber-500/20">
                {stats.dueIn7Days.count}
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(stats.dueIn7Days.amount)}</p>
        </Card>

        <Card className="p-4 border-2 border-blue-500/20 bg-blue-500/10/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-blue-500/15 p-1.5 rounded-lg">
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Proximas</h3>
            {stats.upcoming.count > 0 && (
              <Badge className="text-xs ml-auto bg-blue-500/15 text-blue-700 border-blue-500/20">
                {stats.upcoming.count}
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(stats.upcoming.amount)}</p>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground bg-muted/20">
              {day}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, i) => {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayInvoices = dateToInvoices.get(dateKey) || [];
            const isToday = isSameDay(date, today);
            const hasInvoices = dayInvoices.length > 0;
            const canAssign = canManageSales && salesWithoutDueDate.length > 0 && !hasInvoices && isCurrentMonth;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 transition-colors",
                  !isCurrentMonth && "bg-muted/10",
                  isCurrentMonth && "bg-card",
                  (hasInvoices || canAssign) && isCurrentMonth && "cursor-pointer hover:bg-accent/50",
                  (i + 1) % 7 === 0 && "border-r-0",
                )}
                onClick={() => handleDayClick(date, dateKey, dayInvoices, isCurrentMonth)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-md",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && "text-foreground",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayInvoices.length > 1 && isCurrentMonth && (
                    <span className="text-[10px] text-muted-foreground">
                      {dayInvoices.length}
                    </span>
                  )}
                </div>

                {isCurrentMonth && (
                  <div className="space-y-0.5">
                    {dayInvoices.slice(0, 3).map((sale) => (
                      <div
                        key={sale.id}
                        className={cn(
                          "text-[10px] leading-tight px-1.5 py-0.5 rounded-md border truncate",
                          getInvoiceUrgencyColor(sale),
                        )}
                        title={`${sale.invoice_number} - ${formatCurrency(sale.balance)}`}
                      >
                        {sale.invoice_number}
                      </div>
                    ))}
                    {dayInvoices.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayInvoices.length - 3} mas
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-t bg-muted/20">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/15 border border-red-500/20"></div>
              <span className="text-muted-foreground">Vencida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/15 border border-amber-500/20"></div>
              <span className="text-muted-foreground">Vence en 7 dias</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/15 border border-blue-500/20"></div>
              <span className="text-muted-foreground">Proxima</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/15 border border-green-500/20"></div>
              <span className="text-muted-foreground">Pagada</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Invoices with due date list below calendar */}
      {invoicesWithDueDates.length > 0 && (() => {
        const filteredCalendarInvoices = calendarSearch.trim()
          ? invoicesWithDueDates.filter((s) => {
              const q = calendarSearch.toLowerCase();
              return s.invoice_number.toLowerCase().includes(q) ||
                s.payment_status_label?.toLowerCase().includes(q);
            })
          : invoicesWithDueDates;

        return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-sm font-medium">Facturas Pendientes con Vencimiento</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar factura..."
                  value={calendarSearch}
                  onChange={(e) => setCalendarSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredCalendarInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No se encontraron resultados para "{calendarSearch}"
              </p>
            ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Factura</TableHead>
                    <TableHead className="whitespace-nowrap">Vencimiento</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Saldo</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Urgencia</TableHead>
                    <TableHead className="whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalendarInvoices
                    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
                    .map((sale) => {
                      const dueDate = new Date(sale.due_date!);
                      dueDate.setHours(0, 0, 0, 0);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);
                      const daysUntil = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                      let urgencyLabel = '';
                      let urgencyClass = '';
                      if (daysUntil < 0) {
                        urgencyLabel = `Vencida hace ${Math.abs(daysUntil)} dia${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
                        urgencyClass = 'text-red-600 font-semibold';
                      } else if (daysUntil === 0) {
                        urgencyLabel = 'Vence hoy';
                        urgencyClass = 'text-red-600 font-semibold';
                      } else if (daysUntil <= 7) {
                        urgencyLabel = `Vence en ${daysUntil} dia${daysUntil !== 1 ? 's' : ''}`;
                        urgencyClass = 'text-amber-600';
                      } else {
                        urgencyLabel = `Vence en ${daysUntil} dias`;
                        urgencyClass = 'text-blue-600';
                      }

                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm whitespace-nowrap">{sale.invoice_number}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(sale.due_date!)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold whitespace-nowrap">{formatCurrency(sale.balance)}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={cn(
                                "border",
                                sale.payment_status === 'partial' ? "bg-yellow-500/15 text-yellow-700" : "bg-red-500/15 text-red-700"
                              )}
                            >
                              {sale.payment_status_label}
                            </Badge>
                          </TableCell>
                          <TableCell className={cn("text-sm whitespace-nowrap", urgencyClass)}>
                            {urgencyLabel}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => router.visit(`/admin/sales/${sale.id}`)}
                              title="Ver factura"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
        );
      })()}

      {allInvoicesWithDueDates.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Sin fechas de vencimiento</h3>
          <p className="text-sm text-muted-foreground">
            Este cliente no tiene facturas con fecha de vencimiento registrada.
          </p>
        </Card>
      )}

      {/* View invoices dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Facturas del dia</DialogTitle>
            <DialogDescription className="capitalize">{viewDialogDate}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {viewDialogSales.map((sale) => {
              const isPaid = sale.payment_status === 'paid';
              return (
                <Card
                  key={sale.id}
                  className={cn("p-4", isPaid && "border-green-500/20 bg-green-500/10/50")}
                >
                  {isPaid && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-md bg-green-500/15 border border-green-500/20">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <p className="text-sm text-green-700 font-medium">
                        Esta factura ya fue pagada en su totalidad
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-bold">{sale.invoice_number}</span>
                        <Badge className={cn("border text-[10px]", getInvoiceUrgencyColor(sale))}>
                          {sale.payment_status_label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {sale.type_label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-semibold">{formatCurrency(sale.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pagado</p>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(sale.paid_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo</p>
                          <p className={cn("text-sm font-semibold", isPaid ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(sale.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewDialogOpen(false);
                          router.visit(`/admin/sales/${sale.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      {sale.balance > 0 && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setViewDialogOpen(false);
                            router.visit(`/admin/payments?sale_id=${sale.id}`);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign due date dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-5 w-5" />
                Asignar Vencimiento
              </div>
            </DialogTitle>
            <DialogDescription className="capitalize">
              {assignDialogDate && formatDateLabel(assignDialogDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Selecciona una factura</label>
              <Select value={selectedSaleToAssign} onValueChange={setSelectedSaleToAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona factura..." />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {salesWithoutDueDate.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id.toString()}>
                      {sale.invoice_number} — {formatCurrency(sale.total_amount)} ({sale.payment_status_label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSaleToAssign && (() => {
              const sale = salesWithoutDueDate.find(s => s.id.toString() === selectedSaleToAssign);
              if (!sale) return null;
              return (
                <Card className="p-3 bg-muted/50">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold">{formatCurrency(sale.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pagado</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(sale.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Saldo</p>
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(sale.balance)}</p>
                    </div>
                  </div>
                </Card>
              );
            })()}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={assignLoading}>
                Cancelar
              </Button>
              <Button onClick={handleAssignDueDate} disabled={!selectedSaleToAssign || assignLoading}>
                {assignLoading && <Spinner className="mr-2" size="sm" />}
                Asignar Fecha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
