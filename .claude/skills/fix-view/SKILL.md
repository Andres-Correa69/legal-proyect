---
name: fix-view
description: Diagnostica y corrige problemas en una vista especifica del sistema. Usar cuando el usuario reporta un error o comportamiento inesperado en una ruta como '/admin/accounting/reports/trial-balance'
allowed-tools: Bash, Read, Grep, Glob, Edit, Agent
argument-hint: [ruta-de-la-vista] [descripcion-del-problema]
---

El usuario reporta un problema en la vista `$0`. Descripcion: $1

## Proceso de diagnostico

1. **Identificar el archivo frontend**: Mapear la ruta URL a su archivo en `resources/js/pages/admin/`. Ejemplo: `/admin/accounting/reports/trial-balance` → `resources/js/pages/admin/accounting/reports/trial-balance.tsx`

2. **Identificar el controlador backend**: Buscar la ruta en `routes/web.php` o `routes/api.php` para encontrar el controlador y metodo

3. **Leer los archivos relevantes**: Frontend (.tsx), Controller, Service, y tipos en `index.d.ts`

4. **Diagnosticar**:
   - Si es error 500: revisar logs en `storage/logs/laravel.log` (ultimas 50 lineas)
   - Si es error visual: revisar el componente React
   - Si es dato vacio: revisar la query en el Service y la respuesta del API
   - Si es error de exportacion: revisar `app/Exports/` y `resources/views/pdf/`

5. **Corregir**: Aplicar la correccion minima necesaria

6. **Verificar**: Ejecutar `npx vite build` si se modificaron archivos frontend

## Contexto del proyecto
- Stack: Laravel 11 + React 19 + TypeScript + Inertia.js
- API responses: `{ success: bool, data: T, message: string }`
- Multi-tenant: todo filtrado por `company_id` via scopes
- Moneda: COP formato `es-CO`
