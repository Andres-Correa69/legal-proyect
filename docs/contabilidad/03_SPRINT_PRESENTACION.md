# Presentacion Sprint - Modulo de Cuentas Contables

## Contexto: Donde estamos hoy

### El sistema actual de facturacion

El sistema **Facturacion Grupo CP** es una plataforma multi-tenant de facturacion y gestion comercial construida con Laravel + React. Actualmente maneja el ciclo completo de operaciones comerciales de la empresa:

#### Lo que YA funciona:

**Ventas y Facturacion**
- Creacion de ventas con 4 tipos: POS, Factura Electronica, Cuenta de Cobro y Credito
- Cada venta calcula automaticamente subtotales, descuentos, IVA y retenciones
- Sistema de numeracion automatica por tipo (POS-001, FE-001, CC-001)
- Pagos parciales y abonos con seguimiento del saldo pendiente
- Comisiones para vendedores
- Generacion de PDF (cuentas de cobro)

**Facturacion Electronica DIAN**
- Registro de empresa ante la DIAN
- Emision de facturas electronicas validadas
- Notas credito (anulaciones) y notas debito (ajustes al alza)
- Almacenamiento de XML, PDF y codigos QR
- Manejo de resoluciones y consecutivos por sucursal

**Cajas Registradoras**
- Tres tipos: Caja Menor (con sesiones), Caja Mayor (sin sesiones), Banco
- Las cajas menores manejan apertura/cierre de sesion con cuadre (faltantes y sobrantes)
- Transferencias entre cajas con trazabilidad
- Balance en tiempo real de cada caja

**Compras e Inventario**
- Ordenes de compra a proveedores con flujo de aprobacion
- Recepcion parcial o total de mercancia
- Calculo de costo promedio ponderado
- Control de stock con minimos, maximos y alertas de bajo inventario
- Ajustes de inventario y transferencias entre bodegas

**Pagos**
- Registro centralizado de todos los movimientos de dinero (ingresos y egresos)
- Pagos vinculados a ventas y a compras via referencia polimorfica
- Multiples metodos de pago por empresa
- Cancelacion de pagos con reversion automatica de saldos
- Cuotas/abonos programados

**Cartera**
- Cartera de clientes: saldo por cobrar por cliente con detalle de facturas
- Cartera de proveedores: saldo por pagar por proveedor con detalle de compras
- Alertas de facturas vencidas y proximas a vencer
- Exportacion a Excel y PDF

**Multitenancy**
- Multiples empresas (companies) con sucursales (branches)
- Soporte de franquicias (empresa padre/hijas)
- Aislamiento automatico de datos por empresa y sucursal
- Sistema RBAC: 6 roles base con permisos granulares

---

### El problema: NO tenemos contabilidad formal

A pesar de tener toda esta infraestructura financiera, el sistema **no genera registros contables**. Esto significa:

| Tenemos | Nos falta |
|---------|-----------|
| Sabemos cuanto vendimos | No sabemos en que cuenta contable quedo registrado |
| Sabemos cuanto hay en cada caja | No tenemos libros contables oficiales |
| Sabemos cuanto debemos a proveedores | No podemos generar un Balance General |
| Sabemos cuanto nos deben los clientes | No podemos generar un Estado de Resultados |
| Registramos cada pago | No usamos partida doble |
| Tenemos facturas electronicas DIAN | No cumplimos con la contabilidad formal que exige la DIAN |

**En resumen:** Tenemos toda la informacion financiera, pero no la estamos traduciendo al lenguaje contable.

---

## Que vamos a construir

### Sistema de Cuentas Contables con Observer

Un modulo que **se monta encima** del sistema existente (sin modificar lo que ya funciona) y genera automaticamente los registros contables cada vez que ocurre una transaccion financiera.

### La idea central: El patron Observer

Imagina que ponemos un "vigilante" (observer) en cada punto donde se mueve dinero en el sistema. Cada vez que el vigilante detecta un movimiento, genera automaticamente el asiento contable correspondiente:

```
                    ┌─────────────────────┐
                    │   TRANSACCIONES     │
                    │   (ya existentes)    │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
         │  Venta   │   │  Pago   │   │ Compra  │
         │ creada   │   │ hecho   │   │ recibida│
         └────┬─────┘   └────┬────┘   └────┬────┘
              │              │              │
         ┌────▼─────────────▼──────────────▼────┐
         │                                       │
         │          O B S E R V E R S            │
         │    (vigilantes automaticos)            │
         │                                       │
         └────────────────┬──────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   ASIENTOS CONTABLES  │
              │   (partida doble)     │
              │                       │
              │  Debito  CxC  $1.19M  │
              │  Credito Vtas $1.00M  │
              │  Credito IVA  $0.19M  │
              └───────────────────────┘
```

### Vinculaciones configurables

El admin configura **que observar** y **a donde va**:

**Cajas → Cuentas contables:**
```
"Caja POS 1"        ──→  Cuenta 110505 (Caja General)
"Caja Mayor"         ──→  Cuenta 110510 (Caja Mayor)
"Bancolombia"        ──→  Cuenta 111005 (Bancos Nacionales)
```

**Proveedores → Cuentas contables:**
```
"Distribuidora XYZ"  ──→  Cuenta 220505 (Proveedores Nacionales)
"Servicios ABC"      ──→  Cuenta 220505 (Proveedores Nacionales)
```

**Tipos de venta → Cuentas contables:**
```
Venta POS            ──→  Ingreso: 413536 | IVA: 240804 | CxC: 130505
Factura Electronica  ──→  Ingreso: 413535 | IVA: 240804 | CxC: 130505
Cuenta de Cobro      ──→  Ingreso: 413540 | CxC: 130505
```

Una vez configurado, **todo funciona automaticamente**. El cajero sigue vendiendo igual, el admin sigue registrando compras igual, pero detras de escena se generan asientos contables con cada operacion.

---

## Que va a poder hacer el usuario

### 1. Ver el Plan de Cuentas
Un arbol visual con todas las cuentas contables de la empresa, basado en el PUC colombiano:
```
📁 1 - Activo
  📁 11 - Disponible
    📁 1105 - Caja
      📄 110505 - Caja General         Saldo: $2,350,000
      📄 110510 - Cajas Menores         Saldo: $450,000
    📁 1110 - Bancos
      📄 111005 - Bancos Nacionales     Saldo: $15,200,000
  📁 13 - Deudores
    📁 1305 - Clientes
      📄 130505 - Clientes Nacionales   Saldo: $8,500,000
📁 2 - Pasivo
  📁 22 - Proveedores
    📄 220505 - Proveedores Nacionales  Saldo: $3,200,000
  📁 24 - Impuestos
    📄 240804 - IVA por Pagar           Saldo: $1,800,000
📁 4 - Ingresos
  📄 413536 - Ventas al por Menor       Saldo: $45,000,000
```

El admin puede agregar subcuentas propias sin tocar las del PUC base.

### 2. Ver el Libro Diario
Lista cronologica de todos los asientos generados (automaticos y manuales):

```
┌──────────────┬───────────┬─────────────────────────────┬────────────┬────────────┐
│ Fecha        │ Numero    │ Descripcion                 │ Debito     │ Credito    │
├──────────────┼───────────┼─────────────────────────────┼────────────┼────────────┤
│ 2026-02-18   │ AC-001    │ Venta POS-0234 - Cliente X  │            │            │
│              │           │   130505 CxC Clientes       │ $1,190,000 │            │
│              │           │   413536 Ventas por Menor    │            │ $1,000,000 │
│              │           │   240804 IVA 19%             │            │   $190,000 │
├──────────────┼───────────┼─────────────────────────────┼────────────┼────────────┤
│ 2026-02-18   │ AC-002    │ Pago venta POS-0234         │            │            │
│              │           │   110505 Caja POS 1          │   $500,000 │            │
│              │           │   130505 CxC Clientes        │            │   $500,000 │
├──────────────┼───────────┼─────────────────────────────┼────────────┼────────────┤
│ 2026-02-18   │ AC-003    │ Compra PO-0045 - Dist. XYZ  │            │            │
│              │           │   143505 Inventario          │   $840,000 │            │
│              │           │   240805 IVA Descontable     │   $160,000 │            │
│              │           │   220505 CxP Proveedores     │            │ $1,000,000 │
└──────────────┴───────────┴─────────────────────────────┴────────────┴────────────┘
```

Cada asiento marcado como **Auto** (generado por observer) o **Manual** (creado por el contador).

### 3. Consultar el Libro Mayor
Seleccionar una cuenta y ver todos sus movimientos con saldo acumulado:

```
Cuenta: 110505 - Caja General
Periodo: Febrero 2026

┌──────────┬───────────┬──────────────────────┬──────────┬──────────┬────────────┐
│ Fecha    │ Asiento   │ Concepto             │ Debito   │ Credito  │ Saldo      │
├──────────┼───────────┼──────────────────────┼──────────┼──────────┼────────────┤
│          │           │ Saldo anterior       │          │          │ $1,200,000 │
│ 02/01    │ AC-001    │ Pago venta POS-0230  │ $350,000 │          │ $1,550,000 │
│ 02/03    │ AC-005    │ Pago venta POS-0231  │ $200,000 │          │ $1,750,000 │
│ 02/05    │ AC-008    │ Transfer. a Caja May │          │ $500,000 │ $1,250,000 │
│ 02/10    │ AC-012    │ Pago venta POS-0235  │ $890,000 │          │ $2,140,000 │
│ 02/15    │ AC-018    │ Pago venta POS-0240  │ $210,000 │          │ $2,350,000 │
├──────────┼───────────┼──────────────────────┼──────────┼──────────┼────────────┤
│          │           │ TOTALES PERIODO      │$1,650,000│ $500,000 │ $2,350,000 │
└──────────┴───────────┴──────────────────────┴──────────┴──────────┴────────────┘
```

