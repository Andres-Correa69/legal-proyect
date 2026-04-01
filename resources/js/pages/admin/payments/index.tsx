import { Head, usePage, router } from "@inertiajs/react";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Spinner } from "@/components/ui/spinner";
import {
  paymentsApi,
  cashRegistersApi,
  paymentMethodsApi,
  type Payment,
  type CashRegister,
  type PaymentMethod,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  DollarSign, Plus, Eye, Ban, Filter, TrendingUp, TrendingDown,
  Calendar, Search, Wallet, FileText, FileSpreadsheet, Loader2,
} from "lucide-react";

type DatePreset = "all" | "today" | "yesterday" | "week" | "month" | "custom";

export default function PaymentsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('payments.view', user);
  const canCreateIncome = hasPermission('payments.create-income', user);
  const canCreateExpense = hasPermission('payments.create-expense', user);
  const canManage = hasPermission('payments.manage', user);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'income' | 'expense' | 'view'>('income');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null);
  const [exporting, setExporting] = useState(false);

  const { toast } = useToast();

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [filters, setFilters] = useState({
    type: 'all',
    cash_register_id: 'all',
    payment_method_id: 'all',
    date_from: '',
    date_to: '',
  });

  // Table search
  const [tableSearch, setTableSearch] = useState('');

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }

    // Redirect to income page if sale_id is in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const saleIdParam = urlParams.get('sale_id');
    if (saleIdParam && canCreateIncome) {
      router.visit(`/admin/payments/income?sale_id=${saleIdParam}`);
    }
  }, [canView, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  if (!canView) {
    return null;
  }

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, registersData, methodsData] = await Promise.all([
        paymentsApi.getAll({ company_id: companyFilter.companyIdParam }),
        cashRegistersApi.getAll({ company_id: companyFilter.companyIdParam }),
        paymentMethodsApi.getAll({ company_id: companyFilter.companyIdParam }),
      ]);
      setPayments(paymentsData);
      setCashRegisters(registersData.filter(r => r.is_active));
      setPaymentMethods(methodsData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];

    let newFrom = '';
    let newTo = '';

    switch (preset) {
      case 'today':
        newFrom = toStr;
        newTo = toStr;
        break;
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        newFrom = yStr;
        newTo = yStr;
        break;
      }
      case 'week': {
        const weekStart = new Date(today);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        newFrom = weekStart.toISOString().split('T')[0];
        newTo = toStr;
        break;
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        newFrom = monthStart.toISOString().split('T')[0];
        newTo = toStr;
        break;
      }
      case 'all':
        newFrom = '';
        newTo = '';
        break;
      case 'custom':
        return; // keep current values
    }

    const newFilters = { ...filters, date_from: newFrom, date_to: newTo };
    setFilters(newFilters);
    applyFiltersWithParams(newFilters);
  };

  const handleCustomDateChange = (field: 'date_from' | 'date_to', value: string) => {
    setDatePreset('custom');
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    applyFiltersWithParams(newFilters);
  };

  const applyFiltersWithParams = async (filterParams: typeof filters) => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterParams.type && filterParams.type !== 'all') params.type = filterParams.type;
      if (filterParams.cash_register_id && filterParams.cash_register_id !== 'all') params.cash_register_id = parseInt(filterParams.cash_register_id);
      if (filterParams.payment_method_id && filterParams.payment_method_id !== 'all') params.payment_method_id = parseInt(filterParams.payment_method_id);
      if (filterParams.date_from) params.date_from = filterParams.date_from;
      if (filterParams.date_to) params.date_to = filterParams.date_to;
      params.is_cancelled = false;
      if (companyFilter.companyIdParam) params.company_id = companyFilter.companyIdParam;

      const paymentsData = await paymentsApi.getAll(params);
      setPayments(paymentsData);
    } catch (error: any) {
      console.error('Error applying filters:', error);
      setGeneralError(error.message || 'Error al filtrar pagos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    await applyFiltersWithParams(filters);
  };

  const clearFilters = () => {
    setDatePreset('all');
    setFilters({
      type: 'all',
      cash_register_id: 'all',
      payment_method_id: 'all',
      date_from: '',
      date_to: '',
    });
    setTableSearch('');
    loadData();
  };

  const handleCancelPayment = async () => {
    if (!paymentToCancel || !cancelReason.trim()) {
      setGeneralError('Debes proporcionar una razón para cancelar el pago');
      return;
    }

    try {
      setFormLoading(true);
      const updatedPayment = await paymentsApi.cancel(paymentToCancel.id, cancelReason);
      setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
      setCancelDialogOpen(false);
      setPaymentToCancel(null);
      setCancelReason('');
    } catch (error: any) {
      console.error('Error cancelling payment:', error);
      setGeneralError(error.message || 'Error al cancelar pago');
    } finally {
      setFormLoading(false);
    }
  };

  const openViewDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setDialogType('view');
    setDialogOpen(true);
  };

  const openCancelDialog = (payment: Payment) => {
    setPaymentToCancel(payment);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalIncome = payments
    .filter(p => p.type === 'income' && !p.is_cancelled)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalExpense = payments
    .filter(p => p.type === 'expense' && !p.is_cancelled)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Client-side table filtering
  const filteredPayments = payments.filter(p => {
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const matchesSearch =
        (p.payment_number && p.payment_number.toLowerCase().includes(q)) ||
        (p.concept && p.concept.toLowerCase().includes(q)) ||
        (p.payment_method?.name && p.payment_method.name.toLowerCase().includes(q)) ||
        (p.reference && p.reference.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }
    if (filters.type !== 'all' && p.type !== filters.type) return false;
    if (filters.cash_register_id !== 'all' && p.cash_register_id?.toString() !== filters.cash_register_id) return false;
    if (filters.payment_method_id !== 'all' && p.payment_method_id?.toString() !== filters.payment_method_id) return false;
    return true;
  });

  const handleExportPdf = useCallback(async () => {
    if (filteredPayments.length === 0) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Construyendo reporte de pagos." });
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const companyName = user.company?.name || 'LEGAL SISTEMA';
      const companyTaxId = user.company?.tax_id || '';
      const companyAddress = user.company?.address || '';
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      // ── Footer on every page ──
      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const footerY = pageHeight - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageWidth - margin, footerY);
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(156, 163, 175);
          pdf.text(`${companyName} — Sistema de Gestión`, pageWidth / 2, footerY + 4, { align: 'center' });
          pdf.setTextColor(176, 181, 191);
          pdf.text('Desarrollado por Legal Sistema · www.legalsistema.co', pageWidth / 2, footerY + 7, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Página ${i} de ${pages}`, pageWidth / 2, footerY + 10, { align: 'center' });
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);

      // ── Header ──
      let currentY = margin;
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

      const rightX = pageWidth - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeText = 'REPORTE';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('Reporte de Pagos', rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const dateFrom = filters.date_from || 'Inicio';
      const dateTo = filters.date_to || 'Actual';
      pdf.text(`${dateFrom} a ${dateTo}`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // ── Summary Cards ──
      const cardData = [
        { label: 'TOTAL INGRESOS', value: formatCurrency(totalIncome), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'TOTAL EGRESOS', value: formatCurrency(totalExpense), bg: [254, 242, 242], border: [254, 202, 202], color: [220, 38, 38] },
        { label: 'BALANCE', value: formatCurrency(totalIncome - totalExpense), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
      ];
      const cardW = (contentWidth - 4) / 3;
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
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
      });
      currentY += 20;

      // ── Table ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Detalle de Pagos', margin + 4, currentY + 4.8);
      currentY += 9;

      const tableHead = [['Número', 'Tipo', 'Fecha', 'Concepto', 'Método', 'Monto', 'Estado']];
      const tableBody = filteredPayments.map(p => [
        p.payment_number || '',
        p.type === 'income' ? 'Ingreso' : 'Egreso',
        formatDate(p.paid_at),
        p.concept || '',
        p.payment_method?.name || '',
        formatCurrency(p.amount),
        p.is_cancelled ? 'Cancelado' : 'Activo',
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          5: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const row = filteredPayments[data.row.index];
            if (row) {
              data.cell.styles.textColor = row.type === 'income' ? [5, 150, 105] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      // ── Add footers ──
      addFooters();

      pdf.save(`Pagos_${Date.now()}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [filteredPayments, totalIncome, totalExpense, user, filters, toast]);

  const handleExportExcel = useCallback(async () => {
    if (filteredPayments.length === 0) return;
    try {
      setExporting(true);
      const XLSX = await import('xlsx-js-style');

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 7;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      // Title
      rows.push([`REPORTE DE PAGOS — ${companyName}`, '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Gestión de ingresos y egresos`, '', '', '', '', '', '']);
      row++;

      // Summary
      rows.push(['', '', '', '', '', '', '']);
      row++;
      rows.push([
        'RESUMEN',
        `Total Ingresos: ${formatCurrency(totalIncome)}`,
        '',
        `Total Egresos: ${formatCurrency(totalExpense)}`,
        '',
        `Balance: ${formatCurrency(totalIncome - totalExpense)}`,
        '',
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '', '', '']);
      row++;

      // Column headers
      rows.push(['Número', 'Tipo', 'Fecha', 'Concepto', 'Método', 'Monto', 'Estado']);
      columnHeaderRows.push(row);
      row++;

      // Data
      filteredPayments.forEach(p => {
        rows.push([
          p.payment_number || '',
          p.type === 'income' ? 'Ingreso' : 'Egreso',
          formatDate(p.paid_at),
          p.concept || '',
          p.payment_method?.name || '',
          Number(p.amount) || 0,
          p.is_cancelled ? 'Cancelado' : 'Activo',
        ]);
        row++;
      });

      // Totals
      rows.push(['', '', '', '', '', '', '']);
      row++;
      const totalsRowIdx = row;
      rows.push([
        'TOTALES',
        '',
        '',
        '',
        'Ingresos:',
        totalIncome,
        '',
      ]);
      row++;
      rows.push([
        '',
        '',
        '',
        '',
        'Egresos:',
        totalExpense,
        '',
      ]);
      row++;
      rows.push([
        '',
        '',
        '',
        '',
        'Balance:',
        totalIncome - totalExpense,
        '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Column widths
      ws['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
      ];

      // Merge title
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      ];

      // Style cells
      const indigoFill = { fgColor: { rgb: '4F46E5' } };
      const grayFill = { fgColor: { rgb: 'E5E7EB' } };
      const lightIndigoFill = { fgColor: { rgb: 'EEF2FF' } };
      const whiteFont = { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 };
      const boldFont = { bold: true, sz: 10 };
      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } },
      };

      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < totalCols; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
          const cell = ws[cellRef];

          if (sectionHeaderRows.includes(r)) {
            cell.s = { fill: indigoFill, font: whiteFont, border: thinBorder, alignment: { horizontal: 'left' } };
          } else if (columnHeaderRows.includes(r)) {
            cell.s = { fill: grayFill, font: boldFont, border: thinBorder, alignment: { horizontal: 'center' } };
          } else if (r >= totalsRowIdx) {
            cell.s = { fill: lightIndigoFill, font: boldFont, border: thinBorder, alignment: { horizontal: c === 5 ? 'right' : 'left' } };
          } else {
            cell.s = { border: thinBorder, alignment: { horizontal: c === 5 ? 'right' : 'left' } };
          }

          // Number format for money column
          if (c === 5 && typeof cell.v === 'number') {
            cell.z = '#,##0';
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
      XLSX.writeFile(wb, `Pagos_${Date.now()}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [filteredPayments, totalIncome, totalExpense, user, toast]);

  return (
    <AppLayout title="Pagos">
      <Head title="Pagos" />
      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* ── Header ── */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            {/* Row 1: Icon + Title + Action buttons */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Pagos</h2>
                  <p className="text-sm text-muted-foreground">Gestiona los ingresos y egresos del sistema</p>
                </div>
              </div>
              {filteredPayments.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={exporting}>
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    PDF
                  </Button>
                  <Button onClick={handleExportExcel} variant="outline" size="sm" disabled={exporting}>
                    {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Row 2: Summary stat cards */}
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <div className="bg-background/60 backdrop-blur-sm rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ingresos</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Egresos</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-background/60 backdrop-blur-sm rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalIncome - totalExpense)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Company Filter ── */}
        <div className="max-w-[1400px] mx-auto px-4 pt-6">
          {companyFilter.isSuperAdmin && (
            <SuperAdminCompanyFilter
              companies={companyFilter.companies}
              loadingCompanies={companyFilter.loadingCompanies}
              selectedCompanyId={companyFilter.selectedCompanyId}
              setSelectedCompanyId={companyFilter.setSelectedCompanyId}
              isFiltered={companyFilter.isFiltered}
              handleFilter={companyFilter.handleFilter}
              handleClear={companyFilter.handleClear}
            />
          )}
        </div>

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && (
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <SuperAdminEmptyState />
          </div>
        )}

        {/* ── Content ── */}
        {companyFilter.shouldLoadData && (
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
          {generalError && !dialogOpen && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
              {generalError}
            </div>
          )}

          {/* Filters card */}
          <Card className="shadow-sm border border-border">
            <CardContent className="pt-5 pb-4 space-y-3">
              {/* Date preset buttons */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <Button
                  variant={datePreset === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={datePreset === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('today')}
                >
                  Hoy
                </Button>
                <Button
                  variant={datePreset === 'yesterday' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('yesterday')}
                >
                  Ayer
                </Button>
                <Button
                  variant={datePreset === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('week')}
                >
                  Esta semana
                </Button>
                <Button
                  variant={datePreset === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePresetChange('month')}
                >
                  Este mes
                </Button>
              </div>
              {/* Custom date range */}
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Personalizado:</span>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleCustomDateChange('date_from', e.target.value)}
                  className="w-full sm:w-[150px]"
                />
                <span className="text-muted-foreground text-sm">a</span>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleCustomDateChange('date_to', e.target.value)}
                  className="w-full sm:w-[150px]"
                />
                {datePreset === 'custom' && (
                  <Badge variant="secondary" className="text-xs">Personalizado</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table card */}
          <Card className="shadow-xl border border-border">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <CardTitle>Lista de Pagos</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pagos..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-8 w-full sm:w-[200px]"
                    />
                  </div>
                  <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.cash_register_id} onValueChange={(value) => setFilters({ ...filters, cash_register_id: value })}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Caja" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todas las cajas</SelectItem>
                      {cashRegisters.map((register) => (
                        <SelectItem key={register.id} value={register.id.toString()}>
                          {register.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.payment_method_id} onValueChange={(value) => setFilters({ ...filters, payment_method_id: value })}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos los métodos</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id.toString()}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(tableSearch || filters.type !== 'all' || filters.cash_register_id !== 'all' || filters.payment_method_id !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                      Limpiar
                    </Button>
                  )}
                  {canCreateExpense && (
                    <Button onClick={() => router.visit("/admin/payments/expense")} size="sm" variant="outline" className="ml-auto">
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Nuevo Egreso
                    </Button>
                  )}
                  {canCreateIncome && (
                    <Button onClick={() => router.visit("/admin/payments/income")} size="sm">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Nuevo Ingreso
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="mr-2" />
                  <p>Cargando...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos registrados
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.payment_number}</TableCell>
                          <TableCell>
                            <Badge variant={payment.type === 'income' ? 'default' : 'destructive'}>
                              {payment.type === 'income' ? (
                                <>
                                  <TrendingUp className="mr-1 h-3 w-3" />
                                  Ingreso
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="mr-1 h-3 w-3" />
                                  Egreso
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(payment.paid_at)}</TableCell>
                          <TableCell>{payment.concept}</TableCell>
                          <TableCell>{payment.payment_method?.name}</TableCell>
                          <TableCell className={payment.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {payment.is_cancelled ? (
                              <Badge variant="secondary">Cancelado</Badge>
                            ) : (
                              <Badge variant="default">Activo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openViewDialog(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canManage && !payment.is_cancelled && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCancelDialog(payment)}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      {/* View Payment Dialog */}
      <Dialog open={dialogOpen && dialogType === 'view'} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Número</Label>
                  <p className="font-mono">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <div>
                    <Badge variant={selectedPayment.type === 'income' ? 'default' : 'destructive'}>
                      {selectedPayment.type === 'income' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p>{formatDate(selectedPayment.paid_at)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monto</Label>
                  <p className={`text-lg font-semibold ${selectedPayment.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Concepto</Label>
                  <p>{selectedPayment.concept}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Método de Pago</Label>
                  <p>{selectedPayment.payment_method?.name}</p>
                </div>
                {selectedPayment.reference && (
                  <div>
                    <Label className="text-muted-foreground">Referencia</Label>
                    <p>{selectedPayment.reference}</p>
                  </div>
                )}
                {selectedPayment.session && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Sesión</Label>
                    <p>{selectedPayment.session.session_number} - {selectedPayment.session.cash_register?.name}</p>
                  </div>
                )}
                {selectedPayment.client && (
                  <div>
                    <Label className="text-muted-foreground">Cliente</Label>
                    <p>{selectedPayment.client.name}</p>
                  </div>
                )}
                {selectedPayment.supplier && (
                  <div>
                    <Label className="text-muted-foreground">Proveedor</Label>
                    <p>{selectedPayment.supplier.name}</p>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Notas</Label>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div>
                    <Badge variant={selectedPayment.is_cancelled ? 'secondary' : 'default'}>
                      {selectedPayment.is_cancelled ? 'Cancelado' : 'Activo'}
                    </Badge>
                  </div>
                </div>
                {selectedPayment.is_cancelled && selectedPayment.cancellation_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Razón de Cancelación</Label>
                    <p className="text-red-600">{selectedPayment.cancellation_reason}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setDialogOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Payment Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Pago</DialogTitle>
            <DialogDescription>
              Proporciona una razón para cancelar este pago
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {generalError && (
              <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                {generalError}
              </div>
            )}
            <div>
              <Label htmlFor="cancel_reason" className="mb-3 block">Razón de Cancelación *</Label>
              <Input
                id="cancel_reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
                disabled={formLoading}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setPaymentToCancel(null);
                  setCancelReason('');
                }}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCancelPayment}
                disabled={formLoading}
                variant="destructive"
              >
                {formLoading && <Spinner className="mr-2" size="sm" />}
                Confirmar Cancelación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
