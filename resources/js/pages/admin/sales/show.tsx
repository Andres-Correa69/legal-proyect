import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { cn, formatCurrency } from "@/lib/utils";
import { salesApi, productsApi, electronicInvoicingApi, type Sale, type SaleItem, type SaleType, type SalePaymentStatus, type ElectronicInvoiceData, type Product } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { loadPdfLogo } from "@/lib/pdf-logo";
import { toast } from "@/hooks/use-toast";
import type { SharedData } from "@/types";
import {
  ArrowLeft,
  FileText,
  User,
  CreditCard,
  Plus,
  Printer,
  Download,
  Building2,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Loader2,
  Send,
  Ban,
  XCircle,
  History,
  Trash2,
  Search,
  Lock,
  ShoppingCart,
  DollarSign,
  ChevronDown,
  Minus,
  AlertTriangle,
  Percent,
  Package,
  Pencil,
  Mail,
  RefreshCw,
  CalendarIcon,
} from "lucide-react";
import { InternalNotesSection } from "@/components/sales/InternalNotesSection";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EditableItem {
  id?: number;
  tempId: string;
  product_id?: number | null;
  service_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number | null;
  isNew: boolean;
  originalQuantity?: number;
  originalPrice?: number;
  originalDiscount?: number;
}

interface Props {
  saleId: number;
}

const TYPE_LABELS: Record<SaleType, { label: string; color: string }> = {
  pos: { label: "POS", color: "bg-green-500/15 text-green-700 border-green-500/20" },
  electronic: { label: "Factura Electrónica", color: "bg-blue-500/15 text-blue-700 border-blue-500/20" },
  account: { label: "Cuenta de Cobro", color: "bg-purple-500/15 text-purple-700 border-purple-500/20" },
  credit: { label: "Crédito", color: "bg-orange-500/15 text-orange-700 border-orange-500/20" },
};

