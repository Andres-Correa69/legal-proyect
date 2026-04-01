# Documentacion Funcional - Sistema de Cuentas Contables

## 1. Introduccion

### Que es una Cuenta Contable?

Una **cuenta contable** es un registro donde se clasifican y acumulan todas las operaciones financieras de una empresa. Piensa en ella como una "carpeta" donde se agrupan movimientos del mismo tipo: todos los ingresos por ventas van a una cuenta, todos los pagos de caja van a otra, todas las deudas de proveedores van a otra, etc.

En Colombia, las cuentas contables siguen el **PUC (Plan Unico de Cuentas)**, un estandar nacional que define como deben organizarse las cuentas de cualquier empresa.

### Por que necesitamos este sistema?

Actualmente, el sistema de facturacion ya registra:
- Ventas y sus pagos
- Compras a proveedores y sus pagos
- Movimientos de cajas (menor, mayor, banco)
- Transferencias entre cajas
- Facturacion electronica DIAN

**Pero NO tiene:**
- Un registro contable formal (partida doble)
- Un plan de cuentas organizado
- Libros contables (diario, mayor)
- Estados financieros (balance general, estado de resultados)
- Trazabilidad contable de cada peso que entra y sale

El sistema contable agrega esa **capa de trazabilidad financiera** sobre lo que ya existe.

---

## 2. Conceptos Clave

### 2.1 Plan de Cuentas (PUC)

Es la estructura jerarquica donde se organizan todas las cuentas. Cada cuenta tiene un **codigo numerico** que indica su ubicacion:

```
Nivel 1 - Clase:      1 = Activo
Nivel 2 - Grupo:      11 = Disponible
Nivel 3 - Cuenta:     1105 = Caja
Nivel 4 - Subcuenta:  110505 = Caja General
Nivel 5 - Auxiliar:   11050501 = Caja Sucursal Norte
```

### Clases principales:

| Codigo | Clase | Que representa | Naturaleza |
|--------|-------|----------------|------------|
| 1xxx | **Activos** | Lo que la empresa TIENE (caja, banco, inventario, cuentas por cobrar) | Debito |
| 2xxx | **Pasivos** | Lo que la empresa DEBE (proveedores, impuestos por pagar) | Credito |
| 3xxx | **Patrimonio** | Capital de los socios | Credito |
| 4xxx | **Ingresos** | Dinero que ENTRA por ventas y servicios | Credito |
| 5xxx | **Gastos** | Dinero que SALE por operacion (arriendo, nomina, servicios) | Debito |
| 6xxx | **Costos de Venta** | Costo de lo que se vendio (mercancia) | Debito |

### 2.2 Partida Doble

Es el principio fundamental de la contabilidad: **todo movimiento de dinero afecta minimo dos cuentas**. Una cuenta se DEBITA y otra se ACREDITA, y los montos siempre deben ser iguales.

**Ejemplo:** Un cliente paga $500,000 en efectivo por una venta:
- Se DEBITA la cuenta "Caja" (el dinero llego a la caja) → +$500,000
- Se ACREDITA la cuenta "Cuentas por Cobrar" (el cliente ya no debe) → -$500,000

### 2.3 Asiento Contable

Es el registro formal de una transaccion con partida doble. Contiene:
- Fecha
- Descripcion de la operacion
- Lineas con las cuentas afectadas (debito y credito)
- Referencia al documento origen (factura, pago, compra)

### 2.4 Naturaleza de las Cuentas

| Naturaleza | Aumenta con | Disminuye con | Cuentas |
|------------|-------------|---------------|---------|
| **Debito** | Debito | Credito | Activos, Gastos, Costos |
| **Credito** | Credito | Debito | Pasivos, Patrimonio, Ingresos |

---

## 3. Como Funciona el Sistema

### 3.1 Configuracion Inicial

Al activar el modulo contable, el administrador debe:

1. **Revisar el Plan de Cuentas**: El sistema viene con un PUC base colombiano precargado. El admin puede agregar subcuentas y auxiliares especificos de la empresa.

2. **Vincular Cajas a Cuentas Contables**: Cada caja registradora (menor, mayor, banco) se asocia a una cuenta del PUC:
   - Caja Menor "POS 1" → Cuenta 110505 (Caja General)
   - Caja Mayor "Principal" → Cuenta 110510 (Caja Mayor)
   - Banco "Bancolombia" → Cuenta 111005 (Bancos Nacionales)

3. **Vincular Proveedores a Cuentas**: Cada proveedor puede tener una cuenta contable asignada:
   - Proveedor "Distribuidora XYZ" → Cuenta 220505 (Proveedores Nacionales)

4. **Configurar Cuentas por Tipo de Venta**: Definir a que cuenta van los ingresos segun el tipo:
   - Ventas POS → Cuenta 413536 (Comercio al por menor)
   - Factura Electronica → Cuenta 413535 (Comercio al por mayor)
   - Cuenta de Cobro → Cuenta 413540 (Servicios)

### 3.2 Operacion Automatica (Observer)

Una vez configurado, el sistema genera asientos contables **automaticamente** cada vez que ocurre una transaccion financiera:

#### Cuando se crea una VENTA:

```
Ejemplo: Venta POS por $1,190,000 (IVA incluido) a credito

ASIENTO AUTOMATICO:
  Debito  130505 - CxC Clientes        $1,190,000  (el cliente nos debe)
  Credito 413536 - Ingresos por Ventas $1,000,000  (ganamos por la venta)
  Credito 240804 - IVA por Pagar         $190,000  (debemos IVA al estado)
```

