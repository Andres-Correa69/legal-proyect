# API Externa DIAN - Documentación Completa

## ¿Qué es esto?

El proyecto **Facturacion-Grupo-CP** ahora expone endpoints públicos que funcionan como **puente/proxy** hacia la API de la DIAN (facturación electrónica colombiana).

Otros proyectos del grupo (Zyscore, VetDash, etc.) pueden consumir estos endpoints para:
- Consultar catálogos DIAN
- Registrar empresas ante la DIAN
- Configurar ambiente DIAN (pruebas/producción)
- Actualizar datos de empresas registradas
- Enviar facturas electrónicas
- Enviar notas crédito
- Enviar notas débito

**Este proyecto NO guarda datos del proyecto externo.** Solo actúa como intermediario. Las ventas, facturas, PDFs, tokens DIAN — todo se almacena en la base de datos del proyecto que consume la API.

---

## Estado actual

### Funcional
- Migración ejecutada (tabla `api_clients` creada)
- 8 endpoints registrados y funcionando
- Middleware de autenticación por API key
- Rate limiting (60 peticiones/minuto por API key)
- Comando artisan para crear clientes API
- Colección de Postman lista para importar

### Qué falta para producción
- Configurar HTTPS en el servidor donde corre este proyecto
- Crear API keys para cada proyecto real (`php artisan api-client:create "Zyscore"`)
- Configurar la URL de este proyecto como variable de entorno en los proyectos externos

---

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌───────────┐
│   Proyecto Externo   │     │  Facturación-Grupo-CP     │     │  API DIAN  │
│   (Zyscore, etc.)    │────▶│  (Proxy)                  │────▶│  (Externa) │
│                      │     │                            │     │            │
│  Guarda en SU BD:    │◀────│  Solo valida API key       │◀────│  Responde  │
│  - Token DIAN        │     │  y reenvía la petición     │     │  con datos │
│  - PDF factura       │     │                            │     │            │
│  - UUID factura      │     │  Guarda log de auditoría   │     │            │
│  - XML factura       │     │  (tabla external_api_logs) │     │            │
│  - Datos empresa     │     │                            │     │            │
└─────────────────────┘     └──────────────────────────┘     └───────────┘
```

---

## Autenticación

Todas las peticiones requieren el header:

```
X-API-Key: sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Crear un cliente API

Desde el servidor de Facturación-Grupo-CP:

```bash
php artisan api-client:create "NombreDelProyecto"
```

Esto genera un token que se muestra **una sola vez**. Guárdalo como variable de entorno en el proyecto externo.

### Respuestas de error de autenticación

**Sin header X-API-Key:**
```json
// HTTP 401
{
    "success": false,
    "message": "API key requerida. Envíe el header X-API-Key."
}
```

**API key inválida:**
```json
// HTTP 401
{
    "success": false,
    "message": "API key inválida."
}
```

**Cliente desactivado:**
```json
// HTTP 403
{
    "success": false,
    "message": "Cliente API desactivado."
}
```

---

## Headers de Contexto (Opcionales)

Además del `X-API-Key`, se pueden enviar headers opcionales para identificar la empresa y el usuario que hace la petición. Estos datos quedan registrados en la auditoría del sistema.

```
X-Company-Name: Mi Empresa S.A.S
X-Company-NIT: 900123456
X-User-Name: Juan Pérez
X-User-Email: admin@miempresa.com
```

| Header | Requerido | Descripción |
|--------|-----------|-------------|
| `X-Company-Name` | NO | Nombre de la empresa que hace la petición |
| `X-Company-NIT` | NO | NIT de la empresa |
| `X-User-Name` | NO | Nombre del usuario que disparó la acción |
| `X-User-Email` | NO | Email del usuario |

**Si no se envían**, la auditoría igual registra la petición pero sin datos de empresa/usuario. Se recomienda enviarlos para tener mejor trazabilidad.

---

## Endpoints

