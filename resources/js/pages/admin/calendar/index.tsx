import { useState, useEffect, useCallback, useMemo } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Plus,
  List,
  Clock,
  AlertTriangle,
  Bell,
  CheckCircle,
  Loader2,
  ShoppingCart,
  PartyPopper,
  X,
  RefreshCw,
  Unlink,
  ExternalLink,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { appointmentsApi, clientsApi, googleCalendarApi } from "@/lib/api";
import type { GoogleCalendarToken } from "@/lib/api";
import type { Appointment, CalendarDateRangeData, SharedData } from "@/types";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { AgendaList } from "@/components/calendar/agenda-list";
import {
  AppointmentFormDialog,
  type AppointmentFormData,
} from "@/components/calendar/appointment-form-dialog";
import { AppointmentDetailDialog } from "@/components/calendar/appointment-detail-dialog";
import { HolidaysDialog } from "@/components/calendar/holidays-dialog";
import { GoogleContactsDialog } from "@/components/calendar/google-contacts-dialog";

export default function CalendarPage() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const { toast } = useToast();

  const canView = hasPermission("appointments.view", user);
  const canCreate = hasPermission("appointments.create", user);
  const canManage = hasPermission("appointments.manage", user);
  const canGoogleCalendar = hasPermission("appointments.google_calendar", user);

  // Core state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<string>("calendar");
  const [loading, setLoading] = useState(true);

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoiceDueDates, setInvoiceDueDates] = useState<CalendarDateRangeData["invoice_due_dates"]>([]);
  const [purchaseDueDates, setPurchaseDueDates] = useState<CalendarDateRangeData["purchase_due_dates"]>([]);
  const [stats, setStats] = useState<CalendarDateRangeData["stats"]>({
    total_appointments: 0,
    upcoming_today: 0,
    overdue_invoices: 0,
    overdue_purchases: 0,
    pending_reminders: 0,
  });
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);

  // Dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [holidaysDialogOpen, setHolidaysDialogOpen] = useState(false);
  const [showConnectionsDialog, setShowConnectionsDialog] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);

  // Google Calendar state
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarToken[]>([]);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState<number | null>(null);

  const fetchGoogleCalendars = useCallback(async () => {
    if (!canGoogleCalendar) { setGoogleLoading(false); return; }
    try {
      const data = await googleCalendarApi.getCalendars();
      setGoogleCalendars(data);
    } catch {
      setGoogleCalendars([]);
    } finally {
      setGoogleLoading(false);
    }
  }, [canGoogleCalendar]);

  useEffect(() => {
    fetchGoogleCalendars();
  }, [fetchGoogleCalendars]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GOOGLE_CALENDAR_CONNECTED") {
        setGoogleConnecting(false);
        fetchGoogleCalendars();
        toast({ title: "Google Calendar conectado", description: "Tu calendario ha sido vinculado exitosamente." });
      } else if (event.data?.type === "GOOGLE_CALENDAR_ERROR") {
        setGoogleConnecting(false);
        toast({ title: "Error al conectar", description: event.data.message || "No se pudo conectar con Google Calendar.", variant: "destructive" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fetchGoogleCalendars, toast]);

  const handleGoogleConnect = async () => {
    setGoogleConnecting(true);
    try {
      const data = await googleCalendarApi.getAuthUrl();
      const popup = window.open(data.auth_url, "google-calendar-auth", "width=600,height=700,scrollbars=yes");
      if (!popup) {
        toast({ title: "Popup bloqueado", description: "Permite las ventanas emergentes para conectar Google Calendar.", variant: "destructive" });
        setGoogleConnecting(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo iniciar la conexión.", variant: "destructive" });
      setGoogleConnecting(false);
    }
  };

  const handleGoogleDisconnect = async (tokenId: number) => {
    setGoogleDisconnecting(tokenId);
    try {
      await googleCalendarApi.disconnect(tokenId);
      setGoogleCalendars((prev) => prev.filter((c) => c.id !== tokenId));
      toast({ title: "Calendario desconectado", description: "Se ha desvinculado el calendario de Google." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo desconectar.", variant: "destructive" });
    } finally {
      setGoogleDisconnecting(null);
    }
  };

  const isGoogleConnected = googleCalendars.length > 0;

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const dateFrom = format(monthStart, "yyyy-MM-dd");
      const dateTo = format(monthEnd, "yyyy-MM-dd");

      const data = await appointmentsApi.getByDateRange(dateFrom, dateTo);
      setAppointments(data.appointments);
      setInvoiceDueDates(data.invoice_due_dates);
      setPurchaseDueDates(data.purchase_due_dates ?? []);
      setStats(data.stats);
    } catch (err: any) {
      console.error("Error fetching calendar data:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del calendario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canView, currentMonth, toast]);

  // Load clients for the form
  const fetchClients = useCallback(async () => {
    try {
      const data = await clientsApi.getAll();
      if (Array.isArray(data)) {
        setClients(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // silently fail - clients are optional
    }
  }, []);

  useEffect(() => {
    if (!canView) {
      router.visit("/admin/dashboard");
      return;
    }
    fetchCalendarData();
  }, [fetchCalendarData, canView]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Handlers
  const handleFormSubmit = async (formData: AppointmentFormData) => {
    setFormErrors({});
    setFormLoading(true);
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type,
        priority: formData.priority,
        starts_at: formData.starts_at,
        ends_at: formData.ends_at || undefined,
        all_day: formData.all_day,
        client_id: formData.client_id,
        color: formData.color,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };

      // Add reminder if set
      if (formData.reminder_minutes > 0 && !editingAppointment) {
        const startDate = new Date(formData.starts_at);
        const remindAt = new Date(startDate.getTime() - formData.reminder_minutes * 60 * 1000);
        payload.reminders = [{ remind_at: format(remindAt, "yyyy-MM-dd HH:mm:ss") }];
      }

      if (editingAppointment) {
        await appointmentsApi.update(editingAppointment.id, payload);
        toast({ title: "Cita actualizada", description: "La cita se actualizó correctamente." });
      } else {
        await appointmentsApi.create(payload);
        toast({ title: "Cita creada", description: "La cita se creó correctamente." });
      }

      setFormDialogOpen(false);
      setEditingAppointment(null);
      fetchCalendarData();
    } catch (err: any) {
      if (err.errors) {
        const mapped: Record<string, string> = {};
        Object.entries(err.errors).forEach(([key, msgs]: [string, any]) => {
          mapped[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setFormErrors(mapped);
      } else {
        setFormErrors({ general: err.message || "Error al guardar la cita." });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: number, status: string) => {
    try {
      await appointmentsApi.updateStatus(appointmentId, status);
      toast({
        title: status === "completed" ? "Cita completada" : "Cita cancelada",
        description: `La cita fue marcada como ${status === "completed" ? "completada" : "cancelada"}.`,
      });
      fetchCalendarData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (appointmentId: number) => {
    try {
      await appointmentsApi.delete(appointmentId);
      toast({ title: "Cita eliminada", description: "La cita fue eliminada correctamente." });
      fetchCalendarData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "No se pudo eliminar la cita.",
        variant: "destructive",
      });
    }
  };

  const openCreateDialog = (date?: string) => {
    setEditingAppointment(null);
    setFormErrors({});
    setSelectedDate(date || "");
    setFormDialogOpen(true);
  };

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormErrors({});
    setFormDialogOpen(true);
  };

  const openDetailDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };

  const handleDayClick = (date: Date, events: any[]) => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (events.length === 0 && canCreate) {
      openCreateDialog(dateStr);
    } else if (events.length === 1 && events[0].type === "appointment") {
      openDetailDialog(events[0].original as Appointment);
    }
    // If multiple events, user can click individual ones
  };

  const handleEventClick = (event: any) => {
    if (event.type === "appointment") {
      openDetailDialog(event.original as Appointment);
    } else if (event.type === "invoice_due") {
      router.visit(`/admin/sales`);
    } else if (event.type === "purchase_due") {
      router.visit(`/admin/inventory-purchases`);
    }
  };

  const handleInvoiceClick = (invoiceId: number) => {
    router.visit(`/admin/sales`);
  };

  const handlePurchaseClick = (purchaseId: number) => {
    router.visit(`/admin/inventory-purchases`);
  };

  if (!canView) return null;

  return (
    <AppLayout>
      <Head title="Calendario" />

      <div className="min-h-screen bg-background -mx-2 sm:-mx-4 lg:-mx-6 -mt-6">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-[1400px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#2463eb]/10 p-2.5 rounded-lg">
                  <CalendarDays className="h-5 w-5 text-[#2463eb]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Calendario</h1>
                  <p className="text-sm text-muted-foreground">Gestiona tus citas, eventos y vencimientos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.total_appointments} citas
                </Badge>
                {canGoogleCalendar && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 relative"
                    onClick={() => setShowConnectionsDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Conectar calendario</span>
                    {isGoogleConnected && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500/100 border-2 border-background" />
                    )}
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setHolidaysDialogOpen(true)}
                  >
                    <PartyPopper className="h-4 w-4" />
                    <span className="hidden sm:inline">Festivos</span>
                  </Button>
                )}
                {canCreate && (
                  <Button onClick={() => openCreateDialog()} className="gap-2 bg-[#2463eb] hover:bg-[#1d4fc4]">
                    <Plus className="h-4 w-4" />
                    Nueva Cita
                  </Button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-500/15 p-2 rounded-lg">
                      <CalendarDays className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Hoy</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming_today}</p>
                  <p className="text-xs text-muted-foreground mt-1">citas programadas</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-500/15 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Pendientes</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {appointments.filter((a) => a.status === "scheduled").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">por atender</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-red-500/15 p-2 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Fact. vencidas</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue_invoices}</p>
                  <p className="text-xs text-muted-foreground mt-1">facturas</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-orange-500/15 p-2 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Compras vencidas</h3>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{stats.overdue_purchases}</p>
                  <p className="text-xs text-muted-foreground mt-1">compras</p>
                </div>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-2 border-border hover:shadow-lg transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-purple-500/15 p-2 rounded-lg">
                      <Bell className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground">Recordatorios</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{stats.pending_reminders}</p>
                  <p className="text-xs text-muted-foreground mt-1">activos</p>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <Card className="shadow-xl border border-border p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-4 pt-4 border-b">
                <TabsList>
                  <TabsTrigger value="calendar" className="gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    Calendario
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="gap-1.5">
                    <List className="h-4 w-4" />
                    Agenda
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <TabsContent value="calendar" className="mt-0">
                      <CalendarGrid
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        appointments={appointments}
                        invoiceDueDates={invoiceDueDates}
                        purchaseDueDates={purchaseDueDates}
                        onDayClick={handleDayClick}
                        onEventClick={handleEventClick}
                      />
                    </TabsContent>

                    <TabsContent value="agenda" className="mt-0">
                      <AgendaList
                        appointments={appointments}
                        invoiceDueDates={invoiceDueDates}
                        purchaseDueDates={purchaseDueDates}
                        onAppointmentClick={openDetailDialog}
                        onInvoiceClick={handleInvoiceClick}
                        onPurchaseClick={handlePurchaseClick}
                        onStatusChange={handleStatusChange}
                        canManage={canManage}
                      />
                    </TabsContent>
                  </>
                )}
              </div>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Form Dialog */}
      <AppointmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingAppointment={editingAppointment}
        clients={clients}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        errors={formErrors}
        initialDate={selectedDate}
      />

      {/* Holidays Dialog */}
      <HolidaysDialog
        open={holidaysDialogOpen}
        onOpenChange={setHolidaysDialogOpen}
        onImported={fetchCalendarData}
      />

      {/* Detail Dialog */}
      <AppointmentDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        appointment={selectedAppointment}
        onEdit={openEditDialog}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        canManage={canManage}
      />

      {/* Google Contacts Import Dialog */}
      <GoogleContactsDialog
        open={showContactsDialog}
        onOpenChange={setShowContactsDialog}
        onImported={() => {}}
      />

      {/* Connections Dialog */}
      <Dialog open={showConnectionsDialog} onOpenChange={setShowConnectionsDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Conexiones</DialogTitle>
            <p className="text-sm text-muted-foreground">Conecta tus cuentas externas para sincronizar calendarios, contactos y reuniones.</p>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Google */}
            <div className="border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 48 48" className="h-6 w-6" fill="none">
                    <path fill="#4285F4" d="M46.14 24.5c0-1.57-.14-3.08-.41-4.54H24v8.59h12.43c-.54 2.9-2.17 5.36-4.62 7.01v5.83h7.48c4.37-4.03 6.85-9.96 6.85-16.89z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.92-2.15 15.89-5.81l-7.48-5.83c-2.08 1.4-4.74 2.22-8.41 2.22-6.47 0-11.96-4.37-13.92-10.24H2.39v6.02C6.34 42.57 14.59 48 24 48z"/>
                    <path fill="#FBBC05" d="M10.08 28.34A14.6 14.6 0 0 1 9.32 24c0-1.5.26-2.95.76-4.34v-6.02H2.39A23.97 23.97 0 0 0 0 24c0 3.87.93 7.53 2.39 10.36l7.69-6.02z"/>
                    <path fill="#EA4335" d="M24 9.52c3.65 0 6.92 1.26 9.5 3.72l7.12-7.12C36.91 2.38 31.47 0 24 0 14.59 0 6.34 5.43 2.39 13.64l7.69 6.02C12.04 13.89 17.53 9.52 24 9.52z"/>
                  </svg>
                  <span className="font-semibold text-base">Google</span>
                </div>
                {isGoogleConnected && (
                  <Badge className="bg-emerald-500/100/10 text-emerald-600 text-[10px]">Conectado</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Conecta tu cuenta de Google para tener todos tus contactos, eventos y calendario sincronizados.
              </p>

              {/* Connected calendars list */}
              {googleLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                googleCalendars.map((cal) => (
                  <div key={cal.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{cal.calendar_name || "Calendario Principal"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{cal.calendar_id}</p>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleGoogleDisconnect(cal.id)}
                        disabled={googleDisconnecting === cal.id}
                      >
                        {googleDisconnecting === cal.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unlink className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConnectionsDialog(false);
                    setShowContactsDialog(true);
                  }}
                >
                  Importar contactos
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    className="flex-1 bg-[#2463eb] hover:bg-[#1d4fc4] text-white gap-2"
                    onClick={handleGoogleConnect}
                    disabled={googleConnecting}
                  >
                    {googleConnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    {isGoogleConnected ? "Conectar otro" : "Conectar"}
                  </Button>
                )}
              </div>
            </div>

            {/* Microsoft 365 */}
            <div className="border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 23 23" className="h-6 w-6">
                  <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
                  <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
                </svg>
                <span className="font-semibold text-base">Microsoft 365</span>
              </div>
              <p className="text-sm text-muted-foreground flex-1">
                Conecta tu cuenta de 365 para tener todos tus eventos y calendario (Outlook o 365) sincronizados.
              </p>
              <div className="flex items-center justify-between pt-1">
                <button className="text-sm text-[#2463eb] hover:underline flex items-center gap-1">
                  <span>+</span> Más info
                </button>
                <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed">
                  Próximamente
                </Button>
              </div>
            </div>

            {/* Zoom */}
            <div className="border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xl text-[#2D8CFF]">zoom</span>
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
              </div>
              <p className="text-sm text-muted-foreground flex-1">
                Conecta tu cuenta de Zoom para crear enlaces de reuniones en tus actividades.
              </p>
            </div>

            {/* Outlook */}
            <div className="border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 48 48" className="h-6 w-6">
                  <rect x="0" y="6" width="28" height="36" rx="3" fill="#0078D4"/>
                  <rect x="20" y="12" width="28" height="26" rx="3" fill="#28A8E8"/>
                  <rect x="20" y="12" width="28" height="13" rx="2" fill="#0078D4" opacity="0.5"/>
                  <path d="M20 25h28" stroke="white" strokeWidth="1.5" opacity="0.4"/>
                  <ellipse cx="14" cy="24" rx="7" ry="8" fill="white" opacity="0.9"/>
                  <text x="14" y="27" textAnchor="middle" fontSize="9" fill="#0078D4" fontWeight="bold">O</text>
                </svg>
                <span className="font-semibold text-base">Outlook</span>
              </div>
              <p className="text-sm text-muted-foreground flex-1">
                Conecta tu cuenta de Outlook para sincronizar tu calendario y evitar conflictos de agenda.
              </p>
              <div className="flex items-center justify-between pt-1">
                <button className="text-sm text-[#2463eb] hover:underline flex items-center gap-1">
                  <span>+</span> Más info
                </button>
                <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed">
                  Próximamente
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
