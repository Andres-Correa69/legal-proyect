import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { salesApi, electronicInvoicingApi, type Sale, type SaleItem, type SaleType, type SalePaymentStatus, type SendInvoiceResponse } from "@/lib/api";
import type { SharedData } from "@/types";
import { InvoicesCalendar } from "@/components/sales/invoices-calendar";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  FileText,
  Eye,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  MoreVertical,
  Download,
  Mail,
  Smartphone,
  Trash2,
  Send,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { format, startOfDay, isAfter, isBefore, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const TYPE_LABELS: Record<SaleType, { label: string; color: string }> = {
  pos: { label: "Factura POS", color: "bg-green-500/15 text-green-700 border-green-500/20 hover:bg-green-500/15" },
  electronic: { label: "Factura Electrónica", color: "bg-blue-500/15 text-blue-700 border-blue-500/20 hover:bg-blue-500/15" },
  account: { label: "Cuenta de Cobro", color: "bg-purple-500/15 text-purple-700 border-purple-500/20 hover:bg-purple-500/15" },
  credit: { label: "Crédito", color: "bg-orange-500/15 text-orange-700 border-orange-500/20 hover:bg-orange-500/15" },
};

const PAYMENT_STATUS_LABELS: Record<SalePaymentStatus, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/15 text-amber-700 border-amber-500/20 hover:bg-amber-500/15" },
  partial: { label: "Parcial", color: "bg-cyan-500/15 text-cyan-700 border-cyan-500/20 hover:bg-cyan-500/15" },
  paid: { label: "Pagada", color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/15" },
};

type TabValue = "todas" | "electronic" | "pos" | "account" | "credit" | "calendario";
type DateFilterValue = "all" | "hoy" | "ayer" | "7dias" | "30dias" | "estemes" | "personalizado";

export default function SalesIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("todas");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // DIAN Electronic Invoicing states
  const [hasElectronicInvoicingToken, setHasElectronicInvoicingToken] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [showDianDialog, setShowDianDialog] = useState(false);
  const [dianResult, setDianResult] = useState<SendInvoiceResponse | null>(null);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      // Type filter is handled by tabs, so we don't send it here unless on "todas"
      if (activeTab !== "todas" && activeTab !== "calendario") {
        params.type = activeTab;
      }
      if (paymentStatusFilter !== "all") params.payment_status = paymentStatusFilter;

      // Date filter
      const today = startOfDay(new Date());
      if (dateFilter === "hoy") {
        params.date_from = format(today, "yyyy-MM-dd");
        params.date_to = format(today, "yyyy-MM-dd");
      } else if (dateFilter === "ayer") {
        const yesterday = subDays(today, 1);
        params.date_from = format(yesterday, "yyyy-MM-dd");
        params.date_to = format(yesterday, "yyyy-MM-dd");
      } else if (dateFilter === "7dias") {
        params.date_from = format(subDays(today, 7), "yyyy-MM-dd");
        params.date_to = format(today, "yyyy-MM-dd");
      } else if (dateFilter === "30dias") {
        params.date_from = format(subDays(today, 30), "yyyy-MM-dd");
        params.date_to = format(today, "yyyy-MM-dd");
      } else if (dateFilter === "estemes") {
        params.date_from = format(startOfMonth(today), "yyyy-MM-dd");
        params.date_to = format(endOfMonth(today), "yyyy-MM-dd");
      } else if (dateFilter === "personalizado") {
        if (customDateFrom) params.date_from = customDateFrom;
        if (customDateTo) params.date_to = customDateTo;
      }

      const data = await salesApi.getAll(params);
      setSales(data);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [activeTab, paymentStatusFilter, dateFilter, customDateFrom, customDateTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Check electronic invoicing status on mount
  useEffect(() => {
    const checkElectronicInvoicingStatus = async () => {
      try {
        const status = await electronicInvoicingApi.getStatus();
        setHasElectronicInvoicingToken(status.has_token);
      } catch (error) {
        console.error("Error checking electronic invoicing status:", error);
      }
    };
    checkElectronicInvoicingStatus();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const today = startOfDay(new Date());

    // Filter non-cancelled sales
    const activeSales = sales.filter(s => s.status !== 'cancelled');

    // This month's sales
    const thisMonthSales = activeSales.filter(sale => {
      const saleDate = new Date(sale.invoice_date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    // Pending amount (pending + partial)
    const pendingSales = activeSales.filter(s => s.payment_status === "pending" || s.payment_status === "partial");
    const totalPending = pendingSales.reduce((sum, s) => sum + Number(s.balance || 0), 0);

    // Overdue amount (pending/partial with due_date in the past)
    const overdueSales = activeSales.filter(s => {
      if (!s.due_date) return false;
      if (s.payment_status === "paid") return false;
      const dueDate = startOfDay(new Date(s.due_date));
      return isBefore(dueDate, today);
    });
    const totalOverdue = overdueSales.reduce((sum, s) => sum + Number(s.balance || 0), 0);

    // Paid this month
    const totalPaidThisMonth = thisMonthSales.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);

    return {
      pending: totalPending,
      pendingCount: pendingSales.length,
      overdue: totalOverdue,
      overdueCount: overdueSales.length,
      paidThisMonth: totalPaidThisMonth,
    };
  }, [sales]);

  const handleViewSale = (sale: Sale) => {
    if (sale.status === 'draft') {
      router.visit(`/admin/sell?draft=${sale.id}`);
    } else {
      router.visit(`/admin/sales/${sale.id}`);
    }
  };

  const handleDeleteDraft = async (saleId: number) => {
    try {
      await salesApi.deleteDraft(saleId);
      toast({ title: "Borrador eliminado", description: "El borrador se eliminó correctamente" });
      fetchSales();
    } catch (error: any) {
      console.error("Error deleting draft:", error);
      toast({ variant: "destructive", title: "Error al eliminar borrador", description: error.message || "Por favor intente nuevamente" });
    }
  };

  const handleDownloadPdf = async (saleId: number) => {
    try {
      const url = await salesApi.getPdfUrl(saleId, true);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const handleCancelSale = async (saleId: number) => {
    if (!confirm("¿Está seguro de que desea anular esta factura? Esta acción no se puede deshacer.")) {
      return;
    }
    try {
      await salesApi.cancel(saleId);
      fetchSales();
    } catch (error) {
      console.error("Error cancelling sale:", error);
    }
  };

  // Open DIAN dialog for sending invoice
  const handleSendToDian = (sale: Sale) => {
    setSelectedInvoice(sale);
    setDianResult(null);
    setShowDianDialog(true);
  };

  // Confirm and send invoice to DIAN
  const confirmSendToDian = async () => {
    if (!selectedInvoice) return;

    setSendingInvoice(true);
    try {
      // Build the invoice data from the sale
      const invoiceData = {
        number: parseInt(selectedInvoice.invoice_number.replace(/\D/g, '')) || 1,
        sync: true,
        type_document_id: 1, // Factura de venta nacional
        resolution_id: 1, // Default resolution
        customer: {
          identification_number: selectedInvoice.client?.document_id || '',
          name: selectedInvoice.client?.name || '',
          address: selectedInvoice.client?.address || '',
          email: selectedInvoice.client?.email || '',
          phone: selectedInvoice.client?.phone || '',
        },
        date: format(new Date(selectedInvoice.invoice_date), 'yyyy-MM-dd'),
        invoice_lines: selectedInvoice.items?.map((item: SaleItem, index: number) => ({
          unit_measure_id: 70, // Unidad
          invoiced_quantity: String(item.quantity || 1),
          line_extension_amount: String(Number(item.subtotal || 0).toFixed(2)),
          free_of_charge_indicator: false,
          description: item.description || item.product?.name || `Producto ${index + 1}`,
          code: item.product?.sku || String(index + 1),
          type_item_identification_id: 4, // Estándar adopción contribuyente
          price_amount: String(Number(item.unit_price || 0).toFixed(2)),
          base_quantity: String(item.quantity || 1),
          tax_totals: item.tax_amount && Number(item.tax_amount) > 0 ? [{
            tax_id: 1, // IVA
            tax_amount: String(Number(item.tax_amount || 0).toFixed(2)),
            taxable_amount: String(Number(item.subtotal || 0).toFixed(2)),
            percent: String(Number(item.tax_rate || 19).toFixed(2)),
          }] : [],
        })) || [],
        legal_monetary_totals: {
          line_extension_amount: String(Number(selectedInvoice.subtotal || 0).toFixed(2)),
          tax_exclusive_amount: String(Number(selectedInvoice.subtotal || 0).toFixed(2)),
          tax_inclusive_amount: String(Number(selectedInvoice.total_amount || 0).toFixed(2)),
          allowance_total_amount: String(Number(selectedInvoice.discount_amount || 0).toFixed(2)),
          charge_total_amount: "0.00",
          payable_amount: String(Number(selectedInvoice.total_amount || 0).toFixed(2)),
        },
      };

      const result = await electronicInvoicingApi.sendInvoice(invoiceData);
      setDianResult(result);

      if (result.success && result.is_valid) {
        toast({
          title: "Factura enviada exitosamente",
          description: `CUFE: ${result.data?.uuid || 'N/A'}`,
        });
        fetchSales(); // Refresh to show updated status
      } else {
        toast({
          title: "Error al enviar factura",
          description: result.message || result.errors_messages?.join(', ') || "Error desconocido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error sending invoice to DIAN:", error);
      toast({
        title: "Error al enviar factura",
        description: error.message || "No se pudo conectar con el servicio DIAN",
        variant: "destructive",
      });
    } finally {
      setSendingInvoice(false);
    }
  };

  // Filter sales based on current tab (for display)
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      if (activeTab === "todas" || activeTab === "calendario") return true;
      return sale.type === activeTab;
    });
  }, [sales, activeTab]);

  const handleExportPdf = useCallback(async () => {
    if (filteredSales.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay facturas para exportar." });
      return;
    }
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Construyendo reporte de ventas." });

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // ─── Colors ───
      const indigo = [79, 70, 229] as const;
      const gray100 = [243, 244, 246] as const;
      const gray500 = [107, 114, 128] as const;
      const gray800 = [31, 41, 55] as const;
      const green600 = [5, 150, 105] as const;
      const red600 = [220, 38, 38] as const;
      const amber600 = [217, 119, 6] as const;
      const blue600 = [36, 99, 235] as const;

      // ─── Footer helper ───
      const addFooters = () => {
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          const footerY = pageH - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageW - margin, footerY);
          pdf.setFontSize(7);
          pdf.setTextColor(...gray500);
          pdf.text('LEGAL SISTEMA — Sistema de Gestión', pageW / 2, footerY + 4, { align: 'center' });
          pdf.setFontSize(6);
          pdf.setTextColor(176, 181, 191);
          pdf.text('Desarrollado por Legal Sistema · www.legalsistema.co', pageW / 2, footerY + 7, { align: 'center' });
          pdf.setFontSize(6);
          pdf.setTextColor(209, 213, 219);
          pdf.text(
            `Generado el ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} ${new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })} — Página ${i} de ${totalPages}`,
            pageW / 2, footerY + 10, { align: 'center' }
          );
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);

      // ─── Header ───
      const logoH = addLogoToPdf(pdf, logoDataUrl, margin, y, 12, 40);
      y += logoH;
      pdf.setFontSize(18);
      pdf.setTextColor(...gray800);
      pdf.setFont('helvetica', 'bold');
      pdf.text('LEGAL SISTEMA', margin, y + 6);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...gray500);
      pdf.text('Sistema de Gestión', margin, y + 11);

      // Right side
      pdf.setFillColor(238, 242, 255);
      pdf.roundedRect(pageW - margin - 60, y - 2, 60, 8, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(...indigo);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORTE DE VENTAS', pageW - margin - 30, y + 3, { align: 'center' });
      pdf.setFontSize(14);
      pdf.text('Facturas', pageW - margin, y + 12, { align: 'right' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...gray500);
      const tabLabel = activeTab === 'todas' ? 'Todas' : TYPE_LABELS[activeTab as SaleType]?.label || activeTab;
      pdf.text(`Filtro: ${tabLabel} · ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}`, pageW - margin, y + 17, { align: 'right' });

      y += 20;
      pdf.setDrawColor(...indigo);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // ─── Summary Cards ───
      const activeSales = filteredSales.filter(s => s.status !== 'cancelled');
      const totalVentas = activeSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalPagado = activeSales.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
      const totalPendiente = activeSales.filter(s => s.payment_status !== 'paid').reduce((sum, s) => sum + Number(s.balance || 0), 0);
      const totalVencido = activeSales.filter(s => {
        if (!s.due_date || s.payment_status === 'paid') return false;
        return new Date(s.due_date) < new Date();
      }).reduce((sum, s) => sum + Number(s.balance || 0), 0);

      const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

      const cards = [
        { label: 'Total Ventas', value: fmt(totalVentas), count: `${activeSales.length} facturas`, bg: [236, 253, 245], border: [167, 243, 208], color: green600 },
        { label: 'Total Pagado', value: fmt(totalPagado), count: `${activeSales.filter(s => s.payment_status === 'paid').length} pagadas`, bg: [238, 242, 255], border: [199, 210, 254], color: blue600 },
        { label: 'Por Cobrar', value: fmt(totalPendiente), count: `${activeSales.filter(s => s.payment_status !== 'paid').length} pendientes`, bg: [255, 251, 235], border: [253, 230, 138], color: amber600 },
        { label: 'Vencido', value: fmt(totalVencido), count: '', bg: [254, 242, 242], border: [254, 202, 202], color: red600 },
      ];

      const cardW = (pageW - margin * 2 - 12) / 4;
      cards.forEach((card, i) => {
        const cx = margin + i * (cardW + 4);
        pdf.setFillColor(...(card.bg as [number, number, number]));
        pdf.setDrawColor(...(card.border as [number, number, number]));
        pdf.roundedRect(cx, y, cardW, 20, 2, 2, 'FD');
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...gray500);
        pdf.text(card.label.toUpperCase(), cx + cardW / 2, y + 6, { align: 'center' });
        pdf.setFontSize(12);
        pdf.setTextColor(...(card.color as [number, number, number]));
        pdf.text(card.value, cx + cardW / 2, y + 13, { align: 'center' });
        if (card.count) {
          pdf.setFontSize(6);
          pdf.setTextColor(...gray500);
          pdf.text(card.count, cx + cardW / 2, y + 17, { align: 'center' });
        }
      });
      y += 28;

      // ─── Table ───
      pdf.setFillColor(...indigo);
      pdf.roundedRect(margin, y, pageW - margin * 2, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Detalle de Facturas (${filteredSales.length})`, margin + 4, y + 5);
      y += 10;

      const typeLabel = (t: SaleType) => TYPE_LABELS[t]?.label || t;
      const statusLabel = (s: SalePaymentStatus) => PAYMENT_STATUS_LABELS[s]?.label || s;

      const tableData = filteredSales.map(sale => [
        sale.invoice_number,
        typeLabel(sale.type),
        sale.client?.name || '-',
        sale.client?.document_id || '-',
        format(new Date(sale.invoice_date), 'dd/MM/yyyy'),
        sale.due_date ? format(new Date(sale.due_date), 'dd/MM/yyyy') : '-',
        fmt(Number(sale.total_amount)),
        fmt(Number(sale.paid_amount)),
        fmt(Number(sale.balance)),
        sale.status === 'cancelled' ? 'Anulada' : sale.status === 'draft' ? 'Borrador' : statusLabel(sale.payment_status),
      ]);

      autoTable(pdf, {
        startY: y,
        head: [['No. Factura', 'Tipo', 'Cliente', 'Documento', 'Fecha', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 2.5, textColor: [55, 65, 81] },
        headStyles: { fillColor: [...gray100], textColor: [...gray800], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 18 },
          2: { cellWidth: 28 },
          3: { cellWidth: 18 },
          4: { cellWidth: 16 },
          5: { cellWidth: 16 },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right' },
          8: { cellWidth: 18, halign: 'right' },
          9: { cellWidth: 14, halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 9) {
            const val = data.cell.raw as string;
            if (val === 'Pagada') data.cell.styles.textColor = [...green600];
            else if (val === 'Pendiente') data.cell.styles.textColor = [...red600];
            else if (val === 'Parcial') data.cell.styles.textColor = [...amber600];
            else if (val === 'Anulada') data.cell.styles.textColor = [156, 163, 175];
          }
          if (data.section === 'body' && data.column.index === 8) {
            const sale = filteredSales[data.row.index];
            if (sale && Number(sale.balance) > 0) data.cell.styles.textColor = [...red600];
          }
        },
      });

      // ─── Totals summary at the end ───
      const finalY = (pdf as any).lastAutoTable?.finalY || y + 20;
      let ty = finalY + 6;

      if (ty + 30 > pageH - 20) {
        pdf.addPage();
        ty = margin;
      }

      pdf.setFillColor(...indigo);
      pdf.roundedRect(pageW - margin - 80, ty, 80, 7, 1, 1, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Resumen de Totales', pageW - margin - 40, ty + 5, { align: 'center' });
      ty += 10;

      const totals = [
        { label: 'Total Ventas:', value: fmt(totalVentas), color: gray800 },
        { label: 'Total Pagado:', value: fmt(totalPagado), color: green600 },
        { label: 'Total Pendiente:', value: fmt(totalPendiente), color: amber600 },
        { label: 'Total Vencido:', value: fmt(totalVencido), color: red600 },
      ];

      totals.forEach(t => {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...gray500);
        pdf.text(t.label, pageW - margin - 78, ty);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...(t.color as [number, number, number]));
        pdf.text(t.value, pageW - margin - 2, ty, { align: 'right' });
        ty += 6;
      });

      addFooters();
      pdf.save(`Reporte_Ventas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: "PDF generado", description: "El reporte se descargó correctamente." });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    } finally {
      setExporting(false);
    }
  }, [filteredSales, activeTab, toast]);

  const handleExportExcel = useCallback(async () => {
    if (filteredSales.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay facturas para exportar." });
      return;
    }
    try {
      setExporting(true);
      const XLSX = await import('xlsx');

      const typeLabel = (t: SaleType) => TYPE_LABELS[t]?.label || t;
      const statusLabel = (s: SalePaymentStatus) => PAYMENT_STATUS_LABELS[s]?.label || s;

      const data = filteredSales.map(sale => ({
        'No. Factura': sale.invoice_number,
        'Tipo': typeLabel(sale.type),
        'Cliente': sale.client?.name || '-',
        'Documento': sale.client?.document_id || '-',
        'Fecha': format(new Date(sale.invoice_date), 'dd/MM/yyyy'),
        'Vencimiento': sale.due_date ? format(new Date(sale.due_date), 'dd/MM/yyyy') : '-',
        'Total': Number(sale.total_amount),
        'Pagado': Number(sale.paid_amount),
        'Saldo': Number(sale.balance),
        'Estado': sale.status === 'cancelled' ? 'Anulada' : sale.status === 'draft' ? 'Borrador' : statusLabel(sale.payment_status),
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Format currency columns
      const currencyCols = [6, 7, 8]; // Total, Pagado, Saldo (0-indexed)
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (const C of currencyCols) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr]) ws[addr].z = '#,##0';
        }
      }

      // Set column widths
      ws['!cols'] = [
        { wch: 16 }, { wch: 20 }, { wch: 30 }, { wch: 16 },
        { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
        { wch: 16 }, { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
      XLSX.writeFile(wb, `Reporte_Ventas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: "Excel generado", description: "El reporte se descargó correctamente." });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el Excel." });
    } finally {
      setExporting(false);
    }
  }, [filteredSales, toast]);

  return (
    <AppLayout title="Facturas de Ventas">
      <Head title="Facturas de Ventas" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header - Compact */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <FileText className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Facturas</h1>
                  <p className="text-sm text-muted-foreground">Gestiona facturas, cuentas de cobro y créditos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={exporting || loading || filteredSales.length === 0}
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={exporting || loading || filteredSales.length === 0}
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                  Excel
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Por Cobrar */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-500/15 p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Por Cobrar</h3>
                    </div>
                    {stats.pendingCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {stats.pendingCount} {stats.pendingCount === 1 ? 'factura' : 'facturas'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.pending)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pendientes y parciales</p>
                </div>
              </Card>

              {/* Vencidos */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-500/15 p-2 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Vencidos</h3>
                    </div>
                    {stats.overdueCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stats.overdueCount} {stats.overdueCount === 1 ? 'factura' : 'facturas'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
                </div>
              </Card>

              {/* Pagado Este Mes */}
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-500/15 p-2 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Pagado Este Mes</h3>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paidThisMonth)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ingresos recibidos</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <Card className="shadow-xl border border-border p-4 sm:p-6">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-6">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
                <TabsTrigger value="todas" className="text-xs sm:text-sm">
                  Todas
                </TabsTrigger>
                <TabsTrigger value="electronic" className="text-xs sm:text-sm">
                  Electrónicas
                </TabsTrigger>
                <TabsTrigger value="pos" className="text-xs sm:text-sm">
                  POS
                </TabsTrigger>
                <TabsTrigger value="account" className="text-xs sm:text-sm">
                  Cuentas de Cobro
                </TabsTrigger>
                <TabsTrigger value="credit" className="text-xs sm:text-sm">
                  Créditos
                </TabsTrigger>
                <TabsTrigger value="calendario" className="text-xs sm:text-sm">
                  <CalendarIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Calendario</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendario" className="mt-6">
                <InvoicesCalendar
                  sales={sales}
                  onViewSale={handleViewSale}
                  onDownloadPdf={handleDownloadPdf}
                />
              </TabsContent>
            </Tabs>

            {/* Search and Filters - Only show for non-calendar tabs */}
            {activeTab !== "calendario" && (
              <>
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por número, cliente o documento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="paid">Pagada</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="partial">Parcial</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterValue)}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Fecha" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Todas las fechas</SelectItem>
                        <SelectItem value="hoy">Hoy</SelectItem>
                        <SelectItem value="ayer">Ayer</SelectItem>
                        <SelectItem value="7dias">7 Días Anteriores</SelectItem>
                        <SelectItem value="30dias">30 Días Anteriores</SelectItem>
                        <SelectItem value="estemes">Este Mes</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>

                    {dateFilter === "personalizado" && (
                      <>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-10 w-full sm:w-[180px] justify-start text-left font-normal text-sm", !customDateFrom && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {customDateFrom ? new Date(customDateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Desde"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport
                              selected={customDateFrom ? new Date(customDateFrom + 'T12:00:00') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, '0');
                                  const d = String(date.getDate()).padStart(2, '0');
                                  setCustomDateFrom(`${y}-${m}-${d}`);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-10 w-full sm:w-[180px] justify-start text-left font-normal text-sm", !customDateTo && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {customDateTo ? new Date(customDateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Hasta"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport
                              selected={customDateTo ? new Date(customDateTo + 'T12:00:00') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const y = date.getFullYear();
                                  const m = String(date.getMonth() + 1).padStart(2, '0');
                                  const d = String(date.getDate()).padStart(2, '0');
                                  setCustomDateTo(`${y}-${m}-${d}`);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </>
                    )}

                    <Button
                      onClick={() => router.visit("/admin/sell")}
                      className="h-10 rounded-md px-3 gap-2 bg-[#2463eb] hover:bg-[#2463eb]/90 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      Crear Factura
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12 gap-2">
                    <Spinner size="md" />
                    <span className="text-muted-foreground">Cargando facturas...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Mostrando <span className="font-semibold">{filteredSales.length}</span> de{" "}
                      <span className="font-semibold">{sales.length}</span> facturas.
                    </p>

                    {/* Invoice Cards */}
                    <div className="space-y-3">
                      {filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No se encontraron facturas</p>
                        </div>
                      ) : (
                        filteredSales.map((sale) => (
                          <div
                            key={sale.id}
                            className={cn(
                              "border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md",
                              sale.status === 'cancelled' && "opacity-60"
                            )}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                              {/* Mobile Layout - Top Section */}
                              <div className="flex items-start justify-between w-full sm:hidden gap-3">
                                {/* Invoice Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <Badge className={`${TYPE_LABELS[sale.type].color} border`}>
                                      {TYPE_LABELS[sale.type].label}
                                    </Badge>
                                    {sale.status === 'draft' ? (
                                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border">Borrador</Badge>
                                    ) : (
                                      <Badge className={`${PAYMENT_STATUS_LABELS[sale.payment_status].color} border`}>
                                        {PAYMENT_STATUS_LABELS[sale.payment_status].label}
                                      </Badge>
                                    )}
                                    {sale.status === 'cancelled' && (
                                      <Badge variant="destructive">Anulada</Badge>
                                    )}
                                  </div>
                                  <p className="font-bold text-lg text-foreground">{sale.invoice_number}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {sale.client?.name || '-'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {sale.client?.document_id || sale.client?.email}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewSale(sale)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuItem
                                        className="gap-2 cursor-pointer"
                                        onClick={() => handleViewSale(sale)}
                                      >
                                        <Eye className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Ver</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2 cursor-pointer"
                                        onClick={() => handleDownloadPdf(sale.id)}
                                      >
                                        <Download className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Descargar PDF</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 cursor-pointer">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Enviar Email</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 cursor-pointer">
                                        <Smartphone className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Enviar WhatsApp</span>
                                      </DropdownMenuItem>
                                      {(sale.payment_status === "pending" || sale.payment_status === "partial") && sale.status !== 'cancelled' && (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={() => router.visit('/admin/payments')}
                                        >
                                          <DollarSign className="h-4 w-4 text-emerald-600" />
                                          <span className="text-emerald-600">Registrar Pago</span>
                                        </DropdownMenuItem>
                                      )}
                                      {sale.status !== 'cancelled' && sale.status !== 'draft' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="gap-2 cursor-pointer"
                                            onClick={() => router.visit(`/admin/sales/${sale.id}?action=debit`)}
                                          >
                                            <Plus className="h-4 w-4 text-amber-600" />
                                            <span className="text-amber-600">Nota Débito</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="gap-2 cursor-pointer"
                                            onClick={() => router.visit(`/admin/sales/${sale.id}?action=credit`)}
                                          >
                                            <Minus className="h-4 w-4 text-orange-600" />
                                            <span className="text-orange-600">Nota Crédito</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {sale.status === 'draft' ? (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => handleDeleteDraft(sale.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Eliminar borrador</span>
                                        </DropdownMenuItem>
                                      ) : sale.status !== 'cancelled' && (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => handleCancelSale(sale.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Anular</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {/* Mobile Layout - Bottom Section */}
                              <div className="flex items-center justify-between w-full sm:hidden pt-2 border-t">
                                <div className="text-left">
                                  <p className="text-xs text-muted-foreground">Fecha</p>
                                  <p className="text-sm font-medium">
                                    {format(new Date(sale.invoice_date), "dd/MM/yyyy", { locale: es })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Total</p>
                                  <p className="text-lg font-bold text-[#2463eb]">{formatCurrency(Number(sale.total_amount))}</p>
                                  {sale.payment_status === "partial" && (
                                    <p className="text-xs text-amber-600">
                                      Pagado: {formatCurrency(Number(sale.paid_amount))}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Desktop Layout */}
                              <div className="hidden sm:flex items-center gap-4 flex-1">
                                <div className="flex flex-col gap-1 min-w-[180px]">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`${TYPE_LABELS[sale.type].color} border`}>
                                      {TYPE_LABELS[sale.type].label}
                                    </Badge>
                                    {sale.status === 'draft' && (
                                      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20 border">Borrador</Badge>
                                    )}
                                  </div>
                                  <p className="font-bold text-foreground">{sale.invoice_number}</p>
                                </div>

                                <div className="flex-1 min-w-[200px]">
                                  <p className="font-medium text-foreground">{sale.client?.name || '-'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {sale.client?.document_id || sale.client?.email}
                                  </p>
                                </div>

                                <div className="min-w-[100px]">
                                  <p className="text-sm text-muted-foreground">Fecha</p>
                                  <p className="font-medium">
                                    {format(new Date(sale.invoice_date), "dd/MM/yyyy", { locale: es })}
                                  </p>
                                </div>

                                <div className="min-w-[120px] text-right">
                                  <p className="text-lg font-bold text-[#2463eb]">{formatCurrency(Number(sale.total_amount))}</p>
                                  {sale.payment_status === "partial" && (
                                    <p className="text-xs text-amber-600">
                                      Pagado: {formatCurrency(Number(sale.paid_amount))}
                                    </p>
                                  )}
                                </div>

                                <Badge className={cn(
                                  `${PAYMENT_STATUS_LABELS[sale.payment_status].color} border min-w-[90px] justify-center`,
                                  sale.status === 'cancelled' && "bg-muted text-foreground border-border",
                                  sale.status === 'draft' && "bg-amber-500/15 text-amber-700 border-amber-500/20"
                                )}>
                                  {sale.status === 'cancelled' ? 'Anulada' : sale.status === 'draft' ? 'Borrador' : PAYMENT_STATUS_LABELS[sale.payment_status].label}
                                </Badge>

                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewSale(sale)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      <DropdownMenuItem
                                        className="gap-2 cursor-pointer"
                                        onClick={() => handleViewSale(sale)}
                                      >
                                        <Eye className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Ver</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2 cursor-pointer"
                                        onClick={() => handleDownloadPdf(sale.id)}
                                      >
                                        <Download className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Descargar PDF</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 cursor-pointer">
                                        <Mail className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Enviar Email</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2 cursor-pointer">
                                        <Smartphone className="h-4 w-4 text-blue-600" />
                                        <span className="text-blue-600">Enviar WhatsApp</span>
                                      </DropdownMenuItem>
                                      {(sale.payment_status === "pending" || sale.payment_status === "partial") && sale.status !== 'cancelled' && (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer"
                                          onClick={() => router.visit('/admin/payments')}
                                        >
                                          <DollarSign className="h-4 w-4 text-emerald-600" />
                                          <span className="text-emerald-600">Registrar Pago</span>
                                        </DropdownMenuItem>
                                      )}
                                      {sale.status !== 'cancelled' && sale.status !== 'draft' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="gap-2 cursor-pointer"
                                            onClick={() => router.visit(`/admin/sales/${sale.id}?action=debit`)}
                                          >
                                            <Plus className="h-4 w-4 text-amber-600" />
                                            <span className="text-amber-600">Nota Débito</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="gap-2 cursor-pointer"
                                            onClick={() => router.visit(`/admin/sales/${sale.id}?action=credit`)}
                                          >
                                            <Minus className="h-4 w-4 text-orange-600" />
                                            <span className="text-orange-600">Nota Crédito</span>
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      {sale.status === 'draft' ? (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => handleDeleteDraft(sale.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Eliminar borrador</span>
                                        </DropdownMenuItem>
                                      ) : sale.status !== 'cancelled' && (
                                        <DropdownMenuItem
                                          className="gap-2 cursor-pointer text-destructive"
                                          onClick={() => handleCancelSale(sale.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          <span>Anular</span>
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog for DIAN Invoice Submission */}
      <Dialog open={showDianDialog} onOpenChange={setShowDianDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-indigo-600" />
              Enviar Factura a DIAN
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && !dianResult && (
                <>
                  ¿Desea enviar la factura <strong>{selectedInvoice.invoice_number}</strong> a la DIAN?
                  <br />
                  <span className="text-sm text-muted-foreground">
                    Cliente: {selectedInvoice.client?.name || 'N/A'}
                    <br />
                    Total: {formatCurrency(Number(selectedInvoice.total_amount))}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {dianResult && (
            <div className="py-4">
              {dianResult.success && dianResult.is_valid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Factura enviada exitosamente</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-2 text-sm">
                    {dianResult.data?.uuid && (
                      <p><strong>CUFE:</strong> <span className="font-mono text-xs break-all">{dianResult.data.uuid}</span></p>
                    )}
                    {dianResult.data?.number && (
                      <p><strong>Número:</strong> {dianResult.data.number}</p>
                    )}
                    {dianResult.data?.issue_date && (
                      <p><strong>Fecha emisión:</strong> {dianResult.data.issue_date}</p>
                    )}
                    {dianResult.data?.qr_link && (
                      <p>
                        <a
                          href={dianResult.data.qr_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          Ver en portal DIAN →
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Error al enviar la factura</span>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-700">
                    {dianResult.message && <p>{dianResult.message}</p>}
                    {dianResult.errors_messages && dianResult.errors_messages.length > 0 && (
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {dianResult.errors_messages.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!dianResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDianDialog(false)}
                  disabled={sendingInvoice}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmSendToDian}
                  disabled={sendingInvoice}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {sendingInvoice ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar a DIAN
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowDianDialog(false)}>
                Cerrar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
