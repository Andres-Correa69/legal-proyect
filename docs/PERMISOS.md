# Matriz de Permisos - Sistema de Facturacion Grupo CP

## Arquitectura del Sistema de Permisos

### Componentes

| Componente | Ubicacion | Funcion |
|---|---|---|
| **Permission (modelo)** | `app/Models/Permission.php` | Define permisos con `slug`, `group`, `is_hidden`, `is_super_admin_only` |
| **Role (modelo)** | `app/Models/Role.php` | Roles asignables a usuarios, relacion muchos-a-muchos con permisos |
| **PermissionMiddleware** | `app/Http/Middleware/PermissionMiddleware.php` | Valida permisos en rutas API via `permission:slug` |
| **PermissionSeeder** | `database/seeders/PermissionSeeder.php` | Crea todos los permisos del sistema |
| **RoleSeeder** | `database/seeders/RoleSeeder.php` | Crea roles y asigna permisos por defecto |

### Flags de Permisos

| Flag | Efecto |
|---|---|
| `is_hidden = true` | No aparece en la UI de gestion de roles. Se asigna solo via seeder. |
| `is_super_admin_only = true` | Exclusivo de Super Admin. No se asigna al rol Admin ni a ningun otro rol. |
| Sin flags | Visible en UI de roles, asignable a cualquier rol. |

### Roles del Sistema

| Rol | Slug | Descripcion |
|---|---|---|
| **Super Administrador** | `super-admin` | Acceso total. Ve todas las empresas. Recibe TODOS los permisos. |
| **Administrador** | `admin` | Admin de empresa. Recibe todos los permisos excepto `is_super_admin_only`. |
| **Empleado** | `employee` | Acceso limitado de lectura a inventario y productos. |
| **Cajero** | `cashier` | Acceso a ventas, cajas, pagos y clientes. |
| **Bodeguero** | `warehouse` | Acceso completo a inventario, compras y transferencias. |
| **Cliente** | `client` | Sin permisos. Solo registro en base de datos. |

---

## Matriz Completa de Permisos por Rol

> **Leyenda:** SA = Super Admin | AD = Admin | EM = Empleado | CA = Cajero | BO = Bodeguero

### Dashboard

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Dashboard | `dashboard.view` | x | x | x | x | x |

### Ventas

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Ventas | `sales.view` | x | x | - | x | - |
| Crear Ventas | `sales.create` | x | x | - | x | - |
| Gestionar Ventas | `sales.manage` | x | x | - | - | - |

### Usuarios

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Usuarios | `users.view` | x | x | - | - | - |
| Gestionar Usuarios | `users.manage` | x | x | - | - | - |

### Roles

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Roles | `roles.view` | x | x | - | - | - |
| Gestionar Roles | `roles.manage` | x | x | - | - | - |

### Empresas (Solo Super Admin)

| Permiso | Slug | SA | AD | EM | CA | BO | Flags |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Ver Empresas | `companies.view` | x | - | - | - | - | `is_super_admin_only` |
| Gestionar Empresas | `companies.manage` | x | - | - | - | - | `is_super_admin_only` |

### Sucursales

| Permiso | Slug | SA | AD | EM | CA | BO | Flags |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Ver Sucursales | `branches.view` | x | x | - | - | - | - |
| Gestionar Sucursales | `branches.manage` | x | - | - | - | - | `is_super_admin_only` |

### Clientes

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Clientes | `clients.view` | x | x | - | x | - |
| Gestionar Clientes | `clients.manage` | x | x | - | - | - |

### Cajas Registradoras

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Cajas | `cash-registers.view` | x | x | - | x | - |
| Gestionar Cajas | `cash-registers.manage` | x | x | - | - | - |
| Abrir Cajas | `cash-registers.open` | x | x | - | x | - |
| Cerrar Cajas | `cash-registers.close` | x | x | - | x | - |

### Transferencias de Caja

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Transferencias | `cash-transfers.view` | x | x | - | x | - |
| Crear Transferencias | `cash-transfers.create` | x | x | - | x | - |
| Cancelar Transferencias | `cash-transfers.cancel` | x | x | - | - | - |