#### Cuando un CLIENTE PAGA:

```
Ejemplo: Cliente paga $500,000 en efectivo en Caja POS 1

ASIENTO AUTOMATICO:
  Debito  110505 - Caja (POS 1)          $500,000  (entro plata a la caja)
  Credito 130505 - CxC Clientes          $500,000  (el cliente ya debe menos)
```

#### Cuando se registra una COMPRA a proveedor:

```
Ejemplo: Compra de mercancia por $1,000,000 + IVA a Distribuidora XYZ

ASIENTO AUTOMATICO:
  Debito  143505 - Inventario Mercancia   $840,000  (mas inventario)
  Debito  240805 - IVA Descontable        $160,000  (IVA que podemos descontar)
  Credito 220505 - CxP Proveedores      $1,000,000  (le debemos al proveedor)
```

#### Cuando se PAGA a un proveedor:

```
Ejemplo: Pago de $1,000,000 a proveedor desde Caja Mayor

ASIENTO AUTOMATICO:
  Debito  220505 - CxP Proveedores     $1,000,000  (ya no le debemos)
  Credito 110510 - Caja Mayor          $1,000,000  (salio plata de la caja)
```

#### Cuando se hace una TRANSFERENCIA entre cajas:

```
Ejemplo: Transferencia de $200,000 de Caja Menor a Caja Mayor

ASIENTO AUTOMATICO:
  Debito  110510 - Caja Mayor            $200,000  (entro a caja mayor)
  Credito 110505 - Caja Menor            $200,000  (salio de caja menor)
```

#### Cuando se emite una NOTA CREDITO:

```
Ejemplo: Anulacion de factura por $500,000

ASIENTO AUTOMATICO:
  Debito  417505 - Devolucion en Ventas   $500,000  (se redujo la venta)
  Credito 130505 - CxC Clientes          $500,000  (ya no nos deben)
```

### 3.3 Asientos Manuales

Ademas de los automaticos, el contador puede crear asientos manuales para registrar:
- Gastos generales (arriendo, servicios publicos, nomina)
- Ajustes contables
- Depreciaciones
- Provisiones
- Cualquier operacion que no pase por ventas/compras/cajas

### 3.4 Periodos Contables

El sistema maneja periodos mensuales:
- Cada mes se puede **cerrar**, impidiendo modificaciones a asientos de ese periodo
- Al cierre del ano, se hace el cierre fiscal (cuentas de resultado se llevan a patrimonio)
- Solo el admin/contador puede cerrar y reabrir periodos

---

## 4. Reportes Disponibles

### 4.1 Libro Diario
Lista cronologica de **todos los asientos contables** con sus lineas de debito y credito. Permite ver que paso dia a dia.

### 4.2 Libro Mayor
Vista por **cuenta individual**: muestra todos los movimientos de una cuenta especifica con su saldo acumulado. Ejemplo: "Mostrame todos los movimientos de la cuenta Caja Menor en enero".

### 4.3 Balance de Comprobacion
Resumen de **todas las cuentas** con sus saldos debito y credito. Sirve para verificar que la contabilidad esta cuadrada (suma debitos = suma creditos).

### 4.4 Balance General
Estado financiero que muestra la posicion de la empresa en un momento dado:
- **Activos** (lo que tiene) = **Pasivos** (lo que debe) + **Patrimonio** (capital)

### 4.5 Estado de Resultados (PyG)
Muestra si la empresa gano o perdio en un periodo:
- **Ingresos** - **Costos** - **Gastos** = **Utilidad (o Perdida)**

---

## 5. Roles y Acceso

| Accion | Super Admin | Admin | Contador | Cajero |
|--------|:-----------:|:-----:|:--------:|:------:|
| Ver modulo contable | Si | Si | Si | No |
| Gestionar plan de cuentas | Si | Si | Si | No |
| Crear asientos manuales | Si | No | Si | No |
| Anular asientos | Si | No | Si | No |
| Ver reportes contables | Si | Si | Si | No |
| Cerrar periodos | Si | No | Si | No |
| Configurar vinculaciones | Si | Si | Si | No |

---

## 6. Flujo de Usuario

### Configuracion (una sola vez):
```
Admin abre "Contabilidad > Configuracion"
  → Revisa plan de cuentas precargado
  → Agrega subcuentas especificas si necesita
  → Va a "Vinculaciones"
  → Asigna cada caja a su cuenta contable
  → Asigna proveedores a cuentas de CxP
  → Configura cuentas por tipo de venta
  → Listo! El sistema empieza a generar asientos automaticos
```

### Operacion diaria (automatica):
```
Cajero realiza venta → Asiento contable se genera solo
Cajero recibe pago → Asiento contable se genera solo
Admin registra compra → Asiento contable se genera solo
Admin paga proveedor → Asiento contable se genera solo
```

### Consulta (cuando se necesite):
```
Contador abre "Contabilidad > Libro Mayor"
  → Selecciona cuenta y rango de fechas
  → Ve todos los movimientos con saldos
  → Exporta a Excel/PDF si necesita
```

### Cierre mensual:
```
Contador abre "Contabilidad > Periodos"
  → Verifica balance de comprobacion (debitos = creditos)
  → Cierra el mes
  → Los asientos de ese mes ya no se pueden modificar
```
