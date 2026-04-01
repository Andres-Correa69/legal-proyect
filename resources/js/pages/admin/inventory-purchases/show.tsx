import { Head, usePage, router } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Combobox } from "@/components/ui/combobox";
import {
  inventoryPurchasesApi,
  typeDocumentIdentificationsApi,
  cashRegistersApi,
  type InventoryPurchase,
  type TypeDocumentIdentification,
  type CashRegister as CashRegisterType,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import type { User } from "@/types";
import {
  ArrowLeft,
  Package,
  Truck,
  DollarSign,
  Calendar as CalendarIcon,
  User as UserIcon,
  FileCheck,
  ClipboardCheck,
  FileText,
  Download,
  Mail,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Wallet,
  Loader2,
  XCircle,
  Plus,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-muted text-foreground" },
  pending: { label: "Pendiente", color: "bg-yellow-500/15 text-yellow-700" },
  approved: { label: "Aprobada", color: "bg-blue-500/15 text-blue-700" },
  partial: { label: "Parcial", color: "bg-orange-500/15 text-orange-700" },
  received: { label: "Recibida", color: "bg-green-500/15 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-500/15 text-red-700" },
};

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/15 text-amber-700", icon: Clock },
  partial: { label: "Parcial", color: "bg-cyan-500/15 text-cyan-700", icon: AlertCircle },
  paid: { label: "Pagado", color: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle },
};

