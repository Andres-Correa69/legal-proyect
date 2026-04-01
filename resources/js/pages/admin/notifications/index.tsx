import { Head } from "@inertiajs/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { router } from "@inertiajs/react";

import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { appointmentsApi, invoiceAlertsApi, purchaseAlertsApi } from "@/lib/api";
import type { InvoiceAlertData, PurchaseAlertData } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { AppointmentReminder, UnifiedNotification } from "@/types";
import {
    Bell,
    CalendarDays,
    AlertTriangle,
    Clock,
    CreditCard,
    Search,
    CheckCheck,
    X,
    FileText,
    ArrowLeft,
    Package,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

type TypeFilter = "all" | "reminder" | "invoice_alert" | "purchase_alert";
type StatusFilter = "all" | "unread" | "read";

function normalizeReminders(reminders: AppointmentReminder[]): UnifiedNotification[] {
    return reminders.map((r) => ({
        id: `reminder-${r.id}`,
        originalId: r.id,
        type: "reminder" as const,
        title: r.appointment?.title || "Cita programada",
        description: r.appointment?.client?.name
            ? `Cliente: ${r.appointment.client.name}`
            : "Sin cliente asignado",
        date: r.remind_at,
        isRead: r.is_read,
        isDismissed: r.is_dismissed,
        metadata: {
            appointmentId: r.appointment_id,
            appointment: r.appointment,
        },
    }));
}

function normalizeInvoiceAlerts(alertData: InvoiceAlertData): UnifiedNotification[] {
    const notifications: UnifiedNotification[] = [];

    const categories: Array<{
        key: "overdue" | "due_soon" | "partial_payment";
        subtype: string;
        titlePrefix: string;
    }> = [
        { key: "overdue", subtype: "overdue", titlePrefix: "Factura vencida" },
        { key: "due_soon", subtype: "due_soon", titlePrefix: "Factura por vencer" },
        { key: "partial_payment", subtype: "partial_payment", titlePrefix: "Pago parcial" },
    ];

    for (const cat of categories) {
        const category = alertData[cat.key];
        for (const item of category.items) {
            notifications.push({
                id: `invoice-${cat.subtype}-${item.id}`,
                originalId: item.id,
                type: "invoice_alert",
                subtype: cat.subtype,
                title: `${cat.titlePrefix}: ${item.invoice_number}`,
                description: item.client?.name
                    ? `${item.client.name} — Saldo: ${formatCurrency(item.balance)}`
                    : `Saldo: ${formatCurrency(item.balance)}`,
                date: item.due_date || new Date().toISOString(),
                isRead: false,
                isDismissed: false,
                metadata: {
                    invoiceId: item.id,
                    invoiceNumber: item.invoice_number,
                    balance: item.balance,
                    totalAmount: item.total_amount,
                    clientName: item.client?.name,
                },
            });
        }
    }

    return notifications;
}

function normalizePurchaseAlerts(alertData: PurchaseAlertData): UnifiedNotification[] {
    const notifications: UnifiedNotification[] = [];

    const categories: Array<{
        key: "overdue" | "due_soon" | "partial_payment";
        subtype: string;
        titlePrefix: string;
    }> = [
        { key: "overdue", subtype: "overdue", titlePrefix: "Compra vencida" },
        { key: "due_soon", subtype: "due_soon", titlePrefix: "Compra por vencer" },
        { key: "partial_payment", subtype: "partial_payment", titlePrefix: "Pago parcial compra" },
    ];

    for (const cat of categories) {
        const category = alertData[cat.key];
        for (const item of category.items) {
            notifications.push({
                id: `purchase-${cat.subtype}-${item.id}`,
                originalId: item.id,
                type: "purchase_alert",
                subtype: cat.subtype,
                title: `${cat.titlePrefix}: ${item.purchase_number}`,
                description: item.supplier?.name
                    ? `${item.supplier.name} — Saldo: ${formatCurrency(item.balance_due)}`
                    : `Saldo: ${formatCurrency(item.balance_due)}`,
                date: item.credit_due_date || new Date().toISOString(),
                isRead: false,
                isDismissed: false,
                metadata: {
                    purchaseId: item.id,
                    purchaseNumber: item.purchase_number,
                    balanceDue: item.balance_due,
                    totalAmount: item.total_amount,
                    supplierName: item.supplier?.name,
                },
            });
        }
    }

    return notifications;
}

function getNotificationIcon(notification: UnifiedNotification) {
    if (notification.type === "reminder") {
        return { icon: CalendarDays, bg: "bg-blue-500/100/10", color: "text-blue-500" };
    }
    if (notification.type === "purchase_alert") {
        switch (notification.subtype) {
            case "overdue":
                return { icon: AlertTriangle, bg: "bg-orange-500/100/10", color: "text-orange-500" };
            case "due_soon":
                return { icon: Clock, bg: "bg-yellow-500/100/10", color: "text-yellow-500" };
            case "partial_payment":
                return { icon: CreditCard, bg: "bg-purple-500/100/10", color: "text-purple-500" };
            default:
                return { icon: Package, bg: "bg-muted", color: "text-muted-foreground" };
        }
    }
    switch (notification.subtype) {
        case "overdue":
            return { icon: AlertTriangle, bg: "bg-red-500/100/10", color: "text-red-500" };
        case "due_soon":
            return { icon: Clock, bg: "bg-amber-500/100/10", color: "text-amber-500" };
        case "partial_payment":
            return { icon: CreditCard, bg: "bg-blue-500/100/10", color: "text-blue-500" };
        default:
            return { icon: FileText, bg: "bg-muted", color: "text-muted-foreground" };
    }
}

function getTypeBadge(notification: UnifiedNotification) {
    if (notification.type === "reminder") {
        return (
            <Badge variant="outline" className="text-[10px] rounded-full text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-800">
                Recordatorio
            </Badge>
        );
    }
    if (notification.type === "purchase_alert") {
        switch (notification.subtype) {
            case "overdue":
                return (
                    <Badge variant="outline" className="text-[10px] rounded-full text-orange-600 border-orange-500/20 dark:text-orange-400 dark:border-orange-800">
                        Compra vencida
                    </Badge>
                );
            case "due_soon":
                return (
                    <Badge variant="outline" className="text-[10px] rounded-full text-yellow-600 border-yellow-500/20 dark:text-yellow-400 dark:border-yellow-800">
                        Compra por vencer
                    </Badge>
                );
            case "partial_payment":
                return (
                    <Badge variant="outline" className="text-[10px] rounded-full text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-800">
                        Pago parcial compra
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-[10px] rounded-full text-orange-600 border-orange-500/20 dark:text-orange-400 dark:border-orange-800">
                        Alerta compra
                    </Badge>
                );
        }
    }
    switch (notification.subtype) {
        case "overdue":
            return (
                <Badge variant="outline" className="text-[10px] rounded-full text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-800">
                    Vencida
                </Badge>
            );
        case "due_soon":
            return (
                <Badge variant="outline" className="text-[10px] rounded-full text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-800">
                    Por vencer
                </Badge>
            );
        case "partial_payment":
            return (
                <Badge variant="outline" className="text-[10px] rounded-full text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-800">
                    Pago parcial
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="text-[10px] rounded-full">
                    Alerta
                </Badge>
            );
    }
}

export default function NotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [allNotifications, setAllNotifications] = useState<UnifiedNotification[]>([]);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [reminders, alertData, purchaseData] = await Promise.allSettled([
                appointmentsApi.getReminders(),
                invoiceAlertsApi.getAlerts(),
                purchaseAlertsApi.getAlerts(),
            ]);

            const normalizedReminders =
                reminders.status === "fulfilled" ? normalizeReminders(reminders.value) : [];
            const normalizedAlerts =
                alertData.status === "fulfilled" ? normalizeInvoiceAlerts(alertData.value) : [];
            const normalizedPurchases =
                purchaseData.status === "fulfilled" ? normalizePurchaseAlerts(purchaseData.value) : [];

            const merged = [...normalizedReminders, ...normalizedAlerts, ...normalizedPurchases];
            merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setAllNotifications(merged);
        } catch {
            console.error("Error fetching notifications");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return allNotifications.filter((n) => {
            if (typeFilter !== "all" && n.type !== typeFilter) return false;
            if (statusFilter === "unread" && n.isRead) return false;
            if (statusFilter === "read" && !n.isRead) return false;
            if (q && !n.title.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [allNotifications, typeFilter, statusFilter, search]);

    const stats = useMemo(() => {
        const remindersPending = allNotifications.filter(
            (n) => n.type === "reminder" && !n.isRead && !n.isDismissed
        ).length;
        const invoiceAlerts = allNotifications.filter((n) => n.type === "invoice_alert").length;
        const purchaseAlerts = allNotifications.filter((n) => n.type === "purchase_alert").length;
        const totalUnread = allNotifications.filter((n) => !n.isRead).length;
        return { remindersPending, invoiceAlerts, purchaseAlerts, totalUnread };
    }, [allNotifications]);

    const handleMarkReminderRead = async (id: number) => {
        try {
            await appointmentsApi.markReminderRead(id);
            setAllNotifications((prev) =>
                prev.map((n) => (n.type === "reminder" && n.originalId === id ? { ...n, isRead: true } : n))
            );
        } catch {
            console.error("Error marking reminder as read");
        }
    };

    const handleDismissReminder = async (id: number) => {
        try {
            await appointmentsApi.dismissReminder(id);
            setAllNotifications((prev) => prev.filter((n) => !(n.type === "reminder" && n.originalId === id)));
        } catch {
            console.error("Error dismissing reminder");
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await appointmentsApi.markAllRemindersRead();
            setAllNotifications((prev) =>
                prev.map((n) => (n.type === "reminder" ? { ...n, isRead: true } : n))
            );
        } catch {
            console.error("Error marking all as read");
        }
    };

    return (
        <AppLayout>
            <Head title="Notificaciones" />

            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.visit("/admin/dashboard")}
                            className="h-8 w-8 flex-shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center border flex-shrink-0">
                            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="text-sm sm:text-lg font-bold">Notificaciones</h1>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                                Recordatorios, alertas de ventas y compras
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs h-8"
                        onClick={handleMarkAllRead}
                        disabled={stats.remindersPending === 0}
                    >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Marcar todo leido</span>
                    </Button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="border shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-blue-500/100/10 flex items-center justify-center">
                                <CalendarDays className="h-4 w-4 text-blue-500" />
                            </div>
                            <p className="text-xl font-bold">{stats.remindersPending}</p>
                            <p className="text-[10px] text-muted-foreground">Recordatorios</p>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-red-500/100/10 flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                            <p className="text-xl font-bold">{stats.invoiceAlerts}</p>
                            <p className="text-[10px] text-muted-foreground">Alertas ventas</p>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-orange-500/100/10 flex items-center justify-center">
                                <Package className="h-4 w-4 text-orange-500" />
                            </div>
                            <p className="text-xl font-bold">{stats.purchaseAlerts}</p>
                            <p className="text-[10px] text-muted-foreground">Alertas compras</p>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="h-8 w-8 mx-auto mb-2 rounded-full bg-amber-500/100/10 flex items-center justify-center">
                                <Bell className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-xl font-bold">{stats.totalUnread}</p>
                            <p className="text-[10px] text-muted-foreground">Sin leer</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="space-y-1 flex-1 w-full sm:w-auto">
                                <label className="text-xs text-muted-foreground">Tipo</label>
                                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="reminder">Recordatorios</SelectItem>
                                        <SelectItem value="invoice_alert">Alertas de ventas</SelectItem>
                                        <SelectItem value="purchase_alert">Alertas de compras</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 flex-1 w-full sm:w-auto">
                                <label className="text-xs text-muted-foreground">Estado</label>
                                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card z-50">
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="unread">Sin leer</SelectItem>
                                        <SelectItem value="read">Leidos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1 flex-[2] w-full sm:w-auto">
                                <label className="text-xs text-muted-foreground">Buscar</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar notificaciones..."
                                        className="h-9 text-sm pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications list */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Spinner className="h-8 w-8" />
                            <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {allNotifications.length === 0
                                ? "No hay notificaciones"
                                : "No se encontraron notificaciones con los filtros seleccionados"}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {filtered.length} notificacion{filtered.length !== 1 ? "es" : ""}
                        </p>
                        {filtered.map((notification) => {
                            const iconConfig = getNotificationIcon(notification);
                            const Icon = iconConfig.icon;
                            return (
                                <Card
                                    key={notification.id}
                                    className={`border shadow-sm transition-colors ${
                                        !notification.isRead ? "border-l-4 border-l-[hsl(var(--billing-primary))]" : ""
                                    }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-full shrink-0 mt-0.5 ${iconConfig.bg}`}>
                                                <Icon className={`h-4 w-4 ${iconConfig.color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className={`text-sm truncate ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
                                                                {notification.title}
                                                            </p>
                                                            {getTypeBadge(notification)}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                            {notification.description}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-1">
                                                            {(() => {
                                                                try {
                                                                    return formatDistanceToNow(new Date(notification.date), {
                                                                        addSuffix: true,
                                                                        locale: es,
                                                                    });
                                                                } catch {
                                                                    return format(new Date(notification.date), "dd/MM/yyyy", { locale: es });
                                                                }
                                                            })()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {notification.type === "reminder" && !notification.isRead && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                                                onClick={() => handleMarkReminderRead(notification.originalId)}
                                                            >
                                                                <CheckCheck className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">Leido</span>
                                                            </Button>
                                                        )}
                                                        {notification.type === "reminder" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleDismissReminder(notification.originalId)}
                                                                title="Descartar"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                        {notification.type === "invoice_alert" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1"
                                                                onClick={() => router.visit("/admin/sales")}
                                                            >
                                                                <FileText className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">Ver factura</span>
                                                            </Button>
                                                        )}
                                                        {notification.type === "purchase_alert" && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1"
                                                                onClick={() => router.visit("/admin/inventory-purchases")}
                                                            >
                                                                <Package className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">Ver compra</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
