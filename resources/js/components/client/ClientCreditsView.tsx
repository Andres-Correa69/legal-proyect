import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  MoreVertical,
  DollarSign,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { router } from "@inertiajs/react";
import type { ClientBalanceDetail, ClientSaleInfo } from "@/lib/api";

interface ClientCreditsViewProps {
  balanceData: ClientBalanceDetail | null;
}

type CreditStatus = "active" | "overdue" | "paid";

const getCreditStatus = (sale: ClientSaleInfo): CreditStatus => {
  if (sale.balance <= 0) return "paid";
  if (sale.due_date) {
    const dueDate = new Date(sale.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) return "overdue";
  }
  return "active";
};

export const ClientCreditsView = ({ balanceData }: ClientCreditsViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const sales = balanceData?.sales ?? [];

  // All sales with balance or that had credit payment_status
  const credits = useMemo(() => {
    return sales.filter((s) => s.balance > 0 || s.payment_status === "partial");
  }, [sales]);

  const filtered = useMemo(() => {
    return credits.filter((c) => {
      const matchesSearch =
        c.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.type_label.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getCreditStatus(c);
      const matchesStatus = !statusFilter || statusFilter === "todos" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [credits, searchQuery, statusFilter]);

  const totalActive = credits.filter((c) => getCreditStatus(c) === "active").reduce((s, c) => s + c.balance, 0);
  const totalOverdue = credits.filter((c) => getCreditStatus(c) === "overdue").reduce((s, c) => s + c.balance, 0);
  const totalPaidCredits = credits.filter((c) => getCreditStatus(c) === "paid").reduce((s, c) => s + c.total_amount, 0);

  const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });

  const getStatusBadge = (status: CreditStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-primary/15 text-primary border-0 font-medium">Activo</Badge>;
      case "overdue":
        return <Badge className="bg-destructive/15 text-destructive border-0 font-medium">Vencido</Badge>;
      case "paid":
        return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-0 font-medium">Pagado</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Créditos Activos</span>
          </div>
          <p className="text-2xl font-bold text-primary">{fmt(totalActive)}</p>
          <p className="text-xs text-muted-foreground mt-1">{credits.filter(c => getCreditStatus(c) === "active").length} crédito(s) vigentes</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-foreground">Vencidos</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{fmt(totalOverdue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{credits.filter(c => getCreditStatus(c) === "overdue").length} crédito(s) vencidos</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <span className="text-sm font-medium text-foreground">Pagados</span>
          </div>
          <p className="text-2xl font-bold text-[hsl(var(--success))]">{fmt(totalPaidCredits)}</p>
          <p className="text-xs text-muted-foreground mt-1">{credits.filter(c => getCreditStatus(c) === "paid").length} crédito(s) completados</p>
        </div>
      </div>

      {/* Search + Filter */}
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {credits.length} créditos.
      </p>

      {/* Credit cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-base font-medium">No se encontraron créditos</p>
          </div>
        ) : (
          filtered.map((sale) => {
            const status = getCreditStatus(sale);
            return (
              <div
                key={sale.id}
                className="flex items-center gap-4 sm:gap-6 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow"
              >
                {/* ID + Invoice */}
                <div className="min-w-[110px] sm:min-w-[140px] flex-shrink-0">
                  {getStatusBadge(status)}
                  <p className="text-base font-bold text-foreground mt-1">{sale.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{sale.type_label}</p>
                </div>

                {/* Progress */}
                <div className="flex-1 min-w-0 hidden sm:block">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Avance de pago</span>
                    <span>{sale.total_amount > 0 ? Math.round((sale.paid_amount / sale.total_amount) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        status === "paid"
                          ? "bg-[hsl(var(--success))]"
                          : status === "overdue"
                            ? "bg-destructive"
                            : "bg-primary"
                      }`}
                      style={{ width: `${sale.total_amount > 0 ? (sale.paid_amount / sale.total_amount) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Pagado: {fmt(sale.paid_amount)}</span>
                    <span className="text-muted-foreground">Total: {fmt(sale.total_amount)}</span>
                  </div>
                </div>

                {/* Due date */}
                <div className="hidden md:block text-center flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Vence</p>
                  <p className="text-sm font-medium text-foreground">
                    {sale.due_date ? fmtDate(sale.due_date) : "-"}
                  </p>
                </div>

                {/* Remaining */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${sale.balance > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                    {fmt(sale.balance)}
                  </p>
                </div>

                {/* Actions */}
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
                    <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                        <DollarSign className="h-4 w-4 mr-2" /> Registrar abono
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                        <Calendar className="h-4 w-4 mr-2" /> Ver cuotas
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                        <Eye className="h-4 w-4 mr-2" /> Ver factura
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
