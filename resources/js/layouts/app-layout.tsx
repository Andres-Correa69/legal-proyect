import { PropsWithChildren, useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import {
  Building2,
  CreditCard,
  Package,
  ShieldCheck,
  Users,
  Warehouse,
  ClipboardList,
  History,
  Truck,
  ShoppingCart,
  Wallet,
  LayoutDashboard,
  Receipt,
  DollarSign,
  Archive,
  FileCheck,
  FileText,
  Settings,
  Shield,
  ToggleLeft,
  BarChart3,
  BookOpen,
  List,
  Calendar,
  LayoutGrid,
  Tag,
  MapPin,
  ClipboardCheck,
  Upload,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import type { User } from "@/types";
import { TwoFactorActivationDialog } from "@/components/two-factor-activation-dialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps extends PropsWithChildren {
  title?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  createPath?: string;
  extraIcon?: React.ElementType;
  extraIconClass?: string;
  showWhen?: (user: User | null | undefined) => boolean;
  children?: NavItem[];
}

const fullNavigation: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { name: "Vender", href: "/admin/sell", icon: ShoppingCart, permission: "sales.create" },
  {
    name: "Ventas",
    href: "/admin/sales",
    icon: Receipt,
    permission: "sales.view",
    children: [
      { name: "Facturas de Venta", href: "/admin/sales", icon: Receipt, permission: "sales.view", createPath: "/admin/sell" },
      { name: "Clientes", href: "/admin/clients", icon: Users, permission: "clients.view", createPath: "/admin/clients/create" },
    ],
  },
  {
    name: "Caja",
    href: "/admin/cash-registers",
    icon: CreditCard,
    permission: "cash-registers.view",
    children: [
      { name: "Gestión de Cajas", href: "/admin/cash-registers", icon: CreditCard, permission: "cash-registers.view" },
      { name: "Transferencias", href: "/admin/cash-transfers-history", icon: History, permission: "cash-transfers.view", createPath: "/admin/cash-transfers" },
      { name: "Cierres Anteriores", href: "/admin/cash-closures", icon: Archive, permission: "cash-registers.view" },
      { name: "Lista de Pagos", href: "/admin/payments", icon: Receipt, permission: "payments.view" },
      { name: "Reportes de Caja", href: "/admin/cash-reports", icon: Wallet, permission: "cash-reports.view" },
    ],
  },
  {
    name: "Cartera",
    href: "/admin/balances/clients",
    icon: Wallet,
    permission: "payments.view",
    children: [
      { name: "Saldos Clientes", href: "/admin/balances/clients", icon: CreditCard, permission: "payments.view" },
      { name: "Saldos Proveedores", href: "/admin/balances/suppliers", icon: CreditCard, permission: "payments.view" },
    ],
  },
  {
    name: "Contabilidad",
    href: "/admin/accounting/accounts",
    icon: BookOpen,
    permission: "accounting.view",
    children: [
      { name: "Plan de Cuentas", href: "/admin/accounting/accounts", icon: List, permission: "accounting.view" },
      { name: "Registros Contables", href: "/admin/accounting/journal-entries", icon: FileText, permission: "accounting.view" },
      { name: "Reportes", href: "/admin/accounting/reports", icon: BarChart3, permission: "accounting.reports" },
      { name: "Periodos", href: "/admin/accounting/periods", icon: Calendar, permission: "accounting.periods" },
      { name: "Configuracion", href: "/admin/accounting/config", icon: Settings, permission: "accounting.settings" },
      { name: "Terceros", href: "/admin/accounting/third-parties", icon: Users, permission: "third-parties.view" },
    ],
  },
  {
    name: "Inventario",
    href: "/admin/inventory",
    icon: Package,
    permission: "inventory.view",
    children: [
      { name: "Productos/Servicios", href: "/admin/products", icon: Package, permission: "products.view" },
      { name: "Áreas", href: "/admin/product-areas", icon: LayoutGrid, permission: "categories.view" },
      { name: "Categorías", href: "/admin/product-categories", icon: Tag, permission: "categories.view" },
      { name: "Bodegas", href: "/admin/warehouses", icon: Warehouse, permission: "warehouses.view" },
      { name: "Ubicaciones", href: "/admin/locations", icon: MapPin, permission: "warehouses.view" },
      { name: "Listas de Precios", href: "/admin/price-lists", icon: DollarSign, permission: "price-lists.view" },
      { name: "Proveedores", href: "/admin/suppliers", icon: Truck, permission: "suppliers.view", createPath: "/admin/suppliers/create" },
      { name: "Compras", href: "/admin/inventory-purchases", icon: Receipt, permission: "inventory.purchases.view", createPath: "/admin/inventory-purchases/create" },
      { name: "Operaciones", href: "/admin/inventory-operations", icon: ClipboardList, permission: "inventory.transfers.view" },
      { name: "Conciliación", href: "/admin/inventory-reconciliations", icon: ClipboardCheck, permission: "inventory.reconciliations.view" },
      { name: "Importar Datos", href: "/admin/bulk-import", icon: Upload, permission: "products.manage", extraIcon: Sparkles, extraIconClass: "text-orange-500" },
    ],
  },
  {
    name: "Facturación DIAN",
    href: "/admin/electronic-invoicing",
    icon: FileCheck,
    permission: "electronic-invoicing.view",
    children: [
      { name: "Creación de Empresa", href: "/admin/electronic-invoicing", icon: Building2, permission: "electronic-invoicing.manage" },
      { name: "Habilitación DIAN", href: "/admin/electronic-invoicing/habilitacion", icon: Shield, permission: "electronic-invoicing.manage" },
      { name: "Configuración FE", href: "/admin/electronic-invoicing/config", icon: Settings, permission: "electronic-invoicing.config", showWhen: (u) => u?.branch?.ei_environment === 1 },
      { name: "Nómina Electrónica", href: "/admin/payroll", icon: FileText, permission: "electronic-invoicing.view" },
    ],
  },
  {
    name: "Ordenes de Servicio",
    href: "/admin/service-orders",
    icon: Wrench,
    permission: "service-orders.view",
    showWhen: (u) => (u?.company?.settings as Record<string, any>)?.service_orders_enabled === true,
  },
  {
    name: "Configuración",
    href: "/admin/users",
    icon: Building2,
    permission: "users.view",
    children: [
      { name: "Usuarios", href: "/admin/users", icon: Users, permission: "users.view", createPath: "/admin/users/create" },
      { name: "Roles", href: "/admin/roles", icon: ShieldCheck, permission: "roles.view", createPath: "/admin/roles?create=1" },
      { name: "Sucursales", href: "/admin/branches", icon: Building2, permission: "branches.view" },
      { name: "Métodos de Pago", href: "/admin/payment-methods", icon: CreditCard, permission: "payment-methods.view" },
    ],
  },
];

