import { useState, useMemo, memo, useCallback, useRef, useEffect } from "react";
import { Link, router } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Menu,
  MoreVertical,
  Grid3X3,
  CalendarDays,
  KeyRound,
  UserCircle,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
  Shield,
  CircleHelp,
  Moon,
  Sun,
  Cog,
  MessageSquare,
  Video,
  Globe,
  MessageCircle,
  Tag,
  Headphones,
  Volume2,
  VolumeX,
  BellRing,
  Package,
  TrendingDown,
  Users,
  ShoppingCart,
  Target,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Cake,
} from "lucide-react";
import {
  toolsItems,
  toolsDescription,
  calendarMenuItems,
  calendarTitle,
  calendarSubtitle,
  alertCategoryConfigs,
  purchaseAlertCategoryConfigs,
} from "@/config/header.config";
import type { User } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { authApi } from "@/lib/api";
import { useAppearance } from "@/hooks/use-appearance";
import { useHeaderAlerts } from "@/hooks/use-header-alerts";
import { useCalendarReminders } from "@/hooks/use-calendar-reminders";
import { useCompanyAlerts } from "@/hooks/use-company-alerts";
import { SwitchBranchDialog } from "@/components/layout/SwitchBranchDialog";
import { useBirthdayAlerts } from "@/hooks/use-birthday-alerts";
import { useChatUnread } from "@/hooks/use-chat-unread";

import type { AlertRuleType, AlertLog } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: NavItem[];
}

interface SearchResult {
  name: string;
  href: string;
  icon: React.ElementType;
  parentName?: string;
}

interface AppHeaderProps {
  title?: string;
  user?: User;
  navigation?: NavItem[];
  isSidebarExpanded: boolean;
  onToggleSidebar: () => void;
  isMobileMenuOpen?: boolean;
  onShow2FADialog?: () => void;
}

type MobileView = "main" | "tools" | "notifications" | "calendar" | "user" | "search" | "settings";

