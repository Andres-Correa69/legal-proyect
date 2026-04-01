# Prueba Gratuita - Landing Page y Wizard de Registro

## Resumen

Se implementó una página de presentación pública del sistema Omnni y un wizard de registro de prueba gratuita de 7 días. Cualquier persona puede acceder sin autenticación, crear una empresa y empezar a usar el sistema inmediatamente.

## Rutas Públicas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page con presentación del sistema (hero, funcionalidades, módulos, ventajas, precios) |
| `/registro` | Wizard de registro de prueba gratuita (6 pasos) |
| `/login` | Login (existente) |

## API Endpoints Públicos (Rate Limited: 5/hora por IP)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/registration/parse-rut` | Parsea PDF de RUT y extrae datos |
| POST | `/api/registration/validate-company` | Valida unicidad de NIT, email, etc. |
| POST | `/api/registration/upload-logo` | Sube logo temporal a S3 |
| POST | `/api/registration/upload-logo-icon` | Sube ícono temporal a S3 |
| POST | `/api/registration/complete` | Crea empresa, sede, usuario y suscripción |

## Flujo del Wizard (6 Pasos)

1. **Datos de la Empresa** (obligatorio)
   - Subir RUT para auto-llenar datos o ingresar manualmente
   - Nombre, NIT, email, teléfono, dirección, ciudad, departamento
   - Credenciales del administrador: nombre, email, contraseña

2. **Personalizar** (omitible)
   - Subir logo horizontal y logo ícono
   - Remoción de fondo automática (client-side con Canvas API)
   - Preview antes/después

3. **Productos y Servicios** (omitible)
   - Agregar productos con nombre, precio, costo, SKU, tipo, IVA
   - Tabla editable

4. **Configuración DIAN** (omitible)
   - Token de facturación electrónica
   - Tipo de documento, organización, régimen
   - Datos tributarios

5. **Qué te espera** (omitible)
   - Información sobre funcionalidades disponibles tras crear la cuenta
   - Google Calendar, chat, reportes, nómina, soporte, etc.

6. **Revisión final** (obligatorio)
   - Resumen de todos los datos con opción de editar cada sección
   - Aceptar términos y condiciones
   - Botón de crear empresa

## Flujo de Creación (Backend)

Al completar el wizard:

1. Se crea la **Company** en la BD de Facturación
2. `CompanyObserver` auto-ejecuta `CompanySetupService`:
   - Crea la **Branch** (sede principal) con `is_main = true`
   - Crea el **User** administrador con rol `admin`
3. Se actualizan las credenciales del admin con las del formulario
4. Se mueven logos de `temp/` a `{company-slug}/logos/` en S3
5. Se crean productos si los hay
6. Se guarda config DIAN si se proporcionó
7. Se llama a la API interna del **Administrador** para crear la suscripción de 7 días

## Desactivación Automática de Suscripciones

### Comando (Administrador)
```bash
php artisan subscriptions:deactivate-expired
```

- Se ejecuta diariamente a las 00:05 (schedule en `routes/console.php`)
- Busca suscripciones con `status = active` y `end_date < now()`
- Cambia `status` a `expired`
- Pone `is_active = false` en la empresa del sistema externo (Omnni o Zyscore)
- El login en Facturación bloquea acceso cuando `company.is_active = false`

### Plan de Prueba Gratis
```bash
# En el proyecto Administrador:
php artisan migrate    # Agrega columna duration_days a plans
php artisan db:seed --class=PlanSeeder   # Crea plan "Prueba Gratis 7 Dias"
```

## Variables de Entorno

### Facturación (.env)
```
ADMINISTRADOR_URL=http://127.0.0.1:8002
INTERNAL_API_KEY=tu_clave_secreta_compartida
```

### Administrador (.env)
```
INTERNAL_API_KEY=tu_clave_secreta_compartida
```

> **Importante:** Ambos proyectos deben compartir la misma `INTERNAL_API_KEY`.

## Background Removal (Logos)

- Se hace **client-side** en el navegador usando Canvas API
- No requiere API key externa ni servicio de terceros
- Funciona bien con fondos sólidos (blanco, gris, colores uniformes)
- El usuario puede activar/desactivar con un toggle
- Preview antes/después incluido

## Mascota (Alien Omnni)

- Aparece en la landing page (hero y CTA final)
- Aparece en cada paso del wizard con un mensaje contextual
- Reutiliza el componente `LoginMascot` existente (`login-mascot.tsx`)
- Burbuja de diálogo con mensajes por paso

## Seguridad

- CSRF automático vía Sanctum `statefulApi()`
- Rate limiting: 5 intentos por IP por hora
- Campo honeypot en el formulario
- Validación de unicidad (NIT, email del admin)
- `Auth::user()` es null durante registro público (ActivityLog se omite silenciosamente)

## Archivos Creados/Modificados

### Facturación - Backend
- `app/Services/AdminApiService.php` (nuevo)
- `app/Services/FreeTrialService.php` (nuevo)
- `app/Http/Controllers/Api/RegistrationController.php` (nuevo)
- `app/Console/Commands/CleanupTempRegistrations.php` (nuevo)
- `app/Providers/AppServiceProvider.php` (modificado - rate limiter)
- `config/services.php` (modificado - config administrador)
- `routes/api.php` (modificado - rutas públicas de registro)
- `routes/web.php` (modificado - landing y wizard routes)

### Facturación - Frontend
- `resources/js/pages/welcome.tsx` (nuevo)
- `resources/js/pages/registration/wizard.tsx` (nuevo)
- `resources/js/components/landing/` (8 componentes nuevos)
- `resources/js/components/registration/` (7 componentes nuevos)
- `resources/js/lib/background-removal.ts` (nuevo)
- `resources/js/lib/api.ts` (modificado - registrationApi)

### Administrador
- `app/Http/Controllers/Api/InternalSubscriptionController.php` (nuevo)
- `app/Http/Middleware/ValidateInternalApiKey.php` (nuevo)
- `app/Console/Commands/DeactivateExpiredSubscriptions.php` (nuevo)
- `database/migrations/2026_03_23_000001_add_duration_days_to_plans_table.php` (nuevo)
- `database/seeders/PlanSeeder.php` (nuevo)
- `app/Models/Plan.php` (modificado - duration_days en fillable)
- `app/Http/Controllers/SubscriptionController.php` (modificado - soporte duration_days)
- `bootstrap/app.php` (modificado - rutas API)
- `routes/api.php` (nuevo)
- `routes/console.php` (modificado - schedule)
- `config/services.php` (modificado - internal API key)
