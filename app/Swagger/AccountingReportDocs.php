<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Contabilidad - Cuentas", description="PUC (Plan Único de Cuentas) y vinculaciones")
 * @OA\Tag(name="Contabilidad - Asientos", description="Creación, contabilización y anulación de asientos contables")
 * @OA\Tag(name="Contabilidad - Reportes", description="Balance de prueba, libro mayor, diario, estado de resultados y balance general")
 * @OA\Tag(name="Contabilidad - Periodos", description="Gestión de periodos contables")
 * @OA\Tag(name="Contabilidad - Configuración", description="Configuración de cuentas contables por tipo de venta, caja y proveedor")
 * @OA\Tag(name="Reportes de Ventas", description="Reportes analíticos de ventas, productos, clientes y utilidad")
 * @OA\Tag(name="Reportes de Caja", description="Flujo de caja, reportes por caja y global")
 * @OA\Tag(name="Consulta de Saldos", description="Saldos de clientes y proveedores con exportación")
 */
class AccountingReportDocs
{
    // ===== CUENTAS CONTABLES =====

    /**
     * @OA\Get(path="/accounting/accounts", summary="Listar cuentas contables", description="PUC completo. Permiso: accounting.view", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de cuentas"))
     */
    public function indexAccounts() {}

    /**
     * @OA\Get(path="/accounting/accounts/tree", summary="Árbol de cuentas", description="Estructura jerárquica.", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Árbol de cuentas"))
     */
    public function accountsTree() {}

    /**
     * @OA\Get(path="/accounting/accounts/leaf", summary="Cuentas auxiliares", description="Solo cuentas hoja (sin hijas).", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Cuentas auxiliares"))
     */
    public function accountsLeaf() {}

    /**
     * @OA\Get(path="/accounting/accounts/{account}", summary="Ver cuenta contable", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Cuenta con relaciones"))
     */
    public function showAccount() {}

    /**
     * @OA\Post(path="/accounting/accounts", summary="Crear cuenta contable", description="Permiso: accounting.manage", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"code","name","type"},
     *         @OA\Property(property="code", type="string", example="110505"),
     *         @OA\Property(property="name", type="string", example="Caja General"),
     *         @OA\Property(property="type", type="string", enum={"asset","liability","equity","revenue","expense"}),
     *         @OA\Property(property="parent_id", type="integer", nullable=true),
     *         @OA\Property(property="description", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Cuenta creada"))
     */
    public function storeAccount() {}

    /**
     * @OA\Put(path="/accounting/accounts/{account}", summary="Actualizar cuenta", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Cuenta actualizada"))
     */
    public function updateAccount() {}

    /**
     * @OA\Delete(path="/accounting/accounts/{account}", summary="Eliminar cuenta", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada"))
     */
    public function destroyAccount() {}

    /**
     * @OA\Post(path="/accounting/accounts/{account}/link-cash-register", summary="Vincular caja a cuenta", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"cash_register_id"}, @OA\Property(property="cash_register_id", type="integer"))),
     *     @OA\Response(response=200, description="Vinculada"))
     */
    public function linkCashRegister() {}

    /**
     * @OA\Delete(path="/accounting/accounts/{account}/unlink-cash-register/{cashRegister}", summary="Desvincular caja", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Desvinculada"))
     */
    public function unlinkCashRegister() {}

    /**
     * @OA\Post(path="/accounting/accounts/{account}/link-supplier", summary="Vincular proveedor a cuenta", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"supplier_id"}, @OA\Property(property="supplier_id", type="integer"))),
     *     @OA\Response(response=200, description="Vinculado"))
     */
    public function linkSupplier() {}

    /**
     * @OA\Delete(path="/accounting/accounts/{account}/unlink-supplier/{supplier}", summary="Desvincular proveedor", tags={"Contabilidad - Cuentas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="account", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Desvinculado"))
     */
    public function unlinkSupplier() {}

    // ===== ASIENTOS CONTABLES =====

    /**
     * @OA\Get(path="/accounting/journal-entries", summary="Listar asientos contables", tags={"Contabilidad - Asientos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de asientos"))
     */
    public function indexJournalEntries() {}

    /**
     * @OA\Get(path="/accounting/journal-entries/{entry}", summary="Ver asiento", tags={"Contabilidad - Asientos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="entry", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Asiento con líneas"))
     */
    public function showJournalEntry() {}

