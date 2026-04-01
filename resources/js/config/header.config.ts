import {
  BarChart3,
  TrendingUp,
  Settings,
  Building2,
  CalendarDays,
  Clock,
  Bell,
  BellRing,
  AlertTriangle,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

// Tools items for the header grid
export interface ToolItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  permission?: string;
}

export const toolsItems: ToolItem[] = [
  { icon: TrendingUp, label: "Análisis", path: "/admin/analytics", permission: "analytics.view" },
  { icon: BarChart3, label: "Reportes", path: "/admin/reports" },
  { icon: Building2, label: "Sucursales", path: "/admin/branches" },
  { icon: BellRing, label: "Alertas", path: "/admin/alerts", permission: "alerts.view" },
  { icon: Settings, label: "Configuración", path: "/admin/profile" },
];

export const toolsDescription = "Accede rápido a las herramientas del sistema";

// Alert category display configs (for real invoice alerts)
export interface AlertCategoryConfig {
  key: 'overdue' | 'due_soon' | 'partial_payment';
  title: string;
  suffix: string;
  icon: LucideIcon;
  iconBgColor: string;
  countColor: string;
}

export const alertCategoryConfigs: AlertCategoryConfig[] = [
  {
    key: 'overdue',
    title: 'Facturas vencidas',
    suffix: 'vencidas',
    icon: AlertTriangle,
    iconBgColor: 'bg-red-500/10',
    countColor: 'text-red-500',
  },
  {
    key: 'due_soon',
    title: 'Por vencer',
    suffix: 'por vencer en 7 días',
    icon: Clock,
    iconBgColor: 'bg-amber-500/10',
    countColor: 'text-amber-500',
  },
  {
    key: 'partial_payment',
    title: 'Pago parcial',
    suffix: 'con pago parcial',
    icon: CreditCard,
    iconBgColor: 'bg-blue-500/10',
    countColor: 'text-blue-500',
  },
];

// Purchase alert category display configs
export const purchaseAlertCategoryConfigs: AlertCategoryConfig[] = [
  {
    key: 'overdue',
    title: 'Compras vencidas',
    suffix: 'vencidas',
    icon: AlertTriangle,
    iconBgColor: 'bg-orange-500/10',
    countColor: 'text-orange-500',
  },
  {
    key: 'due_soon',
    title: 'Por vencer',
    suffix: 'por vencer en 7 días',
    icon: Clock,
    iconBgColor: 'bg-yellow-500/10',
    countColor: 'text-yellow-500',
  },
  {
    key: 'partial_payment',
    title: 'Pago parcial',
    suffix: 'con pago parcial',
    icon: CreditCard,
    iconBgColor: 'bg-purple-500/10',
    countColor: 'text-purple-500',
  },
];

// Calendar menu items
export interface CalendarMenuItem {
  icon: LucideIcon;
  label: string;
  badge?: number;
  path?: string;
}

export const calendarMenuItems: CalendarMenuItem[] = [
  { icon: CalendarDays, label: "Ver calendario", path: "/admin/calendar" },
  { icon: Clock, label: "Citas pendientes", path: "/admin/calendar?tab=agenda&status=scheduled" },
  { icon: Bell, label: "Recordatorios", path: "/admin/calendar" },
];

export const calendarTitle = "Agenda";
export const calendarSubtitle = "Gestiona tus citas y eventos";
