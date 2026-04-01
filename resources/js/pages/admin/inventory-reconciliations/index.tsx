import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardCheck,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Eye,
  Trash2,
  Ban,
  Check,
  X,
  RotateCcw,
  Zap,
  Filter,
  ArrowUpDown,
  Minus,
  Hash,
  FileText,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  inventoryReconciliationsApi,
  warehousesApi,
  productCategoriesApi,
  type Warehouse,
  type ProductCategory,
} from "@/lib/api";
import type {
  User,
  InventoryReconciliation,
  InventoryReconciliationItem,
  InventoryReconciliationStats,
  InventoryReconciliationStatus,
} from "@/types";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

const STATUS_CONFIG: Record<InventoryReconciliationStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Borrador", color: "bg-muted text-foreground", icon: Clock },
  in_progress: { label: "En Conteo", color: "bg-blue-500/15 text-blue-700", icon: Play },
  review: { label: "En Revisión", color: "bg-yellow-500/15 text-yellow-700", icon: Eye },
  approved: { label: "Aprobada", color: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
  applied: { label: "Aplicada", color: "bg-green-500/15 text-green-700", icon: Check },
  cancelled: { label: "Cancelada", color: "bg-red-500/15 text-red-700", icon: XCircle },
};

function StatusBadge({ status }: { status: InventoryReconciliationStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn("rounded-full gap-1 font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

export default function InventoryReconciliationsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const { toast } = useToast();

  const canCreate = isSuperAdmin(user) || hasPermission("inventory.reconciliations.create", user);
  const canCount = isSuperAdmin(user) || hasPermission("inventory.reconciliations.count", user);
  const canApprove = isSuperAdmin(user) || hasPermission("inventory.reconciliations.approve", user);

  // Data
  const [reconciliations, setReconciliations] = useState<InventoryReconciliation[]>([]);
  const [stats, setStats] = useState<InventoryReconciliationStats | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("all");

  // Detail view
  const [selectedReconciliation, setSelectedReconciliation] = useState<InventoryReconciliation | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ warehouse_id: "", location_id: "", category_id: "", is_blind_count: false, notes: "" });
  const [creating, setCreating] = useState(false);

  // Cancel/Reject dialog
  const [actionDialog, setActionDialog] = useState<{ type: "cancel" | "reject"; id: number } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Counting state
  const [countInputs, setCountInputs] = useState<Record<number, string>>({});
  const [countNotes, setCountNotes] = useState<Record<number, string>>({});
  const [savingCounts, setSavingCounts] = useState(false);
  const [countSearch, setCountSearch] = useState("");
  const [countFilter, setCountFilter] = useState<"all" | "counted" | "uncounted">("all");
  const countInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [exporting, setExporting] = useState(false);

  const loadList = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { page, per_page: 15 };
      if (search) params.search = search;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterWarehouse !== "all") params.warehouse_id = Number(filterWarehouse);
      const res = await inventoryReconciliationsApi.getAll(params as Parameters<typeof inventoryReconciliationsApi.getAll>[0]);
      setReconciliations(res.data || []);
      setPagination({ current_page: res.current_page || 1, last_page: res.last_page || 1, total: res.total || 0 });
    } catch {
      toast({ title: "Error al cargar conciliaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterWarehouse]);

  const loadStats = useCallback(async () => {
    try {
      const s = await inventoryReconciliationsApi.getStats();
      setStats(s);
    } catch { /* silent */ }
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([warehousesApi.getAll(), productCategoriesApi.getAll()]);
      setWarehouses(w);
      setCategories(c);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadList(); loadStats(); loadMasterData(); }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadList(), 300);
    return () => clearTimeout(timeout);
  }, [search, filterStatus, filterWarehouse]);

  const openDetail = async (rec: InventoryReconciliation) => {
    try {
      setDetailLoading(true);
      setSelectedReconciliation(rec);
      const full = await inventoryReconciliationsApi.getById(rec.id);
      setSelectedReconciliation(full);
      // Init count inputs
      if (full.items) {
        const inputs: Record<number, string> = {};
        const notes: Record<number, string> = {};
        full.items.forEach((item) => {
          inputs[item.id] = item.physical_count !== null ? String(item.physical_count) : "";
          notes[item.id] = item.notes || "";
        });
        setCountInputs(inputs);
        setCountNotes(notes);
      }
    } catch {
      toast({ title: "Error al cargar detalle", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      const data: Record<string, unknown> = { is_blind_count: createForm.is_blind_count };
      if (createForm.warehouse_id) data.warehouse_id = Number(createForm.warehouse_id);
      if (createForm.category_id) data.category_id = Number(createForm.category_id);
      if (createForm.notes) data.notes = createForm.notes;
      const rec = await inventoryReconciliationsApi.create(data as Parameters<typeof inventoryReconciliationsApi.create>[0]);
      toast({ title: `Conciliación ${rec.reconciliation_number} creada` });
      setShowCreateDialog(false);
      setCreateForm({ warehouse_id: "", location_id: "", category_id: "", is_blind_count: false, notes: "" });
      loadList();
      loadStats();
      openDetail(rec);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? (err as { message: string }).message : "Error al crear";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleStartCounting = async () => {
    if (!selectedReconciliation) return;
    try {
      const updated = await inventoryReconciliationsApi.startCounting(selectedReconciliation.id);
      setSelectedReconciliation(updated);
      toast({ title: "Conteo iniciado" });
      loadList();
      loadStats();
      openDetail(updated);
    } catch {
      toast({ title: "Error al iniciar conteo", variant: "destructive" });
    }
  };

  const handleSaveCounts = async () => {
    if (!selectedReconciliation?.items) return;
    const changedItems = selectedReconciliation.items.filter((item) => {
      const inputVal = countInputs[item.id];
      if (inputVal === undefined || inputVal === "") return false;
      const newCount = parseInt(inputVal, 10);
      if (isNaN(newCount)) return false;
      return item.physical_count === null || item.physical_count !== newCount;
    });
    if (changedItems.length === 0) {
      toast({ title: "No hay cambios para guardar" });
      return;
    }
    try {
      setSavingCounts(true);
      const items = changedItems.map((item) => ({
        item_id: item.id,
        physical_count: parseInt(countInputs[item.id], 10),
        notes: countNotes[item.id] || undefined,
      }));
      await inventoryReconciliationsApi.updateCounts(selectedReconciliation.id, items);
      toast({ title: `${items.length} conteos guardados` });
      openDetail(selectedReconciliation);
    } catch {
      toast({ title: "Error al guardar conteos", variant: "destructive" });
    } finally {
      setSavingCounts(false);
    }
  };

  const handleFinishCounting = async () => {
    if (!selectedReconciliation) return;
    try {
      const updated = await inventoryReconciliationsApi.finishCounting(selectedReconciliation.id);
      setSelectedReconciliation(updated);
      toast({ title: "Conteo finalizado, en revisión" });
      loadList();
      loadStats();
      openDetail(updated);
    } catch {
      toast({ title: "Error al finalizar conteo", variant: "destructive" });
    }
  };

  const handleApprove = async () => {
    if (!selectedReconciliation) return;
    try {
      const updated = await inventoryReconciliationsApi.approve(selectedReconciliation.id);
      setSelectedReconciliation(updated);
      toast({ title: "Conciliación aprobada" });
      loadList();
      loadStats();
    } catch {
      toast({ title: "Error al aprobar", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!selectedReconciliation) return;
    try {
      const updated = await inventoryReconciliationsApi.apply(selectedReconciliation.id);
      setSelectedReconciliation(updated);
      toast({ title: "Conciliación aplicada. Stock actualizado." });
      loadList();
      loadStats();
    } catch {
      toast({ title: "Error al aplicar", variant: "destructive" });
    }
  };

  const handleActionConfirm = async () => {
    if (!actionDialog) return;
    try {
      setActionLoading(true);
      if (actionDialog.type === "cancel") {
        await inventoryReconciliationsApi.cancel(actionDialog.id, actionReason || undefined);
        toast({ title: "Conciliación cancelada" });
      } else {
        await inventoryReconciliationsApi.reject(actionDialog.id, actionReason);
        toast({ title: "Conciliación rechazada, reconteo habilitado" });
      }
      setActionDialog(null);
      setActionReason("");
      loadList();
      loadStats();
      if (selectedReconciliation?.id === actionDialog.id) {
        openDetail({ id: actionDialog.id } as InventoryReconciliation);
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await inventoryReconciliationsApi.delete(id);
      toast({ title: "Conciliación eliminada" });
      if (selectedReconciliation?.id === id) setSelectedReconciliation(null);
      loadList();
      loadStats();
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  // Filtered items for counting view
  const filteredItems = useMemo(() => {
    if (!selectedReconciliation?.items) return [];
    let items = selectedReconciliation.items;
    if (countSearch) {
      const q = countSearch.toLowerCase();
      items = items.filter((item) =>
        item.product?.name?.toLowerCase().includes(q) ||
        item.product?.sku?.toLowerCase().includes(q)
      );
    }
    if (countFilter === "counted") items = items.filter((i) => i.is_counted);
    if (countFilter === "uncounted") items = items.filter((i) => !i.is_counted);
    return items;
  }, [selectedReconciliation?.items, countSearch, countFilter]);

  const countedCount = selectedReconciliation?.items?.filter((i) => i.is_counted || (countInputs[i.id] !== undefined && countInputs[i.id] !== "")).length || 0;
  const totalItems = selectedReconciliation?.items?.length || 0;
  const countProgress = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0;

  // Handle Enter to move to next input
  const handleCountKeyDown = (e: React.KeyboardEvent, itemId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const itemIds = filteredItems.map((i) => i.id);
      const currentIndex = itemIds.indexOf(itemId);
      if (currentIndex < itemIds.length - 1) {
        const nextId = itemIds[currentIndex + 1];
        countInputRefs.current[nextId]?.focus();
        countInputRefs.current[nextId]?.select();
      }
    }
  };

  // ─── Export: PDF (list view) ───
  const handleExportListPdf = useCallback(async () => {
    if (reconciliations.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay conciliaciones para exportar." });
      return;
    }
    try {
      setExporting(true);
      toast({ title: "Generando PDF...", description: "Construyendo reporte." });

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      const indigo = [79, 70, 229] as const;
      const gray100 = [243, 244, 246] as const;
      const gray500 = [107, 114, 128] as const;
      const gray800 = [31, 41, 55] as const;
      const green600 = [5, 150, 105] as const;
      const red600 = [220, 38, 38] as const;
      const blue600 = [36, 99, 235] as const;

      const addFooters = () => {
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          const footerY = pageH - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageW - margin, footerY);
          pdf.setFontSize(7);
          pdf.setTextColor(...gray500);
          pdf.text("Sistema de Gestión", pageW / 2, footerY + 4, { align: "center" });
          pdf.setFontSize(6);
          pdf.setTextColor(176, 181, 191);
          pdf.text("Desarrollado por Legal Sistema · www.legalsistema.co", pageW / 2, footerY + 7, { align: "center" });
          pdf.setFontSize(6);
          pdf.setTextColor(209, 213, 219);
          pdf.text(
            `Generado el ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })} ${new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })} — Página ${i} de ${totalPages}`,
            pageW / 2, footerY + 10, { align: "center" }
          );
        }
      };

      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(...gray800);
      pdf.setFont("helvetica", "bold");
      pdf.text("Conciliación de Inventario", margin, y + 6);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gray500);
      pdf.text("Comparación stock físico vs sistema", margin, y + 11);

      pdf.setFillColor(238, 242, 255);
      pdf.roundedRect(pageW - margin - 50, y - 2, 50, 8, 2, 2, "F");
      pdf.setFontSize(8);
      pdf.setTextColor(...indigo);
      pdf.setFont("helvetica", "bold");
      pdf.text("REPORTE", pageW - margin - 25, y + 3, { align: "center" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gray500);
      pdf.text(new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" }), pageW - margin, y + 12, { align: "right" });

      y += 16;
      pdf.setDrawColor(...indigo);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // Stats cards
      if (stats) {
        const cards = [
          { label: "Total", value: String(stats.total), bg: [238, 242, 255] as const, border: [199, 210, 254] as const, color: indigo },
          { label: "En Progreso", value: String(stats.in_progress), bg: [239, 246, 255] as const, border: [191, 219, 254] as const, color: blue600 },
          { label: "Pendientes", value: String(stats.pending_approval), bg: [255, 251, 235] as const, border: [253, 230, 138] as const, color: [217, 119, 6] as const },
        ];
        const cardW = (pageW - margin * 2 - 8) / 3;
        cards.forEach((card, i) => {
          const cx = margin + i * (cardW + 4);
          pdf.setFillColor(...card.bg);
          pdf.setDrawColor(...card.border);
          pdf.roundedRect(cx, y, cardW, 16, 2, 2, "FD");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...gray500);
          pdf.text(card.label.toUpperCase(), cx + cardW / 2, y + 5, { align: "center" });
          pdf.setFontSize(14);
          pdf.setTextColor(...card.color);
          pdf.text(card.value, cx + cardW / 2, y + 12, { align: "center" });
        });
        y += 22;
      }

      // Table
      pdf.setFillColor(...indigo);
      pdf.roundedRect(margin, y, pageW - margin * 2, 7, 1, 1, "F");
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Conciliaciones (${reconciliations.length})`, margin + 4, y + 5);
      y += 10;

      const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

      const tableData = reconciliations.map((rec) => [
        rec.reconciliation_number,
        rec.warehouse?.name || "Todas",
        STATUS_CONFIG[rec.status]?.label || rec.status,
        String(rec.items_count || rec.total_products || 0),
        rec.status !== "draft" && rec.status !== "in_progress" ? fmt(rec.net_financial_impact) : "—",
        rec.created_by?.name || "—",
        formatDateTime(rec.created_at),
      ]);

      autoTable(pdf, {
        startY: y,
        head: [["Número", "Bodega", "Estado", "Productos", "Impacto Neto", "Creado por", "Fecha"]],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2.5, textColor: [55, 65, 81] },
        headStyles: { fillColor: [...gray100], textColor: [...gray800], fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 30 },
          3: { halign: "right", cellWidth: 20 },
          4: { halign: "right", cellWidth: 28 },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 4) {
            const rec = reconciliations[data.row.index];
            if (rec && rec.status !== "draft" && rec.status !== "in_progress") {
              data.cell.styles.textColor = rec.net_financial_impact >= 0 ? [...green600] : [...red600];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });

      addFooters();
      pdf.save(`Conciliaciones_Inventario_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "Error al generar PDF" });
    } finally {
      setExporting(false);
    }
  }, [reconciliations, stats, toast]);

  // ─── Export: Excel (list view) ───
  const handleExportListExcel = useCallback(async () => {
    if (reconciliations.length === 0) {
      toast({ variant: "destructive", title: "Sin datos" });
      return;
    }
    try {
      setExporting(true);
      const XLSX = await import("xlsx");

      const data = reconciliations.map((rec) => ({
        "Número": rec.reconciliation_number,
        "Bodega": rec.warehouse?.name || "Todas",
        "Estado": STATUS_CONFIG[rec.status]?.label || rec.status,
        "Productos": rec.items_count || rec.total_products || 0,
        "Coincidencias": rec.total_matches || 0,
        "Sobrantes": rec.total_surpluses || 0,
        "Faltantes": rec.total_shortages || 0,
        "Impacto Neto": rec.net_financial_impact || 0,
        "Creado por": rec.created_by?.name || "—",
        "Fecha": formatDateTime(rec.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const currencyCols = [7]; // Impacto Neto
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (const C of currencyCols) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr]) ws[addr].z = "#,##0";
        }
      }
      ws["!cols"] = [
        { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
        { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Conciliaciones");
      XLSX.writeFile(wb, `Conciliaciones_Inventario_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado" });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ variant: "destructive", title: "Error al generar Excel" });
    } finally {
      setExporting(false);
    }
  }, [reconciliations, toast]);

  // ─── Export: PDF (detail view) ───
  const handleExportDetailPdf = useCallback(async () => {
    if (!selectedReconciliation) return;
    const rec = selectedReconciliation;
    try {
      setExporting(true);
      toast({ title: "Generando PDF..." });

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      const indigo = [79, 70, 229] as const;
      const gray100 = [243, 244, 246] as const;
      const gray500 = [107, 114, 128] as const;
      const gray800 = [31, 41, 55] as const;
      const green600 = [5, 150, 105] as const;
      const red600 = [220, 38, 38] as const;
      const blue600 = [36, 99, 235] as const;

      const fmt = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

      const addFooters = () => {
        const totalPages = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          const footerY = pageH - 12;
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, footerY, pageW - margin, footerY);
          pdf.setFontSize(7);
          pdf.setTextColor(...gray500);
          pdf.text("Sistema de Gestión", pageW / 2, footerY + 4, { align: "center" });
          pdf.setFontSize(6);
          pdf.setTextColor(176, 181, 191);
          pdf.text("Desarrollado por Legal Sistema · www.legalsistema.co", pageW / 2, footerY + 7, { align: "center" });
          pdf.setFontSize(6);
          pdf.setTextColor(209, 213, 219);
          pdf.text(
            `Generado el ${new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })} ${new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })} — Página ${i} de ${totalPages}`,
            pageW / 2, footerY + 10, { align: "center" }
          );
        }
      };

      // Header
      pdf.setFontSize(18);
      pdf.setTextColor(...gray800);
      pdf.setFont("helvetica", "bold");
      pdf.text("Conciliación de Inventario", margin, y + 6);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gray500);
      pdf.text(`${rec.reconciliation_number} — ${rec.warehouse?.name || "Todas las bodegas"}${rec.category ? ` — ${rec.category.name}` : ""}`, margin, y + 11);

      // Right side
      pdf.setFillColor(238, 242, 255);
      pdf.roundedRect(pageW - margin - 60, y - 2, 60, 8, 2, 2, "F");
      pdf.setFontSize(8);
      pdf.setTextColor(...indigo);
      pdf.setFont("helvetica", "bold");
      pdf.text("CONCILIACIÓN", pageW - margin - 30, y + 3, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(STATUS_CONFIG[rec.status]?.label || rec.status, pageW - margin, y + 12, { align: "right" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...gray500);
      pdf.text(formatDateTime(rec.created_at), pageW - margin, y + 17, { align: "right" });

      y += 20;
      pdf.setDrawColor(...indigo);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // Summary cards (for review/approved/applied)
      if (["review", "approved", "applied"].includes(rec.status)) {
        const cards = [
          { label: "Productos", value: String(rec.total_products), bg: [238, 242, 255] as const, border: [199, 210, 254] as const, color: indigo },
          { label: "Coinciden", value: String(rec.total_matches), bg: [236, 253, 245] as const, border: [167, 243, 208] as const, color: green600 },
          { label: "Sobrantes", value: String(rec.total_surpluses), bg: [239, 246, 255] as const, border: [191, 219, 254] as const, color: blue600 },
          { label: "Faltantes", value: String(rec.total_shortages), bg: [254, 242, 242] as const, border: [254, 202, 202] as const, color: red600 },
          { label: "Impacto Neto", value: fmt(rec.net_financial_impact), bg: rec.net_financial_impact >= 0 ? [236, 253, 245] as const : [254, 242, 242] as const, border: rec.net_financial_impact >= 0 ? [167, 243, 208] as const : [254, 202, 202] as const, color: rec.net_financial_impact >= 0 ? green600 : red600 },
        ];
        const cardW = (pageW - margin * 2 - 16) / 5;
        cards.forEach((card, i) => {
          const cx = margin + i * (cardW + 4);
          pdf.setFillColor(...card.bg);
          pdf.setDrawColor(...card.border);
          pdf.roundedRect(cx, y, cardW, 18, 2, 2, "FD");
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...gray500);
          pdf.text(card.label.toUpperCase(), cx + cardW / 2, y + 5, { align: "center" });
          pdf.setFontSize(12);
          pdf.setTextColor(...card.color);
          pdf.text(card.value, cx + cardW / 2, y + 13, { align: "center" });
        });
        y += 24;
      }

      // Items table
      if (rec.items && rec.items.length > 0) {
        const hasDiscrepancies = rec.items.some((i) => i.difference !== 0);
        const showItems = ["review", "approved", "applied"].includes(rec.status)
          ? rec.items.filter((i) => i.difference !== 0).sort((a, b) => Math.abs(b.financial_impact) - Math.abs(a.financial_impact))
          : rec.items;

        const sectionTitle = ["review", "approved", "applied"].includes(rec.status)
          ? `Productos con Diferencia (${showItems.length} de ${rec.total_products})`
          : `Productos (${rec.items.length})`;

        pdf.setFillColor(...indigo);
        pdf.roundedRect(margin, y, pageW - margin * 2, 7, 1, 1, "F");
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(sectionTitle, margin + 4, y + 5);
        y += 10;

        if (["review", "approved", "applied"].includes(rec.status)) {
          if (hasDiscrepancies) {
            autoTable(pdf, {
              startY: y,
              head: [["Producto", "SKU", "Stock Sistema", "Conteo Físico", "Diferencia", "Costo Unit.", "Impacto", "Variación"]],
              body: showItems.map((item) => [
                item.product?.name || "",
                item.product?.sku || "—",
                String(item.system_stock),
                String(item.physical_count),
                `${item.difference > 0 ? "+" : ""}${item.difference}`,
                fmt(item.unit_cost),
                `${item.financial_impact > 0 ? "+" : ""}${fmt(Math.abs(item.financial_impact))}`,
                `${item.variance_percentage}%`,
              ]),
              margin: { left: margin, right: margin },
              styles: { fontSize: 8, cellPadding: 2.5, textColor: [55, 65, 81] },
              headStyles: { fillColor: [...gray100], textColor: [...gray800], fontStyle: "bold", fontSize: 7 },
              alternateRowStyles: { fillColor: [250, 250, 250] },
              columnStyles: {
                2: { halign: "right" },
                3: { halign: "right" },
                4: { halign: "right" },
                5: { halign: "right" },
                6: { halign: "right" },
                7: { halign: "center" },
              },
              didParseCell: (data: any) => {
                if (data.section === "body" && data.column.index === 4) {
                  const item = showItems[data.row.index];
                  if (item) data.cell.styles.textColor = item.difference > 0 ? [...blue600] : [...red600];
                  data.cell.styles.fontStyle = "bold";
                }
                if (data.section === "body" && data.column.index === 6) {
                  const item = showItems[data.row.index];
                  if (item) data.cell.styles.textColor = item.financial_impact > 0 ? [...blue600] : [...red600];
                  data.cell.styles.fontStyle = "bold";
                }
              },
            });
          } else {
            pdf.setFontSize(9);
            pdf.setTextColor(...gray500);
            pdf.text("Todos los productos coinciden con el sistema.", pageW / 2, y + 8, { align: "center" });
          }
        } else {
          autoTable(pdf, {
            startY: y,
            head: [["Producto", "SKU", "Stock Actual", "Costo Prom."]],
            body: showItems.map((item) => [
              item.product?.name || "",
              item.product?.sku || "—",
              String(item.system_stock),
              fmt(item.unit_cost),
            ]),
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2.5, textColor: [55, 65, 81] },
            headStyles: { fillColor: [...gray100], textColor: [...gray800], fontStyle: "bold", fontSize: 7 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
          });
        }
      }

      addFooters();
      pdf.save(`Conciliacion_${rec.reconciliation_number}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "PDF generado" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "Error al generar PDF" });
    } finally {
      setExporting(false);
    }
  }, [selectedReconciliation, toast]);

  // ─── Export: Excel (detail view) ───
  const handleExportDetailExcel = useCallback(async () => {
    if (!selectedReconciliation?.items) return;
    const rec = selectedReconciliation;
    try {
      setExporting(true);
      const XLSX = await import("xlsx");

      const data = rec.items.map((item) => ({
        "Producto": item.product?.name || "",
        "SKU": item.product?.sku || "—",
        "Stock Sistema": item.system_stock,
        "Conteo Físico": item.physical_count ?? "",
        "Diferencia": item.difference || 0,
        "Costo Unitario": item.unit_cost || 0,
        "Impacto Financiero": item.financial_impact || 0,
        "Variación %": item.variance_percentage || 0,
        "Contado": item.is_counted ? "Sí" : "No",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const currencyCols = [5, 6]; // Costo Unitario, Impacto
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (const C of currencyCols) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr]) ws[addr].z = "#,##0";
        }
      }
      ws["!cols"] = [
        { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 8 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Detalle");
      XLSX.writeFile(wb, `Conciliacion_${rec.reconciliation_number}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Excel generado" });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ variant: "destructive", title: "Error al generar Excel" });
    } finally {
      setExporting(false);
    }
  }, [selectedReconciliation, toast]);

  const renderTimeline = (rec: InventoryReconciliation) => {
    const events = [
      { label: "Creada", date: rec.created_at, user: rec.created_by?.name },
      rec.counting_started_at && { label: "Conteo iniciado", date: rec.counting_started_at, user: rec.counted_by?.name },
      rec.counting_completed_at && { label: "Conteo finalizado", date: rec.counting_completed_at, user: rec.reviewed_by?.name },
      rec.approved_at && { label: "Aprobada", date: rec.approved_at, user: rec.approved_by?.name },
      rec.applied_at && { label: "Aplicada", date: rec.applied_at, user: rec.applied_by?.name },
      rec.cancelled_at && { label: "Cancelada", date: rec.cancelled_at },
    ].filter(Boolean) as Array<{ label: string; date: string; user?: string }>;

    return (
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={cn("mt-1 h-2.5 w-2.5 rounded-full shrink-0", i === events.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.date)}
                {event.user && ` — ${event.user}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Detail view
  if (selectedReconciliation) {
    const rec = selectedReconciliation;
    const isBlind = rec.is_blind_count && rec.status === "in_progress";

    return (
      <AppLayout>
        <Head title={`Conciliación ${rec.reconciliation_number || ""}`} />
        <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">

        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => { setSelectedReconciliation(null); loadList(); }}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-foreground">{rec.reconciliation_number}</h1>
                    <StatusBadge status={rec.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rec.warehouse?.name || "Todas las bodegas"}
                    {rec.category ? ` — ${rec.category.name}` : ""}
                    {rec.is_blind_count && " — Conteo ciego"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDetailPdf}
                  disabled={exporting || detailLoading}
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDetailExcel}
                  disabled={exporting || detailLoading || !rec.items}
                >
                  {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                  Excel
                </Button>
                {rec.status === "draft" && canCount && (
                  <Button onClick={handleStartCounting} className="gap-2">
                    <Play className="h-4 w-4" /> Iniciar Conteo
                  </Button>
                )}
                {rec.status === "in_progress" && canCount && (
                  <>
                    <Button variant="outline" onClick={handleSaveCounts} disabled={savingCounts} className="gap-2">
                      {savingCounts ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Guardar Conteos
                    </Button>
                    <Button onClick={handleFinishCounting} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Finalizar Conteo
                    </Button>
                  </>
                )}
                {rec.status === "review" && canApprove && (
                  <>
                    <Button variant="outline" onClick={() => setActionDialog({ type: "reject", id: rec.id })} className="gap-2 text-orange-600 border-orange-500/30 hover:bg-orange-500/10">
                      <RotateCcw className="h-4 w-4" /> Rechazar
                    </Button>
                    <Button onClick={handleApprove} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </Button>
                  </>
                )}
                {rec.status === "approved" && canApprove && (
                  <Button onClick={handleApply} className="gap-2 bg-green-600 hover:bg-green-700">
                    <Zap className="h-4 w-4" /> Aplicar Ajustes
                  </Button>
                )}
                {rec.status === "draft" && canCreate && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {["draft", "in_progress", "review", "approved"].includes(rec.status) && canCreate && (
                  <Button variant="ghost" size="icon" onClick={() => setActionDialog({ type: "cancel", id: rec.id })} className="text-muted-foreground">
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Summary stats cards - show for review/approved/applied */}
            {!detailLoading && ["review", "approved", "applied"].includes(rec.status) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Productos</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{rec.total_products}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-green-500/15 p-2 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Coinciden</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{rec.total_matches}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-blue-500/15 p-2 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Sobrantes</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{rec.total_surpluses}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(rec.total_surplus_value)}</p>
                  </div>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-red-500/15 p-2 rounded-lg">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Faltantes</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{rec.total_shortages}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatCurrency(rec.total_shortage_value)}</p>
                  </div>
                </Card>
                <Card className={cn("bg-card/50 backdrop-blur-sm border-2 hover:shadow-lg transition-shadow col-span-2", rec.net_financial_impact >= 0 ? "border-green-500/30" : "border-red-500/30")}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-2 rounded-lg", rec.net_financial_impact >= 0 ? "bg-green-500/15" : "bg-red-500/15")}>
                        {rec.net_financial_impact >= 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Impacto Financiero Neto</h3>
                    </div>
                    <p className={cn("text-2xl font-bold", rec.net_financial_impact >= 0 ? "text-green-600" : "text-red-600")}>
                      {rec.net_financial_impact >= 0 ? "+" : ""}{formatCurrency(rec.net_financial_impact)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Diferencia total entre stock físico y sistema</p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          {detailLoading ? (
            <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
          ) : (
            <div className="space-y-6">
              {/* Counting view */}
              {rec.status === "in_progress" && rec.items && (
                <Card className="shadow-xl border border-border p-4 sm:p-6">
                  <div className="space-y-4">
                    {/* Count toolbar */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar producto..." value={countSearch} onChange={(e) => setCountSearch(e.target.value)} className="pl-9" />
                      </div>
                      <Select value={countFilter} onValueChange={(v) => setCountFilter(v as typeof countFilter)}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="counted">Contados</SelectItem>
                          <SelectItem value="uncounted">Sin contar</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 ml-auto">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${countProgress}%` }} />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">{countedCount}/{totalItems} ({countProgress}%)</span>
                      </div>
                    </div>

                    {/* Count table */}
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">#</TableHead>
                              <TableHead>Producto</TableHead>
                              <TableHead className="w-[100px]">SKU</TableHead>
                              {!isBlind && <TableHead className="w-[100px] text-right">Stock Sistema</TableHead>}
                              <TableHead className="w-[130px] text-center">Conteo Físico</TableHead>
                              {!isBlind && <TableHead className="w-[100px] text-right">Diferencia</TableHead>}
                              <TableHead className="w-[60px] text-center">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredItems.map((item, idx) => {
                              const inputVal = countInputs[item.id] || "";
                              const diff = inputVal !== "" ? parseInt(inputVal, 10) - item.system_stock : null;
                              return (
                                <TableRow key={item.id} className={item.is_counted ? "bg-green-500/10/50" : ""}>
                                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                  <TableCell className="font-medium">{item.product?.name}</TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{item.product?.sku || "—"}</TableCell>
                                  {!isBlind && <TableCell className="text-right font-mono">{item.system_stock}</TableCell>}
                                  <TableCell className="text-center">
                                    <Input
                                      ref={(el) => { countInputRefs.current[item.id] = el; }}
                                      type="number"
                                      min={0}
                                      className="w-[100px] mx-auto text-center h-9"
                                      value={inputVal}
                                      onChange={(e) => setCountInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                      onKeyDown={(e) => handleCountKeyDown(e, item.id)}
                                      placeholder="—"
                                    />
                                  </TableCell>
                                  {!isBlind && (
                                    <TableCell className="text-right font-mono">
                                      {diff !== null && !isNaN(diff) ? (
                                        <span className={cn("font-semibold", diff > 0 ? "text-blue-600" : diff < 0 ? "text-red-600" : "text-green-600")}>
                                          {diff > 0 ? "+" : ""}{diff}
                                        </span>
                                      ) : "—"}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-center">
                                    {item.is_counted ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                    ) : inputVal !== "" ? (
                                      <div className="h-4 w-4 rounded-full border-2 border-blue-400 mx-auto" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 mx-auto" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Review / Approved / Applied items view */}
              {["review", "approved", "applied"].includes(rec.status) && rec.items && (
                <Card className="shadow-xl border border-border">
                  <div className="p-4 sm:p-6 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Detalle de Productos</h3>
                    <p className="text-sm text-muted-foreground">{rec.items.filter((i) => i.difference !== 0).length} con diferencia de {rec.total_products} productos</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Stock Sistema</TableHead>
                          <TableHead className="text-right">Conteo Físico</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                          <TableHead className="text-right">Costo Unit.</TableHead>
                          <TableHead className="text-right">Impacto</TableHead>
                          <TableHead className="text-right">Variación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rec.items
                          .filter((i) => i.difference !== 0)
                          .sort((a, b) => Math.abs(b.financial_impact) - Math.abs(a.financial_impact))
                          .map((item) => (
                            <TableRow key={item.id} className={item.difference > 0 ? "bg-blue-500/10/50" : "bg-red-500/10/50"}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.product?.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.product?.sku || ""}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono">{item.system_stock}</TableCell>
                              <TableCell className="text-right font-mono">{item.physical_count}</TableCell>
                              <TableCell className="text-right">
                                <span className={cn("font-bold", item.difference > 0 ? "text-blue-600" : "text-red-600")}>
                                  {item.difference > 0 ? "+" : ""}{item.difference}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell className="text-right">
                                <span className={cn("font-semibold", item.financial_impact > 0 ? "text-blue-600" : "text-red-600")}>
                                  {item.financial_impact > 0 ? "+" : ""}{formatCurrency(Math.abs(item.financial_impact))}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">{item.variance_percentage}%</TableCell>
                            </TableRow>
                          ))}
                        {rec.items.filter((i) => i.difference !== 0).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Todos los productos coinciden con el sistema
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}

              {/* Draft items view */}
              {rec.status === "draft" && rec.items && (
                <Card className="shadow-xl border border-border">
                  <div className="p-4 sm:p-6 border-b">
                    <h3 className="font-semibold">{rec.items.length} productos a conciliar</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Stock Actual</TableHead>
                          <TableHead className="text-right">Costo Prom.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rec.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product?.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.product?.sku || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{item.system_stock}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(item.unit_cost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}

              {/* Timeline */}
              <Card className="shadow-xl border border-border">
                <div className="p-4 sm:p-6 border-b">
                  <h3 className="font-semibold">Historial</h3>
                </div>
                <CardContent className="p-4 sm:p-6">
                  {renderTimeline(rec)}
                  {rec.notes && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
                      <p className="text-sm whitespace-pre-wrap">{rec.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </div>
      </AppLayout>
    );
  }

  // List view
  return (
    <AppLayout>
      <Head title="Conciliación de Inventario" />
      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">

      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-[#2463eb]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Conciliación de Inventario</h1>
                <p className="text-sm text-muted-foreground">Compara stock físico vs sistema y genera ajustes automáticos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportListPdf}
                disabled={exporting || loading || reconciliations.length === 0}
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportListExcel}
                disabled={exporting || loading || reconciliations.length === 0}
              >
                {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
                Excel
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conciliaciones creadas</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">En Progreso</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
                  <p className="text-xs text-muted-foreground mt-1">Conteos activos</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-yellow-500/15 p-2 rounded-lg">
                      <Eye className="h-5 w-5 text-yellow-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Pendientes</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending_approval}</p>
                  <p className="text-xs text-muted-foreground mt-1">Por aprobar</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-green-500/15 p-2 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Última Aplicada</h3>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{stats.last_applied_at ? formatDateTime(stats.last_applied_at) : "Ninguna aún"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Último ajuste aplicado</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <Card className="shadow-xl border border-border p-4 sm:p-6">
          {/* Filters + Button in same row */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Bodega" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todas las bodegas</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canCreate && (
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2 shrink-0">
                  <Plus className="h-4 w-4" /> Nueva Conciliación
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
          ) : reconciliations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No hay conciliaciones</p>
              <p className="text-sm">Crea una nueva para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Bodega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Productos</TableHead>
                    <TableHead className="text-right">Diferencias</TableHead>
                    <TableHead className="text-right">Impacto Neto</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((rec) => (
                    <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(rec)}>
                      <TableCell className="font-medium">{rec.reconciliation_number}</TableCell>
                      <TableCell>{rec.warehouse?.name || "Todas"}</TableCell>
                      <TableCell><StatusBadge status={rec.status} /></TableCell>
                      <TableCell className="text-right">{rec.items_count || rec.total_products}</TableCell>
                      <TableCell className="text-right">
                        {rec.status !== "draft" && rec.status !== "in_progress" ? (
                          <span className="text-sm">
                            {rec.total_surpluses > 0 && <span className="text-blue-600">+{rec.total_surpluses}</span>}
                            {rec.total_surpluses > 0 && rec.total_shortages > 0 && " / "}
                            {rec.total_shortages > 0 && <span className="text-red-600">-{rec.total_shortages}</span>}
                            {rec.total_surpluses === 0 && rec.total_shortages === 0 && <span className="text-green-600">0</span>}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status !== "draft" && rec.status !== "in_progress" ? (
                          <span className={cn("font-semibold", rec.net_financial_impact >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(rec.net_financial_impact)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{rec.created_by?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(rec.created_at)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(rec)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {((rec.status === "draft" && canCreate) || (["draft", "in_progress", "review", "approved"].includes(rec.status) && canCreate)) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card">
                                {rec.status === "draft" && canCreate && (
                                  <DropdownMenuItem onClick={() => handleDelete(rec.id)} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Eliminar
                                  </DropdownMenuItem>
                                )}
                                {["draft", "in_progress", "review", "approved"].includes(rec.status) && canCreate && (
                                  <DropdownMenuItem onClick={() => setActionDialog({ type: "cancel", id: rec.id })}>
                                    <Ban className="h-4 w-4 mr-2" />Cancelar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">{pagination.total} conciliaciones</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagination.current_page <= 1} onClick={() => loadList(pagination.current_page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">{pagination.current_page} / {pagination.last_page}</span>
                <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page} onClick={() => loadList(pagination.current_page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Conciliación de Inventario</DialogTitle>
            <DialogDescription>Selecciona los filtros para los productos a conciliar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Bodega (opcional)</p>
              <Select value={createForm.warehouse_id || "all"} onValueChange={(v) => setCreateForm((p) => ({ ...p, warehouse_id: v === "all" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las bodegas" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="all">Todas las bodegas</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Categoría (opcional)</p>
              <Select value={createForm.category_id || "all"} onValueChange={(v) => setCreateForm((p) => ({ ...p, category_id: v === "all" ? "" : v }))}>
                <SelectTrigger>
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
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Conteo ciego</p>
                <p className="text-xs text-muted-foreground">Ocultar stock del sistema al contador</p>
              </div>
              <Switch checked={createForm.is_blind_count} onCheckedChange={(v) => setCreateForm((p) => ({ ...p, is_blind_count: v }))} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Notas (opcional)</p>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Observaciones..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Spinner className="h-4 w-4" />} Crear Conciliación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel / Reject dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) { setActionDialog(null); setActionReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{actionDialog?.type === "cancel" ? "Cancelar Conciliación" : "Rechazar Conciliación"}</DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "cancel"
                ? "Esta acción no se puede deshacer."
                : "Se reiniciarán todos los conteos para permitir un reconteo."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {actionDialog?.type === "cancel" ? "Razón (opcional)" : "Razón del rechazo"}
            </p>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Explica la razón..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setActionReason(""); }}>Cerrar</Button>
            <Button
              variant="destructive"
              onClick={handleActionConfirm}
              disabled={actionLoading || (actionDialog?.type === "reject" && !actionReason.trim())}
              className="gap-2"
            >
              {actionLoading && <Spinner className="h-4 w-4" />}
              {actionDialog?.type === "cancel" ? "Cancelar" : "Rechazar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
