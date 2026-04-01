import { useMemo, useState, useEffect } from "react";
import { Head, usePage } from "@inertiajs/react";
import type { SharedData } from "@/types";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import {
  Eye, CheckCircle2, XCircle, AlertTriangle, Calendar, ArrowLeft,
  DollarSign, CreditCard, Banknote, Receipt, TrendingUp, TrendingDown,
  Clock, User, FileText, ArrowRightLeft,
  ShoppingCart, Wallet, BadgeDollarSign, HandCoins, CircleDollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";

import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cashSessionsApi, cashRegistersApi } from "@/lib/api";
import type { CashRegisterSession, CashRegister, Payment } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

// ── Types ──

type MovementCategory = "ventas" | "cobros" | "gastos" | "transferencias" | "anulaciones" | "otros";

interface GroupedPayment {
  id: number;
  category: MovementCategory;
  description: string;
  reference: string;
  amount: number;
  type: "income" | "expense";
  method: string;
  time: string;
  client?: string;
}

const CATEGORY_CONFIG: Record<MovementCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  ventas: { label: "Ventas / Facturas", icon: ShoppingCart, color: "text-emerald-600", bgColor: "bg-emerald-500/100/10" },
  cobros: { label: "Cobros / Recaudos", icon: HandCoins, color: "text-blue-600", bgColor: "bg-blue-500/100/10" },
  gastos: { label: "Gastos / Egresos", icon: Wallet, color: "text-red-600", bgColor: "bg-red-500/100/10" },
  transferencias: { label: "Transferencias entre Cajas", icon: ArrowRightLeft, color: "text-purple-600", bgColor: "bg-purple-500/100/10" },
  anulaciones: { label: "Anulaciones / Devoluciones", icon: XCircle, color: "text-amber-600", bgColor: "bg-amber-500/100/10" },
  otros: { label: "Otros Movimientos", icon: CircleDollarSign, color: "text-teal-600", bgColor: "bg-teal-500/100/10" },
};

const METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Efectivo": Banknote,
  "Tarjeta Débito": CreditCard,
  "Tarjeta Crédito": CreditCard,
  "Transferencia": ArrowRightLeft,
  "Nequi": Wallet,
  "Daviplata": Wallet,
  "Interno": ArrowRightLeft,
};

type DatePreset = "all" | "today" | "yesterday" | "week" | "month" | "custom";

// ── Helpers ──

function classifyPayment(payment: Payment): MovementCategory {
  if (payment.is_cancelled) return "anulaciones";
  if (payment.related_type?.includes("Sale") || payment.concept?.toLowerCase().includes("factura") || payment.concept?.toLowerCase().includes("venta")) return "ventas";
  if (payment.concept?.toLowerCase().includes("cobro") || payment.concept?.toLowerCase().includes("recaudo")) return "cobros";
  if (payment.concept?.toLowerCase().includes("transfer")) return "transferencias";
  if (payment.type === "expense") return "gastos";
  if (payment.type === "income") return "cobros";
  return "otros";
}

function paymentToGrouped(payment: Payment): GroupedPayment {
  return {
    id: payment.id,
    category: classifyPayment(payment),
    description: payment.concept || (payment.type === "income" ? "Ingreso" : "Egreso"),
    reference: payment.payment_number || "",
    amount: payment.amount,
    type: payment.type,
    method: payment.payment_method?.name || "—",
    time: payment.paid_at ? format(new Date(payment.paid_at), "HH:mm") : "—",
    client: payment.client?.name || payment.supplier?.name || undefined,
  };
}

function getDifferenceStatus(diff?: number | null) {
  if (diff === undefined || diff === null) return null;
  if (Math.abs(diff) < 0.01) return { label: "Cuadrada", color: "bg-emerald-500/100/10 text-emerald-600", icon: CheckCircle2 };
  if (diff > 0) return { label: "Sobrante", color: "bg-amber-500/100/10 text-amber-600", icon: AlertTriangle };
  return { label: "Faltante", color: "bg-red-500/100/10 text-red-600", icon: XCircle };
}

