import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import type { DashboardChartData } from "@/lib/api";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString("es-CO")}`;
}

const chartColors = {
  income: "hsl(var(--primary))",
  expense: "hsl(var(--success))",
  positive: "hsl(var(--success))",
  negative: "hsl(var(--destructive))",
};

const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

interface DashboardChartsProps {
  charts?: DashboardChartData;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return mounted;
}

function IncomeExpenseChart({ data }: { data: DashboardChartData['income_expense'] }) {
  const mounted = useMounted();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Ingresos vs Gastos</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] min-h-[280px] w-full">
          {mounted && <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors.income} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.expense} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColors.expense} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={tooltipStyle}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke={chartColors.income}
                fillOpacity={1}
                fill="url(#colorIngresos)"
                name="Ingresos"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke={chartColors.expense}
                fillOpacity={1}
                fill="url(#colorGastos)"
                name="Gastos"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>}
        </div>
      </CardContent>
    </Card>
  );
}

function CashFlowChart({ data }: { data: DashboardChartData['cash_flow'] }) {
  const mounted = useMounted();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Flujo de Caja Semanal</CardTitle>
        <CardDescription>Entradas y salidas de efectivo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] min-h-[280px] w-full">
          {mounted && <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value >= 0 ? chartColors.positive : chartColors.negative}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ charts }: DashboardChartsProps) {
  const incomeExpense = charts?.income_expense ?? [];
  const cashFlow = charts?.cash_flow ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <IncomeExpenseChart data={incomeExpense} />
      <CashFlowChart data={cashFlow} />
    </div>
  );
}