Base URL: `https://tu-dominio.com/api/external/v1`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/catalogs` | Catálogos DIAN |
| POST | `/company/register` | Registrar empresa en DIAN |
| PUT | `/company/register` | Actualizar empresa en DIAN |
| PUT | `/company/environment` | Configurar ambiente (pruebas/producción) |
| POST | `/invoice` | Enviar factura (con wrapper) |
| POST | `/invoice/send-raw` | Enviar factura (payload directo) |
| POST | `/credit-note` | Enviar nota crédito |
| POST | `/debit-note` | Enviar nota débito |

---

### 1. GET `/catalogs`

Obtiene los catálogos de la DIAN. Estos datos son necesarios para llenar los formularios de registro de empresa y para armar facturas.

**Request:**
```
GET /api/external/v1/catalogs
X-API-Key: sk_tu_api_key
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "type_document_identifications": [
            { "id": 1, "name": "Registro civil", "code": "11" },
            { "id": 2, "name": "Tarjeta de identidad", "code": "12" },
            { "id": 3, "name": "Cédula de ciudadanía", "code": "13" },
            { "id": 6, "name": "NIT", "code": "31" }
        ],
        "type_organizations": [
            { "id": 1, "name": "Persona Jurídica", "code": "1" },
            { "id": 2, "name": "Persona Natural", "code": "2" }
        ],
        "type_regimes": [
            { "id": 1, "name": "Responsable de IVA", "code": "48" },
            { "id": 2, "name": "No responsable de IVA", "code": "49" }
        ],
        "type_liabilities": [
            { "id": 1, "name": "Gran contribuyente", "code": "O-13" },
            { "id": 7, "name": "No responsable", "code": "R-99-PN" }
        ],
        "municipalities": [
            { "id": 1, "name": "Bogotá D.C.", "code": "11001" }
        ]
    }
}
```

**¿Qué hacer con esto en el otro proyecto?**
Guardar estos catálogos en tu base de datos local para usarlos en selects/dropdowns de los formularios. Puedes sincronizarlos periódicamente (1 vez al día o al iniciar la app).

---

### 2. POST `/company/register`

Registra una empresa ante la DIAN por primera vez.

**Request:**
```
POST /api/external/v1/company/register
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "token_que_ya_tienes_de_la_dian",
    "tax_id": "900123456",
    "type_document_identification_id": 6,
    "type_organization_id": 1,
    "type_regime_id": 1,
    "type_liability_id": 7,
    "business_name": "Mi Empresa S.A.S",
    "merchant_registration": "123456",
    "municipality_id": 1,
    "address": "Calle 123 #45-67",
    "phone": "3001234567",
    "email": "facturacion@miempresa.com"
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `dian_token` | string | SI | Token Bearer para autenticarse en la API DIAN |
| `tax_id` | string | SI | NIT de la empresa (max 20 caracteres) |
| `type_document_identification_id` | integer | SI | Del catálogo `type_document_identifications` |
| `type_organization_id` | integer | SI | Del catálogo `type_organizations` |
| `type_regime_id` | integer | SI | Del catálogo `type_regimes` |
| `type_liability_id` | integer | SI | Del catálogo `type_liabilities` |
| `business_name` | string | SI | Razón social (max 255) |
| `merchant_registration` | string | SI | Matrícula mercantil (max 255) |
| `municipality_id` | integer | SI | Del catálogo `municipalities` |
| `address` | string | SI | Dirección (max 255) |
| `phone` | string | SI | Teléfono (max 50) |
| `email` | string | SI | Email válido (max 255) |

**Response exitosa (200):**
```json
{
    "success": true,
    "message": "Empresa registrada exitosamente en la DIAN",
    "data": {
        "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
        "company": {
            "id": 1,
            "identification_number": "900123456",
            "name": "Mi Empresa S.A.S"
        }
    }
}
```

**IMPORTANTE:** Si la respuesta incluye un `token` nuevo en `data.token`, el proyecto externo DEBE guardarlo. Ese token es necesario para todas las operaciones posteriores (actualizar empresa, enviar facturas).

**Response error (400):**
```json
{
    "success": false,
    "message": "Error al registrar en la DIAN",
    "errors": { ... }
}
```

---

### 3. PUT `/company/register`

