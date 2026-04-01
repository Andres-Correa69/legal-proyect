---
name: new-api-route
description: Crea una nueva ruta API completa con controlador, validacion, permisos, y tipo TypeScript. Usar cuando se necesita un nuevo endpoint
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
argument-hint: [modulo] [accion] [descripcion]
---

Crear nuevo endpoint API para el modulo **$0**, accion **$1**.
Descripcion: $2

## Checklist obligatorio

### Backend
1. **Controlador**: En `app/Http/Controllers/Api/{Modulo}Controller.php`
   - Validacion inline en el metodo (no Form Requests)
   - Respuesta: `{ success: bool, data: T, message: string }`
   - Try/catch con mensaje descriptivo en espanol
   - Usar `auth()->user()->company_id` para scope

2. **Ruta**: En `routes/api.php`
   - Dentro del grupo `auth:sanctum`
   - Con middleware `permission:{modulo}.{accion}`
   - Verbo HTTP correcto (GET para consultas, POST para crear, PUT para actualizar, DELETE para eliminar)

3. **Permiso**: En `database/seeders/PermissionSeeder.php`
   - Slug: `{modulo}.{accion}`
   - Asignar a roles correspondientes
   - Usar `firstOrCreate` (idempotente)

### Frontend
4. **Tipo**: En `resources/js/types/index.d.ts` si es un nuevo modelo/respuesta
5. **API client**: En `resources/js/lib/api.ts` dentro del objeto `{modulo}Api`

### Seguridad
- NUNCA hardcodear company_id
- NUNCA exponer datos sin middleware de acceso
- Validar inputs del usuario
