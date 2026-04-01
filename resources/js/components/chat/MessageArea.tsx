import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Spinner } from "@/components/ui/spinner";
import { MessageCircle } from "lucide-react";
import type { ChatMessage } from "@/types";

interface MessageAreaProps {
    messages: ChatMessage[];
    currentUserId: number;
    isLoading: boolean;
    onDeleteMessage?: (messageId: number) => void;
}

export function MessageArea({ messages, currentUserId, isLoading, onDeleteMessage }: MessageAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0);

    useEffect(() => {
        // Auto-scroll when new messages arrive
        if (messages.length > prevMessageCountRef.current) {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: prevMessageCountRef.current === 0 ? "instant" : "smooth",
            });
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    if (isLoading && messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Spinner className="h-6 w-6" />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50">
                    <MessageCircle className="h-8 w-8" />
                </div>
                <p className="text-sm">No hay mensajes aun</p>
                <p className="text-xs">Envia un mensaje para iniciar la conversacion</p>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id || prevMessage.type === "system";

                return (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showAvatar={showAvatar}
                        onDelete={onDeleteMessage}
                    />
                );
            })}
        </div>
    );
}
