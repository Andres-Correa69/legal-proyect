<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Ventas", description="Facturación, borradores, PDF, email y gestión de ventas")
 * @OA\Tag(name="Proveedores", description="CRUD de proveedores")
 * @OA\Tag(name="Compras de Inventario", description="CRUD de compras, aprobación, recepción y parsing de facturas")
 * @OA\Tag(name="Bodegas", description="CRUD de bodegas/almacenes")
 * @OA\Tag(name="Ubicaciones", description="CRUD de ubicaciones dentro de bodegas")
 * @OA\Tag(name="Traslados de Inventario", description="Creación, aprobación, tránsito y completado de traslados")
 * @OA\Tag(name="Ajustes de Inventario", description="Creación, aprobación y rechazo de ajustes")
 * @OA\Tag(name="Razones de Ajuste", description="CRUD de razones para ajustes de inventario")
 * @OA\Tag(name="Movimientos de Inventario", description="Consulta de movimientos de entrada/salida")
 * @OA\Tag(name="Alertas de Factura", description="Alertas de vencimiento de facturas")
 */
class SalesInventoryDocs
{
    // ===== VENTAS =====

    /**
     * @OA\Get(path="/sales", summary="Listar ventas", description="Permiso: sales.view", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de ventas")
     * )
     */
    public function indexSales() {}

    /**
     * @OA\Get(path="/sales/stats", summary="Estadísticas de ventas", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Resumen estadístico")
     * )
     */
    public function salesStats() {}

    /**
     * @OA\Get(path="/invoice-alerts", summary="Alertas de factura", description="Facturas próximas a vencer o vencidas.", tags={"Alertas de Factura"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de alertas")
     * )
     */
    public function invoiceAlerts() {}

    /**
     * @OA\Get(path="/sales/{sale}", summary="Ver venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Venta con items, cliente y pagos")
     * )
     */
    public function showSale() {}

    /**
     * @OA\Get(path="/sales/{sale}/pdf", summary="Descargar PDF de venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf"))
     * )
     */
    public function salePdf() {}

    /**
     * @OA\Post(path="/sales", summary="Crear venta", description="Crea y finaliza una venta completa. Permiso: sales.create", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"client_id","items"},
     *         @OA\Property(property="client_id", type="integer"),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object",
     *             @OA\Property(property="product_id", type="integer"),
     *             @OA\Property(property="quantity", type="integer"),
     *             @OA\Property(property="unit_price", type="number"),
     *             @OA\Property(property="discount", type="number")
     *         )),
     *         @OA\Property(property="payment_method_id", type="integer", nullable=true),
     *         @OA\Property(property="cash_register_id", type="integer", nullable=true),
     *         @OA\Property(property="notes", type="string", nullable=true),
     *         @OA\Property(property="due_date", type="string", format="date", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Venta creada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeSale() {}

    /**
     * @OA\Post(path="/sales/draft", summary="Crear borrador de venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="client_id", type="integer", nullable=true),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Borrador creado")
     * )
     */
    public function storeDraft() {}

    /**
     * @OA\Put(path="/sales/{sale}/draft", summary="Actualizar borrador", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrador actualizado")
     * )
     */
    public function updateDraft() {}

    /**
     * @OA\Post(path="/sales/{sale}/finalize", summary="Finalizar borrador", description="Convierte borrador en venta activa.", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Venta finalizada")
     * )
     */
    public function finalizeDraft() {}

    /**
     * @OA\Delete(path="/sales/{sale}/draft", summary="Eliminar borrador", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Borrador eliminado")
     * )
     */
    public function deleteDraft() {}

    /**
     * @OA\Put(path="/sales/{sale}/items", summary="Actualizar items de venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Items actualizados")
     * )
     */
    public function updateItems() {}

    /**
     * @OA\Post(path="/sales/{sale}/payments", summary="Agregar pago a venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Pago agregado")
     * )
     */
    public function addPaymentToSale() {}

