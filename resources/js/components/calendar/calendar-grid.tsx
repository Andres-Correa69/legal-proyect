import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText, ShoppingCart, PartyPopper } from "lucide-react";
import { format, startOfMonth, endOfMonth, getDay, isSameDay, isSameMonth, startOfDay, isBefore, addDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { WEEKDAYS, APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@/config/calendar.config";
import type { Appointment } from "@/types";

interface CalendarEvent {
  id: string;
  type: "appointment" | "invoice_due" | "purchase_due";
  title: string;
  date: Date;
  color: string;
  dotColor: string;
  status?: string;
  subtype?: string;
  original: Appointment | Record<string, unknown>;
}

interface CalendarGridProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  appointments: Appointment[];
  invoiceDueDates: Array<{
    id: number;
    invoice_number: string;
    type: string;
    status: string;
    payment_status: string;
    due_date: string;
    total_amount: number;
    balance: number;
    client?: { name: string };
  }>;
  purchaseDueDates?: Array<{
    id: number;
    purchase_number: string;
    status: string;
    payment_status: string;
    credit_due_date: string;
    total_amount: number;
    balance_due: number;
    supplier?: { id: number; name: string };
  }>;
  onDayClick: (date: Date, events: CalendarEvent[]) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function getInvoiceDotColor(dueDate: Date): string {
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  if (isBefore(dueDate, today)) return "bg-red-500/100";
  if (!isAfter(dueDate, in7Days)) return "bg-amber-500/100";
  return "bg-blue-500/100";
}

function getInvoiceChipColor(dueDate: Date): string {
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  if (isBefore(dueDate, today)) return "bg-red-500/15 text-red-700 border-red-500/20";
  if (!isAfter(dueDate, in7Days)) return "bg-amber-500/15 text-amber-700 border-amber-500/20";
  return "bg-blue-500/15 text-blue-700 border-blue-500/20";
}

function getPurchaseChipColor(dueDate: Date): string {
  const today = startOfDay(new Date());
  const in7Days = addDays(today, 7);

  if (isBefore(dueDate, today)) return "bg-orange-500/15 text-orange-700 border-orange-500/20";
  if (!isAfter(dueDate, in7Days)) return "bg-yellow-500/15 text-yellow-700 border-yellow-500/20";
  return "bg-teal-500/15 text-teal-700 border-teal-500/20";
}

export function CalendarGrid({
  currentMonth,
  onMonthChange,
  appointments,
  invoiceDueDates,
  purchaseDueDates = [],
  onDayClick,
  onEventClick,
}: CalendarGridProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    let startDow = getDay(monthStart) - 1;
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

  // Build events map by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    const addEvent = (dateKey: string, event: CalendarEvent) => {
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(event);
    };

    appointments.forEach((apt) => {
      const date = new Date(apt.starts_at);
      const dateKey = format(date, "yyyy-MM-dd");
      const typeConfig = APPOINTMENT_TYPES[apt.type];
      const statusConfig = APPOINTMENT_STATUSES[apt.status];

      let dotColor = apt.color || "#3b82f6";
      if (apt.status === "completed") dotColor = "#10b981";
      if (apt.status === "cancelled") dotColor = "#9ca3af";

      addEvent(dateKey, {
        id: `apt-${apt.id}`,
        type: "appointment",
        title: apt.title,
        date,
        color: apt.status === "completed" ? statusConfig.color : (typeConfig?.color || "bg-blue-500/15 text-blue-700 border-blue-500/20"),
        dotColor,
        status: apt.status,
        subtype: apt.type,
        original: apt,
      });
    });

    invoiceDueDates.forEach((inv) => {
      const date = new Date(inv.due_date);
      const dateKey = format(date, "yyyy-MM-dd");

      addEvent(dateKey, {
        id: `inv-${inv.id}`,
        type: "invoice_due",
        title: `Fact. ${inv.invoice_number}`,
        date,
        color: getInvoiceChipColor(startOfDay(date)),
        dotColor: "unused",
        status: inv.payment_status,
        original: inv,
      });
    });

    purchaseDueDates.forEach((pur) => {
      const date = new Date(pur.credit_due_date);
      const dateKey = format(date, "yyyy-MM-dd");

      addEvent(dateKey, {
        id: `pur-${pur.id}`,
        type: "purchase_due",
        title: `OC ${pur.purchase_number}`,
        date,
        color: getPurchaseChipColor(startOfDay(date)),
        dotColor: "unused",
        status: pur.payment_status,
        original: pur,
      });
    });

    return map;
  }, [appointments, invoiceDueDates, purchaseDueDates]);

  const today = startOfDay(new Date());

  const prevMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };

  const nextMonth = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  const goToToday = () => onMonthChange(new Date());

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoy
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const dateKey = format(date, "yyyy-MM-dd");
            const events = eventsByDate.get(dateKey) || [];
            const isToday = isSameDay(date, today);
            const hasEvents = events.length > 0;

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/30",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground/50",
                  isToday && "bg-primary/5"
                )}
                onClick={() => onDayClick(date, events)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {events.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{events.length - 3}</span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {events.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      className={cn(
                        "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate border",
                        event.color
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      {event.type === "invoice_due" && <FileText className="h-2.5 w-2.5 inline mr-0.5" />}
                      {event.type === "purchase_due" && <ShoppingCart className="h-2.5 w-2.5 inline mr-0.5" />}
                      {event.subtype === "holiday" && <PartyPopper className="h-2.5 w-2.5 inline mr-0.5" />}
                      {event.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500/100" />
          <span>Cita</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/100" />
          <span>Completada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/100" />
          <span>Vencida</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/100" />
          <span>Por vencer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3" />
          <span>Venc. factura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShoppingCart className="h-3 w-3" />
          <span>Venc. compra</span>
        </div>
        <div className="flex items-center gap-1.5">
          <PartyPopper className="h-3 w-3 text-red-500" />
          <span>Festivo</span>
        </div>
      </div>
    </div>
  );
}
