---
name: review-exports
description: Revisa y diagnostica problemas con exportaciones PDF y Excel. Usar cuando un PDF sale vacio, un Excel no genera, o hay error 500 al exportar
allowed-tools: Bash, Read, Grep, Glob, Edit
argument-hint: [tipo-reporte] [formato-pdf-o-excel] [descripcion-del-problema]
---

Diagnosticar exportacion del reporte **$0** en formato **$1**.
Problema: $2

## Diagnostico paso a paso

### 1. Verificar que el tipo de reporte existe en el export
- **PDF**: Buscar `@elseif($reportType === '$0')` en `resources/views/pdf/report.blade.php`
  - Si es auxiliar por tercero: revisar `resources/views/pdf/third-party-subledger.blade.php`
- **Excel**: Buscar `case '$0':` en `app/Exports/ReportExport.php` metodo `buildRows()`
  - Si es auxiliar por tercero: revisar `app/Exports/ThirdPartySubledgerExport.php`

### 2. Verificar que getReportData() maneja el tipo
- En `app/Http/Controllers/Api/AccountingReportController.php` metodo `getReportData()`
- Debe tener un case/if para `$0`

### 3. Verificar memoria para PDFs grandes
- DomPDF necesita `ini_set('memory_limit', '512M')` al inicio de `exportReport()`
- Si el PDF tiene muchas filas, considerar paginacion o limitar datos

### 4. Probar con tinker
```php
php artisan tinker
$service = app(\App\Services\AccountingService::class);
$data = $service->getMethodForReport($companyId, $dateFrom, $dateTo);
dd(count($data)); // Verificar que hay datos
```

### 5. Corregir
- Si falta el case/section: agregarlo siguiendo el patron de los reportes existentes
- Si hay error de memoria: agregar `ini_set`
- Si los datos estan vacios: verificar filtros y scopes
- Despues de corregir, ejecutar `npx vite build` si se toco frontend
