import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router } from "@inertiajs/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  LayoutDashboard,
  Info,
  MapPin,
  Users,
  Mail,
  Phone,
  Loader2,
  Building2,
  Package,
  Receipt,
  Zap,
} from "lucide-react";
import { CompanyOverviewView } from "@/components/company/CompanyOverviewView";
import { CompanyInfoView } from "@/components/company/CompanyInfoView";
import { CompanyBranchesView } from "@/components/company/CompanyBranchesView";
import { CompanyUsersView } from "@/components/company/CompanyUsersView";
import { CompanySuperpowersView } from "@/components/company/CompanySuperpowersView";
import AppLayout from "@/layouts/app-layout";
import { useToast } from "@/hooks/use-toast";
import { companiesApi } from "@/lib/api";
import type { CompanySummary } from "@/lib/api";
import type { Company } from "@/types";

interface Props {
  companyId: number;
}

const tabs = [
  { id: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { id: "info", label: "Información", icon: Info },
  { id: "branches", label: "Sucursales", icon: MapPin },
  { id: "users", label: "Usuarios", icon: Users },
  { id: "superpowers", label: "Superpoderes", icon: Zap },
];

const CompanyShow = ({ companyId }: Props) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [summary, setSummary] = useState<CompanySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [companyResponse, summaryResponse] = await Promise.all([
        companiesApi.getById(companyId),
        companiesApi.getSummary(companyId),
      ]);
      setCompanyData(companyResponse);
      setSummary(summaryResponse);
    } catch (err) {
      console.error("Error loading company data:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de la empresa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    try {
      const [companyResponse, summaryResponse] = await Promise.all([
        companiesApi.getById(companyId),
        companiesApi.getSummary(companyId),
      ]);
      setCompanyData(companyResponse);
      setSummary(summaryResponse);
    } catch (err) {
      console.error("Error refreshing company data:", err);
    }
  }, [companyId]);

  const initials = useMemo(() => {
    if (!companyData?.name) return "??";
    return companyData.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [companyData?.name]);

  const handleEmail = () => {
    if (companyData?.email) window.open(`mailto:${companyData.email}`);
  };

  const handlePhone = () => {
    if (companyData?.phone) window.open(`tel:${companyData.phone}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <Head title="Empresa" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando datos de la empresa...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!companyData) {
    return (
      <AppLayout>
        <Head title="Empresa no encontrada" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold mb-2">Empresa no encontrada</p>
            <Button variant="outline" onClick={() => router.visit("/admin/companies")}>
              Volver a empresas
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={companyData.name} />
      <div className="-mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6 min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-14 z-10">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Row 1: Back + Avatar + Name/Badges + Contact */}
            <div className="flex items-center gap-3 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => router.visit("/admin/companies")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-10 w-10 flex-shrink-0 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                    {companyData.name}
                  </h1>
                  <Badge
                    variant="default"
                    className={
                      companyData.is_active
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0"
                        : "text-[10px] h-5 flex-shrink-0"
                    }
                  >
                    {companyData.is_active ? "ACTIVA" : "INACTIVA"}
                  </Badge>
                  {companyData.parent_id && (
                    <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                      FRANQUICIA
                    </Badge>
                  )}
                  {companyData.tax_id && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      NIT: {companyData.tax_id}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <TooltipProvider delayDuration={0}>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handlePhone}
                        disabled={!companyData.phone}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Llamar: {companyData.phone || "N/A"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handleEmail}
                        disabled={!companyData.email}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{companyData.email || "N/A"}</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Row 2: Metrics bar */}
            <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-0 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 pr-5">
                  <MapPin className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Sucursales</p>
                    <p className="text-sm font-bold">
                      {summary?.branches_count ?? 0} ({summary?.active_branches ?? 0} activas)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Usuarios</p>
                    <p className="text-sm font-bold">
                      {summary?.users_count ?? 0} ({summary?.active_users ?? 0} activos)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Productos</p>
                    <p className="text-sm font-bold">{summary?.products_count ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Ventas (año)</p>
                    <p className="text-sm font-bold">{summary?.sales_count ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs row - segmented style */}
          <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
            <nav className="flex items-center bg-muted/30 rounded-lg p-1 overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1
                      ${
                        isActive
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Full-width Tab Content */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4">
          {activeTab === "dashboard" && (
            <CompanyOverviewView company={companyData} summary={summary} />
          )}
          {activeTab === "info" && (
            <CompanyInfoView company={companyData} onUpdate={refreshData} />
          )}
          {activeTab === "branches" && (
            <CompanyBranchesView company={companyData} />
          )}
          {activeTab === "users" && (
            <CompanyUsersView companyId={companyId} />
          )}
          {activeTab === "superpowers" && (
            <CompanySuperpowersView company={companyData} onUpdate={refreshData} />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default CompanyShow;
