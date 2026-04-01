import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Calendar, Unlink, ExternalLink } from "lucide-react";
import { googleCalendarApi } from "@/lib/api";
import type { GoogleCalendarToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface GoogleCalendarWidgetProps {
  canManage: boolean;
}

export function GoogleCalendarWidget({ canManage }: GoogleCalendarWidgetProps) {
  const [calendars, setCalendars] = useState<GoogleCalendarToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchCalendars = useCallback(async () => {
    try {
      const data = await googleCalendarApi.getCalendars();
      setCalendars(data);
    } catch {
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "GOOGLE_CALENDAR_CONNECTED") {
        setConnecting(false);
        fetchCalendars();
        toast({
          title: "Google Calendar conectado",
          description: "Tu calendario ha sido vinculado exitosamente.",
        });
      } else if (event.data?.type === "GOOGLE_CALENDAR_ERROR") {
        setConnecting(false);
        toast({
          title: "Error al conectar",
          description: event.data.message || "No se pudo conectar con Google Calendar.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fetchCalendars, toast]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const data = await googleCalendarApi.getAuthUrl();
      const popup = window.open(
        data.auth_url,
        "google-calendar-auth",
        "width=600,height=700,scrollbars=yes"
      );

      if (!popup) {
        toast({
          title: "Popup bloqueado",
          description: "Permite las ventanas emergentes para conectar Google Calendar.",
          variant: "destructive",
        });
        setConnecting(false);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo iniciar la conexion.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (tokenId: number) => {
    setDisconnecting(tokenId);
    try {
      await googleCalendarApi.disconnect(tokenId);
      setCalendars((prev) => prev.filter((c) => c.id !== tokenId));
      toast({
        title: "Calendario desconectado",
        description: "Se ha desvinculado el calendario de Google.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo desconectar.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = calendars.length > 0;

  if (!canManage && !isConnected) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Google Calendar</span>
          {isConnected && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--success))] border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-card" align="end">
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Google Calendar</h3>
            {isConnected && (
              <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5">
                CONECTADO
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sincroniza tus citas automaticamente.
          </p>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Connected Calendars */}
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {cal.calendar_name || "Calendario Principal"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {cal.calendar_id}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDisconnect(cal.id)}
                      disabled={disconnecting === cal.id}
                    >
                      {disconnecting === cal.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unlink className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {/* Connect Button */}
              {canManage && (
                <Button
                  variant={isConnected ? "outline" : "default"}
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {isConnected ? "Conectar otro calendario" : "Conectar Google Calendar"}
                </Button>
              )}

              {!canManage && calendars.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No hay calendarios conectados.
                </p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
