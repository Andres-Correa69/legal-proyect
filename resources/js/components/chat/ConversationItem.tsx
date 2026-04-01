import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation } from "@/types";

interface ConversationItemProps {
    conversation: ChatConversation;
    currentUserId: number;
    isActive: boolean;
    onClick: () => void;
    onDelete?: (conversationId: number) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ahora";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function getConversationDisplayInfo(conversation: ChatConversation, currentUserId: number) {
    if (conversation.type === "group") {
        return {
            name: conversation.name || "Grupo",
            avatar: null,
            isGroup: true,
        };
    }

    const otherParticipant = conversation.active_participants?.find(
        (p) => p.user_id !== currentUserId
    );

    return {
        name: otherParticipant?.user?.name || "Usuario",
        avatar: otherParticipant?.user?.avatar_url || null,
        isGroup: false,
    };
}

export function ConversationItem({ conversation, currentUserId, isActive, onClick, onDelete }: ConversationItemProps) {
    const [showDelete, setShowDelete] = useState(false);
    const { name, avatar, isGroup } = getConversationDisplayInfo(conversation, currentUserId);
    const lastMessage = conversation.latest_message;
    const unread = conversation.unread_count || 0;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(isGroup ? "¿Seguro que quieres salir de este grupo?" : "¿Seguro que quieres eliminar esta conversacion?")) {
            onDelete?.(conversation.id);
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left group relative cursor-pointer",
                isActive ? "bg-muted" : "hover:bg-muted/50"
            )}
        >
            {isGroup ? (
                <div className="h-10 w-10 rounded-full bg-[hsl(var(--billing-primary))]/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-[hsl(var(--billing-primary))]" />
                </div>
            ) : (
                <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={avatar || ""} />
                    <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-sm">
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <p className={cn("text-sm truncate", unread > 0 ? "font-semibold" : "font-medium")}>
                        {name}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatRelativeTime(conversation.last_message_at)}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className={cn("text-xs truncate", unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                        {lastMessage
                            ? lastMessage.type === "system"
                                ? lastMessage.body
                                : `${lastMessage.sender_id === currentUserId ? "Tu: " : ""}${lastMessage.body}`
                            : "Sin mensajes"}
                    </p>
                    {unread > 0 && !showDelete && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-[hsl(var(--billing-primary))] hover:bg-[hsl(var(--billing-primary))] shrink-0 ml-2">
                            {unread}
                        </Badge>
                    )}
                    {showDelete && onDelete && (
                        <div
                            role="button"
                            tabIndex={0}
                            className="h-6 w-6 shrink-0 ml-1 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
                            onClick={handleDelete}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleDelete(e as unknown as React.MouseEvent); }}
                            title={isGroup ? "Salir del grupo" : "Eliminar conversacion"}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
