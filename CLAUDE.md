# Reglas del Proyecto - Legal Sistema

## Stack

- Laravel 11 + React 19 + TypeScript + Inertia.js + Radix UI
- Tailwind CSS **v4** (usa `@import 'tailwindcss'`, `@theme`, `@utility`) — NO usar `tailwind.config.ts`
- Referencia visual: `/Users/andrescorrea69/Documents/GitHub/vet-dash-vibe` (Tailwind v3) — adaptar estilos a v4

## Arquitectura Multi-Tenant

- Cada modelo con datos de empresa DEBE usar el trait `BelongsToCompany`
- Modelos con scope de sucursal DEBEN usar `BelongsToBranch`
- Nuevas migraciones con datos de empresa DEBEN incluir `company_id` como FK con `onDelete('cascade')`
- NUNCA hardcodear `company_id` — usar `auth()->user()->company_id`
- Super Admin bypasea scopes automaticamente — no filtrar manualmente para ellos
- Jerarquia de empresas: Company → Branches → Users (un user pertenece a una empresa y opcionalmente a una sucursal)
- Franquicias soportadas via `parent_id` en companies

## Roles y Permisos

- Sistema RBAC: Users → Roles → Permissions (muchos a muchos)
- 6 roles base: `super-admin`, `admin`, `employee`, `cashier`, `warehouse`, `client`
- Nuevas rutas API DEBEN usar middleware `permission:slug` para control de acceso
- Slugs de permisos: formato `modulo.accion` (ej: `sales.create`, `inventory.manage`)
- Nuevos permisos se agregan en `database/seeders/PermissionSeeder.php` y se asignan a roles correspondientes
- Frontend: proteger UI con `hasPermission('slug')` o `isSuperAdmin()` de `@/lib/permissions`
- NUNCA crear permisos sin agregarlos al seeder
- Permisos `is_super_admin_only` NUNCA deben mostrarse a usuarios normales
- Middleware disponibles: `permission:slug`, `super-admin`, `company.access`, `branch.access`

## Backend (Laravel)

- Controladores API en `app/Http/Controllers/Api/`
- Respuestas API: formato `{ success: bool, data: T, message: string }`
- Validacion en controlador (no Form Requests por ahora)
- Modelos en `app/Models/` con relaciones tipadas y casts
- Servicios complejos en `app/Services/`
- Global Scopes: `CompanyScope` y `BranchScope` en `app/Scopes/`
- Traits de tenant: `BelongsToCompany` y `BelongsToBranch` en `app/Traits/`
- Migraciones deben ser reversibles (implementar `down()`)
- Seeders deben ser idempotentes (usar `firstOrCreate`)

## Frontend (React + TypeScript)

- Componentes UI en `resources/js/components/ui/` (Radix UI base, ~29 componentes)
- Paginas en `resources/js/pages/admin/[feature]/[action].tsx`
- Layout: usar `AppLayout` como wrapper (NO `FacturacionSettingsShell` de vet-dash)
- Forms: `useState` manual para cada campo (NO react-hook-form)
- API calls: importar desde `@/lib/api` (ej: `clientsApi`, `salesApi`, `cashRegistersApi`)
- Tipos globales en `resources/js/types/index.d.ts`
- Imports: usar alias `@/` para `resources/js/`
- Iconos: `lucide-react` exclusivamente
- Notificaciones: `useToast()` hook
- Permisos en frontend: `usePermissions()` hook o funciones de `@/lib/permissions`
- Utilidades: `formatCurrency()`, `formatDate()`, `cn()` desde `@/lib/utils`
- Moneda: formato `es-CO` con COP

## Estilos (Tailwind v4)

- Colores custom en `@theme { --color-*: hsl(var(--*)); }` en `resources/css/app.css`
- NO usar `@utility` para colores — rompe opacity modifiers (`/10`, `/50`)
- Ring utilities si van como `@utility` (`ring-ring`, `ring-offset-background`)
- Badge: `rounded-full` (pill), no shadow
- Card: `rounded-lg shadow-sm` (no `rounded-xl`)
- Button: default `h-10`, sm `h-9`, lg `h-11`, icon `h-10 w-10`, `gap-2`, `ring-2`
- Input: `h-10 bg-background`, `ring-2 ring-offset-2`
- Select trigger: `h-10 bg-background`, check icon a la IZQUIERDA (`pl-8 pr-2`)
- Table head: `h-12 px-4`, cells: `p-4`
- Checkbox: no shadow, `ring-2 ring-offset-2`
- NO usar clase `antialiased` en body (subpixel rendering = texto mas grueso, igual que vet-dash)
- `SelectContent` necesita `className="bg-card z-50"`
- Border radius custom: `--radius-lg: 0.75rem`, `--radius-md: calc(0.75rem - 2px)`, `--radius-sm: calc(0.75rem - 4px)`

