<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Cajas Registradoras", description="CRUD de cajas registradoras físicas y bancarias")
 * @OA\Tag(name="Sesiones de Caja", description="Apertura, cierre y resumen de sesiones de caja")
 * @OA\Tag(name="Transferencias entre Cajas", description="Transferencias de dinero entre cajas registradoras")
 * @OA\Tag(name="Métodos de Pago", description="CRUD de métodos de pago (efectivo, tarjeta, transferencia, etc.)")
 * @OA\Tag(name="Pagos", description="Registro de ingresos y egresos, cancelación de pagos")
 */
class CashPaymentDocs
{
    // ===== CAJAS REGISTRADORAS =====

    /**
     * @OA\Get(path="/cash-registers", summary="Listar cajas registradoras", description="Filtros por tipo, estado, búsqueda, sucursal. Permiso: cash-registers.view", tags={"Cajas Registradoras"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="type", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="status", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="branch_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Lista paginada", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="object")
     *     ))
     * )
     */
    public function indexCashRegisters() {}

    /**
     * @OA\Get(path="/cash-registers/{cashRegister}", summary="Ver caja registradora", tags={"Cajas Registradoras"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Caja con últimas 10 sesiones")
     * )
     */
    public function showCashRegister() {}

    /**
     * @OA\Post(path="/cash-registers", summary="Crear caja registradora", description="Permiso: cash-registers.manage", tags={"Cajas Registradoras"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","type"},
     *         @OA\Property(property="name", type="string", example="Caja Principal"),
     *         @OA\Property(property="type", type="string", example="physical"),
     *         @OA\Property(property="account_number", type="string", nullable=true),
     *         @OA\Property(property="payment_method_id", type="integer", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Caja creada")
     * )
     */
    public function storeCashRegister() {}

    /**
     * @OA\Put(path="/cash-registers/{cashRegister}", summary="Actualizar caja registradora", tags={"Cajas Registradoras"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Caja actualizada")
     * )
     */
    public function updateCashRegister() {}

    /**
     * @OA\Delete(path="/cash-registers/{cashRegister}", summary="Eliminar caja registradora", description="No se puede eliminar si está abierta o tiene sesiones activas.", tags={"Cajas Registradoras"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Eliminada"),
     *     @OA\Response(response=400, description="Caja abierta o con sesiones activas")
     * )
     */
    public function destroyCashRegister() {}

    // ===== SESIONES =====

    /**
     * @OA\Get(path="/cash-sessions", summary="Listar sesiones de caja", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cash_register_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="status", in="query", description="open o closed", @OA\Schema(type="string")),
     *     @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Lista paginada de sesiones")
     * )
     */
    public function indexSessions() {}

    /**
     * @OA\Get(path="/cash-sessions/{session}", summary="Ver sesión", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="session", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Sesión con pagos detallados")
     * )
     */
    public function showSession() {}

    /**
     * @OA\Post(path="/cash-registers/{cashRegister}/open", summary="Abrir sesión de caja", description="Permiso: cash-registers.open", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"opening_balance"},
     *         @OA\Property(property="opening_balance", type="number", example=500000)
     *     )),
     *     @OA\Response(response=201, description="Sesión abierta"),
     *     @OA\Response(response=400, description="Ya tiene sesión activa")
     * )
     */
    public function openSession() {}

    /**
     * @OA\Post(path="/cash-sessions/{session}/close", summary="Cerrar sesión de caja", description="Permiso: cash-registers.close", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="session", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"closing_balance"},
     *         @OA\Property(property="closing_balance", type="number", example=750000),
     *         @OA\Property(property="transfer_to_cash_register_id", type="integer", nullable=true),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=200, description="Sesión cerrada con diferencia calculada")
     * )
     */
    public function closeSession() {}

    /**
     * @OA\Get(path="/cash-sessions/{session}/summary", summary="Resumen de sesión", description="Totales por método de pago, ingresos y egresos.", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="session", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Resumen detallado")
     * )
     */
    public function sessionSummary() {}

    /**
     * @OA\Get(path="/cash-registers/{cashRegister}/current-session", summary="Sesión actual de caja", tags={"Sesiones de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Sesión actual con últimos pagos"),
     *     @OA\Response(response=404, description="No hay sesión activa")
     * )
     */
    public function currentSession() {}

    // ===== TRANSFERENCIAS =====

    /**
     * @OA\Get(path="/cash-transfers", summary="Listar transferencias", description="Permiso: cash-transfers.view", tags={"Transferencias entre Cajas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="status", in="query", @OA\Schema(type="string", enum={"completed","cancelled"})),
     *     @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Lista con summary de totales")
     * )
     */
    public function indexTransfers() {}

    /**
     * @OA\Get(path="/cash-transfers/{transfer}", summary="Ver transferencia", tags={"Transferencias entre Cajas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Transferencia con cajas origen/destino")
     * )
     */
    public function showTransfer() {}

    /**
     * @OA\Post(path="/cash-transfers", summary="Crear transferencia", description="Permiso: cash-transfers.create", tags={"Transferencias entre Cajas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"source_cash_register_id","destination_cash_register_id","amount"},
     *         @OA\Property(property="source_cash_register_id", type="integer"),
     *         @OA\Property(property="destination_cash_register_id", type="integer"),
     *         @OA\Property(property="amount", type="number", example=200000),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Transferencia creada")
     * )
     */
    public function storeTransfer() {}

