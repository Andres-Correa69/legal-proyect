# Guia de Pruebas - Sistema de Cuentas Contables

## Prerequisitos

### Migraciones y Seeders

```bash
php artisan migrate
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=PucSeeder
```

### Importar PUC Completo (Opcional)

Si se dispone del archivo Excel con el PUC completo de la empresa, se puede importar con:

```bash
# Simular primero sin insertar (dry-run)
php artisan puc:import "PUC LIMPIO.xlsx" --dry-run

# Importar para todas las empresas
php artisan puc:import "PUC LIMPIO.xlsx"

# Importar solo para una empresa especifica
php artisan puc:import "PUC LIMPIO.xlsx" --company=1
```

El comando:
- Crea ~1,000+ cuentas por empresa desde el Excel
- Preserva cuentas existentes del PucSeeder (no las elimina ni duplica)
- Deriva automaticamente tipo, naturaleza, nivel y jerarquia del codigo
- Detecta y advierte si cuentas usadas por los observers se convirtieron en cuentas padre
- Es idempotente: se puede ejecutar multiples veces sin duplicar datos

### Asignar Permisos al Rol Admin

Los permisos se crean en la base de datos pero **no se asignan automaticamente** a ningun rol. Ejecutar en tinker:

```bash
php artisan tinker
```

```php
$role = \App\Models\Role::where('slug', 'admin')->first();
$permisos = \App\Models\Permission::where('group', 'accounting')->pluck('id');
$role->permissions()->syncWithoutDetaching($permisos);
exit
```

**Importante:** Despues de asignar permisos, **cerrar sesion y volver a entrar** para que se carguen los permisos nuevos en el frontend.

### Permisos Creados

| Slug | Descripcion |
|------|-------------|
| `accounting.view` | Ver modulo de contabilidad |
| `accounting.manage` | Crear, editar y eliminar cuentas contables |
| `accounting.entries.create` | Crear asientos contables manuales |
| `accounting.entries.post` | Publicar asientos contables |
| `accounting.entries.void` | Anular asientos contables |
| `accounting.reports` | Ver reportes contables |
| `accounting.periods` | Cerrar y reabrir periodos contables |
| `accounting.settings` | Vincular cuentas contables a cajas, proveedores y tipos de venta |

---

## Paso 1: Verificar Sidebar

1. Iniciar sesion con un usuario que tenga rol **admin**
2. En el sidebar izquierdo debe aparecer la seccion **"Contabilidad"** con icono de libro
3. Al expandirla deben verse 5 sub-items:
   - Plan de Cuentas
   - Asientos Contables
   - Reportes
   - Periodos
   - Configuracion

**Si no aparece:** verificar que el usuario tenga el permiso `accounting.view` asignado y que haya cerrado/abierto sesion despues de asignar permisos.

---

## Paso 2: Verificar Plan de Cuentas (PUC)

**Ruta:** `/admin/accounting/accounts`

1. Navegar a **Contabilidad > Plan de Cuentas**
2. Debe aparecer el arbol PUC con ~40 cuentas pre-cargadas del PUC colombiano:

| Clase | Nombre | Badge Color |
|-------|--------|-------------|
| 1 | Activo | Azul |
| 2 | Pasivo | Rojo |
| 3 | Patrimonio | Morado |
| 4 | Ingresos | Verde |
| 5 | Gastos | Naranja |
| 6 | Costos de Venta | Ambar |

3. Hacer clic en los **chevrones** (flechas) para expandir cada clase y ver las subcuentas
4. Probar el **filtro de busqueda**: escribir "caja" o "110505" y verificar que filtra correctamente
5. Probar el **filtro de tipo**: seleccionar "Activo" y verificar que solo muestra cuentas de tipo activo

### Resultado esperado

- Arbol jerarquico expandible/colapsable
- Cada cuenta muestra: Codigo, Nombre, Tipo (badge color), Naturaleza (Debito/Credito), Estado (Activa/Inactiva)
- Filtros funcionan correctamente en tiempo real

---

## Paso 3: Crear una Cuenta Nueva

**Ruta:** `/admin/accounting/accounts/create`

1. Clic en **"Nueva Cuenta"** desde el listado
2. Llenar el formulario:

| Campo | Valor |
|-------|-------|
| Codigo | `110510` |
| Nombre | `Caja Menor` |
| Tipo | `Activo` |
| Naturaleza | (auto-selecciona **Debito**) |
| Cuenta Padre | `1105 - Caja` |
| Nivel | (auto-calcula `4`) |
| Descripcion | `Caja menor para gastos menores` |

