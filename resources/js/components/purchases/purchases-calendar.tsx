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
import { Eye, AlertCircle, Clock, CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { type InventoryPurchase } from "@/lib/api";
import { format, isAfter, isBefore, addDays, startOfDay, startOfMonth, endOfMonth, getDay, addMonths, subMonths, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

interface PurchasesCalendarProps {
  purchases: InventoryPurchase[];
  onViewPurchase: (purchaseId: number) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-muted text-foreground border-border" },
  pending: { label: "Pendiente", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20" },
  approved: { label: "Aprobada", color: "bg-blue-500/15 text-blue-700 border-blue-500/20" },
  partial: { label: "Parcial", color: "bg-orange-500/15 text-orange-700 border-orange-500/20" },
  received: { label: "Recibida", color: "bg-green-500/15 text-green-700 border-green-500/20" },
  cancelled: { label: "Cancelada", color: "bg-red-500/15 text-red-700 border-red-500/20" },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/15 text-amber-700 border-amber-500/20" },
  partial: { label: "Parcial", color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20" },
  paid: { label: "Pagado", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" },
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getPurchaseColor(purchase: InventoryPurchase): string {
  const dueDate = purchase.credit_due_date || purchase.expected_date;
  if (!dueDate) return "bg-muted text-muted-foreground";
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  const in7Days = addDays(today, 7);

  if (isBefore(due, today)) return "bg-red-500/15 text-red-700 border-red-500/20";
  if (!isAfter(due, in7Days)) return "bg-amber-500/15 text-amber-700 border-amber-500/20";
  return "bg-blue-500/15 text-blue-700 border-blue-500/20";
}

type UrgencyFilter = "all" | "overdue" | "7days" | "30days";

export function PurchasesCalendar({ purchases, onViewPurchase }: PurchasesCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("Compras");

  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");


  // Filter purchases with due dates or expected dates that are not fully paid/cancelled
  const purchasesWithDates = useMemo(() => {
    return purchases.filter(p =>
      (p.credit_due_date || p.expected_date) &&
      p.status !== "cancelled" &&
      (p.payment_status === "pending" || p.payment_status === "partial" || p.status !== "received")
    );
  }, [purchases]);

  // Apply user filters
  const filteredPurchases = useMemo(() => {
    const today = startOfDay(new Date());
    const in7Days = addDays(today, 7);
    const in30Days = addDays(today, 30);

    return purchasesWithDates.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = p.purchase_number?.toLowerCase().includes(q);
        const matchesSupplier = p.supplier?.name?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesSupplier) return false;
      }

      if (urgencyFilter !== "all") {
        const dueDate = p.credit_due_date || p.expected_date;
        if (!dueDate) return false;
        const due = startOfDay(new Date(dueDate));
        if (urgencyFilter === "overdue" && !isBefore(due, today)) return false;
        if (urgencyFilter === "7days" && (isBefore(due, today) || isAfter(due, in7Days))) return false;
        if (urgencyFilter === "30days" && (isBefore(due, today) || isAfter(due, in30Days))) return false;
      }

      return true;
    });
  }, [purchasesWithDates, searchQuery, urgencyFilter]);

  const hasActiveFilters = searchQuery || urgencyFilter !== "all";

  // Map dates to purchases
  const dateToPurchases = useMemo(() => {
    const map = new Map<string, InventoryPurchase[]>();
    filteredPurchases.forEach(p => {
      const dateStr = p.credit_due_date || p.expected_date;
      if (dateStr) {
        const dateKey = dateStr.split("T")[0].split(" ")[0];
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, p]);
      }
    });
    return map;
  }, [filteredPurchases]);

  // Calendar grid
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

  // Statistics
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const next7Days = addDays(today, 7);
    const next30Days = addDays(today, 30);

    const getDate = (p: InventoryPurchase) => p.credit_due_date || p.expected_date;
    const getBalance = (p: InventoryPurchase) => Number(p.balance_due || p.total_amount || 0);

    const overdue = purchasesWithDates.filter(p => {
      const d = getDate(p);
      return d && isBefore(startOfDay(new Date(d)), today);
    });

    const dueIn7Days = purchasesWithDates.filter(p => {
      const d = getDate(p);
      if (!d) return false;
      const due = startOfDay(new Date(d));
      return !isBefore(due, today) && !isAfter(due, next7Days);
    });

    const dueIn30Days = purchasesWithDates.filter(p => {
      const d = getDate(p);
      if (!d) return false;
      const due = startOfDay(new Date(d));
      return isAfter(due, next7Days) && !isAfter(due, next30Days);
    });

    return {
      overdue: { count: overdue.length, amount: overdue.reduce((s, p) => s + getBalance(p), 0), purchases: overdue },
      next7Days: { count: dueIn7Days.length, amount: dueIn7Days.reduce((s, p) => s + getBalance(p), 0), purchases: dueIn7Days },
      next30Days: { count: dueIn30Days.length, amount: dueIn30Days.reduce((s, p) => s + getBalance(p), 0), purchases: dueIn30Days },
    };
  }, [purchasesWithDates]);

  const dialogPurchases = useMemo(() => {
    if (selectedGroup === "overdue") return stats.overdue.purchases;
    if (selectedGroup === "next7Days") return stats.next7Days.purchases;
    if (selectedGroup === "next30Days") return stats.next30Days.purchases;
    if (selectedGroup === "date" && selectedDate) {
      const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      return dateToPurchases.get(dateKey) || [];
    }
    return [];
  }, [selectedGroup, selectedDate, stats, dateToPurchases]);

  const handleCardClick = (group: string) => {
    setSelectedGroup(group);
    switch (group) {
      case "overdue": setDialogTitle("Compras Vencidas"); break;
      case "next7Days": setDialogTitle("Compras que vencen en 7 días"); break;
      case "next30Days": setDialogTitle("Compras que vencen en 30 días"); break;
    }
    setIsDialogOpen(true);
  };

  const handleDayClick = (date: Date, items: InventoryPurchase[]) => {
    if (items.length === 0) return;
    setSelectedDate(date);
    setSelectedGroup("date");
    setDialogTitle(
      `Compras con vencimiento el ${date.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`
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
                {stats.overdue.count} {stats.overdue.count === 1 ? "compra" : "compras"}
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
                {stats.next7Days.count} {stats.next7Days.count === 1 ? "compra" : "compras"}
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
                {stats.next30Days.count} {stats.next30Days.count === 1 ? "compra" : "compras"}
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
              placeholder="Buscar por número o proveedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

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
              onClick={() => { setSearchQuery(""); setUrgencyFilter("all"); }}
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-3">
            {filteredPurchases.length} {filteredPurchases.length === 1 ? "compra" : "compras"} encontradas
          </p>
        )}
      </Card>

      {/* Planner Calendar */}
      <Card className="overflow-hidden">
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

        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground bg-muted/20">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, i) => {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const dayPurchases = dateToPurchases.get(dateKey) || [];
            const isToday = isSameDay(date, today);
            const hasPurchases = dayPurchases.length > 0;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-b border-r p-1.5 transition-colors",
                  !isCurrentMonth && "bg-muted/10",
                  isCurrentMonth && "bg-card",
                  hasPurchases && "cursor-pointer hover:bg-accent/50",
                  (i + 1) % 7 === 0 && "border-r-0",
                )}
                onClick={() => hasPurchases && handleDayClick(date, dayPurchases)}
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
                  {dayPurchases.length > 1 && isCurrentMonth && (
                    <span className="text-[10px] text-muted-foreground">{dayPurchases.length}</span>
                  )}
                </div>

                {isCurrentMonth && (
                  <div className="space-y-0.5">
                    {dayPurchases.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          "text-[10px] leading-tight px-1.5 py-0.5 rounded-md border truncate",
                          getPurchaseColor(p),
                        )}
                        title={`${p.purchase_number} - ${p.supplier?.name || ""} - ${formatCurrency(Number(p.balance_due || p.total_amount || 0))}`}
                      >
                        {p.purchase_number}
                      </div>
                    ))}
                    {dayPurchases.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayPurchases.length - 3} más
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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

      {purchasesWithDates.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No hay compras pendientes</h3>
          <p className="text-sm text-muted-foreground">
            No hay compras a crédito con fecha de vencimiento pendiente.
          </p>
        </Card>
      )}

      {/* Dialog for selected purchases */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {dialogPurchases.map((p) => {
              const dueDate = p.credit_due_date || p.expected_date;
              return (
                <Card key={p.id} className="p-4 border-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={`${STATUS_LABELS[p.status]?.color || ""} border`}>
                          {STATUS_LABELS[p.status]?.label || p.status}
                        </Badge>
                        <Badge className={`${PAYMENT_LABELS[p.payment_status]?.color || ""} border`}>
                          {PAYMENT_LABELS[p.payment_status]?.label || p.payment_status}
                        </Badge>
                        {p.is_credit && (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border">Crédito</Badge>
                        )}
                      </div>
                      <p className="font-bold text-lg font-mono">{p.purchase_number}</p>
                      <p className="text-sm text-muted-foreground">{p.supplier?.name || "-"}</p>
                      {dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {format(new Date(dueDate), "dd/MM/yyyy", { locale: es })}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-sm font-bold text-primary">{formatCurrency(p.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                          <p className="text-sm font-bold text-amber-600">
                            {formatCurrency(Number(p.balance_due || p.total_amount || 0))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { onViewPurchase(p.id); setIsDialogOpen(false); }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </Card>
              );
            })}

            {dialogPurchases.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay compras en esta categoría
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
