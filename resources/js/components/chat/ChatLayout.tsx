import { useState, useCallback, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { useChat } from "@/hooks/use-chat";
import { useSupportDirectChat } from "@/hooks/use-support-direct-chat";
import { useSupportUnread } from "@/hooks/use-support-unread";
import { ChatSidebar } from "./ChatSidebar";
import { ChatHeaderBar } from "./ChatHeaderBar";
import { MessageArea } from "./MessageArea";
import { MessageInput } from "./MessageInput";
import { NewGroupDialog } from "./NewGroupDialog";
import { GroupDetailPanel } from "./GroupDetailPanel";
import { SupportMessageArea } from "@/components/support/SupportMessageArea";
import { SupportMessageInput } from "@/components/support/SupportMessageInput";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Headphones, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/types";

export function ChatLayout() {
    const { props } = usePage<{ auth: { user: User } }>();
    const currentUserId = props.auth?.user?.id;

    // Internal chat hook
    const {
        conversations,
        activeConversation,
        messages,
        contacts,
        isLoadingConversations,
        isLoadingMessages,
        isLoadingContacts,
        isSending,
        searchTerm,
        setSearchTerm,
        selectConversation,
        sendMessage,
        startPersonalChat,
        createGroupChat,
        loadContacts,
        leaveGroup,
        addParticipants,
        deleteMessage,
        deleteConversation,
    } = useChat();

    // Direct support chat hook
    const {
        conversation: supportConversation,
        messages: supportMessages,
        isLoading: isLoadingSupport,
        isLoadingMessages: isLoadingSupportMessages,
        initChat: initSupportChat,
        sendMessage: sendSupportMessage,
    } = useSupportDirectChat();

    const { unreadCount: supportUnreadCount } = useSupportUnread();

    const [showNewGroup, setShowNewGroup] = useState(false);
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);
    const [showGroupDetail, setShowGroupDetail] = useState(false);
    const [isSupportMode, setIsSupportMode] = useState(false);
    const [showSupportConfirm, setShowSupportConfirm] = useState(false);

    const handleConversationClick = useCallback(
        (conversation: Parameters<typeof selectConversation>[0]) => {
            selectConversation(conversation);
            setShowSidebarMobile(false);
            setShowGroupDetail(false);
        },
        [selectConversation]
    );

    const handleContactClick = useCallback(
        async (userId: number) => {
            await startPersonalChat(userId);
            setShowSidebarMobile(false);
        },
        [startPersonalChat]
    );

    const handleBack = useCallback(() => {
        setShowSidebarMobile(true);
        setShowGroupDetail(false);
    }, []);

    const handleInfoClick = useCallback(() => {
        loadContacts();
        setShowGroupDetail((prev) => !prev);
    }, [loadContacts]);

    const handleLeaveGroup = useCallback(async (conversationId: number) => {
        await leaveGroup(conversationId);
        setShowGroupDetail(false);
    }, [leaveGroup]);

    const handleNewGroupClick = useCallback(() => {
        loadContacts();
        setShowNewGroup(true);
    }, [loadContacts]);

    // When entering support mode, show confirmation only if no existing chat
    const handleSupportToggle = useCallback(() => {
        if (isSupportMode) {
            // Exiting support mode — no confirmation needed
            setIsSupportMode(false);
            setShowSidebarMobile(true);
        } else if (supportConversation) {
            // Already have an open chat — go directly, no modal
            setIsSupportMode(true);
            initSupportChat();
            setShowSidebarMobile(false);
        } else {
            // No existing chat — ask for confirmation before creating one
            setShowSupportConfirm(true);
        }
    }, [isSupportMode, supportConversation, initSupportChat]);

    const handleSupportConfirm = useCallback(() => {
        setShowSupportConfirm(false);
        setIsSupportMode(true);
        initSupportChat();
        setShowSidebarMobile(false);
    }, [initSupportChat]);

    const handleSupportBack = useCallback(() => {
        // If chat was resolved, reload so modal shows again for next chat
        if (supportConversation?.status === 'resolved') {
            window.location.reload();
            return;
        }
        setIsSupportMode(false);
        setShowSidebarMobile(true);
    }, [supportConversation?.status]);

    return (
        <div className="flex h-[calc(100vh-7.5rem)] bg-background border rounded-lg overflow-hidden">
            {/* Sidebar - only visible in normal chat mode */}
            <div
                className={cn(
                    "w-full lg:w-80 xl:w-96 shrink-0",
                    isSupportMode && "hidden lg:block",
                    !isSupportMode && (showSidebarMobile ? "block" : "hidden lg:block")
                )}
            >
                <ChatSidebar
                    conversations={conversations}
                    contacts={contacts}
                    currentUserId={currentUserId}
                    activeConversationId={activeConversation?.id || null}
                    isLoadingConversations={isLoadingConversations}
                    isLoadingContacts={isLoadingContacts}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onConversationClick={handleConversationClick}
                    onContactClick={handleContactClick}
                    onNewGroupClick={handleNewGroupClick}
                    onLoadContacts={loadContacts}
                    onDeleteConversation={deleteConversation}
                    isSupportMode={isSupportMode}
                    onSupportClick={handleSupportToggle}
                    supportUnreadCount={supportUnreadCount}
                />
            </div>

            {/* Message Area */}
            <div
                className={cn(
                    "flex-1 flex flex-col min-w-0",
                    !isSupportMode && showSidebarMobile && "hidden lg:flex"
                )}
            >
                {isSupportMode ? (
                    /* Direct support chat - like a regular chat, no sidebar needed */
                    <>
                        {/* Support chat header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
                            <button
                                onClick={handleSupportBack}
                                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <div className="p-2 rounded-full bg-violet-500/10">
                                <Headphones className="h-5 w-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold">Soporte Legal Sistema</p>
                                <p className="text-xs text-muted-foreground">
                                    {supportConversation?.status === 'resolved'
                                        ? `Chat cerrado por ${supportConversation.resolved_by_name || 'soporte'}`
                                        : supportConversation?.assigned_admin_name
                                            ? `Atendido por ${supportConversation.assigned_admin_name}`
                                            : "Escribe tu mensaje y te responderemos pronto"
                                    }
                                </p>
                            </div>
                        </div>

                        {isLoadingSupport ? (
                            <div className="flex-1 flex items-center justify-center">
                                <Spinner className="h-6 w-6" />
                            </div>
                        ) : (
                            <>
                                <SupportMessageArea
                                    messages={supportMessages}
                                    currentUserId={currentUserId}
                                    isLoading={isLoadingSupportMessages}
                                />
                                {supportConversation?.status === 'resolved' ? (
                                    <div className="border-t p-4 bg-muted/30">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-sm">
                                                Este chat fue cerrado por {supportConversation.resolved_by_name || 'soporte'}.
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <SupportMessageInput
                                        onSend={sendSupportMessage}
                                    />
                                )}
                            </>
                        )}
                    </>
                ) : (
                    /* Normal chat message area */
                    activeConversation ? (
                        <>
                            <ChatHeaderBar
                                conversation={activeConversation}
                                currentUserId={currentUserId}
                                onBack={handleBack}
                                onInfoClick={activeConversation.type === "group" ? handleInfoClick : undefined}
                            />
                            <MessageArea
                                messages={messages}
                                currentUserId={currentUserId}
                                isLoading={isLoadingMessages}
                                onDeleteMessage={deleteMessage}
                            />
                            <MessageInput
                                onSend={sendMessage}
                                isSending={isSending}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <div className="p-6 rounded-full bg-muted/30">
                                <MessageCircle className="h-12 w-12" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-semibold text-foreground">Chat interno</p>
                                <p className="text-sm mt-1">
                                    Selecciona una conversacion o inicia una nueva
                                </p>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Group Detail Panel */}
            {!isSupportMode && showGroupDetail && activeConversation?.type === "group" && (
                <GroupDetailPanel
                    conversation={activeConversation}
                    currentUserId={currentUserId}
                    contacts={contacts}
                    onClose={() => setShowGroupDetail(false)}
                    onLeaveGroup={handleLeaveGroup}
                    onAddParticipants={addParticipants}
                    onLoadContacts={loadContacts}
                />
            )}

            {/* New Group Dialog */}
            <NewGroupDialog
                open={showNewGroup}
                onOpenChange={setShowNewGroup}
                contacts={contacts}
                onCreateGroup={createGroupChat}
            />

            {/* Support Confirmation Dialog */}
            <AlertDialog open={showSupportConfirm} onOpenChange={setShowSupportConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Abrir chat con soporte</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se abrira una conversacion con el equipo de soporte de Legal Sistema.
                            Un agente te atendera lo antes posible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSupportConfirm}>
                            Si, abrir chat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
