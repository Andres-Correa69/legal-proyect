import { useState, useMemo, useCallback } from "react";
import { Head, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import {
  ChevronRight,
  Search,
  Heart,
  List,
  BarChart3,
  Receipt,
  Calculator,
  Wallet,
  Users,
  Package,
  Boxes,
  ShoppingBag,
  ArrowUpAZ,
  Clock,
  DollarSign,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/layouts/app-layout";
import type { SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReporteItem {
  id: string;
  title: string;
  path: string;
  category: string;
}

interface ReportesGroup {
  groupTitle: string;
  items: ReporteItem[];
}

const FAVORITES_KEY = "reportes_favorites";
const USAGE_KEY = "reportes_usage";

type SortOption = "default" | "alphabetical" | "frequent";

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string; borderColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  "Facturación": { bg: "bg-blue-500/100/10", text: "text-blue-600", borderColor: "#3b82f6", icon: Receipt },
  "Caja": { bg: "bg-green-500/100/10", text: "text-green-600", borderColor: "#22c55e", icon: Wallet },
  "Nómina": { bg: "bg-indigo-500/100/10", text: "text-indigo-600", borderColor: "#6366f1", icon: DollarSign },
  "Impuestos": { bg: "bg-amber-500/100/10", text: "text-amber-600", borderColor: "#f59e0b", icon: Calculator },
  "Clientes": { bg: "bg-violet-500/10", text: "text-violet-600", borderColor: "#8b5cf6", icon: Users },
  "Inventario": { bg: "bg-teal-500/100/10", text: "text-teal-600", borderColor: "#14b8a6", icon: Boxes },
  "Productos": { bg: "bg-rose-500/10", text: "text-rose-600", borderColor: "#f43f5e", icon: ShoppingBag },
  "Servicios": { bg: "bg-pink-500/100/10", text: "text-pink-600", borderColor: "#ec4899", icon: Package },
  "Ordenes de Servicio": { bg: "bg-cyan-500/10", text: "text-cyan-600", borderColor: "#06b6d4", icon: Wrench },
};

const getReportesConfig = (options?: { serviceOrdersEnabled?: boolean }): ReportesGroup[] => {
  const reportesFacturacion: ReporteItem[] = [
    { id: "facturas", title: "Facturas", path: "/admin/sales", category: "Facturación" },
    { id: "informe-facturacion", title: "Informe de Facturación", path: "/admin/reports/sales-products", category: "Facturación" },
    { id: "informe-comisiones", title: "Informe de Comisiones", path: "/admin/reports/commissions", category: "Facturación" },
    { id: "pagos", title: "Pagos", path: "/admin/reports/payments", category: "Facturación" },
    { id: "entradas", title: "Entradas", path: "/admin/reports/entries", category: "Facturación" },
    { id: "gastos", title: "Gastos", path: "/admin/reports/expenses", category: "Facturación" },
    { id: "ingresos-egresos", title: "Ingresos/Egresos", path: "/admin/reports/income-expenses", category: "Facturación" },
    { id: "distribucion-gastos", title: "Distribución de Gastos por Factura", path: "/admin/reports/expense-distribution", category: "Facturación" },
    { id: "ventas-productos", title: "Informe de Ventas Productos/Servicios", path: "/admin/reports/sales-products", category: "Facturación" },
    { id: "utilidad-productos", title: "Informe de Utilidad de Productos", path: "/admin/reports/product-profit", category: "Facturación" },
    { id: "crecimiento", title: "Crecimiento mes a mes", path: "/admin/reports/monthly-growth", category: "Facturación" },
  ];

  const reportesCaja: ReporteItem[] = [
    { id: "cierres-caja", title: "Cierres de Caja", path: "/admin/cash-closures", category: "Caja" },
    { id: "caja-actual", title: "Caja Actual", path: "/admin/cash-reports", category: "Caja" },
    { id: "caja-mayor", title: "Caja Mayor", path: "/admin/cash-reports", category: "Caja" },
  ];

  const reportesImpuestos: ReporteItem[] = [
    { id: "informe-impuestos", title: "Informe de Impuestos", path: "/admin/reports/tax-collection", category: "Impuestos" },
  ];

  const reportesClientes: ReporteItem[] = [
    { id: "clientes-frecuentes", title: "Clientes Frecuentes", path: "/admin/reports/top-clients", category: "Clientes" },
  ];

  const reportesInventario: ReporteItem[] = [
    { id: "informe-inventario", title: "Informe de Inventario", path: "/admin/reports/inventory", category: "Inventario" },
    { id: "historial-costos", title: "Historial de Costos", path: "/admin/reports/cost-history", category: "Inventario" },
    { id: "historial-precios-venta", title: "Historial de Precios de Venta", path: "/admin/reports/sale-price-history", category: "Inventario" },
  ];

  const reportesProductos: ReporteItem[] = [
    { id: "productos-mas-vendidos", title: "Productos Más Vendidos", path: "/admin/reports/best-sellers", category: "Productos" },
  ];

  const reportesServicios: ReporteItem[] = [
    { id: "servicios-mas-vendidos", title: "Servicios Más Vendidos", path: "/admin/reports/best-sellers", category: "Servicios" },
  ];

  const reportesOrdenesServicio: ReporteItem[] = options?.serviceOrdersEnabled ? [
    { id: "ordenes-servicio", title: "Ordenes de Servicio", path: "/admin/service-orders", category: "Ordenes de Servicio" },
  ] : [];

  const allItems = [
    ...reportesFacturacion,
    ...reportesCaja,
    ...reportesImpuestos,
    ...reportesClientes,
    ...reportesInventario,
    ...reportesProductos,
    ...reportesServicios,
    ...reportesOrdenesServicio,
  ];

  const groupedByCategory = allItems.reduce((acc, item) => {
    const existing = acc.find(g => g.groupTitle === item.category);
    if (existing) {
      existing.items.push(item);
    } else {
      acc.push({ groupTitle: item.category, items: [item] });
    }
    return acc;
  }, [] as ReportesGroup[]);

  return groupedByCategory;
};

interface ItemCardProps {
  item: ReporteItem;
  isFavorite: boolean;
  onNavigate: (path: string, itemId: string) => void;
  onToggleFavorite: (id: string) => void;
}

const ItemCard = ({ item, isFavorite, onNavigate, onToggleFavorite }: ItemCardProps) => {
  const colorConfig = categoryColors[item.category] || { bg: "bg-muted/500/10", text: "text-muted-foreground", borderColor: "#6b7280", icon: BarChart3 };
  const CategoryIcon = colorConfig.icon;

  return (
    <div
      className="bg-card border border-border border-l-4 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
      style={{ borderLeftColor: colorConfig.borderColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorConfig.bg}`}>
          <CategoryIcon className={`h-5 w-5 ${colorConfig.text}`} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="p-1.5 rounded-full hover:bg-red-500/10 transition-colors"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
          />
        </button>
      </div>
      <button
        onClick={() => onNavigate(item.path, item.id)}
        className="w-full text-left group"
      >
        <h3 className="font-medium text-foreground text-sm mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {item.title}
        </h3>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${colorConfig.bg} ${colorConfig.text} border-0`}>
            {item.category}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    </div>
  );
};

export default function ReportesPage() {
  const { auth } = usePage<SharedData>().props;
  const currentUser = auth.user;
  const companySettings = (currentUser?.company?.settings ?? {}) as Record<string, any>;
  const serviceOrdersEnabled = companySettings.service_orders_enabled === true && hasPermission("service-orders.view", currentUser);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const [favorites, setFavorites] = useState<string[]>(() => {
    const stored = localStorage.getItem(`${FAVORITES_KEY}_facturacion`);
    return stored ? JSON.parse(stored) : [];
  });

  const [usageCount, setUsageCount] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem(`${USAGE_KEY}_facturacion`);
    return stored ? JSON.parse(stored) : {};
  });

  const configGroups = useMemo(() => getReportesConfig({ serviceOrdersEnabled }), [serviceOrdersEnabled]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = configGroups.map(group => group.groupTitle);
    return ["all", ...cats];
  }, [configGroups]);

  const trackUsage = useCallback((id: string) => {
    setUsageCount(prev => {
      const newUsage = { ...prev, [id]: (prev[id] || 0) + 1 };
      localStorage.setItem(`${USAGE_KEY}_facturacion`, JSON.stringify(newUsage));
      return newUsage;
    });
  }, []);

  const handleNavigate = useCallback((path: string, itemId: string) => {
    trackUsage(itemId);
    router.visit(path);
  }, [trackUsage]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id];
      localStorage.setItem(`${FAVORITES_KEY}_facturacion`, JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const allItems = useMemo(() => {
    return configGroups.flatMap(group => group.items);
  }, [configGroups]);

  const sortItems = useCallback(<T extends { id: string; title: string }>(items: T[]): T[] => {
    if (sortBy === "alphabetical") {
      return [...items].sort((a, b) => a.title.localeCompare(b.title, 'es'));
    }
    if (sortBy === "frequent") {
      return [...items].sort((a, b) => (usageCount[b.id] || 0) - (usageCount[a.id] || 0));
    }
    return items;
  }, [sortBy, usageCount]);

  const filteredGroups = useMemo(() => {
    let groups = configGroups;

    // Filter by category first
    if (selectedCategory !== "all") {
      groups = groups.filter(group => group.groupTitle === selectedCategory);
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups
        .map(group => {
          const filteredItems = group.items.filter(item =>
            item.title.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
          );
          return filteredItems.length > 0 ? { ...group, items: filteredItems } : null;
        })
        .filter(Boolean) as ReportesGroup[];
    }

    // Apply sorting to items within each group
    return groups.map(group => ({
      ...group,
      items: sortItems(group.items)
    }));
  }, [searchQuery, configGroups, selectedCategory, sortItems]);

  const favoriteItems = useMemo(() => {
    let items = allItems.filter(item => favorites.includes(item.id));

    // Filter favorites by category if selected
    if (selectedCategory !== "all") {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter favorites by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    return sortItems(items);
  }, [allItems, favorites, selectedCategory, searchQuery, sortItems]);

  const totalResults = useMemo(() => {
    return filteredGroups.reduce((acc, group) => acc + group.items.length, 0);
  }, [filteredGroups]);

  const isSearching = searchQuery.trim().length > 0;
  const isFiltering = selectedCategory !== "all";
  const isSorting = sortBy !== "default";

  return (
    <AppLayout title="Reportes">
      <Head title="Reportes" />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Card className="shadow-xl p-4 sm:p-6">
            {/* Search Bar, Category Filter and Sort */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar reportes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    {categories.map((category) => {
                      const colorConfig = category !== "all" ? categoryColors[category] : null;
                      const CategoryIcon = colorConfig?.icon;
                      return (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            {CategoryIcon && (
                              <CategoryIcon className={`h-4 w-4 ${colorConfig?.text}`} />
                            )}
                            <span>{category === "all" ? "Todas las categorías" : category}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="default">
                      <div className="flex items-center gap-2">
                        <List className="h-4 w-4 text-muted-foreground" />
                        <span>Por defecto</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="alphabetical">
                      <div className="flex items-center gap-2">
                        <ArrowUpAZ className="h-4 w-4 text-blue-500" />
                        <span>Alfabético</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="frequent">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>Más usados</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {(isSearching || isFiltering || isSorting) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSortBy("default");
                    }}
                    className="text-xs whitespace-nowrap"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="todos" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Todos
                </TabsTrigger>
                <TabsTrigger value="favoritos" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Favoritos ({favorites.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-6">
                {/* Filter results indicator */}
                {(isSearching || isFiltering) && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                    </span>
                    {isFiltering && (
                      <Badge variant="secondary" className={`${categoryColors[selectedCategory]?.bg} ${categoryColors[selectedCategory]?.text} border-0`}>
                        {selectedCategory}
                      </Badge>
                    )}
                    {isSearching && (
                      <span className="text-sm font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded">
                        "{searchQuery}"
                      </span>
                    )}
                  </div>
                )}

                {filteredGroups.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-medium text-foreground">No se encontraron resultados</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">Intenta con otros términos o categorías</p>
                    <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                      Limpiar filtros
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {filteredGroups.map((group) => {
                      const colorConfig = categoryColors[group.groupTitle] || { bg: "bg-muted/500/10", text: "text-muted-foreground", border: "border-l-gray-500", icon: BarChart3 };
                      const GroupIcon = colorConfig.icon;
                      return (
                        <section key={group.groupTitle}>
                          <div className="flex items-center gap-2 mb-4 px-1">
                            <div className={`p-1.5 rounded-md ${colorConfig.bg}`}>
                              <GroupIcon className={`h-4 w-4 ${colorConfig.text}`} />
                            </div>
                            <h2 className={`text-sm font-semibold ${colorConfig.text}`}>
                              {group.groupTitle}
                            </h2>
                            <span className="text-xs text-muted-foreground">({group.items.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {group.items.map((item) => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                isFavorite={favorites.includes(item.id)}
                                onNavigate={handleNavigate}
                                onToggleFavorite={toggleFavorite}
                              />
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favoritos" className="mt-6">
                {favoriteItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-4 rounded-full bg-red-500/10 w-fit mx-auto mb-4">
                      <Heart className="h-8 w-8 text-red-300" />
                    </div>
                    <h3 className="text-base font-medium text-foreground">Sin favoritos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Marca reportes con el corazón para agregarlos aquí
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {favoriteItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        isFavorite={true}
                        onNavigate={handleNavigate}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
