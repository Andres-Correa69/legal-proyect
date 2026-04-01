# Auditoría Completa del Proyecto - Facturación Grupo CP

**Fecha:** 2026-02-19
**Branch:** `features/andres`
**Autor:** Auditoría automatizada

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura General](#3-arquitectura-general)
4. [Backend (Laravel)](#4-backend-laravel)
5. [Frontend (React + TypeScript)](#5-frontend-react--typescript)
6. [Base de Datos](#6-base-de-datos)
7. [Sistema de Permisos (RBAC)](#7-sistema-de-permisos-rbac)
8. [Multi-Tenancy](#8-multi-tenancy)
9. [Seguridad](#9-seguridad)
10. [Módulos Funcionales](#10-módulos-funcionales)
11. [Documentación Existente](#11-documentación-existente)
12. [Hallazgos y Recomendaciones](#12-hallazgos-y-recomendaciones)
13. [Métricas del Proyecto](#13-métricas-del-proyecto)

---

## 1. Resumen Ejecutivo

**Facturación Grupo CP** es un sistema de facturación y ERP multi-tenant para el mercado colombiano. Construido con Laravel 11 + React 19 + TypeScript + Inertia.js, cubre ventas, inventario, caja, contabilidad y facturación electrónica DIAN.

### Escala del Proyecto

| Métrica | Cantidad |
|---------|----------|
| Modelos (Eloquent) | 46 |
| Controladores API | 42 |
| Observadores | 18 |
| Servicios | 7 |
| Middleware Custom | 8 |
| Migraciones | 79 |
| Seeders | 14 |
| Páginas Frontend (.tsx) | 56 |
| Componentes UI | 35 |
| Hooks Custom | 5 |
| Interfaces TypeScript | 40+ |
| Permisos RBAC | 71 |
| Roles Base | 6 |
| Tests Reales | 0 |

---

## 2. Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| PHP | ^8.2 | Runtime |
| Laravel Framework | ^12.0 | Framework MVC |
| Laravel Sanctum | * | Autenticación SPA/API |
| Laravel Fortify | * | Autenticación backend (registro, 2FA, password reset) |
| Laravel Octane | ^2.13 | Servidor de alto rendimiento |
| RoadRunner | ^2.6/^3.3 | Worker HTTP para Octane |
| Inertia.js (Laravel) | * | Adaptador server-side |
| DomPDF | ^3.1 | Generación de PDFs |
| Maatwebsite Excel | ^3.1 | Import/Export Excel |
| Resend PHP | ^1.1 | Servicio de email |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | ^19.2.3 | UI Library |
| TypeScript | ^5.9.3 | Tipado estático |
| Vite | ^7.0.7 | Build tool |
| Tailwind CSS | ^4.1.18 | Framework CSS (v4) |
| Radix UI | 27 primitivos | Componentes accesibles |
| Inertia.js (React) | ^2.3.11 | SPA routing |
| Recharts | ^3.7.0 | Gráficas |
| date-fns | ^4.1.0 | Utilidades de fecha |
| lucide-react | ^0.563.0 | Iconos |
| class-variance-authority | ^0.7.1 | Variantes de componentes |

### Dev Tools

| Herramienta | Propósito |
|-------------|-----------|
| PHPUnit ^11.5 | Testing PHP |
| Laravel Pint | Code style (PSR-12) |
| Laravel Sail | Docker dev environment |
| FakerPHP | Datos falsos para seeders/tests |

---

## 3. Arquitectura General

```
┌────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                   │
│  Inertia.js ← Pages → Components → Hooks → API Client  │
└──────────────────────────┬─────────────────────────────┘
                           │ Inertia / API calls
┌──────────────────────────┴─────────────────────────────┐
│                  BACKEND (Laravel 12)                    │
│                                                         │
│  Routes → Middleware → Controllers → Services → Models  │
│                                        │                │
│  Traits (BelongsToCompany/Branch)      │                │
│  Scopes (CompanyScope/BranchScope)     │                │
│  Observers (18 observadores)           │                │
│                                        ▼                │
│                              ┌─────────────────┐        │
│                              │   MySQL/SQLite   │        │
│                              │   (40+ tablas)   │        │
│                              └─────────────────┘        │
│                                                         │
│  External API ← DianProxyController → DIAN API          │
└─────────────────────────────────────────────────────────┘
```

### Archivos de Configuración Clave

| Archivo | Propósito |
|---------|-----------|
| `bootstrap/app.php` | Bootstrap, middleware stack, route files |
| `config/auth.php` | Guard web, Eloquent provider |
| `config/sanctum.php` | Dominios stateful, expiración tokens |
| `config/fortify.php` | 2FA, registro, password reset |
| `vite.config.ts` | Build config, SSR, alias `@/`, proxy API |
| `tsconfig.json` | Strict mode, ESNext, path mapping |
| `resources/css/app.css` | Design system completo (Tailwind v4) |

---

## 4. Backend (Laravel)

### 4.1 Rutas

#### `routes/api.php` — API Interna (Autenticada)

Todas las rutas protegidas con `auth:sanctum`. Cada endpoint tiene middleware `permission:slug`.

**Rutas Públicas (sin auth):**
- `POST /auth/login`
- `POST /2fa/send-login-code`, `POST /2fa/verify-login`
- `GET /electronic-invoicing/catalogs`, `POST /electronic-invoicing/sync-catalogs`

**Grupos de Rutas Protegidas:**

| Grupo | Controlador | Endpoints | Permisos |
|-------|------------|-----------|----------|
| Empresas | CompanyController | CRUD + toggleActive | `companies.*` |
| Sucursales | BranchController | CRUD + toggleActive | `branches.*` |
| Usuarios | UserController | CRUD + toggleStatus | `users.*` |
| Roles | RoleController | CRUD + assignPermissions | `roles.*` |
| Productos | ProductController | CRUD + stock + bulk | `products.*` |
| Servicios | ServiceController | CRUD + categories/units | `services.*` |
| Categorías | ProductCategoryController | CRUD | `products.manage` |
| Áreas | ProductAreaController | CRUD | `products.manage` |
| Tipos | ProductTypeController | CRUD | `products.manage` |
| Proveedores | SupplierController | CRUD | `suppliers.*` |
| Almacenes | WarehouseController | CRUD | `inventory.manage` |
| Ubicaciones | LocationController | CRUD | `inventory.manage` |
| Cajas | CashRegisterController | CRUD | `cash-registers.*` |
| Sesiones Caja | CashRegisterSessionController | open/close/summary | `cash-sessions.*` |
| Transferencias | CashRegisterTransferController | CRUD + cancel | `cash-transfers.*` |
| Pagos | PaymentController | CRUD + cancel + summaries | `payments.*` |
| Métodos Pago | PaymentMethodController | CRUD | `payment-methods.*` |
| Ventas | SaleController | CRUD + drafts + stats | `sales.*` |
| Clientes | ClientController | CRUD | `clients.*` |
| Consulta Saldos | BalanceInquiryController | clientes/proveedores | `balances.*` |
| Reportes Caja | CashReportController | cashFlow/byRegister/global | `cash-reports.*` |
| Inventario | 4 Controllers | compras/transferencias/ajustes/movimientos | `inventory.*` |
| Fact. Electrónica | ElectronicInvoicingController | DIAN integration | `electronic-invoicing.*` |
| Contabilidad | 4 Controllers | cuentas/asientos/reportes/periodos | `accounting.*` |
| Auditoría | AuditLogController | getAll | `audit.view` |
| API Logs | ExternalApiLogController | getAll | `external-api-logs.*` |
| Perfil | ProfileController | update/password | (auth only) |
| Config Empresa | CompanySettingsController | get/update | `company-settings.*` |
| Razones Ajuste | AdjustmentReasonController | CRUD | `inventory.manage` |

#### `routes/external-api.php` — API Externa (DIAN Proxy)

Protegida con middleware `api-client` (API Key) + `log-external-request` + rate limiting (60 req/min).

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/catalogs` | GET | Catálogos DIAN |
| `/company/register` | POST | Registrar empresa en DIAN |
| `/company/register` | PUT | Actualizar datos DIAN |
| `/invoice` | POST | Enviar factura electrónica |
| `/invoice/send-raw` | POST | Enviar factura (payload raw) |
| `/company/environment` | PUT | Configurar ambiente DIAN |
| `/credit-note` | POST | Enviar nota crédito |
| `/debit-note` | POST | Enviar nota débito |

#### `routes/web.php` — Rutas Inertia

Solo retornan renders de Inertia (sin lógica de datos). Todas protegidas con `auth:sanctum`.

---

### 4.2 Modelos (46 total)

#### Modelos con Multi-Tenancy

| Modelo | BelongsToCompany | BelongsToBranch | SoftDeletes |
|--------|:----------------:|:---------------:|:-----------:|
| Sale | ✅ | ❌* | ✅ |
| SaleItem | — | — | — |
| SalePayment | — | — | — |
| Product | ✅ | — | ✅ |
| Service | ✅ | — | ✅ |
| Payment | ✅ | ✅ | ✅ |
| PaymentMethod | ✅ | — | ✅ |
| PaymentInstallment | — | — | — |
| CashRegister | ✅ | ✅ | ✅ |
| CashRegisterSession | ✅ | ✅ | — |
| CashRegisterTransfer | ✅ | ✅ | ✅ |
| Warehouse | ✅ | ✅ | ✅ |
| Location | ✅ | — | — |
| Supplier | ✅ | — | ✅ |
| InventoryPurchase | ✅ | ✅ | ✅ |
| InventoryPurchaseItem | — | — | — |
| InventoryTransfer | ✅ | — | ✅ |
| InventoryTransferItem | — | — | — |
| InventoryAdjustment | ✅ | ✅ | ✅ |
| InventoryMovement | ✅ | ✅ | — |
| AdjustmentReason | ✅ | — | — |
| ProductCategory | ✅ | — | — |
| ProductArea | ✅ | — | — |
| ProductType | ✅ | — | — |
| AccountingAccount | ✅ | — | ✅ |
| AccountingPeriod | ✅ | — | — |
| JournalEntry | ✅ | ✅ | ✅ |
| JournalEntryLine | — | — | — |

*\*Sale tiene `branch_id` en la migración pero NO usa `BelongsToBranch` — ver hallazgos.*

#### Modelos sin Multi-Tenancy (por diseño)

| Modelo | Razón |
|--------|-------|
| Company / Branch | Son las entidades tenant |
| User | Filtrado manual por `company_id` en controladores |
| Role / Permission | Sistema RBAC global |
| ElectronicInvoice / CreditNote / DebitNote | Scopeados vía Sale → Company |
| ActivityLog / ExternalApiLog / ApiClient | Logs del sistema |
| TwoFactorCode / TrustedDevice | Scopeados vía User |
| Type* / Municipality | Catálogos DIAN globales |

#### Modelos Notables

**Sale** (Venta):
- Auto-genera `invoice_number` en creación
- Relaciones: company, branch, client, seller, items, salePayments, payments (morph), electronicInvoice
- Soporta 4 tipos: `standard`, `pos`, `draft`, `proforma`
- 4 estados: `completed`, `cancelled`, `draft`, `pending`
- Campos financieros: subtotal, discount, tax, total, total_paid, balance_due, commissions, retenciones (JSON)

**Product** (Producto):
- 20 campos fillable incluyendo precios, stock, tracking
- Métodos: `isLowStock()`, `isOverStock()`, `updateAverageCost()`, `updateStock()`, `needsRestock()`
- Unique constraint company-scoped: `[company_id, sku]`, `[company_id, barcode]`

**CashRegister** (Caja Registradora):
- 3 tipos: `minor` (caja menor), `major` (caja principal), `bank` (cuenta bancaria)
- Métodos: `addToBalance()`, `subtractFromBalance()`, `hasOpenSession()`
- Relación con PaymentMethod

**AccountingAccount** (Cuenta Contable):
- Estructura jerárquica con `parent_id` auto-referencial
- 6 tipos: asset, liability, equity, revenue, expense, cost
- 2 naturalezas: debit, credit
- Método `getBalance()` calcula saldo respetando naturaleza débito/crédito

---

### 4.3 Servicios (7)

| Servicio | Líneas | Responsabilidad |
|----------|--------|-----------------|
| `AccountingService` | ~515 | Partida doble: crear/publicar/anular asientos, reportes financieros (balance prueba, mayor general, estado resultados, balance general), periodos contables |
| `PaymentService` | ~446 | Registrar ingresos/egresos, cancelar pagos, cuotas, resúmenes de pagos por compra/venta. Sistema dual de pagos (SalePayment + Payment global) |
| `ElectronicInvoicingService` | ~481 | Integración DIAN completa: catálogos, registro empresa, envío facturas/notas crédito/débito. Modo mock para desarrollo |
| `CashRegisterService` | ~245 | Abrir/cerrar sesiones, resumen de sesión, transferencias entre cajas, cancelar transferencias |
| `CompanySetupService` | ~211 | Setup inicial de empresa: crear sucursal principal, usuario admin, slugs y códigos únicos |
| `AutoPurchaseOrderService` | ~208 | Órdenes de compra automáticas cuando el stock cae bajo el mínimo. Agrupa por proveedor |
| `TwoFactorService` | ~178 | 2FA por email: código 6 dígitos, expiración 10 min, trust devices 30 días |

---

### 4.4 Observadores (18)

**Observadores de Dominio (14):**
- `BaseObserver` — Clase base
- `CompanyObserver`, `BranchObserver`, `UserObserver`, `RoleObserver`
- `ProductObserver`, `ServiceObserver`, `SupplierObserver`, `WarehouseObserver`
- `CashRegisterObserver`, `PaymentObserver`
- `InventoryPurchaseObserver`, `InventoryTransferObserver`, `InventoryAdjustmentObserver`

**Observadores Contables (4):** Generan asientos automáticos en `AccountingService`:
- `AccountingSaleObserver` — Asientos por ventas completadas
- `AccountingPaymentObserver` — Asientos por pagos
- `AccountingCashTransferObserver` — Asientos por transferencias entre cajas
- `AccountingPurchaseObserver` — Asientos por compras recibidas

---

### 4.5 Middleware Custom (8)

| Middleware | Alias | Propósito |
|-----------|-------|-----------|
| `HandleInertiaRequests` | (web stack) | Comparte auth, company, branch, flash messages a Inertia |
| `PermissionMiddleware` | `permission` | Verifica permiso RBAC del usuario. Cache en memoria por request. Super admin bypasea |
| `SuperAdminMiddleware` | `super-admin` | Bloquea no-super-admins con 403 |
| `EnsureCompanyAccess` | `company.access` | Valida que el usuario puede acceder al `company_id` del request |
| `EnsureBranchAccess` | `branch.access` | Valida acceso al `branch_id` del request |
| `ValidateApiClient` | `api-client` | Valida header `X-API-Key` contra hashes SHA-256 en `api_clients` |
| `LogExternalRequest` | `log-external-request` | Log de requests externos con timing, sanitización de campos sensibles |
| `AuthenticateApiToken` | (no registrado) | Fallback a Sanctum token lookup — posiblemente obsoleto |

---

### 4.6 Traits y Scopes

**Traits:**

| Trait | Funcionalidad |
|-------|---------------|
| `BelongsToCompany` | Agrega `CompanyScope` global, auto-asigna `company_id` en creación, relación `company()`, scopes `withAllCompanies()` y `forCompany()` |
| `BelongsToBranch` | Agrega `BranchScope` global, auto-asigna `branch_id` en creación, relación `branch()`, scopes `withAllBranches()` y `forBranch()` |

**Scopes Globales:**

| Scope | Comportamiento |
|-------|---------------|
| `CompanyScope` | Si NO es super admin: filtra por `company_id` del usuario. Incluye IDs de franquicias hijas. Super admin: sin filtro |
| `BranchScope` | Si usuario tiene `branch_id` y NO es super admin: filtra por branch. Si no tiene branch o es super admin: sin filtro |

---

## 5. Frontend (React + TypeScript)

### 5.1 Páginas (56 archivos .tsx)

| Módulo | Páginas | Archivos |
|--------|---------|----------|
| Auth | 1 | `login.tsx` |
| Dashboard | 1 | `dashboard.tsx` |
| Ventas / POS | 3 | `sell/index`, `sales/index`, `sales/show` |
| Clientes | 2 | `clients/index`, `clients/create` |
| Caja y Pagos | 6 | `cash-registers/index`, `cash-transfers/index`, `cash-transfers/history`, `cash-transfers-history/index`, `payments/index`, `cash-reports/index` |
| Saldos/Cartera | 4 | `balances/clients/index`, `balances/suppliers/index`, `client-balances/index`, `client-balances/show` |
| Inventario | 12 | products, categories, areas, types, warehouses, locations, suppliers, purchases, transfers, adjustments, reasons, movements |
| Servicios | 1 | `services/index` |
| Fact. Electrónica | 3 | `electronic-invoicing/index`, `config`, `habilitacion` |
| Contabilidad | 10 | accounts (index/create), journal-entries (index/create/show), periods, config, reports (5 tipos) |
| Configuración | 4 | users, roles, branches, payment-methods |
| Super Admin | 2 | companies, subscriptions |
| Logs/Auditoría | 2 | audit-logs, external-api-logs |
| Perfil/Seguridad | 2 | profile, security |

### 5.2 Componentes UI (29 primitivos Radix)

Alert, AlertDialog, Avatar, Badge, Button, Calendar, Card, Checkbox, Collapsible, Combobox, Command, Dialog, DropdownMenu, Input, Label, NotificationBadge, Pagination, Popover, ScrollArea, Select, Separator, Sheet, Spinner, Switch, Table, Tabs, Textarea, Toast/Toaster, Tooltip.

**Convenciones de estilo (Tailwind v4):**
- Badge: `rounded-full` (pill), sin shadow
- Card: `rounded-lg shadow-sm`
- Button: `h-10` default, `h-9` sm, `h-11` lg, `gap-2`, `ring-2`
- Input: `h-10 bg-background`, `ring-2 ring-offset-2`
- Select: `h-10 bg-background`, check icon izquierda (`pl-8 pr-2`)
- SelectContent: `bg-card z-50`
- Table head: `h-12 px-4`, cells: `p-4`

### 5.3 Componentes de Layout (3)

- **AppSidebar** — Sidebar principal con menú colapsible, permisos filtrados, `React.memo`
- **AppHeader** — Header con toggle sidebar, alertas de facturas, avatar menu, dark mode
- **CollapsedMenuItemWithSubmenu** — Tooltip con submenu para sidebar colapsado

### 5.4 Hooks Custom (5)

| Hook | Propósito |
|------|-----------|
| `useAuth` | Login, logout, 2FA flow, loading states |
| `useToast` | Sistema de notificaciones toast (reducer pattern) |
| `useTwoFactor` | Gestión 2FA: activar, confirmar, desactivar, dispositivos confiables |
| `useHeaderAlerts` | Polling cada 5 min para alertas de facturas vencidas. Cache a nivel de módulo. Sonidos via Web Audio API |
| `useAppearance` | Tema light/dark/system. Persiste en localStorage + cookie |

### 5.5 API Client (`lib/api.ts` — ~3,014 líneas)

Clase `ApiClient` con:
- Gestión automática de CSRF token
- Bearer token en localStorage
- Métodos: `get()`, `post()`, `put()`, `patch()`, `delete()`, `getRaw()`, `requestRaw()`
- Extracción automática de `{ success: true, data: T }`
- Manejo de errores con tipo `ApiError`

**30+ módulos API exportados:** authApi, twoFactorApi, dashboardApi, companiesApi, branchesApi, usersApi, rolesApi, permissionsApi, productCategoriesApi, productAreasApi, productTypesApi, warehousesApi, locationsApi, suppliersApi, productsApi, servicesApi, paymentMethodsApi, cashRegistersApi, cashSessionsApi, cashTransfersApi, paymentsApi, balanceInquiryApi, cashReportsApi, auditLogsApi, externalApiLogsApi, clientsApi, adjustmentReasonsApi, inventoryMovementsApi, inventoryPurchasesApi, inventoryTransfersApi, inventoryAdjustmentsApi, salesApi, invoiceAlertsApi, electronicInvoicingApi, habilitacionApi, profileApi, companySettingsApi, accountingApi.

### 5.6 Utilidades

**`lib/utils.ts`:**
- `cn()` — Merge de clases Tailwind
- `formatCurrency()` — Formato COP (`es-CO`)
- `formatDate()` / `formatDateTime()` — Formato colombiano
- `formatNumber()` — Números con locale
- `truncate()`, `slugify()`, `getInitials()`, `debounce()`, `generateUniqueId()`

**`lib/permissions.ts`:**
- `isSuperAdmin()`, `isAdmin()`, `hasRole()`, `hasAnyRole()`
- `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- `usePermissions()` hook — inyecta usuario actual desde Inertia

**`lib/sounds.ts`:**
- `playAlertSound()` — Dos tonos ascendentes via Web Audio API
- `playDismissSound()` — Tono de confirmación

### 5.7 Sistema de Diseño CSS (app.css — 431 líneas)

**20 tokens de color** via `@theme { --color-*: hsl(var(--*)); }`:
- Colores base: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring
- Colores extendidos: success (verde), warning (ámbar), info (cyan)

**Temas por módulo:**
- Billing (naranja): `--billing-primary/accent/background/border`
- Workshop (púrpura/azul): `--workshop-primary/accent/background/border`
- Medical (teal/cyan): `--medical-primary/accent/background/border`
- Accounting (púrpura): `--accounting-primary/accent/background/border`

**Dark mode completo** via clase `.dark` con override total de tokens.

**14 animaciones keyframe** + utilities para accordion, fade, scale, slide, page transitions.

### 5.8 Tipos TypeScript (`types/index.d.ts` — 628 líneas)

40+ interfaces incluyendo: User (40+ campos), Role, Permission, Company, Branch, PaginatedData<T>, ApiError, ApiResponse<T>, CashRegister, CashRegisterSession, Payment, Product, Service, Sale, InventoryPurchase, InventoryTransfer, InventoryAdjustment, AccountingAccount, JournalEntry, JournalEntryLine, AccountingPeriod, TrialBalanceRow, GeneralLedgerRow, etc.

---

## 6. Base de Datos

### 6.1 Migraciones (79 archivos, 40+ tablas)

**TODAS las 79 migraciones implementan `down()` correctamente** — reversibilidad total.

#### Tablas Principales

| Dominio | Tablas |
|---------|--------|
| Core Laravel | users, password_reset_tokens, sessions, cache, jobs |
| Multi-Tenant | companies, branches |
| RBAC | roles, permissions, role_user, permission_role |
| Caja | cash_registers, cash_register_sessions, cash_register_transfers |
| Pagos | payment_methods, payments, payment_installments |
| Inventario | products, product_categories, product_areas, product_types, warehouses, locations, suppliers, inventory_movements, inventory_purchases, inventory_purchase_items, inventory_transfers, inventory_transfer_items, inventory_adjustments, adjustment_reasons |
| Ventas | sales, sale_items, sale_payments, services |
| Fact. Electrónica | electronic_invoices, electronic_credit_notes, electronic_debit_notes, type_document_identifications, type_organizations, type_regimes, type_liabilities, municipalities |
| Contabilidad | accounting_accounts, journal_entries, journal_entry_lines, accounting_periods, accounting_account_cash_register (pivot), accounting_account_supplier (pivot), accounting_account_sale_type |
| Seguridad | two_factor_codes, trusted_devices, personal_access_tokens |
| API Externa | api_clients, external_api_logs |
| Auditoría | activity_logs |

#### Convenciones de Migración

- Campos monetarios: `decimal(15, 2)` consistente en todo el proyecto
- FKs company-scoped: `company_id` con `onDelete('cascade')`
- Unique constraints company-scoped: ej. `unique[company_id, sku]`
- Soft deletes extensivos en datos de negocio
- Índices en columnas frecuentes de filtrado (status, is_active, FKs, dates)
- Full-text index en products: `[name, sku, barcode]`

### 6.2 Seeders (14)

| Seeder | Idempotente | Datos |
|--------|:-----------:|-------|
| DatabaseSeeder | N/A | Orchestrador: llama 11 seeders en orden |
| PermissionSeeder | ✅ | 71 permisos en 20+ grupos |
| RoleSeeder | ✅ | 6 roles: super-admin, admin, employee, cashier, warehouse, client |
| CompanySeeder | ✅ | 5 empresas, 6 sucursales, usuarios de prueba |
| DefaultPaymentMethodsSeeder | ✅ | 7 métodos de pago para todas las empresas |
| WarehouseSeeder | ✅ | 3 almacenes + 6 ubicaciones jerárquicas |
| AdjustmentReasonSeeder | ✅ | 10 razones de ajuste |
| SupplierSeeder | ✅ | 4 proveedores |
| ProductCategorySeeder | ✅ | 8 categorías |
| ProductSeeder | ✅ | 16 productos con niveles variados de stock |
| ServiceSeeder | ⚠️ | 18 servicios (usa `updateOrCreate` — sobreescribe cambios) |
| InventorySeeder | ✅ | Órdenes de compra, transferencias, ajustes de ejemplo |
| PaymentMethodSeeder | ⚠️ | Duplica funcionalidad con DefaultPaymentMethodsSeeder |
| PucSeeder | ✅ | Plan Único de Cuentas colombiano (40+ cuentas niveles 1-4) |

### 6.3 Factories

**Solo 1 factory existe:** `UserFactory` (factory básica de Laravel). No crea `company_id`, `branch_id`, ni roles.

**Gap significativo:** No hay factories para Company, Product, Sale, Payment, CashRegister ni ningún otro modelo.

---

## 7. Sistema de Permisos (RBAC)

### 7.1 Estructura

```
Users ←→ Roles ←→ Permissions (muchos a muchos)
```

### 7.2 Roles Base (6)

| Rol | Slug | Acceso |
|-----|------|--------|
| Super Admin | `super-admin` | TODO — bypasea permisos y scopes |
| Administrador | `admin` | Gestión completa de empresa |
| Empleado | `employee` | Ventas, inventario básico |
| Cajero | `cashier` | Caja, ventas, pagos |
| Bodeguero | `warehouse` | Inventario completo |
| Cliente | `client` | Solo vista de información propia |

### 7.3 Grupos de Permisos (20+)

| Grupo | Permisos | Descripción |
|-------|----------|-------------|
| companies | view, create, edit, delete, manage | Gestión de empresas |
| branches | view, create, edit, delete | Gestión de sucursales |
| users | view, create, edit, delete | Gestión de usuarios |
| roles | view, create, edit, delete | Gestión de roles |
| products | view, create, edit, delete, manage | Productos y catálogos |
| services | view, create, edit, delete | Servicios |
| suppliers | view, create, edit, delete | Proveedores |
| sales | view, create, edit, delete, manage | Ventas |
| clients | view, create, edit, delete | Clientes |
| inventory | view, manage | Inventario |
| cash-registers | view, create, edit, delete | Cajas |
| cash-sessions | view, open, close | Sesiones de caja |
| cash-transfers | view, create, cancel | Transferencias |
| payments | view, create, cancel, manage | Pagos |
| payment-methods | view, create, edit, delete | Métodos de pago |
| balances | view | Consulta de saldos |
| cash-reports | view, export | Reportes de caja |
| electronic-invoicing | view, manage | Facturación electrónica |
| accounting | view, manage, create, close-period | Contabilidad |
| audit | view | Auditoría |
| subscriptions | manage | Suscripciones |
| company-settings | view, edit | Configuración empresa |
| external-api-logs | view | Logs API externa |

### 7.4 Flujo de Verificación

1. **Backend:** Middleware `permission:slug` en cada ruta API → query join `role_user + permission_role + permissions` → cache en memoria por request
2. **Frontend:** `hasPermission('slug')` vía `usePermissions()` hook → verifica permisos del usuario de Inertia props
3. **Super Admin:** Bypasea TODOS los checks automáticamente

---

## 8. Multi-Tenancy

### 8.1 Jerarquía

```
Company (Empresa)
├── Branches (Sucursales)
│   ├── Users (Usuarios)
│   ├── CashRegisters (Cajas)
│   ├── Warehouses (Almacenes)
│   └── ...branch-scoped data...
├── Products (compartidos entre sucursales)
├── Services (compartidos entre sucursales)
├── PaymentMethods (compartidos)
└── Children Companies (Franquicias vía parent_id)
```

### 8.2 Implementación

| Capa | Mecanismo |
|------|-----------|
| Modelo | Traits `BelongsToCompany` / `BelongsToBranch` |
| Query | Global Scopes `CompanyScope` / `BranchScope` |
| Auto-assign | `company_id` / `branch_id` se asignan automáticamente en `creating` event |
| Super Admin | Bypasea todos los scopes (no ve filtro) |
| Franquicias | `CompanyScope` incluye IDs de companies hijas (`parent_id`) |
| Company-wide users | Si user no tiene `branch_id`, `BranchScope` no filtra |

### 8.3 Modelos por Scope

- **22 modelos** con `BelongsToCompany`
- **10 modelos** con `BelongsToBranch`
- **17 modelos** con `SoftDeletes`
- **24 modelos** sin traits de tenancy (por diseño — catálogos, logs, items hijos, etc.)

---

## 9. Seguridad

### 9.1 Autenticación

| Mecanismo | Implementación |
|-----------|---------------|
| Sesiones Web | Sanctum stateful API (cookies + CSRF) |
| API Tokens | Sanctum personal access tokens |
| 2FA | Email-based, código 6 dígitos, 10 min expiración |
| Dispositivos Confiables | Hash user-agent, trust 30 días |
| API Externa | API Key (SHA-256 hash en BD) + header `X-API-Key` |
| Rate Limiting | Login: 5/min. 2FA: 5/min. API Externa: 60/min |

### 9.2 Análisis de Seguridad

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| SQL Injection | ✅ SEGURO | Todo el raw SQL usa comparaciones columna-columna, sin interpolación de input |
| CSRF | ✅ CONFIGURADO | Sanctum stateful API habilitado, sin bypasses |
| company_id hardcoded | ✅ SEGURO | CERO instancias hardcoded en `/app` |
| Middleware en rutas | ✅ CORRECTO | Toda ruta protegida tiene `auth:sanctum` + `permission:slug` |
| API Keys | ✅ SEGURO | Almacenadas como SHA-256 hash |
| Logs sensibles | ✅ SANITIZADO | Campos como `dian_token`, `certificate`, `password` se enmascaran |
| CORS | ⚠️ PROBLEMA | `allowed_origins: ['*']` con `supports_credentials: true` — inseguro |
| Token Expiration | ⚠️ PROBLEMA | Sanctum tokens nunca expiran (`null`) |
| Email Verification | ⚠️ DESHABILITADO | Fortify tiene verificación de email comentada |
| Debug Mode | ⚠️ RIESGO | `.env.example` tiene `APP_DEBUG=true` por defecto |

---

## 10. Módulos Funcionales

### 10.1 Ventas (POS)

- **POS completo** con búsqueda de productos, selección de servicios, carrito, múltiples métodos de pago
- **4 tipos de venta:** standard, pos, draft (borrador), proforma
- **Borradores:** guardar, editar, finalizar, eliminar
- **Pagos parciales** con tracking de saldo pendiente
- **Comisiones** por vendedor configurables
- **Retenciones** almacenadas como JSON
- **Vista calendario** de facturas con color por estado
- **Exportación PDF** de facturas

### 10.2 Facturación Electrónica (DIAN)

- **Registro de empresa** con catálogos DIAN sincronizados
- **Habilitación** multi-paso: ambiente → certificado → software → facturas prueba → producción
- **Facturas electrónicas** con XML/PDF base64, QR, UUID DIAN
- **Notas crédito** (anulación) y **notas débito** (modificación)
- **Numeración** configurable por sucursal (resolución, prefijo, consecutivos)
- **Modo mock** para desarrollo sin hit al API real de DIAN
- **API Proxy** para proyectos externos (Zyscore)

### 10.3 Gestión de Caja

- **3 tipos de caja:** menor, principal, bancaria
- **Sesiones:** abrir/cerrar con balance esperado, diferencia, arqueo
- **Transferencias** entre cajas con cancelación
- **Reportes:** flujo de caja por sesión/registro, global por sucursal/método
- **Cierre automático** con transferencia a caja principal

### 10.4 Inventario

- **Productos:** CRUD completo, stock tracking, precios, impuestos, SKU/barcode
- **Compras:** workflow draft → pending → approved → received (parcial/total)
- **Transferencias** entre almacenes con workflow de aprobación
- **Ajustes** de inventario con razones configurables y umbrales de aprobación
- **Movimientos:** log inmutable de todas las operaciones de stock
- **Auto-compra:** órdenes automáticas cuando stock < mínimo
- **Precio promedio** actualizado automáticamente en compras

### 10.5 Contabilidad

- **Plan Único de Cuentas (PUC)** jerárquico con niveles ilimitados
- **Partida doble** estricta (débito = crédito validado)
- **Asientos manuales** y **automáticos** (vía observadores en ventas, pagos, compras, transferencias)
- **Periodos contables** mensuales con apertura/cierre
- **5 reportes financieros:**
  - Libro Diario
  - Mayor General
  - Balance de Prueba
  - Estado de Resultados
  - Balance General
- **Mapeo de cuentas** por tipo de venta, caja registradora y proveedor

### 10.6 Cartera / Saldos

- **Saldos de clientes:** ventas, pagos, pendiente por cobrar
- **Saldos de proveedores:** compras, pagos, pendiente por pagar
- **Exportación** a PDF y Excel

### 10.7 Administración

- **Multi-empresa** con franquicias
- **Usuarios** con CRUD y asignación de roles/sucursales
- **Roles** configurables con permisos granulares
- **Sucursales** con configuración independiente de facturación electrónica
- **Métodos de pago** personalizables por empresa
- **Suscripciones:** activación/desactivación de empresas y sucursales

---

## 11. Documentación Existente

| Archivo | Contenido |
|---------|-----------|
| `README.md` | ⚠️ README por defecto de Laravel — sin info del proyecto |
| `CLAUDE.md` | Reglas completas del proyecto para desarrollo con IA |
| `docs/PERMISOS.md` | Matriz de permisos: 50 permisos, 6 roles, mapeo rutas-permisos |
| `docs/API_EXTERNA_DIAN.md` | Documentación completa del API proxy DIAN (8 endpoints) |
| `docs/DIAN_Proxy_API.postman_collection.json` | Colección Postman para API DIAN |
| `docs/contabilidad/01_FUNCIONAL.md` | Especificación funcional del módulo contable |
| `docs/contabilidad/02_TECNICA.md` | Especificación técnica: schemas, modelos, API, tipos |
| `docs/contabilidad/03_SPRINT_PRESENTACION.md` | Documento de presentación/pitch del módulo contable |
| `docs/contabilidad/04_ANALISIS_PROFUNDO.md` | Análisis profundo: PUC, NIIF, asientos por tipo de transacción |
| `docs/contabilidad/05_GUIA_PRUEBAS.md` | Guía de pruebas con 17 escenarios paso a paso |

---

## 12. Hallazgos y Recomendaciones

### 12.1 Problemas Críticos

| # | Problema | Impacto | Recomendación |
|---|---------|---------|---------------|
| 1 | **CERO tests reales** — Solo scaffold de Laravel | Para un sistema financiero, esto es un riesgo crítico | Implementar tests para: multi-tenancy, RBAC, flujos de venta/pago, contabilidad (débito=crédito), integración DIAN |
| 2 | **Sale no usa `BelongsToBranch`** | Usuarios de una sucursal pueden ver ventas de otra sucursal dentro de la misma empresa | Agregar trait `BelongsToBranch` al modelo Sale |
| 3 | **CORS inseguro** | `allowed_origins: ['*']` con `supports_credentials: true` | Especificar dominios exactos en `config/cors.php` |
| 4 | **Tokens Sanctum no expiran** | Tokens robados son válidos indefinidamente | Configurar `expiration` en `config/sanctum.php` |

### 12.2 Problemas Medios

| # | Problema | Recomendación |
|---|---------|---------------|
| 5 | **PaymentInstallment sin `BelongsToCompany`** — tiene `company_id` en migración pero no el trait | Agregar trait o remover el campo si no se necesita |
| 6 | **Payment usa cast `'amount' => 'float'`** mientras todo el sistema usa `'decimal:2'` | Cambiar a `'decimal:2'` para consistencia y evitar errores de punto flotante |
| 7 | **PucSeeder NO se llama desde DatabaseSeeder** | BDs nuevas no tendrán plan de cuentas. Agregar al orchestrador |
| 8 | **Solo 1 factory (UserFactory)** | Crear factories para Company, Product, Sale, Payment, CashRegister mínimo |
| 9 | **Locale/timezone desalineados** | `APP_LOCALE=en`, `timezone=UTC` para un sistema colombiano. Configurar `es` y documentar estrategia UTC |
| 10 | **SaleController muy largo** (~1185 líneas) | Extraer lógica a SaleService o sub-controladores |

### 12.3 Problemas Menores

| # | Problema | Recomendación |
|---|---------|---------------|
| 11 | Contraseñas seeded son `password` para todos los usuarios | Agregar protección contra ejecución en producción |
| 12 | `.env.example` con `APP_DEBUG=true` | Cambiar default a `false` |
| 13 | `.env.example` sin variables DIAN ni Resend | Documentar todas las variables necesarias |
| 14 | Seeders duplicados de payment methods | Unificar `DefaultPaymentMethodsSeeder` y `PaymentMethodSeeder` |
| 15 | ServiceSeeder usa `updateOrCreate` | Sobreescribe cambios manuales. Usar `firstOrCreate` |
| 16 | `TrustedDevice::generateDeviceHash` ignora parámetro `$ip` | Eliminar el parámetro o usarlo en el hash |
| 17 | Sin ESLint/Prettier configurado para frontend | Configurar linting y formateo |
| 18 | Sin tests frontend (Vitest/RTL/Cypress) | Considerar testing framework para componentes críticos |
| 19 | `@types/*` en `dependencies` en vez de `devDependencies` | Mover a devDependencies |
| 20 | Cash transfer export retorna 501 | Implementar o remover endpoint |
| 21 | AuditLogController verifica super admin por duplicado | Middleware `permission:audit.view` es suficiente |
| 22 | Service tiene `branch_id` en fillable pero no `BelongsToBranch` | Documentar claramente la decisión o remover el campo |
| 23 | Catálogos electrónicos son endpoints públicos | Agregar rate limiting explícito |
| 24 | Middleware `AuthenticateApiToken` existe pero no está registrado | Eliminar si está obsoleto |
| 25 | Versiones wildcard `*` en Sanctum, Fortify, Inertia | Fijar a versión major (ej. `^2.0`) |

### 12.4 Fortalezas

1. **Excelente implementación multi-tenant** — CompanyScope/BranchScope con bypass automático para super admin
2. **RBAC granular y bien implementado** — 71 permisos, middleware en toda ruta, verificación frontend
3. **Cero vulnerabilidades SQL injection** — Todo raw SQL usa comparaciones columna-columna
4. **Migraciones 100% reversibles** — Todas implementan `down()`
5. **Seeders mayormente idempotentes** — Usan `firstOrCreate`
6. **Integración DIAN completa** — Con modo mock para desarrollo
7. **Sistema contable robusto** — Partida doble con observadores automáticos
8. **API externa bien asegurada** — API keys hasheadas, rate limiting, logs sanitizados
9. **Sistema de diseño consistente** — Tailwind v4 con tokens de color, dark mode, temas por módulo
10. **Documentación interna sólida** — docs/ con especificaciones funcionales y técnicas del módulo contable

---

## 13. Métricas del Proyecto

### Líneas de Código Estimadas

| Área | Archivos | Líneas Aprox. |
|------|----------|--------------|
| Modelos PHP | 46 | ~4,500 |
| Controladores API | 42 | ~8,000 |
| Servicios PHP | 7 | ~2,300 |
| Middleware PHP | 8 | ~500 |
| Migraciones | 79 | ~3,000 |
| Seeders | 14 | ~1,500 |
| Observadores | 18 | ~1,000 |
| Páginas React (.tsx) | 56 | ~20,000 |
| Componentes UI | 35 | ~3,000 |
| Hooks | 5 | ~500 |
| API Client (api.ts) | 1 | ~3,014 |
| Tipos TypeScript | 1 | ~628 |
| CSS (app.css) | 1 | ~431 |
| **Total Estimado** | **313 archivos** | **~48,000** |

### Cobertura de Tests

| Tipo | Existente | Recomendado |
|------|-----------|-------------|
| Unit Tests (PHP) | 0 | Multi-tenancy, scopes, models, services |
| Feature Tests (PHP) | 0 | CRUD endpoints, RBAC, flows de negocio |
| Frontend Unit | 0 | Hooks, utils, permissions |
| E2E | 0 | Login, POS, contabilidad |
| **Total** | **0** | **Mínimo 100+ tests** |

---

*Auditoría generada el 2026-02-19. Para preguntas o actualizaciones, consultar el equipo de desarrollo.*