Actualiza datos de una empresa ya registrada. El NIT y tipo de documento NO se pueden cambiar.

**Request:**
```
PUT /api/external/v1/company/register
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "type_organization_id": 1,
    "type_regime_id": 1,
    "type_liability_id": 7,
    "business_name": "Mi Empresa S.A.S - Nombre Actualizado",
    "merchant_registration": "123456",
    "municipality_id": 1,
    "address": "Nueva Dirección #100-20",
    "phone": "3009876543",
    "email": "nuevo@miempresa.com"
}
```

**Campos:** Mismos que registro EXCEPTO `tax_id` y `type_document_identification_id` (no se envían).

**Response:** Misma estructura que el registro.

---

### 4. PUT `/company/environment`

Configura el ambiente DIAN (pruebas o producción) con el certificado digital. Se usa después de registrar la empresa y ANTES de enviar facturas.

**Request:**
```
PUT /api/external/v1/company/environment
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "type_environment_id": 2,
    "software_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "pin": "12345",
    "certificate": "base64_del_certificado_digital...",
    "certificate_password": "password_del_certificado"
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `dian_token` | string | SI | Token DIAN de la empresa |
| `type_environment_id` | integer | SI | `1` = Producción, `2` = Pruebas |
| `software_id` | string | SI | ID del software registrado en DIAN |
| `pin` | string | SI | PIN del software |
| `certificate` | string | SI | Certificado digital codificado en base64 |
| `certificate_password` | string | SI | Contraseña del certificado |

**Response exitosa (200):**
```json
{
    "success": true,
    "message": "Ambiente DIAN configurado exitosamente",
    "data": {
        "success": true,
        "message": "Ambiente configurado exitosamente"
    }
}
```

**El proyecto externo debe guardar** `type_environment_id`, `software_id`, `pin`, `certificate` y `certificate_password` en su BD para poder reconfigurar si es necesario.

---

### 5. POST `/invoice`

Envía una factura electrónica a la DIAN. El payload de la factura va dentro del campo `invoice`.

**Request:**
```
POST /api/external/v1/invoice
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "test_uuid": null,
    "invoice": {
        "number": 1,
        "sync": true,
        "environment": {
            "type_environment_id": 2
        },
        "type_document_id": 1,
        "customer": {
            "identification_number": "123456789",
            "name": "Cliente Ejemplo S.A.S",
            "email": "cliente@ejemplo.com",
            "type_document_identification_id": 6,
            "type_organization_id": 1,
            "type_regime_id": 1,
            "type_liabilitie_id": 7,
            "phone": "3001234567",
            "address": "Calle 100 #15-20"
        },
        "date": "2026-02-10",
        "legal_monetary_totals": {
            "line_extension_amount": "100000.00",
            "tax_exclusive_amount": "100000.00",
            "tax_inclusive_amount": "119000.00",
            "allowance_total_amount": "0.00",
            "charge_total_amount": "0.00",
            "payable_amount": "119000.00"
        },
        "invoice_lines": [
            {
                "unit_measure_id": 642,
                "invoiced_quantity": "2.000000",
                "line_extension_amount": "100000.00",
                "free_of_charge_indicator": false,
                "tax_totals": [
                    {
                        "tax_id": 1,
                        "tax_amount": "19000.00",
                        "taxable_amount": "100000.00",
                        "percent": "19.00"
                    }
                ],
                "description": "Consulta veterinaria",
                "code": "SRV-001",
                "type_item_identification_id": 4,
                "price_amount": "50000.00",
                "base_quantity": "1.000000"
            }
        ],
        "payment_forms": [
            {
                "payment_form_id": 1,
                "payment_method_id": 10
            }
        ],
        "resolution_id": 12345
    }
}
```

**Campos del request principal:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `dian_token` | string | SI | Token DIAN de la empresa |
| `test_uuid` | string | NO | UUID para ambiente de pruebas DIAN |
| `invoice` | object | SI | Objeto completo de la factura |

**Campos de `invoice`:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `number` | integer | SI | Consecutivo de la factura |
| `sync` | boolean | SI | `true` para procesamiento síncrono |
| `environment.type_environment_id` | integer | NO | `1` = producción, `2` = pruebas |
| `type_document_id` | integer | SI | `1` = factura de venta |
| `customer` | object | SI | Datos del cliente |
| `date` | string | SI | Fecha formato `YYYY-MM-DD` |
| `legal_monetary_totals` | object | SI | Totales monetarios |
| `invoice_lines` | array | SI | Items de la factura (mínimo 1) |
| `payment_forms` | array | NO | Formas de pago |
| `resolution_id` | integer | NO | ID resolución DIAN (solo producción) |

**Campos de `customer`:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identification_number` | string | SI | Documento del cliente |
| `name` | string | SI | Nombre o razón social |
| `email` | string | SI | Email del cliente |
| `type_document_identification_id` | integer | SI | Tipo de documento (del catálogo) |
| `type_organization_id` | integer | SI | Tipo organización (del catálogo) |
| `type_regime_id` | integer | SI | Régimen fiscal (del catálogo) |
| `type_liabilitie_id` | integer | SI | Responsabilidad fiscal (del catálogo). **OJO:** typo "ie" es de la API DIAN |
| `phone` | string | NO | Teléfono |
| `address` | string | NO | Dirección |

