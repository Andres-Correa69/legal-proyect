import { useState, useEffect, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatCurrency } from "@/lib/utils";
import { serviceOrdersApi } from "@/lib/api";
import type { ServiceOrder, ServiceOrderItem, ServiceOrderAttachment, ServiceOrderStatusHistory, SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { toast } from "@/hooks/use-toast";
import { loadPdfLogo } from "@/lib/pdf-logo";
import {
    ArrowLeft,
    Edit,
    FileText,
    User,
    Clock,
    Calendar,
    Wrench,
    CheckCircle,
    XCircle,
    PauseCircle,
    AlertTriangle,
    Download,
    Image,
    Paperclip,
    Timer,
    RefreshCw,
    Printer,
    Receipt,
} from "lucide-react";

// --- Constants ---

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; textColor: string; icon: React.ElementType }> = {
    pending: { label: "Pendiente", color: "bg-amber-500 text-white", bg: "bg-amber-100 dark:bg-amber-500/15", textColor: "text-amber-600", icon: Clock },
    in_progress: { label: "En Progreso", color: "bg-blue-500 text-white", bg: "bg-blue-100 dark:bg-blue-500/15", textColor: "text-blue-600", icon: RefreshCw },
    on_hold: { label: "En Espera", color: "bg-orange-500 text-white", bg: "bg-orange-100 dark:bg-orange-500/15", textColor: "text-orange-600", icon: PauseCircle },
    completed: { label: "Completada", color: "bg-emerald-500 text-white", bg: "bg-emerald-100 dark:bg-emerald-500/15", textColor: "text-emerald-600", icon: CheckCircle },
    cancelled: { label: "Cancelada", color: "bg-red-500 text-white", bg: "bg-red-100 dark:bg-red-500/15", textColor: "text-red-600", icon: XCircle },
    invoiced: { label: "Facturada", color: "bg-purple-600 text-white", bg: "bg-purple-100 dark:bg-purple-500/15", textColor: "text-purple-600", icon: FileText },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: "Baja", color: "bg-slate-500 text-white" },
    normal: { label: "Normal", color: "bg-blue-500 text-white" },
    high: { label: "Alta", color: "bg-amber-500 text-white" },
    urgent: { label: "Urgente", color: "bg-red-500 text-white" },
};

const TYPE_CONFIG: Record<string, string> = {
    repair: "Reparacion",
    maintenance: "Mantenimiento",
    installation: "Instalacion",
    inspection: "Inspeccion",
    custom: "Personalizado",
};

const ITEM_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    service: { label: "Servicio", color: "bg-blue-500 text-white" },
    product: { label: "Producto", color: "bg-emerald-500 text-white" },
    labor: { label: "Mano de Obra", color: "bg-amber-500 text-white" },
};

const ATTACHMENT_CATEGORY_LABELS: Record<string, string> = {
    before: "Antes",
    during: "Durante",
    after: "Despues",
    diagnostic: "Diagnostico",
    signature: "Firma",
    other: "Otro",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ["in_progress", "cancelled"],
    in_progress: ["on_hold", "completed", "cancelled"],
    on_hold: ["in_progress", "cancelled"],
    completed: ["invoiced"],
    cancelled: [],
    invoiced: [],
};

