import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { router } from "@inertiajs/react";
import {
  ArrowLeft,
  Package,
  Tag,
  Info,
  DollarSign,
  Warehouse,
  ListOrdered,
  Plus,
  Trash2,
  Save,
  X,
  ImagePlus,
  Camera,
  Loader2,
  Clock,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  productsApi,
  servicesApi,
  productCategoriesApi,
  productAreasApi,
  locationsApi,
  suppliersApi,
  priceListsApi,
} from "@/lib/api";
import type {
  Product,
  Service,
  ServiceProduct,
  ProductCategory,
  ProductArea,
  Location,
  Supplier,
  ServiceCategories,
  ServiceUnits,
  PriceList as APIPriceList,
  PriceListItem as APIPriceListItem,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/* ── Tab config ── */
const productTabs = [
  { id: "basica", label: "Información Básica", icon: Info },
  { id: "precios", label: "Precios e IVA", icon: DollarSign },
  { id: "inventario", label: "Inventario", icon: Package },
  { id: "listas", label: "Lista de Precios", icon: ListOrdered },
  { id: "bodegas", label: "Bodegas", icon: Warehouse },
];

const serviceTabs = [
  { id: "basica", label: "Información Básica", icon: Info },
  { id: "precios", label: "Precios e IVA", icon: DollarSign },
  { id: "productos", label: "Productos", icon: Package },
  { id: "listas", label: "Lista de Precios", icon: ListOrdered },
];

/* ── Types ── */
interface PriceListRow {
  priceListId: number;
  name: string;
  discountPercentage: number;
  customPrice: number | null;
};

const UNITS_OF_MEASURE = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kilogramo (Kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "litro", label: "Litro" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "caja", label: "Caja" },
  { value: "paquete", label: "Paquete" },
  { value: "metro", label: "Metro" },
  { value: "rollo", label: "Rollo" },
];

const SERVICE_UNITS = [
  { value: "servicio", label: "Servicio" },
  { value: "hora", label: "Hora" },
  { value: "sesion", label: "Sesión" },
  { value: "consulta", label: "Consulta" },
];

const IVA_OPTIONS = [
  { value: "excluido", label: "Excluido" },
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "19", label: "19%" },
];

/* ── Props ── */
interface ProductCreateProps {
  tipo?: "producto" | "servicio";
  mode?: "create" | "edit";
  entityId?: number;
}

