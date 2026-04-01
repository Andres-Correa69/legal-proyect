import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Pusher-js is required by Laravel Echo as the WebSocket client
// even when using Reverb (which is Pusher-protocol compatible)
(window as any).Pusher = Pusher;

/** Read XSRF-TOKEN cookie — needed for /broadcasting/auth POST (CSRF protection) */
function getXsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

let echo: Echo<'reverb'> | null = null;

try {
    const key = import.meta.env.VITE_REVERB_APP_KEY;
    const host = import.meta.env.VITE_REVERB_HOST;
    const port = Number(import.meta.env.VITE_REVERB_PORT) || 6001;
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';

    if (key && host) {
        // Pusher.logToConsole = true; // Uncomment to debug WebSocket

        echo = new Echo({
            broadcaster: 'reverb',
            key,
            wsHost: host,
            wsPort: port,
            wssPort: port,
            forceTLS: scheme === 'https',
            enabledTransports: ['ws', 'wss'],
            // Custom authorizer to properly include CSRF token on every auth request
            authorizer: (channel: any, _options: any) => ({
                authorize: (socketId: string, callback: (error: any, data: any) => void) => {
                    fetch('/broadcasting/auth', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': getXsrfToken(),
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            socket_id: socketId,
                            channel_name: channel.name,
                        }),
                    })
                        .then((res) => {
                            if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
                            return res.json();
                        })
                        .then((data) => callback(null, data))
                        .catch((err) => {
                            console.error('[Echo] Channel auth error:', channel.name, err);
                            callback(err, null);
                        });
                },
            }),
        });

        console.info(`[Echo] WebSocket initialized → ${scheme === 'https' ? 'wss' : 'ws'}://${host}:${port}`);
    } else {
        console.warn('[Echo] Missing VITE_REVERB_APP_KEY or VITE_REVERB_HOST — WebSocket disabled');
    }
} catch (e) {
    console.warn('[Echo] Failed to initialize WebSocket:', e);
}

export default echo;
