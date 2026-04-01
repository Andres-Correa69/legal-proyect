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
  type CashRegister,
  type PaymentMethod,
  type SaleWithPendingBalance,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, TrendingUp, Save } from "lucide-react";

export default function PaymentIncomePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingSales, setPendingSales] = useState<SaleWithPendingBalance[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const [formData, setFormData] = useState({
    sale_id: "",
    cash_register_id: "",
    payment_method_id: "",
    amount: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    loadData();

    // Auto-select sale from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const saleIdParam = urlParams.get("sale_id");
    if (saleIdParam) {
      paymentsApi.getSalesWithPendingBalance().then((sales) => {
        setPendingSales(sales);
        const matched = sales.find((s) => s.id.toString() === saleIdParam);
        if (matched) {
          setFormData((prev) => ({ ...prev, sale_id: saleIdParam, amount: matched.balance.toString() }));
        }
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [registersData, methodsData, salesData] = await Promise.all([
        cashRegistersApi.getAll(),
        paymentMethodsApi.getAll(),
        paymentsApi.getSalesWithPendingBalance(),
      ]);
      setCashRegisters(registersData.filter((r) => r.is_active));
      setPaymentMethods(methodsData);
      setPendingSales(salesData);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaleSelect = (saleId: string) => {
    const sale = pendingSales.find((s) => s.id.toString() === saleId);
    if (sale) {
      setFormData((prev) => ({ ...prev, sale_id: saleId, amount: sale.balance.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    setFormLoading(true);

    try {
      await paymentsApi.createIncome({
        sale_id: parseInt(formData.sale_id),
        cash_register_id: parseInt(formData.cash_register_id),
        payment_method_id: parseInt(formData.payment_method_id),
        amount: parseFloat(formData.amount),
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      toast({ title: "Ingreso registrado exitosamente" });
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

  const selectedSale = pendingSales.find((s) => s.id.toString() === formData.sale_id);

  if (loading) {
    return (
      <AppLayout title="Nuevo Ingreso">
        <Head title="Nuevo Ingreso" />
        <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Nuevo Ingreso">
      <Head title="Nuevo Ingreso" />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.visit("/admin/payments")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="rounded-full p-2.5 bg-green-500/15">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Nuevo Ingreso</h1>
                <p className="text-sm text-muted-foreground">Registra un nuevo ingreso de efectivo</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {generalError && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-700 border border-red-500/20">{generalError}</div>
          )}

          {/* Venta */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="mb-2 block">Venta (Factura) *</Label>
                <Combobox
                  value={formData.sale_id}
                  onValueChange={handleSaleSelect}
                  disabled={formLoading}
                  placeholder="Selecciona una venta pendiente"
                  searchPlaceholder="Buscar por factura o cliente..."
                  emptyText="No hay ventas pendientes"
                  options={pendingSales.map((sale) => ({
                    value: sale.id.toString(),
                    label: `${sale.invoice_number} - ${sale.client_name} - Pendiente: ${formatCurrency(sale.balance)}`,
                  }))}
                />
                <InputError message={errors.sale_id} />
                {selectedSale && (
                  <div className="mt-3 p-4 bg-blue-500/10/70 rounded-lg border border-blue-500/20 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <p><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{selectedSale.client_name}</span></p>
                      <p><span className="text-muted-foreground">Total Factura:</span> <span className="font-medium">{formatCurrency(selectedSale.total_amount)}</span></p>
                      <p><span className="text-muted-foreground">Pagado:</span> <span className="font-medium">{formatCurrency(selectedSale.paid_amount)}</span></p>
                      <p><span className="text-muted-foreground">Pendiente:</span> <span className="font-semibold text-blue-700">{formatCurrency(selectedSale.balance)}</span></p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Caja, Método, Monto, Referencia */}
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
                <div>
                  <Label className="mb-2 block">Monto *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text" inputMode="numeric" placeholder="$0"
                      value={formData.amount ? parseFloat(formData.amount).toLocaleString("es-CO", { maximumFractionDigits: 0 }) : ""}
                      onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); setFormData({ ...formData, amount: raw }); }}
                      disabled={formLoading} className="flex-1"
                    />
                    {selectedSale && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={formLoading}
                        onClick={() => setFormData((prev) => ({ ...prev, amount: selectedSale.balance.toString() }))}>
                        Total
                      </Button>
                    )}
                  </div>
                  <InputError message={errors.amount} />
                </div>
                <div>
                  <Label className="mb-2 block">Referencia</Label>
                  <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Nro. de comprobante" disabled={formLoading} />
                  <InputError message={errors.reference} />
                </div>
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
              Guardar Ingreso
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