    /**
     * @OA\Post(path="/sales/{sale}/cancel", summary="Cancelar venta", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Venta cancelada")
     * )
     */
    public function cancelSale() {}

    /**
     * @OA\Post(path="/sales/{sale}/send-email", summary="Enviar venta por email", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado")
     * )
     */
    public function sendSaleEmail() {}

    /**
     * @OA\Patch(path="/sales/{sale}/due-date", summary="Actualizar fecha de vencimiento", tags={"Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"due_date"},
     *         @OA\Property(property="due_date", type="string", format="date")
     *     )),
     *     @OA\Response(response=200, description="Fecha actualizada")
     * )
     */
    public function updateDueDate() {}

    // ===== PROVEEDORES =====

    /**
     * @OA\Get(path="/suppliers", summary="Listar proveedores", description="Permiso: suppliers.view", tags={"Proveedores"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="Lista paginada")
     * )
     */
    public function indexSuppliers() {}

    /**
     * @OA\Get(path="/suppliers/{supplier}", summary="Ver proveedor", tags={"Proveedores"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Proveedor con últimas compras")
     * )
     */
    public function showSupplier() {}

    /**
     * @OA\Post(path="/suppliers", summary="Crear proveedor", tags={"Proveedores"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","company_id"},
     *         @OA\Property(property="name", type="string", example="Proveedor XYZ"),
     *         @OA\Property(property="contact_name", type="string", nullable=true),
     *         @OA\Property(property="email", type="string", format="email", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="tax_id", type="string", nullable=true),
     *         @OA\Property(property="municipality_id", type="integer", nullable=true),
     *         @OA\Property(property="company_id", type="integer"),
     *         @OA\Property(property="payment_terms", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Proveedor creado")
     * )
     */
    public function storeSupplier() {}

    /**
     * @OA\Put(path="/suppliers/{supplier}", summary="Actualizar proveedor", tags={"Proveedores"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Proveedor actualizado")
     * )
     */
    public function updateSupplier() {}

    /**
     * @OA\Delete(path="/suppliers/{supplier}", summary="Eliminar proveedor", tags={"Proveedores"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado"),
     *     @OA\Response(response=400, description="Tiene compras asociadas")
     * )
     */
    public function destroySupplier() {}

    // ===== COMPRAS =====

    /**
     * @OA\Post(path="/inventory-purchases/parse-invoice", summary="Parsear factura de compra", description="Extrae datos de una factura electrónica XML/PDF.", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Datos extraídos de la factura")
     * )
     */
    public function parseInvoice() {}

    /**
     * @OA\Get(path="/inventory-purchases", summary="Listar compras", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de compras")
     * )
     */
    public function indexPurchases() {}

    /**
     * @OA\Get(path="/inventory-purchases/{inventoryPurchase}", summary="Ver compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Compra con items y proveedor")
     * )
     */
    public function showPurchase() {}

    /**
     * @OA\Post(path="/inventory-purchases", summary="Crear compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"supplier_id","items"},
     *         @OA\Property(property="supplier_id", type="integer"),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Compra creada")
     * )
     */
    public function storePurchase() {}

    /**
     * @OA\Put(path="/inventory-purchases/{inventoryPurchase}", summary="Actualizar compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Compra actualizada")
     * )
     */
    public function updatePurchase() {}

    /**
     * @OA\Delete(path="/inventory-purchases/{inventoryPurchase}", summary="Eliminar compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada")
     * )
     */
    public function destroyPurchase() {}

    /**
     * @OA\Post(path="/inventory-purchases/{inventoryPurchase}/approve", summary="Aprobar compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Compra aprobada")
     * )
     */
    public function approvePurchase() {}

    /**
     * @OA\Post(path="/inventory-purchases/{inventoryPurchase}/receive", summary="Recibir compra", description="Ingresa productos al inventario.", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Compra recibida")
     * )
     */
    public function receivePurchase() {}