3. Clic en **Guardar**
4. Verificar que redirige al listado y la cuenta aparece bajo `1105 - Caja`

### Verificaciones

- La naturaleza se auto-asigna segun el tipo (Activo/Gasto/Costo = Debito, Pasivo/Patrimonio/Ingreso = Credito)
- El nivel se auto-calcula segun la cuenta padre o la longitud del codigo
- No se puede crear una cuenta con codigo duplicado para la misma empresa

---

## Paso 4: Editar una Cuenta Existente

1. En el Plan de Cuentas, buscar la cuenta `110510 - Caja Menor`
2. Clic en el icono de **lapiz** (editar)
3. Cambiar el nombre a `Caja Menor Principal`
4. Clic en **Guardar Cambios**
5. Verificar que el nombre se actualizo en la tabla sin recargar la pagina

### Verificaciones

- El dialog muestra codigo y tipo como solo lectura
- Se puede editar: nombre, descripcion, estado activo/inactivo
- Los cambios se reflejan inmediatamente en el arbol

---

## Paso 5: Crear un Asiento Manual (Borrador)

**Ruta:** `/admin/accounting/journal-entries/create`

1. Navegar a **Contabilidad > Asientos Contables**
2. Clic en **"Nuevo Asiento"**
3. Llenar encabezado:

| Campo | Valor |
|-------|-------|
| Fecha | Fecha de hoy |
| Descripcion | `Asiento de prueba manual` |
| Notas | `     ` |

4. Llenar lineas:

| # | Cuenta | Debito | Credito |
|---|--------|--------|---------|
| 1 | `110505 - Caja` | `100,000` | `0` |
| 2 | `130505 - Clientes` | `0` | `100,000` |

5. Verificar la barra de totales:
   - **Total Debito:** $100,000
   - **Total Credito:** $100,000
   - **Diferencia:** $0 (texto en verde)

6. Clic en **"Guardar Borrador"**

### Resultado esperado

- Redirige a la vista detalle del asiento
- Numero de asiento auto-generado (formato `AST-YYYY-NNNN`)
- Estado: **Borrador** (badge amarillo/ambar)
- Fuente: **Manual** (badge azul)
- Tabla de lineas muestra las 2 lineas con totales en el footer

---

## Paso 6: Publicar el Asiento

1. En la vista detalle del asiento borrador (paso anterior)
2. Clic en el boton verde **"Publicar"**

### Resultado esperado

- El badge de estado cambia a **"Publicado"** (verde)
- Aparece la fecha de publicacion en los detalles
- El boton "Publicar" desaparece y aparece el boton "Anular"

---

## Paso 7: Crear y Publicar Asiento Directo

1. Volver al listado de asientos (`/admin/accounting/journal-entries`)
2. Clic en **"Nuevo Asiento"**
3. Llenar:

| Campo | Valor |
|-------|-------|
| Fecha | Fecha de hoy |
| Descripcion | `   ` |

4. Lineas:

| # | Cuenta | Debito | Credito |
|---|--------|--------|---------|
| 1 | `5195 - Gastos Diversos` | `50,000` | `0` |
| 2 | `110505 - Caja` | `0` | `50,000` |

5. Clic en **"Guardar y Publicar"**

### Resultado esperado

- Va directo a la vista detalle con estado **"Publicado"** (sin pasar por borrador)

---

## Paso 8: Anular un Asiento

1. En el detalle del asiento publicado del paso 7
2. Clic en el boton rojo **"Anular"**
3. En el dialog de confirmacion:
   - Escribir razon: `Asiento de prueba, se anula para testing`
   - Clic en **"Anular Asiento"**

### Resultado esperado

- El badge cambia a **"Anulado"** (rojo)
- Aparece la razon de anulacion en una caja roja con icono de advertencia
- Se crea automaticamente un **asiento de reverso** (ver paso 9)

---

## Paso 9: Verificar Asiento de Reverso

1. Volver al listado de asientos (`/admin/accounting/journal-entries`)
2. Filtrar por fuente: **"Automatico"**

### Resultado esperado

- Aparece un asiento de reverso con:
  - Fuente: **Automatico** (badge morado)
  - Estado: **Publicado** (badge verde)
  - Descripcion: `Reverso: [descripcion del asiento original]`
  - Las lineas tienen debitos y creditos **invertidos** respecto al asiento original

