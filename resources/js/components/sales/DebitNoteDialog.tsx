import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import {
  internalNotesApi,
  type Sale,
  type SaleItem,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface DebitNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onCreated: () => void;
}

interface ExistingLineItem {
  saleItemId: number;
  description: string;
  originalQty: number;
  originalUnitPrice: number;
  additionalQty: number;
  adjustedUnitPrice: number;
  discountPercentage: number;
  taxRate: number | undefined;
  productId?: number;
  serviceId?: number;
}

interface NewLineItem {
  tempId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export function DebitNoteDialog({
  open,
  onOpenChange,
  sale,
  onCreated,
}: DebitNoteDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("existing");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingItems, setExistingItems] = useState<ExistingLineItem[]>([]);
  const [newItems, setNewItems] = useState<NewLineItem[]>([]);

  // Build existing items from sale items
  useEffect(() => {
    if (!open || !sale.items) return;

    const items: ExistingLineItem[] = sale.items.map((si: SaleItem) => ({
      saleItemId: si.id,
      description: si.description,
      originalQty: Number(si.quantity),
      originalUnitPrice: Number(si.unit_price),
      additionalQty: 0,
      adjustedUnitPrice: Number(si.unit_price),
      discountPercentage: Number(si.discount_percentage),
      taxRate: si.tax_rate != null ? Number(si.tax_rate) : undefined,
      productId: si.product_id,
      serviceId: si.service_id,
    }));

    setExistingItems(items);
  }, [open, sale]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setReason("");
      setActiveTab("existing");
      setNewItems([]);
      setSubmitting(false);
    }
  }, [open]);

  const updateExistingItem = (
    index: number,
    field: "additionalQty" | "adjustedUnitPrice",
    value: number
  ) => {
    setExistingItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "additionalQty") {
          return { ...item, additionalQty: Math.max(0, value) };
        }
        // adjustedUnitPrice must be >= originalUnitPrice
        return {
          ...item,
          adjustedUnitPrice: Math.max(item.originalUnitPrice, value),
        };
      })
    );
  };

  const addNewItem = () => {
    setNewItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 19,
      },
    ]);
  };

  const updateNewItem = (
    tempId: string,
    field: keyof Omit<NewLineItem, "tempId">,
    value: string | number
  ) => {
    setNewItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeNewItem = (tempId: string) => {
    setNewItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Calculate totals for existing items (only items that have changes)
  const existingItemsWithChanges = useMemo(
    () =>
      existingItems.filter(
        (item) =>
          item.additionalQty > 0 ||
          item.adjustedUnitPrice > item.originalUnitPrice
      ),
    [existingItems]
  );

  const existingTotal = useMemo(() => {
    return existingItemsWithChanges.reduce((total, item) => {
      // Additional quantity at the adjusted price
      const qtyDiffSubtotal = item.additionalQty * item.adjustedUnitPrice;
      // Price increase on original quantity
      const priceDiff = item.adjustedUnitPrice - item.originalUnitPrice;
      const priceDiffSubtotal = priceDiff > 0 ? item.originalQty * priceDiff : 0;
      const subtotal = qtyDiffSubtotal + priceDiffSubtotal;
      const discountAmount = subtotal * (item.discountPercentage / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = item.taxRate ? afterDiscount * (item.taxRate / 100) : 0;
      return total + afterDiscount + taxAmount;
    }, 0);
  }, [existingItemsWithChanges]);

  const validNewItems = useMemo(
    () =>
      newItems.filter(
        (item) =>
          item.description.trim().length > 0 &&
          item.quantity > 0 &&
          item.unitPrice > 0
      ),
    [newItems]
  );

  const newItemsTotal = useMemo(() => {
    return validNewItems.reduce((total, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = subtotal * (item.taxRate / 100);
      return total + subtotal + taxAmount;
    }, 0);
  }, [validNewItems]);

  const grandTotal = existingTotal + newItemsTotal;

  const canSubmit =
    (existingItemsWithChanges.length > 0 || validNewItems.length > 0) &&
    reason.trim().length > 0 &&
    grandTotal > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const items = [
        ...existingItemsWithChanges.map((item) => ({
          sale_item_id: item.saleItemId,
          product_id: item.productId,
          service_id: item.serviceId,
          description: item.description,
          quantity: item.additionalQty > 0
            ? item.additionalQty + (item.adjustedUnitPrice > item.originalUnitPrice ? item.originalQty : 0)
            : item.originalQty,
          unit_price: item.adjustedUnitPrice,
          discount_percentage: item.discountPercentage,
          tax_rate: item.taxRate,
        })),
        ...validNewItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
        })),
      ];

      await internalNotesApi.create(sale.id, {
        type: "debit",
        reason: reason.trim(),
        items,
      });

      toast({
        title: "Nota débito creada",
        description: "La nota débito interna se creó exitosamente.",
      });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al crear la nota débito.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Nueva Nota Débito Interna
          </DialogTitle>
          <DialogDescription>
            Agrega cargos adicionales a la venta{" "}
            <span className="font-semibold">{sale.invoice_number}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="existing" className="flex-1">
                Items existentes
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-1">
                Items nuevos
              </TabsTrigger>
            </TabsList>

            {/* Existing Items Tab */}
            <TabsContent value="existing">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="h-12 px-4 text-xs font-semibold">
                        Descripción
                      </TableHead>
                      <TableHead className="h-12 px-4 text-xs font-semibold text-center">
                        Cant. Original
                      </TableHead>
                      <TableHead className="h-12 px-4 text-xs font-semibold text-center">
                        Cant. Adicional
                      </TableHead>
                      <TableHead className="h-12 px-4 text-xs font-semibold text-right">
                        Precio Original
                      </TableHead>
                      <TableHead className="h-12 px-4 text-xs font-semibold text-right">
                        Precio Ajustado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingItems.map((item, index) => (
                      <TableRow key={item.saleItemId} className="hover:bg-muted/30">
                        <TableCell className="p-4 text-sm">
                          {item.description}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-center">
                          {item.originalQty}
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={item.additionalQty}
                            onChange={(e) =>
                              updateExistingItem(
                                index,
                                "additionalQty",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 h-8 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right text-muted-foreground">
                          {formatCurrency(item.originalUnitPrice)}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Input
                            type="number"
                            min={item.originalUnitPrice}
                            step="0.01"
                            value={item.adjustedUnitPrice}
                            onChange={(e) =>
                              updateExistingItem(
                                index,
                                "adjustedUnitPrice",
                                parseFloat(e.target.value) || item.originalUnitPrice
                              )
                            }
                            className="w-28 h-8 text-right ml-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {existingItemsWithChanges.length > 0 && (
                <div className="mt-3 text-right">
                  <p className="text-xs text-muted-foreground">
                    Subtotal items existentes
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {formatCurrency(existingTotal)}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* New Items Tab */}
            <TabsContent value="new">
              <div className="space-y-3">
                {newItems.map((item) => (
                  <div
                    key={item.tempId}
                    className="border rounded-lg p-3 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Descripción</Label>
                        <Input
                          placeholder="Descripción del item"
                          value={item.description}
                          onChange={(e) =>
                            updateNewItem(item.tempId, "description", e.target.value)
                          }
                          className="h-8"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 mt-5 shrink-0 text-red-500 hover:text-red-700"
                        onClick={() => removeNewItem(item.tempId)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateNewItem(
                              item.tempId,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Precio Unitario</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateNewItem(
                              item.tempId,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">IVA (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.taxRate}
                          onChange={(e) =>
                            updateNewItem(
                              item.tempId,
                              "taxRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                    {item.description && item.quantity > 0 && item.unitPrice > 0 && (
                      <div className="text-right text-xs text-muted-foreground">
                        Subtotal:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(
                            item.quantity *
                              item.unitPrice *
                              (1 + item.taxRate / 100)
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={addNewItem}
                >
                  <Plus className="h-4 w-4" />
                  Agregar item
                </Button>

                {validNewItems.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Subtotal items nuevos
                    </p>
                    <p className="text-lg font-semibold text-blue-700">
                      {formatCurrency(newItemsTotal)}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="debit-reason">
              Razón de la nota débito <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="debit-reason"
              placeholder="Ej: Cargo adicional, ajuste de precio, servicio extra..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Grand Total */}
          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {existingItemsWithChanges.length + validNewItems.length} item(s)
              con cambios
            </span>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total nota débito</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(grandTotal)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear Nota Débito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
