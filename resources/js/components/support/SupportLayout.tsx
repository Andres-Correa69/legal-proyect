import { useState, useCallback } from "react";
import { usePage } from "@inertiajs/react";
import { useSupportChat } from "@/hooks/use-support-chat";
import { SupportTicketList } from "./SupportTicketList";
import { SupportTicketHeader } from "./SupportTicketHeader";
import { SupportMessageArea } from "./SupportMessageArea";
import { SupportMessageInput } from "./SupportMessageInput";
import { SupportNewTicketDialog } from "./SupportNewTicketDialog";
import { Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export function SupportLayout() {
    const { props } = usePage<{ auth: { user: User } }>();
    const currentUserId = props.auth?.user?.id;

    const {
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isSending,
        selectConversation,
        sendMessage,
        createConversation,
        closeConversation,
    } = useSupportChat();

    const [showNewTicket, setShowNewTicket] = useState(false);
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);

    const handleTicketClick = useCallback(
        (ticket: Parameters<typeof selectConversation>[0]) => {
            selectConversation(ticket);
            setShowSidebarMobile(false);
        },
        [selectConversation]
    );

    const handleBack = useCallback(() => {
        setShowSidebarMobile(true);
    }, []);

    const handleCreateTicket = useCallback(
        async (subject: string, description: string, attachments?: File[]) => {
            await createConversation(subject, description, attachments);
            setShowSidebarMobile(false);
        },
        [createConversation]
    );

    return (
        <div className="flex h-[calc(100vh-7.5rem)] bg-background border rounded-lg overflow-hidden">
            {/* Ticket List */}
            <div
                className={cn(
                    "w-full lg:w-80 xl:w-96 shrink-0",
                    showSidebarMobile ? "block" : "hidden lg:block"
                )}
            >
                <SupportTicketList
                    tickets={conversations}
                    activeTicketId={activeConversation?.id || null}
                    isLoading={isLoadingConversations}
                    onTicketClick={handleTicketClick}
                    onNewTicket={() => setShowNewTicket(true)}
                />
            </div>

            {/* Message Area */}
            <div
                className={cn(
                    "flex-1 flex flex-col min-w-0",
                    showSidebarMobile && "hidden lg:flex"
                )}
            >
                {activeConversation ? (
                    <>
                        <SupportTicketHeader
                            ticket={activeConversation}
                            onBack={handleBack}
                            onClose={activeConversation.status !== "resolved" ? closeConversation : undefined}
                        />
                        <SupportMessageArea
                            messages={messages}
                            currentUserId={currentUserId}
                            isLoading={isLoadingMessages}
                        />
                        {activeConversation.status !== "resolved" && (
                            <SupportMessageInput onSend={sendMessage} />
                        )}
                        {activeConversation.status === "resolved" && (
                            <div className="border-t p-4 bg-muted/30 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Este ticket fue resuelto
                                    {activeConversation.resolved_by_name && ` por ${activeConversation.resolved_by_name}`}
                                </p>
                                {activeConversation.resolution_notes && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {activeConversation.resolution_notes}
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="p-6 rounded-full bg-muted/30">
                            <Headset className="h-12 w-12" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-semibold text-foreground">Soporte</p>
                            <p className="text-sm mt-1">
                                Selecciona un ticket o crea uno nuevo para contactar soporte
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* New Ticket Dialog */}
            <SupportNewTicketDialog
                open={showNewTicket}
                onOpenChange={setShowNewTicket}
                onCreateTicket={handleCreateTicket}
            />
        </div>
    );
}
