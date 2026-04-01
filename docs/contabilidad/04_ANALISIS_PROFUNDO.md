# Analisis Profundo - Cuentas Contables y su Integracion con el Sistema

## 1. Las Cuentas Contables en Colombia: Marco Completo

### 1.1 El PUC (Plan Unico de Cuentas)

El PUC esta regulado por el Decreto 2650 de 1993 y es la base de codificacion contable en Colombia. Define **9 clases** de cuentas:

| Clase | Nombre | Naturaleza | Que registra |
|-------|--------|------------|-------------|
| **1** | **Activo** | Debito | Lo que la empresa POSEE: dinero, inventario, lo que le deben clientes, propiedades |
| **2** | **Pasivo** | Credito | Lo que la empresa DEBE: proveedores, impuestos, prestamos, nomina |
| **3** | **Patrimonio** | Credito | Capital de los socios, utilidades acumuladas, reservas |
| **4** | **Ingresos** | Credito | Dinero ganado: ventas, servicios, otros ingresos |
| **5** | **Gastos** | Debito | Dinero gastado en operar: arriendo, servicios, nomina, comisiones |
| **6** | **Costos de Ventas** | Debito | Costo de la mercancia vendida (lo que costo lo que se vendio) |
| **7** | **Costos de Produccion** | Debito | Para empresas que fabrican (materia prima, mano de obra, CIF) |
| **8** | **Cuentas de Orden Deudoras** | Debito | Memorandum: bienes recibidos en garantia, compromisos futuros |
| **9** | **Cuentas de Orden Acreedoras** | Credito | Memorandum: bienes entregados en garantia, responsabilidades |

### 1.2 Jerarquia del PUC (6 niveles)

```
Nivel 1 - CLASE (1 digito):        1 = Activo
Nivel 2 - GRUPO (2 digitos):       11 = Disponible
Nivel 3 - CUENTA (4 digitos):      1105 = Caja
Nivel 4 - SUBCUENTA (6 digitos):   110505 = Caja General
Nivel 5 - AUXILIAR (8+ digitos):   11050501 = Caja Sucursal Norte
Nivel 6 - SUB-AUXILIAR (empresa):  1105050101 = Caja POS 1 Sucursal Norte
```

**Regla importante:** Solo las cuentas de ultimo nivel (hojas) reciben movimientos. Las cuentas padre solo acumulan saldos de sus hijas.

### 1.3 NIIF y su Relacion con el PUC

Colombia adopto las NIIF (Normas Internacionales de Informacion Financiera) mediante la Ley 1314 de 2009. Las empresas se clasifican en 3 grupos:

| Grupo | Norma | Aplica a |
|-------|-------|---------|
| **Grupo 1** | NIIF Plenas (IFRS Full) | Grandes empresas, emisoras de valores, entidades de interes publico |
| **Grupo 2** | NIIF para Pymes (IFRS for SMEs) | Medianas y pequenas empresas (la mayoria) |
| **Grupo 3** | Contabilidad Simplificada | Microempresas |

**Para este proyecto:** Lo mas probable es que las empresas clientes sean **Grupo 2 (NIIF Pymes)** o **Grupo 3**. El PUC sigue siendo la base de codificacion, pero los criterios de reconocimiento y medicion se ajustan a NIIF.

**Diferencia practica:**
- El PUC define COMO codificar las cuentas (estructura numerica)
- Las NIIF definen CUANDO y COMO registrar transacciones (criterios de reconocimiento, medicion, presentacion)
- Ambos coexisten: se usa el PUC como catalogo y las NIIF como reglas

---

## 2. Reportes que el Sistema DEBE Poder Exportar

### 2.1 Libros Contables Obligatorios (Codigo de Comercio, Art. 49-56)

