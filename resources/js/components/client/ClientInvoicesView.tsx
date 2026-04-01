import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Eye, MoreVertical, Edit, Printer, Mail, MessageSquare, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilterWithCustom } from "./DateFilterWithCustom";
import { router } from "@inertiajs/react";
import type { ClientBalanceDetail, ClientSaleInfo, SaleType, SalePaymentStatus } from "@/lib/api";

interface ClientInvoicesViewProps {
  balanceData: ClientBalanceDetail | null;
}

const typeTabs = [
  { id: "todas", label: "Todas" },
  { id: "electronic", label: "Electrónicas" },
  { id: "pos", label: "POS" },
  { id: "account", label: "Cuentas de Cobro" },
  { id: "credit", label: "Créditos" },
];

export const ClientInvoicesView = ({ balanceData }: ClientInvoicesViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const sales = balanceData?.sales ?? [];

  const filteredInvoices = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch =
        sale.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.type_label.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = activeType === "todas" || sale.type === activeType;
      const matchesStatus = !statusFilter || statusFilter === "todos" || sale.payment_status === statusFilter;

      let matchesDate = true;
      if (dateFilter && dateFilter !== "todos") {
        const saleDate = new Date(sale.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === "personalizada" && customDateRange.from) {
          const fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          matchesDate = saleDate >= fromDate;
          if (customDateRange.to) {
            const toDate = new Date(customDateRange.to);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && saleDate <= toDate;
          }
        } else {
          switch (dateFilter) {
            case "hoy": matchesDate = saleDate >= today; break;
            case "ayer": {
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              matchesDate = saleDate >= yesterday && saleDate < today;
              break;
            }
            case "7dias": {
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              matchesDate = saleDate >= weekAgo;
              break;
            }
            case "30dias": {
              const monthAgo = new Date(today);
              monthAgo.setDate(monthAgo.getDate() - 30);
              matchesDate = saleDate >= monthAgo;
              break;
            }
            case "estemes": {
              const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              matchesDate = saleDate >= startOfMonth;
              break;
            }
            case "trimestre": {
              const quarterAgo = new Date(today);
              quarterAgo.setMonth(quarterAgo.getMonth() - 3);
              matchesDate = saleDate >= quarterAgo;
              break;
            }
          }
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [sales, searchQuery, activeType, statusFilter, dateFilter, customDateRange]);

  const getStatusBadge = (status: SalePaymentStatus) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 font-medium">Pagada</Badge>;
      case "pending":
        return <Badge className="bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-0 font-medium">Pendiente</Badge>;
      case "partial":
        return <Badge className="bg-accent text-accent-foreground border-0 font-medium">Parcial</Badge>;
    }
  };

  const getTypeBadge = (type: SaleType) => {
    switch (type) {
      case "electronic":
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">Factura Electrónica</Badge>;
      case "pos":
        return <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border text-xs">POS</Badge>;
      case "account":
        return <Badge variant="outline" className="bg-accent text-accent-foreground border-border text-xs">Cuenta de Cobro</Badge>;
      case "credit":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">Crédito</Badge>;
    }
  };

  const formatCurrency = (amount: number) => `$ ${amount.toLocaleString("es-CO")}`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Segmented Type Tabs */}
      <div className="bg-muted/60 rounded-lg p-1 flex items-center overflow-x-auto hide-scrollbar">
        {typeTabs.map((tab) => {
          const isActive = activeType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveType(tab.id)}
              className={`
                flex-1 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all
                ${isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número o tipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
          </SelectContent>
        </Select>

        <DateFilterWithCustom
          value={dateFilter}
          onChange={setDateFilter}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
          placeholder="Todas las fechas"
        />

        <Button
          className="gap-2 w-full sm:w-auto flex-shrink-0"
          onClick={() => router.visit("/admin/sell")}
        >
          <Plus className="h-4 w-4" />
          Vender
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Mostrando {filteredInvoices.length} de {sales.length} facturas.
      </p>

      {/* Invoice Cards - Horizontal style */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron facturas con los filtros seleccionados
          </div>
        ) : (
          filteredInvoices.map((sale) => (
            <div
              key={sale.id}
              className="p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow"
            >
              {/* Mobile layout */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1.5">{getTypeBadge(sale.type)}</div>
                    <p className="text-base font-bold text-foreground">{sale.invoice_number}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(sale.date)}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => router.visit(`/admin/sales/${sale.id}`)}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Printer className="h-4 w-4 mr-2" /> Imprimir
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Mail className="h-4 w-4 mr-2" /> Enviar por correo
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <MessageSquare className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive">
                          <Trash className="h-4 w-4 mr-2" /> Anular
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">{formatCurrency(sale.total_amount)}</p>
                  {getStatusBadge(sale.payment_status)}
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:flex items-center gap-6">
                <div className="min-w-[150px] flex-shrink-0">
                  <div className="mb-1.5">{getTypeBadge(sale.type)}</div>
                  <p className="text-base font-bold text-foreground">{sale.invoice_number}</p>
                </div>

                <div className="flex-1 min-w-0">
                  {sale.seller && (
                    <p className="font-semibold text-foreground truncate">{sale.seller}</p>
                  )}
                  {sale.branch && (
                    <p className="text-sm text-muted-foreground">{sale.branch}</p>
                  )}
                </div>

                <div className="hidden md:block text-center flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(sale.date)}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary">{formatCurrency(sale.total_amount)}</p>
                </div>

                <div className="flex-shrink-0">
                  {getStatusBadge(sale.payment_status)}
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => router.visit(`/admin/sales/${sale.id}`)}
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card z-50">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <Mail className="h-4 w-4 mr-2" /> Enviar por correo
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <MessageSquare className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive">
                        <Trash className="h-4 w-4 mr-2" /> Anular
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
