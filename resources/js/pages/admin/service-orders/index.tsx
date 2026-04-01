import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatCurrency } from "@/lib/utils";
import { serviceOrdersApi } from "@/lib/api";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import type { ServiceOrder, SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench,
  Zap,
  Search,
  Plus,
  Eye,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  CalendarIcon,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ServiceOrderStatus = ServiceOrder["status"];
type ServiceOrderPriority = ServiceOrder["priority"];
type ServiceOrderType = ServiceOrder["type"];

const STATUS_CONFIG: Record<ServiceOrderStatus, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500 text-white" },
  in_progress: { label: "En Progreso", color: "bg-blue-500 text-white" },
  on_hold: { label: "En Espera", color: "bg-orange-500 text-white" },
  completed: { label: "Completada", color: "bg-emerald-500 text-white" },
  cancelled: { label: "Cancelada", color: "bg-red-500 text-white" },
  invoiced: { label: "Facturada", color: "bg-purple-600 text-white" },
};

const PRIORITY_CONFIG: Record<ServiceOrderPriority, { label: string; color: string }> = {
  low: { label: "Baja", color: "bg-slate-500 text-white" },
  normal: { label: "Normal", color: "bg-blue-500 text-white" },
  high: { label: "Alta", color: "bg-amber-500 text-white" },
  urgent: { label: "Urgente", color: "bg-red-500 text-white" },
};

const TYPE_CONFIG: Record<ServiceOrderType, { label: string }> = {
  repair: { label: "Reparacion" },
  maintenance: { label: "Mantenimiento" },
  installation: { label: "Instalacion" },
  inspection: { label: "Inspeccion" },
  custom: { label: "Personalizado" },
};

