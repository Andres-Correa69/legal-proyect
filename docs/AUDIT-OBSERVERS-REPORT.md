# Reporte de Observadores de Auditoría

## Resumen

El sistema de auditoría utiliza **Eloquent Observers** que extienden de `BaseObserver` para registrar automáticamente todas las operaciones CRUD (crear, actualizar, eliminar) en la tabla `activity_logs`. Cada vez que un usuario crea, modifica o elimina un registro, el observer correspondiente genera un log con:

- **Descripción** del evento en español
- **Tipo de evento**: `created`, `updated`, `deleted`
- **Usuario** que realizó la acción (causer)
- **Modelo afectado** (subject) con tipo y ID
- **Cambios realizados** (para updates, se guardan los campos modificados)
- **IP y User Agent** del usuario

Los logs son visibles para el Super Admin en `/admin/audit-logs`.

---

## Arquitectura

### BaseObserver (`app/Observers/BaseObserver.php`)
Clase abstracta que define la lógica común:
- `created()` → Registra creación del recurso
- `updated()` → Registra actualización (solo si hay cambios reales, ignora `updated_at`)
- `deleted()` → Registra eliminación
- `createActivityLog()` → Crea el registro en `activity_logs` con contexto del usuario

### ActivityLog Model (`app/Models/ActivityLog.php`)
- Relaciones polimórficas: `causer()` (quién) y `subject()` (qué)
- Campos: description, event, causer_type/id, subject_type/id, properties (JSON), ip_address, user_agent

### Registro (`app/Providers/AppServiceProvider.php`)
Todos los observers se registran en el método `boot()` del AppServiceProvider.

---

## Observers por Módulo

### Configuración y Usuarios

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| CompanyObserver | Company | `app/Observers/CompanyObserver.php` | Crear/Actualizar/Eliminar empresa |
| BranchObserver | Branch | `app/Observers/BranchObserver.php` | Crear/Actualizar/Eliminar sucursal |
| UserObserver | User | `app/Observers/UserObserver.php` | Crear/Actualizar/Eliminar usuario |
| RoleObserver | Role | `app/Observers/RoleObserver.php` | Crear/Actualizar/Eliminar rol |
| PaymentMethodObserver | PaymentMethod | `app/Observers/PaymentMethodObserver.php` | Crear/Actualizar/Eliminar método de pago |
| LocationObserver | Location | `app/Observers/LocationObserver.php` | Crear/Actualizar/Eliminar ubicación |
| AdjustmentReasonObserver | AdjustmentReason | `app/Observers/AdjustmentReasonObserver.php` | Crear/Actualizar/Eliminar motivo de ajuste |

### Inventario

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| ProductObserver | Product | `app/Observers/ProductObserver.php` | Crear/Actualizar/Eliminar producto + auto-compra |
| ServiceObserver | Service | `app/Observers/ServiceObserver.php` | Crear/Actualizar/Eliminar servicio |
| WarehouseObserver | Warehouse | `app/Observers/WarehouseObserver.php` | Crear/Actualizar/Eliminar bodega |
| SupplierObserver | Supplier | `app/Observers/SupplierObserver.php` | Crear/Actualizar/Eliminar proveedor |
| ProductCategoryObserver | ProductCategory | `app/Observers/ProductCategoryObserver.php` | Crear/Actualizar/Eliminar categoría |
| ProductAreaObserver | ProductArea | `app/Observers/ProductAreaObserver.php` | Crear/Actualizar/Eliminar área |
| ProductTypeObserver | ProductType | `app/Observers/ProductTypeObserver.php` | Crear/Actualizar/Eliminar tipo de producto |
| InventoryPurchaseObserver | InventoryPurchase | `app/Observers/InventoryPurchaseObserver.php` | Crear/Actualizar/Eliminar orden de compra |
| InventoryTransferObserver | InventoryTransfer | `app/Observers/InventoryTransferObserver.php` | Crear/Actualizar/Eliminar transferencia |
| InventoryAdjustmentObserver | InventoryAdjustment | `app/Observers/InventoryAdjustmentObserver.php` | Crear/Actualizar/Eliminar ajuste de inventario |

### Ventas y Cartera

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| SaleActivityObserver | Sale | `app/Observers/SaleActivityObserver.php` | Crear/Actualizar/Eliminar venta, cambio de estado, cambio de pago |
| PaymentObserver | Payment | `app/Observers/PaymentObserver.php` | Crear/Actualizar/Eliminar pago, cancelación |

### Cajas

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| CashRegisterObserver | CashRegister | `app/Observers/CashRegisterObserver.php` | Crear/Actualizar/Eliminar caja |
| CashRegisterSessionObserver | CashRegisterSession | `app/Observers/CashRegisterSessionObserver.php` | Abrir/Cerrar/Actualizar sesión de caja |
| CashRegisterTransferActivityObserver | CashRegisterTransfer | `app/Observers/CashRegisterTransferActivityObserver.php` | Crear/Cancelar transferencia entre cajas |

