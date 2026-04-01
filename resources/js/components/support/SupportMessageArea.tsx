import { useEffect, useRef } from "react";
import { SupportMessageBubble } from "./SupportMessageBubble";
import { Spinner } from "@/components/ui/spinner";
import { Headset } from "lucide-react";
import type { SupportMessage } from "@/types";

interface SupportMessageAreaProps {
    messages: SupportMessage[];
    currentUserId: number;
    isLoading: boolean;
}

export function SupportMessageArea({ messages, currentUserId, isLoading }: SupportMessageAreaProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0);

    useEffect(() => {
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
                    <Headset className="h-8 w-8" />
                </div>
                <p className="text-sm">No hay mensajes aun</p>
                <p className="text-xs">Describe tu problema y nuestro equipo te ayudara</p>
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {messages.map((message, index) => {
                const isOwn = message.sender_type === "client" && message.sender_id === currentUserId;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showSender =
                    !prevMessage ||
                    prevMessage.sender_id !== message.sender_id ||
                    prevMessage.sender_type !== message.sender_type ||
                    prevMessage.type === "system";

                return (
                    <SupportMessageBubble
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        showSender={showSender}
                    />
                );
            })}
        </div>
    );
}