export default function ServiceOrdersIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("service-orders.view", user);
  const canCreate = hasPermission("service-orders.create", user);
  const { toast } = useToast();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (typeFilter !== "all") params.type = typeFilter;
      const today = new Date();
      if (dateFilter === "hoy") { params.date_from = format(today, "yyyy-MM-dd"); params.date_to = format(today, "yyyy-MM-dd"); }
      else if (dateFilter === "7dias") { params.date_from = format(new Date(today.getTime() - 7 * 86400000), "yyyy-MM-dd"); params.date_to = format(today, "yyyy-MM-dd"); }
      else if (dateFilter === "30dias") { params.date_from = format(new Date(today.getTime() - 30 * 86400000), "yyyy-MM-dd"); params.date_to = format(today, "yyyy-MM-dd"); }
      else if (dateFilter === "personalizado") { if (customDateFrom) params.date_from = customDateFrom; if (customDateTo) params.date_to = customDateTo; }

      const response = await serviceOrdersApi.getAll(params);
      setOrders(response.data ?? []);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las ordenes", variant: "destructive" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, typeFilter, dateFilter, customDateFrom, customDateTo]);

  useEffect(() => { if (canView) fetchOrders(); }, [fetchOrders, canView]);

  const handleRowClick = useCallback((id: number) => { router.visit(`/admin/service-orders/${id}`); }, []);

  // Stats
  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const inProgress = orders.filter((o) => o.status === "in_progress" || o.status === "on_hold").length;
    const completed = orders.filter((o) => o.status === "completed" || o.status === "invoiced").length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    return { pending, inProgress, completed, totalAmount, total: orders.length };
  }, [orders]);

  // ── Export PDF (Professional pattern matching reports) ──
  const handleExportPdf = async () => {
    if (orders.length === 0) return;
    try {
      setExporting(true);
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const company = user?.company;
      const companyName = company?.name || "Empresa";
      const companyTaxId = company?.tax_id || "";
      const companyAddress = company?.address || "";
      const generatedDate = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageW - margin * 2;

      // ── Footer on every page ──
      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const footerY = pageH - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageW - margin, footerY);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(156, 163, 175);
          pdf.text(`${companyName} — Sistema de Gestion`, pageW / 2, footerY + 4, { align: "center" });
          pdf.setTextColor(176, 181, 191);
          pdf.text("Desarrollado por Legal Sistema · www.legalsistema.co", pageW / 2, footerY + 7, { align: "center" });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Pagina ${i} de ${pages}`, pageW / 2, footerY + 10, { align: "center" });
        }
      };

      let currentY = margin;

      // ── Logo ──
      const logoDataUrl = await loadPdfLogo(company?.logo_url);
      const logoH = addLogoToPdf(pdf, logoDataUrl, margin, currentY, 12, 40);
      currentY += logoH;

      // ── Company name (left) ──
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55);
      pdf.text(companyName, margin, currentY + 5);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      let infoY = currentY + 9;
      if (companyTaxId) { pdf.text(`NIT: ${companyTaxId}`, margin, infoY); infoY += 3; }
      if (companyAddress) { pdf.text(companyAddress, margin, infoY); infoY += 3; }

      // ── Badge + title (right) ──
      const rightX = pageW - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const badgeText = "REPORTE";
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, "F");
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(79, 70, 229);
      pdf.text("Ordenes de Servicio", rightX, currentY + 9, { align: "right" });

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 13, { align: "right" });

      // ── Header line ──
      currentY += 17;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageW - margin, currentY);
      currentY += 6;

      // ── Summary Cards ──
      const cardData = [
        { label: "PENDIENTES", value: String(stats.pending), sub: "ordenes por atender", bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
        { label: "EN PROCESO", value: String(stats.inProgress), sub: "en progreso o espera", bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
        { label: "FINALIZADAS", value: String(stats.completed), sub: "completadas o facturadas", bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: "TOTAL", value: formatCurrency(stats.totalAmount), sub: `${stats.total} ordenes`, bg: [250, 245, 255], border: [221, 214, 254], color: [124, 58, 237] },
      ];
      const cardW = (contentWidth - 6) / 4;
      cardData.forEach((card, idx) => {
        const x = margin + idx * (cardW + 2);
        pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
        pdf.roundedRect(x, currentY, cardW, 16, 1.5, 1.5, "FD");
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(107, 114, 128);
        pdf.text(card.label, x + cardW / 2, currentY + 4.5, { align: "center" });
        pdf.setFontSize(11); pdf.setFont("helvetica", "bold");
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 10, { align: "center" });
        pdf.setFontSize(6); pdf.setFont("helvetica", "normal"); pdf.setTextColor(156, 163, 175);
        pdf.text(card.sub, x + cardW / 2, currentY + 13.5, { align: "center" });
      });
      currentY += 22;

      // ── Table ──
      autoTable(pdf, {
        startY: currentY,
        head: [["#", "# Orden", "Titulo", "Cliente", "Tecnico", "Estado", "Prioridad", "Tipo", "Total", "Fecha"]],
        body: orders.map((o, i) => [
          String(i + 1),
          o.order_number,
          o.title.substring(0, 40),
          o.client?.name || "-",
          o.assigned_to_user?.name || "-",
          STATUS_CONFIG[o.status]?.label || o.status,
          PRIORITY_CONFIG[o.priority]?.label || o.priority,
          TYPE_CONFIG[o.type]?.label || o.type,
          formatCurrency(o.total_amount),
          o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "-",
        ]),
        foot: [["", "", "", "", "", "", "", "TOTAL", formatCurrency(stats.totalAmount), `${stats.total} ord.`]],
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 7, cellPadding: 2 },
        footStyles: { fillColor: [238, 242, 255], textColor: [49, 46, 129], fontStyle: "bold", fontSize: 7.5 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 0: { cellWidth: 8 }, 8: { halign: "right" }, 9: { cellWidth: 22 } },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Ordenes_Servicio_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "PDF descargado", description: "El reporte se descargo correctamente." });
    } catch (err) {
      console.error("Error PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // ── Export Excel (Professional pattern matching reports) ──
  const handleExportExcel = async () => {
    if (orders.length === 0) return;
    try {
      setExporting(true);
      const XLSX = await import("xlsx");

      const company = user?.company;
      const companyName = company?.name || "Empresa";

      const rows: (string | number)[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 1;

      // Title
      rows.push([`ORDENES DE SERVICIO — ${companyName}`, "", "", "", "", "", "", "", "", ""]);
      sectionHeaderRows.push(row); row++;
      rows.push([`Generado: ${new Date().toLocaleDateString("es-CO")}`, "", "", "", "", "", "", "", "", ""]);
      row++;
      rows.push(["", "", "", "", "", "", "", "", "", ""]);
      row++;

      // Summary
      rows.push(["RESUMEN", "", "", "", "", "", "", "", "", ""]);
      sectionHeaderRows.push(row); row++;
      rows.push(["Pendientes", stats.pending, "", "En Proceso", stats.inProgress, "", "Finalizadas", stats.completed, "", ""]);
      row++;
      rows.push(["Total Ordenes", stats.total, "", "Monto Total", stats.totalAmount, "", "", "", "", ""]);
      row++;
      rows.push(["", "", "", "", "", "", "", "", "", ""]);
      row++;

      // Column headers
      rows.push(["#", "# Orden", "Titulo", "Cliente", "Tecnico", "Estado", "Prioridad", "Tipo", "Subtotal", "IVA", "Total", "Fecha"]);
      columnHeaderRows.push(row); row++;

      // Data
      orders.forEach((o, i) => {
        rows.push([
          i + 1,
          o.order_number,
          o.title,
          o.client?.name || "-",
          o.assigned_to_user?.name || "-",
          STATUS_CONFIG[o.status]?.label || o.status,
          PRIORITY_CONFIG[o.priority]?.label || o.priority,
          TYPE_CONFIG[o.type]?.label || o.type,
          Number(o.subtotal),
          Number(o.tax_amount),
          Number(o.total_amount),
          o.created_at ? format(new Date(o.created_at), "dd/MM/yyyy") : "-",
        ]);
        row++;
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Column widths
      ws["!cols"] = [{ wch: 5 }, { wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ordenes de Servicio");
      XLSX.writeFile(wb, `Ordenes_Servicio_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({ title: "Excel descargado", description: "El reporte se descargo correctamente." });
    } catch (err) {
      console.error("Error Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <AppLayout>
        <Head title="Sin permisos" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">No tienes permisos para acceder a esta pagina.</p>
        </div>
      </AppLayout>
    );
  }

  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all" || dateFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setTypeFilter("all"); setDateFilter("all"); setCustomDateFrom(""); setCustomDateTo(""); };

  return (
    <AppLayout>
      <Head title="Ordenes de Servicio" />
      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight">Ordenes de Servicio</h1>
                    <Badge className="bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20 text-[10px]">
                      <Zap className="h-3 w-3 mr-1" />
                      Superpoder
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Gestiona reparaciones, mantenimiento e instalaciones</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportPdf} disabled={exporting || loading || orders.length === 0}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportExcel} disabled={exporting || loading || orders.length === 0}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  <span className="hidden sm:inline">Excel</span>
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            {!loading && orders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card/50 border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-amber-500/15 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Pendientes</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground mt-1">ordenes por atender</p>
                  </div>
                </Card>
                <Card className="bg-card/50 border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-500/15 p-2 rounded-lg">
                        <Wrench className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">En Proceso</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground mt-1">en progreso o espera</p>
                  </div>
                </Card>
                <Card className="bg-card/50 border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-emerald-500/15 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Finalizadas</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground mt-1">completadas o facturadas</p>
                  </div>
                </Card>
                <Card className="bg-card/50 border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-purple-500/15 p-2 rounded-lg">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.total} ordenes</p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Table with filters inside */}
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <Card className="shadow-xl border border-border">
            {/* Filters inside table header */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por numero, titulo o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="on_hold">En Espera</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="invoiced">Facturada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] h-10"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px] h-10"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="repair">Reparacion</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="installation">Instalacion</SelectItem>
                  <SelectItem value="inspection">Inspeccion</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Fecha" /></SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="7dias">7 dias</SelectItem>
                  <SelectItem value="30dias">30 dias</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {dateFilter === "personalizado" && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-10 w-[155px] justify-start text-left font-normal text-sm", !customDateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {customDateFrom ? new Date(customDateFrom + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "Desde"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerReport selected={customDateFrom ? new Date(customDateFrom + "T12:00:00") : undefined} onSelect={(date) => { if (date) setCustomDateFrom(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`); }} />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-10 w-[155px] justify-start text-left font-normal text-sm", !customDateTo && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                        {customDateTo ? new Date(customDateTo + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "Hasta"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePickerReport selected={customDateTo ? new Date(customDateTo + "T12:00:00") : undefined} onSelect={(date) => { if (date) setCustomDateTo(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`); }} />
                    </PopoverContent>
                  </Popover>
                </>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" className="text-xs h-10" onClick={clearFilters}>Limpiar</Button>
              )}
              {canCreate && (
                <Button size="sm" className="gap-1.5 h-10 ml-auto" onClick={() => router.visit("/admin/service-orders/create")}>
                  <Plus className="h-4 w-4" />
                  Nueva Orden
                </Button>
              )}
            </div>

            {/* Table content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className="h-8 w-8" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ClipboardList className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No se encontraron ordenes</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {hasFilters ? "No hay ordenes que coincidan con los filtros. Intenta ajustar los criterios." : "Aun no tienes ordenes de servicio. Crea la primera para comenzar."}
                </p>
                {canCreate && !hasFilters && (
                  <Button className="mt-4 gap-2" onClick={() => router.visit("/admin/service-orders/create")}>
                    <Plus className="h-4 w-4" /> Crear Primera Orden
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-12 px-4"># Orden</TableHead>
                      <TableHead className="h-12 px-4">Titulo</TableHead>
                      <TableHead className="h-12 px-4">Cliente</TableHead>
                      <TableHead className="h-12 px-4">Tecnico</TableHead>
                      <TableHead className="h-12 px-4">Estado</TableHead>
                      <TableHead className="h-12 px-4">Prioridad</TableHead>
                      <TableHead className="h-12 px-4">Tipo</TableHead>
                      <TableHead className="h-12 px-4 text-right">Total</TableHead>
                      <TableHead className="h-12 px-4">Fecha</TableHead>
                      <TableHead className="h-12 px-4 text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(order.id)}>
                        <TableCell className="p-4 font-mono text-sm font-medium">{order.order_number}</TableCell>
                        <TableCell className="p-4 max-w-[200px] truncate">{order.title}</TableCell>
                        <TableCell className="p-4 text-sm">{order.client?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="p-4 text-sm">{order.assigned_to_user?.name ?? <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="p-4"><Badge variant="default" className={cn("text-[10px]", STATUS_CONFIG[order.status].color)}>{STATUS_CONFIG[order.status].label}</Badge></TableCell>
                        <TableCell className="p-4"><Badge variant="default" className={cn("text-[10px]", PRIORITY_CONFIG[order.priority].color)}>{PRIORITY_CONFIG[order.priority].label}</Badge></TableCell>
                        <TableCell className="p-4 text-sm text-muted-foreground">{TYPE_CONFIG[order.type].label}</TableCell>
                        <TableCell className="p-4 text-right font-medium">{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell className="p-4 text-sm text-muted-foreground">{order.created_at ? format(new Date(order.created_at), "dd MMM yyyy", { locale: es }) : "-"}</TableCell>
                        <TableCell className="p-4 text-center">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); handleRowClick(order.id); }}>
                            <Eye className="h-4 w-4" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