### Pagos

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Pagos | `payments.view` | x | x | - | x | x |
| Crear Ingresos | `payments.create-income` | x | x | - | x | - |
| Crear Egresos | `payments.create-expense` | x | x | - | x | x |
| Gestionar Pagos | `payments.manage` | x | x | - | - | - |

### Metodos de Pago

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Metodos de Pago | `payment-methods.view` | x | x | - | x | x |
| Gestionar Metodos de Pago | `payment-methods.manage` | x | x | - | - | - |

### Reportes de Caja

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Reportes de Caja | `cash-reports.view` | x | x | - | x | - |
| Exportar Reportes de Caja | `cash-reports.export` | x | x | - | - | - |

### Inventario General

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Inventario | `inventory.view` | x | x | x | - | x |
| Gestionar Inventario | `inventory.manage` | x | x | - | - | x |

### Productos

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Productos | `products.view` | x | x | x | x | x |
| Gestionar Productos | `products.manage` | x | x | - | - | x |

### Servicios

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Servicios | `services.view` | x | x | x | x | x |
| Gestionar Servicios | `services.manage` | x | x | - | - | x |

### Categorias de Productos

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Categorias | `categories.view` | x | x | x | - | x |
| Gestionar Categorias | `categories.manage` | x | x | - | - | - |

### Bodegas

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Bodegas | `warehouses.view` | x | x | x | - | x |
| Gestionar Bodegas | `warehouses.manage` | x | x | - | - | - |

### Ubicaciones

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Ubicaciones | `locations.view` | x | x | x | - | x |
| Gestionar Ubicaciones | `locations.manage` | x | x | - | - | x |

### Proveedores

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Proveedores | `suppliers.view` | x | x | x | - | x |
| Gestionar Proveedores | `suppliers.manage` | x | x | - | - | - |

### Compras de Inventario

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Compras | `inventory.purchases.view` | x | x | - | - | x |
| Gestionar Compras | `inventory.purchases.manage` | x | x | - | - | x |
| Aprobar Compras | `inventory.purchases.approve` | x | x | - | - | - |
| Recibir Compras | `inventory.purchases.receive` | x | x | - | - | x |

### Transferencias de Inventario

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Transferencias | `inventory.transfers.view` | x | x | - | - | x |
| Crear Transferencias | `inventory.transfers.create` | x | x | - | - | x |
| Aprobar Transferencias | `inventory.transfers.approve` | x | x | - | - | - |
| Completar Transferencias | `inventory.transfers.complete` | x | x | - | - | x |

### Ajustes de Inventario

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Ajustes | `inventory.adjustments.view` | x | x | - | - | x |
| Crear Ajustes | `inventory.adjustments.create` | x | x | - | - | - |
| Aprobar Ajustes | `inventory.adjustments.approve` | x | x | - | - | - |
| Gestionar Motivos | `inventory.adjustments.manage` | x | x | - | - | x |

### Movimientos de Inventario

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Movimientos | `inventory.movements.view` | x | x | x | - | x |

### Reportes

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Reportes | `reports.view` | x | x | - | - | - |
| Exportar Reportes | `reports.export` | x | x | - | - | - |

### Auditoria (Solo Super Admin)

| Permiso | Slug | SA | AD | EM | CA | BO | Flags |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| Ver Auditoria | `audit-logs.view` | x | - | - | - | - | `is_super_admin_only` |

### Configuracion

| Permiso | Slug | SA | AD | EM | CA | BO |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Ver Configuracion | `settings.view` | x | x | - | - | - |
| Gestionar Configuracion | `settings.manage` | x | x | - | - | - |

### Facturacion Electronica DIAN

| Permiso | Slug | SA | AD | EM | CA | BO | Flags | Descripcion |
|---|---|:---:|:---:|:---:|:---:|:---:|---|---|
| Ver Facturacion Electronica | `electronic-invoicing.view` | x | x | - | - | - | - | Ver seccion FE, enviar facturas, descargar PDF, ver estado |
| Gestionar Facturacion Electronica | `electronic-invoicing.manage` | x | x | - | - | - | `is_hidden` | Registrar y actualizar datos de empresa en DIAN |
| Configurar Facturacion Electronica | `electronic-invoicing.config` | x | x | - | - | - | `is_hidden` | Configurar resolucion y consecutivos DIAN |

