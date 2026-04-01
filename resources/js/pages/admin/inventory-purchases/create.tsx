import { Head, router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import InputError from "@/components/input-error";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  ShoppingCart,
  Package,
  Trash2,
  Wallet,
  FileSpreadsheet,
  Check,
  Save,
} from "lucide-react";
import {
  inventoryPurchasesApi,
  suppliersApi,
  warehousesApi,
  productsApi,
  type Supplier,
  type Warehouse as WarehouseType,
  type Product,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { PurchaseRetention } from "@/types";

const RETENTION_TYPES = [
  { type: "retefuente", name: "Retención en la fuente", percentage: 4 },
  { type: "reteiva", name: "Reteiva", percentage: 15 },
  { type: "reteica", name: "Reteica", percentage: 0.414 },
];

interface FormErrors {
  supplier_id?: string;
  warehouse_id?: string;
  items?: string;
  credit_due_date?: string;
  [key: string]: string | undefined;
}

interface PurchaseItem {
  product_id: number;
  quantity_ordered: number;
  unit_cost: number;
  tax_rate: number;
}

export default function CreateInventoryPurchasePage() {
  const { toast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    supplier_id: "",
    warehouse_id: "",
    expected_date: "",
    notes: "",
    is_credit: false,
    credit_due_date: "",
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    { product_id: 0, quantity_ordered: 1, unit_cost: 0, tax_rate: 0 },
  ]);
  const [retentions, setRetentions] = useState<PurchaseRetention[]>([]);

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const [suppliersData, warehousesData, productsData] = await Promise.all([
        suppliersApi.getAll(),
        warehousesApi.getAll(),
        productsApi.getAll(),
      ]);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
      setProducts(productsData);

      // Pre-select first supplier and warehouse
      if (suppliersData.length > 0) {
        setFormData((prev) => ({ ...prev, supplier_id: suppliersData[0].id.toString() }));
      }
      if (warehousesData.length > 0) {
        setFormData((prev) => ({ ...prev, warehouse_id: warehousesData[0].id.toString() }));
      }
    } catch (error) {
      console.error("Error loading catalogs:", error);
      toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setItems([...items, { product_id: 0, quantity_ordered: 1, unit_cost: 0, tax_rate: 0 }]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "product_id" && value > 0) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_cost = Math.round(parseFloat(String(product.purchase_price)) || 0);
        newItems[index].tax_rate = parseFloat(String(product.tax_rate)) || 0;
      }
    }
    setItems(newItems);
  };

  const calculateSubtotal = () =>
    items.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0);

  const calculateTax = () =>
    items.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost * (item.tax_rate / 100), 0);

  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const toggleRetention = (retType: (typeof RETENTION_TYPES)[0]) => {
    const isAdded = retentions.some((r) => r.type === retType.type);
    if (isAdded) {
      setRetentions(retentions.filter((r) => r.type !== retType.type));
    } else {
      const total = calculateTotal();
      const value = total * (retType.percentage / 100);
      setRetentions([...retentions, {
        id: Date.now().toString(),
        type: retType.type,
        name: retType.name,
        percentage: retType.percentage,
        value: Math.round(value),
      }]);
    }
  };

  const totalRetentions = retentions.reduce((sum, r) => sum + r.value, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrors({});

    try {
      const validItems = items.filter((item) => item.product_id > 0 && item.quantity_ordered > 0);
      if (validItems.length === 0) {
        setErrors({ items: "Debe agregar al menos un producto" });
        setFormLoading(false);
        return;
      }

      const data = {
        supplier_id: parseInt(formData.supplier_id),
        warehouse_id: parseInt(formData.warehouse_id),
        expected_date: formData.expected_date || undefined,
        notes: formData.notes || undefined,
        is_credit: formData.is_credit,
        credit_due_date: formData.is_credit && formData.credit_due_date ? formData.credit_due_date : undefined,
        retentions: retentions.length > 0 ? retentions : undefined,
        items: validItems,
      };

      const newPurchase = await inventoryPurchasesApi.create(data);
      toast({ title: "Orden creada", description: `Orden ${newPurchase.purchase_number} creada exitosamente` });
      router.visit(`/admin/inventory-purchases/${newPurchase.id}`);
    } catch (error: unknown) {
      console.error("Error creating purchase:", error);
      if (error && typeof error === "object") {
        if ("errors" in error && (error as any).errors) {
          setErrors((error as { errors: FormErrors }).errors);
        }
        if ("message" in error && (error as any).message) {
          toast({ title: "Error", description: (error as { message: string }).message, variant: "destructive" });
        }
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Nueva Orden de Compra">
        <Head title="Nueva Orden de Compra" />
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Nueva Orden de Compra">
      <Head title="Nueva Orden de Compra" />

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.visit("/admin/inventory-purchases")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Nueva Orden de Compra</h1>
                <p className="text-sm text-muted-foreground">Complete los datos para crear una nueva orden de compra</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información General */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Proveedor *</Label>
                  <Combobox
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    disabled={formLoading}
                    placeholder="Seleccionar proveedor"
                    searchPlaceholder="Buscar proveedor..."
                    emptyText="No se encontraron proveedores"
                    options={suppliers.map((s) => ({ value: s.id.toString(), label: s.name }))}
                  />
                  <InputError message={errors.supplier_id} />
                </div>
                <div>
                  <Label className="mb-2 block">Bodega Destino *</Label>
                  <Combobox
                    value={formData.warehouse_id}
                    onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                    disabled={formLoading}
                    placeholder="Seleccionar bodega"
                    searchPlaceholder="Buscar bodega..."
                    emptyText="No se encontraron bodegas"
                    options={warehouses.map((w) => ({ value: w.id.toString(), label: w.name }))}
                  />
                  <InputError message={errors.warehouse_id} />
                </div>
                <div>
                  <Label className="mb-2 block">Fecha Esperada</Label>
                  <Input type="date" value={formData.expected_date} onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })} disabled={formLoading} />
                </div>
                <div>
                  <Label className="mb-2 block">Notas</Label>
                  <Input placeholder="Notas adicionales..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} disabled={formLoading} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condición de Pago */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Condición de Pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="is_credit"
                    checked={formData.is_credit}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_credit: checked === true,
                        credit_due_date: checked === true ? formData.credit_due_date : "",
                      })
                    }
                    disabled={formLoading}
                  />
                  <Label htmlFor="is_credit" className="cursor-pointer">Compra a Crédito</Label>
                </div>
                {formData.is_credit && (
                  <div>
                    <Label className="mb-2 block">Fecha de Vencimiento *</Label>
                    <Input type="date" value={formData.credit_due_date} onChange={(e) => setFormData({ ...formData, credit_due_date: e.target.value })} disabled={formLoading} />
                    <InputError message={errors.credit_due_date} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Productos */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Productos *
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={formLoading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <InputError message={errors.items} />
              <div className="border rounded-lg p-3 space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs mb-1 block">Producto</Label>
                      <Combobox
                        value={item.product_id ? item.product_id.toString() : ""}
                        onValueChange={(value) => updateItem(index, "product_id", parseInt(value))}
                        disabled={formLoading}
                        placeholder="Seleccionar producto"
                        searchPlaceholder="Buscar producto..."
                        emptyText="No se encontraron productos"
                        className="h-9"
                        options={products.map((p) => ({ value: p.id.toString(), label: `${p.name} (${p.sku})` }))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs mb-1 block">Cant.</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-9"
                        value={item.quantity_ordered ? item.quantity_ordered.toLocaleString("es-CO") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          updateItem(index, "quantity_ordered", parseInt(raw) || 0);
                        }}
                        disabled={formLoading}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs mb-1 block">Costo Unit.</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="h-9"
                        placeholder="$90.000"
                        value={item.unit_cost ? Math.round(Number(item.unit_cost)).toLocaleString("es-CO") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          updateItem(index, "unit_cost", parseInt(raw) || 0);
                        }}
                        disabled={formLoading}
                      />
                      {item.product_id > 0 && (() => {
                        const product = products.find(p => p.id === item.product_id);
                        if (product && item.unit_cost > 0 && item.unit_cost !== product.purchase_price) {
                          return (
                            <span className="text-xs text-muted-foreground mt-0.5 block">
                              Anterior: {formatCurrency(product.purchase_price)}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">IVA</Label>
                      <Select
                        value={(item.tax_rate ?? 0).toString()}
                        onValueChange={(value) => updateItem(index, "tax_rate", parseFloat(value))}
                        disabled={formLoading}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card z-50">
                          <SelectItem value="0">Excento 0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="19">19%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} disabled={items.length === 1 || formLoading} className="h-9">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">
                  Subtotal: {formatCurrency(calculateSubtotal())}
                </div>
                {calculateTax() > 0 && (
                  <div className="text-sm text-muted-foreground">
                    IVA: {formatCurrency(calculateTax())}
                  </div>
                )}
                <div className="font-semibold text-lg">
                  Total: {formatCurrency(calculateTotal())}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retenciones */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Retenciones
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {RETENTION_TYPES.map((retType) => {
                  const isActive = retentions.some((r) => r.type === retType.type);
                  return (
                    <Button
                      key={retType.type}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className="justify-between h-9"
                      onClick={() => toggleRetention(retType)}
                      disabled={formLoading}
                    >
                      <span className="flex items-center gap-1.5">
                        {isActive ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {retType.name}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-1">
                        {retType.percentage}%
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              {retentions.length > 0 && (
                <div className="space-y-1.5 border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground">Retenciones aplicadas</p>
                  {retentions.map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        {r.name}
                        <Badge variant="outline" className="text-xs">{r.percentage}%</Badge>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-medium">-{formatCurrency(r.value)}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setRetentions(retentions.filter((x) => x.id !== r.id))}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator className="my-1.5" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Neto a pagar</span>
                    <span>{formatCurrency(calculateTotal() - totalRetentions)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.visit("/admin/inventory-purchases")} disabled={formLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
              Crear Orden
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
