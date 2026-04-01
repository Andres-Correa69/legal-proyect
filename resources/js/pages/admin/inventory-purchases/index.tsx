import { Head, usePage, router } from "@inertiajs/react";
import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PurchasesCalendar } from "@/components/purchases/purchases-calendar";
import {
  Plus,
  ShoppingCart,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  PackageCheck,
  FileCheck,
  FileText,
  Download,
  Loader2,
  Mail,
  ClipboardCheck,
  FileUp,
  Wallet,
  Search,
  Calendar as CalendarIcon,
  CreditCard,
  AlertTriangle,
  Building2,
  MoreVertical,
} from "lucide-react";
import {
  inventoryPurchasesApi,
  suppliersApi,
  warehousesApi,
  productsApi,
  cashRegistersApi,
  type InventoryPurchase,
  type InventoryPurchaseItem,
  type InventoryPurchaseStatus,
  type ReceiveItemData,
  type Supplier,
  type Warehouse as WarehouseType,
  type Product,
  type CashRegister as CashRegisterType,
  typeDocumentIdentificationsApi,
  type TypeDocumentIdentification,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import type { User } from "@/types";

const statusLabels: Record<InventoryPurchaseStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobada",
  partial: "Parcial",
  received: "Recibida",
  cancelled: "Cancelada",
};

const statusColors: Record<InventoryPurchaseStatus, string> = {
  draft: "bg-muted text-foreground",
  pending: "bg-yellow-500/15 text-yellow-700",
  approved: "bg-blue-500/15 text-blue-700",
  partial: "bg-orange-500/15 text-orange-700",
  received: "bg-green-500/15 text-green-700",
  cancelled: "bg-red-500/15 text-red-700",
};

const paymentColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  partial: "bg-cyan-500/15 text-cyan-700",
  paid: "bg-emerald-500/15 text-emerald-700",
};

const paymentLabels: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagado",
};

type TabValue = "todas" | "sin_aprobar" | "sin_recibir" | "con_acuse" | "con_recibo" | "calendario";