    /**
     * @OA\Post(path="/inventory-purchases/{inventoryPurchase}/cancel", summary="Cancelar compra", tags={"Compras de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Compra cancelada")
     * )
     */
    public function cancelPurchase() {}

    // ===== BODEGAS =====

    /**
     * @OA\Get(path="/warehouses", summary="Listar bodegas", tags={"Bodegas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista paginada"))
     */
    public function indexWarehouses() {}

    /**
     * @OA\Get(path="/warehouses/{warehouse}", summary="Ver bodega", tags={"Bodegas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="warehouse", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Bodega"))
     */
    public function showWarehouse() {}

    /**
     * @OA\Post(path="/warehouses", summary="Crear bodega", tags={"Bodegas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"name"}, @OA\Property(property="name", type="string"), @OA\Property(property="address", type="string", nullable=true), @OA\Property(property="is_active", type="boolean"))),
     *     @OA\Response(response=201, description="Bodega creada"))
     */
    public function storeWarehouse() {}

    /**
     * @OA\Put(path="/warehouses/{warehouse}", summary="Actualizar bodega", tags={"Bodegas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="warehouse", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Actualizada"))
     */
    public function updateWarehouse() {}

    /**
     * @OA\Delete(path="/warehouses/{warehouse}", summary="Eliminar bodega", tags={"Bodegas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="warehouse", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada"))
     */
    public function destroyWarehouse() {}

    // ===== UBICACIONES =====

    /**
     * @OA\Get(path="/locations", summary="Listar ubicaciones", tags={"Ubicaciones"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista paginada"))
     */
    public function indexLocations() {}

    /**
     * @OA\Get(path="/locations/{location}", summary="Ver ubicación", tags={"Ubicaciones"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="location", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Ubicación"))
     */
    public function showLocation() {}

    /**
     * @OA\Post(path="/locations", summary="Crear ubicación", tags={"Ubicaciones"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"name","warehouse_id"}, @OA\Property(property="name", type="string"), @OA\Property(property="warehouse_id", type="integer"))),
     *     @OA\Response(response=201, description="Ubicación creada"))
     */
    public function storeLocation() {}

    /**
     * @OA\Put(path="/locations/{location}", summary="Actualizar ubicación", tags={"Ubicaciones"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="location", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Actualizada"))
     */
    public function updateLocation() {}

    /**
     * @OA\Delete(path="/locations/{location}", summary="Eliminar ubicación", tags={"Ubicaciones"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="location", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=204, description="Eliminada"))
     */
    public function destroyLocation() {}

    // ===== TRASLADOS =====

    /**
     * @OA\Get(path="/inventory-transfers", summary="Listar traslados", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista paginada"))
     */
    public function indexTransfers() {}

    /**
     * @OA\Get(path="/inventory-transfers/{inventoryTransfer}", summary="Ver traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Traslado"))
     */
    public function showTransfer() {}

    /**
     * @OA\Post(path="/inventory-transfers", summary="Crear traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"source_warehouse_id","destination_warehouse_id","items"},
     *         @OA\Property(property="source_warehouse_id", type="integer"),
     *         @OA\Property(property="destination_warehouse_id", type="integer"),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object"))
     *     )),
     *     @OA\Response(response=201, description="Traslado creado"))
     */
    public function storeTransfer() {}

    /**
     * @OA\Put(path="/inventory-transfers/{inventoryTransfer}", summary="Actualizar traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Actualizado"))
     */
    public function updateTransfer() {}

    /**
     * @OA\Delete(path="/inventory-transfers/{inventoryTransfer}", summary="Eliminar traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=204, description="Eliminado"))
     */
    public function destroyTransfer() {}

    /**
     * @OA\Post(path="/inventory-transfers/{inventoryTransfer}/approve", summary="Aprobar traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Aprobado"))
     */
    public function approveTransfer() {}

    /**
     * @OA\Post(path="/inventory-transfers/{inventoryTransfer}/reject", summary="Rechazar traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Rechazado"))
     */
    public function rejectTransfer() {}