// --- Helper functions ---

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDuration(minutes: number | null | undefined): string {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function isImageFile(fileType: string | null): boolean {
    if (!fileType) return false;
    return fileType.startsWith("image/");
}

// --- Component ---

interface Props {
    serviceOrderId: number;
}

export default function ServiceOrderShow({ serviceOrderId }: Props) {
    const { auth } = usePage<{ auth: { user: any } }>().props;
    const user = auth.user;

    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedNextStatus, setSelectedNextStatus] = useState<string>("");
    const [statusNotes, setStatusNotes] = useState("");
    const [changingStatus, setChangingStatus] = useState(false);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const data = await serviceOrdersApi.getById(serviceOrderId);
            setOrder(data);
        } catch {
            toast({
                title: "Error",
                description: "No se pudo cargar la orden de servicio.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrder();
    }, [serviceOrderId]);

    const availableTransitions = useMemo(() => {
        if (!order) return [];
        return STATUS_TRANSITIONS[order.status] || [];
    }, [order?.status]);

    const canEdit = order && (order.status === "pending" || order.status === "in_progress");
    const canInvoice = order && order.status === "completed" && hasPermission("service-orders.invoice");

    const handleStatusChange = async () => {
        if (!order || !selectedNextStatus) return;
        try {
            setChangingStatus(true);
            const updated = await serviceOrdersApi.updateStatus(order.id, {
                status: selectedNextStatus,
                notes: statusNotes || undefined,
            });
            setOrder(updated);
            setStatusDialogOpen(false);
            setSelectedNextStatus("");
            setStatusNotes("");
            toast({
                title: "Estado actualizado",
                description: `La orden paso a "${STATUS_CONFIG[selectedNextStatus]?.label || selectedNextStatus}".`,
            });
        } catch {
            toast({
                title: "Error",
                description: "No se pudo cambiar el estado de la orden.",
                variant: "destructive",
            });
        } finally {
            setChangingStatus(false);
        }
    };

    // ── PDF Export (jsPDF - letter format) ──
    const handleDownloadPdf = async () => {
        if (!order) return;
        try {
            const { jsPDF } = await import("jspdf");
            const autoTable = (await import("jspdf-autotable")).default;

            const company = user?.company;
            const companyName = company?.name || "Empresa";
            const companyNit = company?.tax_id || "";
            const companyAddress = company?.address || "";
            const logoUrl = company?.logo_icon_url || company?.logo_url;

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
            const pageW = pdf.internal.pageSize.getWidth();
            const m = 15;
            const cw = pageW - m * 2;
            let y = m;

            // Logo
            const logoData = await loadPdfLogo(logoUrl);
            if (logoData) {
                const ratio = logoData.width / logoData.height;
                const lh = 14;
                const lw = Math.min(lh * ratio, 40);
                pdf.addImage(logoData.dataUrl, "PNG", m, y, lw, lh);
                y += lh + 2;
            }

            // Header
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(31, 41, 55);
            pdf.text(companyName, m, y + 4);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(107, 114, 128);
            if (companyNit) { pdf.text(`NIT: ${companyNit}`, m, y + 8); }
            if (companyAddress) { pdf.text(companyAddress, m, y + 11); }

            // Badge
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(79, 70, 229);
            pdf.text("ORDEN DE SERVICIO", pageW - m, y + 4, { align: "right" });
            pdf.setFontSize(12);
            pdf.text(order.order_number, pageW - m, y + 9, { align: "right" });
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(107, 114, 128);
            pdf.text(`Estado: ${STATUS_CONFIG[order.status]?.label || order.status}`, pageW - m, y + 13, { align: "right" });
            y += 17;

            pdf.setDrawColor(79, 70, 229);
            pdf.setLineWidth(0.5);
            pdf.line(m, y, pageW - m, y);
            y += 6;

            // Info section
            pdf.setFontSize(7.5);
            const info: [string, string][] = [
                ["Titulo", order.title],
                ["Tipo", TYPE_CONFIG[order.type] || order.type],
                ["Prioridad", PRIORITY_CONFIG[order.priority]?.label || order.priority],
                ["Cliente", order.client?.name || "Sin asignar"],
                ["Tecnico", order.assigned_to_user?.name || "Sin asignar"],
                ["Fecha programada", order.scheduled_date ? formatDate(order.scheduled_date) : "—"],
                ["Equipo", order.equipment_info || "—"],
            ];
            info.forEach(([label, val]) => {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(107, 114, 128);
                pdf.text(label + ":", m, y);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(31, 41, 55);
                pdf.text(val, m + 35, y);
                y += 4;
            });
            y += 2;

            // Description
            if (order.description) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(107, 114, 128);
                pdf.text("Descripcion:", m, y);
                y += 4;
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(31, 41, 55);
                const lines = pdf.splitTextToSize(order.description, cw);
                pdf.text(lines, m, y);
                y += lines.length * 3.5 + 2;
            }

            if (order.diagnosis) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(107, 114, 128);
                pdf.text("Diagnostico:", m, y);
                y += 4;
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(31, 41, 55);
                const lines = pdf.splitTextToSize(order.diagnosis, cw);
                pdf.text(lines, m, y);
                y += lines.length * 3.5 + 2;
            }

            if (order.resolution_notes) {
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(107, 114, 128);
                pdf.text("Resolucion:", m, y);
                y += 4;
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(31, 41, 55);
                const lines = pdf.splitTextToSize(order.resolution_notes, cw);
                pdf.text(lines, m, y);
                y += lines.length * 3.5 + 2;
            }

            y += 2;

            // Items table
            if (order.items && order.items.length > 0) {
                autoTable(pdf, {
                    startY: y,
                    head: [["Tipo", "Descripcion", "Cant.", "Precio Unit.", "IVA", "Total"]],
                    body: order.items.map((item: ServiceOrderItem) => [
                        ITEM_TYPE_LABELS[item.type]?.label || item.type,
                        item.description,
                        String(item.quantity),
                        formatCurrency(item.unit_price),
                        `${item.tax_rate}%`,
                        formatCurrency(item.total),
                    ]),
                    margin: { left: m, right: m },
                    styles: { fontSize: 7.5, cellPadding: 2 },
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
                    alternateRowStyles: { fillColor: [249, 250, 251] },
                });
                y = (pdf as any).lastAutoTable.finalY + 4;
            }

            // Totals
            pdf.setFontSize(8);
            const totals: [string, string][] = [
                ["Subtotal", formatCurrency(Number(order.subtotal))],
                ["IVA", formatCurrency(Number(order.tax_amount))],
            ];
            if (Number(order.discount_amount) > 0) totals.push(["Descuento", `-${formatCurrency(Number(order.discount_amount))}`]);
            totals.forEach(([label, val]) => {
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(107, 114, 128);
                pdf.text(label, pageW - m - 50, y);
                pdf.setTextColor(31, 41, 55);
                pdf.text(val, pageW - m, y, { align: "right" });
                y += 4;
            });
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(31, 41, 55);
            pdf.text("TOTAL", pageW - m - 50, y + 1);
            pdf.text(formatCurrency(Number(order.total_amount)), pageW - m, y + 1, { align: "right" });
            y += 8;

            // Footer
            pdf.setFontSize(6);
            pdf.setTextColor(156, 163, 175);
            pdf.text("Creado por Legal Sistema", pageW / 2, pdf.internal.pageSize.getHeight() - 10, { align: "center" });
            pdf.text("www.legalsistema.co", pageW / 2, pdf.internal.pageSize.getHeight() - 7, { align: "center" });

            pdf.save(`Orden_${order.order_number}.pdf`);
            toast({ title: "PDF descargado", description: "El archivo se descargo correctamente." });
        } catch (err) {
            console.error("Error generating PDF:", err);
            toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
        }
    };

    // ── Thermal Receipt (Tirilla 80mm) ──
    const handlePrintThermalReceipt = async () => {
        if (!order) return;
        try {
            const { jsPDF } = await import("jspdf");

            const company = user?.company;
            const companyName = company?.name || "Empresa";
            const companyNit = company?.tax_id || "";
            const companyAddress = company?.address || "";
            const companyPhone = company?.phone || "";
            const logoUrl = company?.logo_icon_url || company?.logo_url;

            const items = order.items || [];
            let estimatedH = 130 + items.length * 8;

            const ticketW = 80;
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [ticketW, Math.max(estimatedH, 140)] });
            const tm = 4;
            let y = tm;

            const drawSep = () => { pdf.setDrawColor(200); pdf.setLineDashPattern([1, 1], 0); pdf.line(tm, y, ticketW - tm, y); pdf.setLineDashPattern([], 0); y += 3; };
            const drawBoldSep = () => { pdf.setDrawColor(60); pdf.setLineWidth(0.4); pdf.line(tm, y, ticketW - tm, y); pdf.setLineWidth(0.2); y += 3; };

            // Logo
            const logoData = await loadPdfLogo(logoUrl);
            if (logoData) {
                const ratio = logoData.width / logoData.height;
                let lw = 14 * ratio; let lh = 14;
                if (lw > 35) { lw = 35; lh = lw / ratio; }
                pdf.addImage(logoData.dataUrl, "PNG", (ticketW - lw) / 2, y, lw, lh);
                y += lh + 2;
            }

            // Company header
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(31, 41, 55);
            pdf.text(companyName, ticketW / 2, y, { align: "center" }); y += 3.5;
            pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(107, 114, 128);
            if (companyNit) { pdf.text(`NIT: ${companyNit}`, ticketW / 2, y, { align: "center" }); y += 2.8; }
            if (companyAddress) { pdf.text(companyAddress, ticketW / 2, y, { align: "center" }); y += 2.8; }
            if (companyPhone) { pdf.text(`Tel: ${companyPhone}`, ticketW / 2, y, { align: "center" }); y += 2.8; }
            y += 1;
            drawBoldSep();

            // Title badge
            pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
            const badgeText = `OS ${order.order_number}`;
            const badgeW = pdf.getTextWidth(badgeText) + 10;
            pdf.setFillColor(31, 41, 55);
            pdf.roundedRect((ticketW - badgeW) / 2, y - 1, badgeW, 5.5, 1.2, 1.2, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.text(badgeText, ticketW / 2, y + 2.8, { align: "center" });
            y += 7;

            // Order info
            pdf.setFontSize(7);
            const meta: [string, string][] = [
                ["Estado", STATUS_CONFIG[order.status]?.label || order.status],
                ["Prioridad", PRIORITY_CONFIG[order.priority]?.label || order.priority],
                ["Tipo", TYPE_CONFIG[order.type] || order.type],
            ];
            if (order.client?.name) meta.push(["Cliente", order.client.name]);
            if (order.equipment_info) meta.push(["Equipo", order.equipment_info.substring(0, 30)]);
            if (order.scheduled_date) meta.push(["Programada", formatDate(order.scheduled_date)]);
            meta.forEach(([label, val]) => {
                pdf.setFont("helvetica", "bold"); pdf.setTextColor(107, 114, 128); pdf.text(label, tm, y);
                pdf.setFont("helvetica", "normal"); pdf.setTextColor(31, 41, 55); pdf.text(val, ticketW - tm, y, { align: "right" });
                y += 3.5;
            });
            y += 1; drawSep();

            // Items
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.setTextColor(150, 150, 150);
            pdf.text("DETALLE", ticketW / 2, y, { align: "center" }); y += 3; drawSep();
            pdf.setFontSize(7);
            items.forEach((item: ServiceOrderItem) => {
                pdf.setFont("helvetica", "bold"); pdf.setTextColor(31, 41, 55);
                pdf.text(item.description.substring(0, 35), tm, y);
                pdf.text(formatCurrency(item.total), ticketW - tm, y, { align: "right" }); y += 3;
                pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.setTextColor(140, 140, 140);
                pdf.text(`${item.quantity} × ${formatCurrency(item.unit_price)}`, tm + 1, y); y += 3.5;
                pdf.setFontSize(7);
            });
            y += 1; drawSep();

            // Summary
            pdf.setFontSize(7);
            [["Subtotal", formatCurrency(Number(order.subtotal))], ["IVA", formatCurrency(Number(order.tax_amount))]].forEach(([l, v]) => {
                pdf.setFont("helvetica", "normal"); pdf.setTextColor(75, 85, 99); pdf.text(l, tm, y);
                pdf.setTextColor(31, 41, 55); pdf.text(v, ticketW - tm, y, { align: "right" }); y += 3.5;
            });

            // Total box
            y += 1;
            pdf.setFillColor(240, 240, 240);
            pdf.roundedRect(tm, y - 1, ticketW - tm * 2, 7, 1.2, 1.2, "F");
            pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(31, 41, 55);
            pdf.text("TOTAL", tm + 3, y + 3.5);
            pdf.text(formatCurrency(Number(order.total_amount)), ticketW - tm - 3, y + 3.5, { align: "right" });
            y += 10;

            drawBoldSep();
            pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.setTextColor(156, 163, 175);
            pdf.text("Creado por Legal Sistema", ticketW / 2, y, { align: "center" }); y += 2.5;
            pdf.text("www.legalsistema.co", ticketW / 2, y, { align: "center" });

            const pdfBlob = pdf.output("blob");
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl, "_blank");
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                    printWindow.onafterprint = () => { printWindow.close(); URL.revokeObjectURL(pdfUrl); };
                };
            }
        } catch (err) {
            console.error("Error generating receipt:", err);
            toast({ title: "Error", description: "No se pudo generar la tirilla.", variant: "destructive" });
        }
    };

    // ── Convert to Invoice ──
    const handleConvertToInvoice = async () => {
        if (!order) return;
        if (!confirm("¿Estas seguro de facturar esta orden? Se creara una venta con todos los items.")) return;
        try {
            const result = await serviceOrdersApi.convertToInvoice(order.id);
            toast({ title: "Orden facturada", description: "La venta se creo exitosamente." });
            loadOrder();
        } catch {
            toast({ title: "Error", description: "No se pudo facturar la orden.", variant: "destructive" });
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <Head title="Orden de Servicio" />
                <div className="flex items-center justify-center py-32">
                    <Spinner className="h-8 w-8" />
                </div>
            </AppLayout>
        );
    }

    if (!order) {
        return (
            <AppLayout>
                <Head title="Orden de Servicio" />
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No se encontro la orden de servicio.</p>
                    <Button variant="outline" onClick={() => router.visit("/admin/service-orders")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver a ordenes
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConf.icon;
    const priorityConf = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.normal;
    const typeLabel = TYPE_CONFIG[order.type] || order.type;

    return (
        <AppLayout>
            <Head title={`Orden ${order.order_number}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.visit("/admin/service-orders")}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold tracking-tight">{order.title}</h1>
                            <Badge variant="outline" className="font-mono text-sm">
                                {order.order_number}
                            </Badge>
                            <Badge variant="default" className={cn("gap-1 text-[10px]", statusConf.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConf.label}
                            </Badge>
                            <Badge variant="default" className={cn("text-[10px]", priorityConf.color)}>
                                {priorityConf.label}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                                {typeLabel}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadPdf}>
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">PDF</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrintThermalReceipt}>
                            <Receipt className="h-4 w-4" />
                            <span className="hidden sm:inline">Tirilla</span>
                        </Button>
                        {availableTransitions.length > 0 && (
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStatusDialogOpen(true)}>
                                <RefreshCw className="h-4 w-4" />
                                <span className="hidden sm:inline">Cambiar Estado</span>
                            </Button>
                        )}
                        {canEdit && (
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.visit(`/admin/service-orders/${order.id}/edit`)}>
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline">Editar</span>
                            </Button>
                        )}
                        {canInvoice && (
                            <Button size="sm" className="gap-1.5" onClick={handleConvertToInvoice}>
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">Facturar</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status Timeline */}
                {order.status_history && order.status_history.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Historial de Estados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                {order.status_history.map((entry: ServiceOrderStatusHistory, idx: number) => {
                                    const entryConf = STATUS_CONFIG[entry.to_status] || STATUS_CONFIG.pending;
                                    const EntryIcon = entryConf.icon;
                                    const isCurrent = idx === order.status_history!.length - 1;
                                    const isFirst = idx === 0;
                                    return (
                                        <div key={entry.id} className="flex gap-3 relative">
                                            {/* Vertical line */}
                                            {!isCurrent && (
                                                <div className="absolute left-[15px] top-[30px] bottom-0 w-px bg-border" />
                                            )}
                                            {/* Dot */}
                                            <div className={cn(
                                                "relative z-10 flex items-center justify-center shrink-0 rounded-full h-8 w-8 mt-0.5",
                                                isCurrent ? entryConf.bg : "bg-muted"
                                            )}>
                                                <EntryIcon className={cn("h-4 w-4", isCurrent ? entryConf.textColor : "text-muted-foreground")} />
                                            </div>
                                            {/* Content */}
                                            <div className={cn("flex-1 pb-5", isCurrent ? "" : "pb-5")}>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("text-sm font-semibold", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                                                        {entryConf.label}
                                                    </span>
                                                    {isCurrent && (
                                                        <Badge className={cn("text-[10px]", entryConf.color)}>Actual</Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatDateTime(entry.created_at)}
                                                    {entry.changed_by_user && ` · ${entry.changed_by_user.name}`}
                                                </p>
                                                {entry.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                                        {entry.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Info Cards Row */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Left: People Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Informacion General</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <User className="h-4 w-4" /> Cliente
                                </span>
                                <span className="text-sm font-medium">
                                    {order.client?.name || "Sin asignar"}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Wrench className="h-4 w-4" /> Tecnico asignado
                                </span>
                                <span className="text-sm font-medium">
                                    {order.assigned_to_user?.name || "Sin asignar"}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <User className="h-4 w-4" /> Creado por
                                </span>
                                <span className="text-sm font-medium">
                                    {order.created_by_user?.name || "—"}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Fecha creacion
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDateTime(order.created_at)}
                                </span>
                            </div>
                            {order.equipment_info && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Wrench className="h-4 w-4" /> Equipo
                                        </span>
                                        <span className="text-sm font-medium">
                                            {order.equipment_info}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: Schedule Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Programacion y Tiempos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> Fecha programada
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDate(order.scheduled_date)}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> Hora programada
                                </span>
                                <span className="text-sm font-medium">
                                    {order.scheduled_time || "—"}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Timer className="h-4 w-4" /> Duracion estimada
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDuration(order.estimated_duration)}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Timer className="h-4 w-4" /> Duracion real
                                </span>
                                <span className="text-sm font-medium">
                                    {formatDuration(order.actual_duration)}
                                </span>
                            </div>
                            {order.started_at && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> Inicio real
                                        </span>
                                        <span className="text-sm font-medium">
                                            {formatDateTime(order.started_at)}
                                        </span>
                                    </div>
                                </>
                            )}
                            {order.completed_at && (
                                <>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" /> Finalizado
                                        </span>
                                        <span className="text-sm font-medium">
                                            {formatDateTime(order.completed_at)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Description */}
                {order.description && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Descripcion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.description}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Diagnosis & Resolution */}
                {(order.diagnosis || order.resolution_notes) && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Diagnostico y Resolucion</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.diagnosis && (
                                <div>
                                    <h4 className="text-sm font-medium mb-1">Diagnostico</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {order.diagnosis}
                                    </p>
                                </div>
                            )}
                            {order.diagnosis && order.resolution_notes && <Separator />}
                            {order.resolution_notes && (
                                <div>
                                    <h4 className="text-sm font-medium mb-1">Notas de Resolucion</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {order.resolution_notes}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Items Table */}
                {order.items && order.items.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Items de la Orden</CardTitle>
                            <CardDescription>
                                {order.items.length} {order.items.length === 1 ? "item" : "items"} en esta orden
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="h-12 px-4">Tipo</TableHead>
                                            <TableHead className="h-12 px-4">Descripcion</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Cantidad</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Precio Unit.</TableHead>
                                            <TableHead className="h-12 px-4 text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item: ServiceOrderItem) => {
                                            const itemConf = ITEM_TYPE_LABELS[item.type] || ITEM_TYPE_LABELS.service;
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="p-4">
                                                        <Badge variant="default" className={cn("text-[10px]", itemConf.color)}>
                                                            {itemConf.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="p-4 font-medium">
                                                        {item.description}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        {formatCurrency(item.unit_price)}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right font-medium">
                                                        {formatCurrency(item.total)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Totals Footer */}
                            <div className="mt-4 flex justify-end">
                                <div className="w-full max-w-xs space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatCurrency(order.subtotal)}</span>
                                    </div>
                                    {order.discount_amount > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Descuento</span>
                                            <span className="text-red-600">-{formatCurrency(order.discount_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">IVA</span>
                                        <span>{formatCurrency(order.tax_amount)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between font-semibold">
                                        <span>TOTAL</span>
                                        <span className="text-lg">{formatCurrency(order.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Attachments Gallery */}
                {order.attachments && order.attachments.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Archivos Adjuntos</CardTitle>
                            <CardDescription>
                                {order.attachments.length} {order.attachments.length === 1 ? "archivo" : "archivos"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {order.attachments.map((att: ServiceOrderAttachment) => (
                                    <Card key={att.id} className="overflow-hidden">
                                        {isImageFile(att.file_type) ? (
                                            <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={att.file_url}
                                                    alt={att.file_name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-muted flex items-center justify-center">
                                                <Paperclip className="h-10 w-10 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-medium truncate" title={att.file_name}>
                                                    {att.file_name}
                                                </span>
                                                <a
                                                    href={att.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-shrink-0"
                                                >
                                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </Button>
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="secondary" className="text-xs">
                                                    {ATTACHMENT_CATEGORY_LABELS[att.category] || att.category}
                                                </Badge>
                                                {att.uploaded_by_user && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {att.uploaded_by_user.name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground block">
                                                {formatDateTime(att.created_at)}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Status Change Dialog */}
            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cambiar Estado de la Orden</AlertDialogTitle>
                        <AlertDialogDescription>
                            Estado actual: <strong>{statusConf.label}</strong>. Selecciona el nuevo estado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex flex-wrap gap-2">
                            {availableTransitions.map((status) => {
                                const conf = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
                                const Icon = conf.icon;
                                return (
                                    <Button
                                        key={status}
                                        variant={selectedNextStatus === status ? "default" : "outline"}
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => setSelectedNextStatus(status)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {conf.label}
                                    </Button>
                                );
                            })}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                Notas (opcional)
                            </label>
                            <Textarea
                                placeholder="Agrega notas sobre este cambio de estado..."
                                value={statusNotes}
                                onChange={(e) => setStatusNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setSelectedNextStatus("");
                                setStatusNotes("");
                            }}
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleStatusChange}
                            disabled={!selectedNextStatus || changingStatus}
                        >
                            {changingStatus ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Cambiando...
                                </>
                            ) : (
                                "Confirmar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