### 4. Generar el Balance de Comprobacion
Resumen de todas las cuentas para verificar que la contabilidad esta cuadrada:

```
BALANCE DE COMPROBACION - Febrero 2026

┌────────┬─────────────────────────┬────────────────┬────────────────┐
│ Codigo │ Cuenta                  │ Saldo Debito   │ Saldo Credito  │
├────────┼─────────────────────────┼────────────────┼────────────────┤
│ 110505 │ Caja General            │    $2,350,000  │                │
│ 110510 │ Cajas Menores           │      $450,000  │                │
│ 111005 │ Bancos Nacionales       │   $15,200,000  │                │
│ 130505 │ Clientes Nacionales     │    $8,500,000  │                │
│ 143505 │ Inventario Mercancia    │   $12,000,000  │                │
│ 220505 │ Proveedores Nacionales  │                │    $3,200,000  │
│ 240804 │ IVA por Pagar           │                │    $1,800,000  │
│ 413536 │ Ventas al por Menor     │                │   $28,000,000  │
│ 413535 │ Ventas al por Mayor     │                │   $17,000,000  │
│ 6135   │ Costo Mercancia Vendida │   $11,500,000  │                │
├────────┼─────────────────────────┼────────────────┼────────────────┤
│        │ TOTALES                 │  $50,000,000   │  $50,000,000   │
│        │                         │    ✅ CUADRADO  │                │
└────────┴─────────────────────────┴────────────────┴────────────────┘
```

### 5. Crear Asientos Manuales
Para gastos que no pasan por ventas/compras (arriendo, servicios publicos, nomina):

```
Nuevo Asiento Manual

Fecha: 2026-02-15
Descripcion: Pago arriendo oficina Febrero 2026

Lineas:
  Cuenta 5120 - Arrendamientos      Debito: $2,500,000
  Cuenta 111005 - Bancos Nacionales  Credito: $2,500,000

Total Debito:  $2,500,000
Total Credito: $2,500,000  ✅ Balanceado

[Guardar Borrador]  [Contabilizar]
```

### 6. Configurar Vinculaciones
Pantalla donde el admin asigna cajas, proveedores y tipos de venta a cuentas contables:

```
VINCULACIONES CONTABLES

── Cajas Registradoras ──
┌──────────────────────┬────────┬──────────────────────────┐
│ Caja                 │ Tipo   │ Cuenta Contable          │
├──────────────────────┼────────┼──────────────────────────┤
│ Caja POS Sucursal 1  │ Menor  │ 110505 - Caja General    │
│ Caja Mayor Principal │ Mayor  │ 110510 - Cajas Menores   │
│ Bancolombia          │ Banco  │ 111005 - Bancos Nac.     │
│ Davivienda           │ Banco  │ 🔗 Sin asignar           │
└──────────────────────┴────────┴──────────────────────────┘

── Proveedores ──
┌──────────────────────┬──────────────────────────────────┐
│ Proveedor            │ Cuenta Contable                  │
├──────────────────────┼──────────────────────────────────┤
│ Distribuidora XYZ    │ 220505 - Proveedores Nacionales  │
│ Servicios ABC        │ 220505 - Proveedores Nacionales  │
│ Insumos del Valle    │ 🔗 Sin asignar                   │
└──────────────────────┴──────────────────────────────────┘
```

### 7. Gestionar Periodos Contables
Cerrar meses para impedir modificaciones a asientos ya contabilizados:

```
PERIODOS CONTABLES 2026

┌───────────┬──────────┬──────────────┬──────────────────┐
│ Periodo   │ Estado   │ Asientos     │ Accion           │
├───────────┼──────────┼──────────────┼──────────────────┤
│ Enero     │ Cerrado  │ 245 asientos │ [Reabrir]        │
│ Febrero   │ Abierto  │ 189 asientos │ [Cerrar]         │
│ Marzo     │ Abierto  │ 0 asientos   │ --               │
└───────────┴──────────┴──────────────┴──────────────────┘
```

---

## Impacto en el sistema actual

### Lo que NO cambia:
- El flujo de ventas sigue exactamente igual
- El flujo de pagos sigue exactamente igual
- Las cajas registradoras funcionan igual
- Las compras funcionan igual
- La facturacion electronica DIAN no se toca
- La cartera de clientes y proveedores sigue igual
- Ningun usuario nota diferencia en su flujo diario