**Campos de cada item en `invoice_lines`:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `unit_measure_id` | integer | Unidad de medida. `642` = unidad |
| `invoiced_quantity` | string | Cantidad. **6 decimales:** `"2.000000"` |
| `line_extension_amount` | string | Subtotal línea. **2 decimales:** `"100000.00"` |
| `free_of_charge_indicator` | boolean | `false` normalmente |
| `tax_totals` | array | Impuestos de esta línea |
| `tax_totals[].tax_id` | integer | `1` = IVA |
| `tax_totals[].tax_amount` | string | Monto impuesto. **2 decimales** |
| `tax_totals[].taxable_amount` | string | Base gravable. **2 decimales** |
| `tax_totals[].percent` | string | Porcentaje. **2 decimales:** `"19.00"` |
| `description` | string | Descripción del producto/servicio |
| `code` | string | Código interno del item |
| `type_item_identification_id` | integer | `4` = estándar |
| `price_amount` | string | Precio unitario. **2 decimales** |
| `base_quantity` | string | Cantidad base. `"1.000000"` |
| `allowance_charges` | array | Descuentos (opcional) |

**Campos de `allowance_charges` (solo si hay descuento):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `charge_indicator` | boolean | `false` = descuento |
| `allowance_charge_reason` | string | `"Descuento"` |
| `amount` | string | Monto del descuento. **2 decimales** |
| `base_amount` | string | Base sobre la que se aplica. **2 decimales** |

**Campos de `legal_monetary_totals`:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `line_extension_amount` | string | Suma subtotales de líneas |
| `tax_exclusive_amount` | string | Total sin impuestos |
| `tax_inclusive_amount` | string | Total con impuestos |
| `allowance_total_amount` | string | Total descuentos |
| `charge_total_amount` | string | Total cargos (usualmente `"0.00"`) |
| `payable_amount` | string | Total a pagar |

**REGLA DE FORMATO:** Todos los montos son **strings con 2 decimales** (`"100000.00"`). Todas las cantidades son **strings con 6 decimales** (`"2.000000"`).

**Response exitosa (200):**
```json
{
    "success": true,
    "is_valid": true,
    "message": "Factura electrónica enviada exitosamente a la DIAN",
    "data": {
        "is_valid": true,
        "number": "SETP1",
        "uuid": "abc123-def456-ghi789",
        "issue_date": "2026-02-10",
        "status_description": "Procesado Correctamente",
        "status_message": "Factura aprobada por la DIAN",
        "qr_link": "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=abc123",
        "xml_base64_bytes": "PD94bWwgdmVyc2lvbj0iMS4wIi...",
        "pdf_base64_bytes": "JVBERi0xLjQKJeLjz9MKMSAwIG...",
        "xml_name": "fv_abc123.xml",
        "zip_name": "z_abc123.zip"
    }
}
```

