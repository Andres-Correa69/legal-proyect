import {
  CalendarDays,
  Bell,
  UserCheck,
  Phone,
  Users,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export const APPOINTMENT_TYPES: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  appointment: { label: "Cita", color: "bg-blue-100 text-blue-700 border-blue-200", icon: CalendarDays },
  reminder: { label: "Recordatorio", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Bell },
  follow_up: { label: "Seguimiento", color: "bg-purple-100 text-purple-700 border-purple-200", icon: UserCheck },
  call: { label: "Llamada", color: "bg-green-100 text-green-700 border-green-200", icon: Phone },
  meeting: { label: "Reunión", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Users },
  holiday: { label: "Día Festivo", color: "bg-red-100 text-red-700 border-red-200", icon: PartyPopper },
};

export const APPOINTMENT_STATUSES: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Programada", color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
  no_show: { label: "No asistió", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export const APPOINTMENT_PRIORITIES: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: "Baja", color: "text-gray-500", dot: "bg-gray-400" },
  normal: { label: "Normal", color: "text-blue-500", dot: "bg-blue-500" },
  high: { label: "Alta", color: "text-amber-500", dot: "bg-amber-500" },
  urgent: { label: "Urgente", color: "text-red-500", dot: "bg-red-500" },
};

export const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
