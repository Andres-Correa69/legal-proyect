import { Head, usePage, router } from "@inertiajs/react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  reportsApi,
  productCategoriesApi,
  type InventoryReport,
  type InventoryReportItem,
  type ProductCategory,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Receipt,
  AlertTriangle,
  ArrowUpFromLine,
  Boxes,
  Search,
  Eye,
  Package,
  FileText,
  FileSpreadsheet,
  Loader2,
  BarChart3,
} from "lucide-react";

function truncate(str: string, max: number) {
  return str.length > max ? str.substring(0, max) + "..." : str;
}

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#16a34a", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#f97316", "#64748b"];

type SortKey = "product_name" | "current_stock" | "total_cost" | "iva_amount";
type SortDir = "asc" | "desc";

export default function InventoryReportPage() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("inventory.view", user);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<InventoryReport | null>(null);

  const { toast } = useToast();
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [filters, setFilters] = useState({
    category_id: "all",
    stock_status: "all" as "all" | "low" | "normal" | "over",
    search: "",
  });

  const [selectedProduct, setSelectedProduct] = useState<InventoryReportItem | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [tableSort, setTableSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "total_cost",
    dir: "desc",
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportMode, setExportMode] = useState<'info' | 'count'>('info');

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
      return;
    }
    loadCategories();
  }, [canView]);

  if (!canView) return null;

  const loadCategories = async () => {
    try {
      const data = await productCategoriesApi.getAll();
      setCategories(data);
    } catch (error: any) {
      console.error("Error loading categories:", error);
    }
  };

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setGeneralError("");
      const params: Parameters<typeof reportsApi.inventory>[0] = {};
      if (filters.category_id !== "all") {
        params.category_id = parseInt(filters.category_id);
      }
      if (filters.stock_status !== "all") {
        params.stock_status = filters.stock_status;
      }
      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }
      const data = await reportsApi.inventory(params);
      setReport(data);
    } catch (error: any) {
      console.error("Error loading report:", error);
      setGeneralError(error.message || "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Filtered + sorted table data (moved before export callbacks that depend on it)
  const filteredItems = useMemo(() => {
    if (!report) return [];
    let items = report.items;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      items = items.filter(
        (i) =>
          i.product_name.toLowerCase().includes(q) ||
          (i.sku && i.sku.toLowerCase().includes(q)) ||
          (i.category_name && i.category_name.toLowerCase().includes(q))
      );
    }
    return [...items].sort((a, b) => {
      const aVal = a[tableSort.key] ?? 0;
      const bVal = b[tableSort.key] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return tableSort.dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return tableSort.dir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [report, tableSearch, tableSort]);

  const handleExportPdf = useCallback(async (mode: 'info' | 'count' = 'info') => {
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
      const badgeText = mode === 'count' ? 'CONTEO' : 'REPORTE';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text(mode === 'count' ? 'Planilla de Conteo de Inventario' : 'Informe de Inventario', rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 13, { align: 'right' });

      currentY += 18;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // ── Summary Cards ──
      const cardData = mode === 'count' ? [
        { label: 'TOTAL PRODUCTOS', value: String(filteredItems.length), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: 'UNIDADES EN SISTEMA', value: String(filteredItems.reduce((sum, i) => sum + i.current_stock, 0).toLocaleString('es-CO')), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'CATEGORÍAS', value: String(new Set(filteredItems.map(i => i.category_name)).size), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
      ] : [
        { label: 'COSTO INVENTARIO', value: formatCurrency(report.totals.total_cost), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'IVA EN INVENTARIO', value: formatCurrency(report.totals.total_iva), bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
        { label: 'TOTAL PRODUCTOS', value: String(report.totals.total_products), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: 'BAJO STOCK', value: String(report.totals.low_stock_count), bg: [254, 242, 242], border: [252, 165, 165], color: [220, 38, 38] },
        { label: 'SOBRESTOCK', value: String(report.totals.over_stock_count), bg: [254, 252, 232], border: [253, 224, 71], color: [202, 138, 4] },
      ];
      const cardW = mode === 'count' ? (contentWidth - 4) / 3 : (contentWidth - 8) / 5;
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
      if (mode === 'info') {
        const chartsContainer = document.getElementById('inventory-charts-container');
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
            for (const key of ['category-bar', 'top-products-bar']) {
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
      }

      // ── Inventory Table ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(mode === 'count' ? 'Planilla de Conteo' : 'Detalle por Producto', margin + 4, currentY + 4.8);
      currentY += 9;

      let tableHead: string[][];
      let tableBody: string[][];

      if (mode === 'count') {
        tableHead = [['#', 'Producto', 'SKU', 'Categoría', 'Stock Sistema', 'Verificado', 'Cantidad Real', 'Diferencia', 'Observaciones']];
        tableBody = filteredItems.map((item, idx) => [
          String(idx + 1),
          item.product_name,
          item.sku || '-',
          item.category_name || 'Sin categoría',
          item.current_stock.toLocaleString('es-CO'),
          '[ ]',
          '',
          '',
          '',
        ]);
      } else {
        tableHead = [['Producto', 'SKU', 'Categoría', 'Stock', 'Costo Unit.', '% IVA', 'Costo Total', 'IVA', 'Estado']];
        tableBody = filteredItems.map(item => [
          item.product_name,
          item.sku || '-',
          item.category_name || 'Sin categoría',
          item.current_stock.toLocaleString('es-CO'),
          formatCurrency(item.average_cost),
          `${item.tax_rate}%`,
          formatCurrency(item.total_cost),
          formatCurrency(item.iva_amount),
          item.stock_status === 'low' ? 'Bajo' : item.stock_status === 'over' ? 'Sobre' : 'Normal',
        ]);
        tableBody.push([
          'TOTALES', '', '', report.totals.total_units.toLocaleString('es-CO'), '', '', formatCurrency(report.totals.total_cost), formatCurrency(report.totals.total_iva), '',
        ]);
      }

      autoTable(pdf, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: mode === 'count' ? {
          0: { halign: 'center', cellWidth: 8 },
          4: { halign: 'right' },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', cellWidth: 22 },
          8: { cellWidth: 30 },
        } : {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'center' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'center' },
        },
        didParseCell: (data: any) => {
          if (mode === 'info' && data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
          // Hide [ ] text for checkbox column - we draw it in didDrawCell
          if (mode === 'count' && data.section === 'body' && data.column.index === 5) {
            data.cell.text = [''];
          }
        },
        didDrawCell: (data: any) => {
          // Draw checkbox square in "Verificado" column
          if (mode === 'count' && data.section === 'body' && data.column.index === 5) {
            const size = 3.5;
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + (data.cell.height - size) / 2;
            pdf.setDrawColor(150, 150, 150);
            pdf.setLineWidth(0.3);
            pdf.rect(x, y, size, size);
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      // ── Signature section (count mode only) ──
      if (mode === 'count') {
        const sigY = (pdf as any).lastAutoTable.finalY + 15;
        if (sigY + 30 < pageHeight - 25) {
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128);
          pdf.text('Responsable del Conteo:', margin, sigY);
          pdf.line(margin + 40, sigY, margin + 120, sigY);
          pdf.text('Fecha del Conteo:', margin + 140, sigY);
          pdf.line(margin + 170, sigY, margin + 230, sigY);
          pdf.text('Firma:', margin, sigY + 15);
          pdf.line(margin + 15, sigY + 15, margin + 120, sigY + 15);
          pdf.text('Observaciones Generales:', margin + 140, sigY + 15);
          pdf.line(margin + 185, sigY + 15, pageWidth - margin, sigY + 15);
        }
      }

      addFooters();
      pdf.save(mode === 'count' ? `Conteo_Inventario_${Date.now()}.pdf` : `Inventario_${Date.now()}.pdf`);
      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filteredItems, user, toast]);

  const handleExportExcel = useCallback(async (mode: 'info' | 'count' = 'info') => {
    if (!report) return;
    try {
      setExporting(true);
      const XLSX = await import('xlsx-js-style');

      const rows: any[][] = [];
      const sectionHeaderRows: number[] = [];
      const columnHeaderRows: number[] = [];
      let row = 0;
      const totalCols = 9;

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      if (mode === 'count') {
        // ── Count mode header ──
        rows.push([`PLANILLA DE CONTEO DE INVENTARIO — ${companyName}`, '', '', '', '', '', '', '', '']);
        sectionHeaderRows.push(row);
        row++;
        rows.push([`Formato para verificación física del inventario`, '', '', '', '', '', '', '', '']);
        row++;

        // ── Summary row ──
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push([
          'RESUMEN',
          `Productos: ${filteredItems.length}`,
          '',
          `Unidades: ${filteredItems.reduce((s, i) => s + i.current_stock, 0)}`,
          '',
          `Categorías: ${new Set(filteredItems.map(i => i.category_name)).size}`,
          '',
          '',
          '',
        ]);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;

        // ── Detail section ──
        rows.push(['PLANILLA DE CONTEO', '', '', '', '', '', '', '', '']);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['#', 'Producto', 'SKU', 'Categoría', 'Stock Sistema', 'Verificado', 'Cantidad Real', 'Diferencia', 'Observaciones']);
        columnHeaderRows.push(row);
        row++;
        filteredItems.forEach((item, idx) => {
          rows.push([
            idx + 1,
            item.product_name,
            item.sku || '-',
            item.category_name || 'Sin categoría',
            item.current_stock.toLocaleString('es-CO'),
            '',
            '',
            '',
            '',
          ]);
          row++;
        });

        // Signature rows
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push(['Responsable del Conteo:', '', '', '', 'Fecha del Conteo:', '', '', '', '']);
        row++;
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push(['Firma:', '', '', '', 'Observaciones Generales:', '', '', '', '']);
        row++;
      } else {
        // ── Info mode header ──
        rows.push([`INFORME DE INVENTARIO — ${companyName}`, '', '', '', '', '', '', '', '']);
        sectionHeaderRows.push(row);
        row++;
        rows.push([`Valorización actual del inventario: costos e IVA`, '', '', '', '', '', '', '', '']);
        row++;

        // ── Summary row ──
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;
        rows.push([
          'RESUMEN',
          `Costo Inventario: ${formatCurrency(report.totals.total_cost)}`,
          '',
          `IVA: ${formatCurrency(report.totals.total_iva)}`,
          '',
          `Productos: ${report.totals.total_products}`,
          '',
          `Bajo Stock: ${report.totals.low_stock_count}`,
          `Sobrestock: ${report.totals.over_stock_count}`,
        ]);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['', '', '', '', '', '', '', '', '']);
        row++;

        // ── Detail section ──
        rows.push(['DETALLE POR PRODUCTO', '', '', '', '', '', '', '', '']);
        sectionHeaderRows.push(row);
        row++;
        rows.push(['Producto', 'SKU', 'Categoría', 'Stock', 'Costo Unit.', '% IVA', 'Costo Total', 'IVA', 'Estado']);
        columnHeaderRows.push(row);
        row++;
        filteredItems.forEach(item => {
          rows.push([
            item.product_name,
            item.sku || '-',
            item.category_name || 'Sin categoría',
            item.current_stock.toLocaleString('es-CO'),
            formatCurrency(item.average_cost),
            `${item.tax_rate}%`,
            formatCurrency(item.total_cost),
            formatCurrency(item.iva_amount),
            item.stock_status === 'low' ? 'Bajo' : item.stock_status === 'over' ? 'Sobre' : 'Normal',
          ]);
          row++;
        });
      }

      // Totals row (info mode only)
      const totalsRow = mode === 'info' ? row : -1;
      if (mode === 'info') {
        rows.push([
          'TOTALES', '', '', report.totals.total_units.toLocaleString('es-CO'), '', '', formatCurrency(report.totals.total_cost), formatCurrency(report.totals.total_iva), '',
        ]);
        row++;
      }

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws['!cols'] = mode === 'count' ? [
        { wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 24 },
      ] : [
        { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 10 },
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
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

          // Subtitle row
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
              alignment: { horizontal: C >= 3 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Right-align number columns for data rows
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== totalsRow && (C === 3 || C === 4 || C === 6 || C === 7)) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }

          // Center IVA % and Estado columns
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== totalsRow && (C === 5 || C === 8)) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'center' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, mode === 'count' ? 'Conteo Inventario' : 'Inventario');
      XLSX.writeFile(wb, mode === 'count' ? `Conteo_Inventario_${Date.now()}.xlsx` : `Inventario_${Date.now()}.xlsx`);
      toast({ title: "Excel generado", description: "El archivo se descargó correctamente." });
    } catch (err: any) {
      console.error("Error exporting Excel:", err);
      toast({ title: "Error", description: "No se pudo generar el Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [report, filteredItems, user, toast]);

  const toggleSort = (key: SortKey) => {
    setTableSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  };

  const sortIndicator = (key: SortKey) =>
    tableSort.key === key ? (tableSort.dir === "asc" ? " ↑" : " ↓") : "";

  // Chart data
  const categoryChartData = useMemo(() => {
    if (!report) return [];
    return report.by_category.slice(0, 10).map((c) => ({
      name: truncate(c.category_name, 16),
      costo: c.total_cost,
      iva: c.total_iva,
    }));
  }, [report]);

  const topProductsData = useMemo(() => {
    if (!report) return [];
    return [...report.items]
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 10)
      .map((i) => ({
        name: truncate(i.product_name, 18),
        costo: i.total_cost,
      }));
  }, [report]);

  const getStockBadge = (status: string) => {
    switch (status) {
      case "low":
        return <Badge className="bg-red-600 text-white">Bajo</Badge>;
      case "over":
        return <Badge className="bg-yellow-500/100 text-white">Sobre</Badge>;
      default:
        return <Badge className="bg-green-600 text-white">Normal</Badge>;
    }
  };

  return (
    <AppLayout title="Informe Inventario">
      <Head title="Informe de Inventario" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2.5 rounded-lg">
                  <Boxes className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Informe de Inventario</h1>
                  <p className="text-sm text-muted-foreground">Valorización actual del inventario: costos e IVA</p>
                </div>
              </div>
              {report && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setExportFormat('pdf'); setExportDialogOpen(true); }}
                    disabled={exporting || loading}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setExportFormat('excel'); setExportDialogOpen(true); }}
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 flex-1">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Buscar producto</label>
                  <Input
                    placeholder="Nombre o SKU..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Categoría</label>
                  <Select
                    value={filters.category_id}
                    onValueChange={(value) =>
                      setFilters({ ...filters, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Estado de Stock</label>
                  <Select
                    value={filters.stock_status}
                    onValueChange={(value: "all" | "low" | "normal" | "over") =>
                      setFilters({ ...filters, stock_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="low">Bajo stock</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="over">Sobrestock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-emerald-500/15 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Costo Inventario</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(report.totals.total_cost)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-500/15 p-2 rounded-lg">
                      <Receipt className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">IVA en Inventario</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(report.totals.total_iva)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <Boxes className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Productos</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {report.totals.total_products.toLocaleString("es-CO")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {report.totals.total_units.toLocaleString("es-CO")} unidades
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-500/15 p-2 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Bajo Stock</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {report.totals.low_stock_count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">productos</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-yellow-500/15 p-2 rounded-lg">
                      <ArrowUpFromLine className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Sobrestock</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {report.totals.over_stock_count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">productos</p>
                </div>
              </Card>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <>
              {/* Charts */}
              <div id="inventory-charts-container" className="grid gap-4 md:grid-cols-2">
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['category-bar'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Costo por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryChartData} margin={{ bottom: 50 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={70} />
                          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="costo" fill="#3b82f6" name="Costo" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="iva" fill="#f59e0b" name="IVA" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Sin datos</p>
                    )}
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['top-products-bar'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top 10 Productos por Costo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topProductsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                          <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="costo" name="Costo Inventario" radius={[0, 4, 4, 0]}>
                            {topProductsData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">Sin datos</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detail Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Detalle por Producto</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar en tabla..."
                        className="pl-9"
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron productos</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product_name")}>
                              <span className="flex items-center gap-1">Producto{sortIndicator("product_name")}</span>
                            </TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("current_stock")}>
                              <span className="flex items-center justify-end gap-1">Stock{sortIndicator("current_stock")}</span>
                            </TableHead>
                            <TableHead className="text-right">Costo Unit.</TableHead>
                            <TableHead className="text-center">% IVA</TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("total_cost")}>
                              <span className="flex items-center justify-end gap-1">Costo Total{sortIndicator("total_cost")}</span>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("iva_amount")}>
                              <span className="flex items-center justify-end gap-1">IVA{sortIndicator("iva_amount")}</span>
                            </TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-center w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredItems.map((item) => (
                            <TableRow key={item.product_id}>
                              <TableCell className="font-medium">
                                <span
                                  className="text-blue-600 hover:underline cursor-pointer"
                                  onClick={() => router.visit(`/admin/products/${item.product_id}?tipo=producto`)}
                                >
                                  {item.product_name}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {item.sku || "-"}
                              </TableCell>
                              <TableCell>
                                {item.category_name || "Sin categoría"}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.current_stock.toLocaleString("es-CO")}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {formatCurrency(item.average_cost)}
                              </TableCell>
                              <TableCell className="text-center text-muted-foreground">
                                {item.tax_rate}%
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.total_cost)}
                              </TableCell>
                              <TableCell className="text-right text-amber-600">
                                {formatCurrency(item.iva_amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStockBadge(item.stock_status)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setSelectedProduct(item)}
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell colSpan={3}>Totales</TableCell>
                            <TableCell className="text-right">
                              {report.totals.total_units.toLocaleString("es-CO")}
                            </TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_cost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_iva)}
                            </TableCell>
                            <TableCell />
                            <TableCell />
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
                  <p className="text-sm">Los resultados aparecerán aquí con gráficas y detalle de inventario</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Detalle del Producto
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <span
                  className="text-lg font-semibold text-blue-600 hover:underline cursor-pointer"
                  onClick={() => router.visit(`/admin/products/${selectedProduct.product_id}?tipo=producto`)}
                >
                  {selectedProduct.product_name}
                </span>
                {selectedProduct.sku && (
                  <p className="text-sm text-muted-foreground font-mono mt-1">SKU: {selectedProduct.sku}</p>
                )}
                {selectedProduct.category_name && (
                  <p className="text-sm text-muted-foreground mt-1">Categoria: {selectedProduct.category_name}</p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Stock Actual</span>
                  <p className="font-semibold">{selectedProduct.current_stock.toLocaleString("es-CO")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock Minimo</span>
                  <p className="font-semibold">{selectedProduct.min_stock.toLocaleString("es-CO")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio Compra</span>
                  <p className="font-semibold">{formatCurrency(selectedProduct.purchase_price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Costo Promedio</span>
                  <p className="font-semibold">{formatCurrency(selectedProduct.average_cost)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Precio Venta</span>
                  <p className="font-semibold">{formatCurrency(selectedProduct.sale_price)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IVA</span>
                  <p className="font-semibold">{selectedProduct.tax_rate}%</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Costo Total Inventario</span>
                  <p className="font-bold text-base">{formatCurrency(selectedProduct.total_cost)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">IVA en Inventario</span>
                  <p className="font-bold text-base text-amber-600">{formatCurrency(selectedProduct.iva_amount)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  {getStockBadge(selectedProduct.stock_status)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.visit(`/admin/products/${selectedProduct.product_id}?tipo=producto`)}
                >
                  Ver Producto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Export Mode Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportFormat === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> : <FileSpreadsheet className="h-5 w-5 text-green-600" />}
              Exportar {exportFormat === 'pdf' ? 'PDF' : 'Excel'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Selecciona el tipo de exportación:</p>
            <div
              onClick={() => setExportMode('info')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${exportMode === 'info' ? 'border-blue-500 bg-blue-500/10/50' : 'border-border hover:border-blue-500/30'}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/15 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Exportar para Información</p>
                  <p className="text-xs text-muted-foreground">Reporte completo con gráficas, estadísticas y tabla de datos</p>
                </div>
              </div>
            </div>
            <div
              onClick={() => setExportMode('count')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${exportMode === 'count' ? 'border-blue-500 bg-blue-500/10/50' : 'border-border hover:border-blue-500/30'}`}
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/15 p-2 rounded-lg">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Exportar para Conteo de Inventario</p>
                  <p className="text-xs text-muted-foreground">Planilla con casillas de verificación, cantidad real y diferencias para conteo físico</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={exporting}
              onClick={() => {
                setExportDialogOpen(false);
                if (exportFormat === 'pdf') {
                  handleExportPdf(exportMode);
                } else {
                  handleExportExcel(exportMode);
                }
              }}
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Exportar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
