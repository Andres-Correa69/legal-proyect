import { useMemo } from "react";
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  CalendarDays,
  Package,
  Repeat,
  ArrowUpRight,
  DollarSign,
  Star,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import type { ClientBalanceDetail } from "@/lib/api";

interface ClientOverviewViewProps {
  balanceData: ClientBalanceDetail | null;
  client: User;
}

const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

export const ClientOverviewView = ({ balanceData, client }: ClientOverviewViewProps) => {
  const sales = balanceData?.sales ?? [];
  const totals = balanceData?.totals;

  const stats = useMemo(() => {
    const totalSales = totals?.total_sales ?? 0;
    const salesCount = totals?.sales_count ?? 0;
    const avgTicket = salesCount > 0 ? Math.round(totalSales / salesCount) : 0;

    // Calculate purchase frequency
    const sortedDates = sales
      .map((s) => new Date(s.date).getTime())
      .sort((a, b) => a - b);
    let frequency = "N/A";
    if (sortedDates.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < sortedDates.length; i++) {
        diffs.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
      }
      const avgDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
      frequency = `Cada ${avgDays} días`;
    }

    // Calculate avg monthly spend
    let avgMonthlySpend = 0;
    if (sortedDates.length >= 2) {
      const firstDate = new Date(sortedDates[0]);
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      const months = Math.max(1,
        (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        (lastDate.getMonth() - firstDate.getMonth()) + 1
      );
      avgMonthlySpend = Math.round(totalSales / months);
    }

    const firstPurchase = sortedDates.length > 0 ? new Date(sortedDates[0]).toISOString().split("T")[0] : "";
    const totalVisits = salesCount;

    // Preferred day
    const dayCounts: Record<number, number> = {};
    sales.forEach((s) => {
      const d = new Date(s.date).getDay();
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const preferredDayIdx = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const preferredDay = preferredDayIdx !== undefined ? dayNames[Number(preferredDayIdx)] : "N/A";

    // Return rate (% of months with purchases)
    const monthSet = new Set(sales.map((s) => s.date.substring(0, 7)));
    let returnRate = 0;
    if (sortedDates.length >= 2) {
      const firstDate = new Date(sortedDates[0]);
      const lastDate = new Date(sortedDates[sortedDates.length - 1]);
      const totalMonths = Math.max(1,
        (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        (lastDate.getMonth() - firstDate.getMonth()) + 1
      );
      returnRate = Math.round((monthSet.size / totalMonths) * 100);
    }

    // Preferred time
    const hourCounts: Record<string, number> = { "Mañana": 0, "Tarde": 0, "Noche": 0 };
    sales.forEach((s) => {
      const h = new Date(s.date).getHours();
      if (h < 12) hourCounts["Mañana"]++;
      else if (h < 18) hourCounts["Tarde"]++;
      else hourCounts["Noche"]++;
    });
    const preferredTime = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Mañana";

    return { avgTicket, frequency, avgMonthlySpend, firstPurchase, totalVisits, preferredDay, preferredTime, returnRate };
  }, [sales, totals]);

  // Last purchase
  const lastPurchase = useMemo(() => {
    if (sales.length === 0) return null;
    const sorted = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last = sorted[0];
    const daysAgo = Math.floor((Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24));
    return { id: last.invoice_number, date: last.date, amount: last.total_amount, daysAgo, items_count: last.items_count };
  }, [sales]);

  // Top products by invoice frequency
  const topInvoices = useMemo(() => {
    const sorted = [...sales].sort((a, b) => b.total_amount - a.total_amount);
    return sorted.slice(0, 5);
  }, [sales]);
  const maxTopAmount = topInvoices.length > 0 ? topInvoices[0].total_amount : 1;

  // Spending chart - last 6 months
  const purchaseHistory = useMemo(() => {
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const total = sales
        .filter((s) => s.date.startsWith(key))
        .reduce((sum, s) => sum + s.total_amount, 0);
      months.push({ month: monthNames[d.getMonth()], amount: total });
    }
    return months;
  }, [sales]);
  const maxAmount = Math.max(...purchaseHistory.map((h) => h.amount), 1);

  return (
    <div className="space-y-4">
      {/* Row 1: Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Ticket Promedio</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(stats.avgTicket)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <Repeat className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
            </div>
            <span className="text-xs text-muted-foreground">Frecuencia</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.frequency}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-[hsl(var(--warning))]/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
            </div>
            <span className="text-xs text-muted-foreground">Gasto Mensual Prom.</span>
          </div>
          <p className="text-xl font-bold text-foreground">{fmt(stats.avgMonthlySpend)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center">
              <Star className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Tasa Retorno</span>
          </div>
          <p className="text-xl font-bold text-foreground">{stats.returnRate}%</p>
        </div>
      </div>

      {/* Row 2: Last purchase + Purchase patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last purchase */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Última Compra
            </h3>
            {lastPurchase && (
              <Badge variant="outline" className="text-xs">
                Hace {lastPurchase.daysAgo} días
              </Badge>
            )}
          </div>
          {lastPurchase ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{lastPurchase.id}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(lastPurchase.date)}</p>
                </div>
                <p className="text-lg font-bold text-primary">{fmt(lastPurchase.amount)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs font-normal">
                  {lastPurchase.items_count} producto(s)
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin compras registradas</p>
          )}
        </div>

        {/* Purchase patterns */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Patrones de Compra
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Primera compra</p>
              <p className="text-sm font-semibold text-foreground">
                {stats.firstPurchase ? fmtDate(stats.firstPurchase) : "N/A"}
              </p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Total visitas</p>
              <p className="text-sm font-semibold text-foreground">{stats.totalVisits}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Día preferido</p>
              <p className="text-sm font-semibold text-foreground">{stats.preferredDay}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Horario preferido</p>
              <p className="text-sm font-semibold text-foreground">{stats.preferredTime}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top invoices + Spending chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top invoices */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            Productos / Servicios Más Comprados
          </h3>
          {topInvoices.length > 0 ? (
            <div className="space-y-3">
              {topInvoices.map((sale, index) => (
                <div key={sale.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">{sale.invoice_number}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{sale.items_count}x</span>
                        <span className="text-sm font-semibold text-foreground">{fmt(sale.total_amount)}</span>
                        {sale.payment_status === "paid" && <ArrowUpRight className="h-3 w-3 text-[hsl(var(--success))]" />}
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${(sale.total_amount / maxTopAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Sin facturas registradas</p>
          )}
        </div>

        {/* Spending over time - simple bar chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Gasto Últimos 6 Meses
          </h3>
          <div className="flex items-end gap-2 h-[180px]">
            {purchaseHistory.map((h) => (
              <div key={h.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {h.amount > 0 ? fmt(h.amount) : ""}
                </span>
                <div
                  className={`w-full rounded-t-md transition-all ${h.amount > 0 ? "bg-primary/80" : "bg-muted"}`}
                  style={{ height: `${Math.max((h.amount / maxAmount) * 140, h.amount > 0 ? 8 : 4)}px` }}
                />
                <span className="text-xs text-muted-foreground">{h.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent activity */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          Resumen de Actividad
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{totals?.sales_count ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Facturas totales</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">
              {sales.reduce((sum, s) => sum + s.items_count, 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Productos comprados</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-0.5">Presupuestos</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{totals?.pending_sales ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Créditos activos</p>
          </div>
        </div>
      </div>
    </div>
  );
};
