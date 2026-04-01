import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import type { ChatContact } from "@/types";

interface ContactListProps {
    contacts: ChatContact[];
    isLoading: boolean;
    searchTerm: string;
    onContactClick: (userId: number) => void;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function ContactList({ contacts, isLoading, searchTerm, onContactClick }: ContactListProps) {
    const filtered = searchTerm
        ? contacts.filter(
              (c) =>
                  c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  c.email.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : contacts;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Spinner className="h-5 w-5" />
            </div>
        );
    }

    if (filtered.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                    {searchTerm ? "No se encontraron contactos" : "No hay contactos disponibles"}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-0.5">
            {filtered.map((contact) => {
                const roleName = contact.roles?.[0]?.name || "Usuario";
                return (
                    <button
                        key={contact.id}
                        onClick={() => onContactClick(contact.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                        <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={contact.avatar_url || ""} />
                            <AvatarFallback className="bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))] text-xs">
                                {getInitials(contact.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{roleName}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
