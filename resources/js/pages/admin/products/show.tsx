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
  History,
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Users,
  BarChart3,
  ArrowUpRight,
  Pencil,
  Save,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Camera,
  Search,
  Loader2,
  Trash2,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { productsApi, servicesApi, priceListsApi, inventoryMovementsApi, productCategoriesApi, productAreasApi, locationsApi, suppliersApi } from "@/lib/api";
import type { Product, Service, ServiceProduct, InventoryMovement, ProductAnalytics, ProductCategory, ProductArea, Location, Supplier } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

/* ── Tab config ── */
const productTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "basica", label: "Información", icon: Info },
  { id: "precios", label: "Precios e IVA", icon: DollarSign },
  { id: "inventario", label: "Inventario", icon: Package },
  { id: "listas", label: "Listas de Precios", icon: ListOrdered },
  { id: "bodegas", label: "Bodegas", icon: Warehouse },
  { id: "historial", label: "Historial", icon: History },
];

const serviceTabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "basica", label: "Información", icon: Info },
  { id: "precios", label: "Precios e IVA", icon: DollarSign },
  { id: "productos", label: "Productos", icon: Package },
  { id: "listas", label: "Listas de Precios", icon: ListOrdered },
  { id: "historial", label: "Historial", icon: History },
];

/* ── Historial Sub-component ── */
const movementTypeLabels: Record<string, string> = {
  entry: "Entrada",
  exit: "Salida",
  transfer: "Traslado",
  adjustment: "Ajuste",
  sale: "Venta",
  purchase: "Compra",
  return: "Devolución",
  damage: "Daño",
  loss: "Pérdida",
  other: "Otro",
};

const movementTypeBadgeColors: Record<string, string> = {
  sale: "bg-blue-600 text-white",
  purchase: "bg-green-600 text-white",
  entry: "bg-emerald-600 text-white",
  exit: "bg-red-600 text-white",
  transfer: "bg-purple-600 text-white",
  adjustment: "bg-amber-600 text-white",
  return: "bg-orange-600 text-white",
  damage: "bg-red-800 text-white",
  loss: "bg-gray-600 text-white",
  other: "bg-muted/500 text-white",
};

const fieldLabels: Record<string, string> = {
  purchase_price: "Precio de Compra",
  sale_price: "Precio de Venta",
  tax_rate: "IVA (%)",
  min_stock: "Stock Minimo",
  max_stock: "Stock Maximo",
  name: "Nombre",
  description: "Descripcion",
  brand: "Marca",
  sku: "SKU",
  barcode: "Codigo de Barras",
  unit_of_measure: "Unidad de Medida",
  category: "Categoria",
  area: "Area",
  location: "Ubicacion",
  supplier: "Proveedor",
  is_active: "Activo",
  is_trackable: "Rastreable",
  auto_purchase_enabled: "Compra Automatica",
};

