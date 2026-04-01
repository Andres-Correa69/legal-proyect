import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  FileText,
  MessageCircle,
  Mail,
  Search,
  Eye,
  MoreVertical,
  Edit,
  Printer,
  Trash,
  Plus,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilterWithCustom } from "./DateFilterWithCustom";
import { useToast } from "@/hooks/use-toast";
import { router } from "@inertiajs/react";
import type { ClientBalanceDetail } from "@/lib/api";
import type { User } from "@/types";

interface ClientHistoryViewProps {
  balanceData: ClientBalanceDetail | null;
  client: User;
}

interface HistoryItem {
  id: string;
  type: "purchase" | "payment";
  title: string;
  description: string;
  date: string;
  amount?: number;
  saleId?: number;
}

const getTypeConfig = (type: HistoryItem["type"]) => {
  switch (type) {
    case "purchase":
      return { icon: ShoppingCart, color: "bg-green-500/15 text-green-700 border-green-500/20", iconColor: "text-green-600", label: "Compra" };
    case "payment":
      return { icon: DollarSign, color: "bg-blue-500/15 text-blue-700 border-blue-500/20", iconColor: "text-blue-600", label: "Pago" };
    default:
      return { icon: FileText, color: "bg-muted text-foreground border-border", iconColor: "text-muted-foreground", label: "Otro" };
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => `$ ${amount.toLocaleString("es-CO")}`;

export const ClientHistoryView = ({ balanceData, client }: ClientHistoryViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const { toast } = useToast();

  // Build history from sales and payments
  const history = useMemo<HistoryItem[]>(() => {
    const items: HistoryItem[] = [];

    (balanceData?.sales ?? []).forEach((sale) => {
      items.push({
        id: `sale-${sale.id}`,
        type: "purchase",
        title: `Factura ${sale.invoice_number}`,
        description: `${sale.type_label} - ${sale.items_count} producto(s) - ${sale.payment_status_label}`,
        date: sale.date,
        amount: sale.total_amount,
        saleId: sale.id,
      });
    });

    (balanceData?.payments ?? []).forEach((payment) => {
      items.push({
        id: `payment-${payment.id}`,
        type: "payment",
        title: `Pago recibido`,
        description: `${payment.payment_method} - Factura ${payment.invoice_number}${payment.reference ? ` - Ref: ${payment.reference}` : ""}`,
        date: payment.payment_date,
        amount: payment.amount,
        saleId: payment.sale_id,
      });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [balanceData]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = !typeFilter || typeFilter === "todos" || item.type === typeFilter;

      let matchesDate = true;
      if (dateFilter && dateFilter !== "todos") {
        const itemDate = new Date(item.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === "personalizada" && customDateRange.from) {
          const fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDate = itemDate >= fromDate;
          if (customDateRange.to) {
            const toDate = new Date(customDateRange.to);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && itemDate <= toDate;
          }
        } else {
          switch (dateFilter) {
            case "hoy":
              matchesDate = itemDate >= today;
              break;
            case "ayer": {
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              matchesDate = itemDate >= yesterday && itemDate < today;
              break;
            }
            case "7dias": {
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              matchesDate = itemDate >= weekAgo;
              break;
            }
            case "30dias": {
              const monthAgo = new Date(today);
              monthAgo.setDate(monthAgo.getDate() - 30);
              matchesDate = itemDate >= monthAgo;
              break;
            }
            case "estemes": {
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              matchesDate = itemDate >= startOfMonth;
              break;
            }
            case "trimestre": {
              const quarterAgo = new Date(today);
              quarterAgo.setMonth(quarterAgo.getMonth() - 3);
              matchesDate = itemDate >= quarterAgo;
              break;
            }
          }
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [history, searchQuery, typeFilter, dateFilter, customDateRange]);

  const handleSendWhatsApp = () => {
    if (client.whatsapp_number) {
      const country = client.whatsapp_country?.replace("+", "") || "57";
      window.open(`https://wa.me/${country}${client.whatsapp_number}`, "_blank");
      toast({ title: "WhatsApp", description: "Abriendo WhatsApp..." });
    }
  };

  const handleSendEmail = () => {
    if (client.email) {
      window.open(`mailto:${client.email}`, "_blank");
      toast({ title: "Correo", description: "Abriendo cliente de correo..." });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en historial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="purchase">Compras</SelectItem>
              <SelectItem value="payment">Pagos</SelectItem>
            </SelectContent>
          </Select>

          <DateFilterWithCustom
            value={dateFilter}
            onChange={setDateFilter}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
            placeholder="Fecha"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nuevo Mensaje
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card z-50">
            <DropdownMenuItem className="cursor-pointer" onClick={handleSendWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />
              Enviar WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2 text-amber-600" />
              Enviar Correo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron registros con los filtros seleccionados
          </div>
        ) : (
          filteredHistory.map((item) => {
            const config = getTypeConfig(item.type);
            const Icon = config.icon;

            return (
              <div key={item.id} className="relative pl-12 pb-4">
                {/* Timeline dot */}
                <div className={`absolute left-3 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center ${config.iconColor}`}>
                  <Icon className="h-3 w-3" />
                </div>

                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${config.color}`}>
                            {config.label}
                          </Badge>
                          {item.amount !== undefined && (
                            <span className={`text-sm font-medium ${item.type === "payment" ? "text-[hsl(var(--success))]" : "text-primary"}`}>
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                          {formatDate(item.date)}
                        </span>
                        {item.saleId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => router.visit(`/admin/sales/${item.saleId}`)}
                          >
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                            {item.saleId && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${item.saleId}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalle
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">
                              <Printer className="h-4 w-4 mr-2" />
                              Imprimir
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={handleSendEmail}>
                              <Mail className="h-4 w-4 mr-2" />
                              Enviar por correo
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={handleSendWhatsApp}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Enviar por WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-destructive">
                              <Trash className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground sm:hidden block mt-2">
                      {formatDate(item.date)}
                    </span>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
