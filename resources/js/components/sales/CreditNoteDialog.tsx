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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import {
  internalNotesApi,
  cashRegistersApi,
  paymentMethodsApi,
  type Sale,
  type SaleItem,
  type CashRegister,
  type PaymentMethod,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Minus } from "lucide-react";

interface CreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onCreated: () => void;
}

interface CreditLineItem {
  saleItemId: number;
  selected: boolean;
  description: string;
  originalQty: number;
  alreadyReturned: number;
  maxReturnable: number;
  returnQty: number;
  unitPrice: number;
  discountPercentage: number;
  taxRate: number | undefined;
  productId?: number;
  serviceId?: number;
}

export function CreditNoteDialog({
  open,
  onOpenChange,
  sale,
  onCreated,
}: CreditNoteDialogProps) {
  const [reason, setReason] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lineItems, setLineItems] = useState<CreditLineItem[]>([]);

  // Build line items from sale items, calculating already returned quantities from existing credit notes
  useEffect(() => {
    if (!open || !sale.items) return;

    const returnedMap = new Map<number, number>();
    if (sale.internal_notes) {
      for (const note of sale.internal_notes) {
        if (note.type === "credit" && note.status === "completed" && note.items) {
          for (const item of note.items) {
            if (item.sale_item_id) {
              returnedMap.set(
                item.sale_item_id,
                (returnedMap.get(item.sale_item_id) || 0) + Number(item.quantity)
              );
            }
          }
        }
      }
    }

    const items: CreditLineItem[] = sale.items.map((si: SaleItem) => {
      const alreadyReturned = returnedMap.get(si.id) || 0;
      const maxReturnable = Number(si.quantity) - alreadyReturned;
      return {
        saleItemId: si.id,
        selected: false,
        description: si.description,
        originalQty: Number(si.quantity),
        alreadyReturned,
        maxReturnable: Math.max(0, maxReturnable),
        returnQty: 0,
        unitPrice: Number(si.unit_price),
        discountPercentage: Number(si.discount_percentage),
        taxRate: si.tax_rate != null ? Number(si.tax_rate) : undefined,
        productId: si.product_id,
        serviceId: si.service_id,
      };
    });

    setLineItems(items);
  }, [open, sale]);

  // Load cash registers and payment methods
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingOptions(true);
      try {
        const [regs, methods] = await Promise.all([
          cashRegistersApi.getAll(),
          paymentMethodsApi.getAll(),
        ]);
        setCashRegisters(regs);
        setPaymentMethods(methods);
      } catch (err) {
        console.error("Error loading options:", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    load();
  }, [open]);

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setReason("");
      setCashRegisterId("");
      setPaymentMethodId("");
      setSubmitting(false);
    }
  }, [open]);

  const toggleItem = (index: number, checked: boolean) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              selected: checked,
              returnQty: checked ? (item.maxReturnable > 0 ? 1 : 0) : 0,
            }
          : item
      )
    );
  };

  const updateReturnQty = (index: number, value: number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              returnQty: Math.max(0, Math.min(value, item.maxReturnable)),
            }
          : item
      )
    );
  };

  const selectedItems = useMemo(
    () => lineItems.filter((item) => item.selected && item.returnQty > 0),
    [lineItems]
  );

  const refundTotal = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      const subtotal = item.returnQty * item.unitPrice;
      const discountAmount = subtotal * (item.discountPercentage / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = item.taxRate ? afterDiscount * (item.taxRate / 100) : 0;
      return total + afterDiscount + taxAmount;
    }, 0);
  }, [selectedItems]);

  const canSubmit =
    selectedItems.length > 0 &&
    reason.trim().length > 0 &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await internalNotesApi.create(sale.id, {
        type: "credit",
        reason: reason.trim(),
        cash_register_id: cashRegisterId ? Number(cashRegisterId) : undefined,
        payment_method_id: paymentMethodId ? Number(paymentMethodId) : undefined,
        items: selectedItems.map((item) => ({
          sale_item_id: item.saleItemId,
          product_id: item.productId,
          service_id: item.serviceId,
          description: item.description,
          quantity: item.returnQty,
          unit_price: item.unitPrice,
          discount_percentage: item.discountPercentage,
          tax_rate: item.taxRate,
        })),
      });

      toast({
        title: "Nota crédito creada",
        description: "La nota crédito interna se creó exitosamente.",
      });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Error al crear la nota crédito.",
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
            <Minus className="h-5 w-5 text-green-600" />
            Nueva Nota Crédito Interna
          </DialogTitle>
          <DialogDescription>
            Selecciona los items a devolver para la venta{" "}
            <span className="font-semibold">{sale.invoice_number}</span>.
          </DialogDescription>
        </DialogHeader>

        {loadingOptions ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10 h-12 px-4"></TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold">
                      Descripción
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-center">
                      Cant. Original
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-center">
                      Ya Devuelto
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-center">
                      Cant. a Devolver
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-right">
                      Precio Unit.
                    </TableHead>
                    <TableHead className="h-12 px-4 text-xs font-semibold text-right">
                      Subtotal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => {
                    const lineSubtotal = item.returnQty * item.unitPrice;
                    const discountAmt =
                      lineSubtotal * (item.discountPercentage / 100);
                    const afterDiscount = lineSubtotal - discountAmt;
                    const taxAmt = item.taxRate
                      ? afterDiscount * (item.taxRate / 100)
                      : 0;
                    const lineTotal = afterDiscount + taxAmt;
                    const disabled = item.maxReturnable <= 0;

                    return (
                      <TableRow
                        key={item.saleItemId}
                        className={disabled ? "opacity-50" : "hover:bg-muted/30"}
                      >
                        <TableCell className="p-4">
                          <Checkbox
                            checked={item.selected}
                            disabled={disabled}
                            onCheckedChange={(checked) =>
                              toggleItem(index, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="p-4 text-sm">
                          {item.description}
                          {disabled && (
                            <span className="block text-xs text-muted-foreground">
                              Completamente devuelto
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-center">
                          {item.originalQty}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-center">
                          {item.alreadyReturned > 0 ? (
                            <span className="text-amber-600 font-medium">
                              {item.alreadyReturned}
                            </span>
                          ) : (
                            "0"
                          )}
                        </TableCell>
                        <TableCell className="p-4 text-center">
                          <Input
                            type="number"
                            min={0}
                            max={item.maxReturnable}
                            value={item.returnQty}
                            onChange={(e) =>
                              updateReturnQty(
                                index,
                                parseInt(e.target.value) || 0
                              )
                            }
                            disabled={!item.selected || disabled}
                            className="w-20 h-8 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-right font-medium">
                          {item.selected && item.returnQty > 0
                            ? formatCurrency(lineTotal)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="credit-reason">
                Razón de la nota crédito <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="credit-reason"
                placeholder="Ej: Devolución de producto, error en facturación..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            </div>

            {/* Cash Register and Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Caja de reembolso</Label>
                <Select value={cashRegisterId} onValueChange={setCashRegisterId}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Seleccionar caja (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {cashRegisters.map((cr) => (
                      <SelectItem key={cr.id} value={String(cr.id)}>
                        {cr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de pago del reembolso</Label>
                <Select
                  value={paymentMethodId}
                  onValueChange={setPaymentMethodId}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Seleccionar método (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={String(pm.id)}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedItems.length} item(s) seleccionado(s)
              </span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total a devolver</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(refundTotal)}
                </p>
              </div>
            </div>
          </div>
        )}

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
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear Nota Crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
