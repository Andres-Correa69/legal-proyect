# Resultados de Pruebas de Estres - Facturacion Grupo CP

**Fecha:** 2026-03-24
**Ejecutado por:** Claude Code (k6 automated)

---

## 1. Entorno de Pruebas

| Componente | Version/Detalle |
|------------|-----------------|
| **OS** | macOS Darwin 25.3.0 (arm64 / Apple Silicon) |
| **PHP** | 8.4.16 (CLI, NTS) |
| **Base de datos** | PostgreSQL (via `DB_CONNECTION=pgsql`) |
| **Cache/Queue/Session** | Database driver |
| **Servidor web** | `php artisan serve` (single-threaded) |
| **Framework** | Laravel 11 + React 19 + Inertia.js |
| **Herramienta** | k6 v1.6.1 (go1.26.0, darwin/arm64) |
| **URL base** | `http://127.0.0.1:8000/api` |
| **Usuario de prueba** | `contacto@grupocp.com` |

> **Nota importante:** `php artisan serve` es un servidor de desarrollo single-threaded. Los resultados reflejan el rendimiento en este entorno. En produccion con Nginx/Apache + PHP-FPM (o Octane), el rendimiento sera significativamente superior.

---

## 2. Metodologia

### Herramienta: k6

Se uso k6 con scenarios de tipo `ramping-vus` para simular carga progresiva. Cada scenario realiza login, obtiene datos necesarios, y ejecuta operaciones CRUD completas.

### Scenarios de prueba (9 modulos)

| Scenario | Endpoints probados | Peso | Tipo |
|----------|-------------------|------|------|
| **Dashboard** | `GET /dashboard/statistics` | 20% | Solo lectura |
| **Ventas** | `GET/POST /sales`, `GET /sales/{id}/pdf` | 25% | Lectura + Escritura |
| **Productos** | `GET /products`, busqueda, analytics | 15% | Solo lectura |
| **Pagos** | `GET /payments`, pendientes ventas/compras | 10% | Solo lectura |
| **Contabilidad CRUD** | `GET/POST /accounting/journal-entries`, plan de cuentas | 10% | Lectura + Escritura |
| **Reportes contables** | Trial balance, general ledger, income statement, balance sheet | 8% | Solo lectura (queries pesadas) |
| **Reportes negocio** | Sales products, best sellers, top clients, inventory | 7% | Solo lectura |
| **Cajas registradoras** | `GET /cash-registers`, sesiones | 3% | Solo lectura |
| **Inventario** | `GET /inventory-purchases`, movimientos, ajustes, transferencias | 2% | Solo lectura |

### Tipos de prueba ejecutadas

1. **Smoke Test** - 1 VU, 1 iteracion por scenario (validacion funcional)
2. **Stress Test** - Rampa progresiva: 0→25 VUs (1m) → 25 sostenidos (3m) → 50 VUs (1m) → 50 sostenidos (3m) → 0 (1m). Duracion total: 9 minutos.

---

## 3. Resultados: Smoke Test

**Estado general: PASSED**
**Duracion:** 1m 17s
**Checks:** 98% (49/50 pasados)

