import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Search, Plus, Users, MessageCircle, X, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationItem } from "./ConversationItem";
import { ContactList } from "./ContactList";
import type { ChatConversation, ChatContact } from "@/types";

type TabType = "chats" | "contacts";
type ChatTypeFilter = "personal" | "groups";

interface ChatSidebarProps {
    conversations: ChatConversation[];
    contacts: ChatContact[];
    currentUserId: number;
    activeConversationId: number | null;
    isLoadingConversations: boolean;
    isLoadingContacts: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onConversationClick: (conversation: ChatConversation) => void;
    onContactClick: (userId: number) => void;
    onNewGroupClick: () => void;
    onLoadContacts: () => void;
    onDeleteConversation?: (conversationId: number) => void;
    isSupportMode?: boolean;
    onSupportClick?: () => void;
    supportUnreadCount?: number;
}

export function ChatSidebar({
    conversations,
    contacts,
    currentUserId,
    activeConversationId,
    isLoadingConversations,
    isLoadingContacts,
    searchTerm,
    onSearchChange,
    onConversationClick,
    onContactClick,
    onNewGroupClick,
    onLoadContacts,
    onDeleteConversation,
    isSupportMode,
    onSupportClick,
    supportUnreadCount = 0,
}: ChatSidebarProps) {
    const [activeTab, setActiveTab] = useState<TabType>("chats");
    const [chatTypeFilter, setChatTypeFilter] = useState<ChatTypeFilter>("personal");

    // Load contacts when switching to contacts tab
    useEffect(() => {
        if (activeTab === "contacts") {
            onLoadContacts();
        }
    }, [activeTab, onLoadContacts]);

    const filteredConversations = conversations.filter((c) => {
        // Filter by chat type
        if (chatTypeFilter === "personal" && c.type !== "personal") return false;
        if (chatTypeFilter === "groups" && c.type !== "group") return false;

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (c.type === "group") {
                return c.name?.toLowerCase().includes(term);
            }
            const other = c.active_participants?.find((p) => p.user_id !== currentUserId);
            return other?.user?.name?.toLowerCase().includes(term) || other?.user?.email?.toLowerCase().includes(term);
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full border-r bg-background">
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">Chat</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onNewGroupClick}
                        title="Crear grupo"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full h-9 pl-9 pr-8 bg-muted/50 border border-border rounded-lg text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--billing-primary))]/20 transition-colors"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full"
                        >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 gap-1 pb-2">
                {(["chats", "contacts"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
                            activeTab === tab
                                ? "bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))]"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        {tab === "chats" ? "Chats" : "Contactos"}
                    </button>
                ))}
            </div>

            <Separator />

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "chats" && (
                    <>
                        {/* Chat type toggle */}
                        <div className="flex px-4 py-2 gap-1">
                            <button
                                onClick={() => setChatTypeFilter("personal")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                    chatTypeFilter === "personal"
                                        ? "bg-[hsl(var(--billing-primary))] text-white"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <MessageCircle className="h-3 w-3" />
                                Personal
                            </button>
                            <button
                                onClick={() => setChatTypeFilter("groups")}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                                    chatTypeFilter === "groups"
                                        ? "bg-[hsl(var(--billing-primary))] text-white"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Users className="h-3 w-3" />
                                Grupos
                            </button>
                        </div>

                        {/* Conversations list */}
                        <div className="px-2 space-y-0.5">
                            {isLoadingConversations && conversations.length === 0 ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner className="h-5 w-5" />
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-muted-foreground">
                                        {searchTerm
                                            ? "No se encontraron conversaciones"
                                            : chatTypeFilter === "groups"
                                            ? "No tienes grupos aun"
                                            : "No tienes conversaciones aun"}
                                    </p>
                                    {!searchTerm && (
                                        <button
                                            onClick={() => setActiveTab("contacts")}
                                            className="text-xs text-[hsl(var(--billing-primary))] hover:underline mt-2"
                                        >
                                            Iniciar una conversacion
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredConversations.map((conversation) => (
                                    <ConversationItem
                                        key={conversation.id}
                                        conversation={conversation}
                                        currentUserId={currentUserId}
                                        isActive={conversation.id === activeConversationId}
                                        onClick={() => onConversationClick(conversation)}
                                        onDelete={onDeleteConversation}
                                    />
                                ))
                            )}
                        </div>
                    </>
                )}

                {activeTab === "contacts" && (
                    <div className="px-2 pt-1">
                        <ContactList
                            contacts={contacts}
                            isLoading={isLoadingContacts}
                            searchTerm={searchTerm}
                            onContactClick={onContactClick}
                        />
                    </div>
                )}
            </div>

            {/* Support */}
            <div className="border-t p-3">
                <button
                    onClick={onSupportClick}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isSupportMode
                            ? "bg-violet-500/10 ring-1 ring-violet-500/30"
                            : "bg-muted/30 hover:bg-muted/50"
                    )}
                >
                    <div className="p-2 rounded-full bg-violet-500/10">
                        <Headphones className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm font-medium">Soporte</p>
                    </div>
                    {supportUnreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/100 px-1.5 text-[10px] font-bold text-white">
                            {supportUnreadCount > 9 ? "9+" : supportUnreadCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
