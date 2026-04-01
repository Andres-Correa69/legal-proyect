# Configuración de Google Calendar API

Guía para configurar la integración con Google Calendar en el módulo de Calendario.

## Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID**

## Paso 2: Habilitar Google Calendar API

1. Ve a **APIs & Services** > **Library**
2. Busca "**Google Calendar API**"
3. Haz clic en **Enable**

## Paso 3: Configurar OAuth Consent Screen

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Selecciona **External** (o **Internal** si usas Google Workspace)
3. Completa:
   - **App name**: Facturacion Grupo CP
   - **User support email**: Tu email
   - **Developer contact information**: Tu email
4. En **Scopes**, agrega: `https://www.googleapis.com/auth/calendar`
5. Guarda y continúa

### IMPORTANTE: Agregar Usuarios de Prueba

Si la app está en modo **Testing** (por defecto):

1. En **OAuth consent screen** > sección **Test users**
2. Haz clic en **+ ADD USERS**
3. Agrega los emails de Google de los usuarios que necesitan conectar su calendario
4. Los usuarios deben aceptar la invitación que reciben por email

> En modo Testing, solo los usuarios agregados aquí pueden autorizar la app.
> Para producción, necesitarás completar el proceso de verificación de Google.

## Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth client ID**
3. Selecciona **Application type**: **Web application**
4. Completa:
   - **Name**: Facturacion Calendar Integration
   - **Authorized JavaScript Origins**:
     - Desarrollo: `http://localhost:8000`
     - Producción: `https://tu-dominio.com`
   - **Authorized redirect URIs**:
     - Desarrollo: `http://localhost:8000/google-calendar/callback`
     - Producción: `https://tu-dominio.com/google-calendar/callback`
5. Haz clic en **Create**
6. Copia y guarda:
   - **Client ID**
   - **Client Secret**

## Paso 5: Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
GOOGLE_CALENDAR_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=tu-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/google-calendar/callback
```

> Para producción, cambia la redirect URI a tu dominio.

## Paso 6: Ejecutar Migraciones

```bash
php artisan migrate
```

Esto crea dos tablas:
- `google_calendar_tokens` — almacena tokens OAuth por empresa
- `google_calendar_sync` — registra la sincronización cita ↔ evento de Google

## Paso 7: Probar la Conexión

1. Inicia sesión como Admin
2. Ve a `/admin/calendar`
3. Haz clic en el botón **Google Calendar** en la esquina superior derecha
4. Haz clic en **Conectar Google Calendar**
5. Se abrirá un popup con la pantalla de consentimiento de Google
6. Autoriza el acceso
7. El popup se cerrará y verás un indicador verde de "Conectado"

## Paso 8: Verificar Sincronización

1. Crea una nueva cita en el calendario
2. Abre Google Calendar en tu navegador
3. Verifica que la cita aparece como un evento
4. Edita la cita en la app → el evento se actualiza en Google Calendar
5. Cancela o elimina la cita → el evento se elimina de Google Calendar

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URI en `.env` coincida **exactamente** con la configurada en Google Cloud Console
- Incluye `http://` o `https://` según corresponda
- No pongas slash final (`/`) si no lo tiene en Google Cloud

### Error: "invalid_client"
- Verifica que el Client ID y Client Secret sean correctos
- Asegúrate de que no haya espacios extra en el `.env`

### Error: "Access blocked" o "access_denied"
- La app está en modo Testing y el usuario no está en la lista de Test users
- Solución: agregar el email del usuario en OAuth consent screen > Test users

### El popup se bloquea
- Los navegadores pueden bloquear ventanas emergentes
- El usuario debe permitir popups para el dominio de la aplicación

### La cita no se sincroniza
- Verifica que haya al menos un calendario conectado (icono verde en el botón)
- Revisa los logs de Laravel: `tail -f storage/logs/laravel.log | grep "Google Calendar"`
- Si el token expiró y no se pudo refrescar, reconecta el calendario

## Notas

- Cada empresa puede tener múltiples calendarios conectados
- Los tokens se refrescan automáticamente antes de expirar
- La sincronización es unidireccional: App → Google Calendar
- Los tokens (access_token y refresh_token) se almacenan encriptados en la base de datos y nunca se exponen en la API
- No se requiere instalar paquetes PHP adicionales — se usan llamadas HTTP directas con el facade `Http` de Laravel