    /**
     * @OA\Post(path="/inventory-transfers/{inventoryTransfer}/start-transit", summary="Iniciar tránsito", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="En tránsito"))
     */
    public function startTransit() {}

    /**
     * @OA\Post(path="/inventory-transfers/{inventoryTransfer}/complete", summary="Completar traslado", tags={"Traslados de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryTransfer", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Completado"))
     */
    public function completeTransfer() {}

    // ===== RAZONES DE AJUSTE =====

    /**
     * @OA\Get(path="/adjustment-reasons", summary="Listar razones de ajuste", tags={"Razones de Ajuste"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista"))
     */
    public function indexReasons() {}

    /**
     * @OA\Get(path="/adjustment-reasons/{adjustmentReason}", summary="Ver razón", tags={"Razones de Ajuste"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="adjustmentReason", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Razón"))
     */
    public function showReason() {}

    /**
     * @OA\Post(path="/adjustment-reasons", summary="Crear razón", tags={"Razones de Ajuste"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"name","type"}, @OA\Property(property="name", type="string"), @OA\Property(property="type", type="string", enum={"entry","exit"}))),
     *     @OA\Response(response=201, description="Razón creada"))
     */
    public function storeReason() {}

    /**
     * @OA\Put(path="/adjustment-reasons/{adjustmentReason}", summary="Actualizar razón", tags={"Razones de Ajuste"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="adjustmentReason", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Actualizada"))
     */
    public function updateReason() {}

    /**
     * @OA\Delete(path="/adjustment-reasons/{adjustmentReason}", summary="Eliminar razón", tags={"Razones de Ajuste"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="adjustmentReason", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=204, description="Eliminada"))
     */
    public function destroyReason() {}

    // ===== AJUSTES DE INVENTARIO =====

    /**
     * @OA\Get(path="/inventory-adjustments", summary="Listar ajustes", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista paginada"))
     */
    public function indexAdjustments() {}

    /**
     * @OA\Get(path="/inventory-adjustments/{inventoryAdjustment}", summary="Ver ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryAdjustment", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Ajuste"))
     */
    public function showAdjustment() {}

    /**
     * @OA\Post(path="/inventory-adjustments", summary="Crear ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"reason_id","items"},
     *         @OA\Property(property="reason_id", type="integer"),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object")),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Ajuste creado"))
     */
    public function storeAdjustment() {}

    /**
     * @OA\Put(path="/inventory-adjustments/{inventoryAdjustment}", summary="Actualizar ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryAdjustment", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Actualizado"))
     */
    public function updateAdjustment() {}

    /**
     * @OA\Delete(path="/inventory-adjustments/{inventoryAdjustment}", summary="Eliminar ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryAdjustment", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=204, description="Eliminado"))
     */
    public function destroyAdjustment() {}

    /**
     * @OA\Post(path="/inventory-adjustments/{inventoryAdjustment}/approve", summary="Aprobar ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryAdjustment", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Aprobado"))
     */
    public function approveAdjustment() {}

    /**
     * @OA\Post(path="/inventory-adjustments/{inventoryAdjustment}/reject", summary="Rechazar ajuste", tags={"Ajustes de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryAdjustment", in="path", required=true, @OA\Schema(type="integer")), @OA\Response(response=200, description="Rechazado"))
     */
    public function rejectAdjustment() {}

    // ===== MOVIMIENTOS =====

    /**
     * @OA\Get(path="/inventory-movements", summary="Listar movimientos de inventario", description="Solo lectura. Permiso: inventory.movements.view", tags={"Movimientos de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de movimientos"))
     */
    public function indexMovements() {}

    /**
     * @OA\Get(path="/inventory-movements/{inventoryMovement}", summary="Ver movimiento", tags={"Movimientos de Inventario"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryMovement", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Movimiento"))
     */
    public function showMovement() {}
}