| Libro | Que contiene | Formato | Periodicidad |
|-------|-------------|---------|-------------|
| **Libro Diario** | Todos los asientos contables en orden cronologico | PDF / Excel | Continuo, consulta por rango de fechas |
| **Libro Mayor y Balances** | Movimientos por cuenta con saldos | PDF / Excel | Mensual |
| **Libro de Inventarios y Balances** | Inventario valorizado + balance general al cierre | PDF / Excel | Anual (cierre fiscal) |

### 2.2 Estados Financieros (NIIF - NIC 1)

| Estado Financiero | Que muestra | Detalle |
|-------------------|-------------|---------|
| **Estado de Situacion Financiera** (Balance General) | Foto de la empresa a una fecha: Activos = Pasivos + Patrimonio | Activos corrientes/no corrientes, Pasivos corrientes/no corrientes |
| **Estado de Resultados Integral** (PyG) | Ganancias o perdidas del periodo: Ingresos - Costos - Gastos = Utilidad | Ingresos operacionales, costo de ventas, utilidad bruta, gastos, utilidad operacional, otros ingresos/gastos, utilidad neta |
| **Estado de Flujos de Efectivo** | Como se movio el efectivo: Operacion + Inversion + Financiacion | Metodo directo o indirecto |
| **Estado de Cambios en el Patrimonio** | Como cambio el capital de los socios | Capital, reservas, utilidades, dividendos |
| **Notas a los Estados Financieros** | Explicaciones y politicas contables | Texto libre con tablas detalle |

### 2.3 Reportes de Gestion Interna

| Reporte | Que muestra | Para quien |
|---------|-------------|-----------|
| **Balance de Comprobacion** | Todas las cuentas con saldos debito/credito (verifica que cuadra) | Contador |
| **Libro Mayor por Cuenta** | Movimientos detallados de UNA cuenta | Contador |
| **Auxiliar por Tercero** | Movimientos de una cuenta filtrados por cliente/proveedor | Contador, Admin |
| **Informe de Caja** | Movimientos de caja con apertura/cierre | Cajero, Admin |
| **Cartera por Edades (Aging)** | CxC clasificadas por dias de mora (0-30, 31-60, 61-90, 90+) | Admin, Cobros |
| **Cuentas por Pagar por Vencer** | CxP clasificadas por fecha de vencimiento | Admin, Tesoreria |
| **Conciliacion Bancaria** | Comparar saldo libros vs saldo banco | Contador |
| **Informe de Retenciones** | Retenciones practicadas y recibidas del periodo | Contador, DIAN |
| **Informe de IVA** | IVA generado vs IVA descontable del periodo | Contador, DIAN |
| **Costo de Ventas** | Detalle del costo de mercancia vendida | Admin, Contador |
| **Movimiento por Centro de Costo** | Ingresos/gastos por sucursal | Gerencia |

### 2.4 Reportes Tributarios (para la DIAN)

| Reporte | Que es | Periodicidad |
|---------|--------|-------------|
| **Declaracion de IVA** | IVA cobrado (generado) - IVA pagado (descontable) = IVA a pagar | Bimestral o cuatrimestral |
| **Declaracion de Retencion en la Fuente** | Retenciones practicadas a terceros | Mensual |
| **Declaracion de ICA** | Impuesto de industria y comercio | Bimestral (varia por municipio) |
| **Informacion Exogena** | Reporte masivo de todas las transacciones con terceros | Anual |
| **Declaracion de Renta** | Resumen fiscal del ano | Anual |
| **Certificados de Retencion** | Certificado emitido a cada proveedor/cliente con retenciones practicadas | Anual |

### 2.5 Formatos de Exportacion

Cada reporte debe poder exportarse en:
- **PDF** - Para presentar, imprimir, archivar
- **Excel (XLSX)** - Para analisis, manipulacion, enviar al contador
- **CSV** - Para importar a otros sistemas contables (Siigo, Alegra, World Office)

---

## 3. Integracion con Cada Componente del Sistema

### 3.1 CAJAS REGISTRADORAS → Cuentas Contables

