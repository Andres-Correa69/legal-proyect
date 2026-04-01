import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportConversation } from "@/types";

interface SupportTicketHeaderProps {
    ticket: SupportConversation;
    onBack: () => void;
    onClose?: () => void;
}

const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En progreso",
    resolved: "Resuelto",
};

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700",
    in_progress: "bg-blue-500/15 text-blue-700",
    resolved: "bg-green-500/15 text-green-700",
};

export function SupportTicketHeader({ ticket, onBack, onClose }: SupportTicketHeaderProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
            <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusColors[ticket.status])}>
                        {statusLabels[ticket.status]}
                    </span>
                </div>
                <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                {ticket.assigned_admin_name && (
                    <p className="text-xs text-muted-foreground">
                        Atendido por: {ticket.assigned_admin_name}
                    </p>
                )}
            </div>

            {ticket.status !== "resolved" && onClose && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
                    <X className="h-3 w-3 mr-1" />
                    Cerrar ticket
                </Button>
            )}
        </div>
    );
}