    /**
     * @OA\Post(path="/accounting/journal-entries", summary="Crear asiento contable", description="Permiso: accounting.entries.create", tags={"Contabilidad - Asientos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"date","description","lines"},
     *         @OA\Property(property="date", type="string", format="date"),
     *         @OA\Property(property="description", type="string"),
     *         @OA\Property(property="lines", type="array", @OA\Items(type="object",
     *             @OA\Property(property="account_id", type="integer"),
     *             @OA\Property(property="debit", type="number"),
     *             @OA\Property(property="credit", type="number"),
     *             @OA\Property(property="description", type="string")
     *         ))
     *     )),
     *     @OA\Response(response=201, description="Asiento creado"))
     */
    public function storeJournalEntry() {}

    /**
     * @OA\Post(path="/accounting/journal-entries/{entry}/post", summary="Contabilizar asiento", description="Cambia estado a 'posted'. Permiso: accounting.entries.post", tags={"Contabilidad - Asientos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="entry", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Contabilizado"))
     */
    public function postJournalEntry() {}

    /**
     * @OA\Post(path="/accounting/journal-entries/{entry}/void", summary="Anular asiento", description="Permiso: accounting.entries.void", tags={"Contabilidad - Asientos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="entry", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Anulado"))
     */
    public function voidJournalEntry() {}

    // ===== REPORTES CONTABLES =====

    /**
     * @OA\Get(path="/accounting/reports/trial-balance", summary="Balance de prueba", tags={"Contabilidad - Reportes"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Balance de prueba"))
     */
    public function trialBalance() {}

    /**
     * @OA\Get(path="/accounting/reports/general-ledger", summary="Libro mayor", tags={"Contabilidad - Reportes"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Libro mayor"))
     */
    public function generalLedger() {}

    /**
     * @OA\Get(path="/accounting/reports/journal-book", summary="Libro diario", tags={"Contabilidad - Reportes"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Libro diario"))
     */
    public function journalBook() {}

    /**
     * @OA\Get(path="/accounting/reports/income-statement", summary="Estado de resultados", tags={"Contabilidad - Reportes"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Estado de resultados"))
     */
    public function incomeStatement() {}

    /**
     * @OA\Get(path="/accounting/reports/balance-sheet", summary="Balance general", tags={"Contabilidad - Reportes"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Balance general"))
     */
    public function balanceSheet() {}

    // ===== PERIODOS =====

    /**
     * @OA\Get(path="/accounting/periods", summary="Listar periodos contables", tags={"Contabilidad - Periodos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Lista de periodos"))
     */
    public function indexPeriods() {}

    /**
     * @OA\Post(path="/accounting/periods/close", summary="Cerrar periodo", tags={"Contabilidad - Periodos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Periodo cerrado"))
     */
    public function closePeriod() {}

    /**
     * @OA\Post(path="/accounting/periods/{period}/reopen", summary="Reabrir periodo", tags={"Contabilidad - Periodos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="period", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Periodo reabierto"))
     */
    public function reopenPeriod() {}

    // ===== CONFIG CONTABLE =====

    /**
     * @OA\Get(path="/accounting/config/sale-type-accounts", summary="Cuentas por tipo de venta", tags={"Contabilidad - Configuración"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Configuración"))
     */
    public function getSaleTypeAccounts() {}

    /**
     * @OA\Put(path="/accounting/config/sale-type-accounts", summary="Actualizar cuentas por tipo de venta", tags={"Contabilidad - Configuración"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Actualizado"))
     */
    public function updateSaleTypeAccounts() {}

    /**
     * @OA\Get(path="/accounting/config/cash-register-accounts", summary="Cuentas de cajas registradoras", tags={"Contabilidad - Configuración"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Configuración"))
     */
    public function getCashRegisterAccounts() {}

    /**
     * @OA\Get(path="/accounting/config/supplier-accounts", summary="Cuentas de proveedores", tags={"Contabilidad - Configuración"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Configuración"))
     */
    public function getSupplierAccounts() {}

    // ===== REPORTES DE VENTAS =====

    /**
     * @OA\Get(path="/reports/sales-products", summary="Ventas por producto", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Reporte"))
     */
    public function salesByProduct() {}

    /**
     * @OA\Get(path="/reports/sales-products/{productId}/invoices", summary="Facturas de un producto", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Facturas del producto"))
     */
    public function salesByProductInvoices() {}

    /**
     * @OA\Get(path="/reports/best-sellers", summary="Productos más vendidos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Top sellers"))
     */
    public function bestSellers() {}