const superAdminNavigation: NavItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
];

export default function AppLayout({ children, title }: AppLayoutProps) {
  const page = usePage<{ auth: { user: User } }>();
  const user = page.props.auth?.user;
  const currentUrl = (page as unknown as { url: string }).url;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [autoExpandSection, setAutoExpandSection] = useState<string | null>(null);
  const [show2FADialog, setShow2FADialog] = useState(false);

  // Apply theme color class to <html> element
  useEffect(() => {
    const themeColor = user?.company?.settings?.theme_color as string | undefined;
    const themeClasses = ['theme-green', 'theme-orange', 'theme-red', 'theme-gray', 'theme-brown', 'theme-yellow', 'theme-pink'];
    document.documentElement.classList.remove(...themeClasses);
    if (themeColor && themeColor !== 'blue') {
      document.documentElement.classList.add(`theme-${themeColor}`);
    }
  }, [user?.company?.settings?.theme_color]);

  const toggleSidebar = () => {
    // On mobile, toggle the sheet
    if (window.innerWidth < 1024) {
      setSidebarOpen(prev => !prev);
    } else {
      // On desktop, toggle expanded state
      setSidebarExpanded(prev => !prev);
      setAutoExpandSection(null);
    }
  };

  const handleExpandRequest = (sectionName: string) => {
    setSidebarExpanded(true);
    setAutoExpandSection(sectionName);
  };

  const canAccessItem = (item: NavItem): boolean => {
    if (item.showWhen && !item.showWhen(user)) return false;
    if (!item.permission) return true;
    if (isSuperAdmin(user)) return true;
    return hasPermission(item.permission, user);
  };

  const navigation = isSuperAdmin(user) ? superAdminNavigation : fullNavigation;
  const filteredNavigation = navigation.filter(canAccessItem);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar with Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <AppSidebar
            isExpanded={true}
            isMobile={true}
            onClose={() => setSidebarOpen(false)}
            navigation={filteredNavigation}
            user={user}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <AppSidebar
        isExpanded={sidebarExpanded}
        onClose={() => setSidebarOpen(false)}
        onExpandRequest={handleExpandRequest}
        autoExpandSection={autoExpandSection}
        navigation={filteredNavigation}
        user={user}
      />

      {/* Header */}
      <AppHeader
        title={title}
        user={user}
        navigation={filteredNavigation}
        isSidebarExpanded={sidebarExpanded}
        onToggleSidebar={toggleSidebar}
        isMobileMenuOpen={sidebarOpen}
        onShow2FADialog={() => setShow2FADialog(true)}
      />

      {/* Main content */}
      <main className={cn(
        "transition-all duration-300 ease-out pt-14",
        sidebarExpanded ? "lg:ml-64" : "lg:ml-16"
      )}>
        <div key={currentUrl} className="py-4 sm:py-6 px-2 sm:px-4 lg:px-6 animate-page-slide-in">
          {children}
        </div>
      </main>

      {/* Dialog de activacion 2FA */}
      <TwoFactorActivationDialog
        open={show2FADialog}
        onOpenChange={setShow2FADialog}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <Toaster />
    </div>
  );
}