---

## Paso 10: Configurar Cuentas por Caja

**Ruta:** `/admin/accounting/config`

1. Navegar a **Contabilidad > Configuracion**
2. Pestaña **"Cajas"** (seleccionada por defecto)
3. Para cada caja registradora:

| Tipo de Caja | Cuenta Sugerida |
|--------------|-----------------|
| Efectivo | `110505 - Caja` |
| Banco | `111005 - Bancos - Moneda Nacional` |

4. Al seleccionar una cuenta en el dropdown, se vincula automaticamente
5. Verificar que aparece el codigo y nombre de la cuenta vinculada
6. Probar **desvincular** una caja haciendo clic en el icono de cadena rota (X rojo)
7. Verificar que vuelve a mostrar el selector

### Por que es importante

Los observers contables usan estas vinculaciones para saber a que cuenta contable cargar cuando se registra un pago en una caja especifica. Sin esta configuracion, se usa la cuenta default `110505 - Caja`.

---

## Paso 11: Configurar Cuentas por Proveedor

1. En la misma pagina, pestaña **"Proveedores"**
2. Para cada proveedor, seleccionar la cuenta contable:

| Proveedor | Cuenta Sugerida |
|-----------|-----------------|
| Cualquier proveedor | `220505 - Proveedores Nacionales` |

3. Verificar que se vincula correctamente

### Por que es importante

Cuando se registra un pago a proveedor, el observer busca la cuenta vinculada al proveedor. Si no tiene, usa la cuenta default `2205 - Proveedores`.

---

## Paso 12: Configurar Tipos de Venta

1. Pestaña **"Tipos de Venta"**
2. Para cada tipo de venta, configurar las cuentas:

**Punto de Venta (POS):**

| Tipo de Transaccion | Cuenta Sugerida |
|---------------------|-----------------|
| Ingreso por Venta | `413536 - Comercio al por menor` |
| IVA por Venta | `240804 - IVA Regimen Comun` |
| Cuentas por Cobrar | `130505 - Clientes` |
| Retencion en la Fuente | `236540 - Retencion en la fuente` (si aplica) |
| Retencion ICA | `236801 - Retencion ICA` (si aplica) |
| Retencion IVA | `236701 - Retencion IVA` (si aplica) |

3. Repetir para: **Electronica**, **Credito**, **A Cuenta** (pueden usar las mismas cuentas)
4. Clic en **"Guardar"**

### Por que es importante

Estas cuentas determinan como se contabilizan automaticamente las ventas. El `AccountingSaleObserver` busca estas configuraciones para generar el asiento correcto segun el tipo de venta.

---

## Paso 13: Probar Asiento Automatico por Venta a Credito

**Este es el test mas importante** - verifica que los observers funcionan correctamente.

1. Ir a **Vender** (`/admin/sell`)
2. Crear una venta de tipo **"Credito"** o **"A Cuenta"**
   - Agregar al menos un producto
   - Completar la venta
3. Ir a **Contabilidad > Asientos Contables** (`/admin/accounting/journal-entries`)
4. Filtrar por fuente: **"Automatico"**

### Resultado esperado

Un asiento nuevo con:
- Fuente: **Automatico** (badge morado)
- Estado: **Publicado** (badge verde)
- Descripcion: `Venta [numero factura] - credit`
- **Lineas del asiento:**

| Cuenta | Debito | Credito | Descripcion |
|--------|--------|---------|-------------|
| 130505 - Clientes (CxC) | Total - Retenciones | 0 | CxC Venta [factura] |
| 413536 - Ingresos | 0 | Subtotal | Ingreso Venta [factura] |
| 240804 - IVA | 0 | IVA | IVA Venta [factura] |

> **Nota:** Las ventas POS/electronicas con pago inmediato **no** generan asiento de venta (se manejan via el observer de pagos). Solo las ventas a credito/cuenta de cobro generan asiento de venta.

---

## Paso 14: Probar Asiento Automatico por Pago Recibido

1. Si se hizo una venta a credito (paso 13), ir a **Cartera > Saldos Clientes** (`/admin/balances/clients`)
2. Registrar un **pago/abono** del cliente
3. Ir a **Contabilidad > Asientos Contables** y filtrar **"Automatico"**

### Resultado esperado

Un asiento nuevo con:
- Descripcion: `Pago recibido [numero pago] - Venta [factura]`
- **Lineas:**