**Notas sobre Facturacion Electronica:**
- `electronic-invoicing.view` es **visible en la UI de roles** y puede asignarse a cualquier rol (ej: cajero que necesite facturar electronicamente)
- `electronic-invoicing.manage` y `electronic-invoicing.config` son **ocultos** (`is_hidden`). Solo los recibe el Admin automaticamente via seeder. No aparecen en la pantalla de gestion de roles.
- El Super Admin siempre tiene acceso total (bypass de permisos via `isSuperAdmin()`)

---

## Mapeo de Rutas API a Permisos

### Facturacion Electronica (`/api/electronic-invoicing/*`)

| Ruta | Metodo | Permiso | Accion |
|---|---|---|---|
| `/status` | GET | `electronic-invoicing.view` | Ver estado de FE |
| `/invoice` | POST | `electronic-invoicing.view` | Enviar factura electronica |
| `/sales/{sale}/generate` | POST | `electronic-invoicing.view` | Generar FE desde venta |
| `/{electronicInvoice}/pdf` | GET | `electronic-invoicing.view` | Descargar PDF de FE |
| `/register` | POST | `electronic-invoicing.manage` | Registrar empresa en DIAN |
| `/register` | PUT | `electronic-invoicing.manage` | Actualizar datos empresa DIAN |
| `/config` | GET | `electronic-invoicing.config` | Ver configuracion de resolucion |
| `/config` | PUT | `electronic-invoicing.config` | Actualizar configuracion resolucion |

### Rutas Publicas (sin autenticacion)

| Ruta | Metodo | Accion |
|---|---|---|
| `/api/electronic-invoicing/catalogs` | GET | Obtener catalogos DIAN |
| `/api/electronic-invoicing/sync-catalogs` | POST | Sincronizar catalogos DIAN |
| `/api/auth/login` | POST | Login |
| `/api/2fa/send-login-code` | POST | Enviar codigo 2FA |
| `/api/2fa/verify-login` | POST | Verificar codigo 2FA |

---

## Navegacion del Sidebar

### Admin (fullNavigation)

La seccion de Facturacion Electronica aparece dentro de **Configuracion**:

```
Configuracion
  ├── Usuarios          (users.view)
  ├── Roles             (roles.view)
  ├── Sucursales        (branches.view)
  ├── Metodos de Pago   (payment-methods.view)
  ├── Empresa DIAN      (electronic-invoicing.manage)   ← Solo admin
  └── Configuracion FE  (electronic-invoicing.config)   ← Solo admin
```

### Super Admin (superAdminNavigation)

Tiene su propia seccion de nivel superior:

```
Facturacion DIAN  (electronic-invoicing.view)
  ├── Creacion de Empresa  (electronic-invoicing.manage)
  └── Configuracion FE     (electronic-invoicing.config)
```

---

## Chequeos de Permisos en Frontend

| Pagina | Archivo | Permiso Verificado |
|---|---|---|
| Creacion de Empresa DIAN | `pages/admin/electronic-invoicing/index.tsx` | `electronic-invoicing.manage` |
| Configuracion FE | `pages/admin/electronic-invoicing/config.tsx` | `electronic-invoicing.config` |

Si el usuario no tiene el permiso, se muestra un mensaje de "No tiene permisos para acceder a esta seccion".

---

## Resumen de Conteo

| Concepto | Cantidad |
|---|---|
| **Total de permisos** | 50 |
| **Permisos visibles en UI de roles** | 44 |
| **Permisos ocultos (is_hidden)** | 2 (electronic-invoicing.manage, electronic-invoicing.config) |
| **Permisos solo Super Admin** | 4 (companies.view, companies.manage, branches.manage, audit-logs.view) |
| **Roles del sistema** | 6 (Super Admin, Admin, Empleado, Cajero, Bodeguero, Cliente) |
| **Grupos de permisos** | 18 |

---

## Comandos Utiles

```bash
# Crear/actualizar permisos (no borra datos existentes)
php artisan db:seed --class=PermissionSeeder

# Actualizar asignacion de permisos a roles
php artisan db:seed --class=RoleSeeder

# Recrear todo desde cero (BORRA TODOS LOS DATOS)
php artisan migrate:fresh --seed
```
