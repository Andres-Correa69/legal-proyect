import { Head, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  type IncomeExpensesReport,
  type IncomeExpenseDetail,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownUp,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  FileSpreadsheet,
  Search,
  Loader2,
  Package,
  BarChart3,
  CalendarIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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

export default function IncomeExpensesReport() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("sales.view", user);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<IncomeExpensesReport | null>(null);

  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [periodDetails, setPeriodDetails] = useState<Record<string, IncomeExpenseDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const loadReport = async () => {
    if (!filters.date_from || !filters.date_to) {
      setGeneralError("Debes seleccionar un rango de fechas");
      return;
    }
    try {
      setLoading(true);
      setGeneralError("");
      setExpandedPeriod(null);
      setPeriodDetails({});
      const data = await reportsApi.incomeExpenses({
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

  const togglePeriod = async (year: number, month: number) => {
    const key = `${year}-${month}`;
    if (expandedPeriod === key) {
      setExpandedPeriod(null);
      return;
    }

    setExpandedPeriod(key);

    if (periodDetails[key]) return;

    try {
      setLoadingDetail(true);
      const data = await reportsApi.incomeExpensesDetail({
        year,
        month,
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      setPeriodDetails((prev) => ({ ...prev, [key]: data }));
    } catch (error: any) {
      console.error("Error loading detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("es-CO", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/15 text-green-700">Pagado</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/15 text-yellow-700">Parcial</Badge>;
      case "pending":
        return <Badge className="bg-red-500/15 text-red-700">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const incExpBarData = useMemo(() => {
    if (!report) return [];
    return report.periods.map((p) => ({
      name: p.period,
      ingresos: p.income,
      egresos: p.expense,
    }));
  }, [report]);

  const netLineData = useMemo(() => {
    if (!report) return [];
    return report.periods.map((p) => ({
      name: p.period,
      neto: p.net,
    }));
  }, [report]);

  const paidData = useMemo(() => {
    if (!report) return [];
    return report.periods.map((p) => ({
      name: p.period,
      recaudado: p.income_paid,
      pagado: p.expense_paid,
    }));
  }, [report]);

  const totalColumns = 9;

  // ── PDF Export ──
  const handleExportPdf = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Capturando graficas y construyendo tablas." });

      const { toJpeg } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const companyName = user.company?.name || "LEGAL SISTEMA";
      const companyTaxId = user.company?.tax_id || "";
      const companyAddress = user.company?.address || "";
      const generatedDate = new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // ── Footer on every page ──
      const addFooters = () => {
        const pages = pdf.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const footerY = pageHeight - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageWidth - margin, footerY);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(156, 163, 175);
          pdf.text(`${companyName} — Sistema de Gestion`, pageWidth / 2, footerY + 4, { align: "center" });
          pdf.setTextColor(176, 181, 191);
          pdf.text("Desarrollado por Legal Sistema · www.legalsistema.co", pageWidth / 2, footerY + 7, { align: "center" });
          pdf.setTextColor(209, 213, 219);
          pdf.text(`Generado el ${generatedDate} | Pagina ${i} de ${pages}`, pageWidth / 2, footerY + 10, { align: "center" });
        }
      };

      const logoDataUrl = await loadPdfLogo(user.company?.logo_url);

      // ── Header ──
      let currentY = margin;
      const logoH = addLogoToPdf(pdf, logoDataUrl, margin, currentY, 12, 40);
      currentY += logoH;
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

      const rightX = pageWidth - margin;
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
      pdf.text("Ingresos y Egresos", rightX, currentY + 9, { align: "right" });

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${filters.date_from} a ${filters.date_to}`, rightX, currentY + 13, { align: "right" });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: "right" });

      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // ── Summary Cards ──
      const cardData = [
        { label: "TOTAL INGRESOS", value: formatCurrency(report.totals.total_income), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: "TOTAL EGRESOS", value: formatCurrency(report.totals.total_expense), bg: [254, 242, 242], border: [254, 202, 202], color: [220, 38, 38] },
        { label: "RESULTADO NETO", value: formatCurrency(report.totals.net), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: "RECAUDADO / PAGADO", value: formatCurrency(report.totals.total_income_paid - report.totals.total_expense_paid), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
      ];
      const cardW = (contentWidth - 6) / 4;
      cardData.forEach((card, idx) => {
        const x = margin + idx * (cardW + 2);
        pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
        pdf.roundedRect(x, currentY, cardW, 14, 1.5, 1.5, "FD");
        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(107, 114, 128);
        pdf.text(card.label, x + cardW / 2, currentY + 5, { align: "center" });
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: "center" });
      });
      currentY += 20;

      // ── Charts ──
      const chartsContainer = document.getElementById("income-expenses-charts-container");
      if (chartsContainer) {
        try {
          const dataUrl = await toJpeg(chartsContainer, { pixelRatio: 1.5, quality: 0.8, backgroundColor: "#ffffff", skipFonts: true });
          const img = new Image();
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
          const imgWidth = contentWidth;
          const imgHeight = (img.height * imgWidth) / img.width;
          if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.addImage(dataUrl, "JPEG", margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 4;
        } catch (e) {
          console.warn("Could not capture charts container:", e);
          for (const key of ["inc-exp-bar", "net-line", "paid-area"]) {
            const el = chartRefs.current[key];
            if (!el) continue;
            try {
              const dataUrl = await toJpeg(el, { pixelRatio: 1.5, quality: 0.8, backgroundColor: "#ffffff", skipFonts: true });
              const img = new Image();
              await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
              const imgWidth = contentWidth;
              const imgHeight = (img.height * imgWidth) / img.width;
              if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
              pdf.addImage(dataUrl, "JPEG", margin, currentY, imgWidth, imgHeight);
              currentY += imgHeight + 4;
            } catch (e2) { console.warn("Could not capture chart:", key, e2); }
          }
        }
      }

      // ── Periods Summary Table ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text("Detalle por Periodo", margin + 4, currentY + 4.8);
      currentY += 9;

      const tableHead = [["Periodo", "# Ventas", "Ingresos", "Recaudado", "# Compras", "Egresos", "Pagado", "Neto"]];
      const tableBody = report.periods.map((p) => [
        p.period,
        String(p.income_count),
        formatCurrency(p.income),
        formatCurrency(p.income_paid),
        String(p.expense_count),
        formatCurrency(p.expense),
        formatCurrency(p.expense_paid),
        formatCurrency(p.net),
      ]);
      tableBody.push([
        "TOTALES",
        String(report.totals.income_count),
        formatCurrency(report.totals.total_income),
        formatCurrency(report.totals.total_income_paid),
        String(report.totals.expense_count),
        formatCurrency(report.totals.total_expense),
        formatCurrency(report.totals.total_expense_paid),
        formatCurrency(report.totals.net),
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: "bold", fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
        },
        didParseCell: (data: any) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Ingresos_Egresos_${filters.date_from}_${filters.date_to}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargo correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filters, user, toast]);

  // ── Excel Export ──
  const handleExportExcel = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      const XLSX = await import("xlsx-js-style");

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 9;

      const companyName = user.company?.name || "LEGAL SISTEMA";

      // ── Report header ──
      rows.push([`INGRESOS Y EGRESOS — ${companyName}`, "", "", "", "", "", "", "", ""]);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Periodo: ${filters.date_from} a ${filters.date_to}`, "", "", "", "", "", "", "", ""]);
      row++;

      // ── Summary row ──
      rows.push(["", "", "", "", "", "", "", "", ""]);
      row++;
      rows.push([
        "RESUMEN",
        `Ingresos: ${formatCurrency(report.totals.total_income)}`,
        "",
        `Egresos: ${formatCurrency(report.totals.total_expense)}`,
        "",
        `Neto: ${formatCurrency(report.totals.net)}`,
        "",
        `Recaudado Neto: ${formatCurrency(report.totals.total_income_paid - report.totals.total_expense_paid)}`,
        "",
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(["", "", "", "", "", "", "", "", ""]);
      row++;

      // ── Data section ──
      rows.push(["DETALLE POR PERIODO", "", "", "", "", "", "", "", ""]);
      sectionHeaderRows.push(row);
      row++;

      // Column headers
      rows.push(["", "Periodo", "# Ventas", "Ingresos", "Recaudado", "# Compras", "Egresos", "Pagado", "Neto"]);
      columnHeaderRows.push(row);
      row++;

      // Data rows
      report.periods.forEach((p) => {
        rows.push([
          "",
          p.period,
          p.income_count,
          formatCurrency(p.income),
          formatCurrency(p.income_paid),
          p.expense_count,
          formatCurrency(p.expense),
          formatCurrency(p.expense_paid),
          formatCurrency(p.net),
        ]);
        row++;
      });

      // Totals row
      const totalsRow = row;
      rows.push([
        "",
        "TOTALES",
        report.totals.income_count,
        formatCurrency(report.totals.total_income),
        formatCurrency(report.totals.total_income_paid),
        report.totals.expense_count,
        formatCurrency(report.totals.total_expense),
        formatCurrency(report.totals.total_expense_paid),
        formatCurrency(report.totals.net),
      ]);
      row++;

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Column widths
      ws["!cols"] = [
        { wch: 4 }, { wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
        { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      ];

      // Merge header cells
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      ];

      const borderStyle = { style: "thin", color: { rgb: "E5E7EB" } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

      // Apply styles
      for (let R = 0; R < rows.length; R++) {
        for (let C = 0; C < totalCols; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: "", t: "s" };

          ws[addr].s = { border: thinBorder };

          // Section headers (dark indigo bg, white text)
          if (sectionHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4F46E5" } },
              alignment: { horizontal: "left", vertical: "center" },
              border: thinBorder,
            };
          }

          // Column headers (gray bg, bold, centered)
          if (columnHeaderRows.includes(R)) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: "374151" } },
              fill: { fgColor: { rgb: "E5E7EB" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: thinBorder,
            };
          }

          // Period subtitle row
          if (R === 1) {
            ws[addr].s = {
              font: { sz: 10, color: { rgb: "6B7280" } },
              alignment: { horizontal: "left" },
              border: thinBorder,
            };
          }

          // Totals row (light indigo bg, bold)
          if (R === totalsRow) {
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: "312E81" } },
              fill: { fgColor: { rgb: "EEF2FF" } },
              alignment: { horizontal: C >= 2 ? "right" : "left", vertical: "center" },
              border: thinBorder,
            };
          }

          // Right-align number columns for data rows
          if (
            !sectionHeaderRows.includes(R) &&
            !columnHeaderRows.includes(R) &&
            R !== 1 &&
            R !== totalsRow &&
            C >= 2
          ) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: "right" },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ingresos y Egresos");
      XLSX.writeFile(wb, `Ingresos_Egresos_${filters.date_from}_${filters.date_to}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargo correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filters, user, toast]);

  return (
    <AppLayout title="Ingresos y Egresos">
      <Head title="Ingresos y Egresos" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <ArrowDownUp className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Ingresos y Egresos</h1>
                  <p className="text-sm text-muted-foreground">
                    Comparativa de ventas (ingresos) vs compras de inventario (egresos)
                  </p>
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
                    <SelectItem value="15d">Ultimos 15 dias</SelectItem>
                    <SelectItem value="1m">Ultimo mes</SelectItem>
                    <SelectItem value="2m">Ultimos 2 meses</SelectItem>
                    <SelectItem value="3m">Ultimos 3 meses</SelectItem>
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
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Ingresos</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(report.totals.total_income)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.totals.income_count} ventas
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-500/15 p-2 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Egresos</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.totals.total_expense)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.totals.expense_count} compras
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <ArrowDownUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Resultado Neto</h3>
                  </div>
                  <p className={`text-2xl font-bold ${report.totals.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(report.totals.net)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Recaudado / Pagado</h3>
                  </div>
                  <p className="text-sm">
                    <span className="text-emerald-600 font-semibold">
                      {formatCurrency(report.totals.total_income_paid)}
                    </span>
                    {" / "}
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(report.totals.total_expense_paid)}
                    </span>
                  </p>
                  <p className={`text-lg font-bold mt-1 ${report.totals.total_income_paid - report.totals.total_expense_paid >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Neto: {formatCurrency(report.totals.total_income_paid - report.totals.total_expense_paid)}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <>
              {/* Charts */}
              <div id="income-expenses-charts-container" className="grid gap-4 md:grid-cols-3">
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current["inc-exp-bar"] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Ingresos vs Egresos por Periodo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={incExpBarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="ingresos" fill="#16a34a" name="Ingresos" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="egresos" fill="#ef4444" name="Egresos" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current["net-line"] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resultado Neto por Periodo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={netLineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="neto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Neto" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current["paid-area"] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recaudado vs Pagado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={paidData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} angle={-30} textAnchor="end" height={50} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="recaudado" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} name="Recaudado" />
                        <Area type="monotone" dataKey="pagado" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} name="Pagado" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detail Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <CardTitle>Detalle por Periodo</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.periods.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron datos en el periodo seleccionado</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Periodo</TableHead>
                            <TableHead className="text-right"># Ventas</TableHead>
                            <TableHead className="text-right">Ingresos</TableHead>
                            <TableHead className="text-right">Recaudado</TableHead>
                            <TableHead className="text-right"># Compras</TableHead>
                            <TableHead className="text-right">Egresos</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Neto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.periods.map((p) => {
                            const key = `${p.year}-${p.month}`;
                            const isExpanded = expandedPeriod === key;
                            const detail = periodDetails[key];

                            return (
                              <React.Fragment key={key}>
                                <TableRow
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => togglePeriod(p.year, p.month)}
                                >
                                  <TableCell className="w-10">
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {p.period}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {p.income_count.toLocaleString("es-CO")}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600 font-semibold">
                                    {formatCurrency(p.income)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(p.income_paid)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {p.expense_count.toLocaleString("es-CO")}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600 font-semibold">
                                    {formatCurrency(p.expense)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(p.expense_paid)}
                                  </TableCell>
                                  <TableCell className={`text-right font-bold ${p.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(p.net)}
                                  </TableCell>
                                </TableRow>

                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={totalColumns} className="p-0 bg-muted/30">
                                      {loadingDetail && !detail ? (
                                        <div className="flex items-center justify-center py-6 gap-2">
                                          <Spinner size="sm" />
                                          <span className="text-sm text-muted-foreground">Cargando detalle...</span>
                                        </div>
                                      ) : detail ? (
                                        <div className="p-4 space-y-4">
                                          {/* Sales detail */}
                                          {detail.sales.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                Ventas ({detail.sales.length})
                                              </h4>
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Factura</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Cliente</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="text-right">Pagado</TableHead>
                                                    <TableHead className="text-center">Estado</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {detail.sales.map((sale) => (
                                                    <TableRow key={sale.id}>
                                                      <TableCell className="font-mono text-sm">{sale.invoice_number}</TableCell>
                                                      <TableCell className="text-sm">{formatDate(sale.date)}</TableCell>
                                                      <TableCell className="text-sm">{sale.client_name || "-"}</TableCell>
                                                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                                                      <TableCell className="text-right text-sm text-green-600">{formatCurrency(sale.paid_amount)}</TableCell>
                                                      <TableCell className="text-center">{getPaymentBadge(sale.payment_status)}</TableCell>
                                                      <TableCell>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-7 w-7"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.location.href = `/admin/sales/${sale.id}`;
                                                          }}
                                                          title="Ver factura"
                                                        >
                                                          <Eye className="h-4 w-4" />
                                                        </Button>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          )}

                                          {/* Purchases detail */}
                                          {detail.purchases.length > 0 && (
                                            <div>
                                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                Compras ({detail.purchases.length})
                                              </h4>
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead># Compra</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="text-right">Pagado</TableHead>
                                                    <TableHead className="text-center">Estado</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {detail.purchases.map((purchase) => (
                                                    <TableRow key={purchase.id}>
                                                      <TableCell className="font-mono text-sm">{purchase.purchase_number}</TableCell>
                                                      <TableCell className="text-sm">{formatDate(purchase.date)}</TableCell>
                                                      <TableCell className="text-sm">{purchase.supplier_name || "-"}</TableCell>
                                                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(purchase.total_amount)}</TableCell>
                                                      <TableCell className="text-right text-sm text-green-600">{formatCurrency(purchase.total_paid)}</TableCell>
                                                      <TableCell className="text-center">{getPaymentBadge(purchase.payment_status)}</TableCell>
                                                      <TableCell>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-7 w-7"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.location.href = `/admin/inventory-purchases/${purchase.id}`;
                                                          }}
                                                          title="Ver compra"
                                                        >
                                                          <Eye className="h-4 w-4" />
                                                        </Button>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          )}

                                          {detail.sales.length === 0 && detail.purchases.length === 0 && (
                                            <p className="text-center text-muted-foreground py-4 text-sm">
                                              No se encontraron registros
                                            </p>
                                          )}
                                        </div>
                                      ) : null}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell />
                            <TableCell>Total</TableCell>
                            <TableCell className="text-right">
                              {report.totals.income_count.toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_income)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_income_paid)}
                            </TableCell>
                            <TableCell className="text-right">
                              {report.totals.expense_count.toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_expense)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_expense_paid)}
                            </TableCell>
                            <TableCell className={`text-right ${report.totals.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(report.totals.net)}
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
                  <p className="text-lg font-medium mb-1">Selecciona los filtros y genera el reporte</p>
                  <p className="text-sm">Los resultados apareceran aqui con graficas y detalle por periodo</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