**Response error DIAN (422):**
```json
{
    "success": false,
    "is_valid": false,
    "message": "Error enviando factura a la DIAN",
    "errors_messages": [
        "El campo customer.identification_number es requerido",
        "El número de factura ya fue utilizado"
    ],
    "errors": {}
}
```

---

### 6. POST `/invoice/send-raw`

Igual que `/invoice` pero SIN el wrapper `invoice`. Todo el body (excepto `dian_token` y `test_uuid`) se envía directo como payload a la API DIAN.

Útil si el proyecto externo ya construye el JSON DIAN por su cuenta.

**Request:**
```
POST /api/external/v1/invoice/send-raw
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "test_uuid": null,
    "number": 1,
    "sync": true,
    "environment": { "type_environment_id": 2 },
    "type_document_id": 1,
    "customer": { ... },
    "date": "2026-02-10",
    "legal_monetary_totals": { ... },
    "invoice_lines": [ ... ],
    "payment_forms": [ ... ]
}
```

**Response:** Idéntica a `/invoice`.

---

### 7. POST `/credit-note`

Envía una nota crédito a la DIAN. Anula total o parcialmente una factura existente.

**Request:**
```
POST /api/external/v1/credit-note
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "test_uuid": null,
    "credit_note": {
        "number": 1,
        "type_document_id": 5,
        "billing_reference": {
            "number": "SETP1",
            "uuid": "uuid-de-la-factura-original",
            "issue_date": "2026-02-10"
        },
        "discrepancy_response": {
            "correction_concept_id": 2
        },
        "customer": {
            "identification_number": "123456789",
            "name": "Cliente Ejemplo S.A.S",
            "email": "cliente@ejemplo.com",
            "type_document_identification_id": 6,
            "type_organization_id": 1,
            "type_regime_id": 1,
            "type_liabilitie_id": 7
        },
        "legal_monetary_totals": {
            "line_extension_amount": "50000.00",
            "tax_exclusive_amount": "50000.00",
            "tax_inclusive_amount": "59500.00",
            "allowance_total_amount": "0.00",
            "charge_total_amount": "0.00",
            "payable_amount": "59500.00"
        },
        "credit_note_lines": [
            {
                "unit_measure_id": 642,
                "invoiced_quantity": "1.000000",
                "line_extension_amount": "50000.00",
                "free_of_charge_indicator": false,
                "tax_totals": [
                    {
                        "tax_id": 1,
                        "tax_amount": "9500.00",
                        "taxable_amount": "50000.00",
                        "percent": "19.00"
                    }
                ],
                "description": "Devolución consulta veterinaria",
                "code": "SRV-001",
                "type_item_identification_id": 4,
                "price_amount": "50000.00",
                "base_quantity": "1.000000"
            }
        ]
    }
}
```

**Diferencias clave con factura:**

| Campo | Valor | Descripción |
|-------|-------|-------------|
| `type_document_id` | `5` | Siempre 5 para nota crédito |
| `billing_reference` | objeto | Referencia a la factura que se anula |
| `billing_reference.number` | string | Número de la factura original |
| `billing_reference.uuid` | string | UUID de la factura original |
| `billing_reference.issue_date` | string | Fecha de la factura original (YYYY-MM-DD) |
| `discrepancy_response.correction_concept_id` | integer | Motivo de corrección |
| `credit_note_lines` | array | Items (NO `invoice_lines`) |
| `legal_monetary_totals` | objeto | Totales de la nota crédito |

**Conceptos de corrección (`correction_concept_id`):**

| ID | Descripción |
|----|-------------|
| 1 | Devolución parcial de bienes/servicios |
| 2 | Anulación de factura |
| 3 | Rebaja o bonificación |
| 4 | Ajuste de precio |
| 5 | Otros |

**Response exitosa (200):** Misma estructura que factura (`uuid`, `pdf_base64_bytes`, `xml_base64_bytes`, etc.)

---

### 8. POST `/debit-note`

Envía una nota débito a la DIAN. Agrega un cargo adicional a una factura existente.

**Request:**
```
POST /api/external/v1/debit-note
X-API-Key: sk_tu_api_key
Content-Type: application/json
```

