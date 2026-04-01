import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { birthdayApi, type BirthdayClient, type BirthdayStats } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { usePage } from "@inertiajs/react";
import type { SharedData } from "@/types";
import {
  Cake,
  MessageSquare,
  Calendar,
  Gift,
  User,
} from "lucide-react";

interface BirthdayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BirthdayModal({ open, onOpenChange }: BirthdayModalProps) {
  const { toast } = useToast();
  const { auth } = usePage<SharedData>().props;
  const birthdayMessageTemplate = (auth?.user?.company?.settings?.birthday_message as string) || "¡Feliz cumpleaños {nombre}! 🎂 Te enviamos un cordial saludo. ¡Que tengas un excelente día!";
  const [stats, setStats] = useState<BirthdayStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await birthdayApi.getStats();
      setStats(data);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar los cumpleaños", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleWhatsApp = (client: BirthdayClient) => {
    if (!client.whatsapp_url) {
      toast({ title: "Sin WhatsApp", description: "Este cliente no tiene número de WhatsApp registrado", variant: "destructive" });
      return;
    }
    const message = encodeURIComponent(
      birthdayMessageTemplate
        .replace(/\{nombre\}/g, client.first_name || client.name)
        .replace(/\{nombre_completo\}/g, client.name)
        .replace(/\{edad\}/g, String(client.turning_age))
        .replace(/\{fecha_nacimiento\}/g, client.birth_date ? new Date(client.birth_date + 'T12:00:00').toLocaleDateString('es-CO') : '')
        .replace(/\{empresa\}/g, auth?.user?.company?.name || '')
    );
    window.open(`${client.whatsapp_url}?text=${message}`, "_blank");
    toast({ title: "WhatsApp abierto", description: `Mensaje preparado para ${client.name}` });
  };

  const handleWhatsAppAll = () => {
    if (!stats?.today.length) return;
    const withWhatsApp = stats.today.filter((c) => c.whatsapp_url);
    if (withWhatsApp.length === 0) {
      toast({ title: "Sin WhatsApp", description: "Ningún cumpleañero de hoy tiene WhatsApp registrado", variant: "destructive" });
      return;
    }
    // Open first one, the user can come back for the rest
    handleWhatsApp(withWhatsApp[0]);
    if (withWhatsApp.length > 1) {
      toast({ title: "Tip", description: `Hay ${withWhatsApp.length - 1} cumpleañero(s) más. Vuelve para enviar a los demás.` });
    }
  };

  const renderClient = (client: BirthdayClient, isToday: boolean = false) => (
    <div
      key={client.id}
      className="flex items-center gap-3 py-2 px-1 hover:bg-muted/50 rounded-md transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{client.name}</p>
        <p className="text-xs text-muted-foreground">
          {client.turning_age} años
          {!isToday && client.days_until !== undefined && (
            <> · {client.days_until === 1 ? "mañana" : `en ${client.days_until} días`}</>
          )}
        </p>
      </div>
      {client.whatsapp_url && (
        <button
          onClick={() => handleWhatsApp(client)}
          className="text-xs text-green-600 hover:text-green-700 shrink-0"
        >
          WhatsApp
        </button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Cumpleaños de Clientes
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="h-6 w-6" />
          </div>
        ) : stats ? (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Stats summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <p className="text-2xl font-bold text-pink-600">{stats.today_count}</p>
                <p className="text-[10px] text-pink-600 uppercase font-medium">Hoy</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-fuchsia-50 border border-fuchsia-100">
                <p className="text-2xl font-bold text-fuchsia-600">{stats.week_count}</p>
                <p className="text-[10px] text-fuchsia-600 uppercase font-medium">Esta semana</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-2xl font-bold text-purple-600">{stats.month_count}</p>
                <p className="text-[10px] text-purple-600 uppercase font-medium">Este mes</p>
              </div>
            </div>

            {/* Today section */}
            {stats.today.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Gift className="h-4 w-4 text-pink-500" />
                    Cumplen hoy ({stats.today_count})
                  </h3>
                  {stats.today.filter((c) => c.whatsapp_url).length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-green-600 border-green-500/20 hover:bg-green-500/10"
                      onClick={handleWhatsAppAll}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Felicitar a todos
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {stats.today.map((client) => renderClient(client, true))}
                </div>
              </div>
            )}

            {/* This week section */}
            {stats.this_week.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-fuchsia-500" />
                  Próximos 7 días ({stats.week_count})
                </h3>
                <div className="space-y-2">
                  {stats.this_week.map((client) => renderClient(client, false))}
                </div>
              </div>
            )}

            {/* No birthdays */}
            {stats.today.length === 0 && stats.this_week.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay cumpleaños próximos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total_with_birthday} clientes tienen fecha de nacimiento registrada
                </p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