#### Mapeo de tipos de caja a cuentas PUC:

```
CashRegister.type = 'minor' (Caja Menor)
  → Cuenta PUC: 110510 - Cajas Menores
  → Subcuenta auxiliar por cada caja: 11051001 "Caja POS Sucursal Norte"

CashRegister.type = 'major' (Caja Mayor/General)
  → Cuenta PUC: 110505 - Caja General
  → Subcuenta auxiliar por cada caja: 11050501 "Caja Mayor Principal"

CashRegister.type = 'bank' (Banco)
  → Cuenta PUC: 111005 - Bancos Nacionales
  → Subcuenta auxiliar por cada banco: 11100501 "Bancolombia Cta 12345"
```

#### Operaciones de caja y sus asientos:

**Apertura de sesion (Caja Menor):**
- Si el saldo de apertura es dinero nuevo (fondo fijo):
  ```
  Debito  110510 Caja Menor     $300,000
  Credito 110505 Caja Mayor     $300,000
  ```
- Si es continuacion del saldo anterior: no genera asiento

**Cierre de sesion con FALTANTE ($5,000 de menos):**
```
Debito  530505 Faltantes de Caja    $5,000   (Gasto)
Credito 110510 Caja Menor           $5,000   (Reduccion del activo)
```

**Cierre de sesion con SOBRANTE ($3,000 de mas):**
```
Debito  110510 Caja Menor           $3,000   (Aumento del activo)
Credito 429595 Sobrantes de Caja    $3,000   (Ingreso no operacional)
```

**Transferencia entre cajas ($200,000 de Caja Menor a Caja Mayor):**
```
Debito  110505 Caja Mayor           $200,000
Credito 110510 Caja Menor           $200,000
```

**Transferencia de Caja Mayor a Banco ($1,000,000 consignacion):**
```
Debito  111005 Bancos Nacionales    $1,000,000
Credito 110505 Caja Mayor           $1,000,000
```

### 3.2 VENTAS (FACTURAS) → Cuentas Contables

#### Venta POS al contado con IVA:

Venta de mercancia por $1,000,000 + IVA 19%, pago en efectivo en Caja POS 1:

```
--- Reconocimiento de la venta ---
Debito  130505 CxC Clientes             $1,190,000
Credito 413536 Ventas por Menor          $1,000,000
Credito 240804 IVA Generado 19%            $190,000

--- Cobro inmediato ---
Debito  110510 Caja POS 1               $1,190,000
Credito 130505 CxC Clientes             $1,190,000

--- Costo de lo vendido ---
Debito  613524 Costo Mercancia Vendida     $650,000   (cantidad x costo promedio)
Credito 143505 Inventario Mercancia        $650,000
```

#### Venta a credito (Cuenta de Cobro) con retenciones:

Servicio por $5,000,000 + IVA, cliente retiene ReteFuente 4% y ReteICA 0.414%:

```
Calculo:
  Subtotal:    $5,000,000
  IVA 19%:       $950,000
  Bruto:       $5,950,000
  ReteFuente:   -$200,000  (4% sobre $5,000,000)
  ReteICA:       -$20,700  (0.414% sobre $5,000,000)
  Total a cobrar: $5,729,300

Asiento:
Debito  130505 CxC Clientes             $5,729,300  (lo que realmente nos van a pagar)
Debito  135515 Anticipo ReteFuente         $200,000  (el estado nos debe esto)
Debito  135517 Anticipo ReteICA             $20,700  (el municipio nos debe esto)
Credito 413540 Ingresos por Servicios    $5,000,000
Credito 240804 IVA Generado 19%            $950,000
```

#### Abono/pago parcial de cliente:

Cliente paga $2,000,000 de una factura pendiente via transferencia bancaria:

```
Debito  111005 Bancos Nacionales         $2,000,000
Credito 130505 CxC Clientes             $2,000,000
```

