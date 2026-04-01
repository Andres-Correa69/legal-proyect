import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isPast, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES, APPOINTMENT_PRIORITIES } from "@/config/calendar.config";
import type { Appointment } from "@/types";

interface AgendaListProps {
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
  onAppointmentClick: (appointment: Appointment) => void;
  onInvoiceClick: (invoiceId: number) => void;
  onPurchaseClick?: (purchaseId: number) => void;
  onStatusChange: (appointmentId: number, status: string) => void;
  canManage: boolean;
}

interface AgendaItem {
  id: string;
  type: "appointment" | "invoice_due" | "purchase_due";
  date: Date;
  title: string;
  subtitle?: string;
  status: string;
  original: Appointment | Record<string, unknown>;
}

export function AgendaList({
  appointments,
  invoiceDueDates,
  purchaseDueDates = [],
  onAppointmentClick,
  onInvoiceClick,
  onPurchaseClick,
  onStatusChange,
  canManage,
}: AgendaListProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Build unified agenda items
  const allItems = useMemo(() => {
    const items: AgendaItem[] = [];

    appointments.forEach((apt) => {
      items.push({
        id: `apt-${apt.id}`,
        type: "appointment",
        date: new Date(apt.starts_at),
        title: apt.title,
        subtitle: apt.client?.name || apt.location || undefined,
        status: apt.status,
        original: apt,
      });
    });

    invoiceDueDates.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        type: "invoice_due",
        date: new Date(inv.due_date),
        title: `Factura ${inv.invoice_number}`,
        subtitle: inv.client?.name || undefined,
        status: inv.payment_status,
        original: inv,
      });
    });

    purchaseDueDates.forEach((pur) => {
      items.push({
        id: `pur-${pur.id}`,
        type: "purchase_due",
        date: new Date(pur.credit_due_date),
        title: `Compra ${pur.purchase_number}`,
        subtitle: pur.supplier?.name || undefined,
        status: pur.payment_status,
        original: pur,
      });
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [appointments, invoiceDueDates, purchaseDueDates]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (search) {
        const s = search.toLowerCase();
        if (!item.title.toLowerCase().includes(s) && !item.subtitle?.toLowerCase().includes(s)) {
          return false;
        }
      }
      if (filterType !== "all") {
        if (filterType === "invoice_due" && item.type !== "invoice_due") return false;
        if (filterType === "purchase_due" && item.type !== "purchase_due") return false;
        if (filterType !== "invoice_due" && filterType !== "purchase_due" && (item.type === "invoice_due" || item.type === "purchase_due")) return false;
        if (filterType !== "invoice_due" && filterType !== "purchase_due" && item.type === "appointment") {
          const apt = item.original as Appointment;
          if (apt.type !== filterType) return false;
        }
      }
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      return true;
    });
  }, [allItems, search, filterType, filterStatus]);

  // Group by date
  const groupedItems = useMemo(() => {
    const groups = new Map<string, AgendaItem[]>();
    filteredItems.forEach((item) => {
      const dateKey = format(item.date, "yyyy-MM-dd");
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(item);
    });
    return groups;
  }, [filteredItems]);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoy";
    if (isTomorrow(date)) return "Mañana";
    return format(date, "EEEE, d 'de' MMMM", { locale: es });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar citas, facturas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="appointment">Citas</SelectItem>
            <SelectItem value="call">Llamadas</SelectItem>
            <SelectItem value="meeting">Reuniones</SelectItem>
            <SelectItem value="follow_up">Seguimientos</SelectItem>
            <SelectItem value="reminder">Recordatorios</SelectItem>
            <SelectItem value="invoice_due">Venc. facturas</SelectItem>
            <SelectItem value="purchase_due">Venc. compras</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="scheduled">Programada</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items grouped by date */}
      {filteredItems.length === 0 ? (
        <Card className="p-10 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No hay eventos para mostrar.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedItems.entries()).map(([dateKey, items]) => {
            const dateDate = parseISO(dateKey);
            const isPastDate = isPast(startOfDay(dateDate)) && !isToday(dateDate);

            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className={cn(
                    "text-sm font-semibold capitalize",
                    isPastDate && "text-muted-foreground",
                    isToday(dateDate) && "text-primary"
                  )}>
                    {getDateLabel(dateKey)}
                  </h4>
                  <Badge variant="secondary" className="text-xs rounded-full">
                    {items.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    if (item.type === "appointment") {
                      const apt = item.original as Appointment;
                      const typeConfig = APPOINTMENT_TYPES[apt.type];
                      const statusConfig = APPOINTMENT_STATUSES[apt.status];
                      const priorityConfig = APPOINTMENT_PRIORITIES[apt.priority];
                      const TypeIcon = typeConfig?.icon || CalendarDays;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer border-l-4"
                          style={{ borderLeftColor: apt.color || "#3b82f6" }}
                          onClick={() => onAppointmentClick(apt)}
                        >
                          <div className={cn("p-2 rounded-lg", typeConfig?.color?.split(" ")[0] || "bg-blue-500/15")}>
                            <TypeIcon className={cn("h-4 w-4", typeConfig?.color?.split(" ")[1] || "text-blue-700")} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{apt.title}</span>
                              {apt.priority !== "normal" && (
                                <div className={cn("w-2 h-2 rounded-full", priorityConfig?.dot)} title={priorityConfig?.label} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {!apt.all_day && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(apt.starts_at), "HH:mm")}
                                  {apt.ends_at && ` - ${format(new Date(apt.ends_at), "HH:mm")}`}
                                </span>
                              )}
                              {apt.all_day && <span>Todo el día</span>}
                              {apt.client?.name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {apt.client.name}
                                </span>
                              )}
                              {apt.location && (
                                <span className="flex items-center gap-1 hidden sm:flex">
                                  <MapPin className="h-3 w-3" />
                                  {apt.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs rounded-full", statusConfig?.color)}>
                              {statusConfig?.label}
                            </Badge>
                            {canManage && apt.status === "scheduled" && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(apt.id, "completed");
                                  }}
                                  title="Completar"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange(apt.id, "cancelled");
                                  }}
                                  title="Cancelar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (item.type === "purchase_due") {
                      // Purchase due date item
                      const pur = item.original as Record<string, unknown>;
                      const purDueDate = new Date(pur.credit_due_date as string);
                      const isPurOverdue = isPast(startOfDay(purDueDate)) && !isToday(purDueDate);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer border-l-4",
                            isPurOverdue ? "border-l-orange-500" : "border-l-yellow-500"
                          )}
                          onClick={() => onPurchaseClick?.(pur.id as number)}
                        >
                          <div className={cn("p-2 rounded-lg", isPurOverdue ? "bg-orange-500/15" : "bg-yellow-500/15")}>
                            <ShoppingCart className={cn("h-4 w-4", isPurOverdue ? "text-orange-700" : "text-yellow-700")} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{item.title}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {item.subtitle && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {item.subtitle}
                                </span>
                              )}
                              <span>Vence: {format(purDueDate, "dd/MM/yyyy")}</span>
                            </div>
                          </div>

                          <Badge className={cn(
                            "text-xs rounded-full",
                            isPurOverdue ? "bg-orange-500/15 text-orange-700 border-orange-500/20" : "bg-yellow-500/15 text-yellow-700 border-yellow-500/20"
                          )}>
                            {isPurOverdue ? "Vencida" : "Por vencer"}
                          </Badge>
                        </div>
                      );
                    }

                    // Invoice due date item
                    const inv = item.original as Record<string, unknown>;
                    const dueDate = new Date(inv.due_date as string);
                    const isOverdue = isPast(startOfDay(dueDate)) && !isToday(dueDate);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer border-l-4",
                          isOverdue ? "border-l-red-500" : "border-l-amber-500"
                        )}
                        onClick={() => onInvoiceClick(inv.id as number)}
                      >
                        <div className={cn("p-2 rounded-lg", isOverdue ? "bg-red-500/15" : "bg-amber-500/15")}>
                          <FileText className={cn("h-4 w-4", isOverdue ? "text-red-700" : "text-amber-700")} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{item.title}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            {item.subtitle && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.subtitle}
                              </span>
                            )}
                            <span>Vence: {format(dueDate, "dd/MM/yyyy")}</span>
                          </div>
                        </div>

                        <Badge className={cn(
                          "text-xs rounded-full",
                          isOverdue ? "bg-red-500/15 text-red-700 border-red-500/20" : "bg-amber-500/15 text-amber-700 border-amber-500/20"
                        )}>
                          {isOverdue ? "Vencida" : "Por vencer"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
