import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Eye,
  MoreVertical,
  Calendar,
  User,
  DollarSign,
  Edit,
  Trash,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { quotesApi, productsApi, servicesApi } from "@/lib/api";
import type { Quote, CreateQuoteData, Product, Service } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface ClientQuotesViewProps {
  clientId: number;
}

const statusConfig = {
  active: { label: "Vigente", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  accepted: { label: "Aceptado", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  expired: { label: "Vencido", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  rejected: { label: "Rechazado", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" });
};

/* ─── Item row for the form ─── */
interface FormItem {
  key: string;
  itemType: "product" | "service";
  productId?: number;
  serviceId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  taxRate: number | null;
}

export const ClientQuotesView = ({ clientId }: ClientQuotesViewProps) => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  /* ─── Form dialog state ─── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);

  const [concept, setConcept] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([]);

  /* ─── Products & Services catalog ─── */
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  /* ─── Data fetching ─── */
  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await quotesApi.getByClient(clientId, {
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setQuotes(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los presupuestos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchQuotes, 300);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  /* ─── Filtered (client-side search is already handled by API, but we keep it for instant feedback) ─── */
  const filteredQuotes = useMemo(() => quotes, [quotes]);

  /* ─── Load product/service catalog ─── */
  const loadCatalog = async () => {
    if (catalogLoaded) return;
    try {
      const [prods, svcs] = await Promise.all([
        productsApi.getAll().catch(() => []),
        servicesApi.getAll({ is_active: true }).catch(() => []),
      ]);
      setAllProducts(prods.filter((p) => p.is_active));
      setAllServices(svcs);
      setCatalogLoaded(true);
    } catch { /* silently fail */ }
  };

  /* ─── Open form ─── */
  const openCreateDialog = () => {
    setEditingQuote(null);
    setConcept("");
    setQuoteDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidUntil(d.toISOString().split("T")[0]);
    setNotes("");
    setFormItems([]);
    loadCatalog();
    setDialogOpen(true);
  };

  const openEditDialog = async (quote: Quote) => {
    try {
      const full = await quotesApi.getById(quote.id);
      setEditingQuote(full);
      setConcept(full.concept);
      setQuoteDate(full.quote_date.substring(0, 10));
      setValidUntil(full.valid_until.substring(0, 10));
      setNotes(full.notes || "");
      setFormItems(
        full.items && full.items.length > 0
          ? full.items.map((it) => ({
              key: String(it.id),
              itemType: it.service_id ? "service" as const : "product" as const,
              productId: it.product_id ?? undefined,
              serviceId: it.service_id ?? undefined,
              description: it.description,
              quantity: it.quantity,
              unitPrice: Number(it.unit_price),
              discountPercentage: Number(it.discount_percentage),
              taxRate: it.tax_rate != null ? Number(it.tax_rate) : null,
            }))
          : []
      );
      loadCatalog();
      setDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el presupuesto", variant: "destructive" });
    }
  };

  /* ─── Form item helpers ─── */
  const updateFormItem = (key: string, field: keyof FormItem, value: any) => {
    setFormItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  };
  const removeFormItem = (key: string) => {
    setFormItems((prev) => prev.filter((it) => it.key !== key));
  };

  const addProductItem = (productId: string) => {
    const product = allProducts.find((p) => String(p.id) === productId);
    if (!product) return;
    setFormItems((prev) => [
      ...prev,
      {
        key: `p-${product.id}-${Date.now()}`,
        itemType: "product",
        productId: product.id,
        description: product.name,
        quantity: 1,
        unitPrice: Number(product.sale_price) || 0,
        discountPercentage: 0,
        taxRate: product.tax_rate != null ? Number(product.tax_rate) : null,
      },
    ]);
  };

  const addServiceItem = (serviceId: string) => {
    const service = allServices.find((s) => String(s.id) === serviceId);
    if (!service) return;
    setFormItems((prev) => [
      ...prev,
      {
        key: `s-${service.id}-${Date.now()}`,
        itemType: "service",
        serviceId: service.id,
        description: service.name,
        quantity: 1,
        unitPrice: Number(service.price) || 0,
        discountPercentage: 0,
        taxRate: service.tax_rate != null ? Number(service.tax_rate) : null,
      },
    ]);
  };

  const formTotal = useMemo(() => {
    return formItems.reduce((sum, it) => {
      const sub = it.quantity * it.unitPrice;
      const disc = sub * (it.discountPercentage / 100);
      const afterDisc = sub - disc;
      const tax = afterDisc * ((it.taxRate ?? 0) / 100);
      return sum + afterDisc + tax;
    }, 0);
  }, [formItems]);

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!concept.trim()) {
      toast({ title: "Error", description: "El concepto es obligatorio", variant: "destructive" });
      return;
    }
    if (formItems.length === 0) {
      toast({ title: "Error", description: "Agrega al menos un producto o servicio", variant: "destructive" });
      return;
    }

    const data: CreateQuoteData = {
      client_id: clientId,
      concept: concept.trim(),
      quote_date: quoteDate,
      valid_until: validUntil,
      notes: notes.trim() || undefined,
      items: formItems.map((it) => ({
        product_id: it.productId ?? null,
        service_id: it.serviceId ?? null,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount_percentage: it.discountPercentage || 0,
        tax_rate: it.taxRate,
      })),
    };

    try {
      setSaving(true);
      if (editingQuote) {
        await quotesApi.update(editingQuote.id, data);
        toast({ title: "Presupuesto actualizado" });
      } else {
        await quotesApi.create(data);
        toast({ title: "Presupuesto creado" });
      }
      setDialogOpen(false);
      fetchQuotes();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ─── Actions ─── */
  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    try {
      await quotesApi.delete(id);
      toast({ title: "Presupuesto eliminado" });
      fetchQuotes();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: "accepted" | "rejected") => {
    try {
      await quotesApi.updateStatus(id, status);
      toast({ title: status === "accepted" ? "Presupuesto aceptado" : "Presupuesto rechazado" });
      fetchQuotes();
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  /* ─── Render ─── */
  if (loading && quotes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filters + create */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar presupuesto..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="active">Vigentes</SelectItem>
              <SelectItem value="accepted">Aceptados</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Quotes list */}
      <div className="space-y-3">
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay presupuestos{searchQuery || statusFilter ? " con los filtros seleccionados" : ""}</p>
            <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> Crear presupuesto
            </Button>
          </div>
        ) : (
          filteredQuotes.map((quote) => {
            const sc = statusConfig[quote.status] || statusConfig.active;
            return (
              <Card key={quote.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {quote.quote_number}
                        </Badge>
                        <Badge variant="outline" className={sc.className}>
                          {sc.label}
                        </Badge>
                        {quote.converted_sale_id && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            Facturado
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{quote.concept}</CardTitle>
                      <div className="flex items-center gap-1 text-lg font-bold text-primary mt-2">
                        <DollarSign className="h-5 w-5" />
                        {formatCurrency(Number(quote.total_amount))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                          {quote.status === "active" && (
                            <>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(quote)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleStatusChange(quote.id, "accepted")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Aceptar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleStatusChange(quote.id, "rejected")}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Rechazar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => handleDelete(quote.id)}>
                            <Trash className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quote.items && quote.items.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {quote.items.length} ítem{quote.items.length !== 1 ? "s" : ""}: {quote.items.map((i) => i.description).join(", ")}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t flex-wrap">
                    <Calendar className="h-4 w-4" />
                    <span>Creado: {formatDate(quote.quote_date)}</span>
                    <span className="mx-1">&bull;</span>
                    <span>Válido hasta: {formatDate(quote.valid_until)}</span>
                    {quote.seller && (
                      <>
                        <span className="mx-1">&bull;</span>
                        <User className="h-4 w-4" />
                        <span>{quote.seller.name}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Summary */}
      {filteredQuotes.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Vigentes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(filteredQuotes.filter((q) => q.status === "active").reduce((s, q) => s + Number(q.total_amount), 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Aceptados</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(filteredQuotes.filter((q) => q.status === "accepted").reduce((s, q) => s + Number(q.total_amount), 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Presupuestos</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(filteredQuotes.reduce((s, q) => s + Number(q.total_amount), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>{editingQuote ? "Editar Presupuesto" : "Nuevo Presupuesto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Main fields */}
            <div className="space-y-1.5">
              <Label>Concepto *</Label>
              <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej: Mantenimiento mensual" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Válido hasta</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={2} />
            </div>

            <Separator />

            {/* Add product/service */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Agregar productos o servicios</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Combobox
                  options={allProducts
                    .filter((p) => !formItems.some((fi) => fi.productId === p.id))
                    .map((p) => ({
                      value: String(p.id),
                      label: `${p.name}${p.sku ? ` (${p.sku})` : ""} - ${formatCurrency(Number(p.sale_price))}`,
                    }))}
                  value=""
                  onValueChange={addProductItem}
                  placeholder="Buscar producto..."
                  searchPlaceholder="Nombre o SKU..."
                  emptyText="No se encontraron productos"
                />
                <Combobox
                  options={allServices
                    .filter((s) => !formItems.some((fi) => fi.serviceId === s.id))
                    .map((s) => ({
                      value: String(s.id),
                      label: `${s.name} - ${formatCurrency(Number(s.price))}`,
                    }))}
                  value=""
                  onValueChange={addServiceItem}
                  placeholder="Buscar servicio..."
                  searchPlaceholder="Nombre del servicio..."
                  emptyText="No se encontraron servicios"
                />
              </div>
            </div>

            {/* Items list */}
            {formItems.length > 0 && (
              <div className="space-y-2">
                {formItems.map((item) => {
                  const sub = item.quantity * item.unitPrice;
                  const disc = sub * (item.discountPercentage / 100);
                  const afterDisc = sub - disc;
                  const tax = afterDisc * ((item.taxRate ?? 0) / 100);
                  const itemTotal = afterDisc + tax;

                  return (
                    <div key={item.key} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${item.itemType === "service" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                            {item.itemType === "service" ? "Servicio" : "Producto"}
                          </Badge>
                          <span className="text-sm font-medium truncate">{item.description}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-primary">{formatCurrency(itemTotal)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFormItem(item.key)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">Cantidad</span>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateFormItem(item.key, "quantity", Math.max(1, Number(e.target.value) || 1))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">Precio Unit.</span>
                          <Input
                            type="number"
                            min={0}
                            value={item.unitPrice || ""}
                            onChange={(e) => updateFormItem(item.key, "unitPrice", Number(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">Desc. %</span>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discountPercentage || ""}
                            onChange={(e) => updateFormItem(item.key, "discountPercentage", Number(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground">IVA</span>
                          <Select
                            value={item.taxRate != null ? String(item.taxRate) : "null"}
                            onValueChange={(v) => updateFormItem(item.key, "taxRate", v === "null" ? null : Number(v))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card z-50">
                              <SelectItem value="null">Excl.</SelectItem>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="19">19%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {formItems.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Usa los buscadores de arriba para agregar productos o servicios</p>
              </div>
            )}

            <Separator />

            {/* Total + actions */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total estimado</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(formTotal)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving || formItems.length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  {editingQuote ? "Guardar cambios" : "Crear presupuesto"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
