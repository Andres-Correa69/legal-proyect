import { Head, usePage, router } from "@inertiajs/react";
import React, { useState, useEffect, useRef, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cashReportsApi,
  cashRegistersApi,
  cashSessionsApi,
  branchesApi,
  type CashFlowReport,
  type CashRegisterReport,
  type GlobalCashReport,
  type CashRegister,
  type CashRegisterSession,
  type Branch,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FileSpreadsheet,
  Download,
  BarChart3,
  Building2,
  Globe,
  Eye,
  ShoppingCart,
  Package,
  Search,
  Loader2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  ChevronDown,
  CalendarIcon,
} from "lucide-react";

function getDateRange(preset: string): { date_from: string; date_to: string } {
  const today = new Date();
  const toStr = today.toISOString().split('T')[0];
  const from = new Date(today);
  switch (preset) {
    case '15d': from.setDate(from.getDate() - 15); break;
    case '1m': from.setMonth(from.getMonth() - 1); break;
    case '2m': from.setMonth(from.getMonth() - 2); break;
    case '3m': from.setMonth(from.getMonth() - 3); break;
    default: return { date_from: '', date_to: '' };
  }
  return { date_from: from.toISOString().split('T')[0], date_to: toStr };
}

type TabType = 'cash_flow' | 'by_register' | 'global';