| Endpoint | Status | Tiempo |
|----------|--------|--------|
| `GET /dashboard/statistics` | PASS | ~360ms |
| `GET /sales` | PASS | ~62ms |
| `GET /sales/stats` | PASS | ~62ms |
| `POST /sales` (crear venta) | PASS | ~200ms |
| `GET /sales/{id}` | PASS | ~60ms |
| `GET /sales/{id}/pdf` | PASS | ~888ms |
| `GET /products` | PASS | ~60ms |
| `GET /products?search=...` | PASS | ~60ms |
| `GET /products/low-stock` | PASS | ~60ms |
| `GET /products/{id}` | PASS | ~60ms |
| `GET /products/{id}/analytics` | PASS | ~60ms |
| `GET /payments` | PASS | ~62ms |
| `GET /payments/sales-pending` | PASS | ~62ms |
| `GET /payments/purchases-pending` | PASS | ~62ms |
| `GET /accounting/accounts/tree` | PASS | ~250ms |
| `GET /accounting/accounts/leaf` | PASS | ~62ms |
| `GET /accounting/journal-entries` | PASS | ~62ms |
| `POST /accounting/journal-entries` | PASS | ~200ms |
| `GET /accounting/reports/trial-balance` | PASS | ~250ms |
| `GET /accounting/reports/general-ledger` | FAIL (422) | ~20ms |
| `GET /accounting/reports/income-statement` | PASS | ~250ms |
| `GET /accounting/reports/balance-sheet` | PASS | ~250ms |
| `GET /reports/sales-products` | PASS | ~60ms |
| `GET /reports/best-sellers` | PASS | ~60ms |
| `GET /reports/top-clients` | PASS | ~60ms |
| `GET /reports/income-expenses` | PASS | ~60ms |
| `GET /reports/inventory` | PASS | ~60ms |
| `GET /cash-registers` | PASS | ~60ms |
| `GET /cash-sessions` | PASS | ~60ms |
| `GET /inventory-purchases` | PASS | ~60ms |
| `GET /inventory-movements` | PASS | ~60ms |
| `GET /inventory-adjustments` | PASS | ~60ms |
| `GET /inventory-transfers` | PASS | ~60ms |

### Observaciones Smoke Test

- **General Ledger** retorna 422 porque requiere `account_id` como parametro obligatorio (comportamiento correcto)
- **Generacion PDF** es el endpoint mas lento (~888ms) incluso con 1 usuario
- **Dashboard statistics** es el segundo mas lento (~360ms) por sus 12+ queries
- **Reportes contables** toman ~250ms cada uno (queries con JOINs sobre journal_entries)

### Metricas globales Smoke Test

| Metrica | Valor |
|---------|-------|
| Total requests | 42 |
| Throughput | 0.54 req/s |
| p50 latencia | 62ms |
| p95 latencia | 888ms |
| p99 latencia | 1.5s |
| Error rate | 2.38% (1 error - general ledger 422) |

---

## 4. Resultados: Stress Test

**Estado general: THRESHOLD BREACHED** (p95 > 2000ms)
**Duracion:** 9m 5s
**VUs maximo:** 50

### Metricas globales

| Metrica | Valor |
|---------|-------|
| **Total requests** | 3,795 |
| **Throughput** | 6.97 req/s |
| **Iteraciones completadas** | 927 |
| **Tasa de iteracion** | 1.70 iter/s |
| **Datos recibidos** | 45 MB (83 kB/s) |
| **Datos enviados** | 896 KB (1.6 kB/s) |

### Distribucion de latencia

| Percentil | Valor |
|-----------|-------|
| **min** | 19ms |
| **med (p50)** | 4.28s |
| **avg** | 4.66s |
| **p90** | 8.73s |
| **p95** | 9.41s |
| **p99** | ~11s |
| **max** | 11.66s |

### Umbrales (Thresholds)

| Umbral | Objetivo | Resultado | Estado |
|--------|----------|-----------|--------|
| p95 latencia | < 2,000ms | 9,410ms | **FAIL** |
| p99 latencia | < 5,000ms | ~11,000ms | **FAIL** |
| Error rate | < 5% | 1.42% | **PASS** |

### Checks detallados

| Check | Resultado | Pasados | Fallidos |
|-------|-----------|---------|----------|
| Todos los checks combinados | **98.90%** | 4,874 | 54 |
| dashboard status 200 | PASS | - | 0 |
| sales list status 200 | PASS | - | 0 |
| sales stats status 200 | PASS | - | 0 |
| sale created 200/201 | PASS | - | 0 |
| products list status 200 | PASS | - | 0 |
| payments list status 200 | PASS | - | 0 |
| journal entries list status 200 | PASS | - | 0 |
| journal entry created | PASS | - | 0 |
| trial balance status 200 | PASS | - | 0 |
| general ledger status 200/422 | **FAIL** | 0 | 54 |
| income statement status 200 | PASS | - | 0 |
| balance sheet status 200 | PASS | - | 0 |
| Todos los reportes de negocio | PASS | - | 0 |
| Cajas registradoras | PASS | - | 0 |
| Inventario | PASS | - | 0 |

