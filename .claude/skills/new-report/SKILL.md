---
name: new-report
description: Crea un nuevo reporte contable completo (backend + frontend + exportacion PDF/Excel). Usar cuando se necesita agregar un nuevo tipo de reporte al modulo de contabilidad
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Agent
argument-hint: [nombre-del-reporte] [descripcion]
---

Crear un nuevo reporte contable: **$0**
Descripcion: $1

## Archivos a crear/modificar

### Backend
1. **Service** (`app/Services/AccountingService.php`): Agregar metodo `get{ReportName}()` con los parametros necesarios (company_id, dateFrom, dateTo, filtros opcionales)
2. **Controller** (`app/Http/Controllers/Api/AccountingReportController.php`): Agregar endpoint que llame al service
3. **Ruta API** (`routes/api.php`): Agregar ruta con middleware `permission:accounting.reports`
4. **Export PDF** (`resources/views/pdf/report.blade.php`): Agregar seccion `@elseif` para el nuevo tipo
5. **Export Excel** (`app/Exports/ReportExport.php`): Agregar case en `buildRows()` y metodo builder
6. **getReportData()** en el controller: Agregar case para el nuevo tipo de reporte

### Frontend
1. **Tipo** (`resources/js/types/index.d.ts`): Definir interface del reporte
2. **API** (`resources/js/lib/api.ts`): Agregar metodo en `accountingApi.reports`
3. **Pagina** (`resources/js/pages/admin/accounting/reports/{slug}.tsx`): Crear vista con:
   - Header con `bg-card border-b`, icono en badge `bg-[#2463eb]/10`, boton exportar
   - Stats cards en `grid grid-cols-2 sm:grid-cols-4`
   - Filtros en Card con `shadow-xl border border-[#e1e7ef]`
   - Tabla de resultados con Saldo Anterior y Saldo Final si aplica
4. **Ruta web** (`routes/web.php`): Agregar ruta Inertia
5. **Indice** (`resources/js/pages/admin/accounting/reports/index.tsx`): Agregar card del nuevo reporte

### Permisos
- Agregar permiso en `database/seeders/PermissionSeeder.php` si es necesario

## Patron UI consistente
- Card: `shadow-xl border border-[#e1e7ef]`
- Export: DropdownMenu con PDF y Excel
- Stats: icono + label + valor
- Tabla: `TableHead h-10 px-4 text-xs`, `TableCell p-4 text-sm`
- Saldo Anterior: `bg-blue-50/50 dark:bg-blue-950/20`
- Saldo Final: `bg-muted/50 border-t-2` con color condicional verde/rojo