#### Nota Credito (anulacion de factura):

Se anula una factura de $1,190,000 (con IVA):

```
--- Reversion de ingresos ---
Debito  417505 Devoluciones en Ventas    $1,000,000
Debito  240804 IVA Generado 19%           $190,000
Credito 130505 CxC Clientes             $1,190,000

--- Reversion del costo ---
Debito  143505 Inventario Mercancia        $650,000
Credito 613524 Costo Mercancia Vendida     $650,000
```

#### Nota Debito (aumento de valor):

Se agrega $200,000 + IVA a una factura existente:

```
Debito  130505 CxC Clientes               $238,000
Credito 413536 Ventas por Menor            $200,000
Credito 240804 IVA Generado 19%             $38,000
```

#### Comision del vendedor:

Venta con 5% de comision sobre $1,000,000:

```
Debito  513530 Gastos Comisiones            $50,000
Credito 233540 Comisiones por Pagar         $50,000
```

### 3.3 COMPRAS (PROVEEDORES) → Cuentas Contables

#### Compra de mercancia con IVA:

Compra de inventario por $2,000,000 + IVA 19% a proveedor:

```
--- Al recibir la mercancia ---
Debito  143505 Inventario Mercancia      $2,000,000
Debito  240805 IVA Descontable             $380,000
Credito 220505 CxP Proveedores          $2,380,000
```

#### Compra con retenciones (nosotros retenemos al proveedor):

Compra por $3,000,000, nosotros retenemos ReteFuente 2.5%:

```
Debito  143505 Inventario Mercancia      $3,000,000
Credito 220505 CxP Proveedores          $2,925,000  (lo que le vamos a pagar)
Credito 236540 ReteFuente por Pagar         $75,000  (lo que le retuvimos y debemos a DIAN)
```

#### Pago a proveedor:

Pago de $2,380,000 desde Caja Mayor:

```
Debito  220505 CxP Proveedores          $2,380,000
Credito 110505 Caja Mayor               $2,380,000
```

#### Pago parcial / abono a proveedor:

Abono de $1,000,000 via transferencia bancaria:

```
Debito  220505 CxP Proveedores          $1,000,000
Credito 111005 Bancos Nacionales         $1,000,000
```

### 3.4 INVENTARIO → Cuentas Contables

#### Ajuste positivo (sobrante de inventario):

Se encontraron 10 unidades extra en conteo fisico (costo promedio $25,000):

```
Debito  143505 Inventario Mercancia        $250,000
Credito 429510 Sobrantes de Inventario     $250,000
```

#### Ajuste negativo (faltante/dano):

Se perdieron 5 unidades (costo promedio $25,000):

```
Debito  530515 Perdida de Inventario       $125,000   (Gasto)
Credito 143505 Inventario Mercancia        $125,000
```

#### Transferencia entre bodegas:

Mover 20 unidades de Bodega A a Bodega B (mismo costo):

```
(Registro memorandum - no afecta PyG)
Debito  143505-B Inventario Bodega B       $500,000
Credito 143505-A Inventario Bodega A       $500,000
```

### 3.5 GASTOS GENERALES (Asientos Manuales)

Estos son gastos que actualmente NO se pueden registrar en el sistema porque no son ventas ni compras:

#### Pago de arriendo:

```
Debito  512010 Arrendamientos            $2,500,000
Credito 111005 Bancos Nacionales         $2,500,000
```

#### Pago de servicios publicos:

```
Debito  513525 Acueducto y Alcantarillado   $180,000
Debito  513530 Energia Electrica            $350,000
Debito  513535 Telefono e Internet          $120,000
Credito 111005 Bancos Nacionales            $650,000
```

#### Pago de nomina (simplificado):

