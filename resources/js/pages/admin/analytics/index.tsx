import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  reportsApi,
  productsApi,
  productCategoriesApi,
  type BestSellersReport,
  type TopClientsReport,
  type ProductProfitReport,
  type MonthlyGrowthReport,
  type Product,
  type ProductCategory,
} from "@/lib/api";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import { loadPdfLogo, addLogoToPdf } from "@/lib/pdf-logo";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  PackageX,
  Users,
  DollarSign,
  Percent,
  AlertTriangle,
  BarChart3,
  FileText,
  FileSpreadsheet,
  CalendarRange,
  ListOrdered,
  TableIcon,
  Search,
  CalendarIcon,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PiggyBank,
  Download,
  CircleCheck,
  Info,
  ArrowRightLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
  Line,
  ComposedChart,
} from "recharts";

function truncate(str: string, max: number) {
  return str.length > max ? str.substring(0, max) + "..." : str;
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#16a34a", "#ef4444", "#94a3b8"];

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value?.toLocaleString("es-CO")}
        </p>
      ))}
    </div>
  );
};

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
};

const EXPORT_SECTIONS = [
  { id: "ventas", name: "Ventas", description: "Top productos más vendidos, ranking por cantidad y distribución de ingresos", icon: ShoppingBag, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-500/15" },
  { id: "stock", name: "Inventario", description: "Productos con stock bajo, déficit y alertas de reabastecimiento", icon: PackageX, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-500/15" },
  { id: "clientes", name: "Clientes", description: "Ranking de clientes por frecuencia de compra y monto facturado", icon: Users, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-500/15" },
  { id: "rentabilidad", name: "Rentabilidad", description: "Análisis de márgenes, ingresos vs costos y utilidad por producto", icon: Percent, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-500/15" },
  { id: "crecimiento", name: "Crecimiento", description: "Comparativo mensual año actual vs anterior y tendencia de ventas", icon: TrendingUp, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-500/15" },
];

const MEDAL_CONFIG = [
  { position: 1, emoji: "🥇", border: "border-yellow-300 dark:border-yellow-500/30", bg: "bg-yellow-50 dark:bg-yellow-500/10", ring: "ring-yellow-200 dark:ring-yellow-500/20" },
  { position: 2, emoji: "🥈", border: "border-slate-300 dark:border-slate-500/30", bg: "bg-slate-50 dark:bg-slate-500/10", ring: "ring-slate-200 dark:ring-slate-500/20" },
  { position: 3, emoji: "🥉", border: "border-orange-300 dark:border-orange-500/30", bg: "bg-orange-50 dark:bg-orange-500/10", ring: "ring-orange-200 dark:ring-orange-500/20" },
];

function PodiumCard({ position, name, metric, metricLabel, sub }: { position: number; name: string; metric: string; metricLabel: string; sub: string }) {
  const config = MEDAL_CONFIG[position - 1];
  if (!config) return null;
  const isFirst = position === 1;
  return (
    <div className={cn(
      "relative flex flex-col items-center text-center rounded-xl border-2 p-4 transition-all",
      config.border, config.bg,
      isFirst && "ring-2 ring-offset-1 dark:ring-offset-background scale-105 z-10 shadow-md",
      isFirst ? config.ring : ""
    )}>
      <span className="text-2xl mb-1">{config.emoji}</span>
      <p className={cn("font-bold text-foreground leading-tight", isFirst ? "text-sm" : "text-xs")}>{name}</p>
      <p className={cn("font-extrabold text-foreground mt-1", isFirst ? "text-lg" : "text-base")}>{metric}</p>
      <p className="text-[10px] text-muted-foreground">{metricLabel}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const canView = hasPermission("analytics.view", user);

  const { toast } = useToast();
  const [periodPreset, setPeriodPreset] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeTab, setActiveTab] = useState("ventas");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [error, setError] = useState("");
  const [exportSections, setExportSections] = useState<Set<string>>(new Set(["ventas", "stock", "clientes", "rentabilidad", "crecimiento"]));
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportModalLabel, setExportModalLabel] = useState("");
  const [exportTargetSections, setExportTargetSections] = useState<Set<string>>(new Set());

  // Refs for PDF export - chart containers only (for image capture)
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [bestSellers, setBestSellers] = useState<BestSellersReport | null>(null);
  const [topClientsByCount, setTopClientsByCount] = useState<TopClientsReport | null>(null);
  const [topClientsByAmount, setTopClientsByAmount] = useState<TopClientsReport | null>(null);
  const [productProfit, setProductProfit] = useState<ProductProfitReport | null>(null);
  const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowthReport | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Inventory comparison state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [salesCategoryFilter, setSalesCategoryFilter] = useState("all");
  const [stockCompareFrom, setStockCompareFrom] = useState("");
  const [stockCompareTo, setStockCompareTo] = useState("");
  const [stockPeriodA, setStockPeriodA] = useState<BestSellersReport | null>(null);
  const [stockPeriodB, setStockPeriodB] = useState<BestSellersReport | null>(null);
  const [stockCompareLoading, setStockCompareLoading] = useState(false);

  useEffect(() => {
    // Load categories on mount
    productCategoriesApi.getAll().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
    }
  }, [canView]);

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodPreset(value);
    if (value === "custom") return;
    const today = new Date();
    const to = today.toISOString().split("T")[0];
    let from = new Date();
    if (value === "1m") from.setMonth(from.getMonth() - 1);
    else if (value === "2m") from.setMonth(from.getMonth() - 2);
    else if (value === "3m") from.setMonth(from.getMonth() - 3);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(to);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "Fechas requeridas",
        description: "Seleccione la fecha inicial y final del periodo",
        variant: "destructive",
      });
      return;
    }
    if (dateFrom > dateTo) {
      toast({
        title: "Rango inválido",
        description: "La fecha inicial no puede ser mayor a la fecha final",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setError("");
      const currentYear = new Date().getFullYear();

      const [sellers, clientsCount, clientsAmount, profit, growth, lowStock] = await Promise.all([
        reportsApi.bestSellers({ date_from: dateFrom, date_to: dateTo, limit: 10, order_by: "quantity" }),
        reportsApi.topClients({ date_from: dateFrom, date_to: dateTo, limit: 10, order_by: "count" }),
        reportsApi.topClients({ date_from: dateFrom, date_to: dateTo, limit: 10, order_by: "amount" }),
        reportsApi.productProfit({ date_from: dateFrom, date_to: dateTo }),
        reportsApi.monthlyGrowth({ year: currentYear }),
        productsApi.getLowStock(),
      ]);

      setBestSellers(sellers);
      setTopClientsByCount(clientsCount);
      setTopClientsByAmount(clientsAmount);
      setProductProfit(profit);
      setMonthlyGrowth(growth);
      setLowStockProducts(lowStock);
      setHasSearched(true);
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      setError(err.message || "Error al cargar los datos de análisis");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  const handleExportExcel = async (sections?: Set<string>) => {
    try {
      setExporting(true);
      const sArr = sections ? Array.from(sections) : undefined;
      const blob = await reportsApi.exportAnalytics({ format: 'excel', date_from: dateFrom, date_to: dateTo, sections: sArr });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analisis_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Exportación exitosa", description: "El archivo Excel se ha descargado correctamente." });
    } catch (err: any) {
      console.error("Error exporting:", err);
      toast({ title: "Error al exportar", description: err.message || "No se pudo generar el archivo", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleStockCompare = async () => {
    if (!stockCompareFrom || !stockCompareTo) {
      toast({ title: "Fechas requeridas", description: "Selecciona ambos meses para comparar.", variant: "destructive" });
      return;
    }
    try {
      setStockCompareLoading(true);
      const catFilter = stockCategoryFilter !== "all" ? Number(stockCategoryFilter) : undefined;
      // Period A = stockCompareFrom (YYYY-MM), Period B = stockCompareTo (YYYY-MM)
      const startA = `${stockCompareFrom}-01`;
      const endA = new Date(Number(stockCompareFrom.split("-")[0]), Number(stockCompareFrom.split("-")[1]), 0).toISOString().split("T")[0];
      const startB = `${stockCompareTo}-01`;
      const endB = new Date(Number(stockCompareTo.split("-")[0]), Number(stockCompareTo.split("-")[1]), 0).toISOString().split("T")[0];
      const [a, b] = await Promise.all([
        reportsApi.bestSellers({ date_from: startA, date_to: endA, limit: 50, order_by: "quantity", category_id: catFilter }),
        reportsApi.bestSellers({ date_from: startB, date_to: endB, limit: 50, order_by: "quantity", category_id: catFilter }),
      ]);
      setStockPeriodA(a);
      setStockPeriodB(b);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la comparativa.", variant: "destructive" });
    } finally {
      setStockCompareLoading(false);
    }
  };

  const handleExportPdf = async (sections?: Set<string>) => {
    const targetSections = sections ?? new Set(["ventas", "stock", "clientes", "rentabilidad", "crecimiento"]);
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
      const generatedDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const date_from = dateFrom;
      const date_to = dateTo;

      // ── Footer on every page (called after all content is done) ──
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

      // Company name (left)
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

      // Report type badge + title (right)
      const rightX = pageWidth - margin;
      pdf.setFillColor(238, 242, 255);
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeText = 'ANÁLISIS';
      const badgeW = pdf.getTextWidth(badgeText) + 6;
      pdf.roundedRect(rightX - badgeW, currentY - 1, badgeW, 5, 1, 1, 'F');
      pdf.text(badgeText, rightX - badgeW + 3, currentY + 2.5);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text('Análisis del Negocio', rightX, currentY + 9, { align: 'right' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${date_from} a ${date_to}`, rightX, currentY + 13, { align: 'right' });
      pdf.text(`Generado el ${generatedDate}`, rightX, currentY + 16.5, { align: 'right' });

      // Header line
      currentY += 20;
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      // ── Summary Cards ──
      const cardData = [
        { label: 'TOTAL VENTAS', value: formatCurrency(bestSellers?.totals.total_amount ?? 0), sub: `${bestSellers?.totals.products_count ?? 0} productos`, bg: [236, 253, 245], border: [167, 243, 208], color: [5, 150, 105] },
        { label: 'CLIENTES ACTIVOS', value: String(topClientsByAmount?.totals.clients_count ?? 0), sub: `${formatCurrency(topClientsByAmount?.totals.total_amount ?? 0)} facturado`, bg: [238, 242, 255], border: [199, 210, 254], color: [79, 70, 229] },
        { label: 'MARGEN PROMEDIO', value: `${productProfit?.totals.avg_margin ?? 0}%`, sub: `${formatCurrency(productProfit?.totals.total_profit ?? 0)} utilidad`, bg: [255, 251, 235], border: [253, 230, 138], color: [217, 119, 6] },
        { label: 'BAJO STOCK', value: String(lowStockProducts.length), sub: 'productos por reabastecer', bg: [254, 242, 242], border: [254, 202, 202], color: [220, 38, 38] },
      ];
      const cardW = (contentWidth - 6) / 4;
      cardData.forEach((card, idx) => {
        const x = margin + idx * (cardW + 2);
        // Card background
        pdf.setFillColor(card.bg[0], card.bg[1], card.bg[2]);
        pdf.setDrawColor(card.border[0], card.border[1], card.border[2]);
        pdf.roundedRect(x, currentY, cardW, 18, 1.5, 1.5, 'FD');
        // Label
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 114, 128);
        pdf.text(card.label, x + cardW / 2, currentY + 5, { align: 'center' });
        // Value
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(card.color[0], card.color[1], card.color[2]);
        pdf.text(card.value, x + cardW / 2, currentY + 11, { align: 'center' });
        // Sub
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(156, 163, 175);
        pdf.text(card.sub, x + cardW / 2, currentY + 15, { align: 'center' });
      });
      currentY += 24;

      // ── Temporarily show all tabs so charts can be captured ──
      setPdfExporting(true);
      await new Promise(r => setTimeout(r, 500));
      window.dispatchEvent(new Event('resize'));
      await new Promise(r => setTimeout(r, 2000));

      // ── Helpers ──
      const addSectionTitle = (title: string) => {
        if (currentY + 20 > pageHeight - 25) { pdf.addPage(); currentY = margin; }
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(margin, currentY, contentWidth, 7, 1, 1, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(title, margin + 4, currentY + 4.8);
        currentY += 9;
      };

      const addTable = (head: string[][], body: string[][]) => {
        autoTable(pdf, {
          startY: currentY,
          head,
          body,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [51, 51, 51] },
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', fontSize: 7, cellPadding: 2 },
          alternateRowStyles: { fillColor: [249, 250, 251] },
          didDrawPage: () => { currentY = margin; },
        });
        currentY = (pdf as any).lastAutoTable.finalY + 6;
      };

      // ── Helper: two charts side by side ──
      const addTwoChartImages = async (chartKey1: string, chartKey2: string) => {
        const el1 = chartRefs.current[chartKey1];
        const el2 = chartRefs.current[chartKey2];
        if (!el1 && !el2) return;
        const halfWidth = (contentWidth - 3) / 2;
        const captures: { dataUrl: string; naturalW: number; naturalH: number }[] = [];
        for (const el of [el1, el2]) {
          if (!el) { captures.push({ dataUrl: '', naturalW: 0, naturalH: 0 }); continue; }
          try {
            const dataUrl = await toJpeg(el, { pixelRatio: 1.5, quality: 0.8, backgroundColor: '#ffffff', skipFonts: true });
            const img = new Image();
            await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
            captures.push({ dataUrl, naturalW: img.width, naturalH: img.height });
          } catch { captures.push({ dataUrl: '', naturalW: 0, naturalH: 0 }); }
        }
        const heights = captures.map(c => c.naturalW > 0 ? (c.naturalH * halfWidth) / c.naturalW : 0);
        const maxH = Math.max(...heights);
        if (maxH <= 0) return;
        if (currentY + maxH > pageHeight - 25) { pdf.addPage(); currentY = margin; }
        if (captures[0].dataUrl) {
          pdf.addImage(captures[0].dataUrl, 'JPEG', margin, currentY, halfWidth, heights[0]);
        }
        if (captures[1].dataUrl) {
          pdf.addImage(captures[1].dataUrl, 'JPEG', margin + halfWidth + 3, currentY, halfWidth, heights[1]);
        }
        currentY += maxH + 3;
      };

      // ═══ 1. VENTAS ═══
      if (targetSections.has('ventas')) {
        addSectionTitle('Productos Más Vendidos');
        await addTwoChartImages('ventas', 'ventas-pie');
        if (bestSellers && bestSellers.items.length > 0) {
          addTable(
            [['#', 'Producto', 'SKU', 'Cantidad', 'Total', '% Part.']],
            bestSellers.items.map(i => [
              String(i.rank), i.product_name, i.sku || '-',
              i.total_quantity.toLocaleString('es-CO'), formatCurrency(i.total_amount), `${i.amount_percentage}%`,
            ])
          );
        }
      }

      // ═══ 2. INVENTARIO ═══
      if (targetSections.has('stock')) {
        addSectionTitle('Productos con Menos Stock');
        await addTwoChartImages('stock', 'stock-deficit');
        if (lowStockProducts.length > 0) {
          addTable(
            [['Producto', 'SKU', 'Actual', 'Mínimo', 'Faltan']],
            lowStockProducts.slice(0, 10).map(p => [
              p.name, p.sku || '-', String(p.current_stock), String(p.min_stock),
              `-${Math.max(0, p.min_stock - p.current_stock)}`,
            ])
          );
        }
      }

      // ═══ 3. CLIENTES ═══
      if (targetSections.has('clientes')) {
        addSectionTitle('Clientes — Recurrentes vs Mayor Monto');
        await addTwoChartImages('clientes-count', 'clientes-amount');
        if (topClientsByCount && topClientsByCount.items.length > 0) {
          addTable(
            [['#', 'Cliente', 'Contacto', 'Compras', 'Total', 'Ticket Prom.']],
            topClientsByCount.items.map(i => [
              String(i.rank), i.client_name, i.email || i.phone || '-',
              i.sales_count.toLocaleString('es-CO'), formatCurrency(i.total_amount), formatCurrency(i.avg_ticket),
            ])
          );
        }
        if (topClientsByAmount && topClientsByAmount.items.length > 0) {
          addTable(
            [['#', 'Cliente', 'Contacto', 'Total', 'Pagado', 'Pendiente']],
            topClientsByAmount.items.map(i => [
              String(i.rank), i.client_name, i.email || i.phone || '-',
              formatCurrency(i.total_amount), formatCurrency(i.total_paid), formatCurrency(i.total_balance),
            ])
          );
        }
      }

      // ═══ 4. RENTABILIDAD ═══
      if (targetSections.has('rentabilidad')) {
        addSectionTitle('Productos con Más Margen');
        await addTwoChartImages('rentabilidad', 'rentabilidad-comparison');
        if (topMarginItems.length > 0) {
          addTable(
            [['Producto', 'SKU', 'Ingresos', 'Costos', 'Utilidad', 'Margen']],
            topMarginItems.map(i => [
              i.product_name, i.sku || '-', formatCurrency(i.total_revenue),
              formatCurrency(i.total_cost), formatCurrency(i.profit), `${i.margin_percent}%`,
            ])
          );
        }
      }

      // ═══ 5. CRECIMIENTO ═══
      if (targetSections.has('crecimiento')) {
        addSectionTitle(`Crecimiento Mensual ${monthlyGrowth?.year || ''}`);
        await addTwoChartImages('crecimiento', 'crecimiento-percent');
        if (monthlyGrowth && monthlyGrowth.months.length > 0) {
          addTable(
            [['Mes', '# Ventas', 'Monto', 'Ticket Prom.', 'Crecimiento']],
            monthlyGrowth.months.map(m => [
              m.month_name, m.sales_count.toLocaleString('es-CO'), formatCurrency(m.total_amount),
              m.sales_count > 0 ? formatCurrency(m.avg_ticket) : '-',
              m.growth_percent !== null ? `${m.growth_percent > 0 ? '+' : ''}${m.growth_percent}%` : '-',
            ])
          );
        }
      }

      // Re-hide inactive tabs
      setPdfExporting(false);

      // Add footers to all pages
      addFooters();

      pdf.save(`analisis_${new Date().getTime()}.pdf`);
      toast({ title: "PDF generado", description: "El archivo PDF se ha descargado correctamente." });
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast({ title: "Error al exportar PDF", description: err.message || "No se pudo generar el archivo", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!canView) return null;

  // Chart data transformations
  // Filtered best sellers items by category
  const filteredBestSellerItems = useMemo(() => {
    if (!bestSellers) return [];
    if (salesCategoryFilter === "all") return bestSellers.items;
    return bestSellers.items.filter((i) => i.category_name === categories.find((c) => c.id === Number(salesCategoryFilter))?.name);
  }, [bestSellers, salesCategoryFilter, categories]);

  const bestSellersData = useMemo(() => {
    return filteredBestSellerItems.slice(0, 10).map((i) => ({
      name: truncate(i.product_name, 18),
      cantidad: i.total_quantity,
    }));
  }, [filteredBestSellerItems]);

  const clientsByCountData = useMemo(() => {
    if (!topClientsByCount) return [];
    return topClientsByCount.items.slice(0, 10).map((i) => ({
      name: truncate(i.client_name, 18),
      compras: i.sales_count,
    }));
  }, [topClientsByCount]);

  const clientsByAmountData = useMemo(() => {
    if (!topClientsByAmount) return [];
    return topClientsByAmount.items.slice(0, 10).map((i) => ({
      name: truncate(i.client_name, 18),
      total: i.total_amount,
    }));
  }, [topClientsByAmount]);

  const marginData = useMemo(() => {
    if (!productProfit) return [];
    return [...productProfit.items]
      .sort((a, b) => b.margin_percent - a.margin_percent)
      .slice(0, 10)
      .map((i) => ({
        name: truncate(i.product_name, 18),
        margen: i.margin_percent,
      }));
  }, [productProfit]);

  const topMarginItems = useMemo(() => {
    if (!productProfit) return [];
    return [...productProfit.items]
      .sort((a, b) => b.margin_percent - a.margin_percent)
      .slice(0, 10);
  }, [productProfit]);

  // Sales grouped by category (for pie chart) — uses all items, not filtered
  const salesByCategoryData = useMemo(() => {
    if (!bestSellers || !bestSellers.items.length) return [];
    const catMap = new Map<string, number>();
    bestSellers.items.forEach((i) => {
      const cat = i.category_name || "Sin categoría";
      catMap.set(cat, (catMap.get(cat) || 0) + i.total_amount);
    });
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name: truncate(name, 18),
        value,
        fill: PIE_COLORS[idx % PIE_COLORS.length],
      }));
  }, [bestSellers]);

  // Dual growth data (current year vs previous year)
  const dualGrowthData = useMemo(() => {
    if (!monthlyGrowth) return [];
    return monthlyGrowth.months.map((m) => ({
      name: m.month_name.substring(0, 3),
      actual: m.total_amount,
      anterior: m.prev_year_amount,
    }));
  }, [monthlyGrowth]);

  // Revenue vs Cost comparison (second chart for rentabilidad)
  const profitComparisonData = useMemo(() => {
    if (!productProfit) return [];
    return [...productProfit.items]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8)
      .map((i) => ({
        name: truncate(i.product_name, 14),
        ingresos: i.total_revenue,
        costos: i.total_cost,
      }));
  }, [productProfit]);

  // Monthly growth % bars (second chart for crecimiento)
  const growthPercentData = useMemo(() => {
    if (!monthlyGrowth) return [];
    return monthlyGrowth.months
      .filter((m) => m.total_amount > 0 || m.prev_year_amount > 0)
      .map((m) => ({
        name: m.month_name.substring(0, 3),
        crecimiento: m.growth_percent,
        transacciones: m.sales_count,
      }));
  }, [monthlyGrowth]);

  // Extra KPIs computed from existing data
  const extraKpis = useMemo(() => {
    const totalTransactions = monthlyGrowth?.totals.year_sales_count ?? 0;
    const yearTotal = monthlyGrowth?.totals.year_total ?? 0;
    const avgTicket = totalTransactions > 0 ? yearTotal / totalTransactions : 0;
    const yearGrowth = monthlyGrowth?.totals.year_growth ?? 0;
    const pendingBalance = topClientsByAmount?.totals.total_balance ?? 0;
    const totalPaid = topClientsByAmount?.totals.total_paid ?? 0;
    const collectionRate = (totalPaid + pendingBalance) > 0
      ? ((totalPaid / (totalPaid + pendingBalance)) * 100)
      : 0;
    return { totalTransactions, avgTicket, yearGrowth, pendingBalance, collectionRate };
  }, [monthlyGrowth, topClientsByAmount]);

  // Filtered low stock by category
  const filteredLowStock = useMemo(() => {
    if (stockCategoryFilter === "all") return lowStockProducts;
    return lowStockProducts.filter((p) => p.category_id === Number(stockCategoryFilter));
  }, [lowStockProducts, stockCategoryFilter]);

  const filteredLowStockData = useMemo(() => {
    return filteredLowStock.slice(0, 10).map((p) => ({
      name: truncate(p.name, 18),
      actual: p.current_stock,
      minimo: p.min_stock,
    }));
  }, [filteredLowStock]);

  const filteredStockDeficitData = useMemo(() => {
    return filteredLowStock.slice(0, 10).map((p) => ({
      name: truncate(p.name, 18),
      deficit: Math.max(0, p.min_stock - p.current_stock),
    }));
  }, [filteredLowStock]);

  // Inventory comparison data
  const stockCompareData = useMemo(() => {
    if (!stockPeriodA || !stockPeriodB) return [];
    const mapA = new Map(stockPeriodA.items.map((i) => [i.product_id, i]));
    const mapB = new Map(stockPeriodB.items.map((i) => [i.product_id, i]));
    const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
    return Array.from(allIds).map((id) => {
      const a = mapA.get(id);
      const b = mapB.get(id);
      const qtyA = a?.total_quantity ?? 0;
      const qtyB = b?.total_quantity ?? 0;
      const diff = qtyB - qtyA;
      const pct = qtyA > 0 ? ((diff / qtyA) * 100) : (qtyB > 0 ? 100 : 0);
      return {
        product_id: id,
        name: (b?.product_name || a?.product_name) ?? "Producto",
        sku: (b?.sku || a?.sku) ?? "",
        qtyA,
        qtyB,
        amountA: a?.total_amount ?? 0,
        amountB: b?.total_amount ?? 0,
        diff,
        pct: Math.round(pct),
      };
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 20);
  }, [stockPeriodA, stockPeriodB]);

  const stockCompareChartData = useMemo(() => {
    return stockCompareData.slice(0, 10).map((i) => ({
      name: truncate(i.name, 14),
      "Mes A": i.qtyA,
      "Mes B": i.qtyB,
    }));
  }, [stockCompareData]);

  const hasData = bestSellers || lowStockProducts.length || topClientsByCount || topClientsByAmount || productProfit || monthlyGrowth;

  const getMarginBadge = (margin: number) => {
    if (margin >= 40) return <Badge className="bg-green-600 text-white">{margin}%</Badge>;
    if (margin >= 20) return <Badge className="bg-green-500/100 text-white">{margin}%</Badge>;
    if (margin >= 10) return <Badge className="bg-yellow-500/100 text-white">{margin}%</Badge>;
    if (margin > 0) return <Badge className="bg-orange-500/100 text-white">{margin}%</Badge>;
    return <Badge className="bg-red-600 text-white">{margin}%</Badge>;
  };

  const emptyChart = (msg: string) => (
    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
      {msg}
    </div>
  );

  const emptyTable = (msg: string) => (
    <p className="text-center text-muted-foreground py-6 text-sm">{msg}</p>
  );

  return (
    <AppLayout title="Análisis">
      <Head title="Análisis" />
      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6 relative">
        {/* Export overlay */}
        {exporting && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-xs">
              <Spinner size="lg" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Generando exportación...</p>
                <p className="text-xs text-muted-foreground mt-1">Capturando gráficas y construyendo el informe</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Análisis</h1>
                  <p className="text-sm text-muted-foreground">Resumen ejecutivo del negocio</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasSearched && (
                  <Badge variant="secondary" className="text-xs">
                    {dateFrom} a {dateTo}
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats Cards - 8 KPIs PRO */}
            {!loading && hasSearched && hasData && (
              <div className="space-y-3 mt-4">
                {/* Row 1 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Total Ventas */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-emerald-100 dark:bg-emerald-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px]">
                          {bestSellers?.totals.products_count ?? 0} productos
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Ventas</p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {formatCurrency(bestSellers?.totals.total_amount ?? 0)}
                      </p>
                    </div>
                  </Card>

                  {/* # Transacciones */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-blue-100 dark:bg-blue-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <Receipt className="h-4 w-4 text-blue-600" />
                        </div>
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px]">
                          anual
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Transacciones</p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {extraKpis.totalTransactions.toLocaleString("es-CO")}
                      </p>
                    </div>
                  </Card>

                  {/* Ticket Promedio */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-indigo-100 dark:bg-indigo-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <Target className="h-4 w-4 text-indigo-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ticket Promedio</p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {formatCurrency(extraKpis.avgTicket)}
                      </p>
                    </div>
                  </Card>

                  {/* Crecimiento Anual */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${extraKpis.yearGrowth >= 0 ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-red-100 dark:bg-red-500/15"}`}>
                          {extraKpis.yearGrowth >= 0
                            ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                            : <ArrowDownRight className="h-4 w-4 text-red-600" />
                          }
                        </div>
                        <Badge className={`text-[10px] ${extraKpis.yearGrowth >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"}`}>
                          vs. año anterior
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Crecimiento</p>
                      <p className={`text-2xl font-bold tracking-tight ${extraKpis.yearGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {extraKpis.yearGrowth > 0 && "+"}{extraKpis.yearGrowth}%
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Clientes Activos */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-purple-100 dark:bg-purple-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Clientes Activos</p>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {topClientsByAmount?.totals.clients_count ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(topClientsByAmount?.totals.total_amount ?? 0)} facturado
                      </p>
                    </div>
                  </Card>

                  {/* Margen Promedio */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-amber-100 dark:bg-amber-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <Percent className="h-4 w-4 text-amber-600" />
                        </div>
                        <Badge className={`text-[10px] ${(productProfit?.totals.avg_margin ?? 0) >= 20 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : (productProfit?.totals.avg_margin ?? 0) >= 10 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"}`}>
                          {(productProfit?.totals.avg_margin ?? 0) >= 20 ? "Saludable" : (productProfit?.totals.avg_margin ?? 0) >= 10 ? "Moderado" : "Bajo"}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Margen Promedio</p>
                      <p className={`text-2xl font-bold tracking-tight ${(productProfit?.totals.avg_margin ?? 0) >= 0 ? "text-foreground" : "text-red-600"}`}>
                        {productProfit?.totals.avg_margin ?? 0}%
                      </p>
                    </div>
                  </Card>

                  {/* Utilidad Total */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-teal-100 dark:bg-teal-500/15 p-2 rounded-lg group-hover:scale-110 transition-transform">
                          <PiggyBank className="h-4 w-4 text-teal-600" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Utilidad Total</p>
                      <p className={`text-2xl font-bold tracking-tight ${(productProfit?.totals.total_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(productProfit?.totals.total_profit ?? 0)}
                      </p>
                    </div>
                  </Card>

                  {/* Cartera Pendiente */}
                  <Card className="bg-card border border-border hover:shadow-lg transition-all duration-200 group">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${extraKpis.pendingBalance > 0 ? "bg-orange-100 dark:bg-orange-500/15" : "bg-emerald-100 dark:bg-emerald-500/15"}`}>
                          <Wallet className={`h-4 w-4 ${extraKpis.pendingBalance > 0 ? "text-orange-600" : "text-emerald-600"}`} />
                        </div>
                        {lowStockProducts.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            <span className="text-[10px] font-medium text-red-600">{lowStockProducts.length} bajo stock</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cartera Pendiente</p>
                      <p className={`text-2xl font-bold tracking-tight ${extraKpis.pendingBalance > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                        {formatCurrency(extraKpis.pendingBalance)}
                      </p>
                      {extraKpis.collectionRate > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Recaudo</span>
                            <span className="font-medium">{extraKpis.collectionRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(extraKpis.collectionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          {error && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400 border border-red-500/20 mb-6">
              {error}
            </div>
          )}

          {/* Filters */}
          <Card className={cn("border mb-6 transition-all duration-300", !hasSearched ? "shadow-lg border-[#2463eb]/30 ring-2 ring-[#2463eb]/10" : "shadow-sm")}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="space-y-1 w-full sm:w-48">
                  <Label className="text-xs text-muted-foreground">Periodo</Label>
                  <Select value={periodPreset} onValueChange={handlePeriodChange}>
                    <SelectTrigger className={cn("h-9 text-sm bg-background", !hasSearched && "border-[#2463eb]/40")}>
                      <SelectValue placeholder="Seleccionar periodo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="1m">Último mes</SelectItem>
                      <SelectItem value="2m">Últimos 2 meses</SelectItem>
                      <SelectItem value="3m">Últimos 3 meses</SelectItem>
                      <SelectItem value="custom">Personalizar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {periodPreset === "custom" && (
                  <>
                    <div className="space-y-1 flex-1 w-full sm:w-auto">
                      <Label className="text-xs text-muted-foreground">Fecha Inicial</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !dateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                            {dateFrom ? new Date(dateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerReport
                            selected={dateFrom ? new Date(dateFrom + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                setDateFrom(`${y}-${m}-${d}`);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1 flex-1 w-full sm:w-auto">
                      <Label className="text-xs text-muted-foreground">Fecha Final</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !dateTo && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                            {dateTo ? new Date(dateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerReport
                            selected={dateTo ? new Date(dateTo + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                setDateTo(`${y}-${m}-${d}`);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
                <Button onClick={handleSearch} size="sm" className={cn("gap-2 h-9 w-full sm:w-auto", !hasSearched && "bg-[#2463eb] hover:bg-[#1d4ed8] text-white shadow-md shadow-[#2463eb]/25 animate-pulse hover:animate-none")} disabled={loading}>
                  {loading ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                  Consultar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border border-border p-0">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground">Cargando análisis...</p>
                </div>
              </div>
            )}

            {!loading && hasSearched && hasData && (
              <div className="p-4 sm:p-6 pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="ventas" className="gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Ventas</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="gap-1.5">
                <PackageX className="h-4 w-4" />
                <span className="hidden sm:inline">Inventario</span>
                {lowStockProducts.length > 0 && (
                  <span className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/20 text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{lowStockProducts.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-1.5">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clientes</span>
              </TabsTrigger>
              <TabsTrigger value="rentabilidad" className="gap-1.5">
                <Percent className="h-4 w-4" />
                <span className="hidden sm:inline">Rentabilidad</span>
              </TabsTrigger>
              <TabsTrigger value="crecimiento" className="gap-1.5">
                <CalendarRange className="h-4 w-4" />
                <span className="hidden sm:inline">Crecimiento</span>
              </TabsTrigger>
              <TabsTrigger value="exportar" className="gap-1.5">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </TabsTrigger>
            </TabsList>

            {/* ═══ Tab: Ventas ═══ */}
            <TabsContent value="ventas" forceMount className={`mt-4 ${!pdfExporting && activeTab !== 'ventas' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                {/* Filtro por categoría */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1 w-full sm:w-52">
                    <Label className="text-xs text-muted-foreground">Filtrar por Categoría</Label>
                    <Select value={salesCategoryFilter} onValueChange={setSalesCategoryFilter}>
                      <SelectTrigger className="h-9 text-sm bg-background">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="secondary" className="text-xs h-9 px-3 flex items-center">
                    {filteredBestSellerItems.length} producto{filteredBestSellerItems.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {/* Gráficas lado a lado */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['ventas'] = el; }} className="xl:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                        Top 10 Productos Más Vendidos
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px] ml-auto">por cantidad</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bestSellersData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={bestSellersData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Bar dataKey="cantidad" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Cantidad">
                              {bestSellersData.map((_entry, index) => (
                                <Cell key={index} fill={index === 0 ? "#2463eb" : index < 3 ? "#3b82f6" : "#93c5fd"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>

                  {/* Pie Chart - Ventas por Categoría */}
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['ventas-pie'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-emerald-500" />
                        Ventas por Categoría
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {salesByCategoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={salesByCategoryData}
                              cx="50%"
                              cy="45%"
                              innerRadius={55}
                              outerRadius={95}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {salesByCategoryData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                            <Legend
                              verticalAlign="bottom"
                              height={50}
                              formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos")}
                    </CardContent>
                  </Card>
                </div>

                {/* Podio Top Productos */}
                {filteredBestSellerItems.length >= 1 && (
                  <div className={cn("grid gap-3 items-end mt-2", filteredBestSellerItems.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : filteredBestSellerItems.length === 2 ? "grid-cols-2 max-w-md mx-auto" : "grid-cols-3")}>
                    {filteredBestSellerItems.length >= 2 && (
                      <PodiumCard
                        position={2}
                        name={filteredBestSellerItems[1].product_name}
                        metric={filteredBestSellerItems[1].total_quantity.toLocaleString("es-CO")}
                        metricLabel="unidades vendidas"
                        sub={formatCurrency(filteredBestSellerItems[1].total_amount)}
                      />
                    )}
                    <PodiumCard
                      position={1}
                      name={filteredBestSellerItems[0].product_name}
                      metric={filteredBestSellerItems[0].total_quantity.toLocaleString("es-CO")}
                      metricLabel="unidades vendidas"
                      sub={formatCurrency(filteredBestSellerItems[0].total_amount)}
                    />
                    {filteredBestSellerItems.length >= 3 && (
                      <PodiumCard
                        position={3}
                        name={filteredBestSellerItems[2].product_name}
                        metric={filteredBestSellerItems[2].total_quantity.toLocaleString("es-CO")}
                        metricLabel="unidades vendidas"
                        sub={formatCurrency(filteredBestSellerItems[2].total_amount)}
                      />
                    )}
                  </div>
                )}

                {/* Tabla desglose */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-blue-500" />
                      Ranking de Más Vendidos
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 border text-[10px]">
                        {filteredBestSellerItems.length} productos
                      </Badge>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {filteredBestSellerItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">#</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-right">Cant.</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">% Part.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredBestSellerItems.map((item, idx) => (
                              <TableRow key={item.product_id}>
                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">{item.sku || "Sin SKU"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {item.total_quantity.toLocaleString("es-CO")}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.total_amount)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {item.amount_percentage}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : emptyTable("Sin datos en el periodo seleccionado")}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══ Tab: Inventario / Stock ═══ */}
            <TabsContent value="stock" forceMount className={`mt-4 ${!pdfExporting && activeTab !== 'stock' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                {/* Filtro por categoría */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1 w-full sm:w-52">
                    <Label className="text-xs text-muted-foreground">Filtrar por Categoría</Label>
                    <Select value={stockCategoryFilter} onValueChange={setStockCategoryFilter}>
                      <SelectTrigger className="h-9 text-sm bg-background">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="secondary" className="text-xs h-9 px-3 flex items-center">
                    {filteredLowStock.length} producto{filteredLowStock.length !== 1 ? "s" : ""} con stock bajo
                  </Badge>
                </div>

                {/* Alert banner */}
                {filteredLowStock.length > 0 ? (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3">
                    <div className="bg-red-100 dark:bg-red-500/15 p-2 rounded-lg shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-400">
                        {filteredLowStock.length} producto{filteredLowStock.length !== 1 ? "s" : ""} con stock bajo
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-500">
                        {filteredLowStock.filter(p => p.current_stock === 0).length > 0
                          ? `${filteredLowStock.filter(p => p.current_stock === 0).length} sin stock disponible`
                          : "Todos tienen algo de stock pero por debajo del mínimo"
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-4 py-3">
                    <div className="bg-emerald-100 dark:bg-emerald-500/15 p-2 rounded-lg shrink-0">
                      <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Todos los productos tienen stock suficiente</p>
                  </div>
                )}

                {/* Gráficas lado a lado (filtradas) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['stock'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <PackageX className="h-4 w-4 text-red-500" />
                        Stock Actual vs Mínimo
                        <Badge className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 text-[10px] ml-auto">comparativo</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredLowStockData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={filteredLowStockData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Bar dataKey="actual" fill="#ef4444" radius={[0, 6, 6, 0]} name="Stock Actual" />
                            <Bar dataKey="minimo" fill="#cbd5e1" radius={[0, 6, 6, 0]} name="Stock Mínimo" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin productos con stock bajo en esta categoría")}
                    </CardContent>
                  </Card>

                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['stock-deficit'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Unidades Faltantes
                        <Badge className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 text-[10px] ml-auto">déficit</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredStockDeficitData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={filteredStockDeficitData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Bar dataKey="deficit" fill="#f97316" radius={[0, 6, 6, 0]} name="Unidades Faltantes">
                              {filteredStockDeficitData.map((_entry, index) => (
                                <Cell key={index} fill={_entry.deficit > 10 ? "#dc2626" : _entry.deficit > 5 ? "#f97316" : "#fbbf24"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin déficit")}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de stock bajo filtrada */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-red-500" />
                      Detalle de Stock Bajo
                      <Badge className="bg-red-500/15 text-red-700 border-red-500/20 border text-[10px]">
                        {filteredLowStock.length} productos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredLowStock.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead>Categoría</TableHead>
                              <TableHead className="text-right">Actual</TableHead>
                              <TableHead className="text-right">Mínimo</TableHead>
                              <TableHead className="text-right">Faltan</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredLowStock.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.sku || "Sin SKU"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p.category?.name || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-semibold ${p.current_stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                                    {p.current_stock}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{p.min_stock}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-red-500/15 text-red-700 border-red-500/20 border text-[10px]">
                                    -{Math.max(0, p.min_stock - p.current_stock)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : emptyTable("Sin productos con stock bajo")}
                  </CardContent>
                </Card>

                {/* ── Comparativa Mes a Mes ── */}
                <Card className="border-2 border-dashed border-blue-200 dark:border-blue-500/20 bg-blue-50/30 dark:bg-blue-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                      Comparativa de Movimiento — Mes vs Mes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-end gap-3 mb-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mes A</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 w-44 justify-start text-left font-normal text-sm", !stockCompareFrom && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {stockCompareFrom
                                ? new Date(stockCompareFrom + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
                                : "Seleccionar mes"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport
                              mode="month"
                              selected={stockCompareFrom ? new Date(stockCompareFrom + '-15') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setStockCompareFrom(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Mes B</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 w-44 justify-start text-left font-normal text-sm", !stockCompareTo && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {stockCompareTo
                                ? new Date(stockCompareTo + '-15').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
                                : "Seleccionar mes"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport
                              mode="month"
                              selected={stockCompareTo ? new Date(stockCompareTo + '-15') : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setStockCompareTo(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button size="sm" className="gap-2 h-9" onClick={handleStockCompare} disabled={stockCompareLoading}>
                        {stockCompareLoading ? <Spinner className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
                        Comparar
                      </Button>
                    </div>

                    {stockCompareData.length > 0 && (
                      <div className="space-y-4">
                        {/* Gráfica comparativa */}
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={stockCompareChartData} margin={{ left: 10, right: 10, top: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} />
                            <YAxis fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
                            <Bar dataKey="Mes A" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Mes B" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>

                        {/* Tabla comparativa */}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cant. Mes A</TableHead>
                                <TableHead className="text-right">Ventas Mes A</TableHead>
                                <TableHead className="text-right">Cant. Mes B</TableHead>
                                <TableHead className="text-right">Ventas Mes B</TableHead>
                                <TableHead className="text-right">Diferencia</TableHead>
                                <TableHead className="text-center">Variación</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stockCompareData.map((item) => (
                                <TableRow key={item.product_id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-sm">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{item.sku || ""}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.qtyA.toLocaleString("es-CO")}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.amountA)}</TableCell>
                                  <TableCell className="text-right font-semibold">{item.qtyB.toLocaleString("es-CO")}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{formatCurrency(item.amountB)}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={item.diff > 0 ? "text-emerald-600 font-semibold" : item.diff < 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                                      {item.diff > 0 && "+"}{item.diff.toLocaleString("es-CO")}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={
                                      item.pct > 0
                                        ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                        : item.pct < 0
                                          ? "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                                          : "bg-gray-100 dark:bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-500/20"
                                    }>
                                      {item.pct > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : item.pct < 0 ? <ArrowDownRight className="h-3 w-3 mr-0.5" /> : null}
                                      {item.pct > 0 && "+"}{item.pct}%
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {!stockCompareLoading && stockCompareData.length === 0 && stockPeriodA === null && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Selecciona dos meses y presiona <strong>Comparar</strong> para ver el movimiento de productos
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══ Tab: Clientes ═══ */}
            <TabsContent value="clientes" forceMount className={`mt-4 ${!pdfExporting && activeTab !== 'clientes' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                {/* Mini KPIs de clientes */}
                {topClientsByAmount && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider">Clientes Activos</p>
                      <p className="text-lg font-bold text-purple-900 dark:text-purple-400">{topClientsByAmount.totals.clients_count ?? 0}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Total Facturado</p>
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-400">{formatCurrency(topClientsByAmount.totals.total_amount ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Total Pagado</p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-400">{formatCurrency(topClientsByAmount.totals.total_paid ?? 0)}</p>
                    </div>
                    <div className={`border rounded-lg p-3 ${(topClientsByAmount.totals.total_balance ?? 0) > 0 ? "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20" : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"}`}>
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${(topClientsByAmount.totals.total_balance ?? 0) > 0 ? "text-orange-600" : "text-emerald-600"}`}>Saldo Pendiente</p>
                      <p className={`text-lg font-bold ${(topClientsByAmount.totals.total_balance ?? 0) > 0 ? "text-orange-900 dark:text-orange-400" : "text-emerald-900 dark:text-emerald-400"}`}>
                        {formatCurrency(topClientsByAmount.totals.total_balance ?? 0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Fila 1: Gráficas */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['clientes-count'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Clientes Más Recurrentes
                        <Badge className="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 text-[10px] ml-auto">por frecuencia</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientsByCountData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={clientsByCountData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Bar dataKey="compras" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Compras">
                              {clientsByCountData.map((_entry, index) => (
                                <Cell key={index} fill={index === 0 ? "#7c3aed" : index < 3 ? "#8b5cf6" : "#c4b5fd"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['clientes-amount'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        Clientes que Más Compran
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px] ml-auto">por monto</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientsByAmountData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={clientsByAmountData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Bar dataKey="total" fill="#16a34a" radius={[0, 6, 6, 0]} name="Total">
                              {clientsByAmountData.map((_entry, index) => (
                                <Cell key={index} fill={index === 0 ? "#15803d" : index < 3 ? "#16a34a" : "#86efac"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>
                </div>

                {/* Podio Top Clientes */}
                {topClientsByAmount && topClientsByAmount.items.length >= 1 && (
                  <div className={cn("grid gap-3 items-end mt-2", topClientsByAmount.items.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : topClientsByAmount.items.length === 2 ? "grid-cols-2 max-w-md mx-auto" : "grid-cols-3")}>
                    {topClientsByAmount.items.length >= 2 && (
                      <PodiumCard
                        position={2}
                        name={topClientsByAmount.items[1].client_name}
                        metric={formatCurrency(topClientsByAmount.items[1].total_amount)}
                        metricLabel="total facturado"
                        sub={`${topClientsByAmount.items[1].sales_count} compras`}
                      />
                    )}
                    <PodiumCard
                      position={1}
                      name={topClientsByAmount.items[0].client_name}
                      metric={formatCurrency(topClientsByAmount.items[0].total_amount)}
                      metricLabel="total facturado"
                      sub={`${topClientsByAmount.items[0].sales_count} compras`}
                    />
                    {topClientsByAmount.items.length >= 3 && (
                      <PodiumCard
                        position={3}
                        name={topClientsByAmount.items[2].client_name}
                        metric={formatCurrency(topClientsByAmount.items[2].total_amount)}
                        metricLabel="total facturado"
                        sub={`${topClientsByAmount.items[2].sales_count} compras`}
                      />
                    )}
                  </div>
                )}

                {/* Fila 2: Tablas desglose */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-purple-500" />
                        Ranking por Frecuencia
                        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20 border text-[10px]">
                          {topClientsByCount?.items.length ?? 0}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {(topClientsByCount?.items?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Compras</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Ticket Prom.</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topClientsByCount?.items.map((item) => (
                                <TableRow key={item.client_id}>
                                  <TableCell className="font-medium">{item.rank}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-sm">{item.client_name}</p>
                                      <p className="text-xs text-muted-foreground">{item.email || item.phone || "-"}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {item.sales_count.toLocaleString("es-CO")}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(item.total_amount)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">
                                    {formatCurrency(item.avg_ticket)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : emptyTable("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ListOrdered className="h-4 w-4 text-green-500" />
                        Ranking por Monto
                        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 border text-[10px]">
                          {topClientsByAmount?.items.length ?? 0}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                      {(topClientsByAmount?.items?.length ?? 0) > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Pagado</TableHead>
                                <TableHead className="text-right">Pendiente</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {topClientsByAmount?.items.map((item) => (
                                <TableRow key={item.client_id}>
                                  <TableCell className="font-medium">{item.rank}</TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium text-sm">{item.client_name}</p>
                                      <p className="text-xs text-muted-foreground">{item.email || item.phone || "-"}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(item.total_amount)}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600">
                                    {formatCurrency(item.total_paid)}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">
                                    {formatCurrency(item.total_balance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : emptyTable("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ═══ Tab: Rentabilidad ═══ */}
            <TabsContent value="rentabilidad" forceMount className={`mt-4 ${!pdfExporting && activeTab !== 'rentabilidad' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                {/* Mini KPIs de rentabilidad */}
                {productProfit && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Ingresos Totales</p>
                      <p className="text-lg font-bold text-emerald-900 dark:text-emerald-400">{formatCurrency(productProfit.totals.total_revenue ?? 0)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-red-600 uppercase tracking-wider">Costos Totales</p>
                      <p className="text-lg font-bold text-red-900 dark:text-red-400">{formatCurrency(productProfit.totals.total_cost ?? 0)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Utilidad Neta</p>
                      <p className={`text-lg font-bold ${(productProfit.totals.total_profit ?? 0) >= 0 ? "text-blue-900 dark:text-blue-400" : "text-red-900 dark:text-red-400"}`}>
                        {formatCurrency(productProfit.totals.total_profit ?? 0)}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">Margen Promedio</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-bold text-amber-900 dark:text-amber-400">{productProfit.totals.avg_margin ?? 0}%</p>
                        <span className="text-[10px] text-muted-foreground">{productProfit.totals.products_count ?? 0} productos</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráficas lado a lado */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['rentabilidad'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                        Top Productos por Margen
                        <Badge className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 text-[10px] ml-auto">margen %</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {marginData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={marginData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                            <Tooltip
                              formatter={(value: any) => `${Number(value).toFixed(1)}%`}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            />
                            <Bar dataKey="margen" name="Margen %" radius={[0, 6, 6, 0]}>
                              {marginData.map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={entry.margen >= 30 ? "#16a34a" : entry.margen >= 15 ? "#f59e0b" : "#ef4444"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>

                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['rentabilidad-comparison'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        Ingresos vs Costos
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px] ml-auto">comparativo</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profitComparisonData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={profitComparisonData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={100} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomBarTooltip />} />
                            <Legend
                              verticalAlign="top"
                              height={30}
                              formatter={(value: string) => <span className="text-xs">{value}</span>}
                            />
                            <Bar dataKey="ingresos" fill="#16a34a" radius={[0, 4, 4, 0]} name="Ingresos" />
                            <Bar dataKey="costos" fill="#ef4444" radius={[0, 4, 4, 0]} name="Costos" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos en el periodo seleccionado")}
                    </CardContent>
                  </Card>
                </div>

                {/* Podio Top Rentabilidad */}
                {topMarginItems.length >= 1 && (
                  <div className={cn("grid gap-3 items-end mt-2", topMarginItems.length === 1 ? "grid-cols-1 max-w-xs mx-auto" : topMarginItems.length === 2 ? "grid-cols-2 max-w-md mx-auto" : "grid-cols-3")}>
                    {topMarginItems.length >= 2 && (
                      <PodiumCard
                        position={2}
                        name={topMarginItems[1].product_name}
                        metric={`${topMarginItems[1].margin_percent}%`}
                        metricLabel="margen"
                        sub={formatCurrency(topMarginItems[1].profit)}
                      />
                    )}
                    <PodiumCard
                      position={1}
                      name={topMarginItems[0].product_name}
                      metric={`${topMarginItems[0].margin_percent}%`}
                      metricLabel="margen"
                      sub={formatCurrency(topMarginItems[0].profit)}
                    />
                    {topMarginItems.length >= 3 && (
                      <PodiumCard
                        position={3}
                        name={topMarginItems[2].product_name}
                        metric={`${topMarginItems[2].margin_percent}%`}
                        metricLabel="margen"
                        sub={formatCurrency(topMarginItems[2].profit)}
                      />
                    )}
                  </div>
                )}

                {/* Tabla desglose */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-amber-500" />
                      Detalle de Rentabilidad
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 border text-[10px]">
                        {topMarginItems.length} productos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {topMarginItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Producto</TableHead>
                              <TableHead className="text-right">Ingresos</TableHead>
                              <TableHead className="text-right">Costos</TableHead>
                              <TableHead className="text-right">Utilidad</TableHead>
                              <TableHead className="text-center">Margen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {topMarginItems.map((item) => (
                              <TableRow key={item.product_id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">{item.sku || "Sin SKU"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-green-600">
                                  {formatCurrency(item.total_revenue)}
                                </TableCell>
                                <TableCell className="text-right text-red-600">
                                  {formatCurrency(item.total_cost)}
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {formatCurrency(item.profit)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {getMarginBadge(item.margin_percent)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : emptyTable("Sin datos en el periodo seleccionado")}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══ Tab: Crecimiento ═══ */}
            <TabsContent value="crecimiento" forceMount className={`mt-4 ${!pdfExporting && activeTab !== 'crecimiento' ? 'hidden' : ''}`}>
              <div className="space-y-4">
                {/* Mini KPIs de crecimiento */}
                {monthlyGrowth && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Ventas {monthlyGrowth.year}</p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-400">{formatCurrency(monthlyGrowth.totals.year_total ?? 0)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Ventas {monthlyGrowth.year - 1}</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-400">{formatCurrency(monthlyGrowth.totals.prev_year_total ?? 0)}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg p-3">
                      <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider"># Ventas {monthlyGrowth.year}</p>
                      <p className="text-lg font-bold text-indigo-900 dark:text-indigo-400">{(monthlyGrowth.totals.year_sales_count ?? 0).toLocaleString("es-CO")}</p>
                    </div>
                    <div className={`border rounded-lg p-3 ${(monthlyGrowth.totals.year_growth ?? 0) >= 0 ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"}`}>
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${(monthlyGrowth.totals.year_growth ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>Crecimiento Anual</p>
                      <div className="flex items-center gap-1.5">
                        {(monthlyGrowth.totals.year_growth ?? 0) >= 0
                          ? <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                          : <ArrowDownRight className="h-4 w-4 text-red-600" />
                        }
                        <p className={`text-lg font-bold ${(monthlyGrowth.totals.year_growth ?? 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                          {(monthlyGrowth.totals.year_growth ?? 0) > 0 && "+"}{monthlyGrowth.totals.year_growth ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gráficas lado a lado */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Gráfica dual: año actual vs anterior */}
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['crecimiento'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Comparativo Mensual
                        <Badge className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 text-[10px] ml-auto">
                          {monthlyGrowth ? `${monthlyGrowth.year - 1} vs ${monthlyGrowth.year}` : ""}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dualGrowthData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <ComposedChart data={dualGrowthData}>
                            <defs>
                              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} />
                            <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} fontSize={11} tickLine={false} />
                            <Tooltip content={<CustomAreaTooltip />} />
                            <Legend
                              verticalAlign="top"
                              height={36}
                              formatter={(value: string) => <span className="text-xs">{value}</span>}
                            />
                            <Area
                              type="monotone"
                              dataKey="actual"
                              stroke="#3b82f6"
                              fill="url(#gradActual)"
                              strokeWidth={2.5}
                              name={`${monthlyGrowth?.year ?? "Actual"}`}
                              dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                              activeDot={{ r: 6, fill: "#2463eb" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="anterior"
                              stroke="#94a3b8"
                              strokeWidth={1.5}
                              strokeDasharray="6 3"
                              name={`${monthlyGrowth ? monthlyGrowth.year - 1 : "Anterior"}`}
                              dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos para el año actual")}
                    </CardContent>
                  </Card>

                  {/* Crecimiento % por mes */}
                  <Card ref={(el: HTMLDivElement | null) => { chartRefs.current['crecimiento-percent'] = el; }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-emerald-500" />
                        Crecimiento % Mensual
                        <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px] ml-auto">vs. año anterior</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {growthPercentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                          <BarChart data={growthPercentData} margin={{ left: 0, right: 10, top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" fontSize={11} tickLine={false} />
                            <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} tickLine={false} />
                            <Tooltip
                              formatter={(value: any, name: any) =>
                                name === "Crecimiento" ? `${Number(value).toFixed(1)}%` : value?.toLocaleString("es-CO")
                              }
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            />
                            <Bar dataKey="crecimiento" name="Crecimiento" radius={[4, 4, 0, 0]}>
                              {growthPercentData.map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={entry.crecimiento > 0 ? "#16a34a" : entry.crecimiento < 0 ? "#ef4444" : "#94a3b8"}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : emptyChart("Sin datos de crecimiento")}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla desglose */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-blue-500" />
                      Detalle Mensual {monthlyGrowth?.year}
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20 border text-[10px]">
                        {monthlyGrowth?.months.length ?? 0} meses
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {(monthlyGrowth?.months?.length ?? 0) > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mes</TableHead>
                              <TableHead className="text-right"># Ventas</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead className="text-right">Ticket Prom.</TableHead>
                              <TableHead className="text-center">Crecimiento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthlyGrowth?.months.map((m) => (
                              <TableRow key={m.month}>
                                <TableCell className="font-medium">{m.month_name}</TableCell>
                                <TableCell className="text-right">
                                  {m.sales_count.toLocaleString("es-CO")}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(m.total_amount)}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {m.sales_count > 0 ? formatCurrency(m.avg_ticket) : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {m.total_amount > 0 || m.prev_year_amount > 0 ? (
                                    <Badge className={
                                      m.growth_percent > 0
                                        ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 border"
                                        : m.growth_percent < 0
                                          ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 border"
                                          : "bg-muted text-foreground border-border border"
                                    }>
                                      {m.growth_percent > 0 ? (
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                      ) : m.growth_percent < 0 ? (
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                      ) : null}
                                      {m.growth_percent > 0 ? "+" : ""}{m.growth_percent}%
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : emptyTable("Sin datos para el año actual")}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            {/* ═══ Tab: Exportar PDF ═══ */}
            <TabsContent value="exportar" className="mt-4">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Card */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-200 dark:border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 dark:bg-blue-500/15 p-3 rounded-xl shrink-0">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-1">Exportaciones</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                          Genera un informe profesional en <strong>PDF</strong> o descarga los datos en <strong>Excel</strong>.
                          Puedes exportar <strong>todas las secciones</strong> o seleccionar únicamente las que necesites.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/20 text-xs">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {dateFrom} a {dateTo}
                          </Badge>
                          {user.company?.name && (
                            <Badge className="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-500/20 text-xs">
                              {user.company.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Section Selection */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Selecciona las secciones a exportar</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {exportSections.size} de {EXPORT_SECTIONS.length} secciones seleccionadas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => {
                          if (exportSections.size === EXPORT_SECTIONS.length) {
                            setExportSections(new Set());
                          } else {
                            setExportSections(new Set(EXPORT_SECTIONS.map((s) => s.id)));
                          }
                        }}
                      >
                        {exportSections.size === EXPORT_SECTIONS.length ? "Deseleccionar todo" : "Seleccionar todo"}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {EXPORT_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const isSelected = exportSections.has(section.id);
                        return (
                          <div
                            key={section.id}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-150",
                              isSelected
                                ? "bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                                : "bg-card border-border hover:bg-muted/50"
                            )}
                            onClick={() => {
                              setExportSections((prev) => {
                                const next = new Set(prev);
                                if (next.has(section.id)) next.delete(section.id);
                                else next.add(section.id);
                                return next;
                              });
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              className="shrink-0"
                            />
                            <div className={cn("p-2 rounded-lg shrink-0", section.bgColor)}>
                              <Icon className={cn("h-4 w-4", section.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{section.name}</p>
                              <p className="text-xs text-muted-foreground">{section.description}</p>
                            </div>
                            {isSelected && (
                              <CircleCheck className="h-5 w-5 text-blue-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Full export - right below checkboxes */}
                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setExportModalLabel(`Informe completo (${exportSections.size} secciones)`);
                          setExportTargetSections(new Set(exportSections));
                          setShowExportModal(true);
                        }}
                        disabled={exporting || loading || exportSections.size === 0}
                        className="w-full h-12 gap-3 bg-[#2463eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold"
                      >
                        {exporting ? (
                          <Spinner className="h-5 w-5" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                        Exportar informe completo ({exportSections.size} secciones)
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        Incluye logo de <strong>{user.company?.name || "la empresa"}</strong> · Formato Carta · Listo para imprimir o compartir
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Info note */}
                <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg px-4 py-3">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    La exportación captura las gráficas y tablas de cada sección seleccionada. El PDF incluye encabezado con datos de la empresa, tarjetas resumen y pie de página en cada hoja.
                  </p>
                </div>

                {/* Individual Export Actions */}
                <Card>
                  <CardContent className="p-6">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Exportar Sección Individual</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {EXPORT_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            className="flex items-center justify-between px-4 py-3 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
                            onClick={() => {
                              setExportModalLabel(section.name);
                              setExportTargetSections(new Set([section.id]));
                              setShowExportModal(true);
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", section.color)} />
                              <span className="text-sm font-medium">{section.name}</span>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Branding footer */}
                <div className="text-center pb-4">
                  <p className="text-xs text-muted-foreground">
                    Informe generado por <strong>{user.company?.name || "LEGAL SISTEMA"}</strong> — Sistema de Gestión
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="bg-[#2463eb]/10 p-5 rounded-2xl mb-6">
                  <BarChart3 className="h-10 w-10 text-[#2463eb]" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Centro de Inteligencia del Negocio</h3>
                <p className="text-sm text-muted-foreground max-w-lg text-center mb-6">
                  Conoce qué productos generan más ingresos, quiénes son tus mejores clientes, dónde están tus márgenes de ganancia y cómo crece tu negocio mes a mes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
                  <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-3">
                    <ShoppingBag className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Ventas y Productos</p>
                      <p className="text-[11px] text-emerald-600">Top productos, distribución de ingresos y tendencias</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-3">
                    <Users className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-purple-800 dark:text-purple-400">Clientes y Cartera</p>
                      <p className="text-[11px] text-purple-600">Frecuencia de compra, ticket promedio y saldos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
                    <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Rentabilidad y Crecimiento</p>
                      <p className="text-[11px] text-amber-600">Márgenes por producto y comparativo anual</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6">Selecciona un periodo arriba y presiona <strong>Consultar</strong> para comenzar</p>
              </div>
            )}

            {!loading && hasSearched && !hasData && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <div className="bg-muted/50 p-6 rounded-full mb-5">
                  <Search className="h-12 w-12 opacity-40" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">No hay datos disponibles</p>
                <p className="text-sm max-w-md text-center">No se encontraron datos en el periodo seleccionado. Intente con un rango de fechas diferente</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      {/* Export Format Modal */}
      <AlertDialog open={showExportModal} onOpenChange={setShowExportModal}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Selecciona el formato</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {exportModalLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFrom} a {dateTo}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              disabled={exporting}
              onClick={() => {
                setShowExportModal(false);
                handleExportPdf(exportTargetSections);
              }}
            >
              {exporting ? <Spinner className="h-6 w-6" /> : <FileText className="h-6 w-6 text-red-600" />}
              <span className="text-sm font-medium">PDF</span>
              <span className="text-[10px] text-muted-foreground">Con gráficas</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
              disabled={exporting}
              onClick={() => {
                setShowExportModal(false);
                handleExportExcel(exportTargetSections);
              }}
            >
              {exporting ? <Spinner className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6 text-emerald-600" />}
              <span className="text-sm font-medium">Excel</span>
              <span className="text-[10px] text-muted-foreground">Solo datos</span>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="w-full">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