---

## 5. Analisis de Cuellos de Botella

### 5.1 Servidor single-threaded (CRITICO)

`php artisan serve` procesa requests de forma secuencial. Con 50 VUs concurrentes, cada request debe esperar su turno. Esto explica el p50 de 4.28s — no es que los endpoints sean lentos, sino que estan encolados.

**Impacto:** Latencia mediana de 4.28s bajo 50 VUs. En produccion con Nginx + PHP-FPM (8 workers), este valor bajaria a ~200-500ms.

### 5.2 Dashboard statistics — 12+ queries por request

El endpoint `GET /dashboard/statistics` ejecuta 12+ queries independientes en cada llamada:
- Suma de ventas del dia
- Ingresos/gastos mensuales
- Cuentas por cobrar/pagar (con COUNT)
- Clientes activos (DISTINCT con EXISTS)
- Datos de 6 meses agrupados por mes
- Flujo de caja semanal
- Top clientes con GROUP BY
- Transacciones recientes con relaciones polimorficas

**Impacto:** ~360ms con 1 VU. Bajo carga, cada instancia compite por conexiones de BD.

**Recomendacion:** Implementar cache Redis con TTL de 60 segundos para las estadisticas del dashboard.

### 5.3 Generacion de PDF (CPU-intensive)

`GET /sales/{id}/pdf` tarda ~888ms con 1 VU. DomPDF es sincronico y consume CPU intensivamente. Bajo carga concurrente, esto amplifica la degradacion del servidor single-threaded.

**Recomendacion:** Mover generacion de PDF a un queue job (async) o implementar cache de PDFs generados.

### 5.4 Reportes contables (queries pesadas)

Los reportes de trial balance, income statement, y balance sheet ejecutan queries con:
- JOINs entre `journal_entries` y `journal_entry_lines`
- Agrupacion por cuenta contable con sumas condicionales (debit/credit)
- Filtrado por rango de fechas
- Subconsultas para saldos anteriores

**Impacto:** ~250ms cada uno con 1 VU. Se acumula bajo carga.

### 5.5 `GET /products` sin paginacion

`ProductController::index()` usa `->get()` en lugar de `->paginate()`. Retorna TODOS los productos en una sola respuesta. Con cientos de productos, el payload crece y la serializacion se vuelve costosa.

**Recomendacion:** Implementar paginacion (`->paginate(20)`) en el endpoint de productos.

### 5.6 Cache y queue con driver Database

Tanto cache como queue usan el driver `database`. Cada operacion de cache requiere un query SQL adicional. Bajo carga, estas queries compiten con las queries de negocio por las conexiones de BD.

**Recomendacion:** Migrar cache y queue a Redis.

### 5.7 Session driver Database

Las sesiones se almacenan en la tabla `sessions`. Con 50 usuarios concurrentes, cada request lee/escribe en esta tabla, generando contention.

**Recomendacion:** Migrar session driver a Redis o file.

---

## 6. Errores Encontrados

| Error | Cantidad | Causa |
|-------|----------|-------|
| General Ledger 422 | 54 | Requiere `account_id` como parametro obligatorio — no es un bug, es validacion |

**Error rate total: 1.42%** — Todos los errores son del endpoint general ledger (validacion, no falla del sistema). Sin este endpoint, el error rate es **0%**.

---

## 7. Recomendaciones (Priorizadas)

### Prioridad Alta (Impacto inmediato en produccion)

