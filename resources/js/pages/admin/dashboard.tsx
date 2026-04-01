import { Head, usePage, Link } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  Loader2,
  Building2,
  Users,
  UserCheck,
  MapPin,
  Package,
  Warehouse,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  ShoppingCart,
  History,
  DollarSign,
  CreditCard,
  Landmark,
  ClipboardList,
  ShieldCheck,
  Tags,
  Truck,
  Globe,
} from "lucide-react";
import { router } from "@inertiajs/react";
import { DashboardStatsGrid } from "@/components/dashboard/DashboardStatsGrid";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { TopClientsTable } from "@/components/dashboard/TopClientsTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { dashboardApi, type DashboardData } from "@/lib/api";
import { isSuperAdmin } from "@/lib/permissions";
import type { User } from "@/types";

const superAdminSections = [
  {
    id: 'cash-management',
    title: 'Cajas y Pagos',
    description: 'Gestion de cajas registradoras, pagos y metodos de pago',
    icon: Landmark,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-500/10',
    cards: [
      {
        title: 'Cajas Registradoras',
        description: 'Gestiona las cajas y sesiones de todas las sucursales',
        href: '/admin/cash-registers',
        icon: Landmark,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-500/10',
      },
      {
        title: 'Transferencias de Caja',
        description: 'Transferencias entre cajas registradoras',
        href: '/admin/cash-transfers',
        icon: ArrowLeftRight,
        iconColor: 'text-cyan-600',
        bgColor: 'bg-cyan-500/10',
      },
      {
        title: 'Pagos',
        description: 'Historial de ingresos y egresos',
        href: '/admin/payments',
        icon: CreditCard,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
      },
      {
        title: 'Metodos de Pago',
        description: 'Configuracion de metodos de pago disponibles',
        href: '/admin/payment-methods',
        icon: DollarSign,
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-500/10',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventario',
    description: 'Gestion completa de productos, bodegas, movimientos y compras',
    icon: Warehouse,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    cards: [
      {
        title: 'Productos',
        description: 'Gestiona el inventario de productos',
        href: '/admin/products',
        icon: Package,
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-500/10',
      },
      {
        title: 'Categorias de Productos',
        description: 'Gestiona las categorias de productos',
        href: '/admin/product-categories',
        icon: Tags,
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-500/10',
      },
      {
        title: 'Bodegas',
        description: 'Gestiona las bodegas y almacenes',
        href: '/admin/warehouses',
        icon: Warehouse,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
      },
      {
        title: 'Ubicaciones',
        description: 'Ubicaciones fisicas dentro de las bodegas',
        href: '/admin/locations',
        icon: Layers,
        iconColor: 'text-pink-600',
        bgColor: 'bg-pink-500/10',
      },
      {
        title: 'Proveedores',
        description: 'Gestiona informacion de proveedores',
        href: '/admin/suppliers',
        icon: Truck,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
      },
      {
        title: 'Compras',
        description: 'Ordenes de compra y recepcion de inventario',
        href: '/admin/inventory-purchases',
        icon: ShoppingCart,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-500/10',
      },
      {
        title: 'Transferencias',
        description: 'Transferencias entre bodegas y ubicaciones',
        href: '/admin/inventory-transfers',
        icon: ArrowLeftRight,
        iconColor: 'text-cyan-600',
        bgColor: 'bg-cyan-500/10',
      },
      {
        title: 'Ajustes de Inventario',
        description: 'Ajustes de stock con control de aprobacion',
        href: '/admin/inventory-adjustments',
        icon: TrendingUp,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-500/10',
      },
      {
        title: 'Historial de Movimientos',
        description: 'Trazabilidad completa de movimientos',
        href: '/admin/inventory-movements',
        icon: History,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-500/10',
      },
    ],
  },
  {
    id: 'administration',
    title: 'Administracion',
    description: 'Empresas, sucursales, usuarios, roles y auditoria',
    icon: Building2,
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    cards: [
      {
        title: 'Empresas',
        description: 'Gestiona las empresas del sistema',
        href: '/admin/companies',
        icon: Building2,
        iconColor: 'text-indigo-600',
        bgColor: 'bg-indigo-500/10',
      },
      {
        title: 'Sucursales',
        description: 'Administra las sucursales de las empresas',
        href: '/admin/branches',
        icon: MapPin,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-500/10',
      },
      {
        title: 'Usuarios',
        description: 'Gestiona los usuarios del sistema',
        href: '/admin/users',
        icon: Users,
        iconColor: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
      },
      {
        title: 'Clientes',
        description: 'Gestiona los clientes registrados',
        href: '/admin/clients',
        icon: UserCheck,
        iconColor: 'text-teal-600',
        bgColor: 'bg-teal-500/10',
      },
      {
        title: 'Roles',
        description: 'Configuracion de roles y permisos',
        href: '/admin/roles',
        icon: ShieldCheck,
        iconColor: 'text-amber-600',
        bgColor: 'bg-amber-500/10',
      },
      {
        title: 'Auditoria',
        description: 'Revisa los registros de actividad del sistema',
        href: '/admin/audit-logs',
        icon: ClipboardList,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-500/10',
      },
      {
        title: 'Auditoria API Externa',
        description: 'Monitorea peticiones de proyectos externos',
        href: '/admin/external-api-logs',
        icon: Globe,
        iconColor: 'text-violet-600',
        bgColor: 'bg-violet-50',
      },
      {
        title: 'Auditoria Facturacion',
        description: 'Seguimiento de facturas, notas y anulaciones por empresa',
        href: '/admin/sales-audit',
        icon: Receipt,
        iconColor: 'text-rose-600',
        bgColor: 'bg-rose-50',
      },
    ],
  },
];

export default function Dashboard() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Solo cargar estadísticas si NO es super admin
    if (!isSuperAdmin(user)) {
      dashboardApi.getStatistics()
        .then(setData)
        .catch((err) => console.error('Error loading dashboard:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Dashboard de Super Admin con tarjetas de navegación
  if (isSuperAdmin(user)) {
    return (
      <AppLayout title="Dashboard">
        <Head title="Dashboard - Super Admin" />
        <div className="flex h-full flex-1 flex-col gap-8">
          {/* Banner de Bienvenida */}
          <div
            className="w-full rounded-lg p-6 text-white"
            style={{ background: '#184E80' }}
          >
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">
              Panel de Administracion - LEGAL SISTEMA
            </h1>
            <p className="text-white/90 mt-2">
              Gestiona todas las empresas, sucursales y usuarios del sistema
            </p>
          </div>

          {/* Secciones organizadas */}
          {superAdminSections.map((section) => (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-border">
                <div className={`w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                  <section.icon className={`h-5 w-5 ${section.iconColor}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {section.cards.map((card, index) => (
                  <Link key={index} href={card.href} className="block no-underline">
                    <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer border-2 hover:border-primary">
                      <CardHeader>
                        <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center mb-2`}>
                          <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                        </div>
                        <CardTitle className="text-xl">{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-primary font-medium">
                          Acceder →
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <Head title="Dashboard de Facturación" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Dashboard de facturación para usuarios normales
  return (
    <AppLayout title="Dashboard">
      <Head title="Dashboard de Facturación" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Facturación</h1>
            <p className="text-muted-foreground">Gestiona tus facturas y documentos comerciales</p>
          </div>
          <Button onClick={() => router.visit("/admin/sell")}>
            <Receipt className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

        {/* Stats Grid - 8 KPI Cards */}
        <DashboardStatsGrid stats={data?.stats} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts Section */}
        <DashboardCharts charts={data?.charts} />

        {/* Financial Summary + Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FinancialSummary summary={data?.financial_summary} stats={data?.stats} />
          <RecentTransactions transactions={data?.recent_transactions} />
        </div>

        {/* Top Clients Table */}
        <TopClientsTable clients={data?.top_clients} />
      </div>
    </AppLayout>
  );
}