export default function InventoryPurchasesIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const canManage = isSuperAdmin(user) || hasPermission("inventory.purchases.manage", user);
  const canApprove = isSuperAdmin(user) || hasPermission("inventory.purchases.approve", user);
  const canReceive = isSuperAdmin(user) || hasPermission("inventory.purchases.receive", user);
  const canSendAcuse = isSuperAdmin(user) || hasPermission("inventory.purchases.view", user);

  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegisterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<InventoryPurchase | null>(null);
  const [receiveItems, setReceiveItems] = useState<{ id: number; quantity_received: number; max_quantity: number; product_name: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Acuse de Recibo state
  const [acuseDialogOpen, setAcuseDialogOpen] = useState(false);
  const [acusePurchase, setAcusePurchase] = useState<InventoryPurchase | null>(null);
  const [cufeInput, setCufeInput] = useState("");
  const [acuseLoading, setAcuseLoading] = useState(false);
  const [acuseError, setAcuseError] = useState("");

  // Recibo del Bien state
  const [rbDialogOpen, setRbDialogOpen] = useState(false);
  const [rbPurchase, setRbPurchase] = useState<InventoryPurchase | null>(null);
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

  // Approve dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approvePurchase, setApprovePurchase] = useState<InventoryPurchase | null>(null);
  const [approveForm, setApproveForm] = useState({ cash_register_id: "", amount: "" });
  const [approveLoading, setApproveLoading] = useState(false);

  // Document Support state
  const [dsLoading, setDsLoading] = useState<number | null>(null);
  const [dsVoidLoading, setDsVoidLoading] = useState<number | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "destructive" | "default";
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", variant: "default", onConfirm: () => {} });

  const companyFilter = useSuperAdminCompanyFilter();

  useEffect(() => {
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesData, suppliersData, warehousesData, productsData, docTypesData, cashRegistersData] = await Promise.all([
        inventoryPurchasesApi.getAll({ company_id: companyFilter.companyIdParam }),
        suppliersApi.getAll({ company_id: companyFilter.companyIdParam }),
        warehousesApi.getAll({ company_id: companyFilter.companyIdParam }),
        productsApi.getAll({ company_id: companyFilter.companyIdParam }),
        typeDocumentIdentificationsApi.getAll(),
        cashRegistersApi.getAll({ company_id: companyFilter.companyIdParam }),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setDocTypes(docTypesData);
      setCashRegisters(cashRegistersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const toStr = today.toISOString().split('T')[0];
    let fromStr = '';
    switch (preset) {
      case '7d': { const d = new Date(today); d.setDate(d.getDate() - 7); fromStr = d.toISOString().split('T')[0]; break; }
      case '15d': { const d = new Date(today); d.setDate(d.getDate() - 15); fromStr = d.toISOString().split('T')[0]; break; }
      case '1m': { const d = new Date(today); d.setMonth(d.getMonth() - 1); fromStr = d.toISOString().split('T')[0]; break; }
      case '2m': { const d = new Date(today); d.setMonth(d.getMonth() - 2); fromStr = d.toISOString().split('T')[0]; break; }
      case 'custom': return;
      default: setDateFrom(''); setDateTo(''); return;
    }
    setDateFrom(fromStr);
    setDateTo(toStr);
  };

  // Filter logic
  const filteredPurchases = useMemo(() => {
    let filtered = purchases;

    switch (activeTab) {
      case "sin_aprobar":
        filtered = filtered.filter((p) => p.status === "draft");
        break;
      case "sin_recibir":
        filtered = filtered.filter((p) => p.status === "approved" || p.status === "partial");
        break;
      case "con_acuse":
        filtered = filtered.filter((p) => p.receipt_acknowledgment);
        break;
      case "con_recibo":
        filtered = filtered.filter((p) => p.goods_receipt);
        break;
      case "calendario":
        return filtered;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.purchase_number?.toLowerCase().includes(q) ||
          p.supplier?.name?.toLowerCase().includes(q) ||
          p.warehouse?.name?.toLowerCase().includes(q)
      );
    }

    if (filterSupplier !== "all") {
      filtered = filtered.filter((p) => p.supplier_id?.toString() === filterSupplier);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }

    if (filterPayment !== "all") {
      filtered = filtered.filter((p) => p.payment_status === filterPayment);
    }

    if (dateFrom) {
      filtered = filtered.filter((p) => p.created_at && p.created_at >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((p) => p.created_at && p.created_at <= dateTo + 'T23:59:59');
    }

    return filtered;
  }, [purchases, activeTab, searchQuery, filterSupplier, filterStatus, filterPayment, dateFrom, dateTo]);

  // Stats
  const tabCounts = useMemo(() => ({
    todas: purchases.length,
    sin_aprobar: purchases.filter((p) => p.status === "draft").length,
    sin_recibir: purchases.filter((p) => p.status === "approved" || p.status === "partial").length,
    con_acuse: purchases.filter((p) => p.receipt_acknowledgment).length,
    con_recibo: purchases.filter((p) => p.goods_receipt).length,
  }), [purchases]);

  const openApproveDialog = (purchase: InventoryPurchase) => {
    setApprovePurchase(purchase);
    setApproveForm({ cash_register_id: "", amount: String(purchase.total_amount) });
    setApproveDialogOpen(true);
  };

  const handleApproveSubmit = async () => {
    if (!approvePurchase || !approveForm.cash_register_id || !approveForm.amount) return;
    setApproveLoading(true);
    try {
      const amount = parseFloat(approveForm.amount);
      const payload: { cash_register_id: number; amount?: number } = {
        cash_register_id: parseInt(approveForm.cash_register_id),
      };
      // Solo enviar amount si es diferente al total (pago parcial)
      if (amount < approvePurchase.total_amount) {
        payload.amount = amount;
      }
      const updated = await inventoryPurchasesApi.approve(approvePurchase.id, payload);
      setPurchases((prev) => prev.map((p) => (p.id === approvePurchase.id ? updated : p)));
      const updatedCR = await cashRegistersApi.getAll();
      setCashRegisters(updatedCR);
      setApproveDialogOpen(false);
      setApprovePurchase(null);
    } catch (error: any) {
      console.error("Error approving purchase:", error);
      alert(error?.message || "Error al aprobar la compra");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleCancel = (purchase: InventoryPurchase) => {
    setConfirmDialog({
      open: true,
      title: "Cancelar Orden de Compra",
      description: `¿Está seguro de cancelar la orden ${purchase.purchase_number}? Esta acción no se puede deshacer.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          const updated = await inventoryPurchasesApi.cancel(purchase.id);
          setPurchases((prev) => prev.map((p) => (p.id === purchase.id ? updated : p)));
        } catch (error) {
          console.error("Error cancelling purchase:", error);
          alert("Error al cancelar la compra");
        }
      },
    });
  };

  const openReceiveDialog = async (purchase: InventoryPurchase) => {
    try {
      const fullPurchase = await inventoryPurchasesApi.getById(purchase.id);
      setSelectedPurchase(fullPurchase);

      const itemsToReceive = (fullPurchase.items || [])
        .map((item) => ({
          id: item.id,
          quantity_received: item.quantity_ordered - item.quantity_received,
          max_quantity: item.quantity_ordered - item.quantity_received,
          product_name: item.product?.name || `Producto #${item.product_id}`,
        }))
        .filter((item) => item.max_quantity > 0);

      setReceiveItems(itemsToReceive);
      setReceiveDialogOpen(true);
    } catch (error) {
      console.error("Error loading purchase details:", error);
      alert("Error al cargar los detalles de la compra");
    }
  };

  const handleReceive = async () => {
    if (!selectedPurchase) return;

    const itemsToReceive: ReceiveItemData[] = receiveItems
      .filter((item) => item.quantity_received > 0)
      .map((item) => ({ id: item.id, quantity_received: item.quantity_received }));

    if (itemsToReceive.length === 0) {
      alert("Debe ingresar al menos una cantidad a recibir");
      return;
    }

    setFormLoading(true);
    try {
      const updated = await inventoryPurchasesApi.receive(selectedPurchase.id, itemsToReceive);
      setPurchases((prev) => prev.map((p) => (p.id === selectedPurchase.id ? updated : p)));
      setReceiveDialogOpen(false);
      setSelectedPurchase(null);
      setReceiveItems([]);
    } catch (error) {
      console.error("Error receiving merchandise:", error);
      alert("Error al recibir la mercancía");
    } finally {
      setFormLoading(false);
    }
  };

  const updateReceiveItem = (index: number, quantity: number) => {
    setReceiveItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        quantity_received: Math.min(Math.max(0, quantity), newItems[index].max_quantity),
      };
      return newItems;
    });
  };

  const openAcuseDialog = (purchase: InventoryPurchase) => {
    setAcusePurchase(purchase);
    setCufeInput("");
    setAcuseError("");
    setAcuseDialogOpen(true);
  };

  const handleSendAcuse = async () => {
    if (!acusePurchase) return;
    if (!cufeInput.trim()) { setAcuseError("Debe ingresar el CUFE"); return; }
    setAcuseLoading(true);
    setAcuseError("");
    try {
      const result = await inventoryPurchasesApi.sendReceiptAcknowledgment(acusePurchase.id, cufeInput.trim());
      if (result.success) {
        setPurchases((prev) => prev.map((p) => p.id === acusePurchase.id ? { ...p, receipt_acknowledgment: result.receipt_acknowledgment ?? null } : p));
        setAcuseDialogOpen(false);
        setAcusePurchase(null);
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

  const openRbDialog = (purchase: InventoryPurchase) => {
    setRbPurchase(purchase);
    setRbError("");
    setRbForm({ type_document_identification_id: "", identification_number: "", first_name: "", family_name: "", job_title: "" });
    setRbDialogOpen(true);
  };

  const handleSendRb = async () => {
    if (!rbPurchase) return;
    if (!rbForm.type_document_identification_id || !rbForm.identification_number || !rbForm.first_name || !rbForm.family_name || !rbForm.job_title) {
      setRbError("Todos los campos son obligatorios");
      return;
    }
    setRbLoading(true);
    setRbError("");
    try {
      const result = await inventoryPurchasesApi.sendGoodsReceipt(rbPurchase.id, {
        type_document_identification_id: parseInt(rbForm.type_document_identification_id),
        identification_number: rbForm.identification_number,
        first_name: rbForm.first_name,
        family_name: rbForm.family_name,
        job_title: rbForm.job_title,
      });
      if (result.success) {
        setPurchases((prev) => prev.map((p) => p.id === rbPurchase.id ? { ...p, goods_receipt: result.goods_receipt ?? null } : p));
        setRbDialogOpen(false);
        setRbPurchase(null);
      } else {
        setRbError(result.message || "Error al enviar recibo del bien");
      }
    } catch (err: any) {
      setRbError(err.message || "Error al enviar recibo del bien");
    } finally {
      setRbLoading(false);
    }
  };

  const handleSendAcuseEmail = async (id: number) => {
    try {
      const result = await inventoryPurchasesApi.sendReceiptAcknowledgmentEmail(id);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const handleSendRbEmail = async (id: number) => {
    try {
      const result = await inventoryPurchasesApi.sendGoodsReceiptEmail(id);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const handleSendDocumentSupport = (purchase: InventoryPurchase) => {
    setConfirmDialog({
      open: true,
      title: "Enviar Documento Soporte",
      description: `¿Enviar Documento Soporte a la DIAN para la compra ${purchase.purchase_number}?`,
      variant: "default",
      onConfirm: async () => {
        setDsLoading(purchase.id);
        try {
          const result = await inventoryPurchasesApi.sendDocumentSupport(purchase.id);
          if (result.success) {
            alert(result.message || "Documento Soporte enviado correctamente");
            setPurchases((prev) => prev.map((p) => p.id === purchase.id ? { ...p, document_support: result.document_support ?? null } : p));
          } else {
            alert(result.message || "Error al enviar documento soporte");
          }
        } catch (err: any) {
          alert(err.message || "Error al enviar documento soporte");
        } finally {
          setDsLoading(null);
        }
      },
    });
  };

  const handleSendDsEmail = async (id: number) => {
    try {
      const result = await inventoryPurchasesApi.sendDocumentSupportEmail(id);
      alert(result.message || (result.success ? "Correo enviado" : "Error al enviar correo"));
    } catch { alert("Error al enviar correo"); }
  };

  const handleVoidDocumentSupport = (purchase: InventoryPurchase) => {
    if (!purchase.document_support) return;
    setConfirmDialog({
      open: true,
      title: "Anular Documento Soporte",
      description: "¿Anular Documento Soporte? Se enviará una Nota Crédito a la DIAN. Esta acción no se puede deshacer.",
      variant: "destructive",
      onConfirm: async () => {
        setDsVoidLoading(purchase.id);
        try {
          const result = await inventoryPurchasesApi.voidDocumentSupport(purchase.document_support!.id);
          if (result.success) {
            alert(result.message || "Documento Soporte anulado correctamente");
            setPurchases((prev) => prev.map((p) => p.id === purchase.id ? { ...p, document_support: result.document_support ?? p.document_support } : p));
          } else {
            alert(result.message || "Error al anular documento soporte");
          }
        } catch (err: any) {
          alert(err.message || "Error al anular documento soporte");
        } finally {
          setDsVoidLoading(null);
        }
      },
    });
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO");
  };

  const handleViewPurchase = (purchaseId: number) =>
    router.visit(`/admin/inventory-purchases/${purchaseId}`);

  return (
    <AppLayout title="Compras de Inventario">
      <Head title="Compras de Inventario" />

      <div className="space-y-6">
        {/* Header + Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Compras de Inventario</h1>
                <p className="text-sm text-muted-foreground">Gestiona las ordenes de compra de inventario</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{purchases.length}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500/100" />
                    <span className="text-xs text-muted-foreground">Pendientes</span>
                  </div>
                  <p className="text-2xl font-bold">{tabCounts.sin_aprobar}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-blue-500/100" />
                    <span className="text-xs text-muted-foreground">Por recibir</span>
                  </div>
                  <p className="text-2xl font-bold">{tabCounts.sin_recibir}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500/100" />
                    <span className="text-xs text-muted-foreground">Con acuse</span>
                  </div>
                  <p className="text-2xl font-bold">{tabCounts.con_acuse}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {companyFilter.isSuperAdmin && (
          <SuperAdminCompanyFilter
            companies={companyFilter.companies}
            loadingCompanies={companyFilter.loadingCompanies}
            selectedCompanyId={companyFilter.selectedCompanyId}
            setSelectedCompanyId={companyFilter.setSelectedCompanyId}
            isFiltered={companyFilter.isFiltered}
            handleFilter={companyFilter.handleFilter}
            handleClear={companyFilter.handleClear}
          />
        )}

        {companyFilter.isSuperAdmin && !companyFilter.isFiltered && <SuperAdminEmptyState />}

        {companyFilter.shouldLoadData && (<>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="todas" className="text-xs sm:text-sm">
              Todas
              {tabCounts.todas > 0 && (
                <Badge variant="outline" className="ml-1.5 text-[10px] h-5 px-1.5">
                  {tabCounts.todas}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sin_aprobar" className="text-xs sm:text-sm">
              Sin Aprobar
              {tabCounts.sin_aprobar > 0 && (
                <Badge className="ml-1.5 text-[10px] h-5 px-1.5 bg-muted text-foreground">
                  {tabCounts.sin_aprobar}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sin_recibir" className="text-xs sm:text-sm">
              Sin Recibir
              {tabCounts.sin_recibir > 0 && (
                <Badge className="ml-1.5 text-[10px] h-5 px-1.5 bg-orange-500/15 text-orange-700">
                  {tabCounts.sin_recibir}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="con_acuse" className="text-xs sm:text-sm">
              Con Acuse
              {tabCounts.con_acuse > 0 && (
                <Badge className="ml-1.5 text-[10px] h-5 px-1.5 bg-purple-500/15 text-purple-700">
                  {tabCounts.con_acuse}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="con_recibo" className="text-xs sm:text-sm">
              Con Recibo
              {tabCounts.con_recibo > 0 && (
                <Badge className="ml-1.5 text-[10px] h-5 px-1.5 bg-teal-500/15 text-teal-700">
                  {tabCounts.con_recibo}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="text-xs sm:text-sm">
              <CalendarIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendario" className="mt-6">
            <PurchasesCalendar
              purchases={purchases}
              onViewPurchase={handleViewPurchase}
            />
          </TabsContent>
        </Tabs>

        {/* Search + Filters + Actions */}
        {activeTab !== "calendario" && (
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">Todos los estados</SelectItem>
                {(Object.keys(statusLabels) as InventoryPurchaseStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>{statusLabels[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder="Pago" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">Todos los pagos</SelectItem>
                {(Object.keys(paymentLabels) as string[]).map((key) => (
                  <SelectItem key={key} value={key}>{paymentLabels[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={datePreset} onValueChange={handleDatePreset}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="7d">7 Días Anteriores</SelectItem>
                <SelectItem value="15d">15 Días Anteriores</SelectItem>
                <SelectItem value="1m">Último Mes</SelectItem>
                <SelectItem value="2m">Últimos 2 Meses</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {canManage && (
              <div className="flex gap-2 lg:ml-auto">
                <Button variant="outline" size="sm" onClick={() => router.visit("/admin/inventory-purchases/import")}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <Button size="sm" onClick={() => router.visit("/admin/inventory-purchases/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Compra
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Custom date range inputs (only when custom preset selected) */}
        {activeTab !== "calendario" && datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm text-muted-foreground">Desde:</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setDatePreset('custom'); }}
              className="w-[160px]"
            />
            <Label className="text-sm text-muted-foreground">Hasta:</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setDatePreset('custom'); }}
              className="w-[160px]"
            />
          </div>
        )}

        {/* Purchases Table */}
        {activeTab !== "calendario" && (
          <>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-8 w-8" />
              </div>
            ) : filteredPurchases.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No se encontraron compras con esa búsqueda"
                      : activeTab === "todas"
                        ? "No hay compras registradas"
                        : activeTab === "con_acuse"
                          ? "No hay compras con acuse de recibo"
                          : activeTab === "con_recibo"
                            ? "No hay compras con recibo del bien"
                            : `No hay compras ${activeTab === "sin_aprobar" ? "sin aprobar" : "sin recibir"}`
                    }
                  </p>
                  {canManage && activeTab === "todas" && !searchQuery && (
                    <Button className="mt-4" onClick={() => router.visit("/admin/inventory-purchases/create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primera compra
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead>Bodega</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Pago</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Docs</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPurchases.map((purchase) => (
                          <TableRow key={purchase.id} className="group">
                            <TableCell>
                              <button
                                onClick={() => handleViewPurchase(purchase.id)}
                                className="font-mono font-medium text-primary hover:underline cursor-pointer"
                              >
                                {purchase.purchase_number}
                              </button>
                              {purchase.is_credit && (
                                <Badge className="ml-2 bg-amber-500/15 text-amber-700 text-[10px] px-1.5 py-0">
                                  <CreditCard className="h-3 w-3 mr-0.5" />
                                  Crédito
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{purchase.supplier?.name || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">{purchase.warehouse?.name || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[purchase.status]}>
                                {statusLabels[purchase.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={paymentColors[purchase.payment_status] || paymentColors.pending}>
                                {paymentLabels[purchase.payment_status] || purchase.payment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(purchase.total_amount)}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(purchase.created_at)}
                              </span>
                              {purchase.is_credit && purchase.credit_due_date && (
                                <span className="block text-xs text-amber-600">
                                  Vence: {formatDate(purchase.credit_due_date)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                {purchase.receipt_acknowledgment && (
                                  <button
                                    className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
                                    onClick={() => window.open(inventoryPurchasesApi.getReceiptAcknowledgmentPdfUrl(purchase.receipt_acknowledgment!.id), "_blank")}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Acuse de recibido
                                  </button>
                                )}
                                {purchase.goods_receipt && (
                                  <button
                                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
                                    onClick={() => window.open(inventoryPurchasesApi.getGoodsReceiptPdfUrl(purchase.goods_receipt!.id), "_blank")}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Recibo del bien
                                  </button>
                                )}
                                {purchase.document_support && (
                                  <button
                                    className={`inline-flex items-center gap-1 text-xs hover:underline ${purchase.document_support.voided ? "text-red-500" : "text-amber-600"}`}
                                    onClick={() => window.open(inventoryPurchasesApi.getDocumentSupportPdfUrl(purchase.document_support!.id), "_blank")}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {purchase.document_support.voided ? "Doc. Soporte (Anulado)" : "Doc. Soporte"}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleViewPurchase(purchase.id)}
                                  title="Ver detalle"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card z-50 w-52">
                                    {canApprove && purchase.status === "draft" && (
                                      <DropdownMenuItem onClick={() => openApproveDialog(purchase)}>
                                        <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                                        Aprobar orden
                                      </DropdownMenuItem>
                                    )}

                                    {canReceive && ["approved", "partial"].includes(purchase.status) && (
                                      <DropdownMenuItem onClick={() => openReceiveDialog(purchase)}>
                                        <PackageCheck className="h-4 w-4 mr-2 text-green-600" />
                                        Recibir mercancía
                                      </DropdownMenuItem>
                                    )}

                                    {canSendAcuse && purchase.status === "received" && !purchase.receipt_acknowledgment && (
                                      <DropdownMenuItem onClick={() => openAcuseDialog(purchase)}>
                                        <FileCheck className="h-4 w-4 mr-2 text-purple-600" />
                                        Acuse DIAN
                                      </DropdownMenuItem>
                                    )}

                                    {canSendAcuse && purchase.receipt_acknowledgment && !purchase.goods_receipt && (
                                      <DropdownMenuItem onClick={() => openRbDialog(purchase)}>
                                        <ClipboardCheck className="h-4 w-4 mr-2 text-teal-600" />
                                        Recibo del Bien
                                      </DropdownMenuItem>
                                    )}

                                    {canSendAcuse && purchase.status === "received" && !purchase.document_support && (
                                      <DropdownMenuItem
                                        onClick={() => handleSendDocumentSupport(purchase)}
                                        disabled={dsLoading === purchase.id}
                                      >
                                        {dsLoading === purchase.id
                                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          : <FileText className="h-4 w-4 mr-2 text-amber-600" />
                                        }
                                        Doc. Soporte DIAN
                                      </DropdownMenuItem>
                                    )}

                                    {canManage && ["draft", "pending"].includes(purchase.status) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleCancel(purchase)}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Cancelar compra
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Receive Dialog */}
        <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recibir Mercancía</DialogTitle>
              <DialogDescription>
                Registre las cantidades recibidas para actualizar el inventario
              </DialogDescription>
            </DialogHeader>
            {selectedPurchase && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Orden:</span>{" "}
                    <span className="font-medium">{selectedPurchase.purchase_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>{" "}
                    <span className="font-medium">{selectedPurchase.supplier?.name}</span>
                  </div>
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Ordenado</TableHead>
                        <TableHead className="text-center">Recibido</TableHead>
                        <TableHead className="text-center">Pendiente</TableHead>
                        <TableHead className="text-center">Recibir Ahora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items?.map((item) => {
                        const receiveItem = receiveItems.find((r) => r.id === item.id);
                        const pending = item.quantity_ordered - item.quantity_received;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.product?.name || `Producto #${item.product_id}`}
                              <br />
                              <span className="text-xs text-muted-foreground">{item.product?.sku}</span>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                            <TableCell className="text-center">{item.quantity_received}</TableCell>
                            <TableCell className="text-center">
                              {pending > 0 ? (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">{pending}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-700">Completo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {pending > 0 && receiveItem ? (
                                <Input
                                  type="number"
                                  min="0"
                                  max={pending}
                                  className="w-20 h-8 text-center mx-auto"
                                  value={receiveItem.quantity_received}
                                  onChange={(e) => {
                                    const itemIndex = receiveItems.findIndex((r) => r.id === item.id);
                                    if (itemIndex >= 0) updateReceiveItem(itemIndex, parseInt(e.target.value) || 0);
                                  }}
                                  disabled={formLoading}
                                />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setReceiveDialogOpen(false); setSelectedPurchase(null); setReceiveItems([]); }} disabled={formLoading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleReceive} disabled={formLoading || receiveItems.every((i) => i.quantity_received === 0)} className="bg-green-600 hover:bg-green-700">
                    {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                    Confirmar Recepción
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Acuse de Recibo Dialog */}
        <Dialog open={acuseDialogOpen} onOpenChange={setAcuseDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Acuse de Recibo DIAN</DialogTitle>
              <DialogDescription>
                Enviar acuse de recibo (evento 030) a la DIAN para la compra{" "}
                <span className="font-medium">{acusePurchase?.purchase_number}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {acusePurchase && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>{" "}
                    <span className="font-medium">{acusePurchase.supplier?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-medium">{formatCurrency(acusePurchase.total_amount)}</span>
                  </div>
                </div>
              )}
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
                <Button type="button" variant="outline" onClick={() => { setAcuseDialogOpen(false); setAcusePurchase(null); setCufeInput(""); setAcuseError(""); }} disabled={acuseLoading}>
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
                <span className="font-medium">{rbPurchase?.purchase_number}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {rbPurchase && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>{" "}
                    <span className="font-medium">{rbPurchase.supplier?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>{" "}
                    <span className="font-medium">{formatCurrency(rbPurchase.total_amount)}</span>
                  </div>
                </div>
              )}
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
                <Button type="button" variant="outline" onClick={() => { setRbDialogOpen(false); setRbPurchase(null); setRbError(""); }} disabled={rbLoading}>
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
        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) setConfirmDialog((prev) => ({ ...prev, open: false })); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog((prev) => ({ ...prev, open: false })); }}
                className={confirmDialog.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Approve Purchase Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={(open) => { if (!approveLoading) { setApproveDialogOpen(open); if (!open) setApprovePurchase(null); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15">
                  <CheckCircle className="h-4.5 w-4.5 text-blue-600" />
                </div>
                Aprobar Orden de Compra
              </DialogTitle>
              <DialogDescription>
                Seleccione la caja o banco y el monto a pagar al aprobar.
              </DialogDescription>
            </DialogHeader>

            {approvePurchase && (
              <div className="space-y-5">
                {/* Purchase Summary */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Orden</p>
                      <p className="text-sm font-semibold font-mono mt-0.5">{approvePurchase.purchase_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Proveedor</p>
                      <p className="text-sm font-semibold mt-0.5">{approvePurchase.supplier?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="text-lg font-bold mt-0.5">{formatCurrency(approvePurchase.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Condición</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {approvePurchase.is_credit ? (
                          <Badge className="bg-amber-500/15 text-amber-700 hover:text-white text-xs">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Crédito
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/15 text-green-700 hover:text-white text-xs">Contado</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {approvePurchase.is_credit && approvePurchase.credit_due_date && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Vencimiento crédito:</span>
                      <span className="text-xs font-medium">{formatDate(approvePurchase.credit_due_date)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Form */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Datos del Pago
                  </h4>

                  {/* Cash Register Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Caja o Banco *</Label>
                    <Select
                      value={approveForm.cash_register_id}
                      onValueChange={(val) => setApproveForm({ ...approveForm, cash_register_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar caja o banco..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {cashRegisters.filter((cr) => cr.is_active).map((cr) => (
                          <SelectItem key={cr.id} value={String(cr.id)}>
                            <div className="flex items-center gap-2">
                              {cr.type === "bank" ? <Building2 className="h-3.5 w-3.5 text-blue-500" /> : <Wallet className="h-3.5 w-3.5 text-green-500" />}
                              <span>{cr.name}</span>
                              <span className="text-muted-foreground ml-1">({formatCurrency(cr.current_balance)})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        onClick={() => setApproveForm({ ...approveForm, amount: String(Math.round(approvePurchase.total_amount)) })}
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
                        value={approveForm.amount ? Number(approveForm.amount).toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, "");
                          setApproveForm({ ...approveForm, amount: value ? String(parseInt(value)) : "" });
                        }}
                        className="pl-7 text-lg font-semibold h-11"
                        disabled={approveLoading}
                      />
                    </div>
                  </div>

                  {/* Status messages */}
                  {approveForm.amount && parseFloat(approveForm.amount) < approvePurchase.total_amount && parseFloat(approveForm.amount) > 0 && (
                    <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-700">Pago parcial</p>
                        <p className="text-amber-600 mt-0.5">
                          Quedarán {formatCurrency(approvePurchase.total_amount - parseFloat(approveForm.amount))} pendientes. Podrá abonar el resto desde el detalle de la compra.
                        </p>
                      </div>
                    </div>
                  )}
                  {approveForm.cash_register_id && approveForm.amount && parseFloat(approveForm.amount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Se descontarán {formatCurrency(parseFloat(approveForm.amount) || 0)} de la caja seleccionada.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <Separator />
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setApproveDialogOpen(false); setApprovePurchase(null); }}
                    disabled={approveLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleApproveSubmit}
                    disabled={approveLoading || !approveForm.cash_register_id || !approveForm.amount || parseFloat(approveForm.amount) <= 0}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[160px]"
                  >
                    {approveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {approveForm.amount && parseFloat(approveForm.amount) < approvePurchase.total_amount
                      ? "Aprobar y Abonar"
                      : "Aprobar y Pagar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>)}
      </div>
    </AppLayout>
  );
}
