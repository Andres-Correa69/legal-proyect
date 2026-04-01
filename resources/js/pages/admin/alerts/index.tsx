import { Head, usePage } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { alertRulesApi } from "@/lib/api";
import type { AlertRule, AlertLog, AlertStats, AlertRuleType, AlertFrequency, SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  BellRing,
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Pause,
  TestTube,
  History,
  Package,
  TrendingDown,
  Users,
  ShoppingCart,
  Target,
  FileText,
  DollarSign,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  CalendarDays,
  CalendarIcon,
  Cake,
} from "lucide-react";

const ALERT_TYPE_CONFIG: Record<AlertRuleType, {
  label: string;
  description: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
  conditionFields: { key: string; label: string; type: 'number' | 'currency'; defaultValue: number; suffix?: string }[];
}> = {
  low_stock: {
    label: "Stock Bajo",
    description: "Alerta cuando el stock de productos cae por debajo del umbral",
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-500/100/10",
    conditionFields: [
      { key: "threshold", label: "Umbral de stock", type: "number", defaultValue: 10, suffix: "unidades" },
    ],
  },
  sales_decrease: {
    label: "Disminución de Ventas",
    description: "Alerta cuando las ventas caen respecto al período anterior",
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-red-500/100/10",
    conditionFields: [
      { key: "percentage", label: "Porcentaje de caída", type: "number", defaultValue: 20, suffix: "%" },
      { key: "period_days", label: "Período de comparación", type: "number", defaultValue: 7, suffix: "días" },
    ],
  },
  inactive_clients: {
    label: "Clientes Inactivos",
    description: "Alerta sobre clientes recurrentes que dejaron de comprar",
    icon: Users,
    color: "text-violet-600",
    bgColor: "bg-violet-500/10",
    conditionFields: [
      { key: "days", label: "Días sin compra", type: "number", defaultValue: 30, suffix: "días" },
      { key: "min_purchases", label: "Compras mínimas previas", type: "number", defaultValue: 3 },
    ],
  },
  no_movement_products: {
    label: "Productos sin Movimiento",
    description: "Alerta sobre productos en stock que no se han vendido",
    icon: ShoppingCart,
    color: "text-amber-600",
    bgColor: "bg-amber-500/100/10",
    conditionFields: [
      { key: "days", label: "Días sin ventas", type: "number", defaultValue: 30, suffix: "días" },
    ],
  },
  sales_target: {
    label: "Meta de Ventas",
    description: "Alerta cuando las ventas no alcanzan la meta establecida",
    icon: Target,
    color: "text-blue-600",
    bgColor: "bg-blue-500/100/10",
    conditionFields: [
      { key: "target_amount", label: "Meta de ventas", type: "currency", defaultValue: 5000000 },
      { key: "period_days", label: "Período", type: "number", defaultValue: 30, suffix: "días" },
    ],
  },
  upcoming_invoices: {
    label: "Facturas por Vencer",
    description: "Alerta sobre facturas que están próximas a vencer",
    icon: FileText,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/100/10",
    conditionFields: [
      { key: "days", label: "Días antes del vencimiento", type: "number", defaultValue: 7, suffix: "días" },
    ],
  },
  high_expenses: {
    label: "Gastos Elevados",
    description: "Alerta cuando los gastos superan un límite establecido",
    icon: DollarSign,
    color: "text-rose-600",
    bgColor: "bg-rose-500/10",
    conditionFields: [
      { key: "threshold", label: "Límite de gastos", type: "currency", defaultValue: 1000000 },
      { key: "period_days", label: "Período", type: "number", defaultValue: 30, suffix: "días" },
    ],
  },
  client_birthday: {
    label: "Cumpleaños de Clientes",
    description: "Alerta sobre clientes que cumplen años próximamente",
    icon: Cake,
    color: "text-pink-600",
    bgColor: "bg-pink-500/100/10",
    conditionFields: [
      { key: "days", label: "Días de anticipación", type: "number", defaultValue: 7, suffix: "días" },
    ],
  },
};

