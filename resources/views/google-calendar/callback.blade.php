<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Conectando con Google Calendar...</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #0a0a0a;
            color: #fafafa;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.15);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 { font-size: 1.25rem; margin: 0 0 0.5rem; }
        p { font-size: 0.875rem; color: #a1a1aa; margin: 0.25rem 0; }
        .btn {
            margin-top: 1.5rem;
            padding: 0.5rem 1.25rem;
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            color: #fafafa;
            cursor: pointer;
            font-size: 0.875rem;
        }
        .btn:hover { background: #3f3f46; }
        .icon { font-size: 2.5rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container" id="status">
        @if($success && isset($code) && isset($state))
            <div class="spinner"></div>
            <h2>Conectando con Google Calendar...</h2>
            <p>Procesando la autorizacion.</p>
        @else
            <div class="icon">&#10007;</div>
            <h2>Error al conectar</h2>
            <p>{{ $message ?: 'Ocurrio un error inesperado' }}</p>
            <button class="btn" onclick="window.close()">Cerrar ventana</button>
        @endif
    </div>

    @if($success && isset($code) && isset($state))
    <script>
        (function() {
            const appUrl = '{{ config("app.url") }}'.replace(/\/+$/, '');
            const callbackUrl = appUrl + '/api/google-calendar/callback';

            // Get XSRF token from cookie (Sanctum)
            function getCookie(name) {
                const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
                return match ? decodeURIComponent(match[2]) : null;
            }

            const xsrfToken = getCookie('XSRF-TOKEN');

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };
            if (xsrfToken) {
                headers['X-XSRF-TOKEN'] = xsrfToken;
            }

            fetch(callbackUrl, {
                method: 'POST',
                headers: headers,
                credentials: 'include',
                body: JSON.stringify({
                    code: '{{ $code }}',
                    state: '{{ $state }}',
                }),
            })
            .then(async response => {
                const text = await response.text();
                let data;
                try {
                    data = text ? JSON.parse(text) : {};
                } catch (e) {
                    data = { success: false, message: text || 'Error al procesar respuesta' };
                }
                if (!response.ok) {
                    throw new Error(data.message || 'HTTP ' + response.status);
                }
                return data;
            })
            .then(data => {
                if (data.success) {
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'GOOGLE_CALENDAR_CONNECTED',
                            data: data.data,
                        }, window.location.origin);
                    }
                    document.getElementById('status').innerHTML =
                        '<div class="icon" style="color: #22c55e;">&#10003;</div>' +
                        '<h2>Conectado exitosamente</h2>' +
                        '<p>Tu calendario de Google ha sido conectado.</p>' +
                        '<button class="btn" onclick="window.close()">Cerrar ventana</button>';
                } else {
                    throw new Error(data.message || 'Error al conectar');
                }
            })
            .catch(error => {
                if (window.opener) {
                    window.opener.postMessage({
                        type: 'GOOGLE_CALENDAR_ERROR',
                        message: error.message,
                    }, window.location.origin);
                }
                document.getElementById('status').innerHTML =
                    '<div class="icon" style="color: #ef4444;">&#10007;</div>' +
                    '<h2>Error de conexion</h2>' +
                    '<p>' + error.message + '</p>' +
                    '<button class="btn" onclick="window.close()">Cerrar ventana</button>';
            });
        })();
    </script>
    @endif
</body>
</html>
