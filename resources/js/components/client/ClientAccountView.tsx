import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Download,
  Eye,
  Search,
  Calendar,
  MoreHorizontal,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { router } from "@inertiajs/react";
import type { ClientBalanceDetail } from "@/lib/api";

interface ClientAccountViewProps {
  balanceData: ClientBalanceDetail | null;
}

const formatCurrency = (amount: number) =>
  `$ ${amount.toLocaleString("es-CO")}`;

const formatDate = (dateStr: string) => {
  if (dateStr === "-" || !dateStr) return "-";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

export const ClientAccountView = ({ balanceData }: ClientAccountViewProps) => {
  const [subTab, setSubTab] = useState<"ventas" | "pagos" | "calendario">("ventas");
  const [searchQuery, setSearchQuery] = useState("");

  const sales = balanceData?.sales ?? [];
  const payments = balanceData?.payments ?? [];
  const totals = balanceData?.totals;

  const totalSales = totals?.sales_count ?? 0;
  const totalInvoiced = totals?.total_sales ?? 0;
  const totalPaidAmount = totals?.total_paid ?? 0;
  const totalPending = totals?.total_balance_due ?? 0;

  const paidPercent = totalInvoiced > 0 ? Math.round((totalPaidAmount / totalInvoiced) * 100) : 0;
  const pendingPercent = 100 - paidPercent;

  const pieData = [
    { name: "Pagado", value: totalPaidAmount },
    { name: "Pendiente", value: totalPending },
  ];

  const barData = useMemo(() =>
    sales.slice(0, 5).map((s) => ({
      name: s.invoice_number,
      total: s.total_amount,
      paid: s.paid_amount,
    })),
  [sales]);

  const filteredSales = useMemo(() =>
    sales.filter(
      (s) =>
        s.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.type_label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [sales, searchQuery]);

  const filteredPayments = useMemo(() =>
    payments.filter(
      (p) =>
        p.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference || "").toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [payments, searchQuery]);

  const getStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return (
          <Badge variant="outline" className="text-[hsl(var(--success))] border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" /> Pagado
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="text-[hsl(var(--warning))] border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 gap-1 text-xs">
            <Clock className="h-3 w-3" /> Parcial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10 gap-1 text-xs">
            <AlertCircle className="h-3 w-3" /> Pendiente
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{paymentStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="text-center">
          <CardContent className="py-4 px-3">
            <p className="text-xs text-muted-foreground mb-1">Ventas</p>
            <p className="text-2xl font-bold">{totalSales}</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="py-4 px-3">
            <p className="text-xs text-muted-foreground mb-1">Total Facturado</p>
            <p className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20">
          <CardContent className="py-4 px-3">
            <p className="text-xs text-muted-foreground mb-1">Total Pagado</p>
            <p className="text-2xl font-bold text-[hsl(var(--success))]">{formatCurrency(totalPaidAmount)}</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-destructive/5 border-destructive/20">
          <CardContent className="py-4 px-3">
            <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avance de Cobro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span>Pagado {paidPercent}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <span>Pendiente {pendingPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avance por Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  fontSize={11}
                />
                <YAxis type="category" dataKey="name" width={95} fontSize={11} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sub-tabs: Ventas / Pagos / Calendario */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { id: "ventas" as const, label: `Ventas (${sales.length})` },
          { id: "pagos" as const, label: `Pagos (${payments.length})` },
          { id: "calendario" as const, label: "Calendario", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              subTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
            {subTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-1.5 mb-1">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar Excel</span>
        </Button>
      </div>

      {/* Ventas Table */}
      {subTab === "ventas" && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar factura, tipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Factura</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Vencimiento</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Pagado</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Saldo</TableHead>
                    <TableHead className="text-xs text-center">Estado</TableHead>
                    <TableHead className="text-xs text-center w-10">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="text-sm font-medium">{sale.invoice_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sale.type_label}</TableCell>
                      <TableCell className="text-sm">{formatDate(sale.date)}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{sale.due_date ? formatDate(sale.due_date) : "-"}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell className="text-sm text-right text-[hsl(var(--success))] hidden sm:table-cell">{formatCurrency(sale.paid_amount)}</TableCell>
                      <TableCell className="text-sm text-right hidden sm:table-cell">
                        <span className={sale.balance > 0 ? "text-destructive font-medium" : ""}>
                          {formatCurrency(sale.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(sale.payment_status)}</TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card z-50">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer"><Download className="h-4 w-4 mr-2" /> Descargar</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer"><Mail className="h-4 w-4 mr-2" /> Enviar Email</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer"><MessageSquare className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagos Table */}
      {subTab === "pagos" && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pago, factura, método..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Referencia</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Factura</TableHead>
                    <TableHead className="text-xs">Método</TableHead>
                    <TableHead className="text-xs text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.reference || `PAG-${p.id}`}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.payment_date)}</TableCell>
                      <TableCell className="text-sm text-primary cursor-pointer" onClick={() => router.visit(`/admin/sales/${p.sale_id}`)}>{p.invoice_number}</TableCell>
                      <TableCell className="text-sm">{p.payment_method}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-[hsl(var(--success))]">
                        {formatCurrency(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendario placeholder */}
      {subTab === "calendario" && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Vista de calendario de vencimientos próximamente</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