```
Debito  510506 Sueldos                   $4,000,000
Debito  510527 Auxilio de Transporte       $162,000
Debito  510568 Aportes ARL                  $20,880
Debito  510570 Aportes EPS Empleador       $340,000
Debito  510572 Aportes Pension Empleador   $480,000
Debito  510578 Aportes SENA/ICBF/Caja      $360,000
Credito 250505 Salarios por Pagar        $3,700,000  (neto a pagar al empleado)
Credito 237005 Aportes EPS por Pagar       $500,000  (retencion empleado + empleador)
Credito 237006 Aportes Pension por Pagar   $640,000
Credito 236505 ReteFuente Salarios         $120,000
Credito 261005 Cesantias por Pagar         $347,000
Credito 261505 Intereses Cesantias          $41,640
Credito 262505 Vacaciones por Pagar        $173,500
Credito 271005 Prestaciones por Pagar       $20,740
```

### 3.6 OPERACIONES ESPECIALES

#### Provision de cartera (deudas incobrables):

Cliente debe $500,000 hace mas de 360 dias:

```
Debito  519910 Provision Deudores Varios   $500,000   (Gasto)
Credito 139905 Provision CxC Clientes      $500,000   (Contra-activo)
```

#### Castigo de cartera (se da por perdida):

```
Debito  139905 Provision CxC Clientes      $500,000   (Contra el provision)
Credito 130505 CxC Clientes               $500,000   (Se elimina la CxC)
```

#### Depreciacion mensual de activos fijos:

Equipo de computo con depreciacion mensual de $83,333:

```
Debito  516010 Depreciacion Eq. Computo     $83,333   (Gasto)
Credito 159215 Depreciacion Acum. Eq.       $83,333   (Contra-activo)
```

---

## 4. Cuentas PUC Clave para Este Sistema

### 4.1 Activos (Clase 1) - Lo que tenemos

```
1105    Caja
110505  Caja General (Caja Mayor)
110510  Cajas Menores (Cajas POS)

1110    Bancos
111005  Bancos Nacionales (Bancolombia, Davivienda, etc.)

1305    Clientes (Cuentas por Cobrar)
130505  Clientes Nacionales

1355    Anticipos de Impuestos / Retenciones a Favor
135515  Retencion en la Fuente a Favor
135517  Retencion de ICA a Favor
135519  Retencion de IVA a Favor

1399    Provision Cartera (contra-activo, saldo credito)
139905  Provision CxC Clientes

1435    Inventarios - Mercancias
143505  Mercancia no Fabricada por la Empresa

1524    Equipo de Oficina (si aplica)
1528    Equipo de Computacion (si aplica)
1592    Depreciacion Acumulada (contra-activo)
```

### 4.2 Pasivos (Clase 2) - Lo que debemos

```
2205    Proveedores
220505  Proveedores Nacionales

2335    Costos y Gastos por Pagar
233540  Comisiones por Pagar

2365    Retencion en la Fuente por Pagar (que le retuvimos a otros)
236540  Compras (retefuente que le quitamos al proveedor)
236570  Honorarios y Servicios

2367    Retencion de IVA por Pagar
236701  ReteIVA

2368    Retencion de ICA por Pagar
236801  ReteICA por Pagar

2408    IVA
240804  IVA Generado por Ventas (19%)
240805  IVA Descontable en Compras

2505    Salarios por Pagar
2610    Cesantias por Pagar
2615    Intereses sobre Cesantias
2620    Prima de Servicios
2625    Vacaciones por Pagar
```

### 4.3 Patrimonio (Clase 3)

```
3105    Capital Social / Aportes
3115    Aportes Sociales
3605    Utilidad del Ejercicio
3610    Perdida del Ejercicio
3705    Utilidades Acumuladas
3710    Perdidas Acumuladas
```

### 4.4 Ingresos (Clase 4)

```
4135    Comercio al por Mayor y Menor
413535  Ventas al por Mayor
413536  Ventas al por Menor
413540  Servicios

4175    Devoluciones en Ventas (contra-ingreso, naturaleza debito)
417505  Devoluciones en Ventas

4295    Ingresos Diversos / No Operacionales
429510  Sobrantes de Inventario
429595  Sobrantes de Caja
429599  Otros Ingresos
```

