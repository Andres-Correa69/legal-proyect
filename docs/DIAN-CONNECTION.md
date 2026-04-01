# Conexion DIAN via Proxy - Legal Sistema

## Arquitectura

Este proyecto NO se conecta directamente a la API DIAN. Todas las operaciones de facturacion electronica pasan por **Facturacion-Grupo-CP**, que actua como proxy/intermediario centralizado.

```
Legal Sistema          -->  Facturacion-Grupo-CP  -->  API DIAN
  (este proyecto)           (proxy centralizado)     (vetlogy API)
        |                          |
   X-API-Key header         Bearer Token DIAN
```

## Variables de Entorno

Agregar en `.env`:

```env
FACTURACION_API_URL=https://<dominio-facturacion>/api/external/v1
FACTURACION_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxx
```

- `FACTURACION_API_URL`: URL base del servidor Facturacion-Grupo-CP donde esta desplegado el proxy
- `FACTURACION_API_KEY`: API Key generada en Facturacion para autenticar este proyecto

## Obtener API Key

1. Acceder al servidor donde esta desplegado **Facturacion-Grupo-CP**
2. Ejecutar el comando Artisan:
   ```bash
   php artisan api-client:create "Legal Sistema"
   ```
3. Copiar el token generado (se muestra una sola vez)
4. Configurar en `.env` como `FACTURACION_API_KEY`

## Endpoints Disponibles

Todos los endpoints requieren header `X-API-Key` (manejado automaticamente por `ElectronicInvoicingService`).

### Catalogos
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/catalogs` | Obtener catalogos DIAN (tipos documento, organizaciones, regimenes, etc.) |

### Registro de Empresa
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/company/register` | Registrar empresa en DIAN |
| PUT | `/company/register` | Actualizar datos de empresa en DIAN |
| PUT | `/company/environment` | Configurar ambiente (pruebas/produccion) |

### Facturacion Electronica
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/invoice` | Enviar factura electronica |
| POST | `/invoice/send-raw` | Enviar factura (payload directo) |
| POST | `/credit-note` | Enviar nota credito |
| POST | `/debit-note` | Enviar nota debito |

### Email
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/email/send/{uuid}` | Enviar documento por correo |

### Eventos DIAN
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/event/receipt-acknowledgment` | Acuse de recibo (evento 030) |
| POST | `/event/goods-receipt` | Recibo del bien (evento 032) |
| POST | `/event/express-acceptance` | Aceptacion expresa (evento 033) |

### Documento Soporte
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/document-support` | Enviar documento soporte |
| POST | `/note-document-support` | Nota credito documento soporte |

### Facturacion POS
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/pos/invoice` | Enviar factura POS |
| POST | `/pos/credit-note` | Nota credito POS |

### Nomina Electronica
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/payroll` | Enviar nomina electronica |
| POST | `/payroll/annul` | Anular nomina electronica |

### Resoluciones
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/resolutions` | Consultar resoluciones DIAN |

### Logs de Documento
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/document-logs/{uuid}` | Obtener logs/payload original |

### Consultas de Estado
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/status/zip/{zipKey}` | Estado de procesamiento ZIP |
| POST | `/status/document/{uuid}` | Estado de documento |
| POST | `/status/document-information/{uuid}` | Informacion completa del documento |
| POST | `/status/number-range/{uuid}` | Estado de rango de numeracion |
| POST | `/status/xml/{uuid}` | Obtener XML del documento |
| POST | `/status/notes/{uuid}` | Notas vinculadas al documento |
| POST | `/status/events/{uuid}` | Eventos del documento |
| POST | `/status/acquirer` | Datos del adquirente |

## Formato de Peticiones

Todos los endpoints que envian documentos requieren `dian_token` en el body:

```json
{
    "dian_token": "token-de-la-sucursal",
    "invoice": {
        "number": 1,
        "sync": true,
        "type_document_id": 1,
        "customer": { ... },
        "invoice_lines": [ ... ],
        "legal_monetary_totals": { ... }
    }
}
```

El `dian_token` se obtiene del campo `electronic_invoicing_token` de la sucursal (Branch) cuando se registra en la DIAN.

## Prueba de Conexion

```bash
# Verificar que el proxy responde
curl -H "X-API-Key: sk_tu_api_key" \
  https://<dominio-facturacion>/api/external/v1/catalogs

# Respuesta esperada:
# { "success": true, "data": { "type_document_identifications": [...], ... } }
```

## Troubleshooting

1. **Error 401 Unauthorized**: Verificar que `FACTURACION_API_KEY` es correcto y que el ApiClient esta activo en Facturacion
2. **Error 502 Bad Gateway**: El servidor de Facturacion no esta disponible o la API DIAN esta caida
3. **Timeout**: Las operaciones DIAN pueden tardar hasta 60 segundos. Verificar conectividad de red
4. **Error 422**: Los datos enviados no cumplen validacion. Revisar el formato del payload
