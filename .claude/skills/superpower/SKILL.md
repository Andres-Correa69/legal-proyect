---
name: superpower
description: Guia para crear, modificar o diagnosticar Superpoderes (modulos premium habilitables por empresa). Usar cuando se trabaje con ordenes de servicio o se quiera crear un nuevo superpoder
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent
argument-hint: [accion] [nombre-superpoder] [descripcion]
---

Trabajar con Superpoderes del sistema. Accion: **$0**, Superpoder: **$1**. $2

## Que es un Superpoder

Un Superpoder es un **modulo premium** que el Super Admin habilita por empresa. No todas las empresas tienen los mismos modulos — cada una activa solo los que necesita. Es un sistema de feature flags por empresa.

## Arquitectura de un Superpoder

### 1. Feature Flag (habilitacion)
- Se almacena en `Company.settings` (columna JSON): `{ "{slug}_enabled": true }`
- Se gestiona desde `app/Http/Controllers/Api/CompanySettingsController.php`
- El Super Admin lo activa/desactiva desde la configuracion de la empresa
- Frontend valida con: `user.company?.settings?.{slug}_enabled === true`

### 2. Patron de implementacion
Cada superpoder sigue este patron:

```
Backend:
  - Migraciones en database/migrations/
  - Modelos en app/Models/ (con BelongsToCompany, opcionalmente BelongsToBranch)
  - Controlador en app/Http/Controllers/Api/{SuperPoder}Controller.php
  - Rutas en routes/api.php (con middleware permission:{slug}.{accion})
  - Permisos en database/seeders/PermissionSeeder.php
  - Archivos S3 en {company-slug}/{superpoder-slug}/ via CompanyFileStorageService

Frontend:
  - Paginas en resources/js/pages/admin/{superpoder-slug}/
  - API client en resources/js/lib/api.ts
  - Tipos en resources/js/types/index.d.ts
  - Item en sidebar condicionado por el flag + permiso
```

### 3. Reglas criticas
- NUNCA mostrar opciones de un superpoder a empresas que no lo tienen habilitado
- El flag habilita el MODULO, los permisos controlan QUIEN puede hacer que dentro
- Nuevos superpoderes DEBEN documentarse en CLAUDE.md seccion "Superpoderes"
- Sidebar items DEBEN estar condicionados por: `settings.{slug}_enabled && hasPermission('{slug}.view')`

## Superpoderes existentes

### Ordenes de Servicio (`service_orders_enabled`)
- **Proposito**: Gestionar ordenes de trabajo (reparaciones, mantenimiento, instalaciones, servicios tecnicos)
- **Tablas**: service_orders, service_order_items, service_order_attachments, service_order_status_history
- **Modelos**: ServiceOrder, ServiceOrderItem, ServiceOrderAttachment, ServiceOrderStatusHistory
- **Controlador**: ServiceOrderController
- **Paginas**: /admin/service-orders (index, create, show)
- **Permisos**: service-orders.view, service-orders.create, service-orders.manage, service-orders.self-assign, service-orders.complete, service-orders.invoice
- **S3**: {company-slug}/service-orders/
- **Flujo**: Pendiente → En Progreso → En Espera → Completada → Facturada
- **Integraciones**: Inventario (repuestos), Ventas (facturacion), Calendario (citas), Alertas (vencidas), PDF/Tirilla
- **Numeracion**: OS-00000001 (auto por empresa)

## Checklist para crear un nuevo Superpoder

1. Elegir slug descriptivo (ej: `service_orders`)
2. Agregar flag `{slug}_enabled` en CompanySettingsController
3. Crear migraciones con company_id FK
4. Crear modelos con BelongsToCompany
5. Crear controlador API con CRUD + acciones especiales
6. Agregar rutas API con permisos
7. Agregar permisos al PermissionSeeder
8. Crear paginas frontend (index, create, show)
9. Agregar API client methods
10. Agregar tipos TypeScript
11. Agregar item en sidebar (condicionado por flag + permiso)
12. Agregar metodo en CompanyFileStorageService si maneja archivos
13. Documentar en CLAUDE.md seccion "Superpoderes"
14. Actualizar esta skill con el nuevo superpoder
