import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Search, Plus } from "lucide-react";
import { SupportTicketItem } from "./SupportTicketItem";
import type { SupportConversation } from "@/types";

interface SupportTicketListProps {
    tickets: SupportConversation[];
    activeTicketId: number | null;
    isLoading: boolean;
    onTicketClick: (ticket: SupportConversation) => void;
    onNewTicket: () => void;
}

export function SupportTicketList({
    tickets,
    activeTicketId,
    isLoading,
    onTicketClick,
    onNewTicket,
}: SupportTicketListProps) {
    const [search, setSearch] = useState("");

    const filtered = search
        ? tickets.filter(
              (t) =>
                  t.subject.toLowerCase().includes(search.toLowerCase()) ||
                  t.ticket_number.toLowerCase().includes(search.toLowerCase())
          )
        : tickets;

    return (
        <div className="flex flex-col h-full border-r">
            <div className="p-3 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Tickets de soporte</h2>
                    <Button size="sm" variant="ghost" onClick={onNewTicket} className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar tickets..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading && tickets.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Spinner className="h-5 w-5" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        {search ? "Sin resultados" : "No tienes tickets de soporte"}
                    </div>
                ) : (
                    filtered.map((ticket) => (
                        <SupportTicketItem
                            key={ticket.id}
                            ticket={ticket}
                            isActive={ticket.id === activeTicketId}
                            onClick={() => onTicketClick(ticket)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
