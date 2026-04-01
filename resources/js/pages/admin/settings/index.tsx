import { Head, usePage } from "@inertiajs/react";
import { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  Receipt,
  FileText,
  Package,
  Calculator,
  CreditCard,
  ChevronRight,
  Search,
  BookOpen,
  Warehouse,
  MapPin,
  Truck,
  ListChecks,
  ArrowRightLeft,
  History,
  ShieldCheck,
  Briefcase,
  FileCheck,
  Shield,
  Settings,
  BarChart3,
  Grid3X3,
  Archive,
  Calendar,
  List,
  Wallet,
  DollarSign,
  ToggleLeft,
  Trash2,
  Upload,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { isSuperAdmin, isAdmin, hasPermission } from "@/lib/permissions";
import type { User } from "@/types";

interface ConfigLink {
  label: string;
  path: string;
  permission?: string;
}

interface ConfigSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  links: ConfigLink[];
}

interface ConfigGroup {
  groupTitle: string;
  sections: ConfigSection[];
}

const settingsConfig: ConfigGroup[] = [
  {
    groupTitle: "General",
    sections: [
      {
        title: "Empresa",
        description: "Datos y configuración de la empresa",
        icon: Building2,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-500/15",
        links: [
          { label: "Configuración general", path: "/admin/settings/general", permission: "settings.manage" },
          { label: "Sucursales", path: "/admin/branches", permission: "branches.view" },
          { label: "Métodos de Pago", path: "/admin/payment-methods", permission: "payment-methods.view" },
        ],
      },
      {
        title: "Usuarios",
        description: "Gestiona los usuarios del sistema",
        icon: Users,
        iconColor: "text-indigo-600",
        bgColor: "bg-indigo-500/15",
        links: [
          { label: "Ver usuarios", path: "/admin/users", permission: "users.view" },
          { label: "Crear usuario", path: "/admin/users/create", permission: "users.manage" },
          { label: "Gestionar Roles", path: "/admin/roles", permission: "roles.view" },
        ],
      },
    ],
  },
  {
    groupTitle: "Documentos",
    sections: [
      {
        title: "Facturación Electrónica",
        description: "Configuración DIAN",
        icon: FileCheck,
        iconColor: "text-orange-600",
        bgColor: "bg-orange-500/15",
        links: [
          { label: "Creación de Empresa", path: "/admin/electronic-invoicing", permission: "electronic-invoicing.manage" },
          { label: "Habilitación DIAN", path: "/admin/electronic-invoicing/habilitacion", permission: "electronic-invoicing.manage" },
          { label: "Configuración FE", path: "/admin/electronic-invoicing/config", permission: "electronic-invoicing.config" },
        ],
      },
    ],
  },
  {
    groupTitle: "Operaciones",
    sections: [
      {
        title: "Inventario",
        description: "Productos y almacenamiento",
        icon: Package,
        iconColor: "text-cyan-600",
        bgColor: "bg-cyan-500/15",
        links: [
          { label: "Productos y Servicios", path: "/admin/products", permission: "products.view" },
          { label: "Categorías", path: "/admin/product-categories", permission: "categories.view" },
          { label: "Áreas", path: "/admin/product-areas", permission: "areas.view" },
          { label: "Bodegas", path: "/admin/warehouses", permission: "warehouses.view" },
          { label: "Ubicaciones", path: "/admin/locations", permission: "locations.view" },
          { label: "Proveedores", path: "/admin/suppliers", permission: "suppliers.view" },
          { label: "Motivos de Ajuste", path: "/admin/adjustment-reasons", permission: "inventory.adjustments.manage" },
        ],
      },
    ],
  },
  {
    groupTitle: "Finanzas",
    sections: [
      {
        title: "Caja",
        description: "Gestión de cajas y transferencias",
        icon: CreditCard,
        iconColor: "text-teal-600",
        bgColor: "bg-teal-500/15",
        links: [
          { label: "Gestión de Cajas", path: "/admin/cash-registers", permission: "cash-registers.view" },
          { label: "Transferencias", path: "/admin/cash-transfers", permission: "cash-registers.view" },
          { label: "Historial Transferencias", path: "/admin/cash-transfers-history", permission: "cash-transfers.view" },
          { label: "Cierres Anteriores", path: "/admin/cash-closures", permission: "cash-registers.view" },
          { label: "Reportes de Caja", path: "/admin/cash-reports", permission: "cash-reports.view" },
        ],
      },
      {
        title: "Cartera",
        description: "Saldos de clientes y proveedores",
        icon: Wallet,
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-500/15",
        links: [
          { label: "Saldos Clientes", path: "/admin/balances/clients", permission: "payments.view" },
          { label: "Saldos Proveedores", path: "/admin/balances/suppliers", permission: "payments.view" },
        ],
      },
      {
        title: "Contabilidad",
        description: "Plan de cuentas y reportes",
        icon: BookOpen,
        iconColor: "text-purple-600",
        bgColor: "bg-purple-500/15",
        links: [
          { label: "Plan de Cuentas", path: "/admin/accounting/accounts", permission: "accounting.view" },
          { label: "Registros Contables", path: "/admin/accounting/journal-entries", permission: "accounting.view" },
          { label: "Reportes Contables", path: "/admin/accounting/reports", permission: "accounting.reports" },
          { label: "Periodos", path: "/admin/accounting/periods", permission: "accounting.periods" },
          { label: "Configuración Contable", path: "/admin/accounting/config", permission: "accounting.settings" },
        ],
      },
    ],
  },
  {
    groupTitle: "Herramientas",
    sections: [
      {
        title: "Reportes",
        description: "Análisis y estadísticas",
        icon: BarChart3,
        iconColor: "text-emerald-600",
        bgColor: "bg-emerald-500/15",
        links: [
          { label: "Panel de Reportes", path: "/admin/reports", permission: "reports.view" },
        ],
      },
      {
        title: "Importación Masiva",
        description: "Importa datos desde archivos Excel",
        icon: Upload,
        iconColor: "text-violet-600",
        bgColor: "bg-violet-100",
        links: [
          { label: "Importar Clientes", path: "/admin/bulk-import?type=clients", permission: "clients.import" },
          { label: "Importar Proveedores", path: "/admin/bulk-import?type=suppliers", permission: "suppliers.import" },
          { label: "Importar Productos", path: "/admin/bulk-import?type=products", permission: "products.import" },
          { label: "Importar Servicios", path: "/admin/bulk-import?type=services", permission: "services.import" },
        ],
      },
    ],
  },
  {
    groupTitle: "Marketing",
    sections: [
      {
        title: "Marketing",
        description: "Mensajes y comunicación con clientes",
        icon: Megaphone,
        iconColor: "text-pink-600",
        bgColor: "bg-pink-500/15",
        links: [
          { label: "Mensajes", path: "/admin/settings/messages", permission: "settings.manage" },
        ],
      },
    ],
  },
  {
    groupTitle: "Sistema",
    sections: [
      {
        title: "Seguridad",
        description: "Autenticación y auditoría",
        icon: Shield,
        iconColor: "text-red-600",
        bgColor: "bg-red-500/15",
        links: [
          { label: "Seguridad (2FA)", path: "/admin/security" },
          { label: "Logs de Auditoría", path: "/admin/audit-logs", permission: "audit-logs.view" },
          { label: "Logs de API Externa", path: "/admin/external-api-logs", permission: "external-api-logs.view" },
          { label: "Auditoría de Facturación", path: "/admin/sales-audit", permission: "sales-audit.view" },
        ],
      },
      {
        title: "Papelera de reciclaje",
        description: "Recupera información eliminada",
        icon: Trash2,
        iconColor: "text-red-600",
        bgColor: "bg-red-500/15",
        links: [
          { label: "Facturas anuladas", path: "/admin/trash/sales", permission: "trash.view" },
          { label: "Clientes eliminados", path: "/admin/trash/clients", permission: "trash.view" },
          { label: "Productos eliminados", path: "/admin/trash/products", permission: "trash.view" },
        ],
      },
    ],
  },
];