```json
{
    "dian_token": "eyJ0eXAiOiJKV1Qi...",
    "test_uuid": null,
    "debit_note": {
        "number": 1,
        "type_document_id": 6,
        "billing_reference": {
            "number": "SETP2",
            "uuid": "uuid-de-la-factura-original",
            "issue_date": "2026-02-10"
        },
        "discrepancy_response": {
            "correction_concept_id": 10
        },
        "customer": {
            "identification_number": "123456789",
            "name": "Cliente Ejemplo S.A.S",
            "email": "cliente@ejemplo.com",
            "type_document_identification_id": 6,
            "type_organization_id": 1,
            "type_regime_id": 1,
            "type_liabilitie_id": 7
        },
        "requested_monetary_totals": {
            "line_extension_amount": "25000.00",
            "tax_exclusive_amount": "25000.00",
            "tax_inclusive_amount": "29750.00",
            "allowance_total_amount": "0.00",
            "charge_total_amount": "0.00",
            "payable_amount": "29750.00"
        },
        "debit_note_lines": [
            {
                "unit_measure_id": 642,
                "invoiced_quantity": "1.000000",
                "line_extension_amount": "25000.00",
                "free_of_charge_indicator": false,
                "tax_totals": [
                    {
                        "tax_id": 1,
                        "tax_amount": "4750.00",
                        "taxable_amount": "25000.00",
                        "percent": "19.00"
                    }
                ],
                "description": "Cargo adicional por servicio especial",
                "code": "SRV-002",
                "type_item_identification_id": 4,
                "price_amount": "25000.00",
                "base_quantity": "1.000000"
            }
        ]
    }
}
```

**Diferencias con nota crédito:**

| Campo | Nota Crédito | Nota Débito |
|-------|-------------|-------------|
| `type_document_id` | `5` | `6` |
| Items | `credit_note_lines` | `debit_note_lines` |
| Totales | `legal_monetary_totals` | `requested_monetary_totals` |
| Corrección típica | `2` (anulación) | `10` (intereses) |

**Conceptos de corrección para nota débito:**

| ID | Descripción |
|----|-------------|
| 10 | Intereses |
| 11 | Gastos por cobrar |
| 12 | Cambio del valor |
| 13 | Otros |

**Response exitosa (200):** Misma estructura que factura (`uuid`, `pdf_base64_bytes`, `xml_base64_bytes`, etc.)

---

## Qué hacer en el proyecto externo (Zyscore)

### Paso 1: Configurar variable de entorno

En el `.env` del proyecto externo:

```env
DIAN_PROXY_URL=https://facturacion.tudominio.com/api/external/v1
DIAN_PROXY_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 2: Crear servicio HTTP

Crear un servicio/clase que haga las peticiones HTTP a este proxy. Ejemplo conceptual:

```
DianProxyService
├── getCatalogs()           → GET  /catalogs
├── registerCompany(data)   → POST /company/register
├── updateCompany(data)     → PUT  /company/register
├── setEnvironment(data)    → PUT  /company/environment
├── sendInvoice(data)       → POST /invoice
├── sendCreditNote(data)    → POST /credit-note
└── sendDebitNote(data)     → POST /debit-note
```

Cada método debe:
1. Agregar el header `X-API-Key` con el token del `.env`
2. Enviar el JSON correspondiente
3. Procesar la respuesta
4. Guardar los datos relevantes en la base de datos LOCAL del proyecto externo

### Paso 3: Tablas necesarias en el proyecto externo

El proyecto externo necesita almacenar los datos que este proxy devuelve. Tablas sugeridas:

**`dian_catalogs` (o tablas separadas por catálogo):**
```
- id, type (document_identification, organization, regime, liability, municipality)
- external_id, name, code
```

**`dian_company_config` (configuración DIAN de la empresa):**
```
- id, company_id (o branch_id)
- dian_token (el token que devuelve la DIAN al registrar)
- tax_id, business_name, address, phone, email
- type_document_identification_id, type_organization_id
- type_regime_id, type_liability_id, municipality_id
- merchant_registration
- is_registered (boolean)
- registered_at (timestamp)
- resolution_id, prefix, consecutive_start, consecutive_end
- current_consecutive
```

**`electronic_invoices` (facturas electrónicas):**
```
- id, sale_id (referencia a la venta local)
- number (consecutivo DIAN)
- uuid (identificador único DIAN)
- issue_date, status_description, status_message
- qr_link
- xml_base64_bytes, pdf_base64_bytes
- xml_name, zip_name
- payload (JSON completo de la respuesta)
- created_at
```

### Paso 4: Flujo de integración

```
1. AL INICIAR LA APP (o periódicamente):
   GET /catalogs → guardar catálogos en BD local