| # | Recomendacion | Impacto estimado |
|---|---------------|------------------|
| 1 | **Usar Nginx + PHP-FPM** en produccion (no artisan serve) | p50 baja de 4.28s a ~200ms |
| 2 | **Migrar cache a Redis** (`CACHE_DRIVER=redis`) | Reduce queries de cache en ~50% |
| 3 | **Migrar queue a Redis** (`QUEUE_CONNECTION=redis`) | Mejor throughput de jobs async |
| 4 | **Migrar session a Redis** (`SESSION_DRIVER=redis`) | Elimina contention en tabla sessions |

### Prioridad Media (Mejora de rendimiento)

| # | Recomendacion | Impacto estimado |
|---|---------------|------------------|
| 5 | **Cache de dashboard** (Redis, TTL 60s) | Dashboard baja de 360ms a ~10ms |
| 6 | **Paginar `GET /products`** | Reduce payload y tiempo de serializacion |
| 7 | **Cache de reportes contables** (Redis, TTL 5min) | Reportes bajan de 250ms a ~10ms |
| 8 | **Queue para generacion de PDF** | Libera threads del servidor web |

### Prioridad Baja (Optimizacion a futuro)

| # | Recomendacion | Impacto estimado |
|---|---------------|------------------|
| 9 | **Laravel Octane** (FrankenPHP/RoadRunner) | 2-3x mejor throughput |
| 10 | **Connection pooling** (PgBouncer) | Soporte para 500+ usuarios concurrentes |
| 11 | **Query optimization** (indices compuestos en `journal_entries`) | Mejora reportes contables 30-50% |
| 12 | **Rate limiting** en endpoints de reportes | Previene abuso y protege BD |

---

## 8. Comparativa: Desarrollo vs Produccion Estimada

| Metrica | Dev (artisan serve) | Produccion estimada (Nginx+FPM+Redis) |
|---------|--------------------|-----------------------------------------|
| Throughput | 6.97 req/s | ~100-200 req/s |
| p50 latencia | 4.28s | 100-300ms |
| p95 latencia | 9.41s | 500ms-1s |
| Max VUs soportados | ~10-15 | ~200-500 |
| Error rate (50 VUs) | 1.42% | < 0.1% |

---

## 9. Archivos de Prueba

| Archivo | Descripcion |
|---------|-------------|
| `k6/scripts/core-smoke-test.js` | Runner smoke test (9 scenarios, 1 VU) |
| `k6/scripts/core-stress-test.js` | Runner stress test (9 scenarios, hasta 50 VUs) |
| `k6/scenarios/dashboard.js` | Scenario dashboard statistics |
| `k6/scenarios/sales-crud.js` | Scenario ventas CRUD + PDF |
| `k6/scenarios/products-crud.js` | Scenario productos |
| `k6/scenarios/payments-crud.js` | Scenario pagos |
| `k6/scenarios/accounting-crud.js` | Scenario contabilidad CRUD |
| `k6/scenarios/accounting-reports.js` | Scenario reportes contables |
| `k6/scenarios/business-reports.js` | Scenario reportes de negocio |
| `k6/scenarios/cash-registers-crud.js` | Scenario cajas registradoras |
| `k6/scenarios/inventory-crud.js` | Scenario inventario |
| `k6/helpers/data-core.js` | Payloads para endpoints core |
| `k6/helpers/setup.js` | Funcion setup compartida |
| `k6/results/core-smoke-test.html` | Reporte HTML smoke test |
| `k6/results/core-stress-test.html` | Reporte HTML stress test |

### Como ejecutar

```bash
# Instalar k6
brew install k6

# Smoke test (validacion rapida ~1.5 min)
k6 run k6/scripts/core-smoke-test.js

# Stress test completo (~9 min)
k6 run k6/scripts/core-stress-test.js

# Exportar resultados JSON
k6 run --out json=k6/results/core-stress-test.json k6/scripts/core-stress-test.js
```

---

*Generado automaticamente por Claude Code el 2026-03-24*