| Cuenta | Debito | Credito | Descripcion |
|--------|--------|---------|-------------|
| 110505 - Caja (o la vinculada) | Monto | 0 | Recaudo [numero pago] |
| 130505 - Clientes (CxC) | 0 | Monto | Abono CxC [numero pago] |

---

## Paso 15: Probar Asiento por Transferencia entre Cajas

1. Ir a **Caja > Transferencias** (`/admin/cash-transfers`)
2. Realizar una transferencia entre dos cajas (ej: de Caja Efectivo a Banco)
3. Ir a **Contabilidad > Asientos Contables** y filtrar **"Automatico"**

### Resultado esperado

Un asiento con:

| Cuenta | Debito | Credito | Descripcion |
|--------|--------|---------|-------------|
| Cuenta caja destino | Monto | 0 | Transferencia recibida |
| Cuenta caja origen | 0 | Monto | Transferencia enviada |

> **Nota:** Las cuentas usadas dependen de la vinculacion hecha en el Paso 10. Si las cajas no tienen cuenta vinculada, se usa `110505 - Caja` como fallback.

---

## Paso 16: Probar Reportes Contables

**Ruta:** `/admin/accounting/reports`

### 16.1 Balance de Comprobacion

**Ruta:** `/admin/accounting/reports/trial-balance`

1. Seleccionar rango: desde inicio de mes hasta hoy
2. Clic en **"Consultar"**

**Resultado esperado:**
- Tabla con todas las cuentas que tuvieron movimiento
- Columnas: Codigo, Nombre, Saldo Debito, Saldo Credito
- Fila de totales al final
- Banner verde: **"Los totales cuadran"** (total debito = total credito)

### 16.2 Libro Mayor

**Ruta:** `/admin/accounting/reports/general-ledger`

1. Seleccionar cuenta: `110505 - Caja`
2. Seleccionar rango de fechas
3. Clic en **"Consultar"**

**Resultado esperado:**
- Tabla con todos los movimientos de esa cuenta
- Columnas: Fecha, No. Asiento, Descripcion, Debito, Credito, Saldo Acumulado
- El saldo acumulado se va sumando/restando linea por linea

### 16.3 Libro Diario

**Ruta:** `/admin/accounting/reports/journal-book`

1. Seleccionar rango de fechas
2. Clic en **"Consultar"**

**Resultado esperado:**
- Lista cronologica de todos los asientos publicados
- Cada asiento es expandible para ver sus lineas
- Controles para expandir/colapsar todos

### 16.4 Estado de Resultados

**Ruta:** `/admin/accounting/reports/income-statement`

1. Seleccionar rango de fechas del periodo
2. Clic en **"Consulta  r"**

**Resultado esperado:**
- Secciones: Ingresos, Costos de Venta, Gastos Operacionales
- Cada seccion muestra cuentas con sus montos
- Al final: **Utilidad/Perdida Neta** (Ingresos - Costos - Gastos)
- Verde si hay utilidad, rojo si hay perdida

### 16.5 Balance General

**Ruta:** `/admin/accounting/reports/balance-sheet`

1. Seleccionar una fecha (hoy)
2. Clic en **"Consultar"**

**Resultado esperado:**
- Secciones: Activos, Pasivos, Patrimonio
- Al final: comparacion Activos vs (Pasivos + Patrimonio)
- Banner verde si la ecuacion contable cuadra: **Activos = Pasivos + Patrimonio**

---

## Paso 17: Probar Periodos Contables

**Ruta:** `/admin/accounting/periods`

1. Navegar a **Contabilidad > Periodos**
2. Debe aparecer al menos el periodo del mes actual (se crean automaticamente al registrar asientos)

### 17.1 Cerrar un Periodo

1. Clic en **"Cerrar"** en el periodo actual
2. Confirmar en el dialog de confirmacion
3. Verificar que cambia a estado **"Cerrado"** (badge rojo con icono de candado)
4. Aparece quien cerro y cuando

### 17.2 Verificar Bloqueo

1. Intentar crear un asiento manual con fecha dentro del mes cerrado
2. **Debe fallar** con error indicando que el periodo esta cerrado

### 17.3 Reabrir un Periodo

1. Volver a **Periodos**
2. Clic en **"Reabrir"** en el periodo cerrado
3. Confirmar en el dialog
4. Verificar que cambia a estado **"Abierto"** (badge verde con icono de candado abierto)
5. Ahora si se pueden crear asientos en ese mes nuevamente

