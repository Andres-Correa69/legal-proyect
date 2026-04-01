import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, Info } from "lucide-react";
import type { ChatConversation } from "@/types";

interface ChatHeaderBarProps {
    conversation: ChatConversation;
    currentUserId: number;
    onBack?: () => void;
    onInfoClick?: () => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function ChatHeaderBar({ conversation, currentUserId, onBack, onInfoClick }: ChatHeaderBarProps) {
    const isGroup = conversation.type === "group";

    const otherParticipant = !isGroup
        ? conversation.active_participants?.find((p) => p.user_id !== currentUserId)
        : null;

    const name = isGroup ? conversation.name || "Grupo" : otherParticipant?.user?.name || "Usuario";
    const avatar = otherParticipant?.user?.avatar_url || null;
    const participantCount = conversation.active_participants?.length || 0;

    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
            {onBack && (
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            )}

            {isGroup ? (
                <div className="h-9 w-9 rounded-full bg-[hsl(var(--billing-primary))]/10 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-[hsl(var(--billing-primary))]" />
                </div>
            ) : (
                <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={avatar || ""} />
                    <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-sm">
                        {getInitials(name)}
                    </AvatarFallback>
                </Avatar>
            )}

            <div
                className={isGroup && onInfoClick ? "flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity" : "flex-1 min-w-0"}
                onClick={isGroup && onInfoClick ? onInfoClick : undefined}
            >
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground">
                    {isGroup ? `${participantCount} participantes` : otherParticipant?.user?.email || ""}
                </p>
            </div>

            {isGroup && onInfoClick && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onInfoClick}>
                    <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
        </div>
    );
}