const HistorialTab = ({ movements, isProduct, changeLogs = [] }: { movements: InventoryMovement[]; isProduct: boolean; changeLogs?: any[] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDatePreset = (value: string) => {
    setDatePreset(value);
    const today = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (value === 'last_15_days') {
      const from = new Date(today); from.setDate(from.getDate() - 15);
      setDateFrom(fmt(from)); setDateTo(fmt(today));
    } else if (value === 'current_month') {
      setDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
      setDateTo(fmt(today));
    } else if (value === 'previous_month') {
      setDateFrom(fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
      setDateTo(fmt(new Date(today.getFullYear(), today.getMonth(), 0)));
    } else if (value === 'all') {
      setDateFrom(""); setDateTo("");
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movements.filter((h) => {
      const label = movementTypeLabels[h.type] || h.type;
      const matchesSearch = !q || label.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || (h.notes || "").toLowerCase().includes(q) || (h.created_at || "").includes(q);
      const matchesTipo = !filterTipo || filterTipo === "todos" || h.type === filterTipo;
      const movDate = h.created_at ? h.created_at.substring(0, 10) : "";
      const matchesDateFrom = !dateFrom || movDate >= dateFrom;
      const matchesDateTo = !dateTo || movDate <= dateTo;
      return matchesSearch && matchesTipo && matchesDateFrom && matchesDateTo;
    });
  }, [searchQuery, filterTipo, dateFrom, dateTo, movements]);

  const filteredLogs = useMemo(() => {
    return changeLogs.filter((log) => {
      const logDate = log.created_at ? log.created_at.substring(0, 10) : "";
      const matchesDateFrom = !dateFrom || logDate >= dateFrom;
      const matchesDateTo = !dateTo || logDate <= dateTo;
      return matchesDateFrom && matchesDateTo;
    });
  }, [changeLogs, dateFrom, dateTo]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Movimientos
      const movData = filtered.map((h) => ({
        'Fecha': h.created_at ? new Date(h.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '',
        'Tipo': movementTypeLabels[h.type] || h.type,
        'Referencia': h.reference_id ? `${h.reference_type?.split('\\').pop() || ''} #${h.reference_id}` : '',
        'Costo Unit.': h.unit_cost || '',
        'Precio Venta': h.sale_unit_price || '',
        'Cantidad': h.quantity,
        'Stock Despues': h.stock_after,
        'Notas': h.notes || '',
      }));
      const ws1 = XLSX.utils.json_to_sheet(movData);
      ws1['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Movimientos');

      // Sheet 2: Registro de Cambios
      if (filteredLogs.length > 0) {
        const logData = filteredLogs.map((log: any) => ({
          'Fecha': log.created_at ? new Date(log.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '',
          'Campo': fieldLabels[log.field] || log.field,
          'Valor Anterior': log.old_text || (log.old_value != 0 ? log.old_value : ''),
          'Valor Nuevo': log.new_text || (log.new_value != 0 ? log.new_value : ''),
          'Razon': log.reason || '',
          'Usuario': log.changed_by?.name || '',
        }));
        const ws2 = XLSX.utils.json_to_sheet(logData);
        ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Cambios');
      }

      XLSX.writeFile(wb, `Historial_Completo.xlsx`);
    } catch { /* ignore */ }
  };

  const tipos = useMemo(() => Array.from(new Set(movements.map((h) => h.type))).sort(), [movements]);

  const handleViewDetail = async (movement: InventoryMovement) => {
    try {
      setDetailLoading(true);
      setDialogOpen(true);
      const detail = await inventoryMovementsApi.getById(movement.id);
      setSelectedMovement(detail);
    } catch (error) {
      console.error("Error loading movement detail:", error);
      setSelectedMovement(movement);
    } finally {
      setDetailLoading(false);
    }
  };

  const renderReference = () => {
    if (!selectedMovement?.reference) return null;
    const ref = selectedMovement.reference;
    const type = selectedMovement.reference_type || "";

    // Sale
    if (type.includes("Sale")) {
      return (
        <div className="space-y-3">
          <Separator />
          <h4 className="text-sm font-semibold">Detalle de Venta</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Factura:</span>
            <span
              className="font-medium text-blue-600 hover:underline cursor-pointer"
              onClick={() => router.visit(`/admin/sales/${ref.id}`)}
            >
              {ref.invoice_number || ref.sale_number || `#${ref.id}`}
            </span>
            {ref.client && (
              <>
                <span className="text-muted-foreground">Cliente:</span>
                <span>{ref.client.name}</span>
              </>
            )}
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatCurrency(ref.total_amount || 0)}</span>
            {ref.status && (
              <>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className="w-fit text-xs">{ref.status}</Badge>
              </>
            )}
          </div>
          {ref.items && ref.items.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Productos en la venta:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right">Cant.</TableHead>
                    <TableHead className="text-xs text-right">Precio</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ref.items.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{item.product?.name || item.description || "—"}</TableCell>
                      <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(item.unit_price || item.price || 0)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency((item.quantity || 0) * (item.unit_price || item.price || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    }

    // Purchase
    if (type.includes("InventoryPurchase")) {
      return (
        <div className="space-y-3">
          <Separator />
          <h4 className="text-sm font-semibold">Detalle de Compra</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Orden:</span>
            <span className="font-medium">{ref.purchase_number || `#${ref.id}`}</span>
            {ref.supplier && (
              <>
                <span className="text-muted-foreground">Proveedor:</span>
                <span>{ref.supplier.name}</span>
              </>
            )}
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{formatCurrency(ref.total_amount || 0)}</span>
            {ref.status && (
              <>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className="w-fit text-xs">{ref.status}</Badge>
              </>
            )}
          </div>
          {ref.items && ref.items.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Productos en la compra:</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Producto</TableHead>
                    <TableHead className="text-xs text-right">Pedido</TableHead>
                    <TableHead className="text-xs text-right">Recibido</TableHead>
                    <TableHead className="text-xs text-right">Costo Unit.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ref.items.map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{item.product?.name || "—"}</TableCell>
                      <TableCell className="text-xs text-right">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-xs text-right">{item.quantity_received}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(item.unit_cost || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    }

    // Transfer
    if (type.includes("InventoryTransfer")) {
      return (
        <div className="space-y-3">
          <Separator />
          <h4 className="text-sm font-semibold">Detalle de Traslado</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Traslado:</span>
            <span className="font-medium">{ref.transfer_number || `#${ref.id}`}</span>
            {ref.source_warehouse && (
              <>
                <span className="text-muted-foreground">Origen:</span>
                <span>{ref.source_warehouse.name}</span>
              </>
            )}
            {ref.destination_warehouse && (
              <>
                <span className="text-muted-foreground">Destino:</span>
                <span>{ref.destination_warehouse.name}</span>
              </>
            )}
            {ref.status && (
              <>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant="outline" className="w-fit text-xs">{ref.status}</Badge>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Historial ({filtered.length} movimientos{filteredLogs.length > 0 ? ` + ${filteredLogs.length} cambios` : ''})</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tipo o fecha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tipos.map((t) => (
                <SelectItem key={t} value={t}>{movementTypeLabels[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={handleDatePreset}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Rango de fecha" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todo el historial</SelectItem>
              <SelectItem value="last_15_days">Ultimos 15 dias</SelectItem>
              <SelectItem value="current_month">Mes actual</SelectItem>
              <SelectItem value="previous_month">Mes anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Referencia</TableHead>
            <TableHead className="text-right">Costo Unit.</TableHead>
            <TableHead className="text-right">Precio Venta</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            {isProduct && <TableHead className="text-right">Saldo</TableHead>}
            <TableHead className="text-center w-[60px]">Detalle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isProduct ? 9 : 8} className="text-center py-8 text-muted-foreground">
                No se encontraron movimientos
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((h) => {
              const qty = h.quantity;
              const isPositive = h.type === "entry" || h.type === "purchase" || h.type === "return" || qty > 0;
              const refType = h.reference_type || "";
              let refLabel = "—";
              if (refType.includes("Sale")) refLabel = "Venta";
              else if (refType.includes("InventoryPurchase")) refLabel = "Compra";
              else if (refType.includes("InventoryTransfer")) refLabel = "Traslado";
              else if (refType.includes("InventoryAdjustment")) refLabel = "Ajuste";
              if (h.reference_id && refLabel !== "—") refLabel += ` #${h.reference_id}`;

              return (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{h.created_at ? new Date(h.created_at).toLocaleDateString("es-CO") : "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${movementTypeBadgeColors[h.type] || "bg-muted/500 text-white"}`}>
                      {movementTypeLabels[h.type] || h.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {refType.includes("Sale") && h.reference_id ? (
                      <span
                        className="text-blue-600 hover:underline cursor-pointer"
                        onClick={() => router.visit(`/admin/sales/${h.reference_id}`)}
                      >
                        {refLabel}
                      </span>
                    ) : refLabel}
                  </TableCell>
                  <TableCell className="text-sm text-right">{h.unit_cost ? formatCurrency(h.unit_cost) : "—"}</TableCell>
                  <TableCell className="text-sm text-right">{h.sale_unit_price ? formatCurrency(h.sale_unit_price) : "—"}</TableCell>
                  <TableCell className={`text-right font-medium ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
                    {isPositive ? `+${Math.abs(qty)}` : `-${Math.abs(qty)}`}
                  </TableCell>
                  {isProduct && <TableCell className="text-right font-medium">{h.stock_after}</TableCell>}
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewDetail(h)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* ── Registro de Cambios ── */}
      {filteredLogs.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold text-foreground">Registro de Cambios ({filteredLogs.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>Valor Anterior</TableHead>
                <TableHead>Valor Nuevo</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log: any) => {
                const isNumeric = ['purchase_price', 'sale_price', 'tax_rate', 'min_stock', 'max_stock'].includes(log.field);
                const isPrice = ['purchase_price', 'sale_price'].includes(log.field);
                const oldDisplay = log.old_text || (isPrice ? formatCurrency(log.old_value) : isNumeric ? log.old_value : '—');
                const newDisplay = log.new_text || (isPrice ? formatCurrency(log.new_value) : isNumeric ? log.new_value : '—');
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{log.created_at ? new Date(log.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full text-xs">{fieldLabels[log.field] || log.field}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-destructive">{oldDisplay}</TableCell>
                    <TableCell className="text-sm text-emerald-600 font-medium">{newDisplay}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.changed_by?.name || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Movement Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalle del Movimiento
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
            </div>
          ) : selectedMovement ? (
            <div className="space-y-4">
              {/* Movement info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Fecha:</span>
                <span>{selectedMovement.created_at ? new Date(selectedMovement.created_at).toLocaleString("es-CO") : "—"}</span>

                <span className="text-muted-foreground">Tipo:</span>
                <Badge className={`w-fit text-xs ${movementTypeBadgeColors[selectedMovement.type] || "bg-muted/500 text-white"}`}>
                  {movementTypeLabels[selectedMovement.type] || selectedMovement.type}
                </Badge>

                <span className="text-muted-foreground">Cantidad:</span>
                <span className={`font-medium ${selectedMovement.quantity > 0 || selectedMovement.type === "entry" || selectedMovement.type === "purchase" || selectedMovement.type === "return" ? "text-emerald-600" : "text-destructive"}`}>
                  {(selectedMovement.type === "entry" || selectedMovement.type === "purchase" || selectedMovement.type === "return") ? "+" : "-"}{Math.abs(selectedMovement.quantity)}
                </span>

                {selectedMovement.unit_cost != null && (
                  <>
                    <span className="text-muted-foreground">Costo unitario:</span>
                    <span>{formatCurrency(selectedMovement.unit_cost)}</span>
                  </>
                )}

                <span className="text-muted-foreground">Stock antes:</span>
                <span>{selectedMovement.stock_before}</span>

                <span className="text-muted-foreground">Stock después:</span>
                <span className="font-medium">{selectedMovement.stock_after}</span>

                {selectedMovement.created_by && (
                  <>
                    <span className="text-muted-foreground">Usuario:</span>
                    <span>{selectedMovement.created_by.name}</span>
                  </>
                )}

                {selectedMovement.source_location && (
                  <>
                    <span className="text-muted-foreground">Ubicación origen:</span>
                    <span>{selectedMovement.source_location.name}</span>
                  </>
                )}

                {selectedMovement.destination_location && (
                  <>
                    <span className="text-muted-foreground">Ubicación destino:</span>
                    <span>{selectedMovement.destination_location.name}</span>
                  </>
                )}

                {selectedMovement.notes && (
                  <>
                    <span className="text-muted-foreground">Notas:</span>
                    <span>{selectedMovement.notes}</span>
                  </>
                )}
              </div>

              {/* Reference detail (sale, purchase, transfer) */}
              {renderReference()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

/* ── Props ── */
interface ProductShowProps {
  productId: number;
  tipo?: "producto" | "servicio";
}

/* ── Component ── */
export default function ProductShow({ productId, tipo }: ProductShowProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [priceListData, setPriceListData] = useState<{ name: string; discount: number; customPrice: number | null }[]>([]);

  // Image upload
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeleting, setImageDeleting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Quick edit
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Catalogs for edit selects
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [areas, setAreas] = useState<ProductArea[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [catalogsLoaded, setCatalogsLoaded] = useState(false);

  const isProduct = tipo !== "servicio";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (isProduct) {
        const [productData, analyticsData] = await Promise.all([
          productsApi.getById(productId),
          productsApi.getAnalytics(productId).catch(() => null),
        ]);
        setProduct(productData);
        if (analyticsData) {
          setAnalytics(analyticsData);
          setMovements(analyticsData.movements || []);
        }
        productsApi.getChangeLog(productId).then(setChangeLogs).catch(() => {});
      } else {
        const serviceData = await servicesApi.getById(productId);
        setService(serviceData);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo cargar la información", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [productId, isProduct]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load price list data
  useEffect(() => {
    const loadPriceLists = async () => {
      try {
        const allLists = await priceListsApi.getAll();
        const details = await Promise.all(
          allLists.map((pl) => priceListsApi.getById(pl.id).catch(() => null))
        );
        const rows: { name: string; discount: number; customPrice: number | null }[] = [];
        details.forEach((detail) => {
          if (!detail?.items) return;
          const matchingItem = detail.items.find((item) =>
            isProduct ? item.product_id === productId : item.service_id === productId
          );
          if (matchingItem && (Number(matchingItem.discount_percentage) > 0 || (matchingItem.custom_price != null && Number(matchingItem.custom_price) > 0))) {
            rows.push({
              name: detail.name,
              discount: Number(matchingItem.discount_percentage),
              customPrice: matchingItem.custom_price != null ? Number(matchingItem.custom_price) : null,
            });
          }
        });
        setPriceListData(rows);
      } catch {
        // silently fail
      }
    };
    loadPriceLists();
  }, [productId, isProduct]);

  // Unified data accessors
  const name = isProduct ? product?.name : service?.name;
  const sku = isProduct ? product?.sku : service?.slug;
  const salePrice = isProduct ? (product?.sale_price ?? 0) : (service?.price ?? 0);
  const purchasePrice = product?.purchase_price ?? 0;
  const taxRate = isProduct ? (product?.tax_rate ?? 0) : (service?.tax_rate ?? 0);
  const currentStock = product?.current_stock ?? 0;
  const minStock = product?.min_stock ?? 0;
  const maxStock = product?.max_stock ?? 0;
  const isActive = isProduct ? (product?.is_active ?? true) : (service?.is_active ?? true);
  const brand = product?.brand || "";
  const barcode = product?.barcode || "";
  const description = isProduct ? (product?.description || "") : (service?.description || "");
  const unitOfMeasure = isProduct ? (product?.unit_of_measure || "") : (service?.unit || "");
  const categoryName = isProduct ? (product?.category?.name || "") : (service?.category_name || service?.category || "");
  const areaName = product?.area?.name || "";
  const locationName = product?.location?.name || "";
  const supplierName = product?.supplier?.name || "";
  const isTrackable = product?.is_trackable ?? false;
  const autoPurchase = product?.auto_purchase_enabled ?? false;
  const duration = service?.formatted_duration || (service?.estimated_duration ? `${service.estimated_duration} min` : "");

  const tabs = isProduct ? productTabs : serviceTabs;

  const margen = useMemo(() => {
    if (!salePrice || !purchasePrice) return 0;
    return ((salePrice - purchasePrice) / salePrice) * 100;
  }, [salePrice, purchasePrice]);

  const ivaPercent = taxRate || 0;
  const stockWarning = isProduct && currentStock > 0 && currentStock <= minStock;
  const stockDanger = isProduct && currentStock === 0;

  // Load catalogs when entering edit mode
  const loadCatalogs = useCallback(async () => {
    if (catalogsLoaded) return;
    try {
      const [cats, ars, locs, supps] = await Promise.all([
        productCategoriesApi.getAll(),
        productAreasApi.getAll(),
        isProduct ? locationsApi.getAll() : Promise.resolve([]),
        isProduct ? suppliersApi.getAll() : Promise.resolve([]),
      ]);
      setCategories(cats);
      setAreas(ars);
      setLocations(locs);
      setSuppliersList(supps);
      setCatalogsLoaded(true);
    } catch { /* silent */ }
  }, [catalogsLoaded, isProduct]);

  const startEdit = (section: string, initialData: Record<string, any>) => {
    loadCatalogs();
    setEditingSection(section);
    setEditData(initialData);
  };

  const cancelEdit = () => { setEditingSection(null); setEditData({}); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      if (isProduct && product) {
        const updated = await productsApi.update(product.id, editData);
        setProduct(updated);
      } else if (service) {
        const updated = await servicesApi.update(service.id, editData);
        setService(updated);
      }
      toast({ title: "Guardado exitosamente" });
      setEditingSection(null);
      setEditData({});
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const editField = (key: string, value: any) => setEditData((prev) => ({ ...prev, [key]: value }));

  // Real KPIs from analytics
  const kpis = analytics?.kpis;
  const totalVentas30d = kpis?.total_ventas_30d ?? 0;
  const ingresos30d = kpis?.ingresos_30d ?? 0;
  const cambioVentas = kpis?.cambio_ventas ?? 0;
  const rotacionDias = kpis?.rotacion_dias ?? 0;
  const ganancia30d = kpis?.ganancia_30d ?? 0;

  // Real chart data
  const salesByMonth = analytics?.sales_by_month ?? [];
  const topClients = analytics?.top_clients ?? [];

  if (loading) {
    return (
      <AppLayout>
        <div className="-mx-2 sm:-mx-4 lg:-mx-6 -my-4 sm:-my-6 min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!product && !service) {
    return (
      <AppLayout>
        <div className="-mx-2 sm:-mx-4 lg:-mx-6 -my-4 sm:-my-6 min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Producto no encontrado</p>
          <Button variant="outline" onClick={() => router.visit("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
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
            {/* Row 1: Back + Icon + Name + Badges */}
            <div className="flex items-center gap-3 py-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => router.visit("/admin/products")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className={`p-2 rounded-lg flex-shrink-0 ${isProduct ? "bg-blue-500/15" : "bg-purple-500/15"}`}>
                {isProduct ? <Package className="h-5 w-5 text-blue-600" /> : <Tag className="h-5 w-5 text-purple-600" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate">{name}</h1>
                  <Badge variant="outline" className="text-[10px] h-5 font-mono">{sku}</Badge>
                  <Badge className={`text-[10px] h-5 ${isActive ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                    {isActive ? "Activo" : "Inactivo"}
                  </Badge>
                  {isProduct && stockDanger && (
                    <Badge className="text-[10px] h-5 bg-red-500/15 text-red-700 border-red-500/20">Agotado</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {categoryName}{areaName ? ` • ${areaName}` : ""}{brand ? ` • ${brand}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => router.visit(`/admin/products/${productId}/edit?tipo=${isProduct ? 'producto' : 'servicio'}`)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              </div>
            </div>

            {/* Row 2: Metrics bar */}
            <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-0 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 pr-5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Precio Venta</p>
                    <p className="text-sm font-bold">{formatCurrency(salePrice)}</p>
                  </div>
                </div>
                {isProduct && (
                  <>
                    <div className="flex items-center gap-1.5 px-5 border-l border-border">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">Costo</p>
                        <p className="text-sm font-bold">{formatCurrency(purchasePrice)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 border-l border-border">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">Margen</p>
                        <p className={`text-sm font-bold ${margen >= 30 ? "text-emerald-600" : margen >= 15 ? "text-amber-600" : "text-destructive"}`}>{margen.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-5 border-l border-border">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground leading-none">Stock</p>
                        <p className={`text-sm font-bold ${stockDanger ? "text-destructive" : stockWarning ? "text-amber-600" : "text-foreground"}`}>{currentStock}</p>
                      </div>
                    </div>
                  </>
                )}
                {!isProduct && duration && (
                  <div className="flex items-center gap-1.5 px-5 border-l border-border">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none">Duración</p>
                      <p className="text-sm font-bold">{duration}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Ventas (30d)</p>
                    <p className="text-sm font-bold">{totalVentas30d}</p>
                  </div>
                </div>
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

          {/* ═══ DASHBOARD ═══ */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Ventas (30d)</span>
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">{totalVentas30d}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className={`h-3 w-3 ${cambioVentas >= 0 ? "text-emerald-600" : "text-destructive rotate-90"}`} />
                    <span className={`text-xs font-medium ${cambioVentas >= 0 ? "text-emerald-600" : "text-destructive"}`}>{cambioVentas >= 0 ? "+" : ""}{cambioVentas}%</span>
                    <span className="text-xs text-muted-foreground">vs anterior</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Ingresos (30d)</span>
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(ingresos30d)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className={`h-3 w-3 ${cambioVentas >= 0 ? "text-emerald-600" : "text-destructive rotate-90"}`} />
                    <span className={`text-xs font-medium ${cambioVentas >= 0 ? "text-emerald-600" : "text-destructive"}`}>{cambioVentas >= 0 ? "+" : ""}{cambioVentas}%</span>
                    <span className="text-xs text-muted-foreground">vs anterior</span>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Ganancia (30d)</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(ganancia30d)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Margen: {margen.toFixed(1)}%</p>
                </Card>
                {isProduct ? (
                  <Card className={`p-4 ${stockWarning ? "border-amber-500/30 bg-amber-500/10/50" : stockDanger ? "border-destructive bg-red-500/10/50" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Rotación de Stock</span>
                      {stockWarning ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : stockDanger ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <p className="text-2xl font-bold">{rotacionDias} días</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stockDanger ? "¡Sin stock!" : stockWarning ? "Stock bajo — reabastecer" : `${currentStock} unidades disponibles`}
                    </p>
                  </Card>
                ) : (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Promedio/día</span>
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{(totalVentas30d / 30).toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1">servicios realizados</p>
                  </Card>
                )}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sales Trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tendencia de Ventas (6 meses)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesByMonth.length === 0 ? (
                      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                        Sin datos de ventas en los últimos 6 meses
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={salesByMonth}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 12 }} />
                          <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                            formatter={(value: any, name: any) => [name === "ventas" ? `${value} uds` : formatCurrency(value as number), name === "ventas" ? "Unidades" : "Ingresos"]}
                          />
                          <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Ingresos Mensuales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesByMonth.length === 0 ? (
                      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                        Sin datos de ingresos en los últimos 6 meses
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={salesByMonth}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                            formatter={(value: any) => [formatCurrency(value as number), "Ingresos"]}
                          />
                          <Line type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row: Top Clients + Resumen de Precios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Clients */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <Users className="h-4 w-4" /> Top Clientes (6 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {topClients.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Sin datos de clientes en este periodo
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs text-right">Compras</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topClients.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm py-2">{c.nombre}</TableCell>
                              <TableCell className="text-sm text-right py-2">{c.compras}</TableCell>
                              <TableCell className="text-sm text-right py-2 font-medium">{formatCurrency(c.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Resumen de Precios */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" /> Resumen de Precios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-foreground">Precio de Venta</span>
                          <span className="font-bold text-primary">{formatCurrency(salePrice)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                        </div>
                      </div>
                      {isProduct && purchasePrice > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Costo de Compra</span>
                            <span className="text-foreground">{formatCurrency(purchasePrice)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${salePrice > 0 ? (purchasePrice / salePrice) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}
                      {ivaPercent > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Precio + IVA ({ivaPercent}%)</span>
                            <span className="text-foreground">{formatCurrency(salePrice * (1 + ivaPercent / 100))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {isProduct && margen > 0 && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Margen de ganancia: <span className={`font-medium ${margen >= 30 ? "text-emerald-600" : margen >= 15 ? "text-amber-600" : "text-destructive"}`}>{margen.toFixed(1)}%</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══ Información Básica ═══ */}
          {activeTab === "basica" && (
            <Card className="p-6 space-y-6">
              {/* Section header with edit controls */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Datos Generales</h3>
                {editingSection === "basica" ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={cancelEdit} disabled={saving}>
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveEdit} disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => startEdit("basica", {
                    name: name || "",
                    ...(isProduct ? { sku: sku || "", barcode: barcode || "", brand: brand || "" } : { slug: sku || "" }),
                    category_id: isProduct ? (product?.category_id || "") : undefined,
                    area_id: product?.area_id || "",
                    unit_of_measure: isProduct ? (product?.unit_of_measure || "") : (service?.unit || ""),
                    ...(isProduct ? { location_id: product?.location_id || "", supplier_id: product?.supplier_id || "" } : {}),
                    description: description || "",
                  })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  {editingSection === "basica" ? (
                    <Input value={editData.name || ""} onChange={(e) => editField("name", e.target.value)} className="h-9" />
                  ) : (
                    <Input value={name || ""} readOnly className="bg-muted/30" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  {editingSection === "basica" ? (
                    <Input value={isProduct ? (editData.sku || "") : (editData.slug || "")} onChange={(e) => editField(isProduct ? "sku" : "slug", e.target.value)} className="h-9" />
                  ) : (
                    <Input value={sku || ""} readOnly className="bg-muted/30" />
                  )}
                </div>
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label>Código de Barras</Label>
                    {editingSection === "basica" ? (
                      <Input value={editData.barcode || ""} onChange={(e) => editField("barcode", e.target.value)} className="h-9" />
                    ) : (
                      <Input value={barcode || "—"} readOnly className="bg-muted/30" />
                    )}
                  </div>
                )}
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label>Marca</Label>
                    {editingSection === "basica" ? (
                      <Input value={editData.brand || ""} onChange={(e) => editField("brand", e.target.value)} className="h-9" />
                    ) : (
                      <Input value={brand || "—"} readOnly className="bg-muted/30" />
                    )}
                  </div>
                )}
              </div>

              <Separator />
              <h3 className="text-sm font-semibold text-foreground">Clasificación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Categoría</Label>
                  {editingSection === "basica" ? (
                    <Combobox
                      value={String(editData.category_id || "")}
                      onValueChange={(v) => editField("category_id", v ? parseInt(v) : null)}
                      placeholder="Seleccionar..."
                      searchPlaceholder="Buscar..."
                      emptyText="No se encontraron resultados"
                      className="h-9"
                      options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                    />
                  ) : (
                    <Input value={categoryName || "—"} readOnly className="bg-muted/30" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Área</Label>
                  {editingSection === "basica" ? (
                    <Combobox
                      value={String(editData.area_id || "")}
                      onValueChange={(v) => editField("area_id", v ? parseInt(v) : null)}
                      placeholder="Seleccionar..."
                      searchPlaceholder="Buscar..."
                      emptyText="No se encontraron resultados"
                      className="h-9"
                      options={areas.map((a) => ({ value: String(a.id), label: a.name }))}
                    />
                  ) : (
                    <Input value={areaName || "—"} readOnly className="bg-muted/30" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Unidad de Medida</Label>
                  {editingSection === "basica" ? (
                    <Input value={editData.unit_of_measure || ""} onChange={(e) => editField("unit_of_measure", e.target.value)} className="h-9" />
                  ) : (
                    <Input value={unitOfMeasure || "—"} readOnly className="bg-muted/30" />
                  )}
                </div>
                {!isProduct && duration && (
                  <div className="space-y-1.5">
                    <Label>Duración</Label>
                    <Input value={duration} readOnly className="bg-muted/30" />
                  </div>
                )}
              </div>

              {isProduct && (
                <>
                  <Separator />
                  <h3 className="text-sm font-semibold text-foreground">Ubicación y Proveedor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Ubicación</Label>
                      {editingSection === "basica" ? (
                        <Combobox
                          value={String(editData.location_id || "")}
                          onValueChange={(v) => editField("location_id", v ? parseInt(v) : null)}
                          placeholder="Seleccionar..."
                          searchPlaceholder="Buscar..."
                          emptyText="No se encontraron resultados"
                          className="h-9"
                          options={locations.map((l) => ({ value: String(l.id), label: l.name }))}
                        />
                      ) : (
                        <Input value={locationName || "—"} readOnly className="bg-muted/30" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Proveedor</Label>
                      {editingSection === "basica" ? (
                        <Combobox
                          value={String(editData.supplier_id || "")}
                          onValueChange={(v) => editField("supplier_id", v ? parseInt(v) : null)}
                          placeholder="Seleccionar..."
                          searchPlaceholder="Buscar..."
                          emptyText="No se encontraron resultados"
                          className="h-9"
                          options={suppliersList.map((s) => ({ value: String(s.id), label: s.name }))}
                        />
                      ) : (
                        <Input value={supplierName || "—"} readOnly className="bg-muted/30" />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Product/Service image */}
              <Separator />
              <div>
                <Label className="mb-2 block">Imagen</Label>
                <div className="flex items-start gap-4">
                  <div className="h-28 w-28 rounded-lg border-2 border-border bg-muted/20 flex flex-col items-center justify-center overflow-hidden shrink-0">
                    {product?.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-1" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast({ title: "Error", description: "La imagen no debe superar 5MB", variant: "destructive" });
                          return;
                        }
                        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                          toast({ title: "Error", description: "Solo se permiten imágenes JPG, PNG o WebP", variant: "destructive" });
                          return;
                        }
                        setImageUploading(true);
                        try {
                          const updated = await productsApi.uploadImage(product!.id, file);
                          setProduct((prev) => prev ? { ...prev, image_url: updated.image_url } : prev);
                          toast({ title: "Imagen actualizada" });
                        } catch {
                          toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
                        } finally {
                          setImageUploading(false);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => imageInputRef.current?.click()} disabled={imageUploading}>
                      {imageUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</> : <><Camera className="h-4 w-4" /> Cambiar imagen</>}
                    </Button>
                    {product?.image_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={imageDeleting}
                        onClick={async () => {
                          setImageDeleting(true);
                          try {
                            await productsApi.deleteImage(product!.id);
                            setProduct((prev) => prev ? { ...prev, image_url: undefined } : prev);
                            toast({ title: "Imagen eliminada" });
                          } catch {
                            toast({ title: "Error", description: "No se pudo eliminar la imagen", variant: "destructive" });
                          } finally {
                            setImageDeleting(false);
                          }
                        }}
                      >
                        {imageDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Eliminando...</> : <><Trash2 className="h-4 w-4" /> Eliminar</>}
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">JPG, PNG o WEBP. Máx 5 MB.</p>
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                {editingSection === "basica" ? (
                  <Textarea value={editData.description || ""} onChange={(e) => editField("description", e.target.value)} rows={3} />
                ) : (
                  <Textarea value={description || "—"} readOnly className="bg-muted/30" rows={3} />
                )}
              </div>
            </Card>
          )}

          {/* ═══ Precios e IVA ═══ */}
          {activeTab === "precios" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Precios e IVA</h3>
                {editingSection === "precios" ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={cancelEdit} disabled={saving}>
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveEdit} disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => startEdit("precios", {
                    sale_price: salePrice,
                    ...(isProduct ? { purchase_price: purchasePrice } : { price: salePrice }),
                    tax_rate: taxRate,
                  })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Precio de Venta</Label>
                  {editingSection === "precios" ? (
                    <Input
                      type="text" inputMode="numeric" className="h-9"
                      value={(isProduct ? editData.sale_price : editData.price) ? Math.round(Number(isProduct ? editData.sale_price : editData.price)).toLocaleString("es-CO") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, "");
                        editField(isProduct ? "sale_price" : "price", parseInt(raw) || 0);
                      }}
                    />
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-bold text-primary">{formatCurrency(salePrice)}</div>
                  )}
                </div>
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label>Precio de Compra</Label>
                    {editingSection === "precios" ? (
                      <Input
                        type="text" inputMode="numeric" className="h-9"
                        value={editData.purchase_price ? Math.round(Number(editData.purchase_price)).toLocaleString("es-CO") : ""}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          editField("purchase_price", parseInt(raw) || 0);
                        }}
                      />
                    ) : (
                      <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">{formatCurrency(purchasePrice)}</div>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>IVA</Label>
                  {editingSection === "precios" ? (
                    <Select value={String(editData.tax_rate ?? 0)} onValueChange={(v) => editField("tax_rate", parseFloat(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="0">Excluido (0%)</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="19">19%</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm">{ivaPercent === 0 ? "Excluido" : `${ivaPercent}%`}</div>
                  )}
                </div>
                {isProduct && (
                  <div className="space-y-1.5">
                    <Label>Margen</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-bold">
                      <span className={margen >= 30 ? "text-emerald-600" : margen >= 15 ? "text-amber-600" : "text-destructive"}>{margen.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>

              <Card className="bg-muted/30 p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Resumen de precios</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Precio base</p>
                    <p className="font-semibold">{formatCurrency(salePrice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">IVA ({ivaPercent}%)</p>
                    <p className="font-semibold">{formatCurrency(salePrice * ivaPercent / 100)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Precio total</p>
                    <p className="font-bold text-primary">{formatCurrency(salePrice * (1 + ivaPercent / 100))}</p>
                  </div>
                  {isProduct && (
                    <div>
                      <p className="text-muted-foreground text-xs">Costo</p>
                      <p className="font-semibold">{formatCurrency(purchasePrice)}</p>
                    </div>
                  )}
                </div>
              </Card>
            </Card>
          )}

          {/* ═══ Inventario (only for products) ═══ */}
          {activeTab === "inventario" && isProduct && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Configuración de Inventario</h3>
                {editingSection === "inventario" ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={cancelEdit} disabled={saving}>
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={saveEdit} disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => startEdit("inventario", {
                    min_stock: minStock,
                    max_stock: maxStock,
                    is_trackable: isTrackable,
                    auto_purchase_enabled: autoPurchase,
                  })}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Stock Actual</Label>
                  <div className={`h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm font-bold ${stockDanger ? "text-destructive" : stockWarning ? "text-amber-600" : ""}`}>{currentStock}</div>
                </div>
                <div className="space-y-1.5">
                  <Label>Stock Mínimo</Label>
                  {editingSection === "inventario" ? (
                    <Input type="number" className="h-9" value={editData.min_stock ?? 0} onChange={(e) => editField("min_stock", parseInt(e.target.value) || 0)} />
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm">{minStock}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Stock Máximo</Label>
                  {editingSection === "inventario" ? (
                    <Input type="number" className="h-9" value={editData.max_stock ?? 0} onChange={(e) => editField("max_stock", parseInt(e.target.value) || 0)} />
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted/30 text-sm">{maxStock || "—"}</div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={editingSection === "inventario" ? (editData.is_trackable ?? false) : isTrackable}
                    disabled={editingSection !== "inventario"}
                    onCheckedChange={editingSection === "inventario" ? (v) => editField("is_trackable", v === true) : undefined}
                  />
                  <div>
                    <Label>Rastrear inventario</Label>
                    <p className="text-xs text-muted-foreground">Controlar las cantidades disponibles</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={editingSection === "inventario" ? (editData.auto_purchase_enabled ?? false) : autoPurchase}
                    disabled={editingSection !== "inventario"}
                    onCheckedChange={editingSection === "inventario" ? (v) => editField("auto_purchase_enabled", v === true) : undefined}
                  />
                  <div>
                    <Label>Compra automática</Label>
                    <p className="text-xs text-muted-foreground">Generar orden de compra al llegar al mínimo</p>
                  </div>
                </div>
              </div>

              {/* Stock level indicator */}
              {maxStock && maxStock > 0 && (
                <Card className="bg-muted/30 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3">Nivel de Stock</h4>
                  <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stockDanger ? "bg-destructive" : stockWarning ? "bg-amber-500/100" : "bg-emerald-500/100"}`}
                      style={{ width: `${Math.min((currentStock / maxStock) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0</span>
                    <span className="text-amber-600">Mín: {minStock}</span>
                    <span>Máx: {maxStock}</span>
                  </div>
                </Card>
              )}
            </Card>
          )}

          {/* ═══ Productos del Servicio ═══ */}
          {activeTab === "productos" && !isProduct && (() => {
            const spRows = service?.service_products || [];
            return (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Productos del Servicio</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Productos asociados que se utilizan al prestar este servicio.
                    </p>
                  </div>
                  {spRows.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => router.visit(`/admin/products/${productId}/edit?tipo=servicio`)}>
                      <Pencil className="h-4 w-4 mr-1" /> Editar
                    </Button>
                  )}
                </div>
                {spRows.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-center">Cantidad</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spRows.map((sp: ServiceProduct) => {
                          const productPrice = sp.product?.sale_price || 0;
                          return (
                            <TableRow key={sp.id}>
                              <TableCell>
                                <span className="font-medium text-sm">{sp.product?.name || `Producto #${sp.product_id}`}</span>
                              </TableCell>
                              <TableCell className="text-center">{sp.quantity}</TableCell>
                              <TableCell>
                                {sp.is_included ? (
                                  <Badge variant="secondary" className="text-[10px]">Incluido</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Cobro aparte</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(productPrice)}</TableCell>
                              <TableCell className="text-right text-sm font-medium">{formatCurrency(productPrice * sp.quantity)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="border-t border-border pt-3 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Productos incluidos:</span>
                        <span className="font-medium">{spRows.filter((r: ServiceProduct) => r.is_included).length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Productos cobro aparte:</span>
                        <span className="font-medium">{spRows.filter((r: ServiceProduct) => !r.is_included).length}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No hay productos asociados a este servicio</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => router.visit(`/admin/products/${productId}/edit?tipo=servicio`)}>
                      <Pencil className="h-4 w-4 mr-1" /> Agregar Productos
                    </Button>
                  </div>
                )}
              </Card>
            );
          })()}

          {/* ═══ Lista de Precios ═══ */}
          {activeTab === "listas" && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Listas de Precios</h3>
              {priceListData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lista</TableHead>
                      <TableHead className="text-right">Precio Base</TableHead>
                      <TableHead className="text-right">Descuento %</TableHead>
                      <TableHead className="text-right">Precio Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceListData.map((pl, idx) => {
                      const finalPrice = pl.customPrice && pl.customPrice > 0
                        ? pl.customPrice
                        : salePrice * (1 - pl.discount / 100);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{pl.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(salePrice)}</TableCell>
                          <TableCell className="text-right">
                            {pl.customPrice && pl.customPrice > 0
                              ? <span className="text-muted-foreground">Precio fijo</span>
                              : `${pl.discount}%`}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatCurrency(finalPrice)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Este {isProduct ? "producto" : "servicio"} no tiene listas de precios asignadas.
                </p>
              )}
            </Card>
          )}

          {/* ═══ Bodegas ═══ */}
          {activeTab === "bodegas" && isProduct && (
            <Card className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Stock por Bodega</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bodega</TableHead>
                    <TableHead className="text-right">Stock Asignado</TableHead>
                    <TableHead className="text-right">Stock Mínimo</TableHead>
                    <TableHead className="text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Bodega Principal</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{currentStock}</TableCell>
                    <TableCell className="text-right">{minStock}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={stockWarning || stockDanger ? "bg-amber-500/15 text-amber-700 border-amber-500/20" : "bg-emerald-500/15 text-emerald-700 border-emerald-500/20"}>
                        {stockWarning || stockDanger ? "Bajo" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )}

          {/* ═══ Historial ═══ */}
          {activeTab === "historial" && (
            <HistorialTab movements={movements} isProduct={isProduct} changeLogs={changeLogs} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
