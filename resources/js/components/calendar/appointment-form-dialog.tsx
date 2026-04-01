import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  FileText,
  CalendarDays,
  Clock,
  SlidersHorizontal,
  MessageSquare,
  Bell,
  Check,
  MapPin,
  User,
  Palette,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { APPOINTMENT_TYPES, APPOINTMENT_PRIORITIES, PRESET_COLORS } from "@/config/calendar.config";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/types";

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAppointment: Appointment | null;
  clients: Array<{ id: number; name: string }>;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  loading: boolean;
  errors: Record<string, string>;
  initialDate?: string;
}

export interface AppointmentFormData {
  title: string;
  description: string;
  type: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  client_id: number | null;
  color: string;
  location: string;
  notes: string;
  reminder_minutes: number;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  editingAppointment,
  clients,
  onSubmit,
  loading,
  errors,
  initialDate,
}: AppointmentFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("appointment");
  const [priority, setPriority] = useState("normal");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [color, setColor] = useState("#3b82f6");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<string>("30");

  useEffect(() => {
    if (open) {
      if (editingAppointment) {
        const apt = editingAppointment;
        setTitle(apt.title);
        setDescription(apt.description || "");
        setType(apt.type);
        setPriority(apt.priority);
        const startDt = new Date(apt.starts_at);
        setStartDate(formatDateForInput(startDt));
        setStartTime(formatTimeForInput(startDt));
        if (apt.ends_at) {
          const endDt = new Date(apt.ends_at);
          setEndDate(formatDateForInput(endDt));
          setEndTime(formatTimeForInput(endDt));
        } else {
          setEndDate(formatDateForInput(startDt));
          setEndTime("");
        }
        setAllDay(apt.all_day);
        setClientId(apt.client_id ? String(apt.client_id) : "");
        setColor(apt.color || "#3b82f6");
        setLocation(apt.location || "");
        setNotes(apt.notes || "");
        setReminderMinutes("0");
      } else {
        setTitle("");
        setDescription("");
        setType("appointment");
        setPriority("normal");
        setStartDate(initialDate || formatDateForInput(new Date()));
        setStartTime("09:00");
        setEndDate(initialDate || formatDateForInput(new Date()));
        setEndTime("10:00");
        setAllDay(false);
        setClientId("");
        setColor("#3b82f6");
        setLocation("");
        setNotes("");
        setReminderMinutes("30");
      }
    }
  }, [open, editingAppointment, initialDate]);

  const formatDateForInput = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatTimeForInput = (d: Date) => {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const durationText = useMemo(() => {
    if (allDay) return "Todo el día";
    if (!startDate || !startTime || !endDate || !endTime) return null;
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return null;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins} min`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}min`;
    } catch {
      return null;
    }
  }, [startDate, startTime, endDate, endTime, allDay]);

  const typeConfig = APPOINTMENT_TYPES[type];
  const TypeIcon = typeConfig?.icon || CalendarDays;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startsAt = allDay ? `${startDate} 00:00:00` : `${startDate} ${startTime}:00`;
    const endsAt = allDay ? `${endDate || startDate} 23:59:59` : (endDate && endTime ? `${endDate} ${endTime}:00` : "");

    await onSubmit({
      title,
      description,
      type,
      priority,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      client_id: clientId ? Number(clientId) : null,
      color,
      location,
      notes,
      reminder_minutes: Number(reminderMinutes),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header con banner de color */}
        <div
          className="relative px-6 pt-6 pb-4 rounded-t-lg"
          style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)` }}
        >
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl shadow-sm"
              style={{ backgroundColor: `${color}18`, border: `1px solid ${color}25` }}
            >
              <TypeIcon className="h-6 w-6" style={{ color }} />
            </div>
            <DialogHeader className="flex-1 space-y-0.5">
              <DialogTitle className="text-xl font-bold">
                {editingAppointment ? "Editar Cita" : "Nueva Cita"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editingAppointment
                  ? "Modifica los datos de la cita existente"
                  : "Completa los datos para agendar una nueva cita"}
              </DialogDescription>
            </DialogHeader>
          </div>
          {/* Barra de color decorativa */}
          <div
            className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full"
            style={{ backgroundColor: `${color}30` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          {/* Error general */}
          {errors.general && (
            <div className="flex items-center gap-2.5 rounded-lg bg-red-500/10 dark:bg-red-950/20 p-3 border border-red-500/20 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{errors.general}</p>
            </div>
          )}

          {/* === Sección 1: Información básica === */}
          <div>
            <SectionHeader icon={FileText} label="Información básica" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="space-y-2.5">
                <Label htmlFor="title" className="text-xs font-medium">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Reunión con cliente"
                  className="h-10"
                  required
                />
                {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium">Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {Object.entries(APPOINTMENT_TYPES).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              {config.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium">Prioridad</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      {Object.entries(APPOINTMENT_PRIORITIES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", config.dot)} />
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* === Sección 2: Fecha y hora === */}
          <div>
            <SectionHeader icon={CalendarDays} label="Fecha y hora" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
              {/* Toggle todo el día */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Todo el día</span>
                </div>
                <Switch checked={allDay} onCheckedChange={setAllDay} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium">Fecha inicio *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>
                {!allDay && (
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium">Hora inicio</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium">Fecha fin</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                {!allDay && (
                  <div className="space-y-2.5">
                    <Label className="text-xs font-medium">Hora fin</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}
              </div>

              {/* Duración calculada */}
              {durationText && (
                <div
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: `${color}10`, color }}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Duración: {durationText}
                </div>
              )}
            </div>
          </div>

          {/* === Sección 3: Detalles === */}
          <div>
            <SectionHeader icon={SlidersHorizontal} label="Detalles" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    Cliente
                  </Label>
                  <Select value={clientId || "none"} onValueChange={(val) => setClientId(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sin cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    Ubicación
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Oficina, Sala 2..."
                    className="h-10"
                  />
                </div>
              </div>

              {/* Color picker mejorado */}
              <div className="space-y-2.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Palette className="h-3 w-3 text-muted-foreground" />
                  Color de la cita
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center",
                          "hover:scale-105 hover:shadow-md",
                          color === c
                            ? "border-foreground shadow-sm scale-105"
                            : "border-transparent hover:border-muted-foreground/30"
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      >
                        {color === c && (
                          <Check className="h-4 w-4 text-white drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === Sección 4: Notas === */}
          <div>
            <SectionHeader icon={MessageSquare} label="Notas adicionales" />
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="space-y-2.5">
                <Label className="text-xs font-medium">Descripción</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles adicionales sobre la cita..."
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-xs font-medium">Notas internas</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas que solo verás tú..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* === Sección 5: Recordatorio === */}
          {!editingAppointment && (
            <div>
              <SectionHeader icon={Bell} label="Recordatorio" />
              <div className="rounded-lg border bg-card p-4">
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card z-50">
                    <SelectItem value="0">Sin recordatorio</SelectItem>
                    <SelectItem value="15">15 minutos antes</SelectItem>
                    <SelectItem value="30">30 minutos antes</SelectItem>
                    <SelectItem value="60">1 hora antes</SelectItem>
                    <SelectItem value="1440">1 día antes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* === Footer === */}
          <Separator />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 min-w-[140px]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {editingAppointment ? "Guardar cambios" : "Crear cita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
