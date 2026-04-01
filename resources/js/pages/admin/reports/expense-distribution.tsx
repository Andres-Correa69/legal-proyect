import { Head, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import {
  reportsApi,
  type ExpenseDistributionReport,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingDown,
  DollarSign,
  Receipt,
  Calculator,
  FileText,
  FileSpreadsheet,
  Search,
  Loader2,
  CalendarIcon,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = ["#3b82f6", "#16a34a", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#8b5cf6", "#64748b", "#14b8a6"];

function getDateRange(preset: string): { date_from: string; date_to: string } {
  const today = new Date();
  const toStr = today.toISOString().split("T")[0];
  const from = new Date(today);
  switch (preset) {
    case "15d": from.setDate(from.getDate() - 15); break;
    case "1m": from.setMonth(from.getMonth() - 1); break;
    case "2m": from.setMonth(from.getMonth() - 2); break;
    case "3m": from.setMonth(from.getMonth() - 3); break;
    default: return { date_from: "", date_to: "" };
  }
  return { date_from: from.toISOString().split("T")[0], date_to: toStr };
}

export default function ExpenseDistributionPage() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("sales.view", user);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<ExpenseDistributionReport | null>(null);

  const { toast } = useToast();
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [filters, setFilters] = useState(() => ({
    ...getDateRange("1m"),
    date_range: "1m",
  }));

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
    }
  }, [canView]);

  if (!canView) return null;

  const handleExportPdf = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Capturando gráficas y construyendo tablas." });

      const { toJpeg } = await import('html-to-image');
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
      const generatedDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
      pdf.text('Distribución de Gastos por Factura', rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${filters.date_from} a ${filters.date_to}`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // Summary Cards
      const cardData = [
        { label: 'TOTAL GASTOS', value: formatCurrency(report.totals.total_expenses), bg: [254, 242, 242], border: [252, 165, 165], color: [220, 38, 38] },
        { label: 'TOTAL FACTURADO', value: formatCurrency(report.totals.total_invoices_effective), bg: [236, 253, 245], border: [167, 243, 208], color: [22, 163, 74] },
        { label: 'FACTURAS', value: String(report.totals.invoice_count), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: 'PROMEDIO GASTO/FACTURA', value: formatCurrency(report.totals.avg_expense_per_invoice), bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
      ];
      const cardW = (contentWidth - 6) / 4;
      cardData.forEach((card, idx) => {
        const x = margin + idx * (cardW + 2);
        pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
        pdf.roundedRect(x, currentY, cardW, 14, 1.5, 1.5, 'FD');
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 114, 128);
        pdf.text(card.label, x + cardW / 2, currentY + 5, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
      });
      currentY += 20;

      // Bar chart - capture from DOM
      const chartHalfWidth = (contentWidth - 4) / 2;
      const barEl = chartRefs.current['bar'];
      let barChartHeight = 0;
      if (barEl) {
        try {
          const dataUrl = await toJpeg(barEl, { pixelRatio: 2, quality: 0.85, backgroundColor: '#ffffff', skipFonts: true });
          const img = new Image();
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
          const imgWidth = chartHalfWidth;
          const imgHeight = (img.height * imgWidth) / img.width;
          if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.addImage(dataUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
          barChartHeight = imgHeight;
        } catch (e) {
          console.warn('Could not capture bar chart:', e);
        }
      }

      // Pie chart - draw natively in PDF (html-to-image clips SVG labels)
      if (pieData.length > 0) {
        const pieX = margin + chartHalfWidth + 4;
        const pieBoxW = chartHalfWidth;
        const pieBoxH = barChartHeight || 80;

        // Title
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text('Distribución Porcentual', pieX + 6, currentY + 8);

        const centerX = pieX + pieBoxW * 0.38;
        const centerY2 = currentY + pieBoxH * 0.52;
        const radius = Math.min(pieBoxW, pieBoxH) * 0.28;

        const total = pieData.reduce((s, d) => s + d.value, 0);
        let startAngle = -Math.PI / 2;

        const colors = CHART_COLORS;
        const slices: { midAngle: number; color: number[]; name: string; pct: number }[] = [];

        pieData.forEach((slice, idx) => {
          const pct = total > 0 ? slice.value / total : 0;
          const sweepAngle = pct * 2 * Math.PI;
          const endAngle = startAngle + sweepAngle;

          // Draw slice
          const c = colors[idx % colors.length];
          const r = parseInt(c.slice(1, 3), 16);
          const g = parseInt(c.slice(3, 5), 16);
          const b = parseInt(c.slice(5, 7), 16);
          pdf.setFillColor(r, g, b);

          // Build arc as line segments and draw filled polygon
          const steps = Math.max(Math.ceil(sweepAngle / 0.05), 2);
          const lineSegments: [number, number][] = [];
          // First point on arc relative to center
          const firstArcX = radius * Math.cos(startAngle);
          const firstArcY = radius * Math.sin(startAngle);
          lineSegments.push([firstArcX, firstArcY]);
          // Arc segments
          for (let i = 1; i <= steps; i++) {
            const a = startAngle + (sweepAngle * i) / steps;
            const prevA = startAngle + (sweepAngle * (i - 1)) / steps;
            lineSegments.push([
              radius * Math.cos(a) - radius * Math.cos(prevA),
              radius * Math.sin(a) - radius * Math.sin(prevA),
            ]);
          }
          // Back to center
          const lastA = startAngle + sweepAngle;
          lineSegments.push([
            -radius * Math.cos(lastA),
            -radius * Math.sin(lastA),
          ]);

          pdf.setDrawColor(255, 255, 255);
          pdf.setLineWidth(0.3);
          pdf.lines(lineSegments, centerX, centerY2, [1, 1], 'FD', false);

          const midAngle = startAngle + sweepAngle / 2;
          slices.push({ midAngle, color: [r, g, b], name: slice.name, pct: pct * 100 });

          startAngle = endAngle;
        });

        // Draw label lines and text
        slices.forEach((s) => {
          const lineStart = radius + 2;
          const lineEnd = radius + 10;
          const textDist = radius + 12;

          const x1 = centerX + lineStart * Math.cos(s.midAngle);
          const y1 = centerY2 + lineStart * Math.sin(s.midAngle);
          const x2 = centerX + lineEnd * Math.cos(s.midAngle);
          const y2 = centerY2 + lineEnd * Math.sin(s.midAngle);

          // Line
          pdf.setDrawColor(150, 150, 150);
          pdf.setLineWidth(0.2);
          pdf.line(x1, y1, x2, y2);

          // Text
          const tx = centerX + textDist * Math.cos(s.midAngle);
          const ty = centerY2 + textDist * Math.sin(s.midAngle);
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(s.color[0], s.color[1], s.color[2]);
          const label = `${s.name} (${s.pct.toFixed(1)}%)`;
          const align = Math.cos(s.midAngle) < 0 ? 'right' : 'left';
          pdf.text(label, tx, ty + 1, { align });
        });

        currentY += barChartHeight + 4;
      } else {
        currentY += barChartHeight + 4;
      }

      // Expenses Table
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Detalle de Gastos', margin + 4, currentY + 4.8);
      currentY += 9;

      const expHead = [['# Pago', 'Fecha', 'Monto', 'Método de Pago', 'Caja', 'Concepto', 'Creado por']];
      const expBody = report.expenses.map(item => [
        item.payment_number,
        new Date(item.payment_date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: 'numeric' }),
        formatCurrency(item.amount),
        item.payment_method_name || '-',
        item.cash_register_name || '-',
        item.concept || item.notes || '-',
        item.created_by_name || '-',
      ]);
      expBody.push(['TOTALES', '', formatCurrency(report.totals.total_expenses), '', '', '', '']);

      autoTable(pdf, {
        startY: currentY,
        head: expHead,
        body: expBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 6.5, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: { 2: { halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.row.index === expBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });
      currentY = (pdf as any).lastAutoTable.finalY + 8;

      // Distribution Table
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Distribución por Factura', margin + 4, currentY + 4.8);
      currentY += 9;

      const distHead = [['# Factura', 'Fecha', 'Cliente', 'Tipo', 'Total Factura', 'Total Efectivo', '% Participación', 'Gasto Asignado']];
      const distBody = report.invoices.map(inv => [
        inv.invoice_number,
        new Date(inv.invoice_date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: 'numeric' }),
        inv.client_name || 'Sin cliente',
        inv.type_label,
        formatCurrency(inv.total_amount),
        formatCurrency(inv.effective_total),
        `${inv.expense_percentage}%`,
        formatCurrency(inv.expense_share),
      ]);
      distBody.push([
        'TOTALES', '', '', '',
        formatCurrency(report.invoices.reduce((s, i) => s + i.total_amount, 0)),
        formatCurrency(report.totals.total_invoices_effective),
        '100%',
        formatCurrency(report.totals.total_expenses),
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: distHead,
        body: distBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 6.5, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.row.index === distBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Distribucion_Gastos_${filters.date_from}_${filters.date_to}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filters, user, toast]);

  const handleExportExcel = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      const XLSX = await import('xlsx-js-style');

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 8;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      // Report header
      rows.push([`DISTRIBUCIÓN DE GASTOS POR FACTURA — ${companyName}`, '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Periodo: ${filters.date_from} a ${filters.date_to}`, '', '', '', '', '', '', '']);
      row++;

      // Summary
      rows.push(['', '', '', '', '', '', '', '']);
      row++;
      rows.push([
        'RESUMEN',
        `Total Gastos: ${formatCurrency(report.totals.total_expenses)}`,
        '',
        `Total Facturado: ${formatCurrency(report.totals.total_invoices_effective)}`,
        '',
        `Facturas: ${report.totals.invoice_count}`,
        '',
        `Promedio: ${formatCurrency(report.totals.avg_expense_per_invoice)}`,
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '', '', '', '']);
      row++;

      // Expenses detail
      rows.push(['DETALLE DE GASTOS', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['# Pago', 'Fecha', 'Monto', 'Método de Pago', 'Caja', 'Concepto', 'Creado por', '']);
      columnHeaderRows.push(row);
      row++;
      report.expenses.forEach(item => {
        rows.push([
          item.payment_number,
          new Date(item.payment_date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: 'numeric' }),
          formatCurrency(item.amount),
          item.payment_method_name || '-',
          item.cash_register_name || '-',
          item.concept || item.notes || '-',
          item.created_by_name || '-',
          '',
        ]);
        row++;
      });
      const expensesTotalsRow = row;
      rows.push(['TOTALES', '', formatCurrency(report.totals.total_expenses), '', '', '', '', '']);
      row++;

      // Spacer
      rows.push(['', '', '', '', '', '', '', '']);
      row++;

      // Distribution table
      rows.push(['DISTRIBUCIÓN POR FACTURA', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['# Factura', 'Fecha', 'Cliente', 'Tipo', 'Total Factura', 'Total Efectivo', '% Participación', 'Gasto Asignado']);
      columnHeaderRows.push(row);
      row++;
      report.invoices.forEach(inv => {
        rows.push([
          inv.invoice_number,
          new Date(inv.invoice_date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: 'numeric' }),
          inv.client_name || 'Sin cliente',
          inv.type_label,
          formatCurrency(inv.total_amount),
          formatCurrency(inv.effective_total),
          `${inv.expense_percentage}%`,
          formatCurrency(inv.expense_share),
        ]);
        row++;
      });
      const distTotalsRow = row;
      rows.push([
        'TOTALES', '', '', '',
        formatCurrency(report.invoices.reduce((s, i) => s + i.total_amount, 0)),
        formatCurrency(report.totals.total_invoices_effective),
        '100%',
        formatCurrency(report.totals.total_expenses),
      ]);
      row++;

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws['!cols'] = [
        { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      ];

      const borderStyle = { style: 'thin', color: { rgb: 'E5E7EB' } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

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

          if (R === expensesTotalsRow || R === distTotalsRow) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '312E81' } },
              fill: { fgColor: { rgb: 'EEF2FF' } },
              alignment: { horizontal: C >= 1 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== expensesTotalsRow && R !== distTotalsRow && (C >= 2 && C !== 3 && C !== 5)) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Distribución Gastos');
      XLSX.writeFile(wb, `Distribucion_Gastos_${filters.date_from}_${filters.date_to}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filters, user, toast]);

  const loadReport = async () => {
    if (!filters.date_from || !filters.date_to) {
      setGeneralError("Debes seleccionar un rango de fechas");
      return;
    }
    try {
      setLoading(true);
      setGeneralError("");
      const data = await reportsApi.expenseDistribution({
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      setReport(data);
    } catch (error: any) {
      console.error("Error loading report:", error);
      setGeneralError(error.message || "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const topInvoicesBarData = useMemo(() => {
    if (!report) return [];
    return report.invoices
      .slice(0, 10)
      .map(inv => ({
        name: inv.invoice_number,
        value: inv.expense_share,
        percentage: inv.expense_percentage,
      }));
  }, [report]);

  const pieData = useMemo(() => {
    if (!report) return [];
    const top = report.invoices.slice(0, 8);
    const rest = report.invoices.slice(8);
    const data = top.map(inv => ({
      name: inv.invoice_number,
      value: inv.expense_share,
    }));
    if (rest.length > 0) {
      data.push({
        name: `Otros (${rest.length})`,
        value: rest.reduce((s, i) => s + i.expense_share, 0),
      });
    }
    return data;
  }, [report]);

  return (
    <AppLayout title="Distribución de Gastos por Factura">
      <Head title="Distribución de Gastos por Factura" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <PieChartIcon className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Distribución de Gastos por Factura</h1>
                  <p className="text-sm text-muted-foreground">Reparto proporcional de gastos según el valor de cada factura</p>
                </div>
              </div>
              {report && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting || loading}>
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting || loading}>
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Periodo</label>
                <Select
                  value={filters.date_range}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setFilters((prev) => ({ ...prev, date_range: value }));
                    } else {
                      const range = getDateRange(value);
                      setFilters((prev) => ({ ...prev, date_range: value, ...range }));
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
              {filters.date_range === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Desde</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !filters.date_from && "text-muted-foreground")}>
                          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                          {filters.date_from ? new Date(filters.date_from + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerReport
                          selected={filters.date_from ? new Date(filters.date_from + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              setFilters({ ...filters, date_from: `${y}-${m}-${d}` });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Hasta</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !filters.date_to && "text-muted-foreground")}>
                          <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                          {filters.date_to ? new Date(filters.date_to + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePickerReport
                          selected={filters.date_to ? new Date(filters.date_to + 'T12:00:00') : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const y = date.getFullYear();
                              const m = String(date.getMonth() + 1).padStart(2, '0');
                              const d = String(date.getDate()).padStart(2, '0');
                              setFilters({ ...filters, date_to: `${y}-${m}-${d}` });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}
              <div className="flex items-end">
                <Button onClick={loadReport} disabled={loading} className="bg-[#2463eb] hover:bg-[#2463eb]/90">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Generar Reporte
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
          {generalError && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">
              {generalError}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          )}

          {/* Summary Cards */}
          {report && !loading && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-red-500/15 p-2 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Gastos</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(report.totals.total_expenses)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {report.totals.expense_count} egresos en el periodo
                    </p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-green-500/15 p-2 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Facturado</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(report.totals.total_invoices_effective)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      total efectivo de facturas
                    </p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-500/15 p-2 rounded-lg">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Facturas</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {report.totals.invoice_count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      facturas en el periodo
                    </p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-amber-500/15 p-2 rounded-lg">
                        <Calculator className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Promedio Gasto/Factura</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(report.totals.avg_expense_per_invoice)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      gasto promedio asignado
                    </p>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              {report.invoices.length > 0 && (
                <div id="distribution-charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card ref={el => { chartRefs.current['bar'] = el; }}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Top 10 Facturas por Gasto Asignado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topInvoicesBarData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                            <Tooltip
                              formatter={(value: any) => [formatCurrency(Number(value)), 'Gasto Asignado']}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card ref={el => { chartRefs.current['pie'] = el; }} style={{ overflow: 'visible' }}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium text-muted-foreground">Distribución Porcentual</CardTitle>
                    </CardHeader>
                    <CardContent style={{ overflow: 'visible' }}>
                      <div className="h-[400px]" style={{ overflow: 'visible' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              outerRadius={75}
                              dataKey="value"
                              label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`}
                              labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                              fontSize={9}
                            >
                              {pieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => [formatCurrency(Number(value)), 'Gasto Asignado']}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Expenses Detail Table */}
              {report.expenses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Detalle de Gastos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-12 px-4"># Pago</TableHead>
                            <TableHead className="h-12 px-4">Fecha</TableHead>
                            <TableHead className="h-12 px-4 text-right">Monto</TableHead>
                            <TableHead className="h-12 px-4">Método de Pago</TableHead>
                            <TableHead className="h-12 px-4">Caja</TableHead>
                            <TableHead className="h-12 px-4">Concepto</TableHead>
                            <TableHead className="h-12 px-4">Creado por</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.expenses.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="p-4 font-mono text-xs">{item.payment_number}</TableCell>
                              <TableCell className="p-4 text-sm">{formatDate(item.payment_date)}</TableCell>
                              <TableCell className="p-4 text-right font-medium text-red-600">{formatCurrency(item.amount)}</TableCell>
                              <TableCell className="p-4 text-sm">{item.payment_method_name || '-'}</TableCell>
                              <TableCell className="p-4 text-sm">{item.cash_register_name || '-'}</TableCell>
                              <TableCell className="p-4 text-sm max-w-[200px] truncate">{item.concept || item.notes || '-'}</TableCell>
                              <TableCell className="p-4 text-sm">{item.created_by_name || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted/50">
                            <TableCell className="p-4 font-bold" colSpan={2}>TOTALES</TableCell>
                            <TableCell className="p-4 text-right font-bold text-red-600">
                              {formatCurrency(report.totals.total_expenses)}
                            </TableCell>
                            <TableCell className="p-4" colSpan={4}></TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distribution Table */}
              {report.invoices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Distribución por Factura</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-12 px-4"># Factura</TableHead>
                            <TableHead className="h-12 px-4">Fecha</TableHead>
                            <TableHead className="h-12 px-4">Cliente</TableHead>
                            <TableHead className="h-12 px-4">Tipo</TableHead>
                            <TableHead className="h-12 px-4 text-right">Total Factura</TableHead>
                            <TableHead className="h-12 px-4 text-right">Total Efectivo</TableHead>
                            <TableHead className="h-12 px-4 text-right">% Participación</TableHead>
                            <TableHead className="h-12 px-4 text-right">Gasto Asignado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.invoices.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="p-4 font-mono text-xs">{inv.invoice_number}</TableCell>
                              <TableCell className="p-4 text-sm">{formatDate(inv.invoice_date)}</TableCell>
                              <TableCell className="p-4 text-sm">{inv.client_name || 'Sin cliente'}</TableCell>
                              <TableCell className="p-4 text-sm">{inv.type_label}</TableCell>
                              <TableCell className="p-4 text-right font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                              <TableCell className="p-4 text-right font-medium">{formatCurrency(inv.effective_total)}</TableCell>
                              <TableCell className="p-4 text-right font-medium text-blue-600">{inv.expense_percentage}%</TableCell>
                              <TableCell className="p-4 text-right font-bold text-red-600">{formatCurrency(inv.expense_share)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-muted/50">
                            <TableCell className="p-4 font-bold" colSpan={4}>TOTALES</TableCell>
                            <TableCell className="p-4 text-right font-bold">
                              {formatCurrency(report.invoices.reduce((s, i) => s + i.total_amount, 0))}
                            </TableCell>
                            <TableCell className="p-4 text-right font-bold">
                              {formatCurrency(report.totals.total_invoices_effective)}
                            </TableCell>
                            <TableCell className="p-4 text-right font-bold text-blue-600">100%</TableCell>
                            <TableCell className="p-4 text-right font-bold text-red-600">
                              {formatCurrency(report.totals.total_expenses)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty state */}
              {report.invoices.length === 0 && report.expenses.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <PieChartIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">Sin datos en el periodo</h3>
                    <p className="text-sm text-muted-foreground">No se encontraron gastos ni facturas en el rango de fechas seleccionado.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Initial state */}
          {!report && !loading && !generalError && (
            <Card>
              <CardContent className="py-12 text-center">
                <PieChartIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Genera un reporte</h3>
                <p className="text-sm text-muted-foreground">Selecciona un rango de fechas y presiona "Generar Reporte" para ver la distribución de gastos por factura.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