2. CONFIGURACIÓN INICIAL (una vez por empresa):
   POST /company/register → guardar dian_token en BD local
   PUT /company/environment → configurar certificado digital

3. AL FACTURAR (cada vez que se genera una factura):
   a. Obtener dian_token de la BD local
   b. Obtener siguiente consecutivo de la BD local
   c. Construir el JSON de la factura con los datos de la venta
   d. POST /invoice → enviar al proxy
   e. Guardar uuid, pdf, xml, qr_link en la BD local
   f. Incrementar consecutivo en la BD local

4. AL ANULAR UNA FACTURA (nota crédito):
   a. Obtener datos de la factura original (number, uuid, issue_date)
   b. POST /credit-note → con billing_reference apuntando a la factura
   c. Guardar uuid, pdf, xml de la nota crédito en la BD local

5. AL AGREGAR CARGO A UNA FACTURA (nota débito):
   a. Obtener datos de la factura original (number, uuid, issue_date)
   b. POST /debit-note → con billing_reference apuntando a la factura
   c. Guardar uuid, pdf, xml de la nota débito en la BD local
```

### Paso 5: Manejo de errores

| HTTP Status | Significado | Qué hacer |
|-------------|-------------|-----------|
| 200 | Éxito | Guardar respuesta en BD local |
| 400 | Error datos empresa | Revisar datos enviados |
| 401 | API key inválida | Verificar el header X-API-Key |
| 403 | Cliente desactivado | Contactar admin del sistema de facturación |
| 422 | Error validación DIAN | Revisar `errors_messages` para corregir el JSON |
| 429 | Rate limit excedido | Esperar y reintentar (max 60 req/min) |
| 502 | API DIAN no disponible | Reintentar más tarde |

---

## Archivos del proyecto (referencia)

Todos los archivos de la API externa están separados del código existente:

```
Facturacion-Grupo-CP/
├── app/
│   ├── Console/Commands/
│   │   └── CreateApiClient.php          ← Comando artisan
│   ├── Http/
│   │   ├── Controllers/External/
│   │   │   └── DianProxyController.php  ← Controlador proxy
│   │   └── Middleware/
│   │       └── ValidateApiClient.php    ← Middleware auth
│   └── Models/
│       └── ApiClient.php                ← Modelo
├── database/migrations/
│   └── 2026_02_10_000001_create_api_clients_table.php
├── routes/
│   └── external-api.php                 ← Rutas externas
├── bootstrap/
│   └── app.php                          ← (modificado: registra rutas + middleware)
├── app/Providers/
│   └── AppServiceProvider.php           ← (modificado: rate limiter)
└── docs/
    ├── API_EXTERNA_DIAN.md              ← Esta documentación
    └── DIAN_Proxy_API.postman_collection.json ← Colección Postman
```

## Colección Postman

Importar el archivo `docs/DIAN_Proxy_API.postman_collection.json` en Postman.

Después de importar, configurar las variables de la colección:

| Variable | Valor |
|----------|-------|
| `base_url` | `http://localhost:8000` (o la URL del servidor) |
| `api_key` | El token generado con `php artisan api-client:create` |
| `dian_token` | El token DIAN (cuando lo tengas) |

---

## Comandos útiles

```bash
# Crear un nuevo cliente API
php artisan api-client:create "NombreProyecto"

# Ver rutas externas registradas
php artisan route:list --path=api/external

# Ejecutar migración (si no se ha ejecutado)
php artisan migrate
```