const SettingsCard = ({
  section,
  onNavigate,
}: {
  section: ConfigSection;
  onNavigate: (path: string) => void;
}) => {
  const SectionIcon = section.icon;

  return (
    <div className="bg-card border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
      <div className="p-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${section.bgColor}`}>
            <SectionIcon className={`h-5 w-5 ${section.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {section.description}
            </p>
          </div>
        </div>
      </div>
      <div className="p-1.5">
        {section.links.map((link) => (
          <button
            key={link.path}
            onClick={() => onNavigate(link.path)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-primary/5 rounded-lg transition-colors group"
          >
            <span className="text-left truncate">{link.label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default function SettingsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;
  const [searchQuery, setSearchQuery] = useState("");

  const canAccess = (permission?: string) => {
    if (!permission) return true;
    if (isSuperAdmin(user)) return true;
    return hasPermission(permission, user);
  };

  // Filter config based on user permissions
  const permissionFilteredConfig = useMemo(() => {
    return settingsConfig
      .map((group) => ({
        ...group,
        sections: group.sections
          .map((section) => ({
            ...section,
            links: section.links.filter((link) => canAccess(link.permission)),
          }))
          .filter((section) => section.links.length > 0),
      }))
      .filter((group) => group.sections.length > 0);
  }, [user]);

  // Filter by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return permissionFilteredConfig;

    const query = searchQuery.toLowerCase();

    return permissionFilteredConfig
      .map((group) => {
        const filteredSections = group.sections
          .map((section) => {
            const titleMatch = section.title.toLowerCase().includes(query);
            const descMatch = section.description.toLowerCase().includes(query);
            const filteredLinks = section.links.filter((link) =>
              link.label.toLowerCase().includes(query)
            );

            if (titleMatch || descMatch || filteredLinks.length > 0) {
              return {
                ...section,
                links: titleMatch || descMatch ? section.links : filteredLinks,
              };
            }
            return null;
          })
          .filter(Boolean) as ConfigSection[];

        if (filteredSections.length > 0) {
          return { ...group, sections: filteredSections };
        }
        return null;
      })
      .filter(Boolean) as ConfigGroup[];
  }, [searchQuery, permissionFilteredConfig]);

  const totalResults = useMemo(() => {
    return filteredGroups.reduce(
      (acc, group) =>
        acc + group.sections.reduce((sAcc, section) => sAcc + section.links.length, 0),
      0
    );
  }, [filteredGroups]);

  const isSearching = searchQuery.trim().length > 0;

  const handleNavigate = (path: string) => {
    router.visit(path);
  };

  return (
    <AppLayout title="Configuración">
      <Head title="Configuración" />

      <div className="space-y-6">
        <Card className="shadow-sm p-4 sm:p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar configuración..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Search results indicator */}
          {isSearching && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {totalResults} resultado{totalResults !== 1 ? "s" : ""} para
              </span>
              <span className="text-sm font-medium text-foreground bg-primary/10 px-2 py-0.5 rounded">
                {searchQuery}
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-primary hover:underline ml-auto"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}

          {filteredGroups.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium text-foreground">
                No se encontraron resultados
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Intenta con otros términos
              </p>
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredGroups.map((group) => (
                <section key={group.groupTitle}>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    {group.groupTitle}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {group.sections.map((section) => (
                      <SettingsCard
                        key={section.title}
                        section={section}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
