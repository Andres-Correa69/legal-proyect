import { Head, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  productCategoriesApi,
  productsApi,
  type SalesProductReport,
  type ProductCategory,
  type Product,
  type ProductInvoiceDetail,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag,
  FileText,
  FileSpreadsheet,
  DollarSign,
  Percent,
  ChevronDown,
  ChevronUp,
  Eye,
  Search,
  Loader2,
  Package,
  BarChart3,
  CalendarIcon,
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

const CHART_COLORS = ["#3b82f6", "#16a34a", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#8b5cf6"];

export default function SalesProductsReport() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("sales.view", user);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [report, setReport] = useState<SalesProductReport | null>(null);

  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [productInvoices, setProductInvoices] = useState<
    Record<number, ProductInvoiceDetail[]>
  >({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const { toast } = useToast();
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [filters, setFilters] = useState(() => ({
    ...getDateRange('15d'),
    date_range: '15d',
    category_id: "all",
    product_id: "all",
  }));

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
      return;
    }
    loadBaseData();
  }, [canView]);

  if (!canView) {
    return null;
  }

  const loadBaseData = async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        productCategoriesApi.getAll(),
        productsApi.getAll(),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
    } catch (error: any) {
      console.error("Error loading base data:", error);
      setGeneralError(error.message || "Error al cargar datos");
    }
  };

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
      pdf.text('Ventas por Producto', rightX, currentY + 9, { align: 'right' });

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
        { label: 'TOTAL FACTURAS', value: report.totals.total_sales_count.toLocaleString('es-CO'), bg: [238, 242, 255], border: [199, 210, 254], color: [37, 99, 235] },
        { label: 'INGRESOS BRUTOS', value: formatCurrency(report.totals.total_subtotal), bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'DESCUENTOS', value: formatCurrency(report.totals.total_discount), bg: [254, 242, 242], border: [254, 202, 202], color: [220, 38, 38] },
        { label: 'TOTAL NETO', value: formatCurrency(report.totals.total_amount), bg: [250, 245, 255], border: [233, 213, 255], color: [147, 51, 234] },
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
      const addChartImage = async (chartKey: string) => {
        const el = chartRefs.current[chartKey];
        if (!el) return;
        try {
          const dataUrl = await toJpeg(el, { pixelRatio: 1.5, quality: 0.8, backgroundColor: '#ffffff', skipFonts: true });
          const img = new Image();
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
          const imgWidth = contentWidth;
          const imgHeight = (img.height * imgWidth) / img.width;
          if (currentY + imgHeight > pageHeight - 25) { pdf.addPage(); currentY = margin; }
          pdf.addImage(dataUrl, 'JPEG', margin, currentY, imgWidth, imgHeight);
          currentY += imgHeight + 4;
        } catch (e) { console.warn('Could not capture chart:', chartKey, e); }
      };

      // Capture all 3 charts as a single row
      const chartsContainer = document.getElementById('charts-container');
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
          // Fallback: capture individually
          await addChartImage('top-products');
          await addChartImage('category-dist');
          await addChartImage('discount-tax');
        }
      }

      // ── Table section ──
      if (currentY + 15 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
      pdf.setFillColor(79, 70, 229);
      pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Detalle por Producto', margin + 4, currentY + 4.8);
      currentY += 9;

      const tableHead = [['Producto', 'SKU', 'Categoría', 'Costo Total', 'Cant.', 'Subtotal', 'Descuento', 'IVA', 'Total', '# Fact.']];
      const tableBody = report.items.map(item => [
        item.product_name,
        item.sku || '-',
        item.category_name || 'Sin categoría',
        formatCurrency(item.purchase_price * item.total_quantity),
        item.total_quantity.toLocaleString('es-CO'),
        formatCurrency(item.total_subtotal),
        formatCurrency(item.total_discount),
        formatCurrency(item.total_tax),
        formatCurrency(item.total_amount),
        item.sales_count.toLocaleString('es-CO'),
      ]);
      // Totals row
      tableBody.push([
        'TOTALES', '', '',
        formatCurrency(report.items.reduce((sum, i) => sum + i.purchase_price * i.total_quantity, 0)),
        report.totals.total_quantity.toLocaleString('es-CO'),
        formatCurrency(report.totals.total_subtotal),
        formatCurrency(report.totals.total_discount),
        formatCurrency(report.totals.total_tax),
        formatCurrency(report.totals.total_amount),
        report.totals.total_sales_count.toLocaleString('es-CO'),
      ]);

      autoTable(pdf, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.8, textColor: [51, 51, 51] },
        headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 6.5, cellPadding: 2 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' },
          9: { halign: 'right' },
        },
        didParseCell: (data: any) => {
          // Bold totals row
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [238, 242, 255];
          }
        },
        didDrawPage: () => { currentY = margin; },
      });

      addFooters();
      pdf.save(`Ventas_Productos_${filters.date_from}_${filters.date_to}.pdf`);
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

      const companyName = user.company?.name || 'LEGAL SISTEMA';

      // ── Report header ──
      rows.push([`VENTAS POR PRODUCTO — ${companyName}`, '', '', '', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;
      rows.push([`Periodo: ${filters.date_from} a ${filters.date_to}`, '', '', '', '', '', '', '', '', '', '']);
      row++;

      // ── Summary row ──
      rows.push(['', '', '', '', '', '', '', '', '', '', '']);
      row++;
      rows.push([
        'RESUMEN',
        `Facturas: ${report.totals.total_sales_count.toLocaleString('es-CO')}`,
        '',
        `Ingresos: ${formatCurrency(report.totals.total_subtotal)}`,
        '',
        `Descuentos: ${formatCurrency(report.totals.total_discount)}`,
        '',
        `Total Neto: ${formatCurrency(report.totals.total_amount)}`,
        '', '', '',
      ]);
      sectionHeaderRows.push(row);
      row++;
      rows.push(['', '', '', '', '', '', '', '', '', '', '']);
      row++;

      // ── Data section ──
      rows.push(['DETALLE POR PRODUCTO', '', '', '', '', '', '', '', '', '', '']);
      sectionHeaderRows.push(row);
      row++;

      // Column headers
      rows.push(['Producto', 'SKU', 'Categoría', 'Costo Unit.', 'Costo Total', 'Cant. Vendida', 'Subtotal', 'Descuento', 'IVA', 'Total', '# Facturas']);
      columnHeaderRows.push(row);
      row++;

      // Data rows
      report.items.forEach(item => {
        rows.push([
          item.product_name,
          item.sku || '-',
          item.category_name || 'Sin categoría',
          formatCurrency(item.purchase_price),
          formatCurrency(item.purchase_price * item.total_quantity),
          item.total_quantity,
          formatCurrency(item.total_subtotal),
          formatCurrency(item.total_discount),
          formatCurrency(item.total_tax),
          formatCurrency(item.total_amount),
          item.sales_count,
        ]);
        row++;
      });

      // Totals row
      rows.push([
        'TOTALES', '', '',
        '',
        formatCurrency(report.items.reduce((sum, i) => sum + i.purchase_price * i.total_quantity, 0)),
        report.totals.total_quantity.toLocaleString('es-CO'),
        formatCurrency(report.totals.total_subtotal),
        formatCurrency(report.totals.total_discount),
        formatCurrency(report.totals.total_tax),
        formatCurrency(report.totals.total_amount),
        report.totals.total_sales_count.toLocaleString('es-CO'),
      ]);
      const totalsRow = row;
      row++;

      // Build worksheet
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Column widths
      ws['!cols'] = [
        { wch: 32 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      ];

      // Merge header cells
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      ];

      const totalCols = 11;
      const borderStyle = { style: 'thin', color: { rgb: 'E5E7EB' } };
      const thinBorder = { top: borderStyle, bottom: borderStyle, left: borderStyle, right: borderStyle };

      // Apply styles
      for (let R = 0; R < rows.length; R++) {
        for (let C = 0; C < totalCols; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) ws[addr] = { v: '', t: 's' };

          // Default border
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
              alignment: { horizontal: C >= 3 ? 'right' : 'left', vertical: 'center' },
              border: thinBorder,
            };
          }

          // Right-align currency/number columns for data rows
          if (!sectionHeaderRows.includes(R) && !columnHeaderRows.includes(R) && R !== 1 && R !== totalsRow && C >= 3) {
            ws[addr].s = {
              ...ws[addr].s,
              alignment: { horizontal: 'right' },
              border: thinBorder,
            };
          }
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas por Producto');
      XLSX.writeFile(wb, `Ventas_Productos_${filters.date_from}_${filters.date_to}.xlsx`);
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
      setExpandedProduct(null);
      setProductInvoices({});
      const params: {
        date_from: string;
        date_to: string;
        category_id?: number;
        product_id?: number;
      } = {
        date_from: filters.date_from,
        date_to: filters.date_to,
      };
      if (filters.category_id && filters.category_id !== "all") {
        params.category_id = parseInt(filters.category_id);
      }
      if (filters.product_id && filters.product_id !== "all") {
        params.product_id = parseInt(filters.product_id);
      }

      const data = await reportsApi.salesByProduct(params);
      setReport(data);
    } catch (error: any) {
      console.error("Error loading report:", error);
      setGeneralError(error.message || "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoices = async (productId: number) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      return;
    }

    setExpandedProduct(productId);

    if (productInvoices[productId]) {
      return;
    }

    try {
      setLoadingInvoices(true);
      const invoices = await reportsApi.invoicesByProduct(productId, {
        date_from: filters.date_from,
        date_to: filters.date_to,
      });
      setProductInvoices((prev) => ({ ...prev, [productId]: invoices }));
    } catch (error: any) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredProducts =
    filters.category_id && filters.category_id !== "all"
      ? products.filter(
          (p) => p.category_id === parseInt(filters.category_id)
        )
      : products;

  const topProductsData = useMemo(() => {
    if (!report) return [];
    return report.items.slice(0, 10).map(i => ({
      name: i.product_name.length > 20 ? i.product_name.substring(0, 20) + "..." : i.product_name,
      total: i.total_amount,
    }));
  }, [report]);

  const categoryData = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, number>();
    report.items.forEach(i => {
      const cat = i.category_name || "Sin categoría";
      map.set(cat, (map.get(cat) || 0) + i.total_amount);
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [report]);

  const discountTaxData = useMemo(() => {
    if (!report) return [];
    return report.items.slice(0, 8).map(i => ({
      name: i.product_name.length > 14 ? i.product_name.substring(0, 14) + "..." : i.product_name,
      descuento: i.total_discount,
      iva: i.total_tax,
    }));
  }, [report]);

  // Table search & sort
  const [tableSearch, setTableSearch] = useState("");
  const [tableSort, setTableSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "total_amount", dir: "desc" });

  const filteredItems = useMemo(() => {
    if (!report) return [];
    let items = [...report.items];

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      items = items.filter(
        (item) =>
          item.product_name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category_name && item.category_name.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      const key = tableSort.key as keyof typeof a;
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return tableSort.dir === "asc" ? av - bv : bv - av;
      }
      return tableSort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return items;
  }, [report, tableSearch, tableSort]);

  const toggleSort = (key: string) => {
    setTableSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  };

  const totalColumns = 12;

  return (
    <AppLayout title="Ventas de Productos">
      <Head title="Informe de Ventas de Productos" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Ventas por Producto</h1>
                  <p className="text-sm text-muted-foreground">Detalle de ventas agrupado por producto en un rango de fechas</p>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 items-end">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Periodo</label>
                <Select
                  value={filters.date_range}
                  onValueChange={(value) => {
                    if (value === 'custom') {
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
              {filters.date_range === 'custom' && (
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
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Categoría</label>
                <Select
                  value={filters.category_id}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      category_id: value,
                      product_id: "all",
                    })
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
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Producto</label>
                <Select
                  value={filters.product_id}
                  onValueChange={(value) =>
                    setFilters({ ...filters, product_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    {filteredProducts.map((prod) => (
                      <SelectItem key={prod.id} value={prod.id.toString()}>
                        {prod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

          {/* Summary Cards - only when report exists */}
          {report && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Facturas</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {report.totals.total_sales_count.toLocaleString("es-CO")}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-emerald-500/15 p-2 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Ingresos Brutos</h3>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(report.totals.total_subtotal)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-500/15 p-2 rounded-lg">
                      <Percent className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Descuentos</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.totals.total_discount)}
                  </p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <ShoppingBag className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total Neto</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(report.totals.total_amount)}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Report Results */}
          {report && (
            <>
              {/* Charts */}
              <div id="charts-container" className="grid gap-4 md:grid-cols-3">
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['top-products'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top 10 Productos por Ventas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topProductsData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                        <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Total" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['category-dist'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribución por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                          {categoryData.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                      {categoryData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['discount-tax'] = el; }} className="shadow-sm border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Descuentos vs IVA (Top 8)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={discountTaxData} margin={{ bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="descuento" fill="#ef4444" name="Descuento" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="iva" fill="#f59e0b" name="IVA" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Results Table */}
              <Card className="shadow-xl border border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle>Detalle por Producto</CardTitle>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar producto, SKU o categoría..."
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {report.items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron ventas en el periodo seleccionado</p>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron resultados para "{tableSearch}"</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("product_name")}>
                              <span className="flex items-center gap-1">Producto {tableSort.key === "product_name" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("category_name")}>
                              <span className="flex items-center gap-1">Categoría {tableSort.key === "category_name" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("purchase_price")}>
                              <span className="flex items-center justify-end gap-1">Costo Total {tableSort.key === "purchase_price" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("total_quantity")}>
                              <span className="flex items-center justify-end gap-1">Cant. Vendida {tableSort.key === "total_quantity" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("total_subtotal")}>
                              <span className="flex items-center justify-end gap-1">Subtotal {tableSort.key === "total_subtotal" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead className="text-right">
                              Descuento
                            </TableHead>
                            <TableHead className="text-right">IVA</TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("total_amount")}>
                              <span className="flex items-center justify-end gap-1">Total {tableSort.key === "total_amount" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort("sales_count")}>
                              <span className="flex items-center justify-end gap-1"># Facturas {tableSort.key === "sales_count" && (tableSort.dir === "asc" ? "↑" : "↓")}</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredItems.map((item) => (
                            <React.Fragment key={item.product_id}>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleInvoices(item.product_id)}
                              >
                                <TableCell className="w-10">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                  >
                                    {expandedProduct === item.product_id ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {item.product_name}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {item.sku || "-"}
                                </TableCell>
                                <TableCell>
                                  {item.category_name || "Sin categoría"}
                                </TableCell>
                                <TableCell className="text-right" title={`Costo unit: ${formatCurrency(item.purchase_price)}`}>
                                  {formatCurrency(item.purchase_price * item.total_quantity)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.total_quantity.toLocaleString("es-CO")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.total_subtotal)}
                                </TableCell>
                                <TableCell className="text-right text-red-600">
                                  {formatCurrency(item.total_discount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.total_tax)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(item.total_amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.sales_count.toLocaleString("es-CO")}
                                </TableCell>
                              </TableRow>

                              {expandedProduct === item.product_id && (
                                <TableRow key={`${item.product_id}-invoices`}>
                                  <TableCell
                                    colSpan={totalColumns}
                                    className="p-0 bg-muted/30"
                                  >
                                    <div className="p-4">
                                      {loadingInvoices &&
                                      !productInvoices[item.product_id] ? (
                                        <div className="flex items-center justify-center py-4 gap-2">
                                          <Spinner size="sm" />
                                          <span className="text-sm text-muted-foreground">
                                            Cargando facturas...
                                          </span>
                                        </div>
                                      ) : productInvoices[item.product_id]
                                          ?.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-4 text-sm">
                                          No se encontraron facturas
                                        </p>
                                      ) : (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Factura</TableHead>
                                              <TableHead>Fecha</TableHead>
                                              <TableHead>Cliente</TableHead>
                                              <TableHead className="text-right">
                                                Cantidad
                                              </TableHead>
                                              <TableHead className="text-right">
                                                Costo Unit.
                                              </TableHead>
                                              <TableHead className="text-right">
                                                Precio Unit.
                                              </TableHead>
                                              <TableHead className="text-right">
                                                Total
                                              </TableHead>
                                              <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {productInvoices[
                                              item.product_id
                                            ]?.map((inv) => (
                                              <TableRow key={inv.sale_id}>
                                                <TableCell className="font-mono text-sm">
                                                  {inv.invoice_number}
                                                </TableCell>
                                                <TableCell>
                                                  {formatDate(inv.invoice_date)}
                                                </TableCell>
                                                <TableCell>
                                                  {inv.client_name || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {inv.quantity.toLocaleString(
                                                    "es-CO"
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                  {formatCurrency(item.purchase_price)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  {formatCurrency(inv.unit_price)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                  {formatCurrency(inv.total)}
                                                </TableCell>
                                                <TableCell>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.location.href = `/admin/sales/${inv.sale_id}`;
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
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-bold">
                            <TableCell />
                            <TableCell colSpan={3}>Totales</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(
                                report.items.reduce((sum, i) => sum + i.purchase_price * i.total_quantity, 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {report.totals.total_quantity.toLocaleString(
                                "es-CO"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_subtotal)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(report.totals.total_discount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_tax)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(report.totals.total_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {report.totals.total_sales_count.toLocaleString(
                                "es-CO"
                              )}
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
                  <p className="text-sm">Los resultados aparecerán aquí con gráficas y detalle por producto</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