export default function CashReportsIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission('cash-reports.view', user);
  const canExport = hasPermission('cash-reports.export', user);

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('cash_flow');
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>(null);

  // Cash Flow Report State
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null);
  const [cashFlowFilters, setCashFlowFilters] = useState(() => ({
    session_id: 'all',
    cash_register_id: 'all',
    date_range: '15d',
    ...getDateRange('15d'),
  }));

  // By Register Report State
  const [byRegisterReport, setByRegisterReport] = useState<CashRegisterReport | null>(null);
  const [byRegisterFilters, setByRegisterFilters] = useState(() => ({
    cash_register_id: '',
    date_range: '15d',
    ...getDateRange('15d'),
  }));

  // Global Report State
  const [globalReport, setGlobalReport] = useState<GlobalCashReport | null>(null);
  const [globalFilters, setGlobalFilters] = useState(() => ({
    branch_id: 'all',
    date_range: '15d',
    ...getDateRange('15d'),
  }));

  const currentReport = activeTab === 'cash_flow' ? cashFlowReport : activeTab === 'by_register' ? byRegisterReport : globalReport;

  const currentFilters = activeTab === 'cash_flow' ? cashFlowFilters : activeTab === 'by_register' ? byRegisterFilters : globalFilters;

  useEffect(() => {
    if (!canView) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadBaseData();
  }, [canView]);

  if (!canView) {
    return null;
  }

  const loadBaseData = async () => {
    try {
      const [registersData, sessionsData, branchesData] = await Promise.all([
        cashRegistersApi.getAll(),
        cashSessionsApi.getAll(),
        branchesApi.getAll(),
      ]);
      setCashRegisters(registersData);
      setSessions(sessionsData);
      setBranches(branchesData);
    } catch (error: any) {
      console.error('Error loading base data:', error);
      setGeneralError(error.message || 'Error al cargar datos');
    }
  };

  const loadCashFlowReport = async () => {
    if (!cashFlowFilters.date_from || !cashFlowFilters.date_to) {
      setGeneralError('Debes seleccionar un rango de fechas');
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        date_from: cashFlowFilters.date_from,
        date_to: cashFlowFilters.date_to,
      };
      if (cashFlowFilters.session_id && cashFlowFilters.session_id !== 'all') params.session_id = parseInt(cashFlowFilters.session_id);
      if (cashFlowFilters.cash_register_id && cashFlowFilters.cash_register_id !== 'all') params.cash_register_id = parseInt(cashFlowFilters.cash_register_id);

      const report = await cashReportsApi.cashFlow(params);
      setCashFlowReport(report);
      setGeneralError('');
    } catch (error: any) {
      console.error('Error loading cash flow report:', error);
      setGeneralError(error.message || 'Error al cargar reporte de flujo de caja');
    } finally {
      setLoading(false);
    }
  };

  const loadByRegisterReport = async () => {
    if (!byRegisterFilters.cash_register_id || byRegisterFilters.cash_register_id === 'all' || !byRegisterFilters.date_from || !byRegisterFilters.date_to) {
      setGeneralError('Debes seleccionar una caja específica y un rango de fechas');
      return;
    }

    try {
      setLoading(true);
      const report = await cashReportsApi.byRegister(
        parseInt(byRegisterFilters.cash_register_id),
        {
          date_from: byRegisterFilters.date_from,
          date_to: byRegisterFilters.date_to,
        }
      );
      setByRegisterReport(report);
      setGeneralError('');
    } catch (error: any) {
      console.error('Error loading by register report:', error);
      setGeneralError(error.message || 'Error al cargar reporte por caja');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalReport = async () => {
    if (!globalFilters.date_from || !globalFilters.date_to) {
      setGeneralError('Debes seleccionar un rango de fechas');
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        date_from: globalFilters.date_from,
        date_to: globalFilters.date_to,
      };
      if (globalFilters.branch_id && globalFilters.branch_id !== 'all') params.branch_id = parseInt(globalFilters.branch_id);

      const report = await cashReportsApi.global(params);
      setGlobalReport(report);
      setGeneralError('');
    } catch (error: any) {
      console.error('Error loading global report:', error);
      setGeneralError(error.message || 'Error al cargar reporte global');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!currentReport) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Construyendo tablas y resumen." });

      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const companyName = user.company?.name || 'LEGAL SISTEMA';
      const companyTaxId = user.company?.tax_id || '';
      const companyAddress = user.company?.address || '';
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

      const tabTitles: Record<TabType, string> = {
        cash_flow: 'Reporte de Flujo de Caja',
        by_register: 'Reporte por Caja',
        global: 'Reporte Global de Caja',
      };

      // Footer on every page
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
          pdf.text('Generado por Legal Sistema', pageWidth / 2, footerY + 7, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Página ${i} de ${pages}`, pageWidth / 2, footerY + 10, { align: 'center' });
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);

      // Header
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
      pdf.text(tabTitles[activeTab], rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${currentFilters.date_from} a ${currentFilters.date_to}`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // Summary Cards
      if (activeTab === 'cash_flow' && cashFlowReport) {
        const cardData = [
          { label: 'SALDO INICIAL', value: formatCurrency(cashFlowReport.opening_balance), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
          { label: 'TOTAL INGRESOS', value: formatCurrency(cashFlowReport.total_income), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
          { label: 'TOTAL EGRESOS', value: formatCurrency(cashFlowReport.total_expense), bg: [254, 226, 226], border: [252, 165, 165], color: [220, 38, 38] },
          { label: 'SALDO FINAL', value: formatCurrency(cashFlowReport.closing_balance), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
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
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
          pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
        });
        currentY += 20;

        // Transactions table
        if (cashFlowReport.transactions.length > 0) {
          if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.setFillColor(79, 70, 229);
          pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Transacciones', margin + 4, currentY + 4.8);
          currentY += 9;

          const head = [['Fecha', 'Número', 'Referencia', 'Tipo', 'Concepto', 'Método', 'Monto', 'Saldo']];
          const body = cashFlowReport.transactions.map((tx: any) => [
            new Date(tx.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }),
            tx.payment_number || '',
            tx.ref_number || '—',
            tx.type === 'income' ? 'Ingreso' : 'Egreso',
            tx.concept || '',
            tx.payment_method || '',
            formatCurrency(tx.amount),
            formatCurrency(tx.balance),
          ]);

          autoTable(pdf, {
            startY: currentY,
            head,
            body,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
              6: { halign: 'right' },
              7: { halign: 'right' },
            },
            didDrawPage: () => { currentY = margin; },
          });
        }
      } else if (activeTab === 'by_register' && byRegisterReport) {
        const cardData = [
          ...(byRegisterReport.cash_register.type === 'minor' ? [{ label: 'SESIONES', value: String(byRegisterReport.sessions_count), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] }] : []),
          { label: 'TOTAL INGRESOS', value: formatCurrency(byRegisterReport.total_income), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
          { label: 'TOTAL EGRESOS', value: formatCurrency(byRegisterReport.total_expense), bg: [254, 226, 226], border: [252, 165, 165], color: [220, 38, 38] },
          { label: 'TRANSF. ENVIADAS', value: formatCurrency(byRegisterReport.total_transfers_sent), bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
          { label: 'TRANSF. RECIBIDAS', value: formatCurrency(byRegisterReport.total_transfers_received), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
        ];
        const cardW = (contentWidth - (cardData.length - 1) * 2) / cardData.length;
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

        // Sessions table
        if (byRegisterReport.cash_register.type === 'minor' && byRegisterReport.sessions.length > 0) {
          if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.setFillColor(79, 70, 229);
          pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Sesiones', margin + 4, currentY + 4.8);
          currentY += 9;

          const sessHead = [['Número', 'Apertura', 'Cierre', 'Estado', 'Saldo Inicial', 'Saldo Final', 'Ingresos', 'Egresos']];
          const sessBody = byRegisterReport.sessions.map((s: any) => [
            s.session_number,
            new Date(s.opened_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }),
            s.closed_at ? new Date(s.closed_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }) : '-',
            s.status === 'open' ? 'Abierta' : 'Cerrada',
            formatCurrency(s.opening_balance),
            s.closing_balance !== undefined ? formatCurrency(s.closing_balance) : '-',
            formatCurrency(s.total_income),
            formatCurrency(s.total_expense),
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: sessHead,
            body: sessBody,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
            didDrawPage: () => { currentY = margin; },
          });
          currentY = (pdf as any).lastAutoTable.finalY + 6;
        }

        // Transactions table
        if (byRegisterReport.transactions && byRegisterReport.transactions.length > 0) {
          if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.setFillColor(79, 70, 229);
          pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Transacciones', margin + 4, currentY + 4.8);
          currentY += 9;

          const txHead = [['Fecha', 'Número', 'Referencia', 'Tipo', 'Concepto', 'Método', 'Monto']];
          const txBody = byRegisterReport.transactions.map((tx: any) => {
            const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Egreso' : tx.type === 'transfer_in' ? 'Transf. (entrada)' : 'Transf. (salida)';
            return [
              new Date(tx.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' }),
              tx.payment_number || '',
              tx.ref_number || '—',
              typeLabel,
              tx.concept || '',
              tx.payment_method || '',
              formatCurrency(tx.amount),
            ];
          });

          autoTable(pdf, {
            startY: currentY,
            head: txHead,
            body: txBody,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: { 6: { halign: 'right' } },
            didDrawPage: () => { currentY = margin; },
          });
        }
      } else if (activeTab === 'global' && globalReport) {
        const cardData = [
          { label: 'TOTAL INGRESOS', value: formatCurrency(globalReport.total_income), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
          { label: 'TOTAL EGRESOS', value: formatCurrency(globalReport.total_expense), bg: [254, 226, 226], border: [252, 165, 165], color: [220, 38, 38] },
          { label: 'FLUJO NETO', value: formatCurrency(globalReport.net_cash_flow), bg: [219, 234, 254], border: [147, 197, 253], color: [37, 99, 235] },
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

        // By Branch table
        if (globalReport.by_branch.length > 0) {
          if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.setFillColor(79, 70, 229);
          pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Por Sucursal', margin + 4, currentY + 4.8);
          currentY += 9;

          const branchHead = [['Sucursal', 'Total Ingresos', 'Total Egresos', 'Flujo Neto']];
          const branchBody = globalReport.by_branch.map((b: any) => [
            b.branch_name,
            formatCurrency(b.total_income),
            formatCurrency(b.total_expense),
            formatCurrency(b.net_cash_flow),
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: branchHead,
            body: branchBody,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
            didDrawPage: () => { currentY = margin; },
          });
          currentY = (pdf as any).lastAutoTable.finalY + 6;
        }

        // By Payment Method table
        if (globalReport.by_payment_method.length > 0) {
          if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.setFillColor(79, 70, 229);
          pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Por Método de Pago', margin + 4, currentY + 4.8);
          currentY += 9;

          const methodHead = [['Método de Pago', 'Total Ingresos', 'Total Egresos', 'Monto Neto']];
          const methodBody = globalReport.by_payment_method.map((m: any) => [
            m.payment_method_name,
            formatCurrency(m.total_income),
            formatCurrency(m.total_expense),
            formatCurrency(m.net_amount),
          ]);

          autoTable(pdf, {
            startY: currentY,
            head: methodHead,
            body: methodBody,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
            didDrawPage: () => { currentY = margin; },
          });
        }
      }

      addFooters();
      pdf.save(`Reporte_Caja_${activeTab}_${currentFilters.date_from}_${currentFilters.date_to}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [currentReport, activeTab, cashFlowReport, byRegisterReport, globalReport, currentFilters, user, toast]);

  const handleExportExcel = useCallback(async () => {
    if (!currentReport) return;
    try {
      setExporting(true);
      const XLSX = await import('xlsx-js-style');

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      const totalsRows: number[] = [];
      let row = 0;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      const tabTitles: Record<TabType, string> = {
        cash_flow: 'REPORTE DE FLUJO DE CAJA',
        by_register: 'REPORTE POR CAJA',
        global: 'REPORTE GLOBAL DE CAJA',
      };

      // Header
      rows.push([`${tabTitles[activeTab]} — ${companyName}`, '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Periodo: ${currentFilters.date_from} a ${currentFilters.date_to}`, '', '', '', '', '', '', '']);
      row++;
      rows.push(['', '', '', '', '', '', '', '']);
      row++;

      let totalCols = 8;

      if (activeTab === 'cash_flow' && cashFlowReport) {
        // Summary
        rows.push([
          'RESUMEN',
          `Saldo Inicial: ${formatCurrency(cashFlowReport.opening_balance)}`,
          `Ingresos: ${formatCurrency(cashFlowReport.total_income)}`,
          `Egresos: ${formatCurrency(cashFlowReport.total_expense)}`,
          `Saldo Final: ${formatCurrency(cashFlowReport.closing_balance)}`,
          '', '', '',
        ]);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['', '', '', '', '', '', '', '']);
        row++;

        // Transactions
        rows.push(['TRANSACCIONES', '', '', '', '', '', '', '']);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['Fecha', 'Número', 'Referencia', 'Tipo', 'Concepto', 'Método', 'Monto', 'Saldo']);
        columnHeaderRows.push(row);
        row++;

        cashFlowReport.transactions.forEach((tx: any) => {
          rows.push([
            new Date(tx.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
            tx.payment_number || '',
            tx.ref_number || '—',
            tx.type === 'income' ? 'Ingreso' : 'Egreso',
            tx.concept || '',
            tx.payment_method || '',
            Number(tx.amount),
            Number(tx.balance),
          ]);
          row++;
        });
      } else if (activeTab === 'by_register' && byRegisterReport) {
        totalCols = 8;
        rows.push([
          'RESUMEN',
          `Caja: ${byRegisterReport.cash_register.name}`,
          `Ingresos: ${formatCurrency(byRegisterReport.total_income)}`,
          `Egresos: ${formatCurrency(byRegisterReport.total_expense)}`,
          `Transf. Enviadas: ${formatCurrency(byRegisterReport.total_transfers_sent)}`,
          `Transf. Recibidas: ${formatCurrency(byRegisterReport.total_transfers_received)}`,
          '', '',
        ]);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['', '', '', '', '', '', '', '']);
        row++;

        // Sessions
        if (byRegisterReport.cash_register.type === 'minor' && byRegisterReport.sessions.length > 0) {
          rows.push(['SESIONES', '', '', '', '', '', '', '']);
          sectionHeaderRows.push(row);
          row++;
          rows.push(['Número', 'Apertura', 'Cierre', 'Estado', 'Saldo Inicial', 'Saldo Final', 'Ingresos', 'Egresos']);
          columnHeaderRows.push(row);
          row++;
          byRegisterReport.sessions.forEach((s: any) => {
            rows.push([
              s.session_number,
              new Date(s.opened_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
              s.closed_at ? new Date(s.closed_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '-',
              s.status === 'open' ? 'Abierta' : 'Cerrada',
              Number(s.opening_balance),
              s.closing_balance !== undefined ? Number(s.closing_balance) : '-',
              Number(s.total_income),
              Number(s.total_expense),
            ]);
            row++;
          });
          rows.push(['', '', '', '', '', '', '', '']);
          row++;
        }

        // Transactions
        if (byRegisterReport.transactions && byRegisterReport.transactions.length > 0) {
          rows.push(['TRANSACCIONES', '', '', '', '', '', '', '']);
          sectionHeaderRows.push(row);
          row++;
          rows.push(['Fecha', 'Número', 'Referencia', 'Tipo', 'Concepto', 'Método', 'Monto', '']);
          columnHeaderRows.push(row);
          row++;
          byRegisterReport.transactions.forEach((tx: any) => {
            const typeLabel = tx.type === 'income' ? 'Ingreso' : tx.type === 'expense' ? 'Egreso' : tx.type === 'transfer_in' ? 'Transf. (entrada)' : 'Transf. (salida)';
            rows.push([
              new Date(tx.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
              tx.payment_number || '',
              tx.ref_number || '—',
              typeLabel,
              tx.concept || '',
              tx.payment_method || '',
              Number(tx.amount),
              '',
            ]);
            row++;
          });
        }
      } else if (activeTab === 'global' && globalReport) {
        totalCols = 4;
        rows.push([
          'RESUMEN',
          `Ingresos: ${formatCurrency(globalReport.total_income)}`,
          `Egresos: ${formatCurrency(globalReport.total_expense)}`,
          `Flujo Neto: ${formatCurrency(globalReport.net_cash_flow)}`,
        ]);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['', '', '', '']);
        row++;

        // By Branch
        if (globalReport.by_branch.length > 0) {
          rows.push(['POR SUCURSAL', '', '', '']);
          sectionHeaderRows.push(row);
          row++;
          rows.push(['Sucursal', 'Total Ingresos', 'Total Egresos', 'Flujo Neto']);
          columnHeaderRows.push(row);
          row++;
          globalReport.by_branch.forEach((b: any) => {
            rows.push([b.branch_name, Number(b.total_income), Number(b.total_expense), Number(b.net_cash_flow)]);
            row++;
          });
          rows.push(['', '', '', '']);
          row++;
        }

        // By Payment Method
        if (globalReport.by_payment_method.length > 0) {
          rows.push(['POR MÉTODO DE PAGO', '', '', '']);
          sectionHeaderRows.push(row);
          row++;
          rows.push(['Método de Pago', 'Total Ingresos', 'Total Egresos', 'Monto Neto']);
          columnHeaderRows.push(row);
          row++;
          globalReport.by_payment_method.forEach((m: any) => {
            rows.push([m.payment_method_name, Number(m.total_income), Number(m.total_expense), Number(m.net_amount)]);
            row++;
          });
        }
      }

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      if (activeTab === 'global') {
        ws['!cols'] = [{ wch: 25 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
        ];
      } else {
        ws['!cols'] = [
          { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
        ];
        ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        ];
      }

      // Apply number format to monetary columns
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const monetaryCols = activeTab === 'global' ? [1, 2, 3]
        : activeTab === 'by_register' ? [4, 5, 6, 7]
        : [6, 7]; // cash_flow: Monto + Saldo
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (const col of monetaryCols) {
          const addr = XLSX.utils.encode_cell({ r: R, c: col });
          if (ws[addr] && typeof ws[addr].v === 'number') {
            ws[addr].z = '#,##0';
          }
        }
      }

      const borderStyle = { style: 'thin', color: { rgb: 'E5E7EB' } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

      // Apply styles
      for (let R = 0; R < rows.length; R++) {
        for (let C = 0; C < totalCols; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };

          ws[addr].s = { border: thinBorder };

          if (sectionHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '4F46E5' } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          if (columnHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '374151' } },
              fill: { fgColor: { rgb: 'E5E7EB' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder,
            };
          }

          if (R === 1) {
            ws[addr].s = {
              font: { sz: 10, color: { rgb: '6B7280' } },
              alignment: { horizontal: 'left' },
              border: thinBorder,
            };
          }

          if (totalsRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '312E81' } },
              fill: { fgColor: { rgb: 'EEF2FF' } },
              alignment: { horizontal: C >= 1 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Right-align number columns for data rows
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && !totalsRows.includes(R) && C >= (totalCols - 2)) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      const sheetNames: Record<TabType, string> = {
        cash_flow: 'Flujo de Caja',
        by_register: 'Por Caja',
        global: 'Reporte Global',
      };
      XLSX.utils.book_append_sheet(wb, ws, sheetNames[activeTab]);
      XLSX.writeFile(wb, `Reporte_Caja_${activeTab}_${currentFilters.date_from}_${currentFilters.date_to}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [currentReport, activeTab, cashFlowReport, byRegisterReport, globalReport, currentFilters, user, toast]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Bogota',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota',
    });
  };

  const navigateToReference = (tx: any) => {
    if (tx.ref_type === 'sale') {
      router.visit(`/admin/sales/${tx.ref_id}`);
    } else if (tx.ref_type === 'purchase') {
      router.visit(`/admin/inventory-purchases/${tx.ref_id}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: 'Borrador', pending: 'Pendiente', completed: 'Completada',
      cancelled: 'Anulada', approved: 'Aprobada', partial: 'Parcial',
      received: 'Recibida', paid: 'Pagada',
    };
    return map[status] || status;
  };

  const getPaymentStatusBadge = (status: string) => {
    const variant = status === 'paid' ? 'default' : status === 'partial' ? 'secondary' : 'outline';
    return <Badge variant={variant as any}>{getStatusLabel(status)}</Badge>;
  };

  // Render filters for each tab
  const renderCashFlowFilters = () => (
    <div className="flex items-end gap-4 mt-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Periodo</label>
        <Select
          value={cashFlowFilters.date_range}
          onValueChange={(value) => {
            if (value === 'custom') {
              setCashFlowFilters((prev) => ({ ...prev, date_range: value }));
            } else {
              const range = getDateRange(value);
              setCashFlowFilters((prev) => ({ ...prev, date_range: value, ...range }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="15d">Últimos 15 días</SelectItem>
            <SelectItem value="1m">Último mes</SelectItem>
            <SelectItem value="2m">Últimos 2 meses</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {cashFlowFilters.date_range === 'custom' && (
        <>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !cashFlowFilters.date_from && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {cashFlowFilters.date_from ? new Date(cashFlowFilters.date_from + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={cashFlowFilters.date_from ? new Date(cashFlowFilters.date_from + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setCashFlowFilters({ ...cashFlowFilters, date_from: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Hasta</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !cashFlowFilters.date_to && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {cashFlowFilters.date_to ? new Date(cashFlowFilters.date_to + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={cashFlowFilters.date_to ? new Date(cashFlowFilters.date_to + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setCashFlowFilters({ ...cashFlowFilters, date_to: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Sesión</label>
        <Combobox
          value={cashFlowFilters.session_id}
          onValueChange={(value) => setCashFlowFilters({ ...cashFlowFilters, session_id: value || 'all' })}
          placeholder="Todas"
          searchPlaceholder="Buscar sesión..."
          emptyText="No se encontraron sesiones"
          options={[
            { value: 'all', label: 'Todas' },
            ...sessions.map((session) => ({
              value: session.id.toString(),
              label: session.session_number,
            })),
          ]}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Caja</label>
        <Combobox
          value={cashFlowFilters.cash_register_id}
          onValueChange={(value) => setCashFlowFilters({ ...cashFlowFilters, cash_register_id: value || 'all' })}
          placeholder="Todas"
          searchPlaceholder="Buscar caja..."
          emptyText="No se encontraron cajas"
          options={[
            { value: 'all', label: 'Todas' },
            ...cashRegisters.map((register) => ({
              value: register.id.toString(),
              label: register.name,
            })),
          ]}
        />
      </div>
      <Button
        onClick={loadCashFlowReport}
        disabled={loading}
        className="bg-[#2463eb] hover:bg-[#2463eb]/90 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        Generar Reporte
      </Button>
    </div>
  );

  const renderByRegisterFilters = () => (
    <div className="flex items-end gap-4 mt-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Periodo</label>
        <Select
          value={byRegisterFilters.date_range}
          onValueChange={(value) => {
            if (value === 'custom') {
              setByRegisterFilters((prev) => ({ ...prev, date_range: value }));
            } else {
              const range = getDateRange(value);
              setByRegisterFilters((prev) => ({ ...prev, date_range: value, ...range }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="15d">Últimos 15 días</SelectItem>
            <SelectItem value="1m">Último mes</SelectItem>
            <SelectItem value="2m">Últimos 2 meses</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {byRegisterFilters.date_range === 'custom' && (
        <>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !byRegisterFilters.date_from && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {byRegisterFilters.date_from ? new Date(byRegisterFilters.date_from + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={byRegisterFilters.date_from ? new Date(byRegisterFilters.date_from + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setByRegisterFilters({ ...byRegisterFilters, date_from: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Hasta</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !byRegisterFilters.date_to && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {byRegisterFilters.date_to ? new Date(byRegisterFilters.date_to + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={byRegisterFilters.date_to ? new Date(byRegisterFilters.date_to + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setByRegisterFilters({ ...byRegisterFilters, date_to: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Caja *</label>
        <Combobox
          value={byRegisterFilters.cash_register_id}
          onValueChange={(value) => setByRegisterFilters({ ...byRegisterFilters, cash_register_id: value })}
          placeholder="Selecciona una caja"
          searchPlaceholder="Buscar caja..."
          emptyText="No se encontraron cajas"
          options={cashRegisters.map((register) => ({
            value: register.id.toString(),
            label: register.name,
          }))}
        />
      </div>
      <Button
        onClick={loadByRegisterReport}
        disabled={loading}
        className="bg-[#2463eb] hover:bg-[#2463eb]/90 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        Generar Reporte
      </Button>
    </div>
  );

  const renderGlobalFilters = () => (
    <div className="flex items-end gap-4 mt-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Periodo</label>
        <Select
          value={globalFilters.date_range}
          onValueChange={(value) => {
            if (value === 'custom') {
              setGlobalFilters((prev) => ({ ...prev, date_range: value }));
            } else {
              const range = getDateRange(value);
              setGlobalFilters((prev) => ({ ...prev, date_range: value, ...range }));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card z-50">
            <SelectItem value="15d">Últimos 15 días</SelectItem>
            <SelectItem value="1m">Último mes</SelectItem>
            <SelectItem value="2m">Últimos 2 meses</SelectItem>
            <SelectItem value="3m">Últimos 3 meses</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {globalFilters.date_range === 'custom' && (
        <>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !globalFilters.date_from && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {globalFilters.date_from ? new Date(globalFilters.date_from + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={globalFilters.date_from ? new Date(globalFilters.date_from + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setGlobalFilters({ ...globalFilters, date_from: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Hasta</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !globalFilters.date_to && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {globalFilters.date_to ? new Date(globalFilters.date_to + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerReport
                  selected={globalFilters.date_to ? new Date(globalFilters.date_to + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const y = date.getFullYear();
                      const m = String(date.getMonth() + 1).padStart(2, '0');
                      const d = String(date.getDate()).padStart(2, '0');
                      setGlobalFilters({ ...globalFilters, date_to: `${y}-${m}-${d}` });
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Sucursal</label>
        <Combobox
          value={globalFilters.branch_id}
          onValueChange={(value) => setGlobalFilters({ ...globalFilters, branch_id: value || 'all' })}
          placeholder="Todas"
          searchPlaceholder="Buscar sucursal..."
          emptyText="No se encontraron sucursales"
          options={[
            { value: 'all', label: 'Todas' },
            ...branches.map((branch) => ({
              value: branch.id.toString(),
              label: branch.name,
            })),
          ]}
        />
      </div>
      <Button
        onClick={loadGlobalReport}
        disabled={loading}
        className="bg-[#2463eb] hover:bg-[#2463eb]/90 text-white"
      >
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        Generar Reporte
      </Button>
    </div>
  );

  const typeColors: Record<string, string> = {
    income: "bg-emerald-500/100/10 text-emerald-600",
    expense: "bg-red-500/100/10 text-red-600",
    transfer_in: "bg-blue-500/100/10 text-blue-600",
    transfer_out: "bg-amber-500/100/10 text-amber-600",
  };

  const typeLabels: Record<string, string> = {
    income: "Ingreso",
    expense: "Egreso",
    transfer_in: "Transf. Entrada",
    transfer_out: "Transf. Salida",
  };

  return (
    <AppLayout title="Reportes de Caja">
      <Head title="Reportes de Caja" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reportes de Caja</h2>
          <p className="text-muted-foreground">Genera informes de flujo de efectivo y exporta a Excel/PDF.</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Configuración</CardTitle>
            {canExport && currentReport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting}>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Descargar <ChevronDown className="h-3 w-3 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card">
                  <DropdownMenuLabel className="text-xs">Formato de exportación</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2" onClick={handleExportPdf}>
                    <FileText className="h-4 w-4" /> PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b">
              <nav className="flex space-x-4" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('cash_flow')}
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'cash_flow'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <BarChart3 className="inline-block mr-2 h-4 w-4" />
                  Flujo de Caja
                </button>
                <button
                  onClick={() => setActiveTab('by_register')}
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'by_register'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Building2 className="inline-block mr-2 h-4 w-4" />
                  Por Caja
                </button>
                <button
                  onClick={() => setActiveTab('global')}
                  className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'global'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Globe className="inline-block mr-2 h-4 w-4" />
                  Reporte Global
                </button>
              </nav>
            </div>

            {/* Filters for active tab */}
            {activeTab === 'cash_flow' && renderCashFlowFilters()}
            {activeTab === 'by_register' && renderByRegisterFilters()}
            {activeTab === 'global' && renderGlobalFilters()}

            {generalError && (
              <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
                {generalError}
              </div>
            )}

            {/* ==================== CASH FLOW TAB ==================== */}
            {activeTab === 'cash_flow' && (
              <>
                {cashFlowReport ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/100/10">
                              <Wallet className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                              <p className="text-xl font-semibold text-blue-600">{formatCurrency(cashFlowReport.opening_balance)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/100/10">
                              <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Ingresos</p>
                              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(cashFlowReport.total_income)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/100/10">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Egresos</p>
                              <p className="text-xl font-semibold text-red-600">{formatCurrency(cashFlowReport.total_expense)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/100/10">
                              <DollarSign className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Saldo Final</p>
                              <p className="text-xl font-semibold text-purple-600">{formatCurrency(cashFlowReport.closing_balance)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Transactions Table */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Detalle de Transacciones</h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha/Hora</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead className="text-right">Saldo</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cashFlowReport.transactions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                                  No hay transacciones para mostrar.
                                </TableCell>
                              </TableRow>
                            ) : (
                              cashFlowReport.transactions.map((transaction: any, index: number) => {
                                const isIncome = transaction.type === 'income';
                                return (
                                  <TableRow key={index}>
                                    <TableCell className="text-sm">{formatDateTime(transaction.date)}</TableCell>
                                    <TableCell>
                                      <Badge className={typeColors[transaction.type] || typeColors.income}>
                                        {typeLabels[transaction.type] || transaction.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {transaction.concept}
                                      {transaction.ref_number && (
                                        <button
                                          onClick={() => navigateToReference(transaction)}
                                          className="ml-2 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                                        >
                                          ({transaction.ref_number})
                                        </button>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{transaction.payment_method}</TableCell>
                                    <TableCell className={`text-right font-medium ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(transaction.balance)}
                                    </TableCell>
                                    <TableCell>
                                      {transaction.ref_summary && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setPreviewData(transaction)}
                                        >
                                          <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-40" />
                    <p className="text-lg font-medium">Sin datos para mostrar</p>
                    <p className="text-sm">Selecciona los filtros y genera el reporte</p>
                  </div>
                ) : null}
              </>
            )}

            {/* ==================== BY REGISTER TAB ==================== */}
            {activeTab === 'by_register' && (
              <>
                {byRegisterReport ? (
                  <>
                    {/* Summary Cards */}
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${byRegisterReport.cash_register.type === 'minor' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
                      {byRegisterReport.cash_register.type === 'minor' && (
                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-500/100/10">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Sesiones</p>
                                <p className="text-xl font-semibold text-blue-600">{byRegisterReport.sessions_count}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/100/10">
                              <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Ingresos</p>
                              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(byRegisterReport.total_income)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/100/10">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Egresos</p>
                              <p className="text-xl font-semibold text-red-600">{formatCurrency(byRegisterReport.total_expense)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/100/10">
                              <ArrowUpRight className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Transf. Enviadas</p>
                              <p className="text-xl font-semibold text-amber-600">{formatCurrency(byRegisterReport.total_transfers_sent)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/100/10">
                              <ArrowDownRight className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Transf. Recibidas</p>
                              <p className="text-xl font-semibold text-purple-600">{formatCurrency(byRegisterReport.total_transfers_received)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sessions Table */}
                    {byRegisterReport.cash_register.type === 'minor' && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Sesiones</h3>
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Apertura</TableHead>
                                <TableHead>Cierre</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Saldo Inicial</TableHead>
                                <TableHead className="text-right">Saldo Final</TableHead>
                                <TableHead className="text-right">Ingresos</TableHead>
                                <TableHead className="text-right">Egresos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {byRegisterReport.sessions.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                                    No hay sesiones para mostrar.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                byRegisterReport.sessions.map((session, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-sm">{session.session_number}</TableCell>
                                    <TableCell className="text-sm">{formatDateTime(session.opened_at)}</TableCell>
                                    <TableCell className="text-sm">{session.closed_at ? formatDateTime(session.closed_at) : '-'}</TableCell>
                                    <TableCell>
                                      <Badge className={session.status === 'open' ? 'bg-emerald-500/100/10 text-emerald-600' : 'bg-muted/500/10 text-muted-foreground'}>
                                        {session.status === 'open' ? 'Abierta' : 'Cerrada'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(session.opening_balance)}</TableCell>
                                    <TableCell className="text-right">
                                      {session.closing_balance !== undefined ? formatCurrency(session.closing_balance) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-600 font-medium">
                                      {formatCurrency(session.total_income)}
                                    </TableCell>
                                    <TableCell className="text-right text-red-600 font-medium">
                                      {formatCurrency(session.total_expense)}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Transactions Table */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Detalle de Transacciones</h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha/Hora</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {!byRegisterReport.transactions || byRegisterReport.transactions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                                  No hay transacciones para mostrar.
                                </TableCell>
                              </TableRow>
                            ) : (
                              byRegisterReport.transactions.map((tx: any, index: number) => {
                                const isIncome = tx.type === 'income' || tx.type === 'transfer_in';
                                return (
                                  <TableRow key={index}>
                                    <TableCell className="text-sm">{formatDateTime(tx.date)}</TableCell>
                                    <TableCell>
                                      <Badge className={typeColors[tx.type] || typeColors.income}>
                                        {typeLabels[tx.type] || tx.type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {tx.concept}
                                      {tx.ref_number && (
                                        <button
                                          onClick={() => navigateToReference(tx)}
                                          className="ml-2 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                                        >
                                          ({tx.ref_number})
                                        </button>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{tx.payment_method}</TableCell>
                                    <TableCell className={`text-right font-medium ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </TableCell>
                                    <TableCell>
                                      {tx.ref_summary && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setPreviewData(tx)}
                                        >
                                          <Eye className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-40" />
                    <p className="text-lg font-medium">Sin datos para mostrar</p>
                    <p className="text-sm">Selecciona los filtros y genera el reporte</p>
                  </div>
                ) : null}
              </>
            )}

            {/* ==================== GLOBAL TAB ==================== */}
            {activeTab === 'global' && (
              <>
                {globalReport ? (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/100/10">
                              <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Ingresos</p>
                              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(globalReport.total_income)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/100/10">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Egresos</p>
                              <p className="text-xl font-semibold text-red-600">{formatCurrency(globalReport.total_expense)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Flujo Neto</p>
                              <p className={`text-xl font-semibold ${globalReport.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(globalReport.net_cash_flow)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* By Branch Table */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Por Sucursal</h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sucursal</TableHead>
                              <TableHead className="text-right">Total Ingresos</TableHead>
                              <TableHead className="text-right">Total Egresos</TableHead>
                              <TableHead className="text-right">Flujo Neto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {globalReport.by_branch.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                                  No hay datos por sucursal para mostrar.
                                </TableCell>
                              </TableRow>
                            ) : (
                              globalReport.by_branch.map((branch) => (
                                <TableRow key={branch.branch_id}>
                                  <TableCell className="font-medium">{branch.branch_name}</TableCell>
                                  <TableCell className="text-right text-emerald-600 font-medium">
                                    {formatCurrency(branch.total_income)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 font-medium">
                                    {formatCurrency(branch.total_expense)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(branch.net_cash_flow)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* By Payment Method Table */}
                    <div>
                      <h3 className="text-lg font-medium mb-3">Por Método de Pago</h3>
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Método de Pago</TableHead>
                              <TableHead className="text-right">Total Ingresos</TableHead>
                              <TableHead className="text-right">Total Egresos</TableHead>
                              <TableHead className="text-right">Monto Neto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {globalReport.by_payment_method.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-10">
                                  No hay datos por método de pago para mostrar.
                                </TableCell>
                              </TableRow>
                            ) : (
                              globalReport.by_payment_method.map((method) => (
                                <TableRow key={method.payment_method_id}>
                                  <TableCell className="font-medium">{method.payment_method_name}</TableCell>
                                  <TableCell className="text-right text-emerald-600 font-medium">
                                    {formatCurrency(method.total_income)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 font-medium">
                                    {formatCurrency(method.total_expense)}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(method.net_amount)}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-40" />
                    <p className="text-lg font-medium">Sin datos para mostrar</p>
                    <p className="text-sm">Selecciona los filtros y genera el reporte</p>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewData?.ref_type === 'sale' ? (
                <>
                  <div className="h-8 w-8 rounded-full bg-green-500/15 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <span className="block">Factura</span>
                    <button
                      onClick={() => navigateToReference(previewData)}
                      className="text-sm font-normal text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {previewData?.ref_summary?.number}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 rounded-full bg-orange-500/15 flex items-center justify-center">
                    <Package className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="block">Compra</span>
                    <button
                      onClick={() => navigateToReference(previewData)}
                      className="text-sm font-normal text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {previewData?.ref_summary?.number}
                    </button>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewData?.ref_summary && (
            <div className="space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {previewData.ref_type === 'sale' ? (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs">Cliente</p>
                      <p className="font-medium">{previewData.ref_summary.client_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Documento</p>
                      <p className="font-medium">{previewData.ref_summary.client_document}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Vendedor</p>
                      <p className="font-medium">{previewData.ref_summary.seller_name}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs">Proveedor</p>
                      <p className="font-medium">{previewData.ref_summary.supplier_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">NIT</p>
                      <p className="font-medium">{previewData.ref_summary.supplier_tax_id}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Fecha</p>
                  <p className="font-medium">
                    {previewData.ref_summary.date ? formatDate(previewData.ref_summary.date) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Items</p>
                  <p className="font-medium">{previewData.ref_summary.items_count} producto(s)</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">Estado pago:</span>
                {getPaymentStatusBadge(previewData.ref_summary.payment_status)}
              </div>

              {/* Financial summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(previewData.ref_summary.subtotal)}</span>
                </div>
                {previewData.ref_summary.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuestos</span>
                    <span>{formatCurrency(previewData.ref_summary.tax)}</span>
                  </div>
                )}
                {previewData.ref_summary.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="text-red-600">-{formatCurrency(previewData.ref_summary.discount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(previewData.ref_summary.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagado</span>
                  <span className="text-green-600 font-medium">{formatCurrency(previewData.ref_summary.paid)}</span>
                </div>
                {previewData.ref_summary.balance > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saldo pendiente</span>
                    <span className="text-red-600 font-medium">{formatCurrency(previewData.ref_summary.balance)}</span>
                  </div>
                )}
              </div>

              {/* Action button */}
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigateToReference(previewData)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver {previewData.ref_type === 'sale' ? 'factura' : 'compra'} completa
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