/* ── Component ── */
export default function ProductCreate({ tipo, mode = "create", entityId }: ProductCreateProps) {
  const { toast } = useToast();
  const isProduct = tipo !== "servicio";
  const isEdit = mode === "edit" && !!entityId;
  const [activeTab, setActiveTab] = useState("basica");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  /* ── Dropdown options ── */
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [areas, setAreas] = useState<ProductArea[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [serviceCategoriesMap, setServiceCategoriesMap] = useState<ServiceCategories>({});
  const [serviceUnitsMap, setServiceUnitsMap] = useState<ServiceUnits>({});

  /* ── Form state (product) ── */
  const [nombre, setNombre] = useState("");
  const [sku, setSku] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [marca, setMarca] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [precioVenta, setPrecioVenta] = useState<number>(0);
  const [precioCompra, setPrecioCompra] = useState<number>(0);
  const [iva, setIva] = useState("19");

  const [stockActual, setStockActual] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [stockMaximo, setStockMaximo] = useState<number>(0);
  const [rastrearInventario, setRastrearInventario] = useState(true);
  const [compraAutomatica, setCompraAutomatica] = useState(false);
  const [activo, setActivo] = useState(true);

  /* ── Form state (service extras) ── */
  const [duracion, setDuracion] = useState<number>(0);
  const [serviceCategory, setServiceCategory] = useState("");

  /* ── Image ── */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* ── Price Lists ── */
  const [allPriceLists, setAllPriceLists] = useState<APIPriceList[]>([]);
  const [priceListRows, setPriceListRows] = useState<PriceListRow[]>([]);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  /* ── Service Products ── */
  interface ServiceProductRow {
    productId: number;
    productName: string;
    quantity: number;
    isIncluded: boolean;
    salePrice: number;
  }
  const [serviceProductRows, setServiceProductRows] = useState<ServiceProductRow[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState("");

  /* ── Derived ── */
  const margen = useMemo(() => {
    if (!precioVenta || !precioCompra) return 0;
    return ((precioVenta - precioCompra) / precioVenta) * 100;
  }, [precioVenta, precioCompra]);

  const ivaPercent = iva === "excluido" ? 0 : Number(iva);
  const tabs = isProduct ? productTabs : serviceTabs;

  /* ── Load dropdown options ── */
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [cats, areasData, locs, supps, svcCats, svcUnits, pLists, prods] = await Promise.all([
          productCategoriesApi.getAll().catch(() => []),
          productAreasApi.getAll().catch(() => []),
          locationsApi.getAll().catch(() => []),
          suppliersApi.getAll().catch(() => []),
          servicesApi.getCategories().catch(() => ({})),
          servicesApi.getUnits().catch(() => ({})),
          priceListsApi.getAll().catch(() => []),
          productsApi.getAll().catch(() => []),
        ]);
        setCategories(cats);
        setAreas(areasData);
        setLocations(locs);
        setSuppliers(supps);
        setServiceCategoriesMap(svcCats);
        setServiceUnitsMap(svcUnits);
        setAllPriceLists(pLists);
        setAllProducts(prods);
        // Initialize rows for all price lists (empty = no discount applied)
        setPriceListRows(pLists.map((pl) => ({
          priceListId: pl.id,
          name: pl.name,
          discountPercentage: 0,
          customPrice: null,
        })));
      } catch {
        // silently fail, dropdowns will be empty
      }
    };
    loadOptions();

    // Auto-generar SKU para productos nuevos
    if (!isEdit && isProduct) {
      productsApi.getNextSku()
        .then(nextSku => setSku(nextSku))
        .catch(() => {});
    }
  }, []);

  /* ── Load existing data for edit mode ── */
  useEffect(() => {
    if (!isEdit || !entityId) return;
    const loadEntity = async () => {
      try {
        setLoading(true);
        if (isProduct) {
          const p = await productsApi.getById(entityId);
          setNombre(p.name || "");
          setSku(p.sku || "");
          setCodigoBarras(p.barcode || "");
          setMarca(p.brand || "");
          setCategoryId(p.category_id ? String(p.category_id) : "");
          setAreaId(p.area_id ? String(p.area_id) : "");
          setLocationId(p.location_id ? String(p.location_id) : "");
          setSupplierId(p.supplier_id ? String(p.supplier_id) : "");
          setUnidadMedida(p.unit_of_measure || "");
          setDescripcion(p.description || "");
          setPrecioVenta(Number(p.sale_price) || 0);
          setPrecioCompra(Number(p.purchase_price) || 0);
          setIva(p.tax_rate != null ? String(Math.round(Number(p.tax_rate))) : "excluido");
          setStockActual(p.current_stock || 0);
          setStockMinimo(p.min_stock || 0);
          setStockMaximo(p.max_stock || 0);
          setRastrearInventario(p.is_trackable ?? true);
          setCompraAutomatica(p.auto_purchase_enabled ?? false);
          setActivo(p.is_active ?? true);
          if (p.image_url) setImagePreview(p.image_url);
        } else {
          const s = await servicesApi.getById(entityId);
          setNombre(s.name || "");
          setSku(s.slug || "");
          setDescripcion(s.description || "");
          setServiceCategory(s.category || "");
          setUnidadMedida(s.unit || "");
          setPrecioVenta(Number(s.price) || 0);
          setPrecioCompra(Number(s.base_price) || 0);
          setIva(s.tax_rate != null ? String(Math.round(Number(s.tax_rate))) : "excluido");
          setDuracion(s.estimated_duration || 0);
          setActivo(s.is_active ?? true);
          if (s.service_products && s.service_products.length > 0) {
            setServiceProductRows(s.service_products.map((sp: ServiceProduct) => ({
              productId: sp.product_id,
              productName: sp.product?.name || `Producto #${sp.product_id}`,
              quantity: sp.quantity,
              isIncluded: sp.is_included,
              salePrice: sp.product?.sale_price || 0,
            })));
          }
        }
      } catch {
        toast({ title: "Error", description: "No se pudo cargar la información", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadEntity();
  }, [isEdit, entityId, isProduct]);

  /* ── Load price list items for edit mode ── */
  useEffect(() => {
    if (!isEdit || !entityId || allPriceLists.length === 0) return;
    const loadPriceListItems = async () => {
      try {
        // Load each price list with its items and match against this entity
        const updatedRows: PriceListRow[] = allPriceLists.map((pl) => ({
          priceListId: pl.id,
          name: pl.name,
          discountPercentage: 0,
          customPrice: null,
        }));

        // Fetch all price lists with their items
        const detailedLists = await Promise.all(
          allPriceLists.map((pl) => priceListsApi.getById(pl.id).catch(() => null))
        );

        detailedLists.forEach((detail) => {
          if (!detail?.items) return;
          const matchingItem = detail.items.find((item) =>
            isProduct ? item.product_id === entityId : item.service_id === entityId
          );
          if (matchingItem) {
            const row = updatedRows.find((r) => r.priceListId === detail.id);
            if (row) {
              row.discountPercentage = Number(matchingItem.discount_percentage) || 0;
              row.customPrice = matchingItem.custom_price != null ? Number(matchingItem.custom_price) : null;
            }
          }
        });

        setPriceListRows(updatedRows);
      } catch {
        // silently fail
      }
    };
    loadPriceListItems();
  }, [isEdit, entityId, isProduct, allPriceLists]);

  /* ── Price List handlers ── */
  const updatePriceListRow = (priceListId: number, field: "discountPercentage" | "customPrice", value: number | null) => {
    setPriceListRows((prev) =>
      prev.map((r) => (r.priceListId === priceListId ? { ...r, [field]: value } : r))
    );
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;
    try {
      setCreatingList(true);
      const created = await priceListsApi.create({ name: newListName.trim() });
      setAllPriceLists((prev) => [...prev, created]);
      setPriceListRows((prev) => [...prev, {
        priceListId: created.id,
        name: created.name,
        discountPercentage: 0,
        customPrice: null,
      }]);
      setNewListName("");
      toast({ title: "Lista creada", description: `"${created.name}" se creó exitosamente` });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo crear la lista", variant: "destructive" });
    } finally {
      setCreatingList(false);
    }
  };

  const savePriceListItems = async (entityIdToSave: number) => {
    // For each list that has a discount or custom price, sync items
    const listsWithData = priceListRows.filter(
      (r) => r.discountPercentage > 0 || (r.customPrice != null && r.customPrice > 0)
    );
    const listsWithoutData = priceListRows.filter(
      (r) => r.discountPercentage === 0 && (r.customPrice == null || r.customPrice === 0)
    );

    // Sync items for lists that have data
    for (const row of listsWithData) {
      await priceListsApi.syncItems(row.priceListId, [{
        product_id: isProduct ? entityIdToSave : null,
        service_id: !isProduct ? entityIdToSave : null,
        discount_percentage: row.discountPercentage,
        custom_price: row.customPrice,
      }]);
    }

    // For lists that had data removed, sync with 0 to remove
    for (const row of listsWithoutData) {
      await priceListsApi.syncItems(row.priceListId, [{
        product_id: isProduct ? entityIdToSave : null,
        service_id: !isProduct ? entityIdToSave : null,
        discount_percentage: 0,
        custom_price: null,
      }]);
    }
  };

  /* ── Save handler ── */
  const handleSave = useCallback(async () => {
    if (!nombre.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    // SKU se auto-genera en el backend si no se envía

    try {
      setSaving(true);

      let savedEntityId: number | undefined;

      if (isProduct) {
        const data: Partial<Product> = {
          name: nombre.trim(),
          sku: sku.trim(),
          barcode: codigoBarras || null,
          brand: marca || undefined,
          category_id: categoryId ? Number(categoryId) : undefined,
          area_id: areaId ? Number(areaId) : null,
          location_id: locationId ? Number(locationId) : null,
          supplier_id: supplierId ? Number(supplierId) : null,
          unit_of_measure: unidadMedida || "unidad",
          description: descripcion || undefined,
          sale_price: precioVenta,
          purchase_price: precioCompra,
          tax_rate: iva === "excluido" ? null : Number(iva),
          current_stock: stockActual,
          min_stock: stockMinimo,
          max_stock: stockMaximo || null,
          is_trackable: rastrearInventario,
          auto_purchase_enabled: compraAutomatica,
          is_active: activo,
        };

        if (isEdit && entityId) {
          await productsApi.update(entityId, data);
          savedEntityId = entityId;
          toast({ title: "Producto actualizado", description: "Los cambios se guardaron correctamente" });
        } else {
          const created = await productsApi.create(data);
          savedEntityId = created.id;
          toast({ title: "Producto creado", description: "El producto se creó exitosamente" });
        }
      } else {
        const data: Partial<Service> = {
          name: nombre.trim(),
          slug: sku.trim() || undefined,
          description: descripcion || undefined,
          category: serviceCategory || undefined,
          unit: unidadMedida || "servicio",
          price: precioVenta,
          base_price: precioCompra || undefined,
          tax_rate: iva === "excluido" ? null : Number(iva),
          estimated_duration: duracion || undefined,
          is_active: activo,
        };

        if (isEdit && entityId) {
          await servicesApi.update(entityId, data);
          savedEntityId = entityId;
          toast({ title: "Servicio actualizado", description: "Los cambios se guardaron correctamente" });
        } else {
          const created = await servicesApi.create(data);
          savedEntityId = created.id;
          toast({ title: "Servicio creado", description: "El servicio se creó exitosamente" });
        }
      }

      // Save price list items
      if (savedEntityId && priceListRows.length > 0) {
        try {
          await savePriceListItems(savedEntityId);
        } catch {
          toast({ title: "Aviso", description: "Se guardó pero hubo un error con las listas de precios" });
        }
      }

      // Sync service products
      if (savedEntityId && !isProduct) {
        try {
          if (serviceProductRows.length > 0) {
            await servicesApi.syncProducts(savedEntityId, serviceProductRows.map((r) => ({
              product_id: r.productId,
              quantity: r.quantity,
              is_included: r.isIncluded,
            })));
          } else if (isEdit) {
            // Clear all products if editing and none remain
            await servicesApi.syncProducts(savedEntityId, []);
          }
        } catch {
          toast({ title: "Aviso", description: "Se guardó pero hubo un error con los productos del servicio" });
        }
      }

      // Upload image if selected
      if (savedEntityId && imageFile && isProduct) {
        try {
          await productsApi.uploadImage(savedEntityId, imageFile);
        } catch {
          toast({ title: "Aviso", description: "Se guardó pero hubo un error al subir la imagen" });
        }
      }

      router.visit("/admin/products");
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Error al guardar";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [
    nombre, sku, codigoBarras, marca, categoryId, areaId, locationId, supplierId,
    unidadMedida, descripcion, precioVenta, precioCompra, iva, stockActual,
    stockMinimo, stockMaximo, rastrearInventario, compraAutomatica, activo,
    serviceCategory, duracion, isProduct, isEdit, entityId, priceListRows, imageFile,
    serviceProductRows,
  ]);

  if (loading) {
    return (
      <AppLayout>
        <div className="-mx-2 sm:-mx-4 lg:-mx-6 -my-4 sm:-my-6 min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="-mx-2 sm:-mx-4 lg:-mx-6 -my-4 sm:-my-6 min-h-screen bg-background">
        {/* ── Header ── */}
        <header className="bg-card border-b border-border sticky top-14 z-10">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Row 1 */}
            <div className="flex items-center gap-3 py-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => router.visit("/admin/products")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className={`p-2 rounded-lg flex-shrink-0 ${isProduct ? "bg-primary/10" : "bg-purple-500/15"}`}>
                {isProduct ? <Package className="h-5 w-5 text-primary" /> : <Tag className="h-5 w-5 text-purple-600" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-foreground">
                    {isEdit
                      ? isProduct ? "Editar Producto" : "Editar Servicio"
                      : isProduct ? "Nuevo Producto" : "Nuevo Servicio"
                    }
                  </h1>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {isEdit ? "Editando" : "Borrador"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEdit ? "Modifica la información" : "Completa la información"} del {isProduct ? "producto" : "servicio"}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => router.visit("/admin/products")}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Guardar
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs row */}
          <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
            <nav className="flex items-center bg-muted/60 rounded-lg p-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActiveTab = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1 ${isActiveTab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ── Tab Content ── */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4">
          {/* ═══ Información Básica ═══ */}
          {activeTab === "basica" && (
            <Card className="p-6 space-y-6">
              {/* Image upload */}
              <div>
                <Label className="mb-2 block">Imagen del {isProduct ? "producto" : "servicio"}</Label>
                <div className="flex items-start gap-4">
                  <div className="h-28 w-28 rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-contain p-1" />
                    ) : isProduct ? (
                      <><Package className="h-8 w-8 mb-1 opacity-40" /><span className="text-[10px]">Sin imagen</span></>
                    ) : (
                      <><Tag className="h-8 w-8 mb-1 opacity-40" /><span className="text-[10px]">Sin imagen</span></>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
                          return;
                        }
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => imageInputRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" /> Subir imagen
                    </Button>
                    {imagePreview && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => { setImageFile(null); setImagePreview(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}>
                        <X className="h-4 w-4" /> Quitar imagen
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">JPG, PNG o WEBP. Máx 5 MB.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={isProduct ? "Ej: Producto Premium 10kg" : "Ej: Consulta General"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sku">{isProduct ? `SKU: ${sku || "Generando..."}` : "Slug"}</Label>
                  {isProduct ? (
                    <Input id="sku" value={sku || "Generando..."} disabled className="bg-muted cursor-not-allowed" />
                  ) : (
                    <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="consulta-general" />
                  )}
                </div>
                {isProduct && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="codigoBarras">Código de Barras</Label>
                      <Input id="codigoBarras" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} placeholder="7701234567890" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="marca">Marca</Label>
                      <Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej: MarcaX" />
                    </div>
                  </>
                )}
              </div>

              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Clasificación</h3>

              {isProduct ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Combobox
                      value={categoryId}
                      onValueChange={setCategoryId}
                      placeholder="Seleccionar categoría"
                      searchPlaceholder="Buscar categoría..."
                      emptyText="No se encontraron categorías"
                      options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unidad de Medida</Label>
                    <Select value={unidadMedida} onValueChange={setUnidadMedida}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {UNITS_OF_MEASURE.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Área</Label>
                    <Combobox
                      value={areaId}
                      onValueChange={setAreaId}
                      placeholder="Seleccionar área"
                      searchPlaceholder="Buscar área..."
                      emptyText="No se encontraron áreas"
                      options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Combobox
                      value={serviceCategory}
                      onValueChange={setServiceCategory}
                      placeholder="Seleccionar categoría"
                      searchPlaceholder="Buscar categoría..."
                      emptyText="No se encontraron categorías"
                      options={Object.entries(serviceCategoriesMap).map(([key, label]) => ({ value: key, label }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unidad</Label>
                    <Combobox
                      value={unidadMedida}
                      onValueChange={setUnidadMedida}
                      placeholder="Seleccionar unidad"
                      searchPlaceholder="Buscar unidad..."
                      emptyText="No se encontraron unidades"
                      options={
                        Object.entries(serviceUnitsMap).length > 0
                          ? Object.entries(serviceUnitsMap).map(([key, label]) => ({ value: key, label }))
                          : SERVICE_UNITS.map((u) => ({ value: u.value, label: u.label }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duración estimada (minutos)</Label>
                    <Input type="number" value={duracion || ""} onChange={(e) => setDuracion(Number(e.target.value))} placeholder="30" />
                  </div>
                </div>
              )}

              {isProduct && (
                <>
                  <Separator />
                  <h3 className="text-sm font-semibold text-foreground">Ubicación y Proveedor</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Ubicación</Label>
                      <Combobox
                        value={locationId}
                        onValueChange={setLocationId}
                        placeholder="Seleccionar ubicación"
                        searchPlaceholder="Buscar ubicación..."
                        emptyText="No se encontraron ubicaciones"
                        options={locations.map((l) => ({ value: String(l.id), label: `${l.name}${l.code ? ` (${l.code})` : ""}` }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Proveedor por Defecto</Label>
                      <Combobox
                        value={supplierId}
                        onValueChange={setSupplierId}
                        placeholder="Seleccionar proveedor"
                        searchPlaceholder="Buscar proveedor..."
                        emptyText="No se encontraron proveedores"
                        options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={`Descripción del ${isProduct ? "producto" : "servicio"}...`} rows={3} />
              </div>
            </Card>
          )}

          {/* ═══ Precios e IVA ═══ */}
          {activeTab === "precios" && (
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="precioVenta">Precio de Venta *</Label>
                  <Input id="precioVenta" type="text" inputMode="numeric" value={precioVenta ? precioVenta.toLocaleString("es-CO") : ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setPrecioVenta(parseInt(v) || 0); }} placeholder="0" />
                </div>
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label htmlFor="precioCompra">Precio de Compra</Label>
                    <Input id="precioCompra" type="text" inputMode="numeric" value={precioCompra ? precioCompra.toLocaleString("es-CO") : ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setPrecioCompra(parseInt(v) || 0); }} placeholder="0" />
                  </div>
                )}
                {!isProduct && (
                  <div className="space-y-1.5">
                    <Label htmlFor="precioBase">Precio Base</Label>
                    <Input id="precioBase" type="text" inputMode="numeric" value={precioCompra ? precioCompra.toLocaleString("es-CO") : ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setPrecioCompra(parseInt(v) || 0); }} placeholder="0" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>IVA</Label>
                  <Select value={iva} onValueChange={setIva}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {IVA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label>Margen</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm font-medium">
                      {margen > 0 ? (
                        <span className={margen >= 30 ? "text-emerald-600" : margen >= 15 ? "text-amber-600" : "text-destructive"}>
                          {margen.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {precioVenta > 0 && (
                <Card className="bg-muted/30 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Resumen de precios</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Precio base</p>
                      <p className="font-semibold">{formatCurrency(precioVenta)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">IVA ({ivaPercent}%)</p>
                      <p className="font-semibold">{formatCurrency(precioVenta * ivaPercent / 100)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Precio total</p>
                      <p className="font-bold text-primary">{formatCurrency(precioVenta * (1 + ivaPercent / 100))}</p>
                    </div>
                    {isProduct && (
                      <div>
                        <p className="text-muted-foreground text-xs">Costo</p>
                        <p className="font-semibold">{formatCurrency(precioCompra)}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </Card>
          )}

          {/* ═══ Inventario (only for products) ═══ */}
          {activeTab === "inventario" && isProduct && (
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stockActual">Stock Actual</Label>
                  <Input id="stockActual" type="number" value={stockActual || ""} onChange={(e) => setStockActual(Number(e.target.value))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stockMinimo">Stock Mínimo</Label>
                  <Input id="stockMinimo" type="number" value={stockMinimo || ""} onChange={(e) => setStockMinimo(Number(e.target.value))} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stockMaximo">Stock Máximo</Label>
                  <Input id="stockMaximo" type="number" value={stockMaximo || ""} onChange={(e) => setStockMaximo(Number(e.target.value))} placeholder="0" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox id="rastrear" checked={rastrearInventario} onCheckedChange={(v) => setRastrearInventario(!!v)} />
                  <div>
                    <Label htmlFor="rastrear" className="cursor-pointer">Rastrear inventario</Label>
                    <p className="text-xs text-muted-foreground">Controlar las cantidades disponibles de este producto</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="autocompra" checked={compraAutomatica} onCheckedChange={(v) => setCompraAutomatica(!!v)} />
                  <div>
                    <Label htmlFor="autocompra" className="cursor-pointer">Compra automática</Label>
                    <p className="text-xs text-muted-foreground">Generar orden de compra cuando el stock baje del mínimo</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="activo" checked={activo} onCheckedChange={(v) => setActivo(!!v)} />
                  <div>
                    <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
                    <p className="text-xs text-muted-foreground">El {isProduct ? "producto" : "servicio"} estará disponible para la venta</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ═══ Productos del Servicio (only for services) ═══ */}
          {activeTab === "productos" && !isProduct && (
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Productos del Servicio</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Agrega productos que se utilizan al prestar este servicio. Puedes elegir si el costo del producto va incluido en el precio del servicio o se cobra aparte al cliente.
                </p>
              </div>

              {/* Product search and add */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Buscar producto</Label>
                  <Combobox
                    options={allProducts
                      .filter((p) => p.is_active && !serviceProductRows.some((r) => r.productId === p.id))
                      .map((p) => ({
                        value: String(p.id),
                        label: `${p.name}${p.sku ? ` (${p.sku})` : ""}`,
                      }))}
                    value={productSearchTerm}
                    onValueChange={(val) => {
                      const product = allProducts.find((p) => String(p.id) === val);
                      if (product) {
                        setServiceProductRows((prev) => [
                          ...prev,
                          {
                            productId: product.id,
                            productName: product.name,
                            quantity: 1,
                            isIncluded: true,
                            salePrice: Number(product.sale_price) || 0,
                          },
                        ]);
                        setProductSearchTerm("");
                      }
                    }}
                    placeholder="Buscar por nombre o SKU..."
                    searchPlaceholder="Escribe para buscar..."
                    emptyText="No se encontraron productos"
                  />
                </div>
              </div>

              {serviceProductRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-24">Cantidad</TableHead>
                      <TableHead className="w-48">Incluido en servicio</TableHead>
                      <TableHead className="text-right">Precio Venta</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceProductRows.map((row, idx) => (
                      <TableRow key={row.productId}>
                        <TableCell>
                          <span className="font-medium text-sm">{row.productName}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              setServiceProductRows((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: val } : r));
                            }}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={row.isIncluded}
                              onCheckedChange={(checked) => {
                                setServiceProductRows((prev) => prev.map((r, i) => i === idx ? { ...r, isIncluded: checked } : r));
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {row.isIncluded ? "Incluido" : "Cobro aparte"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(row.salePrice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setServiceProductRows((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay productos asociados a este servicio</p>
                  <p className="text-xs mt-1">Usa el buscador de arriba para agregar productos</p>
                </div>
              )}

              {serviceProductRows.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Productos incluidos:</span>
                    <span className="font-medium">{serviceProductRows.filter((r) => r.isIncluded).length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Productos cobro aparte:</span>
                    <span className="font-medium">{serviceProductRows.filter((r) => !r.isIncluded).length}</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* ═══ Lista de Precios ═══ */}
          {activeTab === "listas" && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Listas de Precios</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Asigna descuentos o precios personalizados por lista. Las listas sin datos no aplican a este {isProduct ? "producto" : "servicio"}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nueva lista..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="h-8 w-40"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateNewList()}
                  />
                  <Button size="sm" variant="outline" onClick={handleCreateNewList} disabled={creatingList || !newListName.trim()}>
                    {creatingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Crear
                  </Button>
                </div>
              </div>

              {priceListRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lista</TableHead>
                      <TableHead>Descuento %</TableHead>
                      <TableHead>Precio Personalizado</TableHead>
                      <TableHead>Precio Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceListRows.map((row) => {
                      const base = row.customPrice && row.customPrice > 0 ? row.customPrice : precioVenta;
                      const finalPrice = row.customPrice && row.customPrice > 0
                        ? row.customPrice
                        : precioVenta * (1 - row.discountPercentage / 100);
                      const hasData = row.discountPercentage > 0 || (row.customPrice != null && row.customPrice > 0);
                      return (
                        <TableRow key={row.priceListId} className={hasData ? "" : "opacity-60"}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{row.name}</span>
                              {hasData && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Activa</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={row.discountPercentage || ""}
                              onChange={(e) => updatePriceListRow(row.priceListId, "discountPercentage", Number(e.target.value) || 0)}
                              placeholder="0"
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={row.customPrice ? row.customPrice.toLocaleString("es-CO") : ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                updatePriceListRow(row.priceListId, "customPrice", val ? parseInt(val) : null);
                              }}
                              placeholder={formatCurrency(precioVenta)}
                              className="h-8 w-32"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {hasData ? formatCurrency(finalPrice) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No hay listas de precios creadas. Crea una para comenzar.</p>
              )}
            </Card>
          )}

          {/* ═══ Bodegas (only for products) ═══ */}
          {activeTab === "bodegas" && isProduct && (() => {
            const selectedLocation = locations.find((l) => String(l.id) === locationId);
            const warehouseName = selectedLocation?.warehouse?.name;
            return (
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Stock por Bodega</h3>
                {selectedLocation && warehouseName ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bodega</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead className="text-right">Stock Asignado</TableHead>
                        <TableHead className="text-right">Stock Mínimo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{warehouseName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {selectedLocation.name}{selectedLocation.code ? ` (${selectedLocation.code})` : ""}
                        </TableCell>
                        <TableCell className="text-right font-medium">{stockActual}</TableCell>
                        <TableCell className="text-right">{stockMinimo}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Selecciona una ubicación en la pestaña de Información Básica para ver la bodega asignada.
                  </p>
                )}
              </Card>
            );
          })()}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="sticky bottom-0 bg-card border-t border-border py-3 px-4 z-10">
          <div className="max-w-[1400px] mx-auto flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.visit("/admin/products")}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar {isProduct ? "Producto" : "Servicio"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
