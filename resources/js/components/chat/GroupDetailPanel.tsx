import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, LogOut, X, Crown, UserPlus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation, ChatContact } from "@/types";

interface GroupDetailPanelProps {
    conversation: ChatConversation;
    currentUserId: number;
    contacts: ChatContact[];
    onClose: () => void;
    onLeaveGroup: (conversationId: number) => Promise<void>;
    onAddParticipants: (conversationId: number, userIds: number[]) => Promise<void>;
    onLoadContacts: () => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function GroupDetailPanel({
    conversation,
    currentUserId,
    contacts,
    onClose,
    onLeaveGroup,
    onAddParticipants,
    onLoadContacts,
}: GroupDetailPanelProps) {
    const [isLeaving, setIsLeaving] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<number[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    const participants = conversation.active_participants || [];
    const currentUserParticipant = participants.find((p) => p.user_id === currentUserId);
    const isAdmin = currentUserParticipant?.role === "admin";

    const existingUserIds = new Set(participants.map((p) => p.user_id));
    const availableContacts = contacts.filter((c) => !existingUserIds.has(c.id));

    const handleLeave = async () => {
        setIsLeaving(true);
        try {
            await onLeaveGroup(conversation.id);
        } finally {
            setIsLeaving(false);
        }
    };

    const handleOpenAddMembers = () => {
        onLoadContacts();
        setShowAddMembers(true);
        setSelectedNewMembers([]);
    };

    const handleAddMembers = async () => {
        if (selectedNewMembers.length === 0) return;
        setIsAdding(true);
        try {
            await onAddParticipants(conversation.id, selectedNewMembers);
            setShowAddMembers(false);
            setSelectedNewMembers([]);
        } finally {
            setIsAdding(false);
        }
    };

    const toggleNewMember = (id: number) => {
        setSelectedNewMembers((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="w-80 border-l bg-background flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Detalles del grupo</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Group Info */}
                <div className="flex flex-col items-center gap-3 px-4 py-6">
                    <div className="h-16 w-16 rounded-full bg-[hsl(var(--billing-primary))]/10 flex items-center justify-center">
                        <Users className="h-8 w-8 text-[hsl(var(--billing-primary))]" />
                    </div>
                    <div className="text-center">
                        <p className="text-base font-semibold">{conversation.name || "Grupo"}</p>
                        {conversation.description && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                                {conversation.description}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            {participants.length} {participants.length === 1 ? "miembro" : "miembros"}
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Members */}
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Miembros
                        </p>
                        {isAdmin && !showAddMembers && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={handleOpenAddMembers}
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                Agregar
                            </Button>
                        )}
                    </div>

                    {/* Add members section */}
                    {showAddMembers && (
                        <div className="mb-3 border rounded-lg overflow-hidden">
                            <div className="max-h-36 overflow-y-auto">
                                {availableContacts.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-3">
                                        No hay mas contactos disponibles
                                    </p>
                                ) : (
                                    availableContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => toggleNewMember(contact.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                                                selectedNewMembers.includes(contact.id) && "bg-[hsl(var(--billing-primary))]/5"
                                            )}
                                        >
                                            <Avatar className="h-6 w-6 shrink-0">
                                                <AvatarImage src={contact.avatar_url || ""} />
                                                <AvatarFallback className="text-[9px] bg-muted">
                                                    {getInitials(contact.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs truncate flex-1">{contact.name}</span>
                                            {selectedNewMembers.includes(contact.id) && (
                                                <div className="h-4 w-4 rounded-full bg-[hsl(var(--billing-primary))] flex items-center justify-center shrink-0">
                                                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2 p-2 border-t bg-muted/20">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    onClick={() => setShowAddMembers(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    disabled={selectedNewMembers.length === 0 || isAdding}
                                    onClick={handleAddMembers}
                                >
                                    Agregar ({selectedNewMembers.length})
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Members list */}
                    <div className="space-y-0.5">
                        {participants.map((participant) => {
                            const user = participant.user;
                            if (!user) return null;
                            const isCurrentUser = participant.user_id === currentUserId;

                            return (
                                <div
                                    key={participant.id}
                                    className="flex items-center gap-3 px-2 py-2 rounded-lg"
                                >
                                    <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarImage src={user.avatar_url || ""} />
                                        <AvatarFallback className="text-xs bg-muted">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm truncate">
                                                {user.name}
                                                {isCurrentUser && (
                                                    <span className="text-muted-foreground"> (Tu)</span>
                                                )}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    {participant.role === "admin" && (
                                        <Badge variant="secondary" className="text-[10px] shrink-0 gap-1">
                                            <Crown className="h-2.5 w-2.5" />
                                            Admin
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="px-4 py-3">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLeave}
                        disabled={isLeaving}
                    >
                        <LogOut className="h-4 w-4" />
                        {isLeaving ? "Saliendo..." : "Salir del grupo"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