const PAYMENT_STATUS_CONFIG: Record<SalePaymentStatus, { label: string; badgeClass: string; icon: React.ElementType }> = {
  pending: { label: "Pendiente", badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  partial: { label: "Parcial", badgeClass: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20", icon: Clock },
  paid: { label: "Pagada", badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle },
};

// Section colors matching vet-dash pattern
const SECTION_COLORS = {
  "datos-comprador": {
    bg: "bg-emerald-500/10",
    icon: "text-emerald-600",
    active: "bg-emerald-500/100 text-white shadow-emerald-200",
    hasValue: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  items: {
    bg: "bg-orange-500/10",
    icon: "text-orange-600",
    active: "bg-orange-500/100 text-white shadow-orange-200",
    hasValue: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  },
  totales: {
    bg: "bg-blue-500/10",
    icon: "text-blue-600",
    active: "bg-blue-500/100 text-white shadow-blue-200",
    hasValue: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  },
  pagos: {
    bg: "bg-teal-500/10",
    icon: "text-teal-600",
    active: "bg-teal-500/100 text-white shadow-teal-200",
    hasValue: "bg-teal-500/15 text-teal-700 border-teal-500/30",
  },
  dian: {
    bg: "bg-muted/50",
    icon: "text-muted-foreground",
    active: "bg-muted/500 text-white shadow-sm",
    hasValue: "bg-muted text-foreground border-border",
  },
};

export default function SaleShow({ saleId }: Props) {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const thermalReceiptEnabled = user?.company?.settings?.thermal_receipt_enabled === true;
  const canPrintReceipt = hasPermission('sales.thermal-receipt', user);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [hasEIToken, setHasEIToken] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [generatingPosInvoice, setGeneratingPosInvoice] = useState(false);
  const [showEIDialog, setShowEIDialog] = useState(false);
  const [eiError, setEiError] = useState<string | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showInternalCreditDialog, setShowInternalCreditDialog] = useState(false);
  const [showInternalDebitDialog, setShowInternalDebitDialog] = useState(false);
  const [creatingDebitNote, setCreatingDebitNote] = useState(false);
  const [showDebitNoteConfirm, setShowDebitNoteConfirm] = useState(false);
  const [creatingCreditNote, setCreatingCreditNote] = useState(false);
  const [showCreditNoteConfirm, setShowCreditNoteConfirm] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<{ type: string; title: string; data: any; loading?: boolean } | null>(null);
  const [sendingSaleEmail, setSendingSaleEmail] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    payment_method_name: "Efectivo",
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    reference: "",
    notes: "",
  });

  // Edit mode state
  const [editModeType, setEditModeType] = useState<'debit' | 'credit' | null>(null);
  const isEditMode = editModeType !== null;
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("datos-comprador");

  // Section refs for navigation
  const clientSectionRef = useRef<HTMLDivElement>(null);
  const itemsSectionRef = useRef<HTMLDivElement>(null);
  const totalsSectionRef = useRef<HTMLDivElement>(null);
  const paymentsSectionRef = useRef<HTMLDivElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchSale = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getById(saleId);
      // Redirigir borradores a la página de vender
      if (data.status === 'draft') {
        router.visit(`/admin/sell?draft=${data.id}`);
        return;
      }
      setSale(data);
    } catch (error) {
      console.error("Error fetching sale:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
    checkEIToken();
  }, [saleId]);

  // Auto-enter edit mode if ?action=debit or ?action=credit query param is present
  useEffect(() => {
    if (!sale || loading) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'debit' || action === 'credit') {
      enterEditMode(action);
      // Clean up the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [sale, loading]);

  const checkEIToken = async () => {
    try {
      const config = await electronicInvoicingApi.getConfig();
      setHasEIToken(config.success && config.data.has_token);
    } catch {
      setHasEIToken(false);
    }
  };

  const handleGenerateElectronicInvoice = async () => {
    if (!sale) return;

    setGeneratingInvoice(true);
    setEiError(null);

    try {
      const result = await electronicInvoicingApi.generateFromSale(sale.id);

      if (result.success && result.electronic_invoices) {
        setSale({ ...sale, electronic_invoices: result.electronic_invoices });
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
      }
    } catch (err: any) {
      console.error("FE Error:", err);
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al generar factura electronica") + errMsgs + errFields);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleGeneratePosInvoice = async () => {
    if (!sale) return;

    setGeneratingPosInvoice(true);
    setEiError(null);

    try {
      const result = await electronicInvoicingApi.generatePosFromSale(sale.id);

      if (result.success && result.electronic_invoices) {
        setSale({ ...sale, electronic_invoices: result.electronic_invoices });
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
      }
    } catch (err: any) {
      console.error("POS FE Error:", err);
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al generar factura POS electrónica") + errMsgs + errFields);
    } finally {
      setGeneratingPosInvoice(false);
    }
  };

  const handleVoidElectronicInvoice = async () => {
    if (!sale || !activeEI) return;

    setVoidingInvoice(true);
    setEiError(null);

    try {
      const result = await electronicInvoicingApi.voidInvoice(activeEI.id);

      if (result.success && result.electronic_invoices) {
        setSale({ ...sale, electronic_invoices: result.electronic_invoices });
        setShowVoidConfirm(false);
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
        setShowVoidConfirm(false);
      }
    } catch (err: any) {
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al anular factura electrónica") + errMsgs + errFields);
      setShowVoidConfirm(false);
    } finally {
      setVoidingInvoice(false);
    }
  };

  const handleCreateDebitNote = async () => {
    if (!sale || !activeEI) return;

    setCreatingDebitNote(true);
    setEiError(null);
    setShowDebitNoteConfirm(false);

    try {
      const result = await electronicInvoicingApi.createDebitNote(activeEI.id);

      if (result.success && result.electronic_invoices) {
        setSale({ ...sale, electronic_invoices: result.electronic_invoices });
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
      }
    } catch (err: any) {
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al generar nota debito") + errMsgs + errFields);
    } finally {
      setCreatingDebitNote(false);
    }
  };

  const handleCreateAdjustmentCreditNote = async () => {
    if (!sale || !activeEI) return;

    setCreatingCreditNote(true);
    setEiError(null);
    setShowCreditNoteConfirm(false);

    try {
      const result = await electronicInvoicingApi.createAdjustmentCreditNote(activeEI.id);

      if (result.success && result.electronic_invoices) {
        setSale({ ...sale, electronic_invoices: result.electronic_invoices });
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
      }
    } catch (err: any) {
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al generar nota credito") + errMsgs + errFields);
    } finally {
      setCreatingCreditNote(false);
    }
  };

  const updateEiEmailStatus = (type: "fe" | "nc" | "nd", id: number, emailStatus: 'sent' | 'pending') => {
    setSale(prev => {
      if (!prev?.electronic_invoices) return prev;
      return {
        ...prev,
        electronic_invoices: prev.electronic_invoices.map(ei => {
          if (type === "fe" && ei.id === id) return { ...ei, email_status: emailStatus };
          if (type === "nc" && ei.credit_note?.id === id) return { ...ei, credit_note: { ...ei.credit_note, email_status: emailStatus } };
          if (type === "nd" && ei.debit_note?.id === id) return { ...ei, debit_note: { ...ei.debit_note, email_status: emailStatus } };
          return ei;
        }),
      };
    });
  };

  const handleSendEmail = async (type: "fe" | "nc" | "nd", id: number) => {
    const key = `${type}-${id}`;
    setSendingEmailId(key);
    try {
      let result;
      if (type === "fe") result = await electronicInvoicingApi.sendInvoiceEmail(id);
      else if (type === "nc") result = await electronicInvoicingApi.sendCreditNoteEmail(id);
      else result = await electronicInvoicingApi.sendDebitNoteEmail(id);

      if (result.success) {
        setEiError(null);
        updateEiEmailStatus(type, id, 'sent');
        toast({ title: "Correo enviado", description: result.message || "Correo enviado exitosamente." });
      } else {
        updateEiEmailStatus(type, id, 'pending');
        setEiError(result.message || "Error al enviar correo.");
      }
    } catch (err: any) {
      updateEiEmailStatus(type, id, 'pending');
      setEiError(err.message || "Error al enviar correo.");
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleCheckStatus = async (type: "invoice" | "credit_note" | "debit_note", id: number) => {
    const key = `${type}-${id}`;
    setCheckingStatusId(key);
    try {
      const result = await electronicInvoicingApi.checkDocumentStatus(type, id);
      if (result.success) {
        const desc = result.data?.status_description || "Consulta exitosa";
        toast({ title: "Estado del documento", description: desc });
        // Refresh sale data to reflect updated status
        if (sale) {
          const freshSale = await salesApi.getById(sale.id);
          setSale(freshSale);
        }
      } else {
        setEiError(result.message || "No se pudo consultar el estado.");
      }
    } catch (err: any) {
      setEiError(err.message || "Error al consultar estado.");
    } finally {
      setCheckingStatusId(null);
    }
  };

  const handleStatusQuery = async (queryType: 'info' | 'xml' | 'notes' | 'events', uuid: string) => {
    const titles: Record<string, string> = {
      info: "Información del Documento",
      xml: "XML del Documento",
      notes: "Notas Asociadas",
      events: "Eventos del Documento",
    };
    setStatusDetail({ type: queryType, title: titles[queryType], data: null, loading: true });
    try {
      const result = queryType === 'info'
        ? await electronicInvoicingApi.getDocumentInformation(uuid)
        : queryType === 'xml'
        ? await electronicInvoicingApi.getDocumentXml(uuid)
        : queryType === 'notes'
        ? await electronicInvoicingApi.getDocumentNotes(uuid)
        : await electronicInvoicingApi.getDocumentEvents(uuid);

      if (result.success) {
        // XML: decode base64 and trigger download
        if (queryType === 'xml' && result.data?.XmlBytesBase64) {
          const xmlContent = atob(result.data.XmlBytesBase64);
          const blob = new Blob([xmlContent], { type: 'application/xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `documento-${uuid.substring(0, 8)}.xml`;
          a.click();
          URL.revokeObjectURL(url);
          setStatusDetail(null);
          toast({ title: "XML descargado", description: "El archivo XML se descargó correctamente." });
          return;
        }
        setStatusDetail({ type: queryType, title: titles[queryType], data: result.data });
      } else {
        setStatusDetail({ type: queryType, title: titles[queryType], data: { error: result.message || "No se pudo obtener la información." } });
      }
    } catch (err: any) {
      setStatusDetail({ type: queryType, title: titles[queryType], data: { error: err.message || "Error en la consulta." } });
    }
  };

  const handleSendSaleEmail = async () => {
    if (!sale || !sale.client?.email) return;

    setSendingSaleEmail(true);
    try {
      const result = await salesApi.sendEmail(sale.id);
      if (result.success) {
        setSale(prev => prev ? { ...prev, email_status: 'sent' } : prev);
        toast({ title: "Correo enviado", description: result.message || "Correo enviado exitosamente." });
      } else {
        setSale(prev => prev ? { ...prev, email_status: 'pending' } : prev);
        toast({ variant: "destructive", title: "Error", description: result.message || "Error al enviar el correo." });
      }
    } catch (err: any) {
      setSale(prev => prev ? { ...prev, email_status: 'pending' } : prev);
      toast({ variant: "destructive", title: "Error", description: err.message || "Error al enviar el correo." });
    } finally {
      setSendingSaleEmail(false);
    }
  };

  const handleAddPayment = async () => {
    if (!sale || !paymentForm.amount) return;

    setSavingPayment(true);
    try {
      const result = await salesApi.addPayment(sale.id, {
        payment_method_name: paymentForm.payment_method_name,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setSale(result.sale);
      setShowPaymentDialog(false);
      setPaymentForm({
        payment_method_name: "Efectivo",
        amount: "",
        payment_date: format(new Date(), "yyyy-MM-dd"),
        reference: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error adding payment:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Error al agregar el pago" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePrint = () => {
    if (!sale) return;
    window.open(`/api/sales/${sale.id}/pdf`, '_blank');
  };

  const handleDownloadPdf = () => {
    if (!sale) return;
    window.open(`/api/sales/${sale.id}/pdf?download=true`, '_blank');
  };

  const handlePrintThermalReceipt = async () => {
    if (!sale) return;

    try {
      const { jsPDF } = await import('jspdf');

      const company = user?.company;
      const companyName = company?.name || 'Empresa';
      const companyNit = company?.tax_id || '';
      const companyAddress = company?.address || '';
      const companyPhone = company?.phone || '';
      const companyEmail = company?.email || '';
      const logoUrl = company?.logo_icon_url || company?.logo_url;

      const invoiceDate = format(new Date(sale.invoice_date), "dd/MM/yyyy HH:mm", { locale: es });
      const items = sale.items || [];
      const payments = sale.payments || [];

      // Estimate height
      let estimatedH = 130 + items.length * 8 + payments.length * 4;
      if (Number(sale.balance) > 0) estimatedH += 5;
      if (Number(sale.retention_amount) > 0) estimatedH += (sale.retentions?.length || 1) * 4;

      const ticketW = 80;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [ticketW, Math.max(estimatedH, 140)] });
      const m = 4;
      const cw = ticketW - m * 2;
      let y = m;

      // ── Dashed separator helper ──
      const drawSep = () => {
        pdf.setDrawColor(200);
        pdf.setLineDashPattern([1, 1], 0);
        pdf.line(m, y, ticketW - m, y);
        pdf.setLineDashPattern([], 0);
        y += 3;
      };

      // ── Bold separator helper ──
      const drawBoldSep = () => {
        pdf.setDrawColor(60);
        pdf.setLineWidth(0.4);
        pdf.line(m, y, ticketW - m, y);
        pdf.setLineWidth(0.2);
        y += 3;
      };

      // ── Logo ──
      const logoData = await loadPdfLogo(logoUrl);
      if (logoData) {
        const ratio = logoData.width / logoData.height;
        const maxH = 14;
        const maxW = 35;
        let lw = maxH * ratio;
        let lh = maxH;
        if (lw > maxW) { lw = maxW; lh = lw / ratio; }
        const lx = (ticketW - lw) / 2;
        pdf.addImage(logoData.dataUrl, 'PNG', lx, y, lw, lh);
        y += lh + 2;
      }

      // ── Company header ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text(companyName, ticketW / 2, y, { align: 'center' });
      y += 3.5;
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      if (companyNit) { pdf.text(`NIT: ${companyNit}`, ticketW / 2, y, { align: 'center' }); y += 2.8; }
      if (companyAddress) { pdf.text(companyAddress, ticketW / 2, y, { align: 'center' }); y += 2.8; }
      const contactParts = [companyPhone ? `Tel: ${companyPhone}` : '', companyEmail].filter(Boolean);
      if (contactParts.length) { pdf.text(contactParts.join(' · '), ticketW / 2, y, { align: 'center' }); y += 2.8; }
      y += 1;

      drawBoldSep();

      // ── Invoice number badge ──
      const badgeText = sale.invoice_number;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const badgeW = pdf.getTextWidth(badgeText) + 10;
      const badgeX = (ticketW - badgeW) / 2;
      pdf.setFillColor(31, 41, 55);
      pdf.roundedRect(badgeX, y - 1, badgeW, 5.5, 1.2, 1.2, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.text(badgeText, ticketW / 2, y + 2.8, { align: 'center' });
      y += 7;

      // ── Meta info ──
      pdf.setFontSize(7);
      const metaLines: [string, string][] = [
        ['Fecha', invoiceDate],
      ];
      if (sale.seller) metaLines.push(['Vendedor', sale.seller.name]);
      metaLines.forEach(([label, val]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 114, 128);
        pdf.text(label, m, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
        pdf.text(val, ticketW - m, y, { align: 'right' });
        y += 3.5;
      });
      y += 1;
      drawSep();

      // ── Cliente ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(150, 150, 150);
      pdf.text('CLIENTE', m, y);
      y += 3;
      pdf.setFontSize(7);
      const clientLines: [string, string][] = [
        ['Nombre', sale.client?.name || 'Consumidor Final'],
      ];
      if (sale.client?.document_id) clientLines.push(['Doc.', `${sale.client.document_type || ''} ${sale.client.document_id}`]);
      if (sale.client?.phone) clientLines.push(['Tel.', sale.client.phone]);
      clientLines.forEach(([label, val]) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 114, 128);
        pdf.text(label, m, y);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(31, 41, 55);
        pdf.text(val, ticketW - m, y, { align: 'right' });
        y += 3.5;
      });
      y += 1;
      drawSep();

      // ── Detalle de venta ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(150, 150, 150);
      pdf.text('DETALLE DE VENTA', ticketW / 2, y, { align: 'center' });
      y += 3;
      drawSep();

      pdf.setFontSize(7);
      items.forEach((item) => {
        const qty = Number(item.quantity);
        const price = Number(item.unit_price);
        const total = Number(item.total);
        // Item name
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text(item.description.substring(0, 35), m, y);
        pdf.text(formatCurrency(total), ticketW - m, y, { align: 'right' });
        y += 3;
        // Qty x Price
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`${qty} × ${formatCurrency(price)}`, m + 1, y);
        y += 3.5;
        pdf.setFontSize(7);
      });
      y += 1;
      drawSep();

      // ── Resumen ──
      pdf.setFontSize(7);
      const summaryLines: [string, string, number[]?][] = [
        ['Subtotal', formatCurrency(Number(sale.subtotal))],
      ];
      if (Number(sale.discount_amount) > 0) {
        summaryLines.push(['Descuento', `-${formatCurrency(Number(sale.discount_amount))}`, [220, 38, 38]]);
      }
      summaryLines.push(['IVA', formatCurrency(Number(sale.tax_amount))]);
      if (Number(sale.retention_amount) > 0) {
        if (sale.retentions && sale.retentions.length > 0) {
          sale.retentions.forEach(ret => {
            summaryLines.push([`${ret.name} (${ret.percentage}%)`, `-${formatCurrency(ret.value)}`, [220, 38, 38]]);
          });
        } else {
          summaryLines.push(['Retenciones', `-${formatCurrency(Number(sale.retention_amount))}`, [220, 38, 38]]);
        }
      }
      summaryLines.forEach(([label, val, color]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(label, m, y);
        if (color) pdf.setTextColor(color[0], color[1], color[2]);
        else pdf.setTextColor(31, 41, 55);
        pdf.text(val, ticketW - m, y, { align: 'right' });
        y += 3.5;
      });

      // ── Total destacado ──
      y += 1;
      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(m, y - 1, cw, 7, 1.2, 1.2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(31, 41, 55);
      pdf.text('TOTAL', m + 3, y + 3.5);
      pdf.text(formatCurrency(Number(sale.total_amount)), ticketW - m - 3, y + 3.5, { align: 'right' });
      y += 10;

      // ── Pagos ──
      if (payments.length > 0) {
        drawSep();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(150, 150, 150);
        pdf.text('PAGOS', m, y);
        y += 3.5;
        pdf.setFontSize(7);
        payments.forEach((p) => {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(75, 85, 99);
          pdf.text(p.payment_method_name, m, y);
          pdf.setTextColor(31, 41, 55);
          pdf.text(formatCurrency(Number(p.amount)), ticketW - m, y, { align: 'right' });
          y += 3.5;
        });
        // Total pagado
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Total pagado', m, y);
        pdf.text(formatCurrency(Number(sale.paid_amount)), ticketW - m, y, { align: 'right' });
        y += 3.5;
        // Saldo pendiente
        if (Number(sale.balance) > 0) {
          pdf.setTextColor(180, 83, 9);
          pdf.text('Saldo pendiente', m, y);
          pdf.text(formatCurrency(Number(sale.balance)), ticketW - m, y, { align: 'right' });
          y += 3.5;
        }
      }

      y += 1;
      drawBoldSep();

      // ── Footer ──
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(31, 41, 55);
      pdf.text('¡Gracias por su compra!', ticketW / 2, y, { align: 'center' });
      y += 4;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(156, 163, 175);
      pdf.text('Creado por Legal Sistema', ticketW / 2, y, { align: 'center' });
      y += 2.5;
      pdf.text('www.legalsistema.co', ticketW / 2, y, { align: 'center' });

      // Auto-print: open PDF in new window and trigger print
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          printWindow.onafterprint = () => { printWindow.close(); URL.revokeObjectURL(pdfUrl); };
        };
      }
    } catch (err) {
      console.error('Error generating receipt:', err);
      toast({ title: 'Error', description: 'No se pudo generar la tirilla', variant: 'destructive' });
    }
  };

  // Edit mode functions
  const enterEditMode = (type: 'debit' | 'credit') => {
    if (!sale?.items) return;
    setEditItems(sale.items.map(item => ({
      id: item.id,
      tempId: `existing-${item.id}`,
      product_id: item.product_id,
      service_id: item.service_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      discount_percentage: Number(item.discount_percentage),
      tax_rate: item.tax_rate !== undefined && item.tax_rate !== null ? Number(item.tax_rate) : null,
      isNew: false,
      originalQuantity: item.quantity,
      originalPrice: Number(item.unit_price),
      originalDiscount: Number(item.discount_percentage),
    })));
    setEditModeType(type);
  };

  const exitEditMode = () => {
    setEditModeType(null);
    setEditItems([]);
    setSearchProduct("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const updateEditItem = (tempId: string, field: keyof EditableItem, value: number | string | null) => {
    setEditItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      if (!item.isNew) {
        if (editModeType === 'debit') {
          // Debit mode: can only increase qty/price, cannot increase discount
          if (field === 'quantity' && typeof value === 'number' && value < (item.originalQuantity ?? 1)) return item;
          if (field === 'unit_price' && typeof value === 'number' && value < (item.originalPrice ?? 0)) return item;
          if (field === 'discount_percentage' && typeof value === 'number' && value > (item.originalDiscount ?? 0)) return item;
        } else if (editModeType === 'credit') {
          // Credit mode: can only decrease qty/price, cannot decrease discount
          if (field === 'quantity' && typeof value === 'number' && value > (item.originalQuantity ?? 1)) return item;
          if (field === 'unit_price' && typeof value === 'number' && value > (item.originalPrice ?? 0)) return item;
          if (field === 'discount_percentage' && typeof value === 'number' && value < (item.originalDiscount ?? 0)) return item;
        }
      }
      return { ...item, [field]: value };
    }));
  };

  const addProductItem = (product: Product) => {
    setEditItems(prev => [...prev, {
      tempId: `new-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      description: product.name,
      quantity: 1,
      unit_price: Number(product.sale_price || 0),
      discount_percentage: 0,
      tax_rate: product.tax_rate ?? 19,
      isNew: true,
    }]);
    setSearchProduct("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const addManualItem = () => {
    setEditItems(prev => [...prev, {
      tempId: `new-${Date.now()}-${Math.random()}`,
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 19,
      isNew: true,
    }]);
  };

  const removeNewItem = (tempId: string) => {
    setEditItems(prev => prev.filter(item => item.tempId !== tempId || !item.isNew));
  };

  const handleSearchProducts = useCallback((query: string) => {
    setSearchProduct(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await productsApi.getAll({ search: query });
        setSearchResults(results.slice(0, 10));
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }, []);

  const handleEmitDebitNote = async () => {
    if (!sale || !activeEI) return;
    const invalidItem = editItems.find(item => !item.description.trim());
    if (invalidItem) {
      toast({ variant: "destructive", title: "Error", description: "Todos los items deben tener una descripción" });
      return;
    }
    setSavingItems(true);
    setEiError(null);
    try {
      // Step 1: Save the updated items
      const updatedSale = await salesApi.updateItems(sale.id, {
        items: editItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          service_id: item.service_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_rate: item.tax_rate,
        })),
      });
      setSale(updatedSale);

      // Step 2: Generate the debit note
      const result = await electronicInvoicingApi.createDebitNote(activeEI.id);
      if (result.success && result.electronic_invoices) {
        setSale(prev => prev ? { ...prev, electronic_invoices: result.electronic_invoices } : prev);
        exitEditMode();
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
        exitEditMode();
      }
    } catch (err: any) {
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al emitir nota débito") + errMsgs + errFields);
      exitEditMode();
    } finally {
      setSavingItems(false);
    }
  };

  const handleEmitCreditNote = async () => {
    if (!sale || !activeEI) return;
    const invalidItem = editItems.find(item => !item.description.trim());
    if (invalidItem) {
      toast({ variant: "destructive", title: "Error", description: "Todos los items deben tener una descripción" });
      return;
    }
    setSavingItems(true);
    setEiError(null);
    try {
      const updatedSale = await salesApi.updateItems(sale.id, {
        items: editItems.map(item => ({
          id: item.id,
          product_id: item.product_id,
          service_id: item.service_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage,
          tax_rate: item.tax_rate,
        })),
      });
      setSale(updatedSale);

      const result = await electronicInvoicingApi.createAdjustmentCreditNote(activeEI.id);
      if (result.success && result.electronic_invoices) {
        setSale(prev => prev ? { ...prev, electronic_invoices: result.electronic_invoices } : prev);
        exitEditMode();
        setShowEIDialog(true);
      } else {
        const errorDetails = result.errors_messages?.join(", ") || result.message || "Error desconocido";
        setEiError(errorDetails);
        exitEditMode();
      }
    } catch (err: any) {
      const errMsgs = err.errors_messages?.length
        ? "\n" + err.errors_messages.join("\n")
        : "";
      const errFields = err.errors
        ? "\nCampos: " + Object.entries(err.errors).map(([k, v]: [string, any]) => `${k}: ${v.join(", ")}`).join("; ")
        : "";
      setEiError((err.message || "Error al emitir nota crédito") + errMsgs + errFields);
      exitEditMode();
    } finally {
      setSavingItems(false);
    }
  };

  const editCalculations = useMemo(() => {
    if (!isEditMode) return null;
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const item of editItems) {
      const itemSubtotal = item.quantity * item.unit_price;
      const discountAmount = itemSubtotal * (item.discount_percentage / 100);
      const afterDiscount = itemSubtotal - discountAmount;
      const taxRate = item.tax_rate ?? 0;
      const taxAmount = afterDiscount * (taxRate / 100);
      subtotal += itemSubtotal;
      discountTotal += discountAmount;
      taxTotal += taxAmount;
    }
    const retentionAmount = Number(sale?.retention_amount ?? 0);
    const total = subtotal - discountTotal + taxTotal - retentionAmount;
    const originalTotal = Number(sale?.total_amount ?? 0);
    const difference = total - originalTotal;
    return { subtotal, discountTotal, taxTotal, total, difference };
  }, [editItems, isEditMode, sale?.retention_amount, sale?.total_amount]);

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll spy for edit mode - detect visible section
  useEffect(() => {
    if (!isEditMode) return;

    const sectionRefs = [
      { id: "datos-comprador", ref: clientSectionRef },
      { id: "items", ref: itemsSectionRef },
      { id: "totales", ref: totalsSectionRef },
      { id: "pagos", ref: paymentsSectionRef },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section");
            if (sectionId) setActiveSection(sectionId);
          }
        });
      },
      { root: null, rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    sectionRefs.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [isEditMode]);

  if (loading) {
    return (
      <AppLayout title="Cargando...">
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout title="Factura no encontrada">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">No se encontró la factura</p>
          <Button onClick={() => router.visit("/admin/sales")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Facturas
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Helper: get electronic invoices sorted by newest first
  const electronicInvoices = sale.electronic_invoices || [];
  const activeEI = electronicInvoices.find(ei => !ei.credit_note || ei.credit_note.type === 'adjustment') || null;
  const hasActiveEI = activeEI != null;
  const hasDebitNote = activeEI?.debit_note != null;
  const hasAdjustmentCN = activeEI?.credit_note?.type === 'adjustment';
  const canCreateDebitNote = hasActiveEI && !hasDebitNote;
  const canCreateAdjustmentCN = hasActiveEI && !hasAdjustmentCN && !hasDebitNote;
  const canGenerateNewEI = electronicInvoices.length === 0 || !hasActiveEI;
  const lastVoidedEI = electronicInvoices.find(ei => ei.credit_note) || null;

  const typeConfig = TYPE_LABELS[sale.type];
  const statusConfig = PAYMENT_STATUS_CONFIG[sale.payment_status];
  const StatusIcon = statusConfig.icon;

  const companyName = user?.company?.name || "LEGAL SISTEMA";
  const companyNit = user?.company?.tax_id || "";
  const companyAddress = user?.company?.address || "";
  const companyPhone = user?.company?.phone || "";

  // Navigation sections for edit mode footer pills
  const navSections = [
    { id: "datos-comprador", label: "Cliente", icon: User, ref: clientSectionRef },
    { id: "items", label: "Productos", icon: ShoppingCart, ref: itemsSectionRef },
    { id: "totales", label: "Totales", icon: DollarSign, ref: totalsSectionRef },
    { id: "pagos", label: "Pagos", icon: CreditCard, ref: paymentsSectionRef },
  ];

  const getNavLabel = (sectionId: string) => {
    switch (sectionId) {
      case "datos-comprador":
        return sale.client?.name || "Cliente";
      case "items":
        const count = isEditMode ? editItems.length : (sale.items?.length || 0);
        return count > 0 ? `${count} ${count === 1 ? "Producto" : "Productos"}` : "Productos";
      case "totales":
        if (isEditMode && editCalculations) {
          return formatCurrency(editCalculations.total);
        }
        return formatCurrency(Number(sale.total_amount));
      case "pagos":
        return Number(sale.paid_amount) > 0 ? formatCurrency(Number(sale.paid_amount)) : "Pagos";
      default:
        return navSections.find((s) => s.id === sectionId)?.label || "";
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>, section: string) => {
    setActiveSection(section);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <AppLayout title={`Factura ${sale.invoice_number}`}>
      <Head title={`Factura ${sale.invoice_number}`} />

      <div className="min-h-screen bg-background pb-24 print:pb-0 -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
        <div className="py-2 px-2 sm:px-4">
          <div className="max-w-4xl mx-auto space-y-2">

            {/* Top bar: Back + Actions - matches vet-dash pill style */}
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8 text-xs px-2"
                onClick={() => { if (isEditMode) exitEditMode(); else router.visit("/admin/sales"); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isEditMode ? "Cancelar" : "Facturas"}
              </Button>

              <Separator orientation="vertical" className="h-5" />

              {isEditMode ? (
                <>
                  <Badge className={cn(
                    "px-2.5 py-1 text-xs",
                    editModeType === 'debit'
                      ? "bg-amber-500/15 text-amber-700 border-amber-500/20"
                      : "bg-orange-500/15 text-orange-700 border-orange-500/20"
                  )}>
                    <Pencil className="h-3 w-3 mr-1" />
                    {editModeType === 'debit' ? "Modo Edición - Nota Débito" : "Modo Edición - Nota Crédito"}
                  </Badge>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={exitEditMode}
                    disabled={savingItems}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  {/* FE history button */}
                  {electronicInvoices.length > 0 && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5 rounded-full"
                      onClick={() => setShowEIDialog(true)}
                    >
                      <Clock className="h-3 w-3" />
                      FE ({electronicInvoices.length})
                    </Button>
                  )}

              {/* Generate FE */}
              {!isEditMode && canGenerateNewEI && hasEIToken && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs px-2.5 rounded-full"
                  onClick={handleGenerateElectronicInvoice}
                  disabled={generatingInvoice}
                >
                  {generatingInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck className="h-3 w-3" />}
                  {electronicInvoices.length > 0 ? "Nueva FE" : "Generar FE"}
                </Button>
              )}

                  {/* Generate POS */}
                  {canGenerateNewEI && hasEIToken && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-2.5 rounded-full"
                      onClick={handleGeneratePosInvoice}
                      disabled={generatingPosInvoice}
                    >
                      {generatingPosInvoice ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                      Generar POS
                    </Button>
                  )}

                  {/* Debit Note */}
                  {canCreateDebitNote && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs px-2.5 rounded-full text-amber-600 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-700"
                      onClick={() => enterEditMode('debit')}
                    >
                      <Plus className="h-3 w-3" />
                      Nota Débito
                    </Button>
                  )}

                  {/* Credit Note */}
                  {canCreateAdjustmentCN && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs px-2.5 rounded-full text-orange-600 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-700"
                      onClick={() => enterEditMode('credit')}
                    >
                      <Minus className="h-3 w-3" />
                      Nota Crédito
                    </Button>
                  )}

                  {/* Void FE */}
                  {hasActiveEI && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs px-2.5 rounded-full text-red-600 border-red-500/20 hover:bg-red-500/10 hover:text-red-700"
                      onClick={() => setShowVoidConfirm(true)}
                    >
                      <Ban className="h-3 w-3" />
                      Anular
                    </Button>
                  )}

                  {/* Voided badge */}
                  {!hasActiveEI && lastVoidedEI && (
                    <Badge className="bg-red-500/15 text-red-700 border-red-500/20 text-xs px-2 py-0.5">
                      <XCircle className="h-3 w-3 mr-1" />
                      FE Anulada
                    </Badge>
                  )}

                  {/* Internal Notes Buttons (for account/credit types) */}
                  {(sale.type === 'account' || sale.type === 'credit') && sale.status !== 'cancelled' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs px-2.5 rounded-full text-green-600 border-green-500/20 hover:bg-green-500/10 hover:text-green-700"
                        onClick={() => setShowInternalCreditDialog(true)}
                      >
                        <Minus className="h-3 w-3" />
                        Nota Crédito Int.
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs px-2.5 rounded-full text-blue-600 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-700"
                        onClick={() => setShowInternalDebitDialog(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Nota Débito Int.
                      </Button>
                    </>
                  )}

              {/* PDF */}
              {!isEditMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-7 text-xs px-2.5 rounded-full"
                  onClick={handleDownloadPdf}
                >
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
              )}

              <div className="flex-1" />

                  {/* Send Email */}
                  {sale.client?.email && (
                    <>
                      {sale.email_status === 'sent' && (
                        <Badge variant="outline" className="h-7 text-xs px-2.5 rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/20 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Correo enviado
                        </Badge>
                      )}
                      {sale.email_status === 'pending' && (
                        <Badge variant="outline" className="h-7 text-xs px-2.5 rounded-full bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1">
                          <Clock className="h-3 w-3" />
                          Correo en espera
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "gap-1 h-7 text-xs px-2.5 rounded-full",
                          sale.email_status === 'pending' && "border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                        )}
                        onClick={handleSendSaleEmail}
                        disabled={sendingSaleEmail}
                      >
                        {sendingSaleEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : sale.email_status === 'pending' ? <RefreshCw className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {sale.email_status === 'pending' ? 'Reenviar' : 'Email'}
                      </Button>
                    </>
                  )}

                  {/* Print icon */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={handlePrint}
                    title="Imprimir"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>

            {/* Electronic Invoice Error */}
            {eiError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 print:hidden">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-700">Error al generar factura electrónica</p>
                    <p className="text-sm text-red-700 whitespace-pre-wrap mt-1">{eiError}</p>
                  </div>
                  <button onClick={() => setEiError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    &times;
                  </button>
                </div>
              </div>
            )}

            {/* Invoice Document - Paper effect like vet-dash */}
            <div ref={printRef} className="bg-card rounded-lg shadow-2xl border relative overflow-hidden">

              {/* Document Header - gradient like vet-dash */}
              <div className="border-b bg-gradient-to-b from-primary/5 to-transparent p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{companyName}</p>
                      {companyNit && <p>NIT: {companyNit}</p>}
                      {companyAddress && <p>{companyAddress}</p>}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <Badge className={cn(typeConfig.color)}>
                        {typeConfig.label}
                      </Badge>
                      <Badge variant="outline" className={cn(statusConfig.badgeClass)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="font-semibold text-foreground text-sm mt-1">{sale.invoice_number}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(sale.invoice_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nota Débito / Crédito Banner */}
              {isEditMode && (
                <div className={cn(
                  "border-b px-4 py-2.5 flex items-center gap-3",
                  editModeType === 'debit'
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-orange-500/10 border-orange-500/20"
                )}>
                  <AlertTriangle className={cn(
                    "h-4 w-4 flex-shrink-0",
                    editModeType === 'debit' ? "text-amber-600" : "text-orange-600"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      editModeType === 'debit' ? "text-amber-700" : "text-orange-700"
                    )}>
                      {editModeType === 'debit' ? "Nota Débito" : "Nota Crédito"} — Referencia: {sale.invoice_number}
                    </p>
                    <p className={cn(
                      "text-xs",
                      editModeType === 'debit' ? "text-amber-600" : "text-orange-600"
                    )}>
                      {editModeType === 'debit'
                        ? "Aumente cantidades, precios o agregue items para generar la nota débito"
                        : "Disminuya cantidades, precios o elimine items para generar la nota crédito"}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-xs flex-shrink-0",
                    editModeType === 'debit'
                      ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      : "bg-orange-500/15 text-orange-700 border-orange-500/30"
                  )}>
                    {editModeType === 'debit' ? "Nota Débito" : "Nota Crédito"}
                  </Badge>
                </div>
              )}

              {/* Body */}
              <div className="p-4 space-y-4">

                {/* Client Section */}
                <section ref={clientSectionRef} data-section="datos-comprador">
                  <div className={cn(
                    "flex items-center gap-2 mb-3 px-3 py-2 rounded-lg",
                    SECTION_COLORS["datos-comprador"].bg
                  )}>
                    <User className={cn("h-4 w-4", SECTION_COLORS["datos-comprador"].icon)} />
                    <h2 className="font-semibold text-sm text-foreground">Datos del Comprador</h2>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium text-sm">{sale.client?.name || "-"}</p>
                      </div>
                      {sale.client?.document_id && (
                        <div>
                          <p className="text-xs text-muted-foreground">Identificación</p>
                          <p className="font-medium text-sm">{sale.client.document_type}: {sale.client.document_id}</p>
                        </div>
                      )}
                      {sale.client?.address && (
                        <div>
                          <p className="text-xs text-muted-foreground">Dirección</p>
                          <p className="font-medium text-sm">{sale.client.address}</p>
                        </div>
                      )}
                      {sale.client?.phone && (
                        <div>
                          <p className="text-xs text-muted-foreground">Teléfono</p>
                          <p className="font-medium text-sm">{sale.client.phone}</p>
                        </div>
                      )}
                      {sale.client?.email && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium text-sm">{sale.client.email}</p>
                        </div>
                      )}
                      {sale.seller && (
                        <div>
                          <p className="text-xs text-muted-foreground">Vendedor</p>
                          <p className="font-medium text-sm">{sale.seller.name}</p>
                        </div>
                      )}
                      {sale.price_list && (
                        <div>
                          <p className="text-xs text-muted-foreground">Lista de Precios</p>
                          <p className="font-medium text-sm">{sale.price_list.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Payment Status (if not paid) */}
                {sale.payment_status !== "paid" && (
                  <div className={cn("rounded-lg p-3 border flex items-center gap-3", statusConfig.badgeClass)}>
                    <StatusIcon className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-sm">{statusConfig.label}</p>
                      <p className="text-xs">Saldo pendiente: {formatCurrency(Number(sale.balance))}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed" />

                {/* Products Section */}
                <section ref={itemsSectionRef} data-section="items">
                  <div className={cn(
                    "flex items-center justify-between mb-3 px-3 py-2 rounded-lg",
                    SECTION_COLORS["items"].bg
                  )}>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className={cn("h-4 w-4", SECTION_COLORS["items"].icon)} />
                      <h2 className="font-medium text-sm">Productos y Servicios</h2>
                      {(isEditMode ? editItems.length : (sale.items?.length || 0)) > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                          {isEditMode ? editItems.length : (sale.items?.length || 0)} {(isEditMode ? editItems.length : (sale.items?.length || 0)) === 1 ? "item" : "items"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!isEditMode ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold h-9">Descripción</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-center w-16">Cant.</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-right">Precio Unit.</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-center w-16">Dcto %</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-center w-16">IVA %</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.items?.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/30">
                              <TableCell className="py-2.5">
                                <p className="text-sm font-medium">{item.description}</p>
                              </TableCell>
                              <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(Number(item.unit_price))}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                <div>
                                  {Number(item.discount_percentage) > 0 ? `${item.discount_percentage}%` : "—"}
                                  {item.discount_note && (
                                    <p className="text-[10px] text-primary font-medium">{item.discount_note}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {item.tax_rate !== null ? `${item.tax_rate}%` : "Excl."}
                              </TableCell>
                              <TableCell className="text-right text-sm font-semibold">
                                {formatCurrency(Number(item.total))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Product search bar - above table like sell page */}
                      <div className="relative" ref={searchContainerRef}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        <Input
                          placeholder="Buscar producto para agregar..."
                          value={searchProduct}
                          onChange={(e) => handleSearchProducts(e.target.value)}
                          onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
                          className="pl-10 h-10 bg-muted/50 border-border"
                        />
                        {showSearchResults && searchResults.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                onClick={() => addProductItem(product)}
                                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors flex justify-between items-center gap-3 border-b last:border-b-0"
                              >
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Package className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-700 border-blue-500/20">
                                      Producto
                                    </Badge>
                                    {product.category && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 border-purple-500/20">
                                        {product.category.name}
                                      </Badge>
                                    )}
                                    {product.is_trackable && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] px-1.5 py-0 h-4",
                                          product.current_stock <= product.min_stock
                                            ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                            : "bg-sky-50 text-sky-700 border-sky-200"
                                        )}
                                      >
                                        Stock: {product.current_stock}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(Number(product.sale_price))}
                                    {product.sku && ` • SKU: ${product.sku}`}
                                    {` • IVA: ${product.tax_rate != null ? `${product.tax_rate}%` : 'Excluido'}`}
                                  </p>
                                </div>
                                <Plus className="h-4 w-4 text-primary shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Items table - matching sell page style */}
                      <div className="overflow-x-auto border border-border rounded-lg bg-muted/50">
                        <Table>
                          <TableHeader>
                            <TableRow className={editModeType === 'debit' ? "bg-amber-500/10" : "bg-orange-500/10"}>
                              <TableHead className="min-w-[200px] text-xs font-semibold h-9">Descripción</TableHead>
                              <TableHead className="text-center w-24 text-xs font-semibold h-9">Cant.</TableHead>
                              <TableHead className="text-right w-32 text-xs font-semibold h-9">Precio</TableHead>
                              <TableHead className="text-right w-24 text-xs font-semibold h-9">Dcto%</TableHead>
                              <TableHead className="text-center w-24 text-xs font-semibold h-9">IVA</TableHead>
                              <TableHead className="text-right w-28 text-xs font-semibold h-9">Total</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editItems.map((item) => {
                              const itemSubtotal = item.quantity * item.unit_price;
                              const discountAmt = itemSubtotal * (item.discount_percentage / 100);
                              const afterDiscount = itemSubtotal - discountAmt;
                              const taxAmt = afterDiscount * ((item.tax_rate ?? 0) / 100);
                              const itemTotal = afterDiscount + taxAmt;
                              const minQty = item.isNew ? 1 : (item.originalQuantity ?? 1);
                              const minPrice = item.isNew ? 0 : (item.originalPrice ?? 0);
                              const maxDiscount = item.isNew ? 100 : (item.originalDiscount ?? 0);

                              return (
                                <TableRow key={item.tempId} className={item.isNew ? "bg-blue-500/10/50" : ""}>
                                  {/* Description */}
                                  <TableCell className="max-w-[240px]">
                                    {item.isNew ? (
                                      <div className="flex items-center gap-1">
                                        <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20 text-[10px] px-1 py-0 shrink-0">Nuevo</Badge>
                                        <Input
                                          value={item.description}
                                          onChange={(e) => updateEditItem(item.tempId, 'description', e.target.value)}
                                          placeholder="Descripcion del item"
                                          className="text-sm border-0 bg-transparent px-0 focus-visible:ring-0"
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                        <Input
                                          value={item.description}
                                          disabled
                                          className={cn(
                                            "text-sm border-0 bg-transparent px-0 focus-visible:ring-0 truncate",
                                            "cursor-not-allowed font-medium"
                                          )}
                                        />
                                      </div>
                                    )}
                                  </TableCell>

                                  {/* Quantity with -/+ buttons */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={item.isNew ? 1 : (editModeType === 'credit' ? 0 : (item.originalQuantity ?? 1))}
                                      max={!item.isNew && editModeType === 'credit' ? (item.originalQuantity ?? undefined) : undefined}
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (editModeType === 'credit' && !item.isNew) {
                                          updateEditItem(item.tempId, 'quantity', Math.min(item.originalQuantity ?? val, Math.max(0, val)));
                                        } else {
                                          updateEditItem(item.tempId, 'quantity', Math.max(item.isNew ? 1 : (item.originalQuantity ?? 1), val));
                                        }
                                      }}
                                      className="h-8 text-sm text-center w-20"
                                    />
                                  </TableCell>

                                  {/* Price with $ prefix */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={item.isNew ? 0 : (editModeType === 'credit' ? 0 : (item.originalPrice ?? 0))}
                                      max={!item.isNew && editModeType === 'credit' ? (item.originalPrice ?? undefined) : undefined}
                                      step="100"
                                      value={item.unit_price}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        if (editModeType === 'credit' && !item.isNew) {
                                          updateEditItem(item.tempId, 'unit_price', Math.min(item.originalPrice ?? val, Math.max(0, val)));
                                        } else {
                                          updateEditItem(item.tempId, 'unit_price', Math.max(item.isNew ? 0 : (item.originalPrice ?? 0), val));
                                        }
                                      }}
                                      className="h-8 text-sm text-right w-28"
                                    />
                                  </TableCell>

                                  {/* Discount with dashed border + % icon */}
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min={editModeType === 'credit' ? (item.isNew ? 0 : (item.originalDiscount ?? 0)) : 0}
                                      max={editModeType === 'credit' ? 100 : (item.isNew ? 100 : (item.originalDiscount ?? 0))}
                                      step="0.5"
                                      value={item.discount_percentage}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        if (editModeType === 'credit' && !item.isNew) {
                                          updateEditItem(item.tempId, 'discount_percentage', Math.max(item.originalDiscount ?? 0, Math.min(100, val)));
                                        } else {
                                          updateEditItem(item.tempId, 'discount_percentage', Math.min(item.isNew ? 100 : (item.originalDiscount ?? 0), Math.max(0, val)));
                                        }
                                      }}
                                      className="h-8 text-sm text-right w-20"
                                    />
                                  </TableCell>

                                  {/* IVA Select */}
                                  <TableCell>
                                    <Select
                                      value={item.tax_rate === null ? "excl" : String(item.tax_rate)}
                                      onValueChange={(val) => updateEditItem(item.tempId, 'tax_rate', val === "excl" ? null : Number(val))}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-[70px] border-0 bg-transparent">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-card z-50">
                                        <SelectItem value="0">0%</SelectItem>
                                        <SelectItem value="5">5%</SelectItem>
                                        <SelectItem value="19">19%</SelectItem>
                                        <SelectItem value="excl">Excl.</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>

                                  {/* Subtotal */}
                                  <TableCell className="text-right font-semibold">
                                    {formatCurrency(itemTotal)}
                                  </TableCell>

                                  {/* Delete */}
                                  <TableCell>
                                    {item.isNew ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeNewItem(item.tempId)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : editModeType === 'credit' ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                        onClick={() => updateEditItem(item.tempId, 'quantity', 0)}
                                        title="Eliminar item (qty=0)"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <Lock className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Add product search bar - only in debit mode */}
                      {editModeType === 'debit' && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="relative flex-1" ref={searchContainerRef}>
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Buscar producto para agregar..."
                              value={searchProduct}
                              onChange={(e) => handleSearchProducts(e.target.value)}
                              onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
                              className="pl-9 h-9"
                            />
                            {showSearchResults && searchResults.length > 0 && (
                              <div className="absolute z-50 top-full mt-1 w-full bg-card border rounded-lg shadow-lg max-h-48 overflow-auto">
                                {searchResults.map((product) => (
                                  <button
                                    key={product.id}
                                    onClick={() => addProductItem(product)}
                                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-sm border-b last:border-b-0"
                                  >
                                    <span className="truncate">{product.name}</span>
                                    <span className="text-muted-foreground shrink-0 ml-2">{formatCurrency(Number(product.sale_price))}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" onClick={addManualItem} className="h-9 shrink-0">
                            <Plus className="h-4 w-4 mr-1" />
                            Item Manual
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <div className="border-t border-dashed" />

                {/* Totals Section */}
                <section ref={totalsSectionRef} data-section="totales">
                  <div className={cn(
                    "flex items-center gap-2 mb-3 px-3 py-2 rounded-lg",
                    SECTION_COLORS["totales"].bg
                  )}>
                    <DollarSign className={cn("h-4 w-4", SECTION_COLORS["totales"].icon)} />
                    <h2 className="font-semibold text-sm text-foreground">Resumen</h2>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                      {isEditMode && editCalculations ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{formatCurrency(editCalculations.subtotal)}</span>
                          </div>
                          {editCalculations.discountTotal > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Descuentos</span>
                              <span className="font-medium text-red-600">-{formatCurrency(editCalculations.discountTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IVA</span>
                            <span className="font-medium">{formatCurrency(editCalculations.taxTotal)}</span>
                          </div>
                          {Number(sale.retention_amount) > 0 && (
                            <>
                              {sale.retentions && sale.retentions.length > 0 ? (
                                sale.retentions.map((ret, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{ret.name} ({ret.percentage}%)</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(ret.value)}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Retenciones</span>
                                  <span className="font-medium text-red-600">-{formatCurrency(Number(sale.retention_amount))}</span>
                                </div>
                              )}
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg font-bold">
                            <span>Nuevo Total</span>
                            <span className="text-primary">{formatCurrency(editCalculations.total)}</span>
                          </div>
                          <div className={cn(
                            "flex justify-between text-sm p-2 rounded",
                            editModeType === 'debit'
                              ? (editCalculations.difference > 0 ? "bg-amber-500/10" : "bg-red-500/10")
                              : (editCalculations.difference < 0 ? "bg-orange-500/10" : "bg-red-500/10")
                          )}>
                            <span className={cn(
                              "font-medium",
                              editModeType === 'debit'
                                ? (editCalculations.difference > 0 ? "text-amber-700" : "text-red-700")
                                : (editCalculations.difference < 0 ? "text-orange-700" : "text-red-700")
                            )}>
                              {editModeType === 'debit' ? "Diferencia (valor Nota Débito)" : "Diferencia (valor Nota Crédito)"}
                            </span>
                            <span className={cn(
                              "font-bold",
                              editModeType === 'debit'
                                ? (editCalculations.difference > 0 ? "text-amber-700" : "text-red-700")
                                : (editCalculations.difference < 0 ? "text-orange-700" : "text-red-700")
                            )}>
                              {editCalculations.difference > 0 ? "+" : ""}{formatCurrency(editCalculations.difference)}
                            </span>
                          </div>
                          {editModeType === 'debit' && editCalculations.difference <= 0 && (
                            <p className="text-xs text-red-600">
                              El total debe ser mayor al original para poder guardar y generar nota débito.
                            </p>
                          )}
                          {editModeType === 'credit' && editCalculations.difference >= 0 && (
                            <p className="text-xs text-red-600">
                              El total debe ser menor al original para poder guardar y generar nota crédito.
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{formatCurrency(Number(sale.subtotal))}</span>
                          </div>
                          {Number(sale.discount_amount) > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Descuentos</span>
                              <span className="font-medium text-red-600">-{formatCurrency(Number(sale.discount_amount))}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IVA</span>
                            <span className="font-medium">{formatCurrency(Number(sale.tax_amount))}</span>
                          </div>
                          {Number(sale.retention_amount) > 0 && (
                            <>
                              {sale.retentions && sale.retentions.length > 0 ? (
                                sale.retentions.map((ret, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{ret.name} ({ret.percentage}%)</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(ret.value)}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Retenciones</span>
                                  <span className="font-medium text-red-600">-{formatCurrency(Number(sale.retention_amount))}</span>
                                </div>
                              )}
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(Number(sale.total_amount))}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>

                <div className="border-t border-dashed" />

                {/* Payments Section */}
                <section ref={paymentsSectionRef} data-section="pagos">
                  <div className={cn(
                    "flex items-center justify-between mb-3 px-3 py-2 rounded-lg",
                    SECTION_COLORS["pagos"].bg
                  )}>
                    <div className="flex items-center gap-2">
                      <CreditCard className={cn("h-4 w-4", SECTION_COLORS["pagos"].icon)} />
                      <h2 className="font-semibold text-sm text-foreground">Pagos</h2>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusConfig.badgeClass)}
                    >
                      {sale.payment_status === "paid" ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Pagada</>
                      ) : (
                        `Saldo: ${formatCurrency(Number(sale.balance))}`
                      )}
                    </Badge>
                  </div>

                  {sale.payments && sale.payments.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs font-semibold h-9">Fecha</TableHead>
                            <TableHead className="text-xs font-semibold h-9">Método</TableHead>
                            <TableHead className="text-xs font-semibold h-9">Caja / Banco</TableHead>
                            <TableHead className="text-xs font-semibold h-9">Referencia</TableHead>
                            <TableHead className="text-xs font-semibold h-9 text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sale.payments.map((payment) => (
                            <TableRow key={payment.id} className="hover:bg-muted/30">
                              <TableCell className="text-sm py-2.5">
                                {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: es })}
                              </TableCell>
                              <TableCell className="text-sm">{payment.payment_method_name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {payment.cash_register?.name || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {payment.reference || "—"}
                              </TableCell>
                              <TableCell className="text-sm text-right font-semibold">
                                {formatCurrency(Number(payment.amount))}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/30 font-semibold">
                            <TableCell colSpan={4} className="text-sm text-right">
                              Total Pagado
                            </TableCell>
                            <TableCell className="text-sm text-right">
                              {formatCurrency(Number(sale.paid_amount))}
                            </TableCell>
                          </TableRow>
                          {Number(sale.balance) > 0 && (
                            <TableRow className="bg-amber-500/10/50">
                              <TableCell colSpan={4} className="text-sm text-right font-semibold text-amber-700">
                                Saldo Pendiente
                              </TableCell>
                              <TableCell className="text-sm text-right font-bold text-amber-700">
                                {formatCurrency(Number(sale.balance))}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm">No hay pagos registrados</p>
                      {sale.payment_status !== "paid" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => router.visit('/admin/payments')}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Registrar primer pago
                        </Button>
                      )}
                    </div>
                  )}
                </section>

                {/* Internal Notes Section (Credit/Debit) */}
                {(sale.type === 'account' || sale.type === 'credit') && (
                  <InternalNotesSection
                    sale={sale}
                    onNoteCreated={fetchSale}
                    showCreditDialog={showInternalCreditDialog}
                    onCreditDialogChange={setShowInternalCreditDialog}
                    showDebitDialog={showInternalDebitDialog}
                    onDebitDialogChange={setShowInternalDebitDialog}
                  />
                )}

              </div>

              {/* Document Footer */}
              <div className="border-t bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                <p>Gracias por su preferencia</p>
                <p className="mt-1">
                  {companyName}
                  {companyNit && ` • NIT: ${companyNit}`}
                  {companyAddress && ` • ${companyAddress}`}
                  {companyPhone && ` • ${companyPhone}`}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t shadow-2xl z-40 print:hidden">
          <div className="max-w-4xl mx-auto px-4 py-2 sm:py-3">
            {isEditMode ? (
              /* Edit mode: Navigation pills + action buttons (like sell page) */
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                {/* Section Navigation Pills */}
                <div className="flex-1 min-w-0 overflow-x-auto hide-scrollbar">
                  <div className="flex gap-1.5">
                    {navSections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      const dynamicLabel = getNavLabel(section.id);
                      const hasValue = dynamicLabel !== section.label;
                      const colors = SECTION_COLORS[section.id as keyof typeof SECTION_COLORS];

                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.ref, section.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap border",
                            isActive
                              ? colors.active
                              : hasValue
                              ? colors.hasValue
                              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{dynamicLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={exitEditMode}
                    disabled={savingItems}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className={cn(
                      "gap-1.5 text-white",
                      editModeType === 'debit'
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-orange-600 hover:bg-orange-700"
                    )}
                    onClick={editModeType === 'debit' ? handleEmitDebitNote : handleEmitCreditNote}
                    disabled={savingItems || (editModeType === 'debit'
                      ? (editCalculations?.difference ?? 0) <= 0
                      : (editCalculations?.difference ?? 0) >= 0
                    )}
                  >
                    {savingItems ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="hidden sm:inline">
                      {editModeType === 'debit' ? "Emitir Nota Débito" : "Emitir Nota Crédito"}
                    </span>
                    <span className="sm:hidden">
                      {editModeType === 'debit' ? "Emitir ND" : "Emitir NC"}
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Normal mode: Invoice info + quick actions */
              <div className="flex items-center justify-between gap-3">
                {/* Left: Invoice info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={cn(typeConfig.color, "text-xs")}>
                    {sale.type === "electronic" ? "FE" : sale.type === "pos" ? "POS" : sale.type === "account" ? "CC" : "CR"}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{sale.invoice_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{sale.client?.name || "Sin cliente"}</p>
                  </div>
                  <Separator orientation="vertical" className="h-8 hidden sm:block" />
                  <p className="text-lg font-bold text-primary hidden sm:block">
                    {formatCurrency(Number(sale.total_amount))}
                  </p>
                </div>

                {/* Right: Quick actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {sale.payment_status !== "paid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => router.visit(`/admin/payments?sale_id=${sale.id}`)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Abono</span>
                    </Button>
                  )}

                  {thermalReceiptEnabled && canPrintReceipt && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handlePrintThermalReceipt}
                    >
                      <Receipt className="h-4 w-4" />
                      <span className="hidden sm:inline">Tirilla</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                        Acciones
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card">
                      {canGenerateNewEI && hasEIToken && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={handleGenerateElectronicInvoice}
                          disabled={generatingInvoice}
                        >
                          <FileCheck className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            {electronicInvoices.length > 0 ? "Generar Nueva FE" : "Generar FE"}
                          </span>
                        </DropdownMenuItem>
                      )}
                      {canGenerateNewEI && hasEIToken && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={handleGeneratePosInvoice}
                          disabled={generatingPosInvoice}
                        >
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">Generar POS</span>
                        </DropdownMenuItem>
                      )}
                      {canCreateDebitNote && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => enterEditMode('debit')}
                        >
                          <Plus className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-600 font-medium">Nota Débito</span>
                        </DropdownMenuItem>
                      )}
                      {canCreateAdjustmentCN && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => enterEditMode('credit')}
                        >
                          <Minus className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-600 font-medium">Nota Crédito</span>
                        </DropdownMenuItem>
                      )}
                      {hasActiveEI && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => setShowVoidConfirm(true)}
                          >
                            <Ban className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 font-medium">Anular FE</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={handleDownloadPdf}
                      >
                        <Download className="h-4 w-4" />
                        Descargar PDF
                      </DropdownMenuItem>
                      {electronicInvoices.length > 0 && (
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => setShowEIDialog(true)}
                        >
                          <History className="h-4 w-4" />
                          Ver Facturas Electrónicas
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Electronic Invoices Historial Dialog */}
      {electronicInvoices.length > 0 && (
        <Dialog open={showEIDialog} onOpenChange={setShowEIDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-600" />
                Historial de Facturas Electrónicas
              </DialogTitle>
              <DialogDescription>
                {electronicInvoices.length === 1
                  ? "Factura electrónica generada ante la DIAN."
                  : `${electronicInvoices.length} facturas electrónicas generadas para esta venta.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {electronicInvoices.map((ei, index) => {
                const isLatest = index === 0;
                const isVoided = !!ei.credit_note;

                return (
                  <div
                    key={ei.id}
                    className={cn(
                      "border rounded-lg overflow-hidden",
                      isLatest && !isVoided ? "border-emerald-500/30" : "border-border"
                    )}
                  >
                    {/* FE Header */}
                    <div className={cn(
                      "px-4 py-3 flex items-center justify-between",
                      isVoided ? "bg-red-500/10" : "bg-emerald-500/10"
                    )}>
                      <div className="flex items-center gap-2">
                        {isVoided ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                        <span className={cn("font-semibold text-sm", isVoided ? "text-red-700" : "text-emerald-700")}>
                          FE {ei.number || "-"}
                        </span>
                        {isLatest && (
                          <Badge variant="outline" className="text-xs ml-1">
                            Más reciente
                          </Badge>
                        )}
                        {isVoided && (
                          <Badge className="bg-red-500/15 text-red-700 border-red-500/20 text-xs">
                            Anulada
                          </Badge>
                        )}
                        {ei.email_status === 'sent' && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20 gap-0.5">
                            <Mail className="h-3 w-3" /> Enviado
                          </Badge>
                        )}
                        {ei.email_status === 'pending' && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20 gap-0.5">
                            <Clock className="h-3 w-3" /> Email en espera
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {/* FE Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              {(sendingEmailId === `fe-${ei.id}` || checkingStatusId === `invoice-${ei.id}`) ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
                              FE
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-card z-50">
                            <DropdownMenuItem onClick={() => window.open(electronicInvoicingApi.getElectronicInvoicePdfUrl(ei.id), '_blank')}>
                              <Download className="h-3.5 w-3.5 mr-2" /> Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail("fe", ei.id)}>
                              {ei.email_status === 'pending' ? <RefreshCw className="h-3.5 w-3.5 mr-2" /> : <Mail className="h-3.5 w-3.5 mr-2" />}
                              {ei.email_status === 'pending' ? 'Reenviar Email' : ei.email_status === 'sent' ? 'Reenviar Email' : 'Enviar Email'}
                            </DropdownMenuItem>
                            {ei.uuid && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCheckStatus("invoice", ei.id)}>
                                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Consultar Estado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusQuery('info', ei.uuid!)}>
                                  <FileCheck className="h-3.5 w-3.5 mr-2" /> Información DIAN
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusQuery('xml', ei.uuid!)}>
                                  <FileText className="h-3.5 w-3.5 mr-2" /> Ver XML
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusQuery('notes', ei.uuid!)}>
                                  <Receipt className="h-3.5 w-3.5 mr-2" /> Notas asociadas
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusQuery('events', ei.uuid!)}>
                                  <History className="h-3.5 w-3.5 mr-2" /> Eventos
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* NC Actions */}
                        {ei.credit_note && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className={`h-7 text-xs ${ei.credit_note.type === 'adjustment' ? 'text-orange-700 border-orange-500/30' : 'text-red-700 border-red-500/30'}`}>
                                {(sendingEmailId === `nc-${ei.credit_note!.id}` || checkingStatusId === `cn-${ei.credit_note!.id}`) ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Minus className="h-3 w-3 mr-1" />}
                                NC
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-card z-50">
                              <DropdownMenuItem onClick={() => window.open(electronicInvoicingApi.getCreditNotePdfUrl(ei.credit_note!.id), '_blank')}>
                                <Download className="h-3.5 w-3.5 mr-2" /> Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendEmail("nc", ei.credit_note!.id)}>
                                {ei.credit_note!.email_status === 'pending' ? <RefreshCw className="h-3.5 w-3.5 mr-2" /> : <Mail className="h-3.5 w-3.5 mr-2" />}
                                {ei.credit_note!.email_status === 'pending' ? 'Reenviar Email' : ei.credit_note!.email_status === 'sent' ? 'Reenviar Email' : 'Enviar Email'}
                              </DropdownMenuItem>
                              {ei.credit_note.uuid && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleCheckStatus("credit_note", ei.credit_note!.id)}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Consultar Estado
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusQuery('info', ei.credit_note!.uuid!)}>
                                    <FileCheck className="h-3.5 w-3.5 mr-2" /> Información DIAN
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusQuery('xml', ei.credit_note!.uuid!)}>
                                    <FileText className="h-3.5 w-3.5 mr-2" /> Ver XML
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* ND Actions */}
                        {ei.debit_note && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700 border-amber-500/30">
                                {(sendingEmailId === `nd-${ei.debit_note!.id}` || checkingStatusId === `dn-${ei.debit_note!.id}`) ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                                ND
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-card z-50">
                              <DropdownMenuItem onClick={() => window.open(electronicInvoicingApi.getDebitNotePdfUrl(ei.debit_note!.id), '_blank')}>
                                <Download className="h-3.5 w-3.5 mr-2" /> Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendEmail("nd", ei.debit_note!.id)}>
                                {ei.debit_note!.email_status === 'pending' ? <RefreshCw className="h-3.5 w-3.5 mr-2" /> : <Mail className="h-3.5 w-3.5 mr-2" />}
                                {ei.debit_note!.email_status === 'pending' ? 'Reenviar Email' : ei.debit_note!.email_status === 'sent' ? 'Reenviar Email' : 'Enviar Email'}
                              </DropdownMenuItem>
                              {ei.debit_note.uuid && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleCheckStatus("debit_note", ei.debit_note!.id)}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" /> Consultar Estado
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusQuery('info', ei.debit_note!.uuid!)}>
                                    <FileCheck className="h-3.5 w-3.5 mr-2" /> Información DIAN
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusQuery('xml', ei.debit_note!.uuid!)}>
                                    <FileText className="h-3.5 w-3.5 mr-2" /> Ver XML
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* FE Details */}
                    <div className="px-4 py-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Fecha de Emisión</span>
                          <p className="font-medium">
                            {ei.issue_date
                              ? format(new Date(ei.issue_date), "dd/MM/yyyy HH:mm", { locale: es })
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Estado</span>
                          <p className="font-medium">{ei.status_description || "Procesado"}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-xs">CUFE (UUID)</span>
                        <p className="font-mono text-xs break-all mt-1 bg-muted/50 p-2 rounded">
                          {ei.uuid || "-"}
                        </p>
                      </div>

                      {ei.qr_link && (
                        <div>
                          <span className="text-muted-foreground text-xs">Enlace QR DIAN</span>
                          <a
                            href={ei.qr_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-600 hover:underline mt-1 break-all"
                          >
                            {ei.qr_link}
                          </a>
                        </div>
                      )}

                      {/* Credit Note Section */}
                      {ei.credit_note && (
                        <div className="border-t pt-3 mt-2">
                          <div className={`${ei.credit_note.type === 'adjustment' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-red-500/10 border-red-500/20'} border rounded-lg p-3`}>
                            <div className="flex items-center gap-2 mb-1">
                              {ei.credit_note.type === 'adjustment' ? (
                                <Minus className="h-4 w-4 text-orange-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`font-semibold text-sm ${ei.credit_note.type === 'adjustment' ? 'text-orange-700' : 'text-red-700'}`}>
                                {ei.credit_note.type === 'adjustment' ? 'NC Ajuste' : 'Nota Crédito'}: {ei.credit_note.number || "-"}
                              </span>
                            </div>
                            <p className={`text-xs ${ei.credit_note.type === 'adjustment' ? 'text-orange-700' : 'text-red-700'}`}>
                              {ei.credit_note.status_message || (ei.credit_note.type === 'adjustment' ? "Nota crédito de ajuste procesada correctamente" : "Nota crédito procesada correctamente")}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                            <div>
                              <span className="text-muted-foreground text-xs">Fecha NC</span>
                              <p className="font-medium">
                                {ei.credit_note.issue_date
                                  ? format(new Date(ei.credit_note.issue_date), "dd/MM/yyyy HH:mm", { locale: es })
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Estado NC</span>
                              <p className="font-medium">{ei.credit_note.status_description || "Procesado"}</p>
                            </div>
                          </div>

                          <div className="mt-2">
                            <span className="text-muted-foreground text-xs">CUFE NC (UUID)</span>
                            <p className="font-mono text-xs break-all mt-1 bg-muted/50 p-2 rounded">
                              {ei.credit_note.uuid || "-"}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Debit Note Section */}
                      {ei.debit_note && (
                        <div className="border-t pt-3 mt-2">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Plus className="h-4 w-4 text-amber-600" />
                              <span className="font-semibold text-sm text-amber-700">
                                Nota Débito: {ei.debit_note.number || "-"}
                              </span>
                            </div>
                            <p className="text-xs text-amber-700">
                              {ei.debit_note.status_message || "Nota débito procesada correctamente"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                            <div>
                              <span className="text-muted-foreground text-xs">Fecha ND</span>
                              <p className="font-medium">
                                {ei.debit_note.issue_date
                                  ? format(new Date(ei.debit_note.issue_date), "dd/MM/yyyy HH:mm", { locale: es })
                                  : "-"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Estado ND</span>
                              <p className="font-medium">{ei.debit_note.status_description || "Procesado"}</p>
                            </div>
                          </div>

                          <div className="mt-2">
                            <span className="text-muted-foreground text-xs">CUFE ND (UUID)</span>
                            <p className="font-mono text-xs break-all mt-1 bg-muted/50 p-2 rounded">
                              {ei.debit_note.uuid || "-"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEIDialog(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Status Detail Dialog */}
      <Dialog open={!!statusDetail && !statusDetail.loading} onOpenChange={(open) => { if (!open) setStatusDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {statusDetail?.title || "Consulta DIAN"}
            </DialogTitle>
            <DialogDescription>Respuesta del servicio SOENAC</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            {statusDetail?.data?.error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-700 text-sm">{statusDetail.data.error}</p>
              </div>
            ) : statusDetail?.type === 'info' && statusDetail?.data?.documents?.[0] ? (() => {
              const doc = statusDetail.data.documents[0];
              return (
                <div className="space-y-4">
                  {/* Estado */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-emerald-700 font-medium text-sm">{statusDetail.data.status_description || "Consulta exitosa"}</p>
                  </div>

                  {/* Documento */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Documento</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                      <div>
                        <span className="text-muted-foreground text-xs">Tipo</span>
                        <p className="font-medium">{doc.document_type_name || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Número</span>
                        <p className="font-medium">{doc.resolution?.prefix}{doc.resolution?.number}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Fecha Emisión</span>
                        <p className="font-medium">{doc.resolution?.issue_date || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">CUFE</span>
                        <p className="font-mono text-xs break-all">{doc.uuid || "-"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Emisor */}
                  {doc.company && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Emisor</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                        <div>
                          <span className="text-muted-foreground text-xs">Nombre</span>
                          <p className="font-medium">{doc.company.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">NIT</span>
                          <p className="font-medium">{doc.company.identification_number}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Receptor */}
                  {doc.customer && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Receptor</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                        <div>
                          <span className="text-muted-foreground text-xs">Nombre</span>
                          <p className="font-medium">{doc.customer.name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">{doc.customer.doc_type || "Documento"}</span>
                          <p className="font-medium">{doc.customer.identification_number}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Totales */}
                  {doc.totals && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Totales</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded-lg p-3">
                        {doc.totals.iva != null && (
                          <div>
                            <span className="text-muted-foreground text-xs">IVA</span>
                            <p className="font-medium">{formatCurrency(doc.totals.iva)}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground text-xs">Total</span>
                          <p className="font-semibold text-base">{formatCurrency(doc.totals.total)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estados */}
                  {doc.states?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Estados</h4>
                      <div className="flex flex-wrap gap-2">
                        {doc.states.map((s: any, i: number) => (
                          <Badge key={i} variant="outline">{s.value}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eventos */}
                  {doc.events?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Eventos</h4>
                      <div className="space-y-1">
                        {doc.events.map((e: any, i: number) => (
                          <div key={i} className="text-sm bg-muted/30 rounded p-2">
                            <span className="font-medium">{e.value || e.name || JSON.stringify(e)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validaciones */}
                  {doc.validations?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Validaciones DIAN</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {doc.validations.map((v: any, i: number) => (
                          <div key={i} className={`text-xs rounded p-2 flex items-start gap-2 ${v["is valid"] ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            {v["is valid"] ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />}
                            <div>
                              <span className={`font-medium ${v["is valid"] ? 'text-emerald-700' : 'text-red-700'}`}>{v.status}</span>
                              <p className="text-muted-foreground">{v.error_message || v.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos referenciados (NC de la FE) */}
                  {doc.document_tags?.length > 0 && doc.document_tags.some((t: any) => t.NombreTipoDocumento) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Documentos Referenciados</h4>
                      {doc.document_tags.filter((t: any) => t.NombreTipoDocumento).map((t: any, i: number) => (
                        <div key={i} className="text-sm bg-muted/30 rounded-lg p-3">
                          <p className="font-medium">{t.NombreTipoDocumento}</p>
                          {t.ConceptoCorreccion?.Descripcion && <p className="text-xs text-muted-foreground">{t.ConceptoCorreccion.Descripcion}</p>}
                          {t.NumeroDocumento?.FechaEmision && <p className="text-xs text-muted-foreground">Fecha: {t.NumeroDocumento.FechaEmision}</p>}
                          {t.UUID && <p className="font-mono text-xs break-all mt-1">CUFE: {t.UUID}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : statusDetail?.type === 'events' ? (() => {
              const events = statusDetail?.data?.events ?? [];
              const desc = statusDetail?.data?.status_description;
              return (
                <div className="space-y-4">
                  {desc && (
                    <div className={`border rounded-lg p-3 ${events.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <p className={`text-sm font-medium ${events.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{desc}</p>
                    </div>
                  )}
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay eventos registrados para este documento</p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <History className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.description || event.name || `Evento ${i + 1}`}</p>
                              {event.effective_date && (
                                <p className="text-xs text-muted-foreground">Fecha: {event.effective_date} {event.effective_time || ''}</p>
                              )}
                            </div>
                          </div>
                          {event.issuer_party && (
                            <div className="grid grid-cols-2 gap-2 text-xs ml-6">
                              <div>
                                <span className="text-muted-foreground">Emisor</span>
                                <p className="font-medium">{event.issuer_party.name}</p>
                              </div>
                              {event.recipient_party && (
                                <div>
                                  <span className="text-muted-foreground">Receptor</span>
                                  <p className="font-medium">{event.recipient_party.name}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {event.document_reference?.uuid && (
                            <p className="font-mono text-xs break-all ml-6 text-muted-foreground">CUFE: {event.document_reference.uuid}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : statusDetail?.type === 'notes' ? (() => {
              const notes = statusDetail?.data?.notes ?? [];
              const desc = statusDetail?.data?.status_description;
              return (
                <div className="space-y-4">
                  {desc && (
                    <div className={`border rounded-lg p-3 ${notes.length > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <p className={`text-sm font-medium ${notes.length > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{desc}</p>
                    </div>
                  )}
                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay notas asociadas a este documento</p>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note: any, i: number) => (
                        <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Receipt className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{note.description || 'Nota'}: {note.document_reference?.number || ''}</p>
                              {note.effective_date && (
                                <p className="text-xs text-muted-foreground">Fecha: {note.effective_date} {note.effective_time || ''}</p>
                              )}
                              {note.line_response?.description && (
                                <p className="text-xs text-muted-foreground">Concepto: {note.line_response.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs ml-6">
                            {note.issuer_party && (
                              <div>
                                <span className="text-muted-foreground">Emisor</span>
                                <p className="font-medium">{note.issuer_party.name}</p>
                                <p className="text-muted-foreground">{note.issuer_party.identification_number}</p>
                              </div>
                            )}
                            {note.recipient_party && (
                              <div>
                                <span className="text-muted-foreground">Receptor</span>
                                <p className="font-medium">{note.recipient_party.name}</p>
                                <p className="text-muted-foreground">{note.recipient_party.identification_number}</p>
                              </div>
                            )}
                          </div>
                          {note.document_reference?.uuid && (
                            <p className="font-mono text-xs break-all ml-6 text-muted-foreground">CUFE: {note.document_reference.uuid}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : (
              <pre className="bg-muted/50 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh]">
                {JSON.stringify(statusDetail?.data, null, 2)}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDetail(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Status Query */}
      {statusDetail?.loading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card rounded-lg p-6 flex items-center gap-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Consultando {statusDetail.title}...</span>
          </div>
        </div>
      )}

      {/* Void Confirmation Dialog */}
      <Dialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Anular Factura Electrónica
            </DialogTitle>
            <DialogDescription>
              Esta acción enviará una nota crédito a la DIAN para anular la factura electrónica. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 my-4">
            <p className="text-sm text-red-700">
              Se generará una nota crédito referenciando la factura <strong>{activeEI?.number}</strong> con el mismo valor total de la factura original.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowVoidConfirm(false)} disabled={voidingInvoice}>
              Cancelar
            </Button>
            <Button
              onClick={handleVoidElectronicInvoice}
              disabled={voidingInvoice}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {voidingInvoice ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit Note Confirm Dialog */}
      <Dialog open={showDebitNoteConfirm} onOpenChange={setShowDebitNoteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Plus className="h-5 w-5" />
              Generar Nota Débito
            </DialogTitle>
            <DialogDescription>
              Se generará una nota débito para la factura <strong>{activeEI?.number}</strong> con los items nuevos o cambios de precio detectados en la venta actual.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-700">
            El sistema comparará automáticamente los items actuales de la venta con los que se facturaron originalmente y generará la nota débito por la diferencia.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDebitNoteConfirm(false)} disabled={creatingDebitNote}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDebitNote}
              disabled={creatingDebitNote}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {creatingDebitNote ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Nota Débito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Note Confirm Dialog */}
      <Dialog open={showCreditNoteConfirm} onOpenChange={setShowCreditNoteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <Minus className="h-5 w-5" />
              Generar Nota Crédito
            </DialogTitle>
            <DialogDescription>
              Se generará una nota crédito para la factura <strong>{activeEI?.number}</strong> por la diferencia entre los items originales y los actuales de la venta.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm text-orange-700">
            El sistema comparará automáticamente los items actuales de la venta con los que se facturaron originalmente y generará la nota crédito por la diferencia (rebaja).
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreditNoteConfirm(false)} disabled={creatingCreditNote}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAdjustmentCreditNote}
              disabled={creatingCreditNote}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {creatingCreditNote ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Nota Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Agregar Abono
            </DialogTitle>
            <DialogDescription>
              Registra un nuevo pago para esta factura. Saldo pendiente: {formatCurrency(Number(sale.balance))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select
                value={paymentForm.payment_method_name}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta Debito">Tarjeta Débito</SelectItem>
                  <SelectItem value="Tarjeta Credito">Tarjeta Crédito</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Nequi">Nequi</SelectItem>
                  <SelectItem value="Daviplata">Daviplata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={paymentForm.amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    setPaymentForm({ ...paymentForm, amount: value });
                  }}
                  className="pl-7"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentForm({ ...paymentForm, amount: String(sale.balance) })}
                >
                  Pagar todo ({formatCurrency(Number(sale.balance))})
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Pago</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-10 w-full sm:w-[180px] justify-start text-left font-normal text-sm", !paymentForm.payment_date && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                    {paymentForm.payment_date ? new Date(paymentForm.payment_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerReport
                    selected={paymentForm.payment_date ? new Date(paymentForm.payment_date + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setPaymentForm({ ...paymentForm, payment_date: `${y}-${m}-${d}` });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Referencia (opcional)</Label>
              <Input
                placeholder="N° de comprobante, etc."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={savingPayment}>
              Cancelar
            </Button>
            <Button onClick={handleAddPayment} disabled={savingPayment || !paymentForm.amount}>
              {savingPayment && <Spinner className="mr-2" size="sm" />}
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
