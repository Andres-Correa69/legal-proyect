import {
  Building2,
  MapPin,
  Users,
  Package,
  Receipt,
  DollarSign,
  Calendar,
  Shield,
  Globe,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Company } from "@/types";
import type { CompanySummary } from "@/lib/api";

interface Props {
  company: Company;
  summary: CompanySummary | null;
}

export function CompanyOverviewView({ company, summary }: Props) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/100/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Sucursales</p>
              <p className="text-xl font-bold">{summary?.branches_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">{summary?.active_branches ?? 0} activas</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/100/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Usuarios</p>
              <p className="text-xl font-bold">{summary?.users_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">{summary?.active_users ?? 0} activos</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/100/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Productos</p>
              <p className="text-xl font-bold">{summary?.products_count ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/100/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Ventas (año)</p>
              <p className="text-xl font-bold">{summary?.sales_count ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Info Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-base">Información General</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{company.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Slug</span>
              <span className="text-sm font-medium font-mono text-xs">{company.slug}</span>
            </div>
            {company.tax_id && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">NIT</span>
                <span className="text-sm font-medium">{company.tax_id}</span>
              </div>
            )}
            {company.email && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{company.email}</span>
              </div>
            )}
            {company.phone && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Teléfono</span>
                <span className="text-sm font-medium">{company.phone}</span>
              </div>
            )}
            {company.address && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Dirección</span>
                <span className="text-sm font-medium text-right max-w-[60%]">{company.address}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Creada</span>
              <span className="text-sm font-medium">{formatDate(company.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <h3 className="font-semibold text-base">Resumen Financiero</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-muted/40 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Ventas del Año</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary?.sales_total_year ?? 0)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Total Ventas</p>
                <p className="text-lg font-bold">{summary?.sales_count ?? 0}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Productos</p>
                <p className="text-lg font-bold">{summary?.products_count ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Franchise & EI Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-base">Estado del Sistema</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Estado</span>
              <span className={`text-sm font-medium ${company.is_active ? "text-emerald-600" : "text-red-500"}`}>
                {company.is_active ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <span className="text-sm font-medium">
                {summary?.is_franchise ? "Franquicia" : "Empresa Principal"}
              </span>
            </div>
            {company.parent && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Empresa Padre</span>
                <span className="text-sm font-medium text-primary">{company.parent.name}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Facturación Electrónica</span>
              <span className={`text-sm font-medium ${summary?.has_electronic_invoicing ? "text-emerald-600" : "text-muted-foreground"}`}>
                {summary?.has_electronic_invoicing ? "Habilitada" : "No habilitada"}
              </span>
            </div>
            {company.children && company.children.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Franquicias</span>
                <span className="text-sm font-medium">{company.children.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-base">Usuarios Recientes</h3>
          </div>
          {summary?.recent_users && summary.recent_users.length > 0 ? (
            <div className="space-y-2">
              {summary.recent_users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {user.roles?.map((role) => (
                      <span key={role.id} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin usuarios registrados</p>
          )}
        </div>
      </div>
    </div>
  );
}
