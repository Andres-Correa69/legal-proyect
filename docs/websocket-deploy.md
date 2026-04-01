# WebSocket (Reverb) - Guia de Despliegue

## Estado actual
- Chat usa Laravel Reverb (WebSocket) en local con polling como fallback
- En local: `composer run dev` levanta Reverb automaticamente en puerto 6001
- El broadcast esta envuelto en try-catch: si Reverb no corre, el chat funciona con polling (5s)

## Archivos clave
- `app/Events/NewChatMessage.php` - Evento broadcast de mensajes nuevos
- `app/Events/ChatMessageDeleted.php` - Evento broadcast de mensajes eliminados
- `app/Events/ChatUnreadUpdate.php` - Evento broadcast de badge unread
- `resources/js/echo.ts` - Cliente WebSocket (Echo + Pusher.js) con custom authorizer CSRF
- `resources/js/hooks/use-chat.ts` - Listeners de Echo para chat
- `resources/js/hooks/use-chat-unread.ts` - Listener de Echo para badge header
- `config/reverb.php` - Config servidor Reverb
- `config/broadcasting.php` - Config broadcasting

## Variables de entorno necesarias en produccion
```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=produccion-app-id
REVERB_APP_KEY=generar-clave-segura-32chars
REVERB_APP_SECRET=generar-secret-seguro-32chars
REVERB_HOST=dominio-produccion.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=6001
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

## Opcion 1: Sin WebSocket (solo polling, mas facil)
- Poner `BROADCAST_CONNECTION=log` en .env produccion
- No necesita Reverb, ni Supervisor, ni proxy Nginx
- Chat funciona con polling cada 5 segundos
- No necesita variables `VITE_REVERB_*`

## Opcion 2: Con WebSocket (real-time, requiere config)

### 1. Supervisor (mantener Reverb corriendo)
```ini
[program:reverb]
command=php /ruta/proyecto/artisan reverb:start
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/ruta/proyecto/storage/logs/reverb.log
```

### 2. Nginx proxy (redirigir WebSocket al puerto interno)
Agregar al server block existente:
```nginx
location /app {
    proxy_pass http://127.0.0.1:6001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### 3. Rebuild frontend
```bash
npm run build
```
Las variables `VITE_REVERB_*` deben estar en `.env` ANTES de hacer build.

### Si usa Laravel Forge / Ploi
- Supervisor y Nginx se configuran desde el panel con clicks
- Forge tiene soporte nativo para Reverb
