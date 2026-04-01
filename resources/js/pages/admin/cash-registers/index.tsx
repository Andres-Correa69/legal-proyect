import { Head, usePage, Link } from "@inertiajs/react";
import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import InputError from "@/components/input-error";
import { cashRegistersApi, cashSessionsApi, paymentMethodsApi } from "@/lib/api";
import type { SharedData } from "@/types";
import type { CashRegister, CashRegisterSession, PaymentMethod } from "@/lib/api";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";
import { useSuperAdminCompanyFilter } from "@/hooks/use-super-admin-company-filter";
import { SuperAdminCompanyFilter, SuperAdminEmptyState } from "@/components/super-admin-company-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit2,
  Trash2,
  Play,
  Square,
  Wallet,
  Building2,
  Landmark,
  ArrowUpDown,
  ArrowRightLeft,
  Eye,
  MoreVertical,
} from "lucide-react";

// --- Constantes (vet-dash-vibe) ---

const TYPE_LABELS: Record<string, string> = {
  minor: "Caja Menor",
  major: "Caja Mayor",
  bank: "Banco",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  minor: Wallet,
  major: Building2,
  bank: Landmark,
};

type SortOption = "name_asc" | "name_desc" | "balance_desc" | "balance_asc";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "balance_desc", label: "Saldo mayor" },
  { value: "balance_asc", label: "Saldo menor" },
];

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20] as const;

