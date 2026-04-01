import { useState, useEffect, useMemo } from "react";
import { Head, router } from "@inertiajs/react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Info,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Star,
  ClipboardList,
  ShoppingCart,
  Receipt,
  Calendar,
  Banknote,
  Loader2,
} from "lucide-react";
import { ClientOverviewView } from "@/components/client/ClientOverviewView";
import { ClientInfoView } from "@/components/client/ClientInfoView";
import { ClientInvoicesView } from "@/components/client/ClientInvoicesView";
import { ClientQuotesView } from "@/components/client/ClientQuotesView";
import { ClientHistoryView } from "@/components/client/ClientHistoryView";
import { ClientAccountView } from "@/components/client/ClientAccountView";
import { ClientCreditsView } from "@/components/client/ClientCreditsView";
import { ClientCalendarView } from "@/components/client/ClientCalendarView";
import AppLayout from "@/layouts/app-layout";
import { useToast } from "@/hooks/use-toast";
import { clientsApi, balanceInquiryApi } from "@/lib/api";
import type { User } from "@/types";
import type { ClientBalanceDetail } from "@/lib/api";

interface Props {
  clientId: number;
}

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "info", label: "Información", icon: Info },
  { id: "invoices", label: "Facturas", icon: FileText },
  { id: "quotes", label: "Presupuestos", icon: ClipboardList },
  { id: "account", label: "Estado de Cuenta", icon: Receipt },
  { id: "credits", label: "Créditos", icon: Banknote },
  { id: "calendar", label: "Calendario", icon: Calendar },
  { id: "history", label: "Historial", icon: History },
];

const ClientShow = ({ clientId }: Props) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [client, setClient] = useState<User | null>(null);
  const [balanceData, setBalanceData] = useState<ClientBalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [clientData, balance] = await Promise.all([
          clientsApi.getById(clientId),
          balanceInquiryApi.client(clientId),
        ]);
        setClient(clientData);
        setBalanceData(balance);
      } catch (err) {
        console.error("Error loading client data:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del cliente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [clientId]);

  const initials = useMemo(() => {
    if (!client?.name) return "??";
    return client.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [client?.name]);

  const totalSpent = balanceData?.totals?.total_sales ?? 0;
  const totalPaid = balanceData?.totals?.total_paid ?? 0;
  const pendingBalance = balanceData?.totals?.total_balance_due ?? 0;
  const invoiceCount = balanceData?.totals?.sales_count ?? 0;
  const productCount = balanceData?.sales?.reduce((sum, s) => sum + s.items_count, 0) ?? 0;

  const handleWhatsApp = () => {
    if (client?.whatsapp_number) {
      const country = client.whatsapp_country?.replace("+", "") || "57";
      window.open(`https://wa.me/${country}${client.whatsapp_number}`, "_blank");
    }
  };
  const handlePhone = () => {
    if (client?.phone) window.open(`tel:${client.phone}`);
  };
  const handleEmail = () => {
    if (client?.email) window.open(`mailto:${client.email}`);
  };

  const fmt = (n: number) => `$ ${n.toLocaleString("es-CO")}`;

  if (loading) {
    return (
      <AppLayout>
        <Head title="Cliente" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando datos del cliente...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <Head title="Cliente no encontrado" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold mb-2">Cliente no encontrado</p>
            <Button variant="outline" onClick={() => router.visit("/admin/clients")}>
              Volver a clientes
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={client.name} />
      <div className="-mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6 min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-14 z-10">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Row 1: Back + Avatar + Name/Doc/Badges + Actions */}
            <div className="flex items-center gap-3 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => router.visit("/admin/clients")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-10 w-10 flex-shrink-0 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-foreground capitalize truncate">
                    {client.name}
                  </h1>
                  <Badge
                    variant="default"
                    className={
                      client.is_active
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0"
                        : "text-[10px] h-5 flex-shrink-0"
                    }
                  >
                    {client.is_active ? "ACTIVO" : "INACTIVO"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CreditCard className="h-3 w-3 flex-shrink-0" />
                  {client.document_type || "CC"}: {client.document_id || "N/A"}
                </p>
              </div>

              {/* Contact + Edit */}
              <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[hsl(var(--success))]"
                      onClick={handleWhatsApp}
                      disabled={!client.whatsapp_number}
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
                      disabled={!client.phone}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Llamar: {client.phone || "N/A"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={handleEmail}
                      disabled={!client.email}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{client.email || "N/A"}</TooltipContent>
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
                    <p className="text-[10px] text-muted-foreground leading-none">Total Gastado</p>
                    <p className="text-sm font-bold">{fmt(totalSpent)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Productos</p>
                    <p className="text-sm font-bold">{productCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Facturas</p>
                    <p className="text-sm font-bold">{invoiceCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Star className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">Total Pagado</p>
                    <p className="text-sm font-bold">{fmt(totalPaid)}</p>
                  </div>
                </div>
                {pendingBalance > 0 && (
                  <div className="flex items-center gap-1.5 px-5 border-l border-destructive/30">
                    <div className="h-2 w-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-destructive leading-none font-medium">Pendiente</p>
                      <p className="text-sm font-bold text-destructive">{fmt(pendingBalance)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs row - segmented style */}
          <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
            <nav className="flex items-center bg-muted/60 rounded-lg p-1 overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1
                      ${isActive
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
            <ClientOverviewView
              balanceData={balanceData}
              client={client}
            />
          )}
          {activeTab === "info" && (
            <ClientInfoView
              client={client}
              onClientUpdated={(updatedClient) => setClient(updatedClient)}
            />
          )}
          {activeTab === "invoices" && (
            <ClientInvoicesView balanceData={balanceData} />
          )}
          {activeTab === "quotes" && <ClientQuotesView clientId={clientId} />}
          {activeTab === "account" && (
            <ClientAccountView balanceData={balanceData} />
          )}
          {activeTab === "credits" && (
            <ClientCreditsView balanceData={balanceData} />
          )}
          {activeTab === "history" && (
            <ClientHistoryView balanceData={balanceData} client={client} />
          )}
          {activeTab === "calendar" && (
            <ClientCalendarView balanceData={balanceData} />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ClientShow;
