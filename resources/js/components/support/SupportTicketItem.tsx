import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { SupportConversation } from "@/types";

interface SupportTicketItemProps {
    ticket: SupportConversation;
    isActive: boolean;
    onClick: () => void;
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

export function SupportTicketItem({ ticket, isActive, onClick }: SupportTicketItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
                isActive && "bg-muted"
            )}
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", statusColors[ticket.status])}>
                    {statusLabels[ticket.status]}
                </span>
            </div>
            <p className="text-sm font-medium truncate">{ticket.subject}</p>
            {ticket.latest_message && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {ticket.latest_message.sender_type === 'admin' ? 'Soporte: ' : ''}
                    {ticket.latest_message.body}
                </p>
            )}
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                    {ticket.last_message_at ? formatDate(ticket.last_message_at) : formatDate(ticket.created_at)}
                </span>
                {ticket.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {ticket.unread_count}
                    </span>
                )}
            </div>
        </button>
    );
}