### 4.5 Gastos (Clase 5)

```
5105    Gastos de Personal
510506  Sueldos
510527  Auxilio de Transporte
510530  Cesantias
510533  Intereses sobre Cesantias
510536  Prima de Servicios
510539  Vacaciones
510568  Aportes ARL
510570  Aportes EPS
510572  Aportes Pension

5120    Arrendamientos
512010  Locales / Oficinas

5135    Servicios
513525  Acueducto
513530  Energia
513535  Telefono / Internet
513540  Transporte / Fletes
513595  Otros Servicios

5160    Depreciaciones
516010  Equipo de Computo
516015  Equipo de Oficina

5195    Gastos Diversos
519505  Elementos de Aseo
519510  Utiles y Papeleria
519910  Provision Deudores

5305    Gastos No Operacionales
530505  Faltantes de Caja
530515  Perdida de Inventario
```

### 4.6 Costos de Venta (Clase 6)

```
6135    Comercio al por Mayor y Menor
613524  Costo de Mercancia Vendida (perpetuo)
613536  Costo de Servicios Vendidos
```

---

## 5. Conciliacion Bancaria: Como Funciona

### Que es:
Comparar el saldo contable (libros) de una cuenta bancaria vs el saldo del extracto bancario, e identificar las diferencias.

### Diferencias tipicas:

| Tipo | Ejemplo | En libros | En banco |
|------|---------|-----------|----------|
| Consignaciones en transito | Deposito hoy, banco lo ve manana | SI | NO |
| Cheques pendientes | Giro cheque pero no lo han cobrado | SI (credito) | NO |
| Notas debito bancarias | Cuota manejo, GMF, comisiones | NO | SI |
| Notas credito bancarias | Intereses ganados, transferencias recibidas | NO | SI |
| Errores | Valor mal registrado | Depende | Depende |

### Como se implementaria:

```
conciliacion_bancaria
├── cash_register_id (FK, tipo=bank)
├── period_month / period_year
├── bank_balance (saldo segun extracto)
├── book_balance (saldo segun libros)
├── adjusted_balance (saldo conciliado)
├── status (draft, completed)
├── items: [
│     { tipo: 'nota_debito_banco', concepto: 'Cuota manejo', monto: 15000 },
│     { tipo: 'consignacion_transito', concepto: 'Deposito 02/15', monto: 500000 },
│   ]
```

### Asientos por notas bancarias:

**Nota Debito (cobro del banco - cuota manejo $15,000):**
```
Debito  530505 Gastos Bancarios            $15,000
Credito 111005 Bancos Nacionales           $15,000
```

**Nota Credito (intereses ganados $8,000):**
```
Debito  111005 Bancos Nacionales            $8,000
Credito 421005 Intereses Bancarios          $8,000
```

**GMF (4x1000) sobre movimiento de $5,000,000:**
```
Debito  511505 Gravamen Movimiento Fro     $20,000
Credito 111005 Bancos Nacionales           $20,000
```

---

## 6. Cartera por Edades (Aging Report)

### Estructura:

