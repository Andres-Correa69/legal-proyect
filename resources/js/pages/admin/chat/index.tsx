import { Head } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { ChatLayout } from "@/components/chat/ChatLayout";

export default function ChatPage() {
    return (
        <AppLayout title="Chat">
            <Head title="Chat" />
            <ChatLayout />
        </AppLayout>
    );
}