---

## Resumen de Resultados Esperados

| # | Prueba | Resultado Esperado |
|---|--------|-------------------|
| 1 | Sidebar | Seccion "Contabilidad" visible con 5 sub-items |
| 2 | Plan de Cuentas | ~40 cuentas PUC en arbol expandible con filtros |
| 3 | Crear cuenta | Se crea y aparece en el arbol bajo su padre |
| 4 | Editar cuenta | Nombre/descripcion se actualizan sin recargar |
| 5 | Asiento borrador | Se crea con estado "Borrador" y numero auto-generado |
| 6 | Publicar asiento | Cambia a "Publicado" con fecha de publicacion |
| 7 | Asiento directo | Se crea y publica en un solo paso |
| 8 | Anular asiento | Cambia a "Anulado" con razon visible |
| 9 | Asiento reverso | Se genera automaticamente al anular |
| 10 | Config cajas | Vincula/desvincula cuentas a cajas registradoras |
| 11 | Config proveedores | Vincula cuentas CxP a proveedores |
| 12 | Config tipos venta | Mapea cuentas de ingreso/IVA/CxC por tipo |
| 13 | Venta a credito | Genera asiento automatico DR CxC / CR Ingreso / CR IVA |
| 14 | Pago recibido | Genera asiento automatico DR Caja / CR CxC |
| 15 | Transferencia cajas | Genera asiento automatico DR destino / CR origen |
| 16 | Reportes | Balance comprobacion cuadra, libro mayor con saldo acumulado |
| 17 | Periodos | Cerrar bloquea asientos, reabrir los permite |

---

## Rutas del Modulo

| Ruta | Pagina |
|------|--------|
| `/admin/accounting/accounts` | Plan de Cuentas (arbol) |
| `/admin/accounting/accounts/create` | Crear Cuenta |
| `/admin/accounting/journal-entries` | Listado de Asientos |
| `/admin/accounting/journal-entries/create` | Crear Asiento Manual |
| `/admin/accounting/journal-entries/{id}` | Detalle de Asiento |
| `/admin/accounting/reports` | Dashboard de Reportes |
| `/admin/accounting/reports/trial-balance` | Balance de Comprobacion |
| `/admin/accounting/reports/general-ledger` | Libro Mayor |
| `/admin/accounting/reports/journal-book` | Libro Diario |
| `/admin/accounting/reports/income-statement` | Estado de Resultados |
| `/admin/accounting/reports/balance-sheet` | Balance General |
| `/admin/accounting/periods` | Periodos Contables |
| `/admin/accounting/config` | Configuracion Contable |

---

## Flujo de Asientos Automaticos

```
Venta Completada
    └─► AccountingSaleObserver::created()
        Asiento 1 - Reconocimiento de ingresos:
        └─► DR CxC (13050501) → total - retenciones
            CR Ingresos (41350101) → subtotal productos/servicios
            CR IVA Generado (24080501) → por tarifa
            DR Retenciones (23654001/23670101/23680501) → si aplica

        Asiento 2 - Costo de venta (solo productos con average_cost > 0):
        └─► DR Costo de Venta (61350501) → average_cost × cantidad
            CR Inventario (14350101) → misma cantidad

Pago Recibido (Income)
    └─► AccountingPaymentObserver::created()
        └─► DR Caja (cuenta vinculada o 11050501)
            CR CxC (13050501)

Pago a Proveedor (Expense)
    └─► AccountingPaymentObserver::created()
        └─► DR CxP (cuenta vinculada o 22050501)
            CR Caja (cuenta vinculada o 11050501)

Transferencia entre Cajas
    └─► AccountingCashTransferObserver::created()
        └─► DR Caja Destino (cuenta vinculada)
            CR Caja Origen (cuenta vinculada)

Compra Recibida
    └─► AccountingPurchaseObserver::updated() [status → received]
        └─► DR Inventario (14350101)
            DR IVA Descontable (24081001)
            CR CxP Proveedor (cuenta vinculada o 22050501)

Anulacion de Venta
    └─► AccountingSaleObserver::updated() [status → cancelled]
        └─► Asiento de reverso (lineas invertidas)

Anulacion de Pago
    └─► AccountingPaymentObserver::updated() [status → cancelled]
        └─► Asiento de reverso (lineas invertidas)
```

---

## Flujo Contable Completo End-to-End

