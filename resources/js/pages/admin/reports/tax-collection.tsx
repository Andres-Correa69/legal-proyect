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
import {
  reportsApi,
  type TaxCollectionReport,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Percent,
  DollarSign,
  FileText,
  Calculator,
  FileSpreadsheet,
  Search,
  Loader2,
  BarChart3,
  Package,
  CalendarIcon,
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = ["#3b82f6", "#16a34a", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#8b5cf6"];

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

export default function TaxCollectionReportPage() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("sales.view", user);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<TaxCollectionReport | null>(null);

  const { toast } = useToast();
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [filters, setFilters] = useState(() => ({
    ...getDateRange("15d"),
    date_range: "15d",
  }));

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
    }
  }, [canView]);

  if (!canView) return null;

  const taxRatePieData = useMemo(() => {
    if (!report) return [];
    return report.by_tax_rate.map(t => ({
      name: t.tax_rate + "%",
      value: t.tax_collected,
    }));
  }, [report]);

  const taxRateBarData = useMemo(() => {
    if (!report) return [];
    return report.by_tax_rate.map(t => ({
      name: t.tax_rate + "%",
      base: t.taxable_base,
      iva: t.tax_collected,
    }));
  }, [report]);

  const monthlyTaxData = useMemo(() => {
    if (!report) return [];
    return report.monthly.map(m => ({
      name: m.period,
      base: m.taxable_base,
      iva: m.tax_collected,
    }));
  }, [report]);

  const handleExportPdf = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Capturando gráficas y construyendo tablas." });

      const { toJpeg } = await import('html-to-image');
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
      const generatedDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
      pdf.text('Informe de Recaudo de Impuestos', rightX, currentY + 9, { align: 'right' });

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

      // ── Summary Cards ──
      const cardData = [
        { label: 'BASE GRAVABLE', value: formatCurrency(report.totals.taxable_base), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'IVA RECAUDADO', value: formatCurrency(report.totals.tax_collected), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: 'TOTAL CON IVA', value: formatCurrency(report.totals.total_with_tax), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
        { label: 'TARIFA EFECTIVA', value: `${report.totals.effective_rate}%`, bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
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

      // ── Charts ──
      const chartsContainer = document.getElementById('tax-charts-container');
      if (chartsContainer) {
        try {
          const dataUrl = await toJpeg(chartsContainer, { pixelRatio: 1.5, quality: 0.8, backgroundColor: '#ffffff', skipFonts: true });
          const img = new Image();
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
          const imgWidth = contentWidth;
          const imgHeight = (img.height * imgWidth) / img.width;
          if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.addImage(dataUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 4;
        } catch (e) {
          console.warn('Could not capture charts container:', e);
          // Fallback: capture individually
          for (const key of ['tax-pie', 'tax-bar', 'tax-area']) {
            const el = chartRefs.current[key];
            if (!el) continue;
            try {
              const dataUrl = await toJpeg(el, { pixelRatio: 1.5, quality: 0.8, backgroundColor: '#ffffff', skipFonts: true });
              const img = new Image();
              await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
              const imgWidth = contentWidth;
              const imgHeight = (img.height * imgWidth) / img.width;
              if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
              pdf.addImage(dataUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 4;
            } catch (e2) { console.warn('Could not capture chart:', key, e2); }
          }
        }
      }

      // ── By Tax Rate Table ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Por Tarifa de IVA', margin + 4, currentY + 4.8);
      currentY += 9;

      const taxRateHead = [['Tarifa IVA', 'Base Gravable', 'IVA Recaudado', 'Total', '# Facturas']];
      const taxRateBody = report.by_tax_rate.map(item => [
        `${item.tax_rate}%`,
        formatCurrency(item.taxable_base),
        formatCurrency(item.tax_collected),
        formatCurrency(item.total_with_tax),
        String(item.sales_count),
      ]);
      taxRateBody.push([
        'TOTALES',
        formatCurrency(report.totals.taxable_base),
        formatCurrency(report.totals.tax_collected),
        formatCurrency(report.totals.total_with_tax),
        '',
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: taxRateHead,
        body: taxRateBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.row.index === taxRateBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });
      currentY = (pdf as any).lastAutoTable.finalY + 6;

      // ── Monthly Table ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Desglose Mensual', margin + 4, currentY + 4.8);
      currentY += 9;

      const monthlyHead = [['Periodo', 'Base Gravable', 'IVA Recaudado', 'Total']];
      const monthlyBody = report.monthly.map(item => [
        item.period,
        formatCurrency(item.taxable_base),
        formatCurrency(item.tax_collected),
        formatCurrency(item.total_with_tax),
      ]);
      monthlyBody.push([
        'TOTALES',
        formatCurrency(report.totals.taxable_base),
        formatCurrency(report.totals.tax_collected),
        formatCurrency(report.totals.total_with_tax),
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: monthlyHead,
        body: monthlyBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          if (data.row.index === monthlyBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Recaudo_Impuestos_${filters.date_from}_${filters.date_to}.pdf`);
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
      const totalCols = 5;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      // ── Report header ──
      rows.push([`INFORME DE RECAUDO DE IMPUESTOS — ${companyName}`, '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Periodo: ${filters.date_from} a ${filters.date_to}`, '', '', '', '']);
      row++;

      // ── Summary row ──
      rows.push(['', '', '', '', '']);
      row++;
      rows.push([
        'RESUMEN',
        `Base: ${formatCurrency(report.totals.taxable_base)}`,
        `IVA: ${formatCurrency(report.totals.tax_collected)}`,
        `Total: ${formatCurrency(report.totals.total_with_tax)}`,
        `Tarifa: ${report.totals.effective_rate}%`,
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '']);
      row++;

      // ── By Tax Rate section ──
      rows.push(['POR TARIFA DE IVA', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['Tarifa IVA', 'Base Gravable', 'IVA Recaudado', 'Total', '# Facturas']);
      columnHeaderRows.push(row);
      row++;
      report.by_tax_rate.forEach(item => {
        rows.push([
          `${item.tax_rate}%`,
          formatCurrency(item.taxable_base),
          formatCurrency(item.tax_collected),
          formatCurrency(item.total_with_tax),
          item.sales_count,
        ]);
        row++;
      });
      // Tax rate totals
      const taxRateTotalsRow = row;
      rows.push([
        'TOTALES',
        formatCurrency(report.totals.taxable_base),
        formatCurrency(report.totals.tax_collected),
        formatCurrency(report.totals.total_with_tax),
        '',
      ]);
      row++;
      rows.push(['', '', '', '', '']);
      row++;

      // ── Monthly section ──
      rows.push(['DESGLOSE MENSUAL', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['Periodo', 'Base Gravable', 'IVA Recaudado', 'Total', '']);
      columnHeaderRows.push(row);
      row++;
      report.monthly.forEach(item => {
        rows.push([
          item.period,
          formatCurrency(item.taxable_base),
          formatCurrency(item.tax_collected),
          formatCurrency(item.total_with_tax),
          '',
        ]);
        row++;
      });
      // Monthly totals
      const monthlyTotalsRow = row;
      rows.push([
        'TOTALES',
        formatCurrency(report.totals.taxable_base),
        formatCurrency(report.totals.tax_collected),
        formatCurrency(report.totals.total_with_tax),
        '',
      ]);
      row++;

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      ];

      const borderStyle = { style: 'thin', color: { rgb: 'E5E7EB' } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

      // Apply styles
      for (let R = 0; R < rows.length; R++) {
        for (let C = 0; C < totalCols; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };

          ws[addr].s = { border: thinBorder };

          // Section headers (dark indigo bg, white text)
          if (sectionHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '4F46E5' } },
              alignment: { horizontal: 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Column headers (gray bg, bold, centered)
          if (columnHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '374151' } },
              fill: { fgColor: { rgb: 'E5E7EB' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Period subtitle row
          if (R === 1) {
            ws[addr].s = {
              font: { sz: 10, color: { rgb: '6B7280' } },
              alignment: { horizontal: 'left' },
              border: thinBorder,
            };
          }

          // Totals rows (light indigo bg, bold)
          if (R === taxRateTotalsRow || R === monthlyTotalsRow) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '312E81' } },
              fill: { fgColor: { rgb: 'EEF2FF' } },
              alignment: { horizontal: C >= 1 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Right-align number columns for data rows
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== taxRateTotalsRow && R !== monthlyTotalsRow && C >= 1) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recaudo Impuestos');
      XLSX.writeFile(wb, `Recaudo_Impuestos_${filters.date_from}_${filters.date_to}.xlsx`);
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
      const data = await reportsApi.taxCollection({
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

  return (
    <AppLayout title="Recaudo de Impuestos">
      <Head title="Recaudo de Impuestos" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-500/10 text-blue-600">
                  <Percent className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Recaudo de Impuestos</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Resumen del IVA recaudado en ventas, desglosado por tarifa y periodo</p>
                </div>
              </div>
              {report && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={exporting}
                  >
                    <FileText className="h-4 w-4 mr-1" />PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={exporting}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-end gap-4 mt-4">
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
              <Button
                onClick={loadReport}
                disabled={loading}
                className="bg-[#2463eb] hover:bg-[#2463eb]/90"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Generar Reporte
              </Button>
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

          {/* Summary Cards */}
          {report && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-emerald-500/15 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Base Gravable</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(report.totals.taxable_base)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">IVA Recaudado</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(report.totals.tax_collected)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <Calculator className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total con IVA</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(report.totals.total_with_tax)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-500/15 p-2 rounded-lg">
                      <Percent className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Tarifa Efectiva</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {report.totals.effective_rate}%
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <>
              {/* Charts */}
              <div id="tax-charts-container" className="grid gap-4 md:grid-cols-3">
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['tax-pie'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribución por Tarifa IVA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={taxRatePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                          {taxRatePieData.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {taxRatePieData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['tax-bar'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Base Gravable vs IVA por Tarifa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={taxRateBarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="base" fill="#3b82f6" name="Base Gravable" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="iva" fill="#16a34a" name="IVA Recaudado" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['tax-area'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evolución Mensual del IVA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={monthlyTaxData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Base Gravable" />
                        <Area type="monotone" dataKey="iva" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} name="IVA Recaudado" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* By Tax Rate Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <CardTitle>Desglose por Tarifa de IVA</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.by_tax_rate.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron datos en el periodo seleccionado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tarifa IVA</TableHead>
                            <TableHead className="text-right">Base Gravable</TableHead>
                            <TableHead className="text-right">IVA Recaudado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right"># Facturas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.by_tax_rate.map((item) => (
                            <TableRow key={item.tax_rate}>
                              <TableCell className="font-medium">
                                {item.tax_rate}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.taxable_base)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(item.tax_collected)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.total_with_tax)}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.sales_count.toLocaleString("es-CO")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.taxable_base)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.tax_collected)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_with_tax)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <CardTitle>Desglose Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.monthly.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron datos mensuales</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-right">Base Gravable</TableHead>
                            <TableHead className="text-right">IVA Recaudado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.monthly.map((item) => (
                            <TableRow key={`${item.year}-${item.month}`}>
                              <TableCell className="font-medium">
                                {item.period}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.taxable_base)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600">
                                {formatCurrency(item.tax_collected)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.total_with_tax)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.taxable_base)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.tax_collected)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_with_tax)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty state when no report yet */}
          {!report && !loading && (
            <Card className="shadow-xl border border-border">
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Selecciona un periodo y genera el reporte</p>
                  <p className="text-sm">Los resultados aparecerán aquí con gráficas y desglose por tarifa y periodo</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