    /**
     * @OA\Post(path="/cash-transfers/{transfer}/cancel", summary="Cancelar transferencia", description="Permiso: cash-transfers.cancel", tags={"Transferencias entre Cajas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="transfer", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"reason"},
     *         @OA\Property(property="reason", type="string", example="Transferencia duplicada")
     *     )),
     *     @OA\Response(response=200, description="Transferencia cancelada"),
     *     @OA\Response(response=400, description="Ya está cancelada")
     * )
     */
    public function cancelTransfer() {}

    // ===== MÉTODOS DE PAGO =====

    /**
     * @OA\Get(path="/payment-methods", summary="Listar métodos de pago", tags={"Métodos de Pago"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="type", in="query", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Lista paginada")
     * )
     */
    public function indexPaymentMethods() {}

    /**
     * @OA\Get(path="/payment-methods/{paymentMethod}", summary="Ver método de pago", tags={"Métodos de Pago"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="paymentMethod", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Método de pago")
     * )
     */
    public function showPaymentMethod() {}

    /**
     * @OA\Post(path="/payment-methods", summary="Crear método de pago", tags={"Métodos de Pago"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","type"},
     *         @OA\Property(property="name", type="string", example="Nequi"),
     *         @OA\Property(property="type", type="string", example="digital"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Método creado")
     * )
     */
    public function storePaymentMethod() {}

    /**
     * @OA\Put(path="/payment-methods/{paymentMethod}", summary="Actualizar método de pago", tags={"Métodos de Pago"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="paymentMethod", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Método actualizado")
     * )
     */
    public function updatePaymentMethod() {}

    /**
     * @OA\Delete(path="/payment-methods/{paymentMethod}", summary="Eliminar método de pago", description="No se puede eliminar tipo 'system' ni con pagos.", tags={"Métodos de Pago"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="paymentMethod", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Eliminado"),
     *     @OA\Response(response=400, description="Es del sistema o tiene pagos")
     * )
     */
    public function destroyPaymentMethod() {}

    // ===== PAGOS =====

    /**
     * @OA\Get(path="/payments", summary="Listar pagos", description="Filtros por tipo, estado, método, caja, fechas. Permiso: payments.view", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="type", in="query", description="income o expense", @OA\Schema(type="string")),
     *     @OA\Parameter(name="status", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="payment_method_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="cash_register_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="date_from", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Response(response=200, description="Lista paginada de pagos")
     * )
     */
    public function indexPayments() {}

    /**
     * @OA\Get(path="/payments/sales-pending", summary="Ventas con saldo pendiente", description="Para seleccionar al registrar ingreso. Permiso: payments.create-income", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Ventas pendientes de pago")
     * )
     */
    public function salesPending() {}

    /**
     * @OA\Get(path="/payments/purchases-pending", summary="Compras con saldo pendiente", description="Para seleccionar al registrar egreso. Permiso: payments.create-expense", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Compras pendientes de pago")
     * )
     */
    public function purchasesPending() {}

    /**
     * @OA\Post(path="/payments/income", summary="Registrar pago de ingreso", description="Abono de cliente por venta. Permiso: payments.create-income", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"sale_id","cash_register_id","payment_method_id","amount"},
     *         @OA\Property(property="sale_id", type="integer"),
     *         @OA\Property(property="cash_register_id", type="integer"),
     *         @OA\Property(property="payment_method_id", type="integer"),
     *         @OA\Property(property="amount", type="number", example=150000),
     *         @OA\Property(property="reference", type="string", nullable=true),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Pago registrado")
     * )
     */
    public function storeIncome() {}

    /**
     * @OA\Post(path="/payments/expense", summary="Registrar pago de egreso", description="Pago a proveedor por compra. Permiso: payments.create-expense", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"purchase_id","cash_register_id","payment_method_id","amount"},
     *         @OA\Property(property="purchase_id", type="integer"),
     *         @OA\Property(property="cash_register_id", type="integer"),
     *         @OA\Property(property="payment_method_id", type="integer"),
     *         @OA\Property(property="amount", type="number", example=500000),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Pago registrado")
     * )
     */
    public function storeExpense() {}

    /**
     * @OA\Get(path="/payments/{payment}", summary="Ver pago", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Pago con relaciones")
     * )
     */
    public function showPayment() {}

    /**
     * @OA\Post(path="/payments/{payment}/cancel", summary="Cancelar pago", description="Permiso: payments.manage", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"cancellation_reason"},
     *         @OA\Property(property="cancellation_reason", type="string", example="Error en el monto")
     *     )),
     *     @OA\Response(response=200, description="Pago cancelado")
     * )
     */
    public function cancelPayment() {}

    /**
     * @OA\Get(path="/purchases/{purchase}/payment-summary", summary="Resumen de pagos de compra", tags={"Pagos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="purchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Resumen con total pagado y saldo pendiente")
     * )
     */
    public function purchasePaymentSummary() {}
}