## Convenciones de Codigo

- Idioma en codigo: ingles para variables/funciones, espanol para textos de UI y mensajes al usuario
- Imports ordenados: React → terceros → UI components → layout → features → hooks → lib → types
- Named exports para componentes/utils, default export para paginas
- `useMemo`/`useCallback` para optimizacion en listas y handlers pesados
- Componentes de sidebar y layout usan `React.memo` para rendimiento

## Almacenamiento S3 (AWS)

- Bucket: `omnni-s3` — configurado en `.env` (AWS_BUCKET, AWS_URL)
- Servicio: `app/Services/CompanyFileStorageService.php` — SIEMPRE usar este servicio para subir/eliminar archivos
- Estructura OBLIGATORIA por empresa: `{company-slug}/{modulo}/{uuid}.{ext}`
- Carpetas por modulo:
  - `{slug}/logos/` — logo horizontal de la empresa
  - `{slug}/logos/icon/` — icono cuadrado de la empresa
  - `{slug}/products/` — imagenes de productos
  - `{slug}/clients/` — imagenes de perfil de clientes (futuro)
  - `{slug}/service-orders/` — fotos antes/despues, diagnosticos, firmas de ordenes de servicio
- NUNCA subir archivos fuera de la carpeta del company slug
- NUNCA usar rutas planas — siempre organizar en subcarpetas por modulo
- Para agregar un nuevo modulo de archivos: crear metodo en `CompanyFileStorageService` con su subfolder correspondiente
- Archivos publicos via bucket policy (no ACLs) — usar `Storage::disk('s3')->put()` sin visibility
- Al eliminar un registro con archivo, SIEMPRE eliminar el archivo de S3 tambien
- Company model tiene `logo_url` (horizontal) y `logo_icon_url` (cuadrado) — ambos en `$fillable`
- Product model tiene `image_url` en `$fillable`

## Superpoderes (Módulos Premium por Empresa)

- Un "Superpoder" es un modulo adicional que el **Super Admin habilita por empresa** desde la configuracion de la empresa
- Se almacena como flag boolean en `Company.settings` (columna JSON): `{ "service_orders_enabled": true }`
- El Super Admin activa/desactiva superpoderes desde `/admin/companies/{id}/settings`
- El controlador que gestiona los flags es `app/Http/Controllers/Api/CompanySettingsController.php`
- Frontend: validar visibilidad con `user.company?.settings?.{flag} === true`
- Sidebar: los items de menu de superpoderes SOLO se muestran si el flag esta activo para esa empresa
- Permisos: los superpoderes tienen sus propios permisos (`service-orders.view`, etc.) — el flag habilita el modulo, los permisos controlan quien puede hacer que dentro del modulo
- NUNCA mostrar opciones de superpoderes a empresas que no los tienen habilitados

### Superpoder: Ordenes de Servicio (`service_orders_enabled`)

- Modulo para gestionar ordenes de trabajo: reparaciones, mantenimiento, instalaciones, servicios tecnicos
- Flujo de estados: `pending` → `in_progress` → `on_hold` → `completed` → `invoiced` (o `cancelled`)
- Tablas: `service_orders`, `service_order_items`, `service_order_attachments`, `service_order_status_history`
- Modelos: `ServiceOrder`, `ServiceOrderItem`, `ServiceOrderAttachment`, `ServiceOrderStatusHistory`
- Controlador API: `app/Http/Controllers/Api/ServiceOrderController.php`
- Paginas: `resources/js/pages/admin/service-orders/` (index, create, show)
- Permisos: `service-orders.view`, `service-orders.create`, `service-orders.manage`, `service-orders.self-assign`, `service-orders.complete`, `service-orders.invoice`
- S3: archivos en `{company-slug}/service-orders/{uuid}.{ext}` (fotos antes/despues, diagnosticos, firmas)
- Integraciones:
  - **Inventario**: repuestos usados descuentan stock al facturar
  - **Ventas**: boton "Facturar" convierte la orden completada en una `Sale` con sus items
  - **Calendario**: opcion de agendar cita de entrega vinculada a `Appointment`
  - **Alertas**: tipo `service_orders_overdue` para ordenes vencidas
  - **PDF/Tirilla**: generar orden imprimible y comprobante de recepcion
- Una orden puede tener items de tipo `service` (mano de obra) y `product` (repuestos)
- Al facturar, se crea una Sale y se vincula via `service_orders.sale_id`
- Numeracion automatica: `OS-00000001` por empresa

## Seguridad

- NUNCA exponer `company_id` o `branch_id` en URLs sin middleware de acceso
- Toda ruta autenticada debe verificar `company.access` o `branch.access` al acceder a recursos especificos
- CSRF: el ApiClient lo maneja automaticamente — no desactivar
- Toda ruta API autenticada debe pasar por middleware `auth:sanctum`
