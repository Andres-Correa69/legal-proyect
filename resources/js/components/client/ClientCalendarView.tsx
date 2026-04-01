import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  Clock,
  CalendarDays,
} from "lucide-react";
import type { ClientBalanceDetail } from "@/lib/api";

interface ClientCalendarViewProps {
  balanceData: ClientBalanceDetail | null;
}

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarEvent {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: "overdue" | "due-soon" | "upcoming" | "paid";
}

const getMonthData = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const days: { day: number; currentMonth: boolean; dateStr: string }[] = [];

  const prevLastDay = new Date(year, month, 0).getDate();
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevLastDay - i;
    days.push({ day: d, currentMonth: false, dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ day: i, currentMonth: true, dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}` });
  }

  const remaining = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, currentMonth: false, dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}` });
  }

  return days;
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const eventColors: Record<CalendarEvent["type"], string> = {
  overdue: "bg-destructive/20 text-destructive border-destructive/30",
  "due-soon": "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
  upcoming: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
};

export const ClientCalendarView = ({ balanceData }: ClientCalendarViewProps) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const sales = balanceData?.sales ?? [];

  // Build events from sales with due dates
  const events = useMemo<CalendarEvent[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return sales
      .filter((s) => s.due_date)
      .map((s) => {
        const dueDate = new Date(s.due_date!);
        let type: CalendarEvent["type"] = "upcoming";

        if (s.payment_status === "paid" || s.balance <= 0) {
          type = "paid";
        } else if (dueDate < now) {
          type = "overdue";
        } else if (dueDate <= sevenDaysFromNow) {
          type = "due-soon";
        }

        return {
          id: String(s.id),
          date: s.due_date!,
          label: s.invoice_number,
          amount: s.balance > 0 ? s.balance : s.total_amount,
          type,
        };
      });
  }, [sales]);

  const days = getMonthData(currentYear, currentMonth);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  const isToday = (day: number, isCurrentMonth: boolean) =>
    isCurrentMonth &&
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const overdueTotal = events.filter(e => e.type === "overdue").reduce((s, e) => s + e.amount, 0);
  const dueSoonTotal = events.filter(e => e.type === "due-soon").reduce((s, e) => s + e.amount, 0);
  const upcomingTotal = events.filter(e => e.type === "upcoming").reduce((s, e) => s + e.amount, 0);
  const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-foreground">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{fmt(overdueTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--warning))]/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />
            </div>
            <span className="text-sm font-medium text-foreground">Vencen en 7 días</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--warning))]">{fmt(dueSoonTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Próximos vencimientos</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Vencen en 30 días</span>
          </div>
          <p className="text-2xl font-bold text-primary">{fmt(upcomingTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">Planificar seguimiento</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="electronic">Electrónica</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="account">Cuenta de Cobro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px]">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="overdue">Vencidas</SelectItem>
            <SelectItem value="due-soon">Próximas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-bold text-foreground">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const dayEvents = eventsByDate[d.dateStr] || [];
            return (
              <div
                key={i}
                className={`min-h-[70px] sm:min-h-[85px] p-1 border-r border-b border-border last:border-r-0 ${!d.currentMonth ? "bg-muted/30" : ""}`}
              >
                <span
                  className={`inline-flex items-center justify-center text-sm w-6 h-6 rounded-full mb-0.5
                    ${isToday(d.day, d.currentMonth)
                      ? "bg-primary text-primary-foreground font-bold"
                      : d.currentMonth ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                >
                  {d.day}
                </span>
                {dayEvents.slice(0, 2).map((ev) => (
                  <div
                    key={ev.id}
                    className={`text-[9px] sm:text-[10px] leading-tight px-1 py-0.5 rounded border mb-0.5 truncate ${eventColors[ev.type]}`}
                    title={`${ev.label} - $ ${ev.amount.toLocaleString("es-CO")}`}
                  >
                    {ev.label}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2} más</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/20">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-destructive/20" />
            <span className="text-xs text-muted-foreground">Vencida</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[hsl(var(--warning))]/20" />
            <span className="text-xs text-muted-foreground">Vence en 7 días</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-primary/20" />
            <span className="text-xs text-muted-foreground">Vence en 30+ días</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-[hsl(var(--success))]/20" />
            <span className="text-xs text-muted-foreground">Pagada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
