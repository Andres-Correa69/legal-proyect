import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
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
  Receipt,
  DollarSign,
  History,
  Mail,
  Phone,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { UserOverviewView } from "@/components/user/UserOverviewView";
import { UserInfoView } from "@/components/user/UserInfoView";
import { UserCommissionsView } from "@/components/user/UserCommissionsView";
import { UserHistoryView } from "@/components/user/UserHistoryView";
import AppLayout from "@/layouts/app-layout";
import { useToast } from "@/hooks/use-toast";
import { usersApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { User, SharedData } from "@/types";
import type { UserSummary } from "@/lib/api";

interface Props {
  userId: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "info", label: "Información", icon: Info },
  { id: "commissions", label: "Comisiones", icon: DollarSign },
  { id: "history", label: "Historial", icon: History },
];

const roleColorMap: Record<string, string> = {
  "super-admin": "bg-red-500/100 text-white",
  admin: "bg-purple-600 text-white",
  employee: "bg-blue-500/100 text-white",
  cashier: "bg-amber-500/100 text-white",
  warehouse: "bg-teal-600 text-white",
};

function calculateSeniority(admissionDate: string | null | undefined): string {
  if (!admissionDate) return "Sin fecha de ingreso";
  const start = new Date(admissionDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mes${months !== 1 ? "es" : ""}`);
  return parts.length > 0 ? parts.join(" ") : "Menos de un mes";
}

const UserShow = ({ userId }: Props) => {
  const { auth } = usePage<SharedData>().props;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userData, setUserData] = useState<User | null>(null);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userResponse, summaryResponse] = await Promise.all([
        usersApi.getById(userId),
        usersApi.getSummary(userId),
      ]);
      setUserData(userResponse);
      setSummary(summaryResponse);
    } catch (err) {
      console.error("Error loading user data:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del usuario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    try {
      const [userResponse, summaryResponse] = await Promise.all([
        usersApi.getById(userId),
        usersApi.getSummary(userId),
      ]);
      setUserData(userResponse);
      setSummary(summaryResponse);
    } catch (err) {
      console.error("Error refreshing user data:", err);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos del usuario.",
        variant: "destructive",
      });
    }
  }, [userId]);

  const initials = useMemo(() => {
    if (!userData?.name) return "??";
    return userData.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [userData?.name]);

  const handleWhatsApp = () => {
    if (userData?.whatsapp_number) {
      const country = userData.whatsapp_country?.replace("+", "") || "57";
      window.open(
        `https://wa.me/${country}${userData.whatsapp_number}`,
        "_blank"
      );
    }
  };

  const handlePhone = () => {
    if (userData?.phone) window.open(`tel:${userData.phone}`);
  };

  const handleEmail = () => {
    if (userData?.email) window.open(`mailto:${userData.email}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <Head title="Usuario" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando datos del usuario...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!userData) {
    return (
      <AppLayout>
        <Head title="Usuario no encontrado" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold mb-2">
              Usuario no encontrado
            </p>
            <Button
              variant="outline"
              onClick={() => router.visit("/admin/users")}
            >
              Volver a usuarios
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={userData.name} />
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
                onClick={() => router.visit("/admin/users")}
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
                  <h1 className="text-sm sm:text-base font-bold text-foreground capitalize truncate">
                    {userData.name}
                  </h1>
                  <Badge
                    variant="default"
                    className={
                      userData.is_active
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0"
                        : "text-[10px] h-5 flex-shrink-0"
                    }
                  >
                    {userData.is_active ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                  {userData.roles?.map((role) => (
                    <Badge
                      key={role.id}
                      variant="default"
                      className={`text-[10px] h-5 flex-shrink-0 ${
                        roleColorMap[role.slug] || "bg-muted/500 text-white"
                      }`}
                    >
                      {role.name}
                    </Badge>
                  ))}
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
                        className="h-8 w-8 text-[hsl(var(--success))]"
                        onClick={handleWhatsApp}
                        disabled={!userData.whatsapp_number}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handlePhone}
                        disabled={!userData.phone}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Llamar: {userData.phone || "N/A"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={handleEmail}
                        disabled={!userData.email}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{userData.email || "N/A"}</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Row 2: Metrics bar */}
            <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-0 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 pr-5">
                  <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Salario
                    </p>
                    <p className="text-sm font-bold">
                      {summary?.salary_info.salary != null
                        ? formatCurrency(summary.salary_info.salary)
                        : "Sin definir"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Comisiones Año
                    </p>
                    <p className="text-sm font-bold">
                      {formatCurrency(
                        summary?.commission_summary.total_commission ?? 0
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Ventas
                    </p>
                    <p className="text-sm font-bold">
                      {summary?.sales_as_seller.count ?? 0} ventas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Antigüedad
                    </p>
                    <p className="text-sm font-bold">
                      {calculateSeniority(summary?.salary_info.admission_date)}
                    </p>
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
            <UserOverviewView user={userData} summary={summary} />
          )}
          {activeTab === "info" && (
            <UserInfoView user={userData} onUpdate={refreshData} />
          )}
          {activeTab === "commissions" && (
            <UserCommissionsView userId={userId} />
          )}
          {activeTab === "history" && <UserHistoryView userId={userId} />}
        </div>
      </div>
    </AppLayout>
  );
};

export default UserShow;