```
CARTERA DE CLIENTES POR EDADES - Febrero 2026

┌─────────────────┬───────────┬──────────┬──────────┬──────────┬──────────┬────────────┐
│ Cliente          │ Corriente │  1-30    │  31-60   │  61-90   │  90+     │ Total      │
│                  │ (no venc.)│  dias    │  dias    │  dias    │  dias    │            │
├─────────────────┼───────────┼──────────┼──────────┼──────────┼──────────┼────────────┤
│ Juan Perez       │  $500,000 │ $200,000 │          │          │          │   $700,000 │
│ Maria Garcia     │           │          │ $800,000 │          │          │   $800,000 │
│ Empresa ABC      │ $300,000  │          │          │ $150,000 │ $500,000 │   $950,000 │
├─────────────────┼───────────┼──────────┼──────────┼──────────┼──────────┼────────────┤
│ TOTALES          │  $800,000 │ $200,000 │ $800,000 │ $150,000 │ $500,000 │$2,450,000  │
│ % del total      │    32.7%  │    8.2%  │   32.7%  │    6.1%  │   20.4%  │   100%     │
└─────────────────┴───────────┴──────────┴──────────┴──────────┴──────────┴────────────┘

Politica de provision:
  0-30 dias:  0%     →  $0
  31-60 dias: 5%     →  $40,000
  61-90 dias: 10%    →  $15,000
  90+ dias:   33%    →  $165,000
  TOTAL PROVISION:      $220,000
```

### Datos que ya existen para esto:
- `Sale.due_date` → fecha de vencimiento
- `Sale.balance` → saldo pendiente
- `Sale.client_id` → cliente
- La diferencia `today - due_date` da los dias de mora
- Ya existe `BalanceInquiryController` con data de clientes

### Lo que falta:
- Clasificacion por rangos de edad (aging buckets)
- Calculo automatico de provision segun politica
- Asiento de provision mensual

---

## 7. Costo de Ventas (COGS)

### Sistema Perpetuo (el que aplica para este proyecto)

En sistema perpetuo, el costo se registra **en cada venta**, no al final del periodo.

**Cuando se vende:**
```
Debito  613524 Costo Mercancia Vendida    (cant x costo_promedio)
Credito 143505 Inventario Mercancia       (cant x costo_promedio)
```

**Los datos ya existen:**
- `Product.average_cost` → costo promedio ponderado
- `SaleItem.quantity` → cantidad vendida
- `SaleItem.product_id` → producto (para obtener el costo)
- El costo promedio se recalcula en cada compra via `Product.updateAverageCost()`

### Costo Promedio Ponderado (ya implementado)

Formula existente en `Product.updateAverageCost()`:
```
nuevo_promedio = (promedio_actual × stock_actual + costo_nuevo × cantidad_nueva)
                 ÷ (stock_actual + cantidad_nueva)
```

### Lo que falta:
- Registrar el costo al momento de la venta (actualmente solo descuenta stock, no registra costo contable)
- Guardar el `unit_cost_at_sale` en `SaleItem` para trazabilidad

---

## 8. Cierre Contable (Fin de Mes / Fin de Ano)

### Cierre Mensual:

1. Verificar que todos los asientos esten contabilizados (no queden en draft)
2. Generar balance de comprobacion → verificar que debitos = creditos
3. Registrar provisiones (cartera, depreciacion)
4. Cerrar el periodo (bloquear modificaciones)

### Cierre Anual (31 de diciembre):

Las cuentas de **resultado** (clases 4, 5, 6) son temporales - se cierran a 0 y su saldo neto se traslada al patrimonio:

```
Paso 1: Cerrar Ingresos (saldo credito → debito para cerrar)
Debito  413536 Ventas por Menor          $45,000,000
Debito  413535 Ventas por Mayor          $17,000,000
Credito 590505 Ganancias y Perdidas      $62,000,000

Paso 2: Cerrar Costos y Gastos (saldo debito → credito para cerrar)
Debito  590505 Ganancias y Perdidas      $48,500,000
Credito 613524 Costo Mercancia Vendida   $30,000,000
Credito 510506 Sueldos                   $12,000,000
Credito 512010 Arrendamientos             $3,600,000
Credito 513530 Energia                      $900,000
Credito 530505 Faltantes de Caja            $500,000
Credito 519910 Provisiones                $1,500,000

Paso 3: Trasladar resultado al patrimonio
Si hubo utilidad ($62M - $48.5M = $13.5M):
Debito  590505 Ganancias y Perdidas      $13,500,000
Credito 360505 Utilidad del Ejercicio    $13,500,000

Si hubo perdida:
Debito  361005 Perdida del Ejercicio     $X
Credito 590505 Ganancias y Perdidas      $X
```