export const AppHeader = memo(({
  title,
  user,
  navigation = [],
  isSidebarExpanded,
  onToggleSidebar,
  isMobileMenuOpen = false,
  onShow2FADialog,
}: AppHeaderProps) => {
  const { theme, setTheme } = useAppearance();
  const birthdayMsgTemplate = (user?.company?.settings?.birthday_message as string) || "¡Feliz cumpleaños {nombre}! 🎂 Te enviamos un cordial saludo. ¡Que tengas un excelente día!";
  const [soundEnabled, setSoundEnabledState] = useState(() => isSoundEnabled());
  const [activeNotificationTab, setActiveNotificationTab] = useState<"reminders" | "alerts" | "company">("reminders");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState<MobileView>("main");
  const [selectedAlertLog, setSelectedAlertLog] = useState<AlertLog | null>(null);
  const [alertDetailModal, setAlertDetailModal] = useState<{ type: 'sale' | 'purchase' | 'company'; category: string; title: string; items: any[]; color: string; route: string } | null>(null);
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [switchBranchOpen, setSwitchBranchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter tools by permission
  const filteredToolsItems = useMemo(() =>
    toolsItems.filter((tool) => !tool.permission || hasPermission(tool.permission, user)),
    [user]
  );

  // Flatten navigation + tools into searchable items
  const searchableItems = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = [];
    // Add navigation items (already permission-filtered)
    navigation.forEach((item) => {
      items.push({ name: item.name, href: item.href, icon: item.icon });
      if (item.children) {
        item.children.forEach((child) => {
          items.push({ name: child.name, href: child.href, icon: child.icon, parentName: item.name });
        });
      }
    });
    // Add tools items (quick access, permission-filtered)
    filteredToolsItems.forEach((tool) => {
      if (tool.path) {
        items.push({ name: tool.label, href: tool.path, icon: tool.icon, parentName: "Herramientas" });
      }
    });
    // Deduplicate by href
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }, [navigation]);

  // Filter results based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return searchableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.parentName?.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchQuery, searchableItems]);

  const handleSearchSelect = useCallback((href: string) => {
    router.visit(href);
    setSearchQuery("");
    setIsSearchOpen(false);
  }, []);

  // Close search results on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        if (!searchQuery) setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  const {
    alertData,
    purchaseAlertData,
    totalAlerts: invoiceAlertCount,
    totalSalesAlerts,
    totalPurchaseAlerts,
    isRead: alertsRead,
    markAsRead: markAlertsAsRead,
    onAlertClick,
    isLoading: alertsLoading,
  } = useHeaderAlerts();

  const {
    reminders,
    pendingCount: calendarPendingCount,
    isRead: calendarRead,
    markAsRead: markCalendarAsRead,
    markOneRead,
    markAllRead,
    dismissOne,
  } = useCalendarReminders();

  const {
    recentLogs: companyAlertLogs,
    totalAlerts: companyAlertCount,
    isLoading: companyAlertsLoading,
  } = useCompanyAlerts();

  const {
    birthdayData,
    totalBirthdays: birthdayCount,
  } = useBirthdayAlerts();

  const { unreadCount: chatUnreadCount } = useChatUnread();

  const COMPANY_ALERT_ICONS: Record<AlertRuleType, { icon: typeof Package; color: string; bg: string }> = {
    low_stock: { icon: Package, color: "text-orange-600", bg: "bg-orange-500/100/10" },
    sales_decrease: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-500/100/10" },
    inactive_clients: { icon: Users, color: "text-violet-600", bg: "bg-violet-500/10" },
    no_movement_products: { icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-500/100/10" },
    sales_target: { icon: Target, color: "text-blue-600", bg: "bg-blue-500/100/10" },
    upcoming_invoices: { icon: FileText, color: "text-cyan-600", bg: "bg-cyan-500/100/10" },
    high_expenses: { icon: DollarSign, color: "text-rose-600", bg: "bg-rose-500/10" },
    client_birthday: { icon: Cake, color: "text-pink-600", bg: "bg-pink-500/100/10" },
  };

  const ALERT_TYPE_LABELS: Record<string, string> = {
    low_stock: "Stock Bajo",
    sales_decrease: "Disminución de Ventas",
    inactive_clients: "Clientes Inactivos",
    no_movement_products: "Productos sin Movimiento",
    sales_target: "Meta de Ventas",
    upcoming_invoices: "Facturas por Vencer",
    high_expenses: "Gastos Elevados",
    client_birthday: "Cumpleaños de Clientes",
  };

  const getAlertItemPreview = (log: AlertLog): string => {
    const items = log.data?.items || [];
    if (items.length === 0) return "";
    const type = log.alert_rule?.type || "";
    if (type === "low_stock" || type === "no_movement_products") {
      return items.slice(0, 2).map((i: any) => i.name).join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "");
    }
    if (type === "inactive_clients") {
      return items.slice(0, 2).map((i: any) => i.name).join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "");
    }
    if (type === "upcoming_invoices") {
      return items.slice(0, 2).map((i: any) => i.invoice_number || i.client).join(", ") + (items.length > 2 ? ` +${items.length - 2}` : "");
    }
    return `${items.length} items`;
  };

  const totalNotifications = (calendarRead ? 0 : calendarPendingCount) + (alertsRead ? 0 : invoiceAlertCount) + companyAlertCount + birthdayCount;

  const handleMarkAllRead = useCallback(() => {
    markAlertsAsRead();
    markCalendarAsRead();
    markAllRead();
  }, [markAlertsAsRead, markCalendarAsRead, markAllRead]);

  const navigateToSubView = useCallback((view: MobileView) => setMobileActiveView(view), []);
  const navigateToMain = useCallback(() => setMobileActiveView("main"), []);

  const handleCloseMobileMenu = useCallback((open: boolean) => {
    setMobileMenuOpen(open);
    if (!open) setMobileActiveView("main");
  }, []);

  const handleLogout = () => {
    authApi.logout().finally(() => {
      router.visit("/login");
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    setSoundEnabled(next);
  };

  // Billing primary color
  const primaryColor = "hsl(var(--billing-primary))";

  const renderAlertDetailItems = (log: AlertLog) => {
    const items = log.data?.items || [];
    const type = log.alert_rule?.type || "";

    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sin items encontrados</p>;

    if (type === "low_stock") {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold text-orange-600">{item.current_stock} uds</p>
                {item.min_stock != null && <p className="text-xs text-muted-foreground">Mín: {item.min_stock}</p>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === "no_movement_products") {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-medium">{item.stock} uds</p>
                {item.sale_price && <p className="text-xs text-muted-foreground">{formatCurrency(item.sale_price)}</p>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === "inactive_clients") {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-xs text-muted-foreground">{item.total_purchases} compras</p>
                {item.last_purchase && <p className="text-xs text-muted-foreground">Última: {item.last_purchase}</p>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === "upcoming_invoices") {
      return (
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{item.client || "Sin cliente"}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold">{formatCurrency(item.balance || item.total_amount)}</p>
                <p className="text-xs text-muted-foreground">Vence: {item.due_date}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (type === "sales_decrease" || type === "sales_target" || type === "high_expenses") {
      const item = items[0];
      if (!item) return null;
      return (
        <div className="space-y-3">
          {type === "sales_decrease" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Ventas actuales</p>
                <p className="text-lg font-bold">{formatCurrency(item.current_sales)}</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Ventas anteriores</p>
                <p className="text-lg font-bold">{formatCurrency(item.previous_sales)}</p>
              </div>
              <div className="col-span-2 p-3 border rounded-lg bg-red-500/100/10 text-center">
                <p className="text-xs text-muted-foreground">Disminución</p>
                <p className="text-lg font-bold text-red-600">{item.change_percentage}%</p>
              </div>
            </div>
          )}
          {type === "sales_target" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Ventas actuales</p>
                <p className="text-lg font-bold">{formatCurrency(item.current)}</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="text-lg font-bold">{formatCurrency(item.target)}</p>
              </div>
              <div className="col-span-2 p-3 border rounded-lg bg-blue-500/100/10 text-center">
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
                <p className="text-lg font-bold text-blue-600">{item.percentage}%</p>
              </div>
            </div>
          )}
          {type === "high_expenses" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Gastos totales</p>
                <p className="text-lg font-bold">{formatCurrency(item.total_expenses)}</p>
              </div>
              <div className="p-3 border rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Límite</p>
                <p className="text-lg font-bold">{formatCurrency(item.threshold)}</p>
              </div>
              <div className="col-span-2 p-3 border rounded-lg bg-rose-500/10 text-center">
                <p className="text-xs text-muted-foreground">Excedido por</p>
                <p className="text-lg font-bold text-rose-600">{formatCurrency(item.exceeded_by)}</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback: show raw items
    return (
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="p-3 border rounded-lg bg-muted/30 text-sm">
            <pre className="text-xs overflow-auto">{JSON.stringify(item, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    <header className={cn(
      "fixed top-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm",
      isSidebarExpanded ? "lg:left-64 lg:right-0" : "lg:left-16 lg:right-0",
      "left-0 right-0"
    )}>
      <div className="flex h-full items-center px-3 sm:px-4 gap-2">
        {/* Sidebar Toggle and Search */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="rounded-lg border border-border hover:bg-muted h-9 w-9 sm:h-10 sm:w-10"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-[hsl(var(--billing-primary))]" />
            ) : (
              <>
                {isSidebarExpanded ? (
                  <PanelLeftClose className="h-5 w-5 text-[hsl(var(--billing-primary))] hidden lg:block" />
                ) : (
                  <PanelLeft className="h-5 w-5 text-[hsl(var(--billing-primary))] hidden lg:block" />
                )}
                <Menu className="h-5 w-5 text-[hsl(var(--billing-primary))] lg:hidden" />
              </>
            )}
          </Button>

          {/* Divider after toggle button */}
          <div className="h-8 w-px bg-border hidden sm:block" />

          {/* Desktop Search */}
          <div className="hidden sm:block relative" ref={searchRef}>
            {isSearchOpen ? (
              <div>
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-full min-w-[200px] lg:min-w-[300px]">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar vistas..."
                    className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setSearchQuery(""); setIsSearchOpen(false); }
                      if (e.key === 'Enter' && searchResults.length > 0) { handleSearchSelect(searchResults[0].href); }
                    }}
                  />
                  <button onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }} className="p-1 hover:bg-muted rounded-full">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                {searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {searchResults.length > 0 ? (
                      <div className="py-1">
                        {searchResults.map((result) => (
                          <button
                            key={result.href}
                            onClick={() => handleSearchSelect(result.href)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                          >
                            <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{result.name}</p>
                              {result.parentName && (
                                <p className="text-xs text-muted-foreground">{result.parentName}</p>
                              )}
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No se encontraron resultados
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 sm:h-10 sm:w-10" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-5 w-5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Tools Grid - Desktop */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex">
                <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0 shadow-lg border-0">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-foreground">Herramientas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{toolsDescription}</p>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-3 gap-1">
                  {filteredToolsItems.map((tool, idx) => (
                    <button
                      key={idx}
                      onClick={() => tool.path && router.visit(tool.path)}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-[hsl(var(--billing-primary))]/10">
                        <tool.icon className="h-5 w-5 text-[hsl(var(--billing-primary))] stroke-[1.5]" />
                      </div>
                      <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{tool.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-3 border-t">
                <button className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                  <CircleHelp className="h-4 w-4" />
                  Centro de ayuda
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Notifications - Desktop */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8 sm:h-10 sm:w-10 hidden md:flex">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <NotificationBadge count={totalNotifications} position="absolute" animate />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-lg border-0">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Notificaciones</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{totalNotifications} pendientes</p>
                  </div>
                  <button className="text-xs text-[hsl(var(--billing-primary))] hover:underline" onClick={handleMarkAllRead}>Marcar todo leído</button>
                </div>
              </div>

              <div className="flex p-1 gap-1 bg-muted/30 border-b">
                {(["reminders", "alerts", "company"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveNotificationTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors",
                      activeNotificationTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === "reminders" ? "Recordatorios" : tab === "alerts" ? "Alertas" : "Empresa"}
                  </button>
                ))}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {activeNotificationTab === "reminders" && (
                  <div className="divide-y">
                    {/* Cumpleaños */}
                    {birthdayData && birthdayCount > 0 && (
                      <button
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => setBirthdayModalOpen(true)}
                      >
                        <div className="p-2 rounded-full bg-pink-500/100/10 shrink-0">
                          <Cake className="h-4 w-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">Cumpleaños</p>
                          <p className="text-xs text-muted-foreground">
                            {birthdayData.today_count > 0 ? `${birthdayData.today_count} hoy` : ""}
                            {birthdayData.today_count > 0 && birthdayData.week_count > 0 ? " · " : ""}
                            {birthdayData.week_count > 0 ? `${birthdayData.week_count} esta semana` : ""}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-pink-500">{birthdayCount}</span>
                      </button>
                    )}
                    {/* Recordatorios de citas */}
                    {reminders.length > 0 ? (
                      reminders.slice(0, 5).map((reminder) => (
                        <div key={reminder.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                          <div className="p-2 rounded-full bg-blue-500/100/10 shrink-0 mt-0.5">
                            <CalendarDays className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {reminder.appointment?.title || "Cita"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {reminder.appointment?.client?.name || "Sin cliente"}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true, locale: es })}
                            </p>
                          </div>
                          <button
                            onClick={() => dismissOne(reminder.id)}
                            className="p-1 rounded-full hover:bg-muted shrink-0"
                            title="Descartar"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))
                    ) : !birthdayData || birthdayCount === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No hay recordatorios pendientes</div>
                    ) : null}
                  </div>
                )}

                {activeNotificationTab === "alerts" && (
                  <div className="divide-y">
                    {alertsLoading ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">Cargando alertas...</div>
                    ) : invoiceAlertCount > 0 ? (
                      <>
                        {/* Alertas de Venta */}
                        {alertData && totalSalesAlerts > 0 && (
                          <>
                            <div className="px-3 py-1.5 bg-muted/30">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alertas de Venta</p>
                            </div>
                            {alertCategoryConfigs.map((config) => {
                              const category = alertData[config.key];
                              if (category.count === 0) return null;
                              return (
                                <button
                                  key={`sale-${config.key}`}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                  onClick={() => setAlertDetailModal({ type: 'sale', category: config.key, title: config.title, items: category.items, color: config.countColor, route: '/admin/sales' })}
                                >
                                  <div className={cn("p-2 rounded-full shrink-0", config.iconBgColor)}>
                                    <config.icon className={cn("h-4 w-4", config.countColor)} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{config.title}</p>
                                    <p className="text-xs text-muted-foreground">{category.count} {config.suffix}</p>
                                  </div>
                                  <span className={cn("text-lg font-bold", config.countColor)}>{category.count}</span>
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Alertas de Compra */}
                        {purchaseAlertData && totalPurchaseAlerts > 0 && (
                          <>
                            <div className="px-3 py-1.5 bg-muted/30">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alertas de Compra</p>
                            </div>
                            {purchaseAlertCategoryConfigs.map((config) => {
                              const category = purchaseAlertData[config.key];
                              if (category.count === 0) return null;
                              return (
                                <button
                                  key={`purchase-${config.key}`}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                  onClick={() => setAlertDetailModal({ type: 'purchase', category: config.key, title: config.title, items: category.items, color: config.countColor, route: '/admin/inventory-purchases' })}
                                >
                                  <div className={cn("p-2 rounded-full shrink-0", config.iconBgColor)}>
                                    <config.icon className={cn("h-4 w-4", config.countColor)} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">{config.title}</p>
                                    <p className="text-xs text-muted-foreground">{category.count} {config.suffix}</p>
                                  </div>
                                  <span className={cn("text-lg font-bold", config.countColor)}>{category.count}</span>
                                </button>
                              );
                            })}
                          </>
                        )}

                      </>
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">No hay alertas pendientes</div>
                    )}
                  </div>
                )}

                {activeNotificationTab === "company" && (
                  <div className="divide-y">
                    {companyAlertsLoading ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">Cargando alertas de empresa...</div>
                    ) : companyAlertLogs.length > 0 ? (
                      <>
                        {(() => {
                          // Agrupar logs por tipo, quedarse con el más reciente de cada tipo
                          const groupedByType = companyAlertLogs.reduce<Record<string, typeof companyAlertLogs[0]>>((acc, log) => {
                            const type = log.alert_rule?.type || 'unknown';
                            if (!acc[type] || new Date(log.triggered_at) > new Date(acc[type].triggered_at)) {
                              acc[type] = log;
                            }
                            return acc;
                          }, {});

                          const ITEM_LABELS: Record<string, { suffix: string; route: string; previewFn: (items: any[]) => { label: string; detail?: string }[] }> = {
                            low_stock: {
                              suffix: "producto(s) con stock bajo",
                              route: "/admin/products",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: i.name || i.sku, detail: `Stock: ${i.current_stock}/${i.min_stock}` })),
                            },
                            inactive_clients: {
                              suffix: "cliente(s) inactivo(s)",
                              route: "/admin/clients",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: i.name, detail: i.last_purchase ? `Última compra: ${i.last_purchase}` : "Sin compras recientes" })),
                            },
                            no_movement_products: {
                              suffix: "producto(s) sin movimiento",
                              route: "/admin/products",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: i.name || i.sku, detail: i.stock ? `Stock: ${i.stock}` : undefined })),
                            },
                            sales_decrease: {
                              suffix: "alerta(s) de caída en ventas",
                              route: "/admin/sales",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: `Caída del ${i.change_percentage || 0}%`, detail: i.period_days ? `Últimos ${i.period_days} días` : undefined })),
                            },
                            sales_target: {
                              suffix: "meta(s) no alcanzada(s)",
                              route: "/admin/sales",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: `Meta: ${formatCurrency(i.target || 0)}`, detail: `Actual: ${formatCurrency(i.current || 0)}` })),
                            },
                            upcoming_invoices: {
                              suffix: "factura(s) por vencer",
                              route: "/admin/sales",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: i.invoice_number || i.client, detail: i.balance ? formatCurrency(i.balance) : undefined })),
                            },
                            high_expenses: {
                              suffix: "alerta(s) de gastos elevados",
                              route: "/admin/accounting",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: `Gastos: ${formatCurrency(i.total_expenses || 0)}`, detail: `Límite: ${formatCurrency(i.threshold || 0)}` })),
                            },
                            client_birthday: {
                              suffix: "cliente(s) cumplen años",
                              route: "/admin/clients",
                              previewFn: (items) => items.slice(0, 3).map((i) => ({ label: i.name, detail: i.is_today ? "¡Cumple hoy!" : `En ${i.days_until} día(s)` })),
                            },
                          };

                          return Object.entries(groupedByType).map(([type, log]) => {
                            const ruleType = type as AlertRuleType;
                            const iconConfig = COMPANY_ALERT_ICONS[ruleType] || COMPANY_ALERT_ICONS.low_stock;
                            const AlertIcon = iconConfig.icon;
                            const items = log.data?.items || [];
                            const itemCount = items.length;
                            const config = ITEM_LABELS[type];
                            const label = ALERT_TYPE_LABELS[type] || log.alert_rule?.name || "Alerta";
                            const suffix = config?.suffix || "item(s)";
                            const route = config?.route || "/admin/alerts";
                            const previews = config?.previewFn?.(items) || [];

                            return (
                              <button
                                key={type}
                                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                onClick={() => setAlertDetailModal({ type: 'company', category: type, title: label, items, color: iconConfig.color, route })}
                              >
                                <div className={cn("p-2 rounded-full shrink-0", iconConfig.bg)}>
                                  <AlertIcon className={cn("h-4 w-4", iconConfig.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{label}</p>
                                  <p className="text-xs text-muted-foreground">{itemCount} {suffix}</p>
                                </div>
                                <span className={cn("text-lg font-bold", iconConfig.color)}>{itemCount}</span>
                              </button>
                            );
                          });
                        })()}
                      </>
                    ) : (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        <BellRing className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No hay alertas recientes</p>
                        <button
                          className="text-xs text-[hsl(var(--billing-primary))] hover:underline mt-1"
                          onClick={() => router.visit('/admin/alerts')}
                        >
                          Configurar alertas
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 border-t">
                <button
                  className="w-full text-center text-sm text-[hsl(var(--billing-primary))] hover:underline py-1"
                  onClick={() => router.visit(activeNotificationTab === 'company' ? '/admin/alerts' : '/admin/notifications')}
                >
                  {activeNotificationTab === 'company' ? 'Configurar alertas de empresa' : 'Ver todas las notificaciones'}
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Calendar - Desktop */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex relative">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                {!calendarRead && calendarPendingCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[hsl(var(--billing-primary))] border-2 border-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0 shadow-lg border-0">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-foreground">{calendarTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{calendarSubtitle}</p>
              </div>
              <div className="p-2">
                {calendarMenuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      markCalendarAsRead();
                      if (item.path) router.visit(item.path);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">{item.label}</span>
                    {idx === 1 && calendarPendingCount > 0 && (
                      <NotificationBadge count={calendarPendingCount} variant="secondary" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Chat - Desktop */}
          {hasPermission('chat.view', user) && (
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full h-8 w-8 sm:h-10 sm:w-10 hidden sm:flex"
              onClick={() => router.visit('/admin/chat')}
            >
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              {chatUnreadCount > 0 && (
                <NotificationBadge count={chatUnreadCount} position="absolute" animate />
              )}
            </Button>
          )}

          <div className="h-8 w-px bg-border mx-1 sm:mx-2 hidden sm:block" />

          {/* User Menu - Desktop */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-1 sm:gap-2 px-1 sm:px-2 h-8 sm:h-10 hidden md:flex">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-[hsl(var(--billing-primary))]/20">
                  <AvatarImage src={user?.avatar_url || ""} />
                  <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-xs sm:text-sm">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 shadow-lg border-0">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border-2 border-[hsl(var(--billing-primary))]/20">
                    <AvatarImage src={user?.avatar_url || ""} />
                    <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-lg">
                      {user ? getInitials(user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 border-b">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: UserCircle, label: "Mi perfil", color: "[hsl(var(--billing-primary))]", action: () => router.visit("/admin/my-profile") },
                    { icon: MessageSquare, label: "Chat", color: "blue-500" },
                    { icon: Video, label: "Tutoriales", color: "amber-500" },
                  ].map((item, idx) => (
                    <button key={idx} onClick={item.action} className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className={cn("p-2 rounded-full", `bg-${item.color}/10`)}>
                        <item.icon className={cn("h-4 w-4", `text-${item.color}`)} />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2">
                {!user?.email_2fa_enabled && onShow2FADialog && (
                  <button
                    onClick={onShow2FADialog}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Activar 2FA</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                )}

                {user?.email_2fa_enabled && (
                  <Link
                    href="/admin/security"
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Seguridad</span>
                    <span className="text-xs text-green-600 ml-auto">Activo</span>
                  </Link>
                )}

                <button
                  onClick={() => router.visit("/admin/my-profile")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                >
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Cambiar contraseña</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </button>

                {hasPermission('branches.switch', user) && (
                  <button
                    onClick={() => setSwitchBranchOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Cambiar sede</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                  </button>
                )}
              </div>

              <div className="border-t p-2">
                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 p-2.5 hover:bg-muted rounded-lg transition-colors">
                    <MessageCircle className="h-4 w-4 text-[hsl(var(--billing-primary))]" />
                    <span className="text-xs font-medium">Comentarios</span>
                  </button>
                  <button onClick={() => router.visit('/admin/soporte')} className="flex-1 flex items-center justify-center gap-2 p-2.5 hover:bg-violet-500/10 rounded-lg transition-colors">
                    <Headphones className="h-4 w-4 text-violet-500" />
                    <span className="text-xs text-violet-600 font-medium">Soporte</span>
                  </button>
                </div>
              </div>

              <div className="p-3 border-t">
                <Button variant="destructive" className="w-full h-9" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={handleCloseMobileMenu}>
            <SheetTrigger asChild>
              <Button variant="default" size="icon" className="rounded-lg h-9 w-9 md:hidden bg-[hsl(var(--billing-primary))] hover:bg-[hsl(var(--billing-primary))]/90">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 overflow-hidden">
              {mobileActiveView === "main" && (
                <div className="animate-fade-in">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="text-left">Opciones</SheetTitle>
                  </SheetHeader>
                  <div className="p-2 space-y-1">
                    {[
                      { view: "search" as MobileView, icon: Search, label: "Buscar", bg: "bg-muted" },
                      { view: "tools" as MobileView, icon: Grid3X3, label: "Herramientas", bg: "bg-[hsl(var(--billing-primary))]/10", iconColor: "text-[hsl(var(--billing-primary))]" },
                      { view: "notifications" as MobileView, icon: Bell, label: "Notificaciones", bg: "bg-red-500/100/10", iconColor: "text-red-500", badge: totalNotifications },
                      { view: "calendar" as MobileView, icon: CalendarDays, label: calendarTitle, bg: "bg-blue-500/100/10", iconColor: "text-blue-500", badge: calendarPendingCount > 0 && !calendarRead ? calendarPendingCount : undefined },
                    ].map((item) => (
                      <button key={item.view} onClick={() => navigateToSubView(item.view)} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors">
                        <div className={cn("p-2 rounded-lg", item.bg)}>
                          <item.icon className={cn("h-4 w-4", item.iconColor || "text-muted-foreground")} />
                        </div>
                        <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                        {item.badge && <NotificationBadge count={item.badge} variant="default" />}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                    {hasPermission('chat.view', user) && (
                      <button onClick={() => { handleCloseMobileMenu(false); router.visit('/admin/chat'); }} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors">
                        <div className="p-2 rounded-lg bg-green-500/100/10">
                          <MessageCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <span className="text-sm font-medium flex-1 text-left">Chat</span>
                        {chatUnreadCount > 0 && <NotificationBadge count={chatUnreadCount} variant="default" />}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => navigateToSubView("user")} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-[hsl(var(--billing-primary))]/20">
                        <AvatarImage src={user?.avatar_url || ""} />
                        <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-xs">{user ? getInitials(user.name) : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="border-t my-2" />
                    <button onClick={() => navigateToSubView("settings")} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors">
                      <div className="p-2 rounded-lg bg-slate-500/10">
                        <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left">Configuración</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}

              {mobileActiveView === "search" && (
                <MobileSubView title="Buscar" onBack={navigateToMain}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border border-border rounded-lg">
                      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar vistas..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                        autoFocus
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="p-1 hover:bg-muted rounded-full">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {searchQuery.trim() ? (
                      searchResults.length > 0 ? (
                        <div className="mt-3 space-y-0.5">
                          {searchResults.map((result) => (
                            <button
                              key={result.href}
                              onClick={() => {
                                router.visit(result.href);
                                setSearchQuery("");
                                handleCloseMobileMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                            >
                              <result.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{result.name}</p>
                                {result.parentName && (
                                  <p className="text-xs text-muted-foreground">{result.parentName}</p>
                                )}
                              </div>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-4 text-center">No se encontraron resultados</p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground mt-4 text-center">Escribe para buscar vistas...</p>
                    )}
                  </div>
                </MobileSubView>
              )}

              {mobileActiveView === "tools" && (
                <MobileSubView title="Herramientas" onBack={navigateToMain}>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-3">{toolsDescription}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredToolsItems.map((tool, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (tool.path) {
                              router.visit(tool.path);
                              handleCloseMobileMenu(false);
                            }
                          }}
                          className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-[hsl(var(--billing-primary))]/10">
                            <tool.icon className="h-5 w-5 text-[hsl(var(--billing-primary))] stroke-[1.5]" />
                          </div>
                          <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{tool.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <button className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                        <CircleHelp className="h-4 w-4" />
                        Centro de ayuda
                      </button>
                    </div>
                  </div>
                </MobileSubView>
              )}

              {mobileActiveView === "notifications" && (
                <MobileSubView title="Notificaciones" subtitle={`${totalNotifications} pendientes`} onBack={navigateToMain}>
                  <div className="flex p-1 gap-1 bg-muted/30 border-b">
                    {(["reminders", "alerts"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveNotificationTab(tab)}
                        className={cn(
                          "flex-1 py-2 text-xs font-medium rounded-md transition-colors",
                          activeNotificationTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab === "reminders" ? "Recordatorios" : "Alertas"}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {activeNotificationTab === "reminders" && (
                      <div className="divide-y">
                        {reminders.length > 0 ? (
                          reminders.slice(0, 5).map((reminder) => (
                            <div key={reminder.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                              <div className="p-2 rounded-full bg-blue-500/100/10 shrink-0 mt-0.5">
                                <CalendarDays className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {reminder.appointment?.title || "Cita"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {reminder.appointment?.client?.name || "Sin cliente"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true, locale: es })}
                                </p>
                              </div>
                              <button
                                onClick={() => dismissOne(reminder.id)}
                                className="p-1 rounded-full hover:bg-muted shrink-0"
                                title="Descartar"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-sm text-muted-foreground">No hay recordatorios pendientes</div>
                        )}
                      </div>
                    )}
                    {activeNotificationTab === "alerts" && (
                      <div className="divide-y">
                        {alertsLoading ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">Cargando alertas...</div>
                        ) : invoiceAlertCount > 0 ? (
                          <>
                            {/* Alertas de Venta - Mobile */}
                            {alertData && totalSalesAlerts > 0 && (
                              <>
                                <div className="px-3 py-1.5 bg-muted/30">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alertas de Venta</p>
                                </div>
                                {alertCategoryConfigs.map((config) => {
                                  const category = alertData[config.key];
                                  if (category.count === 0) return null;
                                  return (
                                    <button
                                      key={`sale-m-${config.key}`}
                                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                      onClick={() => setAlertDetailModal({ type: 'sale', category: config.key, title: config.title, items: category.items, color: config.countColor, route: '/admin/sales' })}
                                    >
                                      <div className={cn("p-2 rounded-full shrink-0", config.iconBgColor)}>
                                        <config.icon className={cn("h-4 w-4", config.countColor)} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{config.title}</p>
                                        <p className="text-xs text-muted-foreground">{category.count} {config.suffix}</p>
                                      </div>
                                      <span className={cn("text-lg font-bold", config.countColor)}>{category.count}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}

                            {/* Alertas de Compra - Mobile */}
                            {purchaseAlertData && totalPurchaseAlerts > 0 && (
                              <>
                                <div className="px-3 py-1.5 bg-muted/30">
                                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alertas de Compra</p>
                                </div>
                                {purchaseAlertCategoryConfigs.map((config) => {
                                  const category = purchaseAlertData[config.key];
                                  if (category.count === 0) return null;
                                  return (
                                    <button
                                      key={`purchase-m-${config.key}`}
                                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                                      onClick={() => setAlertDetailModal({ type: 'purchase', category: config.key, title: config.title, items: category.items, color: config.countColor, route: '/admin/inventory-purchases' })}
                                    >
                                      <div className={cn("p-2 rounded-full shrink-0", config.iconBgColor)}>
                                        <config.icon className={cn("h-4 w-4", config.countColor)} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">{config.title}</p>
                                        <p className="text-xs text-muted-foreground">{category.count} {config.suffix}</p>
                                      </div>
                                      <span className={cn("text-lg font-bold", config.countColor)}>{category.count}</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}

                          </>
                        ) : (
                          <div className="p-6 text-center text-sm text-muted-foreground">No hay alertas pendientes</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t">
                    <button
                      className="w-full text-center text-sm text-[hsl(var(--billing-primary))] hover:underline py-1"
                      onClick={() => {
                        router.visit('/admin/notifications');
                        handleCloseMobileMenu(false);
                      }}
                    >
                      Ver todas las notificaciones
                    </button>
                  </div>
                </MobileSubView>
              )}

              {mobileActiveView === "calendar" && (
                <MobileSubView title={calendarTitle} subtitle={calendarSubtitle} onBack={navigateToMain}>
                  <div className="p-2">
                    {calendarMenuItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          markCalendarAsRead();
                          if (item.path) {
                            router.visit(item.path);
                            handleCloseMobileMenu(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1">{item.label}</span>
                        {idx === 1 && calendarPendingCount > 0 && (
                          <NotificationBadge count={calendarPendingCount} variant="secondary" />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </MobileSubView>
              )}

              {mobileActiveView === "user" && (
                <MobileSubView title="Mi cuenta" onBack={navigateToMain}>
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14 border-2 border-[hsl(var(--billing-primary))]/20">
                        <AvatarImage src={user?.avatar_url || ""} />
                        <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-lg">{user ? getInitials(user.name) : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-b">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: UserCircle, label: "Mi perfil", bg: "bg-[hsl(var(--billing-primary))]/10", iconColor: "text-[hsl(var(--billing-primary))]", action: () => { handleCloseMobileMenu(false); router.visit("/admin/my-profile"); } },
                        { icon: MessageSquare, label: "Chat", bg: "bg-blue-500/100/10", iconColor: "text-blue-500" },
                        { icon: Video, label: "Tutoriales", bg: "bg-amber-500/100/10", iconColor: "text-amber-500" },
                      ].map((item, idx) => (
                        <button key={idx} onClick={item.action} className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-muted transition-colors">
                          <div className={cn("p-2 rounded-full", item.bg)}>
                            <item.icon className={cn("h-4 w-4", item.iconColor)} />
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-2">
                    {!user?.email_2fa_enabled && onShow2FADialog && (
                      <button
                        onClick={() => {
                          handleCloseMobileMenu(false);
                          onShow2FADialog();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Activar 2FA</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </button>
                    )}

                    {user?.email_2fa_enabled && (
                      <button
                        onClick={() => {
                          router.visit("/admin/security");
                          handleCloseMobileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <Shield className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Seguridad</span>
                        <span className="text-xs text-green-600 ml-auto">Activo</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        handleCloseMobileMenu(false);
                        router.visit("/admin/my-profile");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                    >
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Cambiar contraseña</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </button>

                    {hasPermission('branches.switch', user) && (
                      <button
                        onClick={() => {
                          handleCloseMobileMenu(false);
                          setSwitchBranchOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-lg transition-colors text-left"
                      >
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Cambiar sede</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                      </button>
                    )}
                  </div>
                  <div className="border-t p-2">
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-2 p-2.5 hover:bg-muted rounded-lg transition-colors">
                        <MessageCircle className="h-4 w-4 text-[hsl(var(--billing-primary))]" />
                        <span className="text-xs font-medium">Comentarios</span>
                      </button>
                      <button onClick={() => { handleCloseMobileMenu(false); router.visit('/admin/chat'); }} className="flex-1 flex items-center justify-center gap-2 p-2.5 hover:bg-violet-500/10 rounded-lg transition-colors">
                        <Headphones className="h-4 w-4 text-violet-500" />
                        <span className="text-xs text-violet-600 font-medium">Soporte</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 border-t">
                    <Button variant="destructive" className="w-full h-9" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar sesión
                    </Button>
                  </div>
                </MobileSubView>
              )}

              {mobileActiveView === "settings" && (
                <MobileSubView title="Configuración" subtitle="Personaliza tu experiencia" onBack={navigateToMain}>
                  <div className="p-2 space-y-0.5">
                    <div role="button" tabIndex={0} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors cursor-pointer" onClick={toggleTheme}>
                      <div className="p-2 rounded-lg bg-[hsl(var(--billing-primary))]/10">
                        {theme === "dark" ? <Moon className="h-4 w-4 text-[hsl(var(--billing-primary))]" /> : <Sun className="h-4 w-4 text-[hsl(var(--billing-primary))]" />}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">Tema</p>
                        <p className="text-xs text-muted-foreground">{theme === "dark" ? "Modo descanso" : "Modo normal"}</p>
                      </div>
                      <Switch checked={theme === "dark"} />
                    </div>
                    <div role="button" tabIndex={0} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors cursor-pointer" onClick={toggleSound}>
                      <div className="p-2 rounded-lg bg-amber-500/100/10">
                        {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-500" /> : <VolumeX className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">Sonido de alertas</p>
                        <p className="text-xs text-muted-foreground">{soundEnabled ? "Activado" : "Desactivado"}</p>
                      </div>
                      <Switch checked={soundEnabled} />
                    </div>
                  </div>
                  <div className="border-t p-2">
                    <button
                      onClick={() => {
                        router.visit("/admin/profile");
                        handleCloseMobileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-slate-500/10">
                        <Cog className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">Configuración del sistema</p>
                        <p className="text-xs text-muted-foreground">Todas las opciones</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </MobileSubView>
              )}
            </SheetContent>
          </Sheet>

          {/* Company Name + Settings - Desktop */}
          <div className="hidden md:flex items-center gap-3 ml-2">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{user?.name?.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">Facturación</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-muted/50 hover:bg-muted">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0 shadow-lg border-0">
                <div className="p-4 border-b bg-muted/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Cog className="h-4 w-4" />
                    Configuración
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Personaliza tu experiencia</p>
                </div>
                <div className="p-2 space-y-0.5">
                  <div role="button" tabIndex={0} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors cursor-pointer" onClick={toggleTheme}>
                    <div className="p-2 rounded-lg bg-[hsl(var(--billing-primary))]/10">
                      {theme === "dark" ? <Moon className="h-4 w-4 text-[hsl(var(--billing-primary))]" /> : <Sun className="h-4 w-4 text-[hsl(var(--billing-primary))]" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">Tema</p>
                      <p className="text-xs text-muted-foreground">{theme === "dark" ? "Modo descanso" : "Modo normal"}</p>
                    </div>
                    <Switch checked={theme === "dark"} />
                  </div>
                  <div role="button" tabIndex={0} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors cursor-pointer" onClick={toggleSound}>
                    <div className="p-2 rounded-lg bg-amber-500/100/10">
                      {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-500" /> : <VolumeX className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">Sonido de alertas</p>
                      <p className="text-xs text-muted-foreground">{soundEnabled ? "Activado" : "Desactivado"}</p>
                    </div>
                    <Switch checked={soundEnabled} />
                  </div>
                </div>
                <div className="border-t p-2">
                  <button onClick={() => router.visit("/admin/profile")} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted rounded-lg transition-colors">
                    <div className="p-2 rounded-lg bg-slate-500/10">
                      <Cog className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">Configuración del sistema</p>
                      <p className="text-xs text-muted-foreground">Todas las opciones</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

    </header>

    {/* Alert Detail Modal - Company */}
    <Dialog open={!!selectedAlertLog} onOpenChange={(open) => { if (!open) setSelectedAlertLog(null); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        {selectedAlertLog && (() => {
          const ruleType = (selectedAlertLog.alert_rule?.type || 'low_stock') as AlertRuleType;
          const iconConfig = COMPANY_ALERT_ICONS[ruleType] || COMPANY_ALERT_ICONS.low_stock;
          const AlertIcon = iconConfig.icon;
          const triggeredDate = new Date(selectedAlertLog.triggered_at);
          return (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-lg shrink-0", iconConfig.bg)}>
                    <AlertIcon className={cn("h-5 w-5", iconConfig.color)} />
                  </div>
                  <div>
                    <DialogTitle className="text-base">{selectedAlertLog.alert_rule?.name || "Alerta"}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {ALERT_TYPE_LABELS[ruleType] || ruleType}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{triggeredDate.toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                    <span className="text-xs">({formatDistanceToNow(triggeredDate, { addSuffix: true, locale: es })})</span>
                  </div>
                  {selectedAlertLog.email_sent ? (
                    <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Email enviado</span>
                  ) : selectedAlertLog.email_error ? (
                    <span className="text-xs text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3" />Error email</span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{selectedAlertLog.data?.summary}</p>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Detalle ({(selectedAlertLog.data?.items || []).length} items)
                  </p>
                  {renderAlertDetailItems(selectedAlertLog)}
                </div>
              </div>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Birthday Detail Modal */}
    <Dialog open={birthdayModalOpen} onOpenChange={setBirthdayModalOpen}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Cumpleaños de Clientes
          </DialogTitle>
          <DialogDescription className="text-xs">
            {birthdayData?.today_count || 0} hoy · {birthdayData?.week_count || 0} esta semana · {birthdayData?.month_count || 0} este mes
          </DialogDescription>
        </DialogHeader>
        {birthdayData && (
          <div className="space-y-4 mt-2">
            {birthdayData.today.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cumplen hoy</p>
                <div className="space-y-1">
                  {birthdayData.today.map((client) => (
                    <div key={client.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-pink-500/100/5 hover:bg-pink-500/100/10 transition-colors">
                      <div className="p-1.5 rounded-full bg-pink-500/100/10 shrink-0">
                        <Cake className="h-3.5 w-3.5 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">Cumple {client.turning_age} años</p>
                      </div>
                      {client.whatsapp_url && (
                        <a
                          href={`${client.whatsapp_url}?text=${encodeURIComponent(birthdayMsgTemplate.replace(/\{nombre\}/g, client.first_name || client.name).replace(/\{nombre_completo\}/g, client.name).replace(/\{edad\}/g, String(client.turning_age)).replace(/\{fecha_nacimiento\}/g, client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('es-CO') : '').replace(/\{empresa\}/g, user?.company?.name || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-green-600 hover:text-green-700 whitespace-nowrap px-2 py-1 rounded bg-green-500/100/10 hover:bg-green-500/100/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {birthdayData.today.length === 0 && birthdayData.this_week.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No hay cumpleaños hoy ni en los próximos 7 días
              </div>
            )}
            {birthdayData.this_week.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Próximos días</p>
                <div className="space-y-1">
                  {birthdayData.this_week.map((client) => (
                    <div key={client.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-1.5 rounded-full bg-fuchsia-500/10 shrink-0">
                        <CalendarDays className="h-3.5 w-3.5 text-fuchsia-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cumple {client.turning_age} años · {client.days_until === 1 ? "mañana" : `en ${client.days_until} días`}
                        </p>
                      </div>
                      {client.whatsapp_url && (
                        <a
                          href={`${client.whatsapp_url}?text=${encodeURIComponent(birthdayMsgTemplate.replace(/\{nombre\}/g, client.first_name || client.name).replace(/\{nombre_completo\}/g, client.name).replace(/\{edad\}/g, String(client.turning_age)).replace(/\{fecha_nacimiento\}/g, client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('es-CO') : '').replace(/\{empresa\}/g, user?.company?.name || ''))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-green-600 hover:text-green-700 whitespace-nowrap px-2 py-1 rounded bg-green-500/100/10 hover:bg-green-500/100/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="pt-3 border-t mt-3">
          <Button
            className="w-full"
            onClick={() => {
              setBirthdayModalOpen(false);
              router.visit('/admin/clients');
            }}
          >
            Ir a ver todos los clientes
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Alert Detail Modal - Sales/Purchases */}
    <Dialog open={!!alertDetailModal} onOpenChange={(open) => { if (!open) setAlertDetailModal(null); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {alertDetailModal && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{alertDetailModal.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {alertDetailModal.items.length} registro(s) encontrado(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 mt-2">
              {alertDetailModal.type === 'sale' && alertDetailModal.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{item.invoice_number}</span>
                  <span className="text-sm text-foreground truncate flex-1">{item.client?.name || "—"}</span>
                  <span className={cn("text-sm font-semibold whitespace-nowrap", alertDetailModal.color)}>{formatCurrency(item.balance)}</span>
                </div>
              ))}
              {alertDetailModal.type === 'purchase' && alertDetailModal.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{item.purchase_number}</span>
                  <span className="text-sm text-foreground truncate flex-1">{item.supplier?.name || "—"}</span>
                  <span className={cn("text-sm font-semibold whitespace-nowrap", alertDetailModal.color)}>{formatCurrency(item.balance_due)}</span>
                </div>
              ))}
              {alertDetailModal.type === 'company' && alertDetailModal.items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-foreground truncate flex-1">{item.name || item.invoice_number || item.client || `Item ${idx + 1}`}</span>
                  {item.current_stock != null && (
                    <span className={cn("text-sm font-semibold", alertDetailModal.color)}>Stock: {item.current_stock}</span>
                  )}
                  {item.balance != null && (
                    <span className={cn("text-sm font-semibold", alertDetailModal.color)}>{formatCurrency(item.balance)}</span>
                  )}
                  {item.total_expenses != null && (
                    <span className={cn("text-sm font-semibold", alertDetailModal.color)}>{formatCurrency(item.total_expenses)}</span>
                  )}
                  {item.days_until != null && (
                    <span className={cn("text-sm font-semibold", alertDetailModal.color)}>{item.is_today ? "¡Hoy!" : `${item.days_until}d`}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-3 border-t mt-3">
              <Button
                className="w-full"
                onClick={() => {
                  setAlertDetailModal(null);
                  router.visit(alertDetailModal.route);
                }}
              >
                Ir a ver todas
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Switch Branch Dialog */}
    <SwitchBranchDialog open={switchBranchOpen} onOpenChange={setSwitchBranchOpen} user={user} />
    </>
  );
});

AppHeader.displayName = "AppHeader";

// Mobile Sub View Component
const MobileSubView = memo(({ title, subtitle, onBack, children }: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) => (
  <div className="animate-fade-in">
    <SheetHeader className="p-4 border-b">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <SheetTitle className="text-left">{title}</SheetTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </SheetHeader>
    {children}
  </div>
));

MobileSubView.displayName = "MobileSubView";