const FREQUENCY_LABELS: Record<AlertFrequency, string> = {
  hourly: "Cada hora",
  daily: "Diario",
  weekly: "Semanal",
};

export default function AlertsPage() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const { toast } = useToast();

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats>({ total_rules: 0, active_rules: 0, today_triggers: 0, emails_sent: 0 });
  const [recentLogs, setRecentLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedRuleLogs, setSelectedRuleLogs] = useState<AlertLog[]>([]);
  const [selectedRuleName, setSelectedRuleName] = useState("");
  const [activeTab, setActiveTab] = useState<"rules" | "logs">("rules");

  // Logs filters
  const [logsSearch, setLogsSearch] = useState("");
  const [logsFilterType, setLogsFilterType] = useState<string>("all");
  const [logsFilterEmail, setLogsFilterEmail] = useState<string>("all");
  const [logsDatePreset, setLogsDatePreset] = useState<string>("all");
  const [logsDateFrom, setLogsDateFrom] = useState("");
  const [logsDateTo, setLogsDateTo] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);

  const [expandedRule, setExpandedRule] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, AlertLog[]>>({});
  const [loadingLogs, setLoadingLogs] = useState<number | null>(null);
  const [selectedLogDetail, setSelectedLogDetail] = useState<AlertLog | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AlertRuleType>("low_stock");
  const [formConditions, setFormConditions] = useState<Record<string, any>>({});
  const [formRecipients, setFormRecipients] = useState("");
  const [formFrequency, setFormFrequency] = useState<AlertFrequency>("daily");
  const [formActive, setFormActive] = useState(true);

  const canManage = hasPermission("alerts.manage", user);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesData, statsData, logsData] = await Promise.all([
        alertRulesApi.getAll(),
        alertRulesApi.getStats(),
        alertRulesApi.getRecentLogs(),
      ]);
      setRules(rulesData);
      setStats(statsData);
      setRecentLogs(logsData);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las alertas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (search && !rule.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && rule.type !== filterType) return false;
      if (filterActive === "active" && !rule.is_active) return false;
      if (filterActive === "inactive" && rule.is_active) return false;
      return true;
    });
  }, [rules, search, filterType, filterActive]);

  // Pagination
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage);
  const paginatedRules = filteredRules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, filterType, filterActive, itemsPerPage]);

  // Date preset helper
  const getDateRange = useCallback((preset: string): { from: Date | null; to: Date | null } => {
    const now = new Date();
    const startOfDay = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
    switch (preset) {
      case "today": return { from: startOfDay(now), to: null };
      case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: startOfDay(y), to: new Date(startOfDay(now).getTime() - 1) }; }
      case "3days": { const d = new Date(now); d.setDate(d.getDate() - 3); return { from: startOfDay(d), to: null }; }
      case "7days": { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: startOfDay(d), to: null }; }
      case "custom": {
        const from = logsDateFrom ? new Date(logsDateFrom + "T00:00:00") : null;
        const to = logsDateTo ? new Date(logsDateTo + "T23:59:59.999") : null;
        return { from, to };
      }
      default: return { from: null, to: null };
    }
  }, [logsDateFrom, logsDateTo]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const { from, to } = getDateRange(logsDatePreset);
    return recentLogs.filter(log => {
      if (logsSearch) {
        const s = logsSearch.toLowerCase();
        const name = (log.alert_rule?.name || "").toLowerCase();
        const summary = (log.data?.summary || "").toLowerCase();
        if (!name.includes(s) && !summary.includes(s)) return false;
      }
      if (logsFilterType !== "all") {
        if ((log.alert_rule?.type || "") !== logsFilterType) return false;
      }
      if (logsFilterEmail === "sent" && !log.email_sent) return false;
      if (logsFilterEmail === "error" && !log.email_error) return false;
      if (logsFilterEmail === "pending" && (log.email_sent || log.email_error)) return false;
      if (from && new Date(log.triggered_at) < from) return false;
      if (to && new Date(log.triggered_at) > to) return false;
      return true;
    });
  }, [recentLogs, logsSearch, logsFilterType, logsFilterEmail, logsDatePreset, logsDateFrom, logsDateTo, getDateRange]);

  const logsTotalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice((logsPage - 1) * logsPerPage, logsPage * logsPerPage);

  useEffect(() => { setLogsPage(1); }, [logsSearch, logsFilterType, logsFilterEmail, logsDatePreset, logsDateFrom, logsDateTo, logsPerPage]);

  const resetForm = () => {
    setFormName("");
    setFormType("low_stock");
    setFormConditions({});
    setFormRecipients(user?.email || "");
    setFormFrequency("daily");
    setFormActive(true);
    setEditingRule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    // Set default conditions for the selected type
    const config = ALERT_TYPE_CONFIG["low_stock"];
    const defaults: Record<string, any> = {};
    config.conditionFields.forEach(f => { defaults[f.key] = f.defaultValue; });
    setFormConditions(defaults);
    setFormRecipients(user?.email || "");
    setDialogOpen(true);
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormConditions(rule.conditions || {});
    setFormRecipients(rule.recipients.join(", "));
    setFormFrequency(rule.frequency);
    setFormActive(rule.is_active);
    setDialogOpen(true);
  };

  const handleTypeChange = (type: AlertRuleType) => {
    setFormType(type);
    const config = ALERT_TYPE_CONFIG[type];
    const defaults: Record<string, any> = {};
    config.conditionFields.forEach(f => { defaults[f.key] = f.defaultValue; });
    setFormConditions(defaults);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    const recipients = formRecipients.split(",").map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast({ title: "Error", description: "Debe agregar al menos un destinatario", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipients.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast({ title: "Error", description: `Emails inválidos: ${invalidEmails.join(", ")}`, variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: formName,
        type: formType,
        conditions: formConditions,
        recipients,
        frequency: formFrequency,
        is_active: formActive,
      };

      if (editingRule) {
        await alertRulesApi.update(editingRule.id, data);
        toast({ title: "Actualizada", description: "Regla de alerta actualizada exitosamente" });
      } else {
        await alertRulesApi.create(data);
        toast({ title: "Creada", description: "Regla de alerta creada exitosamente" });
      }
      setDialogOpen(false);
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la regla de alerta", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ruleToDelete) return;
    try {
      await alertRulesApi.delete(ruleToDelete.id);
      toast({ title: "Eliminada", description: "Regla de alerta eliminada" });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const handleToggle = async (rule: AlertRule) => {
    try {
      await alertRulesApi.toggleActive(rule.id);
      toast({ title: rule.is_active ? "Pausada" : "Activada", description: `Alerta "${rule.name}" ${rule.is_active ? 'pausada' : 'activada'}` });
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    }
  };

  const handleTest = async (rule: AlertRule) => {
    try {
      setTesting(rule.id);
      const result = await alertRulesApi.test(rule.id);
      if (result.triggered) {
        toast({ title: "Alerta disparada", description: "Se encontraron items y se envió email a los destinatarios" });
      } else {
        toast({ title: "Sin resultados", description: "No se encontraron items que cumplan las condiciones actualmente" });
      }
      loadData();
    } catch {
      toast({ title: "Error", description: "No se pudo probar la alerta", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const handleViewLogs = async (rule: AlertRule) => {
    try {
      const logs = await alertRulesApi.getLogs(rule.id, 20);
      setSelectedRuleLogs(logs);
      setSelectedRuleName(rule.name);
      setLogsDialogOpen(true);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el historial", variant: "destructive" });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Nunca";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
  };

  const formatFullDate = (date: string | null) => {
    if (!date) return "Nunca";
    const d = new Date(date);
    const exact = d.toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    const relative = formatDistanceToNow(d, { addSuffix: true, locale: es });
    return `${exact} (${relative})`;
  };

  const toggleExpand = async (ruleId: number) => {
    if (expandedRule === ruleId) {
      setExpandedRule(null);
      return;
    }
    setExpandedRule(ruleId);
    if (!expandedLogs[ruleId]) {
      setLoadingLogs(ruleId);
      try {
        const logs = await alertRulesApi.getLogs(ruleId, 5);
        setExpandedLogs(prev => ({ ...prev, [ruleId]: logs }));
      } catch {
        // silently fail
      } finally {
        setLoadingLogs(null);
      }
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <Head title="Alertas" />
        <div className="flex items-center justify-center h-96">
          <Spinner className="h-8 w-8" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title="Alertas" />

      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-card border-b -mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-red-500/100/10">
                <BellRing className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Alertas</h1>
                <p className="text-sm text-muted-foreground">Configura alertas automáticas con notificaciones por email</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Reglas", value: stats.total_rules, icon: Bell, color: "text-blue-600", bg: "bg-blue-500/100/10" },
                { label: "Activas", value: stats.active_rules, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/100/10" },
                { label: "Disparadas Hoy", value: stats.today_triggers, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/100/10" },
                { label: "Emails Enviados", value: stats.emails_sent, icon: Mail, color: "text-indigo-600", bg: "bg-indigo-500/100/10" },
              ].map((stat) => (
                <Card key={stat.label} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {(["rules", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "rules" ? "Reglas de Alerta" : "Historial de Ejecuciones"}
            </button>
          ))}
        </div>

        {activeTab === "rules" && (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {/* Filters */}
              <div className="p-4 border-b space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar alertas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterActive} onValueChange={setFilterActive}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Activas</SelectItem>
                      <SelectItem value="inactive">Inactivas</SelectItem>
                    </SelectContent>
                  </Select>
                  {canManage && (
                    <Button onClick={openCreateDialog} className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nueva Alerta</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Rules List */}
              <div className="p-4 space-y-3">
                {paginatedRules.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No hay alertas configuradas</p>
                    <p className="text-sm mt-1">Crea tu primera regla de alerta para recibir notificaciones por email</p>
                    {canManage && (
                      <Button onClick={openCreateDialog} className="mt-4 gap-2" variant="outline">
                        <Plus className="h-4 w-4" /> Crear primera alerta
                      </Button>
                    )}
                  </div>
                ) : (
                  paginatedRules.map((rule) => {
                    const config = ALERT_TYPE_CONFIG[rule.type];
                    const Icon = config?.icon || Bell;
                    const isExpanded = expandedRule === rule.id;
                    const ruleLogs = expandedLogs[rule.id] || [];
                    return (
                      <div
                        key={rule.id}
                        className={`border-2 border-border rounded-lg shadow-sm hover:shadow-md transition-all ${
                          !rule.is_active ? "opacity-60" : ""
                        } ${isExpanded ? "border-[hsl(var(--billing-primary))]/30" : ""}`}
                      >
                        <div
                          className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/5"
                          onClick={() => toggleExpand(rule.id)}
                        >
                          <div className={`p-2.5 rounded-lg ${config?.bgColor || "bg-muted"} shrink-0`}>
                            <Icon className={`h-5 w-5 ${config?.color || "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">{rule.name}</h3>
                              <Badge variant={rule.is_active ? "default" : "secondary"} className="rounded-full text-[10px]">
                                {rule.is_active ? "Activa" : "Pausada"}
                              </Badge>
                              <Badge variant="outline" className="rounded-full text-[10px]">
                                {config?.label || rule.type}
                              </Badge>
                              <Badge variant="outline" className="rounded-full text-[10px]">
                                {FREQUENCY_LABELS[rule.frequency]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{config?.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {rule.recipients.length} destinatario{rule.recipients.length !== 1 ? "s" : ""}
                              </span>
                              <span>Última verificación: {formatDate(rule.last_checked_at)}</span>
                              {rule.last_triggered_at && (
                                <span className="text-amber-600">Última alerta: {formatDate(rule.last_triggered_at)}</span>
                              )}
                              {rule.logs_count !== undefined && rule.logs_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <History className="h-3 w-3" />
                                  {rule.logs_count} ejecuciones
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="hidden lg:flex items-center gap-2">
                              {config?.conditionFields.map((field) => (
                                <div key={field.key} className="text-right">
                                  <p className="text-xs text-muted-foreground">{field.label}</p>
                                  <p className="text-sm font-semibold">
                                    {field.type === "currency"
                                      ? `$${Number(rule.conditions?.[field.key] || 0).toLocaleString("es-CO")}`
                                      : `${rule.conditions?.[field.key] || 0}${field.suffix ? ` ${field.suffix}` : ""}`
                                    }
                                  </p>
                                </div>
                              ))}
                            </div>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            {canManage && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card z-50">
                                  <DropdownMenuItem onClick={() => openEditDialog(rule)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggle(rule)}>
                                    {rule.is_active ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    {rule.is_active ? "Pausar" : "Activar"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTest(rule)} disabled={testing === rule.id}>
                                    {testing === rule.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                                    Probar ahora
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewLogs(rule)}>
                                    <History className="h-4 w-4 mr-2" /> Ver historial completo
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => { setRuleToDelete(rule); setDeleteDialogOpen(true); }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        {/* Expanded: last 5 logs */}
                        {isExpanded && (
                          <div className="border-t bg-muted/20 px-4 py-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Últimas 5 ejecuciones</p>
                            {loadingLogs === rule.id ? (
                              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
                              </div>
                            ) : ruleLogs.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">Sin ejecuciones registradas</p>
                            ) : (
                              <div className="space-y-2">
                                {ruleLogs.map((log) => (
                                  <div
                                    key={log.id}
                                    className="flex items-center gap-3 p-2.5 rounded-md bg-background border text-sm cursor-pointer hover:bg-accent/5 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); setSelectedLogDetail(log); }}
                                  >
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-foreground font-medium whitespace-nowrap">
                                      {new Date(log.triggered_at).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ({formatDistanceToNow(new Date(log.triggered_at), { addSuffix: true, locale: es })})
                                    </span>
                                    <span className="text-muted-foreground truncate flex-1">{log.data?.summary}</span>
                                    <span className="text-xs font-medium shrink-0">{(log.data?.items || []).length} items</span>
                                    {log.email_sent ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                    ) : log.email_error ? (
                                      <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" title={log.email_error || ""} />
                                    ) : null}
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {filteredRules.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrar</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span>de {filteredRules.length}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      {currentPage} / {totalPages || 1}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "logs" && (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {/* Filters */}
              <div className="p-4 border-b">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre o resumen..."
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={logsFilterType} onValueChange={setLogsFilterType}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={logsFilterEmail} onValueChange={setLogsFilterEmail}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Email" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sent">Email enviado</SelectItem>
                      <SelectItem value="error">Con error</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logsDatePreset} onValueChange={(v) => { setLogsDatePreset(v); if (v !== "custom") { setLogsDateFrom(""); setLogsDateTo(""); } }}>
                    <SelectTrigger className="w-full sm:w-44">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Fecha" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="all">Todas las fechas</SelectItem>
                      <SelectItem value="today">Hoy</SelectItem>
                      <SelectItem value="yesterday">Ayer</SelectItem>
                      <SelectItem value="3days">Últimos 3 días</SelectItem>
                      <SelectItem value="7days">Últimos 7 días</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(logsSearch || logsFilterType !== "all" || logsFilterEmail !== "all" || logsDatePreset !== "all") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground"
                      title="Limpiar filtros"
                      onClick={() => { setLogsSearch(""); setLogsFilterType("all"); setLogsFilterEmail("all"); setLogsDatePreset("all"); setLogsDateFrom(""); setLogsDateTo(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {logsDatePreset === "custom" && (
                  <div className="flex gap-3 mt-3 max-w-md">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Desde</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !logsDateFrom && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                            {logsDateFrom ? new Date(logsDateFrom + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerReport
                            selected={logsDateFrom ? new Date(logsDateFrom + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                setLogsDateFrom(`${y}-${m}-${d}`);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Hasta</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !logsDateTo && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                            {logsDateTo ? new Date(logsDateTo + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePickerReport
                            selected={logsDateTo ? new Date(logsDateTo + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                setLogsDateTo(`${y}-${m}-${d}`);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              {/* Logs List */}
              <div className="p-4 space-y-3">
                {paginatedLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No hay ejecuciones</p>
                    <p className="text-sm mt-1">
                      {filteredLogs.length === 0 && recentLogs.length > 0
                        ? "No se encontraron resultados con los filtros aplicados"
                        : "No hay ejecuciones recientes"}
                    </p>
                  </div>
                ) : (
                  paginatedLogs.map((log) => {
                    const ruleType = log.alert_rule?.type || "low_stock";
                    const config = ALERT_TYPE_CONFIG[ruleType as AlertRuleType];
                    const Icon = config?.icon || Bell;
                    return (
                      <div
                        key={log.id}
                        className="border-2 border-border rounded-lg p-4 hover:bg-accent/5 shadow-sm cursor-pointer transition-colors"
                        onClick={() => setSelectedLogDetail(log)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${config?.bgColor || "bg-muted"} shrink-0`}>
                            <Icon className={`h-4 w-4 ${config?.color || "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-foreground text-sm">{log.alert_rule?.name || "Alerta"}</h3>
                              <Badge variant="outline" className="rounded-full text-[10px]">{config?.label || ruleType}</Badge>
                              {log.email_sent ? (
                                <Badge className="rounded-full text-[10px] bg-green-500/100/10 text-green-600 border-green-500/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Email enviado
                                </Badge>
                              ) : log.email_error ? (
                                <Badge className="rounded-full text-[10px] bg-red-500/100/10 text-red-600 border-red-500/20">
                                  <XCircle className="h-3 w-3 mr-1" /> Error
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{log.data?.summary}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFullDate(log.triggered_at)} — {(log.data?.items || []).length} items encontrados
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {filteredLogs.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrar</span>
                    <Select value={String(logsPerPage)} onValueChange={(v) => setLogsPerPage(Number(v))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        {[5, 10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span>de {filteredLogs.length}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLogsPage(p => p - 1)} disabled={logsPage <= 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      {logsPage} / {logsTotalPages || 1}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setLogsPage(p => p + 1)} disabled={logsPage >= logsTotalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[hsl(var(--billing-primary))]/10">
                <BellRing className="h-5 w-5 text-[hsl(var(--billing-primary))]" />
              </div>
              <div>
                <DialogTitle className="text-lg">{editingRule ? "Editar Alerta" : "Nueva Alerta"}</DialogTitle>
                <DialogDescription>
                  {editingRule ? "Modifica los parámetros de la regla de alerta" : "Configura una nueva regla de alerta con notificación por email"}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Row 1: Name */}
            <div>
              <Label className="text-sm font-semibold">Nombre de la alerta *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ej: Stock bajo productos principales" className="mt-1.5" />
            </div>

            {/* Row 2: Type selector as grid */}
            <div>
              <Label className="text-sm font-semibold">Tipo de alerta *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                {Object.entries(ALERT_TYPE_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = formType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTypeChange(key as AlertRuleType)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-center ${
                        isSelected ? "border-[hsl(var(--billing-primary))] bg-[hsl(var(--billing-primary))]/5 shadow-sm" : "border-border hover:border-muted-foreground/30 hover:bg-accent/5"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5">
                          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--billing-primary))]" />
                        </div>
                      )}
                      <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <p className="text-xs font-medium leading-tight">{config.label}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{ALERT_TYPE_CONFIG[formType].description}</p>
            </div>

            {/* Row 3: Conditions + Frequency + Active */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Left: Conditions */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground h-5 flex items-center">Condiciones</p>
                {ALERT_TYPE_CONFIG[formType].conditionFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{field.label}{field.suffix ? ` (${field.suffix})` : ""}</p>
                    {field.type === "currency" ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={
                            (formConditions[field.key] ?? field.defaultValue)
                              ? Number(formConditions[field.key] ?? field.defaultValue).toLocaleString("es-CO", { maximumFractionDigits: 0 })
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "");
                            setFormConditions(prev => ({ ...prev, [field.key]: parseInt(value) || 0 }));
                          }}
                          className="pl-7"
                        />
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={formConditions[field.key] ?? field.defaultValue}
                        onChange={(e) => setFormConditions(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Center: Frequency */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground h-5 flex items-center">Frecuencia de verificación</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cada cuánto se verifica</p>
                  <Select value={formFrequency} onValueChange={(v) => setFormFrequency(v as AlertFrequency)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="hourly">Cada hora</SelectItem>
                      <SelectItem value="daily">Diario (8:00 AM)</SelectItem>
                      <SelectItem value="weekly">Semanal (Lunes 8:00 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right: Active toggle */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground h-5 flex items-center">Estado</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Activación de la alerta</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <Switch checked={formActive} onCheckedChange={setFormActive} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Activar inmediatamente</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Comenzará a verificarse según la frecuencia</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4: Recipients */}
            <div>
              <Label className="text-sm font-semibold">Destinatarios *</Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">Emails separados por coma que recibirán las notificaciones</p>
              <Textarea
                value={formRecipients}
                onChange={(e) => setFormRecipients(e.target.value)}
                placeholder="email1@empresa.com, email2@empresa.com"
                rows={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? "Actualizar" : "Crear Alerta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar regla de alerta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la regla "{ruleToDelete?.name}" y todo su historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial: {selectedRuleName}</DialogTitle>
            <DialogDescription>Últimas ejecuciones de esta regla de alerta</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedRuleLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay ejecuciones registradas</p>
            ) : (
              selectedRuleLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{formatFullDate(log.triggered_at)}</span>
                    {log.email_sent ? (
                      <Badge className="rounded-full text-[10px] bg-green-500/100/10 text-green-600 border-green-500/20">Email enviado</Badge>
                    ) : log.email_error ? (
                      <Badge className="rounded-full text-[10px] bg-red-500/100/10 text-red-600 border-red-500/20">Error: {log.email_error}</Badge>
                    ) : (
                      <Badge variant="secondary" className="rounded-full text-[10px]">Pendiente</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{log.data?.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(log.data?.items || []).length} items encontrados</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Detail Modal */}
      <Dialog open={!!selectedLogDetail} onOpenChange={(open) => { if (!open) setSelectedLogDetail(null); }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          {selectedLogDetail && (() => {
            const ruleType = (selectedLogDetail.alert_rule?.type || "low_stock") as AlertRuleType;
            const detailConfig = ALERT_TYPE_CONFIG[ruleType];
            const DetailIcon = detailConfig?.icon || Bell;
            const items = selectedLogDetail.data?.items || [];
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${detailConfig?.bgColor || "bg-muted"}`}>
                      <DetailIcon className={`h-5 w-5 ${detailConfig?.color || "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <DialogTitle className="text-base">{selectedLogDetail.alert_rule?.name || "Alerta"}</DialogTitle>
                      <DialogDescription>{detailConfig?.label || ruleType}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Timestamp & email status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatFullDate(selectedLogDetail.triggered_at)}</span>
                    {selectedLogDetail.email_sent ? (
                      <Badge className="rounded-full text-[10px] bg-green-500/100/10 text-green-600 border-green-500/20">Email enviado</Badge>
                    ) : selectedLogDetail.email_error ? (
                      <Badge className="rounded-full text-[10px] bg-red-500/100/10 text-red-600 border-red-500/20">Error</Badge>
                    ) : null}
                  </div>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">{selectedLogDetail.data?.summary}</p>

                  {/* Items */}
                  {items.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Detalle ({items.length} items)</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/10 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{item.name || item.product_name || item.client_name || item.invoice_number || `Item ${idx + 1}`}</p>
                              {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                              {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                              {item.client && <p className="text-xs text-muted-foreground">{item.client}</p>}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              {item.current_stock !== undefined && (
                                <p className="text-xs"><span className="text-muted-foreground">Stock:</span> <span className="font-semibold text-red-600">{item.current_stock}</span></p>
                              )}
                              {item.min_stock !== undefined && (
                                <p className="text-xs text-muted-foreground">Mín: {item.min_stock}</p>
                              )}
                              {item.stock !== undefined && item.current_stock === undefined && (
                                <p className="text-xs"><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{item.stock}</span></p>
                              )}
                              {item.balance !== undefined && (
                                <p className="text-xs"><span className="text-muted-foreground">Saldo:</span> <span className="font-semibold text-red-600">{formatCurrency(Number(item.balance))}</span></p>
                              )}
                              {item.due_date && (
                                <p className="text-xs text-muted-foreground">Vence: {new Date(item.due_date).toLocaleDateString("es-CO")}</p>
                              )}
                              {item.total_purchases !== undefined && (
                                <p className="text-xs text-muted-foreground">{item.total_purchases} compras</p>
                              )}
                              {item.sale_price !== undefined && (
                                <p className="text-xs text-muted-foreground">{formatCurrency(Number(item.sale_price))}</p>
                              )}
                              {item.last_purchase && (
                                <p className="text-xs text-muted-foreground">Última: {new Date(item.last_purchase).toLocaleDateString("es-CO")}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats for aggregate types */}
                  {selectedLogDetail.data?.current_amount !== undefined && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border bg-muted/10 text-center">
                        <p className="text-xs text-muted-foreground">Monto actual</p>
                        <p className="text-sm font-bold">{formatCurrency(Number(selectedLogDetail.data.current_amount))}</p>
                      </div>
                      {selectedLogDetail.data?.previous_amount !== undefined && (
                        <div className="p-3 rounded-lg border bg-muted/10 text-center">
                          <p className="text-xs text-muted-foreground">Monto anterior</p>
                          <p className="text-sm font-bold">{formatCurrency(Number(selectedLogDetail.data.previous_amount))}</p>
                        </div>
                      )}
                      {selectedLogDetail.data?.target_amount !== undefined && (
                        <div className="p-3 rounded-lg border bg-muted/10 text-center">
                          <p className="text-xs text-muted-foreground">Meta</p>
                          <p className="text-sm font-bold">{formatCurrency(Number(selectedLogDetail.data.target_amount))}</p>
                        </div>
                      )}
                      {selectedLogDetail.data?.threshold !== undefined && (
                        <div className="p-3 rounded-lg border bg-muted/10 text-center">
                          <p className="text-xs text-muted-foreground">Límite</p>
                          <p className="text-sm font-bold">{formatCurrency(Number(selectedLogDetail.data.threshold))}</p>
                        </div>
                      )}
                      {selectedLogDetail.data?.percentage !== undefined && (
                        <div className="p-3 rounded-lg border bg-muted/10 text-center">
                          <p className="text-xs text-muted-foreground">Variación</p>
                          <p className="text-sm font-bold text-red-600">{selectedLogDetail.data.percentage}%</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