### Contabilidad

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| AccountingAccountObserver | AccountingAccount | `app/Observers/AccountingAccountObserver.php` | Crear/Actualizar/Eliminar cuenta contable |
| AccountingPeriodObserver | AccountingPeriod | `app/Observers/AccountingPeriodObserver.php` | Crear/Cerrar/Reabrir período contable |
| JournalEntryObserver | JournalEntry | `app/Observers/JournalEntryObserver.php` | Crear/Contabilizar/Anular asiento contable |

### Facturación Electrónica DIAN

| Observer | Modelo | Archivo | Eventos registrados |
|----------|--------|---------|---------------------|
| ElectronicInvoiceObserver | ElectronicInvoice | `app/Observers/ElectronicInvoiceObserver.php` | Emitir/Actualizar/Eliminar factura electrónica |
| ElectronicCreditNoteObserver | ElectronicCreditNote | `app/Observers/ElectronicCreditNoteObserver.php` | Emitir nota crédito (anulación/ajuste) |
| ElectronicDebitNoteObserver | ElectronicDebitNote | `app/Observers/ElectronicDebitNoteObserver.php` | Emitir nota débito |

### Observers Contables (Separados de auditoría)

Estos observers generan asientos contables automáticos, NO logs de auditoría:

| Observer | Modelo | Archivo | Función |
|----------|--------|---------|---------|
| AccountingSaleObserver | Sale | `app/Observers/AccountingSaleObserver.php` | Genera asientos al crear/anular ventas |
| AccountingPaymentObserver | Payment | `app/Observers/AccountingPaymentObserver.php` | Genera asientos al registrar pagos |
| AccountingCashTransferObserver | CashRegisterTransfer | `app/Observers/AccountingCashTransferObserver.php` | Genera asientos al transferir entre cajas |
| AccountingPurchaseObserver | InventoryPurchase | `app/Observers/AccountingPurchaseObserver.php` | Genera asientos al realizar compras |

---

## Resumen de Cobertura por Módulo

| Módulo | Modelos cubiertos | Estado |
|--------|-------------------|--------|
| Configuración | Company, Branch, User, Role, PaymentMethod, Location, AdjustmentReason | Completo |
| Inventario | Product, Service, Warehouse, Supplier, ProductCategory, ProductArea, ProductType, InventoryPurchase, InventoryTransfer, InventoryAdjustment | Completo |
| Ventas | Sale, Payment | Completo |
| Cartera | Payment | Completo |
| Cajas | CashRegister, CashRegisterSession, CashRegisterTransfer | Completo |
| Contabilidad | AccountingAccount, AccountingPeriod, JournalEntry | Completo |
| Facturación DIAN | ElectronicInvoice, ElectronicCreditNote, ElectronicDebitNote | Completo |

---

## Modelos Excluidos (No requieren auditoría)

Estos modelos no tienen observer porque son datos de referencia del sistema, registros hijos, o logs propios:

| Modelo | Razón de exclusión |
|--------|--------------------|
| ActivityLog | ES el propio log de auditoría |
| ExternalApiLog | ES el log de API externa |
| ApiClient | Configuración de sistema |
| Municipality | Datos de referencia (catálogos DIAN) |
| TypeDocumentIdentification | Datos de referencia |
| TypeLiability | Datos de referencia |
| TypeOrganization | Datos de referencia |
| TypeRegime | Datos de referencia |
| Permission | Permisos del sistema (no editables por usuario) |
| TrustedDevice | Sistema de autenticación 2FA |
| TwoFactorCode | Sistema de autenticación 2FA |
| SaleItem | Hijo de Sale (se audita con la venta) |
| SalePayment | Hijo de Sale (se audita con la venta) |
| InventoryPurchaseItem | Hijo de InventoryPurchase |
| InventoryTransferItem | Hijo de InventoryTransfer |
| JournalEntryLine | Hijo de JournalEntry |
| PaymentInstallment | Hijo de Payment |
| InventoryMovement | Generado automáticamente por el sistema |
| GoodsReceipt | Generado automáticamente |
| DocumentSupport | Datos de soporte DIAN |
| ReceiptAcknowledgment | Datos de acuse DIAN |

---

## Logging Adicional

### Middleware de API Externa (`app/Http/Middleware/LogExternalRequest.php`)
Registra todas las llamadas a la API de la DIAN en la tabla `external_api_logs`:
- Endpoint, método, acción
- Payload de request (sanitizado - sin tokens/contraseñas)
- Respuesta (status, éxito)
- Empresa, NIT, usuario
- IP, user agent, duración

Visible para Super Admin en `/admin/external-api-logs`.

---

## Total de Observers

- **28 observers de auditoría** (actividad de usuario)
- **4 observers contables** (asientos automáticos)
- **1 middleware** de logging de API externa
- **32 modelos cubiertos** en total
