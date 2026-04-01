import { Head, usePage, router } from "@inertiajs/react";
import { useEffect, useState, useCallback, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { Combobox } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import {
  priceListsApi, productsApi, servicesApi, productCategoriesApi, productAreasApi,
  type PriceList, type PriceListItem, type Product, type Service, type ProductCategory, type ProductArea,
} from "@/lib/api";
import { isSuperAdmin, hasPermission } from "@/lib/permissions";
import { formatCurrency, cn } from "@/lib/utils";
import type { User } from "@/types";
import {
  ArrowLeft, DollarSign, Package, ShoppingCart, Plus, Trash2, Pencil, Save,
  Search, CalendarIcon, Receipt, Users, FileText, FileSpreadsheet,
} from "lucide-react";

interface ItemFormRow {
  key: string;
  product_id: number | null;
  service_id: number | null;
  discount_percentage: number;
  custom_price: number | null;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 10);
}

export default function PriceListShow() {
  const { props } = usePage<{ auth: { user: User }; priceListId: number }>();
  const user = props.auth?.user;
  const priceListId = props.priceListId;
  const { toast } = useToast();
  const canEdit = isSuperAdmin(user) || hasPermission("price-lists.manage", user);

  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("productos");

  // Products data
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [areas, setAreas] = useState<ProductArea[]>([]);

  // Products filters
  const [productSearch, setProductSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterArea, setFilterArea] = useState("all");

  // Sales data & filters
  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatus, setSalesStatus] = useState("all");
  const [salesPaymentStatus, setSalesPaymentStatus] = useState("all");
  const [salesDatePreset, setSalesDatePreset] = useState("");
  const [salesDateFrom, setSalesDateFrom] = useState("");
  const [salesDateTo, setSalesDateTo] = useState("");

  // Items manager
  const [showItemsManager, setShowItemsManager] = useState(false);
  const [itemRows, setItemRows] = useState<ItemFormRow[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  const loadPriceList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await priceListsApi.getById(priceListId);
      setPriceList(data);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar la lista", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [priceListId]);

  useEffect(() => {
    loadPriceList();
    Promise.all([
      productsApi.getAll().then(setProducts).catch(() => {}),
      servicesApi.getAll().then(setServices).catch(() => {}),
      productCategoriesApi.getAll().then(setCategories).catch(() => {}),
      productAreasApi.getAll().then(setAreas).catch(() => {}),
    ]);
  }, [loadPriceList]);

  // Load sales when tab switches to ventas
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const params: any = {};
      if (salesSearch) params.search = salesSearch;
      if (salesStatus !== "all") params.status = salesStatus;
      if (salesPaymentStatus !== "all") params.payment_status = salesPaymentStatus;
      if (salesDateFrom) params.date_from = salesDateFrom;
      if (salesDateTo) params.date_to = salesDateTo;
      const data = await priceListsApi.getSales(priceListId, params);
      setSales(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las ventas", variant: "destructive" });
    } finally {
      setSalesLoading(false);
    }
  }, [priceListId, salesSearch, salesStatus, salesPaymentStatus, salesDateFrom, salesDateTo]);

  useEffect(() => {
    if (activeTab === "ventas") loadSales();
  }, [activeTab, loadSales]);

  // Date preset handler
  const handleSalesDatePreset = (value: string) => {
    setSalesDatePreset(value);
    const today = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (value === 'last_15_days') {
      const from = new Date(today); from.setDate(from.getDate() - 15);
      setSalesDateFrom(fmt(from)); setSalesDateTo(fmt(today));
    } else if (value === 'current_month') {
      setSalesDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
      setSalesDateTo(fmt(today));
    } else if (value === 'previous_month') {
      setSalesDateFrom(fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setSalesDateTo(fmt(new Date(today.getFullYear(), today.getMonth(), 0)));
    }
  };

  // Filtered items
  const items = priceList?.items ?? [];
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const name = item.product?.name || item.service?.name || "";
      const sku = item.product?.sku || "";
      const matchSearch = !productSearch || name.toLowerCase().includes(productSearch.toLowerCase()) || sku.toLowerCase().includes(productSearch.toLowerCase());
      const matchCategory = filterCategory === "all" || (item.product as any)?.category_id?.toString() === filterCategory;
      const matchArea = filterArea === "all" || (item.product as any)?.area_id?.toString() === filterArea;
      return matchSearch && matchCategory && matchArea;
    });
  }, [items, productSearch, filterCategory, filterArea]);

  const calculateFinalPrice = (item: PriceListItem): number => {
    if (item.custom_price != null) return item.custom_price;
    const basePrice = item.product?.sale_price ?? item.service?.price ?? 0;
    return basePrice - basePrice * (item.discount_percentage / 100);
  };

  // Items manager handlers
  const itemOptions = useMemo(() => {
    const po = products.map((p) => ({ value: `product-${p.id}`, label: `${p.name} (${p.sku || ''}) - ${formatCurrency(p.sale_price)}` }));
    const so = services.map((s) => ({ value: `service-${s.id}`, label: `${s.name} - ${formatCurrency(s.price)}` }));
    return [...po, ...so];
  }, [products, services]);

  const handleToggleItemsManager = () => {
    if (!showItemsManager && priceList?.items) {
      setItemRows(priceList.items.map((item) => ({
        key: generateKey(), product_id: item.product_id ?? null, service_id: item.service_id ?? null,
        discount_percentage: item.discount_percentage, custom_price: item.custom_price ?? null,
      })));
    }
    setShowItemsManager(!showItemsManager);
  };

  const handleItemSelect = (key: string, comboValue: string) => {
    if (!comboValue) { setItemRows((p) => p.map((r) => r.key === key ? { ...r, product_id: null, service_id: null } : r)); return; }
    const [type, idStr] = comboValue.split("-");
    const id = parseInt(idStr);
    setItemRows((p) => p.map((r) => r.key === key ? { ...r, product_id: type === "product" ? id : null, service_id: type === "service" ? id : null } : r));
  };

  const handleSaveItems = async () => {
    if (!priceList) return;
    setSavingItems(true);
    try {
      const validItems = itemRows.filter((r) => r.product_id || r.service_id).map((r) => ({
        product_id: r.product_id, service_id: r.service_id, discount_percentage: r.discount_percentage, custom_price: r.custom_price,
      }));
      const updated = await priceListsApi.syncItems(priceList.id, validItems);
      setPriceList(updated);
      setShowItemsManager(false);
      toast({ title: "Items guardados", description: "Los items fueron actualizados correctamente." });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Error al guardar", variant: "destructive" });
    } finally {
      setSavingItems(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!priceList) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 14;

      pdf.setFontSize(16);
      pdf.text(priceList.name, margin, 20);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Estado: ${priceList.is_active ? 'Activa' : 'Inactiva'} | Productos: ${items.length} | Prioridad: ${priceList.priority}`, margin, 27);
      const generatedDate = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      pdf.text(`Generado: ${generatedDate}`, pageW - margin, 27, { align: 'right' });
      pdf.setTextColor(0);

      autoTable(pdf, {
        startY: 34,
        head: [['Producto/Servicio', 'SKU', 'Categoria', 'Precio Base', 'Dcto %', 'Precio Final']],
        body: items.map((item) => [
          item.product?.name || item.service?.name || '—',
          item.product?.sku || '—',
          (item.product as any)?.category?.name || '—',
          formatCurrency(item.product?.sale_price ?? item.service?.price ?? 0),
          item.discount_percentage > 0 ? `${item.discount_percentage}%` : '—',
          formatCurrency(calculateFinalPrice(item)),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [36, 99, 235] },
        margin: { left: margin, right: margin },
      });

      pdf.save(`Lista_Precios_${priceList.name.replace(/\s+/g, '_')}.pdf`);
    } catch {
      toast({ title: "Error", description: "Error al generar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!priceList) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = items.map((item) => ({
        'Producto/Servicio': item.product?.name || item.service?.name || '—',
        'Tipo': item.product_id ? 'Producto' : 'Servicio',
        'SKU': item.product?.sku || '—',
        'Categoria': (item.product as any)?.category?.name || '—',
        'Area': (item.product as any)?.area?.name || '—',
        'Precio Base': item.product?.sale_price ?? item.service?.price ?? 0,
        'Descuento %': item.discount_percentage,
        'Precio Custom': item.custom_price ?? '',
        'Precio Final': calculateFinalPrice(item),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Items');
      XLSX.writeFile(wb, `Lista_Precios_${priceList.name.replace(/\s+/g, '_')}.xlsx`);
    } catch {
      toast({ title: "Error", description: "Error al generar Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // Sales totals
  const salesTotals = useMemo(() => ({
    count: sales.length,
    total: sales.reduce((s, v) => s + (v.total_amount || 0), 0),
    paid: sales.reduce((s, v) => s + (v.paid_amount || 0), 0),
  }), [sales]);

  if (loading) {
    return (
      <AppLayout><Head title="Lista de Precios" />
        <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8" /></div>
      </AppLayout>
    );
  }

  if (!priceList) {
    return (
      <AppLayout><Head title="Lista de Precios" />
        <div className="text-center py-24 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No se encontro la lista de precios.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.visit("/admin/price-lists")}>Volver</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={priceList.name} />
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => router.visit("/admin/price-lists")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                <DollarSign className="h-5 w-5 text-[#2463eb]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold">{priceList.name}</h1>
                  <Badge className={`rounded-full ${priceList.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {priceList.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {priceList.description && <p className="text-sm text-muted-foreground mt-0.5">{priceList.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting || items.length === 0} className="gap-2">
                  {exporting ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />} PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting || items.length === 0} className="gap-2">
                  {exporting ? <Spinner className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />} Excel
                </Button>
                {canEdit && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => router.visit(`/admin/price-lists/${priceList.id}/edit`)} className="gap-2">
                      <Pencil className="h-4 w-4" /> Editar
                    </Button>
                    <Button size="sm" onClick={handleToggleItemsManager} className="gap-2">
                      <Package className="h-4 w-4" /> {showItemsManager ? "Cerrar Items" : "Gestionar Items"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-background rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-[#2463eb]" />
                  <span className="text-xs text-muted-foreground">Prioridad</span>
                </div>
                <p className="text-lg font-semibold">{priceList.priority}</p>
              </div>
              <div className="bg-background rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">Productos</span>
                </div>
                <p className="text-lg font-semibold">{items.length}</p>
              </div>
              <div className="bg-background rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Ventas</span>
                </div>
                <p className="text-lg font-semibold">{(priceList as any).sales_count ?? 0}</p>
              </div>
              <div className="bg-background rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Estado</span>
                </div>
                <p className="text-lg font-semibold">{priceList.is_active ? "Activa" : "Inactiva"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Manager */}
        {showItemsManager && (
          <Card className="shadow-xl border border-[#e1e7ef]">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Gestionar Items</h3>
                <Button variant="outline" size="sm" onClick={() => setItemRows([...itemRows, { key: generateKey(), product_id: null, service_id: null, discount_percentage: 0, custom_price: null }])} className="gap-2">
                  <Plus className="h-4 w-4" /> Agregar item
                </Button>
              </div>
              {itemRows.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No hay items. Haz clic en "Agregar item".</p>
              ) : (
                <div className="space-y-3">
                  {itemRows.map((row) => (
                    <div key={row.key} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 border rounded-lg bg-muted/30">
                      <div className="sm:col-span-5">
                        <Label className="text-xs text-muted-foreground mb-1 block">Producto / Servicio</Label>
                        <Combobox
                          options={itemOptions}
                          value={row.product_id ? `product-${row.product_id}` : row.service_id ? `service-${row.service_id}` : ""}
                          onValueChange={(val) => handleItemSelect(row.key, val)}
                          placeholder="Seleccionar..." searchPlaceholder="Buscar..." emptyText="Sin resultados."
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs text-muted-foreground mb-1 block">Descuento %</Label>
                        <Input type="number" min={0} max={100} step={0.01} value={row.discount_percentage}
                          onChange={(e) => setItemRows((p) => p.map((r) => r.key === row.key ? { ...r, discount_percentage: parseFloat(e.target.value) || 0 } : r))} />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs text-muted-foreground mb-1 block">Precio fijo</Label>
                        <Input type="number" min={0} step={0.01} value={row.custom_price ?? ""} placeholder="Opcional"
                          onChange={(e) => setItemRows((p) => p.map((r) => r.key === row.key ? { ...r, custom_price: e.target.value ? parseFloat(e.target.value) : null } : r))} />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemRows((p) => p.filter((r) => r.key !== row.key))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={handleSaveItems} disabled={savingItems} className="gap-2">
                  {savingItems ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Guardar Items
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="productos" className="gap-2"><Package className="h-4 w-4" /> Productos ({items.length})</TabsTrigger>
            <TabsTrigger value="ventas" className="gap-2"><Receipt className="h-4 w-4" /> Ventas ({(priceList as any).sales_count ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab: Productos */}
        {activeTab === "productos" && (
          <Card className="shadow-xl border border-[#e1e7ef]">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-end gap-3 mb-4">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar producto o servicio..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las categorias</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Area" /></SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="all">Todas las areas</SelectItem>
                    {areas.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{items.length === 0 ? "No hay items en esta lista." : "No se encontraron resultados."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-12 px-4">Producto / Servicio</TableHead>
                        <TableHead className="h-12 px-4">SKU</TableHead>
                        <TableHead className="h-12 px-4">Categoria</TableHead>
                        <TableHead className="h-12 px-4">Area</TableHead>
                        <TableHead className="h-12 px-4 text-right">Precio Base</TableHead>
                        <TableHead className="h-12 px-4 text-center">Dcto %</TableHead>
                        <TableHead className="h-12 px-4 text-right">Precio Final</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const isProduct = !!item.product_id;
                        const basePrice = item.product?.sale_price ?? item.service?.price ?? 0;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="p-4">
                              <div className="flex items-center gap-2">
                                {isProduct ? <Package className="h-4 w-4 text-muted-foreground" /> : <ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                                <span
                                  className="font-medium text-[#2463eb] hover:underline cursor-pointer"
                                  onClick={() => {
                                    if (isProduct && item.product_id) router.visit(`/admin/products/${item.product_id}`);
                                  }}
                                >
                                  {item.product?.name || item.service?.name || "—"}
                                </span>
                                <Badge variant="outline" className="rounded-full text-xs">{isProduct ? "Producto" : "Servicio"}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="p-4 text-muted-foreground text-sm">{item.product?.sku || "—"}</TableCell>
                            <TableCell className="p-4 text-sm">{(item.product as any)?.category?.name || "—"}</TableCell>
                            <TableCell className="p-4 text-sm">{(item.product as any)?.area?.name || "—"}</TableCell>
                            <TableCell className="p-4 text-right text-sm">{formatCurrency(basePrice)}</TableCell>
                            <TableCell className="p-4 text-center">
                              {item.discount_percentage > 0 ? <Badge variant="secondary" className="rounded-full">{item.discount_percentage}%</Badge> : "—"}
                            </TableCell>
                            <TableCell className="p-4 text-right font-semibold">{formatCurrency(calculateFinalPrice(item))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Ventas */}
        {activeTab === "ventas" && (
          <Card className="shadow-xl border border-[#e1e7ef]">
            <CardContent className="p-4">
              {/* Filters */}
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por factura o cliente..." value={salesSearch} onChange={(e) => setSalesSearch(e.target.value)} className="pl-9 h-9 text-sm" />
                  </div>
                  <Select value={salesStatus} onValueChange={setSalesStatus}>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={salesPaymentStatus} onValueChange={setSalesPaymentStatus}>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm"><SelectValue placeholder="Pago" /></SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Rango</label>
                    <Select value={salesDatePreset} onValueChange={handleSalesDatePreset}>
                      <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]"><SelectValue placeholder="Seleccionar rango" /></SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="last_15_days">Ultimos 15 dias</SelectItem>
                        <SelectItem value="current_month">Mes actual</SelectItem>
                        <SelectItem value="previous_month">Mes anterior</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {salesDatePreset === 'custom' && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Desde</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 w-[180px] justify-start text-left font-normal text-sm", !salesDateFrom && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {salesDateFrom ? new Date(salesDateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport selected={salesDateFrom ? new Date(salesDateFrom + 'T12:00:00') : undefined}
                              onSelect={(d) => { if (d) { setSalesDateFrom(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); }}} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Hasta</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 w-[180px] justify-start text-left font-normal text-sm", !salesDateTo && "text-muted-foreground")}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                              {salesDateTo ? new Date(salesDateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <DatePickerReport selected={salesDateTo ? new Date(salesDateTo + 'T12:00:00') : undefined}
                              onSelect={(d) => { if (d) { setSalesDateTo(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); }}} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                  <Button size="sm" onClick={loadSales} className="gap-2 h-9">
                    {salesLoading ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />} Consultar
                  </Button>
                </div>
              </div>

              {/* Sales summary */}
              {sales.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Ventas</p>
                    <p className="text-lg font-semibold">{salesTotals.count}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Facturado</p>
                    <p className="text-lg font-semibold">{formatCurrency(salesTotals.total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total Pagado</p>
                    <p className="text-lg font-semibold">{formatCurrency(salesTotals.paid)}</p>
                  </div>
                </div>
              )}

              {salesLoading ? (
                <div className="flex items-center justify-center py-12 gap-2">
                  <Spinner className="h-5 w-5" /><span className="text-sm text-muted-foreground">Cargando ventas...</span>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No se encontraron ventas con esta lista de precios.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-12 px-4">Factura</TableHead>
                        <TableHead className="h-12 px-4">Cliente</TableHead>
                        <TableHead className="h-12 px-4">Fecha</TableHead>
                        <TableHead className="h-12 px-4 text-right">Total</TableHead>
                        <TableHead className="h-12 px-4 text-center">Estado</TableHead>
                        <TableHead className="h-12 px-4 text-center">Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.visit(`/admin/sales/${sale.id}`)}>
                          <TableCell className="p-4">
                            <span className="font-medium text-[#2463eb] hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); router.visit(`/admin/sales/${sale.id}`); }}>
                              {sale.invoice_number}
                            </span>
                          </TableCell>
                          <TableCell className="p-4 text-sm">{sale.client?.name || "—"}</TableCell>
                          <TableCell className="p-4 text-sm text-muted-foreground">
                            {sale.invoice_date ? new Date(sale.invoice_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                          </TableCell>
                          <TableCell className="p-4 text-right font-medium">{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell className="p-4 text-center">
                            <Badge variant={sale.status === "completed" ? "default" : "secondary"} className="rounded-full">
                              {sale.status === "completed" ? "Completada" : sale.status === "cancelled" ? "Cancelada" : sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-4 text-center">
                            <Badge variant={sale.payment_status === "paid" ? "default" : "secondary"}
                              className={`rounded-full ${sale.payment_status === "paid" ? "bg-green-100 text-green-700" : sale.payment_status === "partial" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              {sale.payment_status === "paid" ? "Pagado" : sale.payment_status === "partial" ? "Parcial" : "Pendiente"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