export default function CashRegistersIndex() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canView = hasPermission("cash-registers.view", user);
  const canManage = hasPermission("cash-registers.manage", user);
  const canOpen = hasPermission("cash-registers.open", user);
  const canClose = hasPermission("cash-registers.close", user);

  const initialBranchId =
    !userIsSuperAdmin && user?.branch_id ? user.branch_id.toString() : "";

  // --- State: Data ---
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State: Filters & Pagination ---
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // --- State: Create/Edit Dialog ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCashRegister, setEditingCashRegister] =
    useState<CashRegister | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "minor" as "minor" | "major" | "bank",
    name: "",
    code: "",
    bank_name: "",
    branch_id: initialBranchId,
    account_number: "",
    account_type: "",
    payment_method_id: "",
    notes: "",
    current_balance: "0",
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const companyFilter = useSuperAdminCompanyFilter();

  // --- State: Open/Close Session ---
  const [openSessionDialog, setOpenSessionDialog] = useState(false);
  const [closeSessionDialog, setCloseSessionDialog] = useState(false);
  const [selectedCashRegister, setSelectedCashRegister] =
    useState<CashRegister | null>(null);
  const [currentSession, setCurrentSession] =
    useState<CashRegisterSession | null>(null);
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [sessionFormData, setSessionFormData] = useState({
    opening_balance: "0",
    closing_balance: "0",
    transfer_to_cash_register_id: "" as string,
    notes: "",
  });

  // --- Computed: Balances by type ---
  const balancesByType = useMemo(
    () => ({
      minor: cashRegisters
        .filter((r) => r.type === "minor")
        .reduce((sum, r) => sum + (Number(r.current_balance) || 0), 0),
      major: cashRegisters
        .filter((r) => r.type === "major")
        .reduce((sum, r) => sum + (Number(r.current_balance) || 0), 0),
      bank: cashRegisters
        .filter((r) => r.type === "bank")
        .reduce((sum, r) => sum + (Number(r.current_balance) || 0), 0),
    }),
    [cashRegisters]
  );

  // --- Computed: Filtered & Sorted ---
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cashRegisters.filter((r) => {
      if (filterType !== "all" && r.type !== filterType) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, filterType, cashRegisters]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      switch (sortBy) {
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "balance_desc":
          return b.current_balance - a.current_balance;
        case "balance_asc":
          return a.current_balance - b.current_balance;
        case "name_asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return rows;
  }, [filtered, sortBy]);

  // --- Computed: Pagination ---
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  // --- Effects ---
  useEffect(() => {
    if (!canView) {
      window.location.href = "/admin/dashboard";
      return;
    }
    if (companyFilter.shouldLoadData) {
      loadData();
    }
  }, [canView, companyFilter.isFiltered, companyFilter.selectedCompanyId]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, filterType, sortBy]);

  if (!canView) {
    return null;
  }

  // --- Data Loading ---
  const loadData = async () => {
    try {
      setLoading(true);
      const [cashRegistersData, paymentMethodsData] = await Promise.all([
        cashRegistersApi.getAll({ company_id: companyFilter.companyIdParam }),
        paymentMethodsApi.getAll({ company_id: companyFilter.companyIdParam }),
      ]);
      setCashRegisters(cashRegistersData);
      setPaymentMethods(paymentMethodsData.filter(m => m.is_active));
    } catch (error: any) {
      console.error("Error loading data:", error);
      setGeneralError(error.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // --- Form Handlers ---
  const resetForm = () => {
    const defaultBranchId =
      !userIsSuperAdmin && user?.branch_id ? user.branch_id.toString() : "";
    setFormData({
      type: "minor",
      name: "",
      code: "",
      bank_name: "",
      branch_id: defaultBranchId,
      account_number: "",
      account_type: "",
      payment_method_id: "",
      notes: "",
      current_balance: "0",
      is_active: true,
    });
    setEditingCashRegister(null);
    setErrors({});
    setGeneralError("");
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cashRegister: CashRegister) => {
    setEditingCashRegister(cashRegister);
    setFormData({
      type: (cashRegister.type || "minor") as "minor" | "major" | "bank",
      name: cashRegister.name,
      code: cashRegister.code || "",
      bank_name: cashRegister.bank_name || "",
      branch_id: cashRegister.branch_id.toString(),
      account_number: cashRegister.account_number || "",
      account_type: cashRegister.account_type || "",
      payment_method_id: cashRegister.payment_method_id?.toString() || "",
      notes: cashRegister.notes || "",
      current_balance: cashRegister.current_balance.toString(),
      is_active: cashRegister.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.branch_id) {
      setGeneralError("Debes seleccionar una sucursal");
      return;
    }
    if (formData.type === "bank" && !formData.bank_name) {
      setGeneralError(
        "El nombre del banco es obligatorio para cuentas bancarias"
      );
      return;
    }
    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      const data = {
        type: formData.type,
        name: formData.name,
        code: formData.code || undefined,
        bank_name:
          formData.type === "bank" ? formData.bank_name : undefined,
        branch_id: parseInt(formData.branch_id),
        account_number:
          formData.type === "bank" && formData.account_number
            ? formData.account_number
            : undefined,
        account_type:
          formData.type === "bank" && formData.account_type
            ? formData.account_type
            : undefined,
        payment_method_id: formData.payment_method_id ? parseInt(formData.payment_method_id) : null,
        notes: formData.notes || undefined,
        current_balance: parseFloat(formData.current_balance) || 0,
        is_active: true,
      };

      if (editingCashRegister) {
        const updatedCashRegister = await cashRegistersApi.update(
          editingCashRegister.id,
          data
        );
        setCashRegisters((prev) =>
          prev.map((cr) =>
            cr.id === editingCashRegister.id ? updatedCashRegister : cr
          )
        );
      } else {
        await cashRegistersApi.create(data);
        await loadData();
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving cash register:", error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || "Error al guardar caja");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await cashRegistersApi.delete(id);
      setCashRegisters((prev) => prev.filter((cr) => cr.id !== id));
    } catch (error: any) {
      console.error("Error deleting cash register:", error);
      setGeneralError(error.message || "Error al eliminar caja");
      await loadData();
    }
  };

  // --- Session Handlers ---
  const handleOpenSessionDialog = async (cashRegister: CashRegister) => {
    if (!canOpen) {
      setGeneralError("No tienes permisos para abrir cajas");
      return;
    }
    if (cashRegister.type !== "minor") {
      setGeneralError("Solo se pueden abrir sesiones en cajas menores");
      return;
    }
    if (cashRegister.current_session) {
      setGeneralError("Ya existe una sesion abierta para esta caja");
      return;
    }
    setSelectedCashRegister(cashRegister);
    setSessionFormData({
      ...sessionFormData,
      opening_balance: cashRegister.current_balance.toString(),
    });
    setErrors({});
    setGeneralError("");
    setOpenSessionDialog(true);
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashRegister) return;

    const openingBalance = parseFloat(sessionFormData.opening_balance);
    if (isNaN(openingBalance) || openingBalance < 0) {
      setGeneralError("El saldo inicial no puede ser negativo");
      return;
    }

    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      await cashSessionsApi.open({
        cash_register_id: selectedCashRegister.id,
        opening_balance: openingBalance,
      });
      setOpenSessionDialog(false);
      setSessionFormData({ ...sessionFormData, opening_balance: "0" });
      await loadData();
    } catch (error: any) {
      console.error("Error opening session:", error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || "Error al abrir la sesion");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseSessionDialog = async (cashRegister: CashRegister) => {
    if (!canClose) {
      setGeneralError("No tienes permisos para cerrar cajas");
      return;
    }
    if (!cashRegister.current_session) {
      setGeneralError("No hay sesion abierta para esta caja");
      return;
    }

    setSelectedCashRegister(cashRegister);
    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      const sessionResponse = await cashSessionsApi.current(cashRegister.id);
      if (!sessionResponse) {
        setGeneralError("No hay sesion abierta para esta caja");
        setFormLoading(false);
        return;
      }

      setCurrentSession(sessionResponse);
      const summaryResponse = await cashSessionsApi.summary(
        sessionResponse.id
      );
      const summary = summaryResponse.summary || summaryResponse;
      setSessionSummary(summary);

      setSessionFormData({
        ...sessionFormData,
        closing_balance: summary.expected_balance.toString(),
        transfer_to_cash_register_id: "",
        notes: "",
      });

      setCloseSessionDialog(true);
    } catch (error: any) {
      console.error("Error loading session:", error);
      setGeneralError(error.message || "Error al cargar la sesion");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const closingBalance = parseFloat(sessionFormData.closing_balance);
    if (isNaN(closingBalance) || closingBalance < 0) {
      setGeneralError("El saldo de cierre no puede ser negativo");
      return;
    }

    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      await cashSessionsApi.close(currentSession.id, {
        closing_balance: closingBalance,
        notes: sessionFormData.notes,
        transfer_to_cash_register_id: sessionFormData.transfer_to_cash_register_id
          ? parseInt(sessionFormData.transfer_to_cash_register_id)
          : null,
      });
      setCloseSessionDialog(false);
      setSessionFormData({
        ...sessionFormData,
        closing_balance: "0",
        notes: "",
        transfer_to_cash_register_id: "",
      });
      setCurrentSession(null);
      setSessionSummary(null);
      await loadData();
    } catch (error: any) {
      console.error("Error closing session:", error);
      if (error.errors) {
        const formattedErrors: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formattedErrors[key] = Array.isArray(error.errors[key])
            ? error.errors[key][0]
            : error.errors[key];
        });
        setErrors(formattedErrors);
      } else {
        setGeneralError(error.message || "Error al cerrar la sesion");
      }
    } finally {
      setFormLoading(false);
    }
  };

  // --- Helpers ---
  const canDeleteRegister = (r: CashRegister) => {
    return r.status !== "open" && !r.current_session;
  };

  // --- Render ---
  return (
    <AppLayout title="Gestión de Cajas">
      <Head title="Gestión de Cajas" />
      <div className="space-y-4">
        {/* Header - identical to FacturacionSettingsShell */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Gestión de Cajas
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra cajas menores, mayores y cuentas bancarias.
          </p>
        </header>

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

        {companyFilter.shouldLoadData && generalError && !dialogOpen && !openSessionDialog && !closeSessionDialog && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
            {generalError}
          </div>
        )}

        {companyFilter.shouldLoadData && (<>
        {/* Card wrapper - identical to FacturacionSettingsShell */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="mr-2" />
                <p>Cargando...</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Caja Menor
                          </p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(balancesByType.minor)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/100/10">
                          <Building2 className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Caja Mayor
                          </p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(balancesByType.major)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/100/10">
                          <Landmark className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bancos</p>
                          <p className="text-xl font-semibold">
                            {formatCurrency(balancesByType.bank)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-6">
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por nombre…"
                      className="max-w-xs"
                    />
                    <Select
                      value={filterType}
                      onValueChange={(v) => setFilterType(v)}
                    >
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="minor">Caja Menor</SelectItem>
                        <SelectItem value="major">Caja Mayor</SelectItem>
                        <SelectItem value="bank">Banco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select
                      value={sortBy}
                      onValueChange={(v) => setSortBy(v as SortOption)}
                    >
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {SORT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="outline">
                      <Link href="/admin/cash-transfers">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transferencias
                      </Link>
                    </Button>
                    {canManage && (
                      <Button onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Caja
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="rounded-md border overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageItems.map((r) => {
                        const Icon = TYPE_ICONS[r.type] || Wallet;
                        const isOpen = r.status === "open";
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{r.name}</span>
                              </div>
                              {r.payment_method && (
                                <Badge variant="secondary" className="text-xs mt-0.5">
                                  {r.payment_method.name}
                                </Badge>
                              )}
                              {r.type === "bank" && r.bank_name && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {r.bank_name}
                                  {r.account_number && ` • ${r.account_number}`}
                                </p>
                              )}
                              {r.branch && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {r.branch.name}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>{TYPE_LABELS[r.type] || r.type}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(r.current_balance)}
                            </TableCell>
                            <TableCell>
                              {r.type === "minor" ? (
                                <Badge
                                  className={
                                    isOpen
                                      ? "bg-emerald-500/100/10 text-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  }
                                >
                                  {isOpen ? "Abierta" : "Cerrada"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {r.type === "minor" && !isOpen && canOpen && (
                                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => handleOpenSessionDialog(r)}>
                                    <Play className="h-3.5 w-3.5" />
                                    Abrir Caja
                                  </Button>
                                )}
                                {r.type === "minor" && isOpen && canClose && (
                                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => handleCloseSessionDialog(r)}>
                                    <Square className="h-3.5 w-3.5" />
                                    Cerrar Caja
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card">
                                    <DropdownMenuItem onClick={() => openEdit(r)}>
                                      <Edit2 className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    {canDeleteRegister(r) && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => setDeleteConfirmId(r.id)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {pageItems.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-sm text-muted-foreground py-10"
                          >
                            No hay cajas para mostrar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t mt-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="whitespace-nowrap">
                      Mostrando{" "}
                      {sorted.length > 0 ? startIndex + 1 : 0}-
                      {Math.min(endIndex, sorted.length)} de {sorted.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">Mostrar:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(v) => {
                          setItemsPerPage(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt.toString()}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="whitespace-nowrap">por página</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Página{" "}
                    <span className="font-medium">{safePage}</span> de{" "}
                    <span className="font-medium">{totalPages}</span> cajas
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </>)}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Caja</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro de eliminar esta caja? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmId(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirmId !== null) {
                    handleDelete(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCashRegister ? "Editar Caja" : "Nueva Caja"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {generalError && dialogOpen && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                  {generalError}
                </div>
              )}
              <div>
                <Label htmlFor="type" className="mb-3 block">Tipo de Caja</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "minor" | "major" | "bank") =>
                    setFormData({ ...formData, type: value })
                  }
                  disabled={formLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="minor">Caja Menor</SelectItem>
                    <SelectItem value="major">Caja Mayor</SelectItem>
                    <SelectItem value="bank">Banco</SelectItem>
                  </SelectContent>
                </Select>
                <InputError message={errors.type} />
              </div>
              <div>
                <Label htmlFor="name" className="mb-3 block">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Caja Principal"
                  required
                  disabled={formLoading}
                />
                <InputError message={errors.name} />
              </div>
              <div>
                <Label htmlFor="payment_method_id" className="mb-3 block">Método de Pago</Label>
                <Select
                  value={formData.payment_method_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_method_id: value === "none" ? "" : value })
                  }
                  disabled={formLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método de pago (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="none">Sin método de pago</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <InputError message={errors.payment_method_id} />
                <p className="text-xs text-muted-foreground mt-1">
                  Los pagos con este método se registrarán automáticamente en esta caja.
                </p>
              </div>
              {formData.type === "bank" && (
                <>
                  <div>
                    <Label htmlFor="bank_name" className="mb-3 block">Nombre del Banco</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) =>
                        setFormData({ ...formData, bank_name: e.target.value })
                      }
                      placeholder="Ej: Bancolombia"
                      required={formData.type === "bank"}
                      disabled={formLoading}
                    />
                    <InputError message={errors.bank_name} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="account_number" className="mb-3 block">Número de Cuenta</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            account_number: e.target.value,
                          })
                        }
                        placeholder="123-456789-00"
                        disabled={formLoading}
                      />
                      <InputError message={errors.account_number} />
                    </div>
                    <div>
                      <Label htmlFor="account_type" className="mb-3 block">Tipo de Cuenta</Label>
                      <Select
                        value={formData.account_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, account_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="savings">Ahorros</SelectItem>
                          <SelectItem value="checking">Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                      <InputError message={errors.account_type} />
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="notes" className="mb-3 block">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  disabled={formLoading}
                />
                <InputError message={errors.notes} />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={formLoading}
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Spinner className="mr-2" size="sm" />}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Open Session Dialog */}
        <Dialog
          open={openSessionDialog}
          onOpenChange={(open) => !open && setOpenSessionDialog(false)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Abrir Caja - {selectedCashRegister?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleOpenSession} className="space-y-4">
              {generalError && openSessionDialog && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                  {generalError}
                </div>
              )}
              {selectedCashRegister && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span>Saldo actual del sistema:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedCashRegister.current_balance)}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="opening_balance">Saldo Inicial</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sessionFormData.opening_balance}
                  onChange={(e) =>
                    setSessionFormData({
                      ...sessionFormData,
                      opening_balance: e.target.value,
                    })
                  }
                  required
                  disabled={formLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ingrese el monto contado en la caja física
                </p>
                <InputError message={errors.opening_balance} />
              </div>

              {selectedCashRegister &&
                sessionFormData.opening_balance &&
                (() => {
                  const enteredBalance = parseFloat(
                    sessionFormData.opening_balance
                  );
                  const currentBalance =
                    selectedCashRegister.current_balance;
                  const difference = enteredBalance - currentBalance;

                  if (isNaN(enteredBalance)) return null;

                  if (Math.abs(difference) < 0.01) {
                    return (
                      <div className="p-3 bg-emerald-500/100/10 border border-emerald-500/20 rounded-lg text-sm">
                        <p className="text-emerald-700 font-medium">
                          Correcto: El saldo coincide con el registrado en
                          la caja.
                        </p>
                      </div>
                    );
                  }

                  if (difference > 0) {
                    return (
                      <div className="p-3 bg-amber-500/100/10 border border-amber-500 rounded-lg text-sm">
                        <p className="text-amber-700 font-medium mb-1">
                          Advertencia: El saldo que ingresaste (
                          {formatCurrency(enteredBalance)}) es mayor al
                          saldo actual de la caja (
                          {formatCurrency(currentBalance)}).
                        </p>
                        <p className="text-amber-700">
                          Diferencia: +{formatCurrency(difference)}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-red-500/100/10 border border-red-500 rounded-lg text-sm">
                      <p className="text-red-700 font-medium mb-1">
                        Cuidado: El saldo que ingresaste (
                        {formatCurrency(enteredBalance)}) es menor al saldo
                        actual de la caja ({formatCurrency(currentBalance)}).
                      </p>
                      <p className="text-red-700">
                        Se perderán {formatCurrency(Math.abs(difference))} del
                        registro.
                      </p>
                    </div>
                  );
                })()}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenSessionDialog(false)}
                  disabled={formLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Spinner className="mr-2" size="sm" />}
                  <Play className="h-4 w-4 mr-2" />
                  Abrir Caja
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Close Session Dialog */}
        <Dialog
          open={closeSessionDialog}
          onOpenChange={(open) => !open && setCloseSessionDialog(false)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Cerrar Caja - {selectedCashRegister?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCloseSession} className="space-y-4">
              {generalError && closeSessionDialog && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 border border-red-500/20">
                  {generalError}
                </div>
              )}
              {sessionSummary && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <h4 className="font-semibold mb-2">Resumen de Sesión</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">
                        Saldo Inicial:
                      </span>
                      <p className="font-medium">
                        {formatCurrency(
                          sessionSummary.opening_balance || 0
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Total Ingresos:
                      </span>
                      <p className="font-medium text-emerald-600">
                        {formatCurrency(sessionSummary.total_income || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Total Egresos:
                      </span>
                      <p className="font-medium text-red-600">
                        {formatCurrency(sessionSummary.total_expense || 0)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Saldo Esperado:
                      </span>
                      <p className="font-semibold">
                        {formatCurrency(sessionSummary.expected_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="closing_balance">Saldo Contado (Real)</Label>
                <Input
                  id="closing_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sessionFormData.closing_balance}
                  onChange={(e) =>
                    setSessionFormData({
                      ...sessionFormData,
                      closing_balance: e.target.value,
                    })
                  }
                  required
                  disabled={formLoading}
                />
                <InputError message={errors.closing_balance} />
              </div>

              {sessionSummary && sessionFormData.closing_balance && (
                <div
                  className={`p-3 rounded-lg ${
                    parseFloat(sessionFormData.closing_balance) -
                      sessionSummary.expected_balance >
                    0
                      ? "bg-emerald-500/100/10 border border-emerald-500/20"
                      : parseFloat(sessionFormData.closing_balance) -
                            sessionSummary.expected_balance <
                          0
                        ? "bg-red-500/100/10 border border-red-500/20"
                        : "bg-blue-500/100/10 border border-blue-500/20"
                  }`}
                >
                  <p className="font-semibold">
                    {parseFloat(sessionFormData.closing_balance) -
                      sessionSummary.expected_balance >
                      0 && (
                      <span className="text-emerald-700">
                        SOBRANTE:{" "}
                        {formatCurrency(
                          parseFloat(sessionFormData.closing_balance) -
                            sessionSummary.expected_balance
                        )}
                      </span>
                    )}
                    {parseFloat(sessionFormData.closing_balance) -
                      sessionSummary.expected_balance <
                      0 && (
                      <span className="text-red-700">
                        FALTANTE:{" "}
                        {formatCurrency(
                          Math.abs(
                            parseFloat(sessionFormData.closing_balance) -
                              sessionSummary.expected_balance
                          )
                        )}
                      </span>
                    )}
                    {parseFloat(sessionFormData.closing_balance) -
                      sessionSummary.expected_balance ===
                      0 && (
                      <span className="text-blue-700">ARQUEO CORRECTO</span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="transfer_to_cash_register">
                  Transferir saldo a otra caja (opcional)
                </Label>
                <Select
                  value={sessionFormData.transfer_to_cash_register_id}
                  onValueChange={(value) =>
                    setSessionFormData({
                      ...sessionFormData,
                      transfer_to_cash_register_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Dejar en esta caja" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="none">Dejar en esta caja</SelectItem>
                    {cashRegisters
                      .filter(
                        (r) =>
                          r.id !== selectedCashRegister?.id &&
                          r.is_active
                      )
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id.toString()}>
                          {r.name} ({r.type === "major" ? "Mayor" : r.type === "minor" ? "Menor" : "Banco"})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="closing_notes">
                  Notas de Cierre (opcional)
                </Label>
                <Textarea
                  id="closing_notes"
                  value={sessionFormData.notes}
                  onChange={(e) =>
                    setSessionFormData({
                      ...sessionFormData,
                      notes: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Observaciones del cierre..."
                  disabled={formLoading}
                  maxLength={1000}
                />
                <InputError message={errors.notes} />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCloseSessionDialog(false)}
                  disabled={formLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Spinner className="mr-2" size="sm" />}
                  <Square className="h-4 w-4 mr-2" />
                  Cerrar Caja
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
