import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardFinancialSummary, DashboardStats } from "@/lib/api";

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString("es-CO")}`;
}

interface ProgressMetric {
  label: string;
  current: string;
  percentage: number;
  change: string;
  trend: "up" | "down";
}

interface FinancialSummaryProps {
  summary?: DashboardFinancialSummary;
  stats?: DashboardStats;
}

function BalanceCard({ summary }: { summary?: DashboardFinancialSummary }) {
  const balance = summary?.total_balance ?? 0;
  const receivable = summary?.accounts_receivable ?? 0;
  const payable = summary?.accounts_payable ?? 0;

  return (
    <div className="rounded-lg bg-accent/50 p-4 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Balance Total</span>
      </div>
      <p className="text-3xl font-bold text-foreground">{formatCompact(balance)}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
        <span className="text-sm text-success">Por cobrar: {formatCompact(receivable)}</span>
        <span className="text-sm text-destructive">Por pagar: {formatCompact(payable)}</span>
      </div>
    </div>
  );
}

function MetricItem({ metric }: { metric: ProgressMetric }) {
  const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{metric.label}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1",
          metric.trend === "up" ? "text-success" : "text-destructive"
        )}>
          <TrendIcon className="h-3 w-3" />
          <span className="text-xs font-medium">{metric.change}</span>
        </div>
      </div>
      <Progress value={metric.percentage} className="h-2" />
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {metric.current}
        </span>
      </div>
    </div>
  );
}

export function FinancialSummary({ summary, stats }: FinancialSummaryProps) {
  const income = summary?.monthly_income ?? 0;
  const expenses = summary?.monthly_expenses ?? 0;
  const profit = summary?.net_profit ?? 0;
  const margin = stats?.net_margin ?? 0;

  const metrics: ProgressMetric[] = [
    {
      label: "Ingresos del Mes",
      current: formatCompact(income),
      percentage: Math.min(100, income > 0 ? 100 : 0),
      change: formatCompact(income),
      trend: "up",
    },
    {
      label: "Gastos Operativos",
      current: formatCompact(expenses),
      percentage: income > 0 ? Math.min(100, (expenses / income) * 100) : 0,
      change: formatCompact(expenses),
      trend: expenses > income ? "down" : "up",
    },
    {
      label: "Margen de Utilidad",
      current: `${margin}% — ${formatCompact(profit)}`,
      percentage: Math.max(0, Math.min(100, margin)),
      change: `${margin}%`,
      trend: margin >= 0 ? "up" : "down",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Resumen Financiero</CardTitle>
        <CardDescription>Estado actual del negocio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BalanceCard summary={summary} />
        <div className="space-y-5">
          {metrics.map((metric) => (
            <MetricItem key={metric.label} metric={metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
