import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Edit,
  FileText,
  History,
  Info,
  LayoutDashboard,
  Loader2,
  Mail,
  Phone,
  Receipt,
  Search,
  ShoppingCart,
  Star,
  TrendingDown,
  TrendingUp,
  Truck,
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import AppLayout from "@/layouts/app-layout";
import { useToast } from "@/hooks/use-toast";
import { suppliersApi, balanceInquiryApi } from "@/lib/api";
import type { Supplier, SupplierBalanceDetail, Payment } from "@/lib/api";

interface Props {
  supplierId: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "info", label: "Información", icon: Info },
  { id: "purchases", label: "Compras", icon: ShoppingCart },
  { id: "balances", label: "Saldos", icon: Receipt },
  { id: "payments", label: "Pagos", icon: Banknote },
  { id: "history", label: "Historial", icon: History },
];

const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

const fmtDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtShortDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];
const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// ─── Dashboard Tab ──────────────────────────────────────────────
const DashboardTab = ({
  balanceData,
  supplier,
}: {
  balanceData: SupplierBalanceDetail | null;
  supplier: Supplier;
}) => {
  const purchases = balanceData?.purchases ?? [];
  const payments = balanceData?.recent_payments ?? [];
  const totalPurchases = balanceData?.total_purchases ?? 0;
  const totalPaid = balanceData?.total_paid ?? 0;
  const totalPending = balanceData?.total_pending ?? 0;

  const purchaseCount = purchases.length;
  const avgTicket =
    purchaseCount > 0 ? Math.round(totalPurchases / purchaseCount) : 0;
  const paidPercent =
    totalPurchases > 0
      ? Math.round((totalPaid / totalPurchases) * 100)
      : 0;

  // Last purchase info
  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [purchases]
  );
  const lastPurchase = sortedPurchases[0];
  const daysSinceLastPurchase = lastPurchase
    ? Math.floor(
        (Date.now() - new Date(lastPurchase.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // 6-month spending chart
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { name: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthTotal = purchases
        .filter((p) => p.created_at.startsWith(key))
        .reduce((sum, p) => sum + p.total_amount, 0);
      months.push({ name: MONTH_NAMES[d.getMonth()], total: monthTotal });
    }
    return months;
  }, [purchases]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  // Pending purchases
  const pendingPurchases = purchases.filter(
    (p) => p.payment_status !== "paid"
  );

  // Payment status distribution
  const paidCount = purchases.filter(
    (p) => p.payment_status === "paid"
  ).length;
  const partialCount = purchases.filter(
    (p) => p.payment_status === "partial"
  ).length;
  const unpaidCount = purchases.filter(
    (p) => p.payment_status === "pending"
  ).length;

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-1">
                  Total Compras
                </p>
                <p className="text-lg font-bold">{purchaseCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-1">
                  Ticket Promedio
                </p>
                <p className="text-lg font-bold">{fmt(avgTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[hsl(var(--warning))]/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-1">
                  Última Compra
                </p>
                <p className="text-lg font-bold">
                  {daysSinceLastPurchase !== null
                    ? `${daysSinceLastPurchase}d`
                    : "N/A"}
                </p>
                {daysSinceLastPurchase !== null && (
                  <p className="text-[10px] text-muted-foreground">días atrás</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${totalPending > 0 ? "bg-destructive/10" : "bg-[hsl(var(--success))]/10"}`}>
                {totalPending > 0 ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none mb-1">
                  % Pagado
                </p>
                <p className={`text-lg font-bold ${totalPending > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                  {paidPercent}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-Month Chart */}
        <Card className="shadow-sm lg:col-span-2">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Compras últimos 6 meses</h3>
          </div>
          <CardContent className="p-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <RechartsTooltip
                    formatter={(value: any) => [fmt(value as number), "Total"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        <Card className="shadow-sm">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Estado de Compras</h3>
          </div>
          <CardContent className="p-4 flex flex-col items-center">
            {purchaseCount > 0 ? (
              <>
                <div className="h-[140px] w-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Pagado", value: totalPaid },
                          { name: "Pendiente", value: totalPending },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {PIE_COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any) => fmt(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Pagado</span>
                    <span className="font-semibold">{paidPercent}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="text-muted-foreground">Pendiente</span>
                    <span className="font-semibold">{100 - paidPercent}%</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 w-full">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" />
                      Pagadas
                    </span>
                    <span className="font-medium">{paidCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3 text-[hsl(var(--warning))]" />
                      Parciales
                    </span>
                    <span className="font-medium">{partialCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                      Pendientes
                    </span>
                    <span className="font-medium">{unpaidCount}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">Sin compras</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Purchase + Pending Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last Purchase */}
        <Card className="shadow-sm">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Última Compra</h3>
          </div>
          <CardContent className="p-4">
            {lastPurchase ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {lastPurchase.purchase_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(lastPurchase.created_at.split("T")[0])}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {fmt(lastPurchase.total_amount)}
                    </p>
                    <Badge
                      className={
                        lastPurchase.payment_status === "paid"
                          ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5"
                          : lastPurchase.payment_status === "partial"
                            ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] h-5"
                            : "text-[10px] h-5"
                      }
                    >
                      {lastPurchase.payment_status === "paid"
                        ? "PAGADO"
                        : lastPurchase.payment_status === "partial"
                          ? "PARCIAL"
                          : "PENDIENTE"}
                    </Badge>
                  </div>
                </div>
                {lastPurchase.pending_amount > 0 && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-md p-2">
                    <p className="text-xs text-destructive font-medium">
                      Saldo pendiente: {fmt(lastPurchase.pending_amount)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">Sin compras registradas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Balances Summary */}
        <Card className="shadow-sm">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Resumen de Saldos</h3>
          </div>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total comprado
                </span>
                <span className="text-sm font-bold">{fmt(totalPurchases)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total pagado
                </span>
                <span className="text-sm font-bold text-[hsl(var(--success))]">
                  {fmt(totalPaid)}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Saldo pendiente</span>
                <span
                  className={`text-sm font-bold ${totalPending > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}
                >
                  {fmt(totalPending)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Avance de pago</span>
                  <span>{paidPercent}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>
              {pendingPurchases.length > 0 && (
                <p className="text-[10px] text-destructive font-medium">
                  {pendingPurchases.length} compra
                  {pendingPurchases.length !== 1 ? "s" : ""} con saldo pendiente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Info Tab ────────────────────────────────────────────────────
const InfoTab = ({ supplier }: { supplier: Supplier }) => (
  <Card className="rounded-lg shadow-sm">
    <div className="px-6 py-4 border-b border-border bg-muted/30 rounded-t-lg">
      <h2 className="text-sm font-semibold text-foreground">
        Datos del Proveedor
      </h2>
    </div>
    <CardContent className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Nombre</p>
          <p className="text-sm font-medium">{supplier.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Nombre de Contacto
          </p>
          <p className="text-sm font-medium">
            {supplier.contact_name || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tipo Documento</p>
          <p className="text-sm font-medium">
            {supplier.document_type || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            Número Documento
          </p>
          <p className="text-sm font-medium">{supplier.tax_id || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Email</p>
          <p className="text-sm font-medium">{supplier.email || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
          <p className="text-sm font-medium">{supplier.phone || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Dirección</p>
          <p className="text-sm font-medium">{supplier.address || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Municipio</p>
          <p className="text-sm font-medium">
            {supplier.municipality?.name || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Estado</p>
          <Badge
            variant="default"
            className={
              supplier.is_active
                ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5"
                : "text-[10px] h-5"
            }
          >
            {supplier.is_active ? "ACTIVO" : "INACTIVO"}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Purchases Tab ──────────────────────────────────────────────
const PurchasesTab = ({
  balanceData,
}: {
  balanceData: SupplierBalanceDetail | null;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const purchases = balanceData?.purchases ?? [];

  const filtered = useMemo(() => {
    return purchases.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.purchase_number.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || p.payment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchQuery, statusFilter]);

  return (
    <Card className="rounded-lg shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/30 rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground flex-1">
            Compras ({filtered.length})
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
                <SelectItem value="partial">Parciales</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 px-4">Fecha</TableHead>
                  <TableHead className="h-12 px-4">Número</TableHead>
                  <TableHead className="h-12 px-4 text-right">Total</TableHead>
                  <TableHead className="h-12 px-4 text-right hidden sm:table-cell">
                    Pagado
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right hidden sm:table-cell">
                    Pendiente
                  </TableHead>
                  <TableHead className="h-12 px-4">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="p-4 text-sm">
                      {fmtDate(purchase.created_at.split("T")[0])}
                    </TableCell>
                    <TableCell className="p-4 text-sm font-medium">
                      {purchase.purchase_number}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-right font-medium">
                      {fmt(purchase.total_amount)}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-right hidden sm:table-cell">
                      {fmt(purchase.paid_amount)}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-right hidden sm:table-cell">
                      <span
                        className={
                          purchase.pending_amount > 0
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {fmt(purchase.pending_amount)}
                      </span>
                    </TableCell>
                    <TableCell className="p-4">
                      <Badge
                        className={
                          purchase.payment_status === "paid"
                            ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5"
                            : purchase.payment_status === "partial"
                              ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] h-5"
                              : "text-[10px] h-5"
                        }
                      >
                        {purchase.payment_status === "paid"
                          ? "PAGADO"
                          : purchase.payment_status === "partial"
                            ? "PARCIAL"
                            : "PENDIENTE"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {searchQuery || statusFilter !== "all"
                ? "No se encontraron compras con esos filtros"
                : "No hay compras registradas"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Balances Tab ───────────────────────────────────────────────
const BalancesTab = ({
  balanceData,
}: {
  balanceData: SupplierBalanceDetail | null;
}) => {
  const purchases = balanceData?.purchases ?? [];
  const totalPurchases = balanceData?.total_purchases ?? 0;
  const totalPaid = balanceData?.total_paid ?? 0;
  const totalPending = balanceData?.total_pending ?? 0;

  const paidPercent =
    totalPurchases > 0
      ? Math.round((totalPaid / totalPurchases) * 100)
      : 0;

  const pendingPurchases = useMemo(
    () => purchases.filter((p) => p.pending_amount > 0),
    [purchases]
  );

  const pieData = [
    { name: "Pagado", value: totalPaid },
    { name: "Pendiente", value: totalPending },
  ];

  // Top 5 pending by amount
  const topPending = useMemo(
    () =>
      [...pendingPurchases]
        .sort((a, b) => b.pending_amount - a.pending_amount)
        .slice(0, 5),
    [pendingPurchases]
  );
  const maxPending = topPending[0]?.pending_amount ?? 1;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Total Compras
            </p>
            <p className="text-lg font-bold">{purchases.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Total Facturado
            </p>
            <p className="text-lg font-bold">{fmt(totalPurchases)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Total Pagado
            </p>
            <p className="text-lg font-bold text-[hsl(var(--success))]">
              {fmt(totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Total Pendiente
            </p>
            <p
              className={`text-lg font-bold ${totalPending > 0 ? "text-destructive" : ""}`}
            >
              {fmt(totalPending)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut Chart - Payment Progress */}
        <Card className="shadow-sm">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Avance de Pago</h3>
          </div>
          <CardContent className="p-4 flex flex-col items-center">
            {totalPurchases > 0 ? (
              <>
                <div className="h-[180px] w-[180px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {PIE_COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any) => fmt(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold">{paidPercent}%</p>
                    <p className="text-[10px] text-muted-foreground">Pagado</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Pagado</span>
                    <span className="font-semibold">{fmt(totalPaid)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-muted" />
                    <span className="text-muted-foreground">Pendiente</span>
                    <span className="font-semibold">{fmt(totalPending)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">Sin datos de saldos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Pending Purchases */}
        <Card className="shadow-sm">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">
              Mayores Saldos Pendientes
            </h3>
          </div>
          <CardContent className="p-4">
            {topPending.length > 0 ? (
              <div className="space-y-3">
                {topPending.map((purchase) => (
                  <div key={purchase.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">
                        {purchase.purchase_number}
                      </span>
                      <span className="text-destructive font-semibold">
                        {fmt(purchase.pending_amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-destructive/70 rounded-full"
                        style={{
                          width: `${(purchase.pending_amount / maxPending) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        {fmtDate(purchase.created_at.split("T")[0])}
                      </span>
                      <span>
                        Total: {fmt(purchase.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 opacity-40 text-[hsl(var(--success))]" />
                <p className="text-xs">Sin saldos pendientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Purchases Table */}
      {pendingPurchases.length > 0 && (
        <Card className="shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b border-border bg-muted/30 rounded-t-lg">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Compras con Saldo Pendiente ({pendingPurchases.length})
            </h3>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-12 px-4">Fecha</TableHead>
                    <TableHead className="h-12 px-4">Número</TableHead>
                    <TableHead className="h-12 px-4 text-right">
                      Total
                    </TableHead>
                    <TableHead className="h-12 px-4 text-right">
                      Pagado
                    </TableHead>
                    <TableHead className="h-12 px-4 text-right">
                      Pendiente
                    </TableHead>
                    <TableHead className="h-12 px-4">Avance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPurchases.map((purchase) => {
                    const progress =
                      purchase.total_amount > 0
                        ? Math.round(
                            (purchase.paid_amount / purchase.total_amount) * 100
                          )
                        : 0;
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="p-4 text-sm">
                          {fmtDate(purchase.created_at.split("T")[0])}
                        </TableCell>
                        <TableCell className="p-4 text-sm font-medium">
                          {purchase.purchase_number}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right">
                          {fmt(purchase.total_amount)}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right text-[hsl(var(--success))]">
                          {fmt(purchase.paid_amount)}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right text-destructive font-medium">
                          {fmt(purchase.pending_amount)}
                        </TableCell>
                        <TableCell className="p-4">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-8 text-right">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Payments Tab ───────────────────────────────────────────────
const PaymentsTab = ({
  balanceData,
}: {
  balanceData: SupplierBalanceDetail | null;
}) => {
  const payments = balanceData?.recent_payments ?? [];

  const sortedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      ),
    [payments]
  );

  return (
    <Card className="rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-border bg-muted/30 rounded-t-lg">
        <h2 className="text-sm font-semibold text-foreground">
          Pagos Recientes ({sortedPayments.length})
        </h2>
      </div>
      <CardContent className="p-0">
        {sortedPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 px-4">Referencia</TableHead>
                  <TableHead className="h-12 px-4">Fecha</TableHead>
                  <TableHead className="h-12 px-4 hidden sm:table-cell">
                    Concepto
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="p-4 text-sm font-medium">
                      {payment.payment_number || payment.reference || `#${payment.id}`}
                    </TableCell>
                    <TableCell className="p-4 text-sm">
                      {fmtDate(payment.paid_at.split("T")[0])}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground hidden sm:table-cell">
                      {payment.concept || "-"}
                    </TableCell>
                    <TableCell className="p-4 text-sm text-right font-semibold text-[hsl(var(--success))]">
                      {fmt(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Banknote className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No hay pagos registrados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── History Tab ────────────────────────────────────────────────
const HistoryTab = ({
  balanceData,
}: {
  balanceData: SupplierBalanceDetail | null;
}) => {
  const purchases = balanceData?.purchases ?? [];
  const payments = balanceData?.recent_payments ?? [];

  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      type: "purchase" | "payment";
      date: string;
      title: string;
      description: string;
      amount: number;
      status?: string;
    }> = [];

    purchases.forEach((p) => {
      items.push({
        id: `purchase-${p.id}`,
        type: "purchase",
        date: p.created_at,
        title: `Compra ${p.purchase_number}`,
        description:
          p.payment_status === "paid"
            ? "Pagada completamente"
            : p.payment_status === "partial"
              ? `Parcial - Pendiente: ${fmt(p.pending_amount)}`
              : `Pendiente: ${fmt(p.pending_amount)}`,
        amount: p.total_amount,
        status: p.payment_status,
      });
    });

    payments.forEach((p) => {
      items.push({
        id: `payment-${p.id}`,
        type: "payment",
        date: p.paid_at,
        title: `Pago ${p.payment_number || p.reference || `#${p.id}`}`,
        description: p.concept || "Abono a compra",
        amount: p.amount,
      });
    });

    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchases, payments]);

  return (
    <Card className="rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-border bg-muted/30 rounded-t-lg">
        <h2 className="text-sm font-semibold text-foreground">
          Historial de Actividad ({timeline.length})
        </h2>
      </div>
      <CardContent className="p-4 sm:p-6">
        {timeline.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.id} className="flex gap-3 relative">
                  {/* Dot */}
                  <div
                    className={`h-[30px] w-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      item.type === "purchase"
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-[hsl(var(--success))]/10 border-2 border-[hsl(var(--success))]"
                    }`}
                  >
                    {item.type === "purchase" ? (
                      <ShoppingCart className="h-3 w-3 text-primary" />
                    ) : (
                      <Banknote className="h-3 w-3 text-[hsl(var(--success))]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-card border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={
                              item.type === "purchase"
                                ? "bg-primary/10 text-primary text-[10px] h-5"
                                : "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-[10px] h-5"
                            }
                          >
                            {item.type === "purchase" ? "COMPRA" : "PAGO"}
                          </Badge>
                          {item.status && (
                            <Badge
                              className={
                                item.status === "paid"
                                  ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5"
                                  : item.status === "partial"
                                    ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px] h-5"
                                    : "text-[10px] h-5"
                              }
                            >
                              {item.status === "paid"
                                ? "PAGADO"
                                : item.status === "partial"
                                  ? "PARCIAL"
                                  : "PENDIENTE"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`text-sm font-bold ${
                            item.type === "payment"
                              ? "text-[hsl(var(--success))]"
                              : ""
                          }`}
                        >
                          {item.type === "payment" ? "+" : ""}
                          {fmt(item.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtDate(item.date.split("T")[0])}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <History className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Sin actividad registrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Component ─────────────────────────────────────────────
const SupplierShow = ({ supplierId }: Props) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [balanceData, setBalanceData] =
    useState<SupplierBalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const supplierData = await suppliersApi.getById(supplierId);
        setSupplier(supplierData);

        try {
          const balance = await balanceInquiryApi.supplier(supplierId);
          setBalanceData(balance);
        } catch {
          setBalanceData(null);
        }
      } catch (err) {
        console.error("Error loading supplier data:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del proveedor.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [supplierId]);

  const totalPurchases = balanceData?.total_purchases ?? 0;
  const totalPaid = balanceData?.total_paid ?? 0;
  const totalPending = balanceData?.total_pending ?? 0;
  const purchaseCount = balanceData?.purchases?.length ?? 0;

  const handlePhone = () => {
    if (supplier?.phone) window.open(`tel:${supplier.phone}`);
  };
  const handleEmail = () => {
    if (supplier?.email) window.open(`mailto:${supplier.email}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <Head title="Proveedor" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando datos del proveedor...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <Head title="Proveedor no encontrado" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold mb-2">
              Proveedor no encontrado
            </p>
            <Button
              variant="outline"
              onClick={() => router.visit("/admin/suppliers")}
            >
              Volver a proveedores
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={supplier.name} />
      <div className="-mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6 min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-14 z-10">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Row 1: Back + Avatar + Name/Doc/Badges + Actions */}
            <div className="flex items-center gap-3 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => router.visit("/admin/suppliers")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-10 w-10 flex-shrink-0 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  <Truck className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-foreground capitalize truncate">
                    {supplier.name}
                  </h1>
                  <Badge
                    variant="default"
                    className={
                      supplier.is_active
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0"
                        : "text-[10px] h-5 flex-shrink-0"
                    }
                  >
                    {supplier.is_active ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {supplier.document_type || "NIT"}:{" "}
                  {supplier.tax_id || "N/A"}
                </p>
              </div>

              {/* Contact + Edit */}
              <TooltipProvider delayDuration={0}>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handlePhone}
                        disabled={!supplier.phone}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Llamar: {supplier.phone || "N/A"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handleEmail}
                        disabled={!supplier.email}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {supplier.email || "N/A"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          router.visit(
                            `/admin/suppliers/${supplier.id}/edit`
                          )
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar proveedor</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Row 2: Metrics bar */}
            <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-0 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 pr-5">
                  <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Total Compras
                    </p>
                    <p className="text-sm font-bold">{fmt(totalPurchases)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Órdenes
                    </p>
                    <p className="text-sm font-bold">{purchaseCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Star className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Total Pagado
                    </p>
                    <p className="text-sm font-bold">{fmt(totalPaid)}</p>
                  </div>
                </div>
                {totalPending > 0 && (
                  <div className="flex items-center gap-1.5 px-5 border-l border-destructive/30">
                    <div className="h-2 w-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-destructive leading-none font-medium">
                        Pendiente
                      </p>
                      <p className="text-sm font-bold text-destructive">
                        {fmt(totalPending)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs row - segmented style */}
          <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
            <nav className="flex items-center bg-muted/60 rounded-lg p-1 overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1
                      ${
                        isActive
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Full-width Tab Content */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4">
          {activeTab === "dashboard" && (
            <DashboardTab balanceData={balanceData} supplier={supplier} />
          )}
          {activeTab === "info" && <InfoTab supplier={supplier} />}
          {activeTab === "purchases" && (
            <PurchasesTab balanceData={balanceData} />
          )}
          {activeTab === "balances" && (
            <BalancesTab balanceData={balanceData} />
          )}
          {activeTab === "payments" && (
            <PaymentsTab balanceData={balanceData} />
          )}
          {activeTab === "history" && (
            <HistoryTab balanceData={balanceData} />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default SupplierShow;
