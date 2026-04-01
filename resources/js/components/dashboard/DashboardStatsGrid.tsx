import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  ShoppingCart,
  Receipt,
  Percent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/lib/api";

interface StatCard {
  title: string;
  value: string;
  subtitle: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  variant: "success" | "primary" | "warning" | "muted" | "destructive" | "info" | "accent";
}

const variantStyles = {
  success: "bg-success/10 text-success",
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  accent: "bg-accent text-accent-foreground",
};

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString("es-CO")}`;
}

function buildStats(s?: DashboardStats): StatCard[] {
  if (!s) return [];

  return [
    {
      title: "VENTAS HOY",
      value: formatCompact(s.sales_today),
      subtitle: `${s.sales_today_count} transacciones`,
      icon: DollarSign,
      variant: "success",
    },
    {
      title: "INGRESOS DEL MES",
      value: formatCompact(s.monthly_income),
      subtitle: `${s.active_clients} clientes activos`,
      icon: TrendingUp,
      variant: "primary",
    },
    {
      title: "CUENTAS POR COBRAR",
      value: formatCompact(s.accounts_receivable),
      subtitle: `${s.accounts_receivable_count} facturas pendientes`,
      icon: Clock,
      variant: "warning",
    },
    {
      title: "CUENTAS POR PAGAR",
      value: formatCompact(s.accounts_payable),
      subtitle: `${s.accounts_payable_count} facturas`,
      icon: CreditCard,
      variant: "muted",
    },
    {
      title: "GASTOS DEL MES",
      value: formatCompact(s.monthly_expenses),
      subtitle: `${s.monthly_expenses_count} órdenes`,
      icon: ShoppingCart,
      variant: "destructive",
    },
    {
      title: "COBROS RECIBIDOS",
      value: formatCompact(s.collections_last_7_days),
      subtitle: "Últimos 7 días",
      icon: Receipt,
      variant: "info",
    },
    {
      title: "MARGEN NETO",
      value: `${s.net_margin}%`,
      subtitle: `${formatCompact(s.net_profit)} utilidad`,
      icon: Percent,
      variant: "accent",
    },
    {
      title: "CLIENTES ACTIVOS",
      value: String(s.active_clients),
      subtitle: `+${s.new_clients_this_month} este mes`,
      icon: Users,
      variant: "primary",
    },
  ];
}

function StatCardItem({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trend === "up" ? TrendingUp : stat.trend === "down" ? TrendingDown : null;

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground tracking-wide truncate">
              {stat.title}
            </p>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground truncate">{stat.subtitle}</p>
            {stat.change && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                stat.trend === "up" && "text-success",
                stat.trend === "down" && "text-destructive",
                !stat.trend && "text-muted-foreground"
              )}>
                {TrendIcon && <TrendIcon className="h-3 w-3" />}
                <span>{stat.change}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg shrink-0", variantStyles[stat.variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardStatsGridProps {
  stats?: DashboardStats;
}

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const cards = buildStats(stats);

  if (cards.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat) => (
        <StatCardItem key={stat.title} stat={stat} />
      ))}
    </div>
  );
}