---

## 9. Gaps Encontrados en el Sistema Actual

### 9.1 Operaciones que EXISTEN pero NO generan contabilidad:

| Operacion | Donde ocurre | Que falta |
|-----------|-------------|-----------|
| Venta creada | SaleController::store() | Asiento de ingreso + IVA + retenciones + COGS |
| Pago de cliente | SaleController::addPayment() | Asiento de caja vs CxC |
| Compra recibida | InventoryPurchaseController::receive() | Asiento de inventario vs CxP |
| Pago a proveedor | PaymentService::registerExpense() | Asiento de CxP vs caja |
| Transferencia cajas | CashRegisterService::transferBetweenRegisters() | Asiento de caja vs caja |
| Cancelacion de pago | PaymentService::cancelPayment() | Asiento inverso |
| Cancelacion de venta | SaleController::cancel() | Asiento inverso de todo |
| Cierre de sesion con diferencia | CashRegisterService::closeSession() | Asiento de faltante/sobrante |
| Ajuste de inventario | InventoryAdjustmentController::store() | Asiento de inventario vs gasto/ingreso |
| Nota debito (aumento factura) | SaleController::updateItems() | Asiento del diferencial |

### 9.2 Operaciones que NO EXISTEN y se necesitan:

| Operacion | Para que |
|-----------|---------|
| Registro de gastos generales | Arriendo, servicios, nomina, papeleria |
| Provision de cartera | Estimacion de deudas incobrables |
| Depreciacion de activos | Desgaste de equipos |
| Conciliacion bancaria | Cuadrar libros vs banco |
| Cierre mensual/anual | Cerrar periodos y trasladar resultados |
| Reporte de IVA | IVA generado - IVA descontable = IVA por pagar |
| Certificados de retencion | Emitir certificados a proveedores/clientes |

### 9.3 Bugs/Gaps detectados en el flujo financiero:

1. **Cancelacion de venta NO revierte pagos:** Cuando se cancela una Sale, se restaura inventario pero los Payment/SalePayment quedan como `completed`. El dinero queda en la caja pero contablemente no cuadra.

2. **IVA en compras no se registra:** `InventoryPurchase.tax_amount` existe pero `calculateTotals()` no lo calcula. No se puede saber el IVA descontable real.

3. **Comisiones no se pagan:** Se calculan en `Sale.commission_amount` pero no hay flujo para pagarlas. El gasto queda registrado pero sin desembolso.

4. **Retenciones son solo informativas:** Se restan del total de la venta pero no se reconcilian contra declaraciones de impuestos.

5. **No hay registro de costo al vender:** Se descuenta stock pero no se registra a que costo promedio se vendio. Sin `unit_cost_at_sale` en SaleItem no se puede reconstruir el costo de ventas.

---

## 10. Resumen Ejecutivo: Que Debe Hacer el Sistema Contable

### Automaticamente (Observers):
- Generar asiento por cada venta, pago, compra, transferencia, ajuste y cancelacion
- Registrar IVA generado y descontable
- Registrar retenciones practicadas y recibidas
- Registrar costo de ventas al momento de la venta
- Registrar faltantes/sobrantes al cierre de sesion

### Manualmente (Contador):
- Crear asientos para gastos generales (arriendo, servicios, nomina)
- Registrar provisiones y depreciaciones
- Hacer conciliacion bancaria
- Cerrar periodos contables

### Reportes exportables:
- Libro Diario, Libro Mayor, Balance de Comprobacion
- Balance General, Estado de Resultados
- Cartera por edades (clientes y proveedores)
- Informe de IVA, Informe de Retenciones
- Costo de Ventas detallado
- Movimientos por caja/banco
- Todo en PDF y Excel