export default function InventoryPurchaseShow() {
  const { props } = usePage<{ auth: { user: User }; purchaseId: number }>();
  const user = props.auth?.user;
  const purchaseId = props.purchaseId;

  const canSendAcuse = isSuperAdmin(user) || hasPermission("inventory.purchases.view", user);

  const [purchase, setPurchase] = useState<InventoryPurchase | null>(null);
  const [loading, setLoading] = useState(true);

  // Acuse de Recibo state
  const [acuseDialogOpen, setAcuseDialogOpen] = useState(false);
  const [cufeInput, setCufeInput] = useState("");
  const [acuseLoading, setAcuseLoading] = useState(false);
  const [acuseError, setAcuseError] = useState("");

  // Recibo del Bien state
  const [rbDialogOpen, setRbDialogOpen] = useState(false);
  const [rbLoading, setRbLoading] = useState(false);
  const [rbError, setRbError] = useState("");
  const [docTypes, setDocTypes] = useState<TypeDocumentIdentification[]>([]);
  const [rbForm, setRbForm] = useState({
    type_document_identification_id: "",
    identification_number: "",
    first_name: "",
    family_name: "",
    job_title: "",
  });

  // Aceptación Expresa state
  const [eaDialogOpen, setEaDialogOpen] = useState(false);
  const [eaLoading, setEaLoading] = useState(false);
  const [eaError, setEaError] = useState("");
  const [eaForm, setEaForm] = useState({
    type_document_identification_id: "",
    identification_number: "",
    first_name: "",
    family_name: "",
    job_title: "",
  });

  // Document Support state
  const [dsLoading, setDsLoading] = useState(false);
  const [dsVoidLoading, setDsVoidLoading] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegisterType[]>([]);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cash_register_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadPurchase();
    loadDocTypes();
    loadPaymentData();
  }, [purchaseId]);

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const data = await inventoryPurchasesApi.getById(purchaseId);
      setPurchase(data);
    } catch (error) {
      console.error("Error loading purchase:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocTypes = async () => {
    try {
      const data = await typeDocumentIdentificationsApi.getAll();
      setDocTypes(data);
    } catch (error) {
      console.error("Error loading doc types:", error);
    }
  };

  const loadPaymentData = async () => {
    try {
      const crData = await cashRegistersApi.getAll();
      setCashRegisters(crData);
    } catch (error) {
      console.error("Error loading payment data:", error);
    }
  };

  // Payment handlers
  const handleAddPayment = async () => {
    if (!purchase || !paymentForm.amount || !paymentForm.cash_register_id) return;
    setSavingPayment(true);
    try {
      const result = await inventoryPurchasesApi.addPayment(purchase.id, {
        cash_register_id: parseInt(paymentForm.cash_register_id),
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      });
      setPurchase(result.purchase);
      setPaymentDialogOpen(false);
      setPaymentForm({
        cash_register_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        reference: "",
        notes: "",
      });
      const updatedCR = await cashRegistersApi.getAll();
      setCashRegisters(updatedCR);
    } catch (error: any) {
      alert(error?.message || "Error al registrar el pago");
    } finally {
      setSavingPayment(false);
    }
  };

  // Acuse handlers
  const openAcuseDialog = () => {
    setCufeInput("");
    setAcuseError("");
    setAcuseDialogOpen(true);
  };

  const handleSendAcuse = async () => {
    if (!purchase) return;
    if (!cufeInput.trim()) { setAcuseError("Debe ingresar el CUFE"); return; }
    setAcuseLoading(true);
    setAcuseError("");
    try {
      const result = await inventoryPurchasesApi.sendReceiptAcknowledgment(purchase.id, cufeInput.trim());
      if (result.success) {
        setPurchase((prev) => prev ? { ...prev, receipt_acknowledgment: result.receipt_acknowledgment ?? null } : prev);
        setAcuseDialogOpen(false);
        setCufeInput("");
      } else {
        setAcuseError(result.message || "Error al enviar el acuse de recibo");
      }
    } catch (err: any) {
      setAcuseError(err.message || "Error al enviar el acuse de recibo");
    } finally {
      setAcuseLoading(false);
    }
  };

  // Load saved person data for auto-fill
  const loadSavedPerson = async () => {
    try {
      const result = await inventoryPurchasesApi.getSavedPerson();
      if (result.success && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error("Error loading saved person:", err);
    }
    return null;
  };

  // Recibo del Bien handlers
  const openRbDialog = async () => {
    setRbError("");
    setRbForm({ type_document_identification_id: "", identification_number: "", first_name: "", family_name: "", job_title: "" });
    setRbDialogOpen(true);
    const saved = await loadSavedPerson();
    if (saved) {
      setRbForm({
        type_document_identification_id: saved.type_document_identification_id?.toString() || "",
        identification_number: saved.identification_number || "",
        first_name: saved.first_name || "",
        family_name: saved.family_name || "",
        job_title: saved.job_title || "",
      });
    }
  };

  const handleSendRb = async () => {
    if (!purchase) return;
    if (!rbForm.type_document_identification_id || !rbForm.identification_number || !rbForm.first_name || !rbForm.family_name || !rbForm.job_title) {
      setRbError("Todos los campos son obligatorios");
      return;
    }
    setRbLoading(true);
    setRbError("");
    try {
      const result = await inventoryPurchasesApi.sendGoodsReceipt(purchase.id, {
        type_document_identification_id: parseInt(rbForm.type_document_identification_id),
        identification_number: rbForm.identification_number,
        first_name: rbForm.first_name,
        family_name: rbForm.family_name,
        job_title: rbForm.job_title,
      });
      if (result.success) {
        setPurchase((prev) => prev ? { ...prev, goods_receipt: result.goods_receipt ?? null } : prev);
        setRbDialogOpen(false);
      } else {
        setRbError(result.message || "Error al enviar recibo del bien");
      }
    } catch (err: any) {
      setRbError(err.message || "Error al enviar recibo del bien");
    } finally {
      setRbLoading(false);
    }
  };

  // Aceptación Expresa handlers
  const openEaDialog = async () => {
    setEaError("");
    setEaForm({ type_document_identification_id: "", identification_number: "", first_name: "", family_name: "", job_title: "" });
    setEaDialogOpen(true);
    const saved = await loadSavedPerson();
    if (saved) {
      setEaForm({
        type_document_identification_id: saved.type_document_identification_id?.toString() || "",
        identification_number: saved.identification_number || "",
        first_name: saved.first_name || "",
        family_name: saved.family_name || "",
        job_title: saved.job_title || "",
      });
    }
  };

  const handleSendEa = async () => {
    if (!purchase) return;
    if (!eaForm.type_document_identification_id || !eaForm.identification_number || !eaForm.first_name || !eaForm.family_name || !eaForm.job_title) {
      setEaError("Todos los campos son obligatorios");
      return;
    }
    setEaLoading(true);
    setEaError("");
    try {
      const result = await inventoryPurchasesApi.sendExpressAcceptance(purchase.id, {
        type_document_identification_id: parseInt(eaForm.type_document_identification_id),
        identification_number: eaForm.identification_number,
        first_name: eaForm.first_name,
        family_name: eaForm.family_name,
        job_title: eaForm.job_title,
      });
      if (result.success) {
        setPurchase((prev) => prev ? { ...prev, express_acceptance: result.express_acceptance ?? null } : prev);
        setEaDialogOpen(false);
      } else {
        setEaError(result.message || "Error al enviar aceptación expresa");
      }
    } catch (err: any) {
      setEaError(err.message || "Error al enviar aceptación expresa");
    } finally {
      setEaLoading(false);
    }
  };

  const handleSendEaEmail = async () => {
    if (!purchase?.express_acceptance) return;
    try {
      const result = await inventoryPurchasesApi.sendExpressAcceptanceEmail(purchase.express_acceptance.id);
      const emailStatus = result.success ? 'sent' : 'pending';
      setPurchase(prev => prev ? { ...prev, express_acceptance: prev.express_acceptance ? { ...prev.express_acceptance, email_status: emailStatus as any } : prev.express_acceptance } : prev);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch (err: any) {
      alert(err.message || "Error al enviar correo");
    }
  };

  // Document Support handlers
  const handleSendDocumentSupport = async () => {
    if (!purchase) return;
    if (!confirm("¿Enviar Documento Soporte a la DIAN para esta compra?")) return;
    setDsLoading(true);
    try {
      const result = await inventoryPurchasesApi.sendDocumentSupport(purchase.id);
      if (result.success) {
        alert(result.message || "Documento Soporte enviado correctamente");
        setPurchase((prev) => prev ? { ...prev, document_support: result.document_support ?? null } : prev);
      } else {
        alert(result.message || "Error al enviar documento soporte");
      }
    } catch (err: any) {
      alert(err.message || "Error al enviar documento soporte");
    } finally {
      setDsLoading(false);
    }
  };

  const handleVoidDocumentSupport = async () => {
    if (!purchase?.document_support) return;
    if (!confirm("¿Anular Documento Soporte? Se enviará una Nota Crédito a la DIAN.")) return;
    setDsVoidLoading(true);
    try {
      const result = await inventoryPurchasesApi.voidDocumentSupport(purchase.document_support.id);
      if (result.success) {
        alert(result.message || "Documento Soporte anulado correctamente");
        setPurchase((prev) => prev ? { ...prev, document_support: result.document_support ?? prev.document_support } : prev);
      } else {
        alert(result.message || "Error al anular documento soporte");
      }
    } catch (err: any) {
      alert(err.message || "Error al anular documento soporte");
    } finally {
      setDsVoidLoading(false);
    }
  };

  const handleSendAcuseEmail = async () => {
    if (!purchase?.receipt_acknowledgment) return;
    try {
      const result = await inventoryPurchasesApi.sendReceiptAcknowledgmentEmail(purchase.id);
      const emailStatus = result.success ? 'sent' : 'pending';
      setPurchase(prev => prev ? { ...prev, receipt_acknowledgment: prev.receipt_acknowledgment ? { ...prev.receipt_acknowledgment, email_status: emailStatus as any } : prev.receipt_acknowledgment } : prev);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const handleSendRbEmail = async () => {
    if (!purchase?.goods_receipt) return;
    try {
      const result = await inventoryPurchasesApi.sendGoodsReceiptEmail(purchase.id);
      const emailStatus = result.success ? 'sent' : 'pending';
      setPurchase(prev => prev ? { ...prev, goods_receipt: prev.goods_receipt ? { ...prev.goods_receipt, email_status: emailStatus as any } : prev.goods_receipt } : prev);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const handleSendDsEmail = async () => {
    if (!purchase?.document_support) return;
    try {
      const result = await inventoryPurchasesApi.sendDocumentSupportEmail(purchase.id);
      const emailStatus = result.success ? 'sent' : 'pending';
      setPurchase(prev => prev ? { ...prev, document_support: prev.document_support ? { ...prev.document_support, email_status: emailStatus as any } : prev.document_support } : prev);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AppLayout title="Detalle de Compra">
        <Head title="Detalle de Compra" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppLayout>
    );
  }

  if (!purchase) {
    return (
      <AppLayout title="Compra no encontrada">
        <Head title="Compra no encontrada" />
        <div className="text-center py-24">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium">Compra no encontrada</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.visit("/admin/inventory-purchases")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Compras
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[purchase.status] || statusConfig.draft;
  const paymentStatus = paymentStatusConfig[purchase.payment_status] || paymentStatusConfig.pending;
  const PaymentIcon = paymentStatus.icon;
  const balanceDue = Number(purchase.balance_due || 0);
  const totalPaid = Number(purchase.total_paid || 0);

  return (
    <AppLayout title={`Compra ${purchase.purchase_number}`}>
      <Head title={`Compra ${purchase.purchase_number}`} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.visit("/admin/inventory-purchases")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight font-mono">
                {purchase.purchase_number}
              </h2>
              <p className="text-muted-foreground">
                Creada el {formatDate(purchase.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${status.color} text-sm px-3 py-1`}>
              {status.label}
            </Badge>
            <Badge className={`${paymentStatus.color} text-sm px-3 py-1`}>
              <PaymentIcon className="h-3.5 w-3.5 mr-1" />
              {paymentStatus.label}
            </Badge>
            {purchase.is_credit && (
              <Badge className="bg-amber-500/15 text-amber-700 text-sm px-3 py-1">
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Crédito
              </Badge>
            )}

            {/* Action Buttons */}
            {purchase.payment_status !== "paid" && ["approved", "partial", "received"].includes(purchase.status) && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setPaymentDialogOpen(true)}>
                <Wallet className="h-4 w-4 mr-1" />
                Abonar Pago
              </Button>
            )}
            {canSendAcuse && purchase.status === "received" && !purchase.receipt_acknowledgment && (
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={openAcuseDialog}>
                <FileCheck className="h-4 w-4 mr-1" />
                Acuse de Recibo
              </Button>
            )}
            {canSendAcuse && purchase.receipt_acknowledgment && !purchase.goods_receipt && (
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={openRbDialog}>
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Recibo del Bien
              </Button>
            )}
            {canSendAcuse && purchase.receipt_acknowledgment && purchase.goods_receipt && !purchase.express_acceptance && (
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openEaDialog}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Aceptación Expresa
              </Button>
            )}
            {canSendAcuse && purchase.status === "received" && !purchase.document_support && (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={handleSendDocumentSupport} disabled={dsLoading}>
                {dsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                Doc. Soporte
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Total Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(purchase.total_amount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Total Pagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Saldo Pendiente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(balanceDue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{purchase.items?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos de la Compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Recibido</TableHead>
                        <TableHead className="text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">IVA</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchase.items?.map((item) => {
                        const pending = item.quantity_ordered - item.quantity_received;
                        const itemSubtotal = item.quantity_ordered * item.unit_cost;
                        const taxAmount = item.tax_amount ?? (itemSubtotal * ((item.tax_rate ?? 0) / 100));
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product?.name || `Producto #${item.product_id}`}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {item.product?.sku || "-"}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                            <TableCell className="text-right">
                              <span className={pending > 0 ? "text-amber-600 font-medium" : "text-green-600 font-medium"}>
                                {item.quantity_received}
                              </span>
                              {pending > 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({pending} pend.)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                            <TableCell className="text-right">
                              {(item.tax_rate ?? 0) > 0 ? (
                                <span className="text-xs">{item.tax_rate}% ({formatCurrency(taxAmount)})</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Excento</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(itemSubtotal + taxAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter>
                      {purchase.tax_amount > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={6} className="text-right text-muted-foreground">Subtotal</TableCell>
                            <TableCell className="text-right">{formatCurrency(purchase.subtotal)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={6} className="text-right text-muted-foreground">IVA</TableCell>
                            <TableCell className="text-right">{formatCurrency(purchase.tax_amount)}</TableCell>
                          </TableRow>
                        </>
                      )}
                      <TableRow className="font-bold">
                        <TableCell colSpan={6}>Total</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(purchase.total_amount)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Payments History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Historial de Pagos
                  </CardTitle>
                  <Badge className={`${paymentStatus.color} text-xs px-2 py-0.5`}>
                    {purchase.payment_status === "paid" ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Pagado</>
                    ) : (
                      `Saldo: ${formatCurrency(balanceDue)}`
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {purchase.payments && purchase.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Metodo</TableHead>
                          <TableHead>Caja/Banco</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchase.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.paid_at || payment.created_at)}</TableCell>
                            <TableCell>{payment.payment_method?.name || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{payment.cash_register?.name || "-"}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="font-bold">
                          <TableCell colSpan={3}>Total Pagado</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalPaid)}</TableCell>
                        </TableRow>
                        {balanceDue > 0 && (
                          <TableRow className="text-amber-700">
                            <TableCell colSpan={3} className="font-semibold">Saldo Pendiente</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(balanceDue)}</TableCell>
                          </TableRow>
                        )}
                      </TableFooter>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Wallet className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">No hay pagos registrados</p>
                    {purchase.payment_status !== "paid" && ["approved", "partial", "received"].includes(purchase.status) && (
                      <Button variant="outline" size="sm" className="mt-4" onClick={() => setPaymentDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Registrar primer pago
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Electronic Documents */}
            {(purchase.receipt_acknowledgment || purchase.goods_receipt || purchase.express_acceptance || purchase.document_support) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos Electrónicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {purchase.receipt_acknowledgment && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">Acuse de Recibo (Evento 030)</p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.receipt_acknowledgment.number || "Sin número"} - {formatDate(purchase.receipt_acknowledgment.issue_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF"
                          onClick={() => window.open(inventoryPurchasesApi.getReceiptAcknowledgmentPdfUrl(purchase.receipt_acknowledgment!.id), "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Enviar por correo"
                          onClick={handleSendAcuseEmail}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {purchase.goods_receipt && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                      <div className="flex items-center gap-3">
                        <ClipboardCheck className="h-5 w-5 text-teal-600" />
                        <div>
                          <p className="font-medium text-sm">Recibo del Bien (Evento 032)</p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.goods_receipt.number || "Sin número"} - {formatDate(purchase.goods_receipt.issue_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF"
                          onClick={() => window.open(inventoryPurchasesApi.getGoodsReceiptPdfUrl(purchase.goods_receipt!.id), "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Enviar por correo"
                          onClick={handleSendRbEmail}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {purchase.express_acceptance && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="font-medium text-sm">Aceptación Expresa (Evento 033)</p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.express_acceptance.number || "Sin número"} - {formatDate(purchase.express_acceptance.issue_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF"
                          onClick={() => window.open(inventoryPurchasesApi.getExpressAcceptancePdfUrl(purchase.express_acceptance!.id), "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Enviar por correo"
                          onClick={handleSendEaEmail}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {purchase.document_support && (
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${purchase.document_support.voided ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                      <div className="flex items-center gap-3">
                        <FileText className={`h-5 w-5 ${purchase.document_support.voided ? "text-red-600" : "text-amber-600"}`} />
                        <div>
                          <p className="font-medium text-sm">
                            Documento Soporte {purchase.document_support.voided && "(Anulado)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {purchase.document_support.number || "Sin número"} - {formatDate(purchase.document_support.expedition_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar PDF"
                          onClick={() => window.open(inventoryPurchasesApi.getDocumentSupportPdfUrl(purchase.document_support!.id), "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Enviar por correo"
                          onClick={handleSendDsEmail}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {!purchase.document_support.voided && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Anular documento"
                            className="text-destructive hover:text-destructive"
                            onClick={handleVoidDocumentSupport}
                            disabled={dsVoidLoading}
                          >
                            {dsVoidLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">{purchase.supplier?.name || "-"}</p>
                {purchase.supplier?.email && (
                  <p className="text-sm text-muted-foreground">{purchase.supplier.email}</p>
                )}
                {purchase.supplier?.phone && (
                  <p className="text-sm text-muted-foreground">{purchase.supplier.phone}</p>
                )}
              </CardContent>
            </Card>

            {/* Warehouse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Bodega Destino
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{purchase.warehouse?.name || "-"}</p>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{purchase.is_credit ? "Crédito" : "Contado"}</span>
                </div>
                {purchase.is_credit && purchase.credit_due_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha vencimiento:</span>
                    <span className="font-medium">{formatDate(purchase.credit_due_date)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">{formatCurrency(purchase.total_amount)}</span>
                </div>
                {purchase.retentions && purchase.retentions.length > 0 && (
                  <>
                    {purchase.retentions.map((r: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.name} ({r.percentage}%):</span>
                        <span className="font-medium text-red-600">-{formatCurrency(r.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Neto:</span>
                      <span className="font-medium">{formatCurrency(purchase.total_amount - purchase.retention_amount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagado:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pendiente:</span>
                  <span className={`font-medium ${balanceDue > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Fechas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creada:</span>
                  <span>{formatDateTime(purchase.created_at)}</span>
                </div>
                {purchase.expected_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha esperada:</span>
                    <span>{formatDate(purchase.expected_date)}</span>
                  </div>
                )}
                {purchase.received_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recibida:</span>
                    <span>{formatDateTime(purchase.received_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Responsables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchase.created_by && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Creada por:</span>
                    <span>{purchase.created_by.name}</span>
                  </div>
                )}
                {purchase.approved_by && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aprobada por:</span>
                    <span>{purchase.approved_by.name}</span>
                  </div>
                )}
                {purchase.received_by && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recibida por:</span>
                    <span>{purchase.received_by.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {purchase.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{purchase.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Acuse de Recibo Dialog */}
      <Dialog open={acuseDialogOpen} onOpenChange={setAcuseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Acuse de Recibo DIAN</DialogTitle>
            <DialogDescription>
              Enviar acuse de recibo (evento 030) a la DIAN para la compra{" "}
              <span className="font-medium">{purchase.purchase_number}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                <span className="font-medium">{purchase.supplier?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">{formatCurrency(purchase.total_amount)}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="cufe" className="mb-2 block">CUFE de la Factura del Proveedor *</Label>
              <Input
                id="cufe"
                placeholder="Ingrese el CUFE de la factura electrónica"
                value={cufeInput}
                onChange={(e) => { setCufeInput(e.target.value); if (acuseError) setAcuseError(""); }}
                disabled={acuseLoading}
              />
              {acuseError && <p className="text-sm text-destructive mt-1">{acuseError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setAcuseDialogOpen(false); setCufeInput(""); setAcuseError(""); }} disabled={acuseLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSendAcuse} disabled={acuseLoading || !cufeInput.trim()} className="bg-purple-600 hover:bg-purple-700">
                {acuseLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                Enviar Acuse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recibo del Bien Dialog */}
      <Dialog open={rbDialogOpen} onOpenChange={setRbDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Recibo del Bien y/o Prestación del Servicio</DialogTitle>
            <DialogDescription>
              Enviar recibo del bien (evento 032) a la DIAN para la compra{" "}
              <span className="font-medium">{purchase.purchase_number}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                <span className="font-medium">{purchase.supplier?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">{formatCurrency(purchase.total_amount)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Ingrese los datos de la persona que recibe los bienes o servicios:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rb_doc_type" className="mb-2 block">Tipo Documento *</Label>
                <Combobox
                  value={rbForm.type_document_identification_id}
                  onValueChange={(value) => setRbForm({ ...rbForm, type_document_identification_id: value })}
                  disabled={rbLoading}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar tipo..."
                  emptyText="No encontrado"
                  options={docTypes.map((dt) => ({ value: dt.id.toString(), label: dt.name }))}
                />
              </div>
              <div>
                <Label htmlFor="rb_id_number" className="mb-2 block">Número Documento *</Label>
                <Input id="rb_id_number" placeholder="Número de identificación" value={rbForm.identification_number} onChange={(e) => setRbForm({ ...rbForm, identification_number: e.target.value })} disabled={rbLoading} />
              </div>
              <div>
                <Label htmlFor="rb_first_name" className="mb-2 block">Nombres *</Label>
                <Input id="rb_first_name" placeholder="Nombres" value={rbForm.first_name} onChange={(e) => setRbForm({ ...rbForm, first_name: e.target.value })} disabled={rbLoading} />
              </div>
              <div>
                <Label htmlFor="rb_family_name" className="mb-2 block">Apellidos *</Label>
                <Input id="rb_family_name" placeholder="Apellidos" value={rbForm.family_name} onChange={(e) => setRbForm({ ...rbForm, family_name: e.target.value })} disabled={rbLoading} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="rb_job_title" className="mb-2 block">Cargo *</Label>
                <Input id="rb_job_title" placeholder="Ej: Gerente, Administrador, Contador" value={rbForm.job_title} onChange={(e) => setRbForm({ ...rbForm, job_title: e.target.value })} disabled={rbLoading} />
              </div>
            </div>
            {rbError && <p className="text-sm text-destructive">{rbError}</p>}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setRbDialogOpen(false); setRbError(""); }} disabled={rbLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendRb}
                disabled={rbLoading || !rbForm.type_document_identification_id || !rbForm.identification_number || !rbForm.first_name || !rbForm.family_name || !rbForm.job_title}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {rbLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                Enviar Recibo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Aceptación Expresa Dialog */}
      <Dialog open={eaDialogOpen} onOpenChange={setEaDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Aceptación Expresa</DialogTitle>
            <DialogDescription>
              Enviar aceptación expresa (evento 033) a la DIAN para la compra{" "}
              <span className="font-medium">{purchase.purchase_number}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Proveedor:</span>{" "}
                <span className="font-medium">{purchase.supplier?.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>{" "}
                <span className="font-medium">{formatCurrency(purchase.total_amount)}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Ingrese los datos de la persona que acepta:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ea_doc_type" className="mb-2 block">Tipo Documento *</Label>
                <Combobox
                  value={eaForm.type_document_identification_id}
                  onValueChange={(value) => setEaForm({ ...eaForm, type_document_identification_id: value })}
                  disabled={eaLoading}
                  placeholder="Seleccionar..."
                  searchPlaceholder="Buscar tipo..."
                  emptyText="No encontrado"
                  options={docTypes.map((dt) => ({ value: dt.id.toString(), label: dt.name }))}
                />
              </div>
              <div>
                <Label htmlFor="ea_id_number" className="mb-2 block">Número Documento *</Label>
                <Input id="ea_id_number" placeholder="Número de identificación" value={eaForm.identification_number} onChange={(e) => setEaForm({ ...eaForm, identification_number: e.target.value })} disabled={eaLoading} />
              </div>
              <div>
                <Label htmlFor="ea_first_name" className="mb-2 block">Nombres *</Label>
                <Input id="ea_first_name" placeholder="Nombres" value={eaForm.first_name} onChange={(e) => setEaForm({ ...eaForm, first_name: e.target.value })} disabled={eaLoading} />
              </div>
              <div>
                <Label htmlFor="ea_family_name" className="mb-2 block">Apellidos *</Label>
                <Input id="ea_family_name" placeholder="Apellidos" value={eaForm.family_name} onChange={(e) => setEaForm({ ...eaForm, family_name: e.target.value })} disabled={eaLoading} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="ea_job_title" className="mb-2 block">Cargo *</Label>
                <Input id="ea_job_title" placeholder="Ej: Gerente, Administrador, Contador" value={eaForm.job_title} onChange={(e) => setEaForm({ ...eaForm, job_title: e.target.value })} disabled={eaLoading} />
              </div>
            </div>
            {eaError && <p className="text-sm text-destructive">{eaError}</p>}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setEaDialogOpen(false); setEaError(""); }} disabled={eaLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendEa}
                disabled={eaLoading || !eaForm.type_document_identification_id || !eaForm.identification_number || !eaForm.first_name || !eaForm.family_name || !eaForm.job_title}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {eaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Enviar Aceptación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15">
                <Wallet className="h-4.5 w-4.5 text-green-600" />
              </div>
              Abonar Pago
            </DialogTitle>
            <DialogDescription>
              Registra un pago para la compra {purchase.purchase_number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Purchase Summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Compra</p>
                  <p className="text-lg font-bold mt-0.5">{formatCurrency(purchase.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo Pendiente</p>
                  <p className="text-lg font-bold mt-0.5 text-amber-600">
                    {formatCurrency(purchase.balance_due ?? purchase.total_amount - (purchase.total_paid ?? 0))}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Form - 2 columns */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Datos del Pago
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cash Register */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Caja o Banco *</Label>
                  <Combobox
                    value={paymentForm.cash_register_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, cash_register_id: value })}
                    disabled={savingPayment}
                    placeholder="Seleccionar caja o banco..."
                    searchPlaceholder="Buscar caja..."
                    emptyText="No hay cajas disponibles"
                    options={cashRegisters
                      .filter((cr) => cr.is_active)
                      .map((cr) => ({
                        value: cr.id.toString(),
                        label: `${cr.name} (${cr.type === "bank" ? "Banco" : cr.type === "minor" ? "Caja Menor" : "Caja Mayor"}) - ${formatCurrency(cr.current_balance)}`,
                      }))}
                  />
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Monto a pagar *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => {
                        const bal = purchase.balance_due ?? purchase.total_amount - (purchase.total_paid ?? 0);
                        setPaymentForm({ ...paymentForm, amount: String(Math.round(bal)) });
                      }}
                    >
                      Pagar todo
                    </Button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={paymentForm.amount ? Number(paymentForm.amount).toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        setPaymentForm({ ...paymentForm, amount: value ? String(parseInt(value)) : "" });
                      }}
                      className="pl-7 text-lg font-semibold h-11"
                      disabled={savingPayment}
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Fecha de Pago</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !paymentForm.payment_date && "text-muted-foreground")}>
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

                {/* Reference */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Referencia (opcional)</Label>
                  <Input
                    placeholder="N° de comprobante, transferencia, etc."
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    disabled={savingPayment}
                  />
                </div>

                {/* Notes - full width */}
                <div className="col-span-2">
                  <Label className="text-sm font-medium mb-3 block">Notas (opcional)</Label>
                  <Input
                    placeholder="Observaciones del pago"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    disabled={savingPayment}
                  />
                </div>
              </div>

              {/* Partial payment warning */}
              {paymentForm.amount && (() => {
                const bal = purchase.balance_due ?? purchase.total_amount - (purchase.total_paid ?? 0);
                return parseFloat(paymentForm.amount) < bal && parseFloat(paymentForm.amount) > 0;
              })() && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-amber-700">Pago parcial</p>
                    <p className="text-amber-600 mt-0.5">
                      Quedarán {formatCurrency((purchase.balance_due ?? purchase.total_amount - (purchase.total_paid ?? 0)) - parseFloat(paymentForm.amount))} pendientes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={savingPayment}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddPayment}
                disabled={savingPayment || !paymentForm.cash_register_id || !paymentForm.amount}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                Registrar Pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
