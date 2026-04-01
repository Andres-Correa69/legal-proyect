import { MessageCircle } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/573004301499?text=Hola%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20Legal%20Sistema';

export function WhatsAppBubble() {
    return (
        <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contáctanos por WhatsApp"
            className="fixed right-5 bottom-24 md:bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/40 hover:scale-110 active:scale-95"
            style={{ animation: 'whatsapp-pulse 2s infinite' }}
        >
            <MessageCircle size={26} className="fill-white" />
        </a>
    );
}