### Venta con Pago Inmediato (POS / Contado)

```
1. Se crea la venta (status=completed)
   → AccountingSaleObserver genera:
     Asiento 1: DR CxC / CR Ingresos / CR IVA
     Asiento 2: DR Costo Venta / CR Inventario

2. Se registra el pago (Payment type=income)
   → AccountingPaymentObserver genera:
     Asiento 3: DR Caja o Banco (segun caja vinculada) / CR CxC

   Efecto neto: DR Caja → CR Ingresos + CR IVA
                 DR Costo Venta → CR Inventario
```

### Venta a Credito con Pago Posterior

```
1. Se crea la venta (status=completed, payment_status=pending)
   → Se generan Asientos 1 y 2 (CxC queda con saldo)

2. Cliente paga despues (addPayment)
   → Se genera Asiento 3: DR Caja / CR CxC
   → CxC se cierra total o parcialmente
```

### Compra de Inventario

```
1. Se crea la compra (status=draft)
   → No se genera asiento

2. Se recibe la compra (status=received)
   → AccountingPurchaseObserver genera:
     DR Inventario (14350101) / DR IVA Descontable (24081001) / CR CxP (22050501)

3. Se paga al proveedor
   → AccountingPaymentObserver genera:
     DR CxP / CR Caja o Banco
```

### Ajuste de Inventario

```
1. Se crea un ajuste de inventario (status=pending)
   → No se genera asiento

2. Se aprueba el ajuste (status=approved o auto_approved)
   → AccountingAdjustmentObserver genera:

   Sobrante (aumento de inventario):
     DR Inventario (14350101) / CR Aprovechamientos (42950501)

   Faltante o daño (disminucion de inventario):
     DR Gastos Diversos POS (52959505) / CR Inventario (14350101)

   El monto se toma del campo financial_impact del ajuste.
```

### Cuentas Clave del PUC

| Codigo | Nombre | Usado Por |
|--------|--------|-----------|
| `11050501` | Caja General | PaymentObserver, CashTransferObserver (fallback) |
| `13050501` | Clientes Nacionales (CxC) | SaleObserver, PaymentObserver |
| `14350101` | Mercancias no Fabricadas (Inventario) | SaleObserver (costo), PurchaseObserver, AdjustmentObserver |
| `22050501` | Proveedores Nacionales (CxP) | PurchaseObserver, PaymentObserver |
| `24080501` | IVA Generado en Ventas | SaleObserver |
| `24081001` | IVA Descontable por Compras 19% | PurchaseObserver |
| `41350101` | Comercio al por Mayor y al Detal | SaleObserver (ingresos) |
| `61350501` | Costo de Ventas Comercio | SaleObserver (costo) |
| `23654001` | Retencion por Compras 2,5% | SaleObserver (retefuente) |
| `23670101` | IVA Retenido 15% | SaleObserver (reteiva) |
| `23680501` | ReteICA 11,04 | SaleObserver (reteica) |
| `42950501` | Aprovechamientos | AdjustmentObserver (sobrante inventario) |
| `52959505` | Gastos Diversos POS | AdjustmentObserver (faltante/daño inventario) |

---

## Troubleshooting

### No aparece "Contabilidad" en el sidebar

1. Verificar que el usuario tiene permiso `accounting.view`
2. Cerrar sesion y volver a entrar
3. Verificar en tinker: `\App\Models\Permission::where('slug', 'accounting.view')->first()` existe

### Los asientos automaticos no se generan

1. Verificar que hay cuentas PUC en la empresa: `\App\Models\AccountingAccount::where('company_id', X)->count()` debe ser > 0
2. Verificar observers registrados: en `AppServiceProvider::boot()` deben estar los 5 observers contables
3. Revisar logs: `storage/logs/laravel.log` - los observers loguean errores con prefijo `AccountingSaleObserver`, `AccountingPaymentObserver`, `AccountingAdjustmentObserver`, etc.
4. Las ventas POS/electronicas **no** generan asiento de venta (solo de pago)

### "Periodo cerrado" al crear asiento

El periodo contable del mes de la fecha del asiento esta cerrado. Ir a **Contabilidad > Periodos** y reabrir el periodo correspondiente.

### Balance de Comprobacion no cuadra

Significa que hay asientos desbalanceados en la base de datos (no deberia ocurrir con la validacion del sistema). Verificar en el Libro Diario que asientos tienen diferencia entre debito y credito.
