import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Download, Mail, Smartphone, AlertCircle, Clock, CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { type Sale } from "@/lib/api";
import { format, isAfter, isBefore, addDays, startOfDay, startOfMonth, endOfMonth, getDay, addMonths, subMonths, isSameMonth, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

interface InvoicesCalendarProps {
  sales: Sale[];
  onViewSale: (sale: Sale) => void;
  onDownloadPdf: (saleId: number) => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  pos: { label: "POS", color: "bg-green-500/15 text-green-700 border-green-500/20" },
  electronic: { label: "Electrónica", color: "bg-blue-500/15 text-blue-700 border-blue-500/20" },
  account: { label: "Cuenta Cobro", color: "bg-purple-500/15 text-purple-700 border-purple-500/20" },
  credit: { label: "Crédito", color: "bg-orange-500/15 text-orange-700 border-orange-500/20" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
  partial: { label: "Parcial", color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20" },
  paid: { label: "Pagada", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getInvoiceColor(sale: Sale): string {
  if (!sale.due_date) return "bg-muted text-muted-foreground";
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(sale.due_date));
  const in7Days = addDays(today, 7);

  if (isBefore(dueDate, today)) {
    return "bg-red-500/15 text-red-700 border-red-500/20"; // Vencida
  }
  if (!isAfter(dueDate, in7Days)) {
    return "bg-amber-500/15 text-amber-700 border-amber-500/20"; // Vence en 7 días
  }
  return "bg-blue-500/15 text-blue-700 border-blue-500/20"; // 30+ días
}

type UrgencyFilter = "all" | "overdue" | "7days" | "30days";

export function InvoicesCalendar({ sales, onViewSale, onDownloadPdf }: InvoicesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Facturas");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");

  // Filter only invoices with due dates that are not fully paid
  const invoicesWithDueDates = useMemo(() => {
    return sales.filter(sale =>
      sale.due_date &&
      sale.status !== 'cancelled' &&
      (sale.payment_status === "pending" || sale.payment_status === "partial")
    );
  }, [sales]);

  // Apply user filters
  const filteredInvoices = useMemo(() => {
    const today = startOfDay(new Date());
    const in7Days = addDays(today, 7);
    const in30Days = addDays(today, 30);

    return invoicesWithDueDates.filter(sale => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = sale.invoice_number?.toLowerCase().includes(q);
        const matchesClient = sale.client?.name?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesClient) return false;
      }

      // Type filter
      if (typeFilter !== "all" && sale.type !== typeFilter) return false;

      // Urgency filter
      if (urgencyFilter !== "all" && sale.due_date) {
        const dueDate = startOfDay(new Date(sale.due_date));
        if (urgencyFilter === "overdue" && !isBefore(dueDate, today)) return false;
        if (urgencyFilter === "7days" && (isBefore(dueDate, today) || isAfter(dueDate, in7Days))) return false;
        if (urgencyFilter === "30days" && (isBefore(dueDate, today) || isAfter(dueDate, in30Days))) return false;
      }

      return true;
    });
  }, [invoicesWithDueDates, searchQuery, typeFilter, urgencyFilter]);

  const hasActiveFilters = searchQuery || typeFilter !== "all" || urgencyFilter !== "all";

  // Map dates to invoices (using filtered list)
  const dateToInvoices = useMemo(() => {
    const map = new Map<string, Sale[]>();
    filteredInvoices.forEach(sale => {
      if (sale.due_date) {
        const dateKey = sale.due_date.split('T')[0].split(' ')[0];
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, sale]);
      }
    });
    return map;
  }, [filteredInvoices]);

  // Build calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // getDay returns 0=Sunday. We want Monday=0, so adjust.
    let startDow = getDay(monthStart) - 1;
    if (startDow < 0) startDow = 6; // Sunday becomes 6

    // Fill leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(monthStart);
      d.setDate(d.getDate() - i - 1);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Fill current month days
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      days.push({ date: new Date(d), isCurrentMonth: true });
    }

    // Fill trailing days to complete last week
    while (days.length % 7 !== 0) {
      const lastDate = days[days.length - 1].date;
      const next = new Date(lastDate);
      next.setDate(next.getDate() + 1);
      days.push({ date: next, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const next7Days = addDays(today, 7);
    const next30Days = addDays(today, 30);

    const overdue = invoicesWithDueDates.filter(sale => {
      if (!sale.due_date) return false;
      const dueDate = startOfDay(new Date(sale.due_date));
      return isBefore(dueDate, today);
    });

    const dueIn7Days = invoicesWithDueDates.filter(sale => {
      if (!sale.due_date) return false;
      const dueDate = startOfDay(new Date(sale.due_date));
      return !isBefore(dueDate, today) && !isAfter(dueDate, next7Days);
    });

    const dueIn30Days = invoicesWithDueDates.filter(sale => {
      if (!sale.due_date) return false;
      const dueDate = startOfDay(new Date(sale.due_date));
      return isAfter(dueDate, next7Days) && !isAfter(dueDate, next30Days);
    });

    return {
      overdue: {
        count: overdue.length,
        amount: overdue.reduce((sum, sale) => sum + Number(sale.balance || 0), 0),
        sales: overdue,
      },
      next7Days: {
        count: dueIn7Days.length,
        amount: dueIn7Days.reduce((sum, sale) => sum + Number(sale.balance || 0), 0),
        sales: dueIn7Days,
      },
      next30Days: {
        count: dueIn30Days.length,
        amount: dueIn30Days.reduce((sum, sale) => sum + Number(sale.balance || 0), 0),
        sales: dueIn30Days,
      },
    };
  }, [invoicesWithDueDates]);

  // Sales to show in dialog
  const dialogSales = useMemo(() => {
    if (selectedGroup === "overdue") return stats.overdue.sales;
    if (selectedGroup === "next7Days") return stats.next7Days.sales;
    if (selectedGroup === "next30Days") return stats.next30Days.sales;
    if (selectedGroup === "date" && selectedDate) {
      const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      return dateToInvoices.get(dateKey) || [];
    }
    return [];
  }, [selectedGroup, selectedDate, stats, dateToInvoices]);

  const handleCardClick = (group: string) => {
    setSelectedGroup(group);
    switch (group) {
      case "overdue": setDialogTitle("Facturas Vencidas"); break;
      case "next7Days": setDialogTitle("Facturas que vencen en 7 días"); break;
      case "next30Days": setDialogTitle("Facturas que vencen en 30 días"); break;
    }
    setIsDialogOpen(true);
  };

  const handleDayClick = (date: Date, invoices: Sale[]) => {
    if (invoices.length === 0) return;
    setSelectedDate(date);
    setSelectedGroup("date");
    setDialogTitle(
      `Facturas con vencimiento el ${date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`
    );
    setIsDialogOpen(true);
  };

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="p-4 border-2 border-red-500/20 bg-red-500/10/50 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => stats.overdue.count > 0 && handleCardClick("overdue")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-red-500/15 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Vencidas</h3>
            </div>
            {stats.overdue.count > 0 && (
              <Badge variant="destructive" className="text-xs">
                {stats.overdue.count} {stats.overdue.count === 1 ? 'factura' : 'facturas'}
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue.amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
        </Card>

        <Card
          className="p-4 border-2 border-amber-500/20 bg-amber-500/10/50 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => stats.next7Days.count > 0 && handleCardClick("next7Days")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/15 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Vencen en 7 días</h3>
            </div>
            {stats.next7Days.count > 0 && (
              <Badge className="text-xs bg-amber-500/15 text-amber-700 border-amber-500/20">
                {stats.next7Days.count} {stats.next7Days.count === 1 ? 'factura' : 'facturas'}
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.next7Days.amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Próximos vencimientos</p>
        </Card>

        <Card
          className="p-4 border-2 border-blue-500/20 bg-blue-500/10/50 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => stats.next30Days.count > 0 && handleCardClick("next30Days")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500/15 p-2 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Vencen en 30 días</h3>
            </div>
            {stats.next30Days.count > 0 && (
              <Badge className="text-xs bg-blue-500/15 text-blue-700 border-blue-500/20">
                {stats.next30Days.count} {stats.next30Days.count === 1 ? 'factura' : 'facturas'}
              </Badge>
            )}
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.next30Days.amount)}</p>
          <p className="text-xs text-muted-foreground mt-1">Planificar seguimiento</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="electronic">Electrónica</SelectItem>
              <SelectItem value="account">Cuenta Cobro</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
            </SelectContent>
          </Select>

          <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as UrgencyFilter)}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Urgencia" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="overdue">Vencidas</SelectItem>
              <SelectItem value="7days">Próximos 7 días</SelectItem>
              <SelectItem value="30days">Próximos 30 días</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-3 text-muted-foreground"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setUrgencyFilter("all");
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-3">
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'factura' : 'facturas'} encontradas
          </p>
        )}
      </Card>

      {/* Planner Calendar */}
      <Card className="overflow-hidden">
        {/* Month Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
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

            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 transition-colors",
                  !isCurrentMonth && "bg-muted/10",
                  isCurrentMonth && "bg-card",
                  hasInvoices && "cursor-pointer hover:bg-accent/50",
                  // Remove right border on last column
                  (i + 1) % 7 === 0 && "border-r-0",
                )}
                onClick={() => hasInvoices && handleDayClick(date, dayInvoices)}
              >
                {/* Day number */}
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

                {/* Invoice chips */}
                {isCurrentMonth && (
                  <div className="space-y-0.5">
                    {dayInvoices.slice(0, 3).map((sale) => (
                      <div
                        key={sale.id}
                        className={cn(
                          "text-[10px] leading-tight px-1.5 py-0.5 rounded-md border truncate",
                          getInvoiceColor(sale),
                        )}
                        title={`${sale.invoice_number} - ${sale.client?.name || ''} - ${formatCurrency(Number(sale.balance || 0))}`}
                      >
                        {sale.invoice_number}
                      </div>
                    ))}
                    {dayInvoices.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayInvoices.length - 3} más
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
              <span className="text-muted-foreground">Vence en 7 días</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500/15 border border-blue-500/20"></div>
              <span className="text-muted-foreground">Vence en 30+ días</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Empty state */}
      {invoicesWithDueDates.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No hay facturas pendientes</h3>
          <p className="text-sm text-muted-foreground">
            No hay facturas con fecha de vencimiento pendiente de pago.
          </p>
        </Card>
      )}

      {/* Dialog for selected invoices */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {dialogSales.map((sale) => (
              <Card key={sale.id} className="p-4 border-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className={`${TYPE_LABELS[sale.type]?.color || ''} border`}>
                        {TYPE_LABELS[sale.type]?.label || sale.type}
                      </Badge>
                      <Badge className={`${PAYMENT_STATUS_LABELS[sale.payment_status]?.color || ''} border`}>
                        {PAYMENT_STATUS_LABELS[sale.payment_status]?.label || sale.payment_status}
                      </Badge>
                    </div>
                    <p className="font-bold text-lg">{sale.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{sale.client?.name || '-'}</p>
                    {sale.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Vence: {format(new Date(sale.due_date), "dd/MM/yyyy", { locale: es })}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(Number(sale.total_amount))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                        <p className="text-sm font-bold text-amber-600">
                          {formatCurrency(Number(sale.balance || 0))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => onViewSale(sale)}
                      title="Ver factura"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => onDownloadPdf(sale.id)}
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Enviar por Email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      title="Enviar por WhatsApp"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {dialogSales.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay facturas en esta categoría
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