    /**
     * @OA\Get(path="/reports/top-clients", summary="Mejores clientes", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Top clientes"))
     */
    public function topClients() {}

    /**
     * @OA\Get(path="/reports/product-profit", summary="Utilidad por producto", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Utilidad"))
     */
    public function productProfit() {}

    /**
     * @OA\Get(path="/reports/monthly-growth", summary="Crecimiento mensual", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Crecimiento"))
     */
    public function monthlyGrowth() {}

    /**
     * @OA\Get(path="/reports/tax-collection", summary="Recaudo de impuestos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Impuestos"))
     */
    public function taxCollection() {}

    /**
     * @OA\Get(path="/reports/income-expenses", summary="Ingresos vs Gastos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Resumen"))
     */
    public function incomeExpenses() {}

    /**
     * @OA\Get(path="/reports/income-expenses/detail", summary="Detalle Ingresos vs Gastos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Detalle"))
     */
    public function incomeExpensesDetail() {}

    /**
     * @OA\Get(path="/reports/payments", summary="Reporte de pagos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Pagos"))
     */
    public function paymentsReport() {}

    /**
     * @OA\Get(path="/reports/entries", summary="Reporte de asientos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Asientos"))
     */
    public function entriesReport() {}

    /**
     * @OA\Get(path="/reports/expenses", summary="Reporte de gastos", tags={"Reportes de Ventas"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Gastos"))
     */
    public function expensesReport() {}

    // ===== REPORTES DE CAJA =====

    /**
     * @OA\Get(path="/cash-reports/cash-flow", summary="Flujo de caja", tags={"Reportes de Caja"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Flujo de caja"))
     */
    public function cashFlow() {}

    /**
     * @OA\Get(path="/cash-reports/by-register/{cashRegister}", summary="Reporte por caja", tags={"Reportes de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="cashRegister", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Reporte de la caja"))
     */
    public function cashReportByRegister() {}

    /**
     * @OA\Get(path="/cash-reports/global", summary="Reporte global de cajas", tags={"Reportes de Caja"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Reporte global"))
     */
    public function cashReportGlobal() {}

    /**
     * @OA\Post(path="/cash-reports/export", summary="Exportar reporte de cajas", tags={"Reportes de Caja"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="format", type="string", enum={"excel","pdf"}),
     *         @OA\Property(property="date_from", type="string", format="date"),
     *         @OA\Property(property="date_to", type="string", format="date")
     *     )),
     *     @OA\Response(response=200, description="Archivo exportado"))
     */
    public function cashReportExport() {}

    // ===== CONSULTA DE SALDOS =====

    /**
     * @OA\Get(path="/balances/clients", summary="Saldos de clientes", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Saldos"))
     */
    public function balanceClients() {}

    /**
     * @OA\Get(path="/balances/clients/{client}", summary="Saldo de cliente", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="client", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de saldo"))
     */
    public function balanceClient() {}

    /**
     * @OA\Get(path="/balances/clients/{client}/export", summary="Exportar saldo de cliente", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="client", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Archivo exportado"))
     */
    public function exportClientBalance() {}

    /**
     * @OA\Post(path="/balances/clients/export", summary="Exportar saldos de clientes", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Archivo"))
     */
    public function exportClients() {}

    /**
     * @OA\Get(path="/balances/suppliers", summary="Saldos de proveedores", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Saldos"))
     */
    public function balanceSuppliers() {}

    /**
     * @OA\Get(path="/balances/suppliers/{supplier}", summary="Saldo de proveedor", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="supplier", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle de saldo"))
     */
    public function balanceSupplier() {}

    /**
     * @OA\Post(path="/balances/suppliers/export", summary="Exportar saldos de proveedores", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Archivo"))
     */
    public function exportSuppliers() {}

    /**
     * @OA\Get(path="/balances/summary", summary="Resumen general de saldos", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Resumen"))
     */
    public function balanceSummary() {}

    /**
     * @OA\Post(path="/balances/sales/payment", summary="Registrar pago de venta desde saldos", tags={"Consulta de Saldos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"sale_id","amount","payment_method_id","cash_register_id"},
     *         @OA\Property(property="sale_id", type="integer"),
     *         @OA\Property(property="amount", type="number"),
     *         @OA\Property(property="payment_method_id", type="integer"),
     *         @OA\Property(property="cash_register_id", type="integer")
     *     )),
     *     @OA\Response(response=200, description="Pago registrado"))
     */
    public function registerSalePayment() {}
}