// ── Pagination Footer ──

function ListFooter({
  total, currentPage, totalPages, itemsPerPage, startIndex, endIndex, onItemsPerPageChange, onPageChange,
}: {
  total: number; currentPage: number; totalPages: number; itemsPerPage: number;
  startIndex: number; endIndex: number;
  onItemsPerPageChange: (n: number) => void; onPageChange: (p: number) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Mostrando {startIndex + 1}–{endIndex} de {total} cierres</span>
        <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            {[10, 20, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>por página</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          {currentPage} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function CashClosures() {
  const { props } = usePage<SharedData>();
  const user = props.auth?.user;
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCaja, setFilterCaja] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewing, setViewing] = useState<CashRegisterSession | null>(null);

  useEffect(() => {
    Promise.all([
      cashSessionsApi.getAll({ status: "closed" }),
      cashRegistersApi.getAll(),
    ])
      .then(([sessionsData, registersData]) => {
        setSessions(sessionsData);
        setRegisters(registersData);
      })
      .catch((err) => console.error("Error loading closures:", err))
      .finally(() => setLoading(false));
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();

    switch (preset) {
      case "today":
        setDateFrom(format(today, "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      case "yesterday": {
        const yesterday = subDays(today, 1);
        setDateFrom(format(yesterday, "yyyy-MM-dd"));
        setDateTo(format(yesterday, "yyyy-MM-dd"));
        break;
      }
      case "week": {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        setDateFrom(format(weekStart, "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      }
      case "month": {
        const monthStart = startOfMonth(today);
        setDateFrom(format(monthStart, "yyyy-MM-dd"));
        setDateTo(format(today, "yyyy-MM-dd"));
        break;
      }
      case "all":
        setDateFrom("");
        setDateTo("");
        break;
      case "custom":
        break;
    }
    setCurrentPage(1);
  };

  const handleCustomDateChange = (type: "from" | "to", value: string) => {
    if (type === "from") setDateFrom(value);
    else setDateTo(value);
    setDatePreset("custom");
    setCurrentPage(1);
  };

  const getRegisterById = (id: number) => registers.find((r) => r.id === id);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filterCaja !== "all" && s.cash_register_id !== Number(filterCaja)) return false;
      if (dateFrom) {
        const from = startOfDay(parseISO(dateFrom));
        const sessionDate = new Date(s.opened_at);
        if (sessionDate < from) return false;
      }
      if (dateTo) {
        const to = endOfDay(parseISO(dateTo));
        const sessionDate = new Date(s.opened_at);
        if (sessionDate > to) return false;
      }
      return true;
    });
  }, [sessions, filterCaja, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => new Date(b.closed_at || b.opened_at).getTime() - new Date(a.closed_at || a.opened_at).getTime());
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sorted.length);
  const pageItems = sorted.slice(startIndex, endIndex);

  if (viewing) {
    return (
      <AppLayout>
        <Head title="Detalle de Cierre" />
        <div className="space-y-4">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Detalle de Cierre</h1>
            <p className="text-sm text-muted-foreground">
              {getRegisterById(viewing.cash_register_id)?.name || "Caja"} — {format(new Date(viewing.opened_at), "dd 'de' MMMM yyyy", { locale: es })}
            </p>
          </header>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <CashClosureDetail
                session={viewing}
                getRegisterById={getRegisterById}
                onBack={() => setViewing(null)}
                user={user}
              />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title="Cierres Anteriores" />
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Cierres Anteriores</h1>
          <p className="text-sm text-muted-foreground">Historial de sesiones de caja cerradas.</p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Select value={filterCaja} onValueChange={(v) => { setFilterCaja(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Todas las cajas" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Todas las cajas</SelectItem>
                        {registers.filter((r) => r.type === "minor").map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Date preset buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant={datePreset === "all" ? "default" : "outline"} size="sm" onClick={() => handlePresetChange("all")}>
                        Todos
                      </Button>
                      <Button variant={datePreset === "today" ? "default" : "outline"} size="sm" onClick={() => handlePresetChange("today")}>
                        Hoy
                      </Button>
                      <Button variant={datePreset === "yesterday" ? "default" : "outline"} size="sm" onClick={() => handlePresetChange("yesterday")}>
                        Ayer
                      </Button>
                      <Button variant={datePreset === "week" ? "default" : "outline"} size="sm" onClick={() => handlePresetChange("week")}>
                        Esta semana
                      </Button>
                      <Button variant={datePreset === "month" ? "default" : "outline"} size="sm" onClick={() => handlePresetChange("month")}>
                        Este mes
                      </Button>
                    </div>
                  </div>

                  {/* Custom date range */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Personalizado:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 w-[180px] justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
                          <Calendar className="h-3.5 w-3.5 mr-2" />
                          {dateFrom ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerReport
                          selected={dateFrom ? new Date(dateFrom + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              handleCustomDateChange("from", `${y}-${m}-${d}`);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">a</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 w-[180px] justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
                          <Calendar className="h-3.5 w-3.5 mr-2" />
                          {dateTo ? new Date(dateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerReport
                          selected={dateTo ? new Date(dateTo + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              handleCustomDateChange("to", `${y}-${m}-${d}`);
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {datePreset === "custom" && (
                      <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Caja</TableHead>
                        <TableHead>Fecha Apertura</TableHead>
                        <TableHead>Fecha Cierre</TableHead>
                        <TableHead className="text-right">Saldo Inicial</TableHead>
                        <TableHead className="text-right">Saldo Final</TableHead>
                        <TableHead>Diferencia</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((s) => {
                        const caja = getRegisterById(s.cash_register_id);
                        const diffStatus = getDifferenceStatus(s.difference);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{caja?.name || "—"}</TableCell>
                            <TableCell>
                              {format(new Date(s.opened_at), "dd/MM/yyyy HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                              {s.closed_at
                                ? format(new Date(s.closed_at), "dd/MM/yyyy HH:mm", { locale: es })
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(s.opening_balance)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(s.closing_balance ?? 0)}</TableCell>
                            <TableCell>
                              {diffStatus ? (
                                <Badge className={diffStatus.color}>
                                  <diffStatus.icon className="h-3 w-3 mr-1" />
                                  {diffStatus.label} {Math.abs(s.difference ?? 0) >= 0.01 && formatCurrency(Math.abs(s.difference ?? 0))}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setViewing(s)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pageItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                            No hay cierres para mostrar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <ListFooter
                  total={sorted.length}
                  currentPage={safePage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

/* ─────────────────────────── Full Closure Detail ─────────────────────────── */

function CashClosureDetail({
  session,
  getRegisterById,
  onBack,
  user,
}: {
  session: CashRegisterSession;
  getRegisterById: (id: number) => CashRegister | undefined;
  onBack: () => void;
  user: any;
}) {
  const [detailSession, setDetailSession] = useState<CashRegisterSession | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    cashSessionsApi.getById(session.id)
      .then((data) => setDetailSession(data))
      .catch((err) => console.error("Error loading session detail:", err))
      .finally(() => setLoadingDetail(false));
  }, [session.id]);

  const s = detailSession || session;
  const caja = getRegisterById(s.cash_register_id);
  const duration = s.closed_at
    ? differenceInMinutes(new Date(s.closed_at), new Date(s.opened_at))
    : 0;
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;

  const payments: Payment[] = (s as any).payments || [];

  const grouped = useMemo(() => {
    const movements = payments
      .filter((p) => !p.is_cancelled || classifyPayment(p) === "anulaciones")
      .map(paymentToGrouped);

    const map: Record<MovementCategory, GroupedPayment[]> = {
      ventas: [], cobros: [], gastos: [], transferencias: [], anulaciones: [], otros: [],
    };
    movements.forEach((m) => map[m.category].push(m));
    return map;
  }, [payments]);

  const categoryTotals = useMemo(() => {
    const totals: Record<MovementCategory, { income: number; expense: number; count: number }> = {
      ventas: { income: 0, expense: 0, count: 0 },
      cobros: { income: 0, expense: 0, count: 0 },
      gastos: { income: 0, expense: 0, count: 0 },
      transferencias: { income: 0, expense: 0, count: 0 },
      anulaciones: { income: 0, expense: 0, count: 0 },
      otros: { income: 0, expense: 0, count: 0 },
    };
    Object.entries(grouped).forEach(([cat, items]) => {
      items.forEach((m) => {
        totals[cat as MovementCategory].count++;
        if (m.type === "income") totals[cat as MovementCategory].income += m.amount;
        else totals[cat as MovementCategory].expense += m.amount;
      });
    });
    return totals;
  }, [grouped]);

  const methodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments
      .filter((p) => p.type === "income" && !p.is_cancelled)
      .forEach((p) => {
        const method = p.payment_method?.name || "Otro";
        map[method] = (map[method] || 0) + p.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments]);

  const diffStatus = (() => {
    const diff = s.difference;
    if (diff === undefined || diff === null) return null;
    if (Math.abs(diff) < 0.01) return { label: "Cuadrada", icon: CheckCircle2 };
    if (diff > 0) return { label: "Sobrante", icon: AlertTriangle };
    return { label: "Faltante", icon: XCircle };
  })();

  const handleTicket = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const ticketW = 80;
      const cajaName = caja?.name || 'Caja';
      const cajero = (s as any).opened_by?.name || '-';
      const openedDate = format(parseISO(s.opened_at), "dd/MM/yyyy HH:mm", { locale: es });
      const closedDate = s.closed_at ? format(parseISO(s.closed_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Abierta';
      const totalIncome = s.total_income || 0;
      const totalExpense = s.total_expense || 0;

      // Estimate height
      let estimatedH = 120;
      (Object.entries(grouped) as [MovementCategory, GroupedPayment[]][]).forEach(([, items]) => { estimatedH += items.length * 5 + 15; });
      estimatedH += methodBreakdown.length * 5 + 30;

      const companyName = user?.company?.name || 'Empresa';
      const companyTaxId = user?.company?.tax_id || '';
      const companyAddress = user?.company?.address || '';
      const logoUrl = user?.company?.logo_icon_url || user?.company?.logo_url;

      // Estimate extra for logo
      estimatedH += 25;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [ticketW, Math.max(estimatedH, 160)] });
      const m = 4;
      const cw = ticketW - m * 2;
      let y = m;

      // ── Logo ──
      const logoData = await loadPdfLogo(logoUrl);
      if (logoData) {
        const ratio = logoData.width / logoData.height;
        const maxH = 12;
        const maxW = 30;
        let lw = maxH * ratio;
        let lh = maxH;
        if (lw > maxW) { lw = maxW; lh = lw / ratio; }
        const lx = (ticketW - lw) / 2;
        pdf.addImage(logoData.dataUrl, 'PNG', lx, y, lw, lh);
        y += lh + 2;
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(31, 41, 55);
      pdf.text(companyName, ticketW / 2, y, { align: 'center' });
      y += 3;
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      if (companyTaxId) { pdf.text(`NIT: ${companyTaxId}`, ticketW / 2, y, { align: 'center' }); y += 3; }
      if (companyAddress) { pdf.text(companyAddress, ticketW / 2, y, { align: 'center' }); y += 3; }
      y += 1;

      // ── Title ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('CIERRE DE CAJA', ticketW / 2, y, { align: 'center' });
      y += 4;
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(cajaName, ticketW / 2, y, { align: 'center' });
      y += 4;

      // Dashed separator
      const drawSep = () => { pdf.setDrawColor(200); pdf.setLineDashPattern([1, 1], 0); pdf.line(m, y, ticketW - m, y); pdf.setLineDashPattern([], 0); y += 3; };
      drawSep();

      // ── Info ──
      pdf.setFontSize(7);
      pdf.setTextColor(75, 85, 99);
      const infoLines = [
        [`Cajero:`, cajero],
        [`Apertura:`, openedDate],
        [`Cierre:`, closedDate],
        [`Duración:`, `${hours}h ${mins}m`],
      ];
      infoLines.forEach(([label, val]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, m, y);
        pdf.setFont('helvetica', 'normal');
        pdf.text(val, ticketW - m, y, { align: 'right' });
        y += 3.5;
      });
      y += 1;
      drawSep();

      // ── Resumen Financiero ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      pdf.text('RESUMEN', ticketW / 2, y, { align: 'center' });
      y += 4;

      pdf.setFontSize(7);
      const summaryLines: [string, string, number[]][] = [
        ['Saldo Inicial', formatCurrency(s.opening_balance), [75, 85, 99]],
        ['(+) Ingresos', formatCurrency(totalIncome), [5, 150, 105]],
        ['(-) Egresos', formatCurrency(totalExpense), [220, 38, 38]],
        ['Saldo Esperado', formatCurrency(s.expected_balance || 0), [75, 85, 99]],
        ['Saldo Real', formatCurrency(s.closing_balance || 0), [31, 41, 55]],
      ];
      summaryLines.forEach(([label, val, color]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(label, m, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.text(val, ticketW - m, y, { align: 'right' });
        y += 3.5;
      });

      // Diferencia destacada
      y += 1;
      const diff = s.difference || 0;
      const diffColor = Math.abs(diff) < 0.01 ? [5, 150, 105] : diff > 0 ? [217, 119, 6] : [220, 38, 38];
      pdf.setFillColor(diffColor[0], diffColor[1], diffColor[2]);
      pdf.roundedRect(m, y - 1, cw, 6, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DIFERENCIA', m + 2, y + 3);
      pdf.text(formatCurrency(diff), ticketW - m - 2, y + 3, { align: 'right' });
      y += 9;
      drawSep();

      // ── Desglose por Método ──
      if (methodBreakdown.length > 0) {
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('POR MÉTODO DE PAGO', ticketW / 2, y, { align: 'center' });
        y += 4;
        pdf.setFontSize(7);
        methodBreakdown.forEach(([method, amount]) => {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(75, 85, 99);
          pdf.text(method, m, y);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(31, 41, 55);
          pdf.text(formatCurrency(amount), ticketW - m, y, { align: 'right' });
          y += 3.5;
        });
        y += 1;
        drawSep();
      }

      // ── Movimientos por categoría ──
      (Object.entries(grouped) as [MovementCategory, GroupedPayment[]][]).forEach(([cat, items]) => {
        if (items.length === 0) return;
        const cfg = CATEGORY_CONFIG[cat];
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${cfg.label} (${items.length})`, m, y);
        y += 3;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(107, 114, 128);
        items.forEach((mv) => {
          const sign = mv.type === 'income' ? '+' : '-';
          pdf.text(`${mv.time} ${mv.description.substring(0, 28)}`, m, y);
          pdf.setTextColor(mv.type === 'income' ? 5 : 220, mv.type === 'income' ? 150 : 38, mv.type === 'income' ? 105 : 38);
          pdf.text(`${sign}${formatCurrency(mv.amount)}`, ticketW - m, y, { align: 'right' });
          pdf.setTextColor(107, 114, 128);
          y += 3;
        });
        y += 2;
      });

      // ── Footer ──
      drawSep();
      pdf.setFontSize(6);
      pdf.setTextColor(156, 163, 175);
      pdf.text(new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }), ticketW / 2, y, { align: 'center' });
      y += 3;
      pdf.text('Generado por Legal Sistema', ticketW / 2, y, { align: 'center' });

      pdf.save(`Ticket_${cajaName}_${format(parseISO(s.opened_at), 'yyyy-MM-dd')}.pdf`);
    } catch (err) { console.error('Error generating ticket:', err); }
  };

  const handleExportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const cajaName = caja?.name || 'Caja';
      const cajero = (s as any).opened_by?.name || '-';
      const openedDate = format(parseISO(s.opened_at), "dd/MM/yyyy HH:mm", { locale: es });
      const closedDate = s.closed_at ? format(parseISO(s.closed_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Abierta';
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const fy = pageHeight - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, fy, pageWidth - margin, fy);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(156, 163, 175);
          pdf.text('Generado por Legal Sistema', pageWidth / 2, fy + 4, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Página ${i} de ${pages}`, pageWidth / 2, fy + 7, { align: 'center' });
        }
      };

      const companyName = user?.company?.name || 'Empresa';
      const companyTaxId = user?.company?.tax_id || '';
      const companyAddress = user?.company?.address || '';
      const logoDataUrl = await loadPdfLogo(user?.company?.logo_url);

      let currentY = margin;

      // ── Logo + Company ──
      const logoH = addLogoToPdf(pdf, logoDataUrl, margin, currentY, 12, 40);
      currentY += logoH;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(31, 41, 55);
      pdf.text(companyName, margin, currentY + 5);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      let infoY = currentY + 9;
      if (companyTaxId) { pdf.text(`NIT: ${companyTaxId}`, margin, infoY); infoY += 3; }
      if (companyAddress) { pdf.text(companyAddress, margin, infoY); infoY += 3; }

      // Badge + Title (right side)
      const rightX = pageWidth - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeText = 'CIERRE DE CAJA';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text(cajaName, rightX, currentY + 9, { align: 'right' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Cajero: ${cajero}  |  ${openedDate} → ${closedDate}  |  ${hours}h ${mins}m`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      currentY = Math.max(currentY + 5, infoY) + 10;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // ── Summary Cards ──
      const cardData = [
        { label: 'SALDO INICIAL', value: formatCurrency(s.opening_balance), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
        { label: 'INGRESOS', value: formatCurrency(s.total_income || 0), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'EGRESOS', value: formatCurrency(s.total_expense || 0), bg: [254, 226, 226], border: [252, 165, 165], color: [220, 38, 38] },
        { label: 'DIFERENCIA', value: formatCurrency(s.difference || 0), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
      ];
      const cardW = (contentWidth - 6) / 4;
      cardData.forEach((card, idx) => {
        const x = margin + idx * (cardW + 2);
        pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
        pdf.roundedRect(x, currentY, cardW, 14, 1.5, 1.5, 'FD');
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 114, 128);
        pdf.text(card.label, x + cardW / 2, currentY + 5, { align: 'center' });
        pdf.setFontSize(11);
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
      });
      currentY += 22;

      // ── Método de pago ──
      if (methodBreakdown.length > 0) {
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('Desglose por Método de Pago', margin + 4, currentY + 4.8);
        currentY += 9;
        autoTable(pdf, {
          startY: currentY,
          head: [['Método de Pago', 'Monto']],
          body: methodBreakdown.map(([method, amount]) => [method, formatCurrency(amount)]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: { 1: { halign: 'right' } },
        });
        currentY = (pdf as any).lastAutoTable.finalY + 8;
      }

      // ── Movimientos por categoría ──
      (Object.entries(grouped) as [MovementCategory, GroupedPayment[]][]).forEach(([cat, items]) => {
        if (items.length === 0) return;
        const cfg = CATEGORY_CONFIG[cat];
        if (currentY + 20 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${cfg.label} (${items.length})`, margin + 4, currentY + 4.8);
        currentY += 9;
        autoTable(pdf, {
          startY: currentY,
          head: [['Hora', 'Descripción', 'Referencia', 'Método', 'Ingreso', 'Egreso']],
          body: items.map((mv) => [
            mv.time, mv.description, mv.reference, mv.method,
            mv.type === 'income' ? formatCurrency(mv.amount) : '',
            mv.type === 'expense' ? formatCurrency(mv.amount) : '',
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
        });
        currentY = (pdf as any).lastAutoTable.finalY + 8;
      });

      addFooters();
      pdf.save(`Cierre_${cajaName}_${format(parseISO(s.opened_at), 'yyyy-MM-dd')}.pdf`);
    } catch (err) { console.error('Error generating PDF:', err); }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const cajaName = caja?.name || 'Caja';

      // Sheet 1: Resumen
      const summaryData = [
        { Concepto: 'Empresa', Valor: user?.company?.name || '' },
        { Concepto: 'NIT', Valor: user?.company?.tax_id || '' },
        { Concepto: 'Dirección', Valor: user?.company?.address || '' },
        { Concepto: '', Valor: '' },
        { Concepto: 'Caja', Valor: cajaName },
        { Concepto: 'Cajero', Valor: (s as any).opened_by?.name || '-' },
        { Concepto: 'Apertura', Valor: format(parseISO(s.opened_at), "dd/MM/yyyy HH:mm", { locale: es }) },
        { Concepto: 'Cierre', Valor: s.closed_at ? format(parseISO(s.closed_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Abierta' },
        { Concepto: 'Duración', Valor: `${hours}h ${mins}m` },
        { Concepto: '', Valor: '' },
        { Concepto: 'Saldo Inicial', Valor: s.opening_balance },
        { Concepto: 'Total Ingresos', Valor: s.total_income || 0 },
        { Concepto: 'Total Egresos', Valor: s.total_expense || 0 },
        { Concepto: 'Saldo Esperado', Valor: s.expected_balance || 0 },
        { Concepto: 'Saldo Real', Valor: s.closing_balance || 0 },
        { Concepto: 'Diferencia', Valor: s.difference || 0 },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

      // Sheet 2: Movimientos
      const allMovements: any[] = [];
      (Object.entries(grouped) as [MovementCategory, GroupedPayment[]][]).forEach(([cat, items]) => {
        items.forEach((mv) => {
          allMovements.push({
            'Categoría': CATEGORY_CONFIG[cat].label,
            'Hora': mv.time,
            'Descripción': mv.description,
            'Referencia': mv.reference,
            'Método': mv.method,
            'Tipo': mv.type === 'income' ? 'Ingreso' : 'Egreso',
            'Monto': mv.amount,
            'Cliente': mv.client || '',
          });
        });
      });
      if (allMovements.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(allMovements);
        ws2['!cols'] = [{ wch: 25 }, { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Movimientos');
      }

      // Sheet 3: Por Método de Pago
      if (methodBreakdown.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(methodBreakdown.map(([method, amount]) => ({ 'Método de Pago': method, 'Monto': amount })));
        ws3['!cols'] = [{ wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Métodos de Pago');
      }

      XLSX.writeFile(wb, `Cierre_${cajaName}_${format(parseISO(s.opened_at), 'yyyy-MM-dd')}.xlsx`);
    } catch (err) { console.error('Error generating Excel:', err); }
  };

  if (loadingDetail) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Volver al Listado
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleTicket}>
            <Receipt className="h-4 w-4" /> Ticket
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cajero</span>
            </div>
            <p className="font-medium text-sm">{s.opened_by?.name || s.user?.name || s.closed_by?.name || `Usuario #${s.user_id || "—"}`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Duración</span>
            </div>
            <p className="font-medium text-sm">{hours}h {mins}min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Movimientos</span>
            </div>
            <p className="font-medium text-sm">{payments.length} operaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Caja</span>
            </div>
            <p className="font-medium text-sm">{caja?.name || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-muted-foreground">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
            <p className="text-lg font-bold">{formatCurrency(s.opening_balance)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(s.opened_at), "HH:mm", { locale: es })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Ingresos</p>
            <p className="text-lg font-bold text-emerald-600">+{formatCurrency(s.total_income ?? 0)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-[11px] text-muted-foreground">Entradas</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Egresos</p>
            <p className="text-lg font-bold text-red-600">-{formatCurrency(s.total_expense ?? 0)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-[11px] text-muted-foreground">Salidas</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Saldo Esperado</p>
            <p className="text-lg font-bold">{formatCurrency(s.expected_balance ?? 0)}</p>
            <span className="text-[11px] text-muted-foreground">Calculado</span>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Saldo Contado</p>
            <p className="text-lg font-bold">{formatCurrency(s.closing_balance ?? 0)}</p>
            <span className="text-[11px] text-muted-foreground">Arqueo físico</span>
          </CardContent>
        </Card>
        {diffStatus && (
          <Card className={`border-l-4 ${Math.abs(s.difference ?? 0) < 0.01 ? "border-l-emerald-500" : (s.difference ?? 0) > 0 ? "border-l-amber-500" : "border-l-red-500"}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
              <div className="flex items-center gap-1.5">
                <diffStatus.icon className={`h-4 w-4 ${Math.abs(s.difference ?? 0) < 0.01 ? "text-emerald-600" : (s.difference ?? 0) > 0 ? "text-amber-600" : "text-red-600"}`} />
                <p className={`text-lg font-bold ${Math.abs(s.difference ?? 0) < 0.01 ? "text-emerald-600" : (s.difference ?? 0) > 0 ? "text-amber-600" : "text-red-600"}`}>
                  {Math.abs(s.difference ?? 0) < 0.01 ? "Cuadrada" : formatCurrency(s.difference ?? 0)}
                </p>
              </div>
              <span className={`text-[11px] ${Math.abs(s.difference ?? 0) < 0.01 ? "text-emerald-600" : (s.difference ?? 0) > 0 ? "text-amber-600" : "text-red-600"}`}>
                {diffStatus.label}
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment Methods Breakdown */}
      {methodBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Desglose por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {methodBreakdown.map(([method, total]) => {
                const Icon = METHOD_ICONS[method] || DollarSign;
                return (
                  <div key={method} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method}</p>
                      <p className="text-sm font-bold">{formatCurrency(total)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movements by Category - Collapsible */}
      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Movimientos del Día
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Accordion type="multiple" defaultValue={["ventas"]} className="w-full">
              {(Object.entries(grouped) as [MovementCategory, GroupedPayment[]][])
                .filter(([, items]) => items.length > 0)
                .map(([cat, items]) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const totals = categoryTotals[cat];
                  const CatIcon = cfg.icon;
                  return (
                    <AccordionItem key={cat} value={cat}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-1.5 rounded-md ${cfg.bgColor}`}>
                            <CatIcon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <span className="font-medium text-sm">{cfg.label}</span>
                          <Badge variant="secondary" className="ml-auto mr-4 text-xs">
                            {totals.count} mov.
                            {totals.income > 0 && <span className="text-emerald-600 ml-1.5">+{formatCurrency(totals.income)}</span>}
                            {totals.expense > 0 && <span className="text-red-600 ml-1.5">-{formatCurrency(totals.expense)}</span>}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[60px]">Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((m) => {
                                const MIcon = METHOD_ICONS[m.method] || DollarSign;
                                return (
                                  <TableRow key={m.id}>
                                    <TableCell className="text-xs text-muted-foreground">{m.time}</TableCell>
                                    <TableCell className="text-sm">{m.description}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs font-mono">{m.reference}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{m.client || "—"}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <MIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                        {m.method}
                                      </div>
                                    </TableCell>
                                    <TableCell className={`text-right font-medium text-sm ${m.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                                      {m.type === "income" ? "+" : "-"}{formatCurrency(m.amount)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Closing Notes & Timestamps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Horarios de la Sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Apertura</span>
              <span className="font-medium">{format(new Date(s.opened_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cierre</span>
              <span className="font-medium">
                {s.closed_at ? format(new Date(s.closed_at), "dd/MM/yyyy HH:mm:ss", { locale: es }) : "—"}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duración total</span>
              <span className="font-medium">{hours} horas {mins} minutos</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cajero apertura</span>
              <span className="font-medium">{s.opened_by?.name || s.user?.name || `Usuario #${s.user_id || "—"}`}</span>
            </div>
            {s.closed_by && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cajero cierre</span>
                  <span className="font-medium">{s.closed_by.name}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notas y Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {s.notes || s.closing_notes ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{s.closing_notes || s.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No se registraron notas al cierre.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
