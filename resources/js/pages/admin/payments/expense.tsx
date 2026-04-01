import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import {
  paymentsApi,
  cashRegistersApi,
  paymentMethodsApi,
  accountingApi,
  type CashRegister,
  type PaymentMethod,
  type PurchaseWithPendingBalance,
  type CreateFreeExpenseData,
} from "@/lib/api";
import type { AccountingAccount } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingDown, Save } from "lucide-react";

export default function PaymentExpensePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PurchaseWithPendingBalance[]>([]);
  const [leafAccounts, setLeafAccounts] = useState<AccountingAccount[]>([]);
  const [expenseMode, setExpenseMode] = useState<"purchase" | "free">("purchase");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const [formData, setFormData] = useState({
    purchase_id: "",
    cash_register_id: "",
    payment_method_id: "",
    amount: "",
    notes: "",
    concept: "",
    accounting_account_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [registersData, methodsData, purchasesData, accountsData] = await Promise.all([
        cashRegistersApi.getAll(),
        paymentMethodsApi.getAll(),
        paymentsApi.getPurchasesWithPendingBalance(),
        accountingApi.accounts.getLeaf().catch(() => []),
      ]);
      setCashRegisters(registersData.filter((r) => r.is_active));
      setPaymentMethods(methodsData);
      setPendingPurchases(purchasesData);
      setLeafAccounts(accountsData);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSelect = (purchaseId: string) => {
    const purchase = pendingPurchases.find((p) => p.id.toString() === purchaseId);
    if (purchase) {
      setFormData((prev) => ({ ...prev, purchase_id: purchaseId, amount: purchase.balance_due.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      if (expenseMode === "free") {
        const data: CreateFreeExpenseData = {
          concept: formData.concept,
          accounting_account_id: parseInt(formData.accounting_account_id),
          cash_register_id: parseInt(formData.cash_register_id),
          payment_method_id: parseInt(formData.payment_method_id),
          amount: parseFloat(formData.amount),
          notes: formData.notes || undefined,
        };
        await paymentsApi.createFreeExpense(data);
      } else {
        await paymentsApi.createExpense({
          purchase_id: parseInt(formData.purchase_id),
          cash_register_id: parseInt(formData.cash_register_id),
          payment_method_id: parseInt(formData.payment_method_id),
          amount: parseFloat(formData.amount),
          notes: formData.notes || undefined,
        });
      }
      toast({ title: "Egreso registrado exitosamente" });
      router.visit("/admin/payments");
    } catch (error: any) {
      if (error.errors) {
        const formatted: Record<string, string> = {};
        Object.keys(error.errors).forEach((key) => {
          formatted[key] = Array.isArray(error.errors[key]) ? error.errors[key][0] : error.errors[key];
        });
        setErrors(formatted);
      } else {
        setGeneralError(error.message || "Error al guardar pago");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const selectedPurchase = pendingPurchases.find((p) => p.id.toString() === formData.purchase_id);

  if (loading) {
    return (
      <AppLayout title="Nuevo Egreso">
        <Head title="Nuevo Egreso" />
        <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Nuevo Egreso">
      <Head title="Nuevo Egreso" />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.visit("/admin/payments")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="rounded-full p-2.5 bg-red-500/15">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Nuevo Egreso</h1>
                <p className="text-sm text-muted-foreground">Registra un nuevo egreso de efectivo</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {generalError && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">{generalError}</div>
          )}

          {/* Tipo de egreso */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex rounded-lg border p-1 gap-1 bg-muted/30">
                <button
                  type="button"
                  onClick={() => { setExpenseMode("purchase"); setFormData((prev) => ({ ...prev, concept: "", accounting_account_id: "" })); }}
                  className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-colors ${expenseMode === "purchase" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Por Compra
                </button>
                <button
                  type="button"
                  onClick={() => { setExpenseMode("free"); setFormData((prev) => ({ ...prev, purchase_id: "", amount: "" })); }}
                  className={`flex-1 text-sm py-1.5 px-3 rounded-md font-medium transition-colors ${expenseMode === "free" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Gasto
                </button>
              </div>

              {expenseMode === "purchase" ? (
                <div>
                  <Label className="mb-2 block">Compra de Inventario *</Label>
                  <Combobox
                    value={formData.purchase_id}
                    onValueChange={handlePurchaseSelect}
                    disabled={formLoading}
                    placeholder="Selecciona una compra pendiente"
                    searchPlaceholder="Buscar por número o proveedor..."
                    emptyText="No hay compras pendientes"
                    options={pendingPurchases.map((p) => ({
                      value: p.id.toString(),
                      label: `${p.purchase_number} - ${p.supplier_name} - Pendiente: ${formatCurrency(p.balance_due)}`,
                    }))}
                  />
                  <InputError message={errors.purchase_id} />
                  {selectedPurchase && (
                    <div className="mt-3 p-4 bg-red-500/10/70 rounded-lg border border-red-500/20 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{selectedPurchase.supplier_name}</span></p>
                        <p><span className="text-muted-foreground">Total Compra:</span> <span className="font-medium">{formatCurrency(selectedPurchase.total_amount)}</span></p>
                        <p><span className="text-muted-foreground">Pagado:</span> <span className="font-medium">{formatCurrency(selectedPurchase.total_paid)}</span></p>
                        <p><span className="text-muted-foreground">Pendiente:</span> <span className="font-semibold text-red-700">{formatCurrency(selectedPurchase.balance_due)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label className="mb-2 block">Concepto / Motivo *</Label>
                    <Input
                      value={formData.concept}
                      onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                      placeholder="Ej: Arrendamiento local, Servicios públicos, Papelería..."
                      required disabled={formLoading}
                    />
                    <InputError message={errors.concept} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Cuenta Contable *</Label>
                    <Combobox
                      value={formData.accounting_account_id}
                      onValueChange={(v) => setFormData({ ...formData, accounting_account_id: v })}
                      disabled={formLoading}
                      placeholder="Buscar cuenta contable..."
                      searchPlaceholder="Buscar por código o nombre..."
                      emptyText="No se encontraron cuentas"
                      options={leafAccounts.filter((a) => a.is_active).map((a) => ({
                        value: a.id.toString(),
                        label: `${a.code} - ${a.name}`,
                      }))}
                    />
                    <InputError message={errors.accounting_account_id} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Caja, Método, Monto */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Caja / Banco *</Label>
                  <Combobox
                    value={formData.cash_register_id}
                    onValueChange={(v) => setFormData({ ...formData, cash_register_id: v })}
                    disabled={formLoading}
                    placeholder="Selecciona una caja"
                    searchPlaceholder="Buscar caja..."
                    emptyText="No se encontraron cajas"
                    options={cashRegisters.map((r) => ({
                      value: r.id.toString(),
                      label: `${r.name} - ${formatCurrency(r.current_balance)}`,
                    }))}
                  />
                  <InputError message={errors.cash_register_id} />
                </div>
                <div>
                  <Label className="mb-2 block">Método de Pago *</Label>
                  <Combobox
                    value={formData.payment_method_id}
                    onValueChange={(v) => setFormData({ ...formData, payment_method_id: v })}
                    disabled={formLoading}
                    placeholder="Selecciona un método"
                    searchPlaceholder="Buscar método..."
                    emptyText="No se encontraron métodos de pago"
                    options={paymentMethods.filter((m) => m.is_active).map((m) => ({
                      value: m.id.toString(),
                      label: m.name,
                    }))}
                  />
                  <InputError message={errors.payment_method_id} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Monto *</Label>
                <div className="flex gap-2">
                  <Input
                    type="text" inputMode="numeric" placeholder="$0"
                    value={formData.amount ? parseFloat(formData.amount).toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                    onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); setFormData({ ...formData, amount: raw }); }}
                    disabled={formLoading} className="flex-1"
                  />
                  {expenseMode === "purchase" && selectedPurchase && (
                    <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={formLoading}
                      onClick={() => setFormData((prev) => ({ ...prev, amount: selectedPurchase.balance_due.toString() }))}>
                      Total
                    </Button>
                  )}
                </div>
                <InputError message={errors.amount} />
              </div>
              <div>
                <Label className="mb-2 block">Notas</Label>
                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observaciones adicionales" disabled={formLoading} />
                <InputError message={errors.notes} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.visit("/admin/payments")} disabled={formLoading}>Cancelar</Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar Egreso
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
