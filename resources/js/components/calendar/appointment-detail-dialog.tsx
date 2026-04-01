import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  MapPin,
  User,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Trash2,
  MessageSquare,
  StickyNote,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES, APPOINTMENT_PRIORITIES } from "@/config/calendar.config";
import type { Appointment } from "@/types";

interface AppointmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (appointmentId: number, status: string) => void;
  onDelete: (appointmentId: number) => void;
  canManage: boolean;
}

function InfoItem({
  icon: Icon,
  label,
  children,
  color,
}: {
  icon: React.ElementType;
  label?: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="p-2 rounded-lg shrink-0 mt-0.5"
        style={color ? { backgroundColor: `${color}12` } : undefined}
      >
        <Icon
          className="h-4 w-4"
          style={color ? { color } : undefined}
        />
      </div>
      <div className="min-w-0 flex-1">
        {label && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
            {label}
          </p>
        )}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export function AppointmentDetailDialog({
  open,
  onOpenChange,
  appointment,
  onEdit,
  onStatusChange,
  onDelete,
  canManage,
}: AppointmentDetailDialogProps) {
  if (!appointment) return null;

  const typeConfig = APPOINTMENT_TYPES[appointment.type];
  const statusConfig = APPOINTMENT_STATUSES[appointment.status];
  const priorityConfig = APPOINTMENT_PRIORITIES[appointment.priority];
  const TypeIcon = typeConfig?.icon || CalendarDays;
  const appointmentColor = appointment.color || "#3b82f6";

  const handleEdit = () => {
    onOpenChange(false);
    onEdit(appointment);
  };

  const handleComplete = () => {
    onStatusChange(appointment.id, "completed");
    onOpenChange(false);
  };

  const handleCancel = () => {
    onStatusChange(appointment.id, "cancelled");
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(appointment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header con banner de color */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{ background: `linear-gradient(135deg, ${appointmentColor}15, ${appointmentColor}05)` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="p-3.5 rounded-xl shadow-sm"
              style={{
                backgroundColor: `${appointmentColor}18`,
                border: `1px solid ${appointmentColor}25`,
              }}
            >
              <TypeIcon className="h-7 w-7" style={{ color: appointmentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-0">
                <DialogTitle className="text-xl font-bold leading-tight truncate pr-8">
                  {appointment.title}
                </DialogTitle>
                <DialogDescription className="sr-only">Detalle de la cita</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge className={cn("text-xs rounded-full", typeConfig?.color)}>
                  {typeConfig?.label}
                </Badge>
                <Badge className={cn("text-xs rounded-full", statusConfig?.color)}>
                  {statusConfig?.label}
                </Badge>
                {appointment.priority !== "normal" && (
                  <Badge variant="outline" className={cn("text-xs rounded-full", priorityConfig?.color)}>
                    {priorityConfig?.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {/* Barra decorativa */}
          <div
            className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full"
            style={{ backgroundColor: `${appointmentColor}25` }}
          />
        </div>

        {/* Contenido */}
        <div className="px-6 pb-6 space-y-4">
          {/* Info card */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3.5">
            {/* Fecha/Hora */}
            <InfoItem icon={CalendarDays} label="Fecha" color={appointmentColor}>
              <p className="font-medium capitalize">
                {format(new Date(appointment.starts_at), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              {!appointment.all_day ? (
                <p className="text-muted-foreground text-xs mt-0.5">
                  {format(new Date(appointment.starts_at), "HH:mm")}
                  {appointment.ends_at && ` — ${format(new Date(appointment.ends_at), "HH:mm")}`}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs mt-0.5">Todo el día</p>
              )}
            </InfoItem>

            {/* Cliente */}
            {appointment.client && (
              <>
                <Separator />
                <InfoItem icon={User} label="Cliente" color={appointmentColor}>
                  <p className="font-medium">{appointment.client.name}</p>
                  {appointment.client.email && (
                    <p className="text-muted-foreground text-xs mt-0.5">{appointment.client.email}</p>
                  )}
                </InfoItem>
              </>
            )}

            {/* Ubicación */}
            {appointment.location && (
              <>
                <Separator />
                <InfoItem icon={MapPin} label="Ubicación" color={appointmentColor}>
                  <p>{appointment.location}</p>
                </InfoItem>
              </>
            )}

            {/* Factura relacionada */}
            {appointment.related_sale && (
              <>
                <Separator />
                <InfoItem icon={FileText} label="Factura relacionada" color={appointmentColor}>
                  <p className="font-medium">#{appointment.related_sale.invoice_number}</p>
                </InfoItem>
              </>
            )}
          </div>

          {/* Descripción */}
          {appointment.description && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Descripción
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{appointment.description}</p>
            </div>
          )}

          {/* Notas */}
          {appointment.notes && (
            <div className="rounded-lg border bg-amber-500/100/5 dark:bg-amber-500/100/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Notas internas
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{appointment.notes}</p>
            </div>
          )}

          {/* Metadata */}
          {appointment.created_by && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <UserCircle className="h-3.5 w-3.5" />
              <span>
                Creada por <span className="font-medium">{appointment.created_by.name}</span> el{" "}
                {format(new Date(appointment.created_at), "dd/MM/yyyy 'a las' HH:mm")}
              </span>
            </div>
          )}

          {/* Acciones */}
          {canManage && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 p-3">
                {appointment?.type !== "holiday" && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    {appointment.status === "scheduled" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:hover:bg-green-950/20 border-green-500/20 dark:border-green-800"
                          onClick={handleComplete}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Completar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:hover:bg-red-950/20 border-red-500/20 dark:border-red-800"
                          onClick={handleCancel}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
