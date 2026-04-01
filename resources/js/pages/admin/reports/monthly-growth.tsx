import { Head, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  reportsApi,
  type MonthlyGrowthReport,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Hash,
  FileText,
  FileSpreadsheet,
  Search,
  Loader2,
  Package,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function MonthlyGrowthReport() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("sales.view", user);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<MonthlyGrowthReport | null>(null);

  const { toast } = useToast();
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());

  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
    }
  }, [canView]);

  if (!canView) return null;

  const loadReport = async () => {
    try {
      setLoading(true);
      setGeneralError("");
      const data = await reportsApi.monthlyGrowth({ year: parseInt(year) });
      setReport(data);
    } catch (error: any) {
      console.error("Error loading report:", error);
      setGeneralError(error.message || "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Capturando graficas y construyendo tablas." });

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
          pdf.text(`${companyName} — Sistema de Gestion`, pageWidth / 2, footerY + 4, { align: 'center' });
          pdf.setTextColor(176, 181, 191);
          pdf.text('Desarrollado por Legal Sistema · www.legalsistema.co', pageWidth / 2, footerY + 7, { align: 'center' });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Pagina ${i} de ${pages}`, pageWidth / 2, footerY + 10, { align: 'center' });
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
      pdf.text(`Crecimiento Mensual ${year}`, rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Ano ${year} vs ${parseInt(year) - 1}`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // Summary Cards
      const cardData = [
        { label: `TOTAL ${report.year}`, value: formatCurrency(report.totals.year_total), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: `TOTAL ${report.year - 1}`, value: formatCurrency(report.totals.prev_year_total), bg: [238, 242, 255], border: [199, 210, 254], color: [107, 114, 128] },
        { label: `VENTAS ${report.year}`, value: String(report.totals.year_sales_count), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
        { label: 'CRECIMIENTO ANUAL', value: `${report.totals.year_growth > 0 ? '+' : ''}${report.totals.year_growth}%`, bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
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

      // Charts
      const chartsContainer = document.getElementById('growth-charts-container');
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
          for (const key of ['bar-chart', 'growth-line', 'cumulative-area']) {
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

      // Detail Table
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Detalle Mensual', margin + 4, currentY + 4.8);
      currentY += 9;

      const tableHead = [['Mes', `# Ventas ${report.year}`, `Monto ${report.year}`, 'Ticket Prom.', `# Ventas ${report.year - 1}`, `Monto ${report.year - 1}`, 'Crecimiento']];
      const tableBody = report.months.map(m => [
        m.month_name,
        String(m.sales_count),
        formatCurrency(m.total_amount),
        m.sales_count > 0 ? formatCurrency(m.avg_ticket) : '-',
        String(m.prev_year_sales_count),
        formatCurrency(m.prev_year_amount),
        (m.total_amount > 0 || m.prev_year_amount > 0) ? `${m.growth_percent > 0 ? '+' : ''}${m.growth_percent}%` : '-',
      ]);
      tableBody.push([
        'TOTALES',
        String(report.totals.year_sales_count),
        formatCurrency(report.totals.year_total),
        '',
        String(report.totals.prev_year_sales_count),
        formatCurrency(report.totals.prev_year_total),
        `${report.totals.year_growth > 0 ? '+' : ''}${report.totals.year_growth}%`,
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
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Crecimiento_Mensual_${year}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargo correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, year, user, toast]);

  const handleExportExcel = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      const XLSX = await import('xlsx-js-style');

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 7;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      // Report header
      rows.push([`CRECIMIENTO MENSUAL ${year} — ${companyName}`, '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Comparativa: ${year} vs ${parseInt(year) - 1}`, '', '', '', '', '', '']);
      row++;

      // Summary row
      rows.push(['', '', '', '', '', '', '']);
      row++;
      rows.push([
        'RESUMEN',
        `Total ${report.year}: ${formatCurrency(report.totals.year_total)}`,
        '',
        `Total ${report.year - 1}: ${formatCurrency(report.totals.prev_year_total)}`,
        '',
        `Ventas: ${report.totals.year_sales_count}`,
        `Crecimiento: ${report.totals.year_growth > 0 ? '+' : ''}${report.totals.year_growth}%`,
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '', '', '']);
      row++;

      // Detail section
      rows.push(['DETALLE MENSUAL', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['Mes', `# Ventas ${report.year}`, `Monto ${report.year}`, 'Ticket Prom.', `# Ventas ${report.year - 1}`, `Monto ${report.year - 1}`, 'Crecimiento']);
      columnHeaderRows.push(row);
      row++;
      report.months.forEach(m => {
        rows.push([
          m.month_name,
          m.sales_count,
          formatCurrency(m.total_amount),
          m.sales_count > 0 ? formatCurrency(m.avg_ticket) : '-',
          m.prev_year_sales_count,
          formatCurrency(m.prev_year_amount),
          (m.total_amount > 0 || m.prev_year_amount > 0) ? `${m.growth_percent > 0 ? '+' : ''}${m.growth_percent}%` : '-',
        ]);
        row++;
      });
      // Totals row
      const totalsRow = row;
      rows.push([
        'TOTALES',
        report.totals.year_sales_count,
        formatCurrency(report.totals.year_total),
        '',
        report.totals.prev_year_sales_count,
        formatCurrency(report.totals.prev_year_total),
        `${report.totals.year_growth > 0 ? '+' : ''}${report.totals.year_growth}%`,
      ]);
      row++;

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws['!cols'] = [
        { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
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

          // Totals row (light indigo bg, bold)
          if (R === totalsRow) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: '312E81' } },
              fill: { fgColor: { rgb: 'EEF2FF' } },
              alignment: { horizontal: C >= 1 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Right-align number columns for data rows
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== totalsRow && C >= 1) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Crecimiento Mensual');
      XLSX.writeFile(wb, `Crecimiento_Mensual_${year}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargo correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, year, user, toast]);

  const getGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return (
        <Badge className="bg-green-600 text-white">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{growth}%
        </Badge>
      );
    }
    if (growth < 0) {
      return (
        <Badge className="bg-red-600 text-white">
          <TrendingDown className="h-3 w-3 mr-1" />
          {growth}%
        </Badge>
      );
    }
    return <Badge variant="outline">0%</Badge>;
  };

  const barData = useMemo(() => {
    if (!report) return [];
    return report.months.map(m => ({
      name: m.month_name.substring(0, 3),
      actual: m.total_amount,
      anterior: m.prev_year_amount,
    }));
  }, [report]);

  const growthData = useMemo(() => {
    if (!report) return [];
    return report.months.map(m => ({
      name: m.month_name.substring(0, 3),
      growth: m.growth_percent,
    }));
  }, [report]);

  const cumulativeData = useMemo(() => {
    if (!report) return [];
    let cumActual = 0, cumPrev = 0;
    return report.months.map(m => {
      cumActual += m.total_amount;
      cumPrev += m.prev_year_amount;
      return { name: m.month_name.substring(0, 3), actual: cumActual, anterior: cumPrev };
    });
  }, [report]);

  return (
    <AppLayout title="Crecimiento Mensual">
      <Head title="Crecimiento Mensual" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <LineChartIcon className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Crecimiento Mensual</h1>
                  <p className="text-sm text-muted-foreground">Comparativa de ventas mes a mes con el ano anterior</p>
                </div>
              </div>
              {report && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={exporting || loading}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={exporting || loading}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                    Excel
                  </Button>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-end gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Año</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total {report.year}</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(report.totals.year_total)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.totals.year_sales_count} ventas en el ano
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total {report.year - 1}</h3>
                  </div>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {formatCurrency(report.totals.prev_year_total)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <Hash className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Ventas {report.year}</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {report.totals.year_sales_count.toLocaleString("es-CO")}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-500/15 p-2 rounded-lg">
                      <LineChartIcon className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Crecimiento Anual</h3>
                  </div>
                  <div className="text-2xl font-bold">
                    {getGrowthBadge(report.totals.year_growth)}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <>
              {/* Charts */}
              <div id="growth-charts-container" className="grid gap-4 md:grid-cols-3">
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['bar-chart'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ventas: {report.year} vs {report.year - 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="actual" fill="#3b82f6" name={String(report.year)} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="anterior" fill="#94a3b8" name={String(report.year - 1)} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['growth-line'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tendencia de Crecimiento %</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={growthData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="growth" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Crecimiento %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['cumulative-area'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Acumulado de Ventas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={cumulativeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name={String(report.year)} />
                        <Area type="monotone" dataKey="anterior" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} name={String(report.year - 1)} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <CardTitle>Detalle Mensual</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.months.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron datos para el ano seleccionado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead className="text-right"># Ventas {report.year}</TableHead>
                            <TableHead className="text-right">Monto {report.year}</TableHead>
                            <TableHead className="text-right">Ticket Prom.</TableHead>
                            <TableHead className="text-right"># Ventas {report.year - 1}</TableHead>
                            <TableHead className="text-right">Monto {report.year - 1}</TableHead>
                            <TableHead className="text-center">Crecimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.months.map((m) => (
                            <TableRow key={m.month}>
                              <TableCell className="font-medium">
                                {m.month_name}
                              </TableCell>
                              <TableCell className="text-right">
                                {m.sales_count.toLocaleString("es-CO")}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(m.total_amount)}
                              </TableCell>
                              <TableCell className="text-right">
                                {m.sales_count > 0 ? formatCurrency(m.avg_ticket) : "-"}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {m.prev_year_sales_count.toLocaleString("es-CO")}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(m.prev_year_amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {m.total_amount > 0 || m.prev_year_amount > 0
                                  ? getGrowthBadge(m.growth_percent)
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              {report.totals.year_sales_count.toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.year_total)}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right text-muted-foreground">
                              {report.totals.prev_year_sales_count.toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(report.totals.prev_year_total)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getGrowthBadge(report.totals.year_growth)}
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
                  <LineChartIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Selecciona el ano y genera el reporte</p>
                  <p className="text-sm">Los resultados apareceran aqui con graficas y detalle mensual</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