### Lo que se AGREGA:
- Un nuevo modulo "Contabilidad" en el menu lateral
- Observers silenciosos que generan asientos automaticos
- Plan de cuentas PUC precargado
- Reportes contables (libro diario, libro mayor, balance)
- Configuracion de vinculaciones (una sola vez)

### Riesgo:
**Bajo.** El modulo contable es una **capa adicional** que lee datos de los modelos existentes via observers. No modifica tablas existentes, no cambia controladores existentes, no altera flujos existentes. Si algo falla en la parte contable, el sistema de facturacion sigue funcionando normalmente.

---

## Plan de ejecucion por fases

### Fase 1 - Cimientos (Sprint actual)

| Tarea | Descripcion | Prioridad |
|-------|-------------|-----------|
| Migraciones | Crear las 7 tablas nuevas (accounts, entries, lines, periods, 3 pivots) | Alta |
| Modelos | AccountingAccount, JournalEntry, JournalEntryLine, AccountingPeriod | Alta |
| Seeder PUC | Plan de cuentas base colombiano precargado | Alta |
| CRUD Plan de Cuentas | API + Frontend para ver/crear/editar cuentas (vista arbol) | Alta |
| Asientos manuales | API + Frontend para crear asientos con partida doble | Alta |
| Permisos | 7 permisos nuevos en PermissionSeeder | Alta |

**Entregable:** El contador puede ver el plan de cuentas y crear asientos manuales.

### Fase 2 - Automatizacion (Siguiente sprint)

| Tarea | Descripcion | Prioridad |
|-------|-------------|-----------|
| AccountingService | Servicio centralizado con logica de creacion de asientos | Alta |
| Observers | SaleObserver, PaymentObserver, TransferObserver | Alta |
| Configuracion de vinculaciones | UI para asignar cajas/proveedores/tipos a cuentas | Alta |
| Asientos automaticos | Que cada venta/pago/compra genere asiento | Alta |
| Reversiones | Que cancelaciones generen asientos inversos | Media |

**Entregable:** Las operaciones diarias generan contabilidad automatica.

### Fase 3 - Reportes (Sprint posterior)

| Tarea | Descripcion | Prioridad |
|-------|-------------|-----------|
| Libro Diario | Listado cronologico de todos los asientos | Alta |
| Libro Mayor | Movimientos por cuenta con saldo acumulado | Alta |
| Balance de Comprobacion | Resumen de saldos (debitos = creditos) | Alta |
| Balance General | Activos = Pasivos + Patrimonio | Media |
| Estado de Resultados | Ingresos - Costos - Gastos = Utilidad | Media |
| Exportacion | PDF y Excel para todos los reportes | Media |

**Entregable:** Reportes contables completos para el contador y la DIAN.

### Fase 4 - Avanzado (Futuro)

| Tarea | Descripcion | Prioridad |
|-------|-------------|-----------|
| Periodos contables | Cierre y reapertura de meses | Media |
| Cierre fiscal | Cierre de ano con traslado a patrimonio | Baja |
| Centros de costo | Contabilidad por sucursal | Baja |
| Conciliacion bancaria | Comparar movimientos vs extracto | Baja |
| COGS automatico | Costo de venta por transaccion | Baja |

---

## Metricas de exito

Al finalizar la implementacion completa, el sistema debe poder:

1. **Generar automaticamente** un asiento contable por cada venta, pago, compra y transferencia
2. **Mostrar en tiempo real** el saldo de cualquier cuenta contable
3. **Producir un Balance de Comprobacion** donde debitos = creditos (siempre cuadrado)
4. **Generar Balance General** y **Estado de Resultados** a cualquier fecha
5. **No romper** ninguna funcionalidad existente del sistema de facturacion
6. **Cumplir** con los requisitos contables de la normatividad colombiana (PUC)

---

## Glosario rapido

| Termino | Significado |
|---------|-------------|
| **PUC** | Plan Unico de Cuentas - estandar colombiano de codificacion contable |
| **Partida doble** | Cada transaccion tiene un debito y un credito iguales |
| **Asiento contable** | Registro formal de una transaccion con sus cuentas afectadas |
| **Libro diario** | Registro cronologico de todos los asientos |
| **Libro mayor** | Registro de movimientos por cuenta individual |
| **Balance de comprobacion** | Resumen de saldos para verificar que todo cuadra |
| **Balance general** | Foto financiera: Activos = Pasivos + Patrimonio |
| **Estado de resultados (PyG)** | Ingresos - Costos - Gastos = Utilidad |
| **CxC** | Cuentas por Cobrar (lo que nos deben los clientes) |
| **CxP** | Cuentas por Pagar (lo que le debemos a proveedores) |
| **Observer** | Patron de diseno que "observa" eventos y reacciona automaticamente |
| **Debito** | Lado izquierdo del asiento - aumenta activos y gastos |
| **Credito** | Lado derecho del asiento - aumenta pasivos e ingresos |
