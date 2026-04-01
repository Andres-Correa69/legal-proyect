# Pruebas de Rendimiento con k6

Suite de pruebas de estrés, carga y rendimiento para las APIs de facturación electrónica y nómina.

## Prerrequisitos

### Instalar k6

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**
```bash
brew install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `K6_BASE_URL` | URL base de la API | `http://localhost:8000/api` |
| `K6_USER_EMAIL` | Email del usuario de prueba | `admin@test.com` |
| `K6_USER_PASSWORD` | Password del usuario de prueba | `password` |
| `K6_INVOICE_ID` | ID de factura existente (para notas crédito/débito) | `1` |
| `K6_PURCHASE_ID` | ID de compra existente (para eventos de compra) | `1` |
| `K6_EMPLOYEE_USER_ID` | ID de usuario empleado (para nómina) | `2` |

### Configurar variables:

```bash
export K6_BASE_URL=http://localhost:8000/api
export K6_USER_EMAIL=admin@empresa.com
export K6_USER_PASSWORD=mi_password
```

## Tipos de Pruebas

### 1. Smoke Test (Validación rápida)
Verifica que todos los endpoints responden correctamente. 1 VU, 1 iteración.

```bash
k6 run k6/scripts/smoke-test.js
```

### 2. Load Test (Carga normal)
Simula carga sostenida con 50 usuarios concurrentes durante 5 minutos.

```bash
k6 run k6/scripts/load-test.js
```

### 3. Stress Test (Estrés progresivo)
Incrementa la carga progresivamente (50→100→200 VUs) para encontrar el punto de quiebre.

```bash
k6 run k6/scripts/stress-test.js
```

### 4. Spike Test (Pico súbito)
Simula un pico de 300 VUs para evaluar la recuperación del sistema.

```bash
k6 run k6/scripts/spike-test.js
```

## Ejecutar un Scenario Individual

Para probar un módulo específico:

```bash
k6 run k6/scenarios/invoicing.js
k6 run k6/scenarios/payroll.js
k6 run k6/scenarios/payroll-ranges.js
k6 run k6/scenarios/credit-debit-notes.js
k6 run k6/scenarios/purchase-events.js
k6 run k6/scenarios/config-registration.js
```

Con VUs personalizados:

```bash
k6 run --vus 10 --duration 30s k6/scenarios/invoicing.js
```

## Exportar Resultados

### JSON:
```bash
k6 run --out json=results/load-test.json k6/scripts/load-test.js
```

### CSV:
```bash
k6 run --out csv=results/load-test.csv k6/scripts/load-test.js
```

### Crear directorio de resultados:
```bash
mkdir -p results
```

## Leer los Resultados

k6 muestra un resumen al final de cada ejecución:

```
     ✓ login status 200
     ✓ factura status 200
     ✓ pdf status 200

     checks.........................: 100.00% ✓ 150  ✗ 0
     http_req_duration..............: avg=120ms min=15ms med=95ms max=890ms p(90)=250ms p(95)=350ms
     http_req_failed................: 0.00%   ✓ 0    ✗ 450
     http_reqs......................: 450     75/s
     vus............................: 50      min=1  max=50
```

**Métricas clave:**
- **p(95)**: El 95% de las requests tardaron menos de este tiempo
- **p(99)**: El 99% de las requests tardaron menos de este tiempo
- **http_req_failed**: Porcentaje de requests con error (4xx, 5xx)
- **http_reqs rate**: Requests por segundo (throughput)
- **checks**: Porcentaje de verificaciones exitosas

## Umbrales de Aprobación

| Métrica | Smoke | Load | Stress | Spike |
|---------|-------|------|--------|-------|
| p(95) | < 2s | < 500ms | < 2s | < 5s |
| p(99) | - | < 1.5s | < 5s | < 10s |
| Error rate | < 5% | < 1% | < 5% | < 10% |
| Throughput | - | > 10 req/s | - | - |

## Estructura del Proyecto

```
k6/
├── config/
│   └── thresholds.js          # Umbrales de rendimiento compartidos
├── helpers/
│   ├── auth.js                # Login y gestión de tokens
│   └── data.js                # Payloads de ejemplo reutilizables
├── scripts/
│   ├── smoke-test.js          # 1 VU, validación básica
│   ├── load-test.js           # 50 VUs, 5 min sostenidos
│   ├── stress-test.js         # 200 VUs, rampas progresivas
│   └── spike-test.js          # 300 VUs, pico súbito
├── scenarios/
│   ├── invoicing.js           # Facturación electrónica
│   ├── credit-debit-notes.js  # Notas crédito/débito
│   ├── payroll.js             # Nómina electrónica
│   ├── payroll-ranges.js      # Rangos de numeración
│   ├── purchase-events.js     # Eventos de compra
│   └── config-registration.js # Configuración y registro DIAN
└── README.md
```

## Scenarios Cubiertos

| Scenario | Endpoints | Descripción |
|----------|-----------|-------------|
| invoicing | 5 | Login → factura → PDF → email |
| credit-debit-notes | 7 | Nota crédito + débito con PDF y email |
| payroll | 12 | Lote → empleado → devengos → enviar → anular |
| payroll-ranges | 5 | CRUD completo de rangos numeración |
| purchase-events | 12 | Acuse recibo + recepción bienes + doc soporte |
| config-registration | 7 | Registro DIAN + config + habilitación |

## Docker (Opcional)

```bash
docker run --rm -i \
  -e K6_BASE_URL=http://host.docker.internal:8000/api \
  -e K6_USER_EMAIL=admin@test.com \
  -e K6_USER_PASSWORD=password \
  -v $(pwd)/k6:/scripts \
  grafana/k6 run /scripts/scripts/smoke-test.js
```

## Integración con Grafana (Opcional)

Para visualizar resultados en tiempo real con Grafana + InfluxDB:

```bash
k6 run --out influxdb=http://localhost:8086/k6 k6/scripts/load-test.js
```

Consultar la [documentación oficial](https://grafana.com/docs/k6/latest/results-output/real-time/) para configurar el dashboard.
