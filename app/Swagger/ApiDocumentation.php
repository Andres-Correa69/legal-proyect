<?php

namespace App\Swagger;

/**
 * @OA\Info(
 *     title="LEGAL SISTEMA - API",
 *     version="1.0.0",
 *     description="API de Facturación Electrónica, Nómina Electrónica y servicios DIAN.",
 *     @OA\Contact(name="LEGAL SISTEMA", email="soporte@legalsistema.co")
 * )
 *
 * @OA\Server(url="http://localhost:8000/api", description="Servidor Local")
 *
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="Sanctum Token",
 *     description="Token obtenido del endpoint POST /api/auth/login"
 * )
 *
 * @OA\Tag(name="Auth", description="Autenticación y obtención de token")
 * @OA\Tag(name="Catálogos", description="Catálogos DIAN")
 * @OA\Tag(name="Registro y Configuración", description="Registro en DIAN, configuración de resoluciones y consecutivos")
 * @OA\Tag(name="Facturas Electrónicas", description="Generación, PDF, anulación y envío por email de facturas")
 * @OA\Tag(name="Notas Crédito", description="Notas crédito de ajuste sobre facturas electrónicas")
 * @OA\Tag(name="Notas Débito", description="Notas débito por cargos adicionales")
 * @OA\Tag(name="Eventos de Compra", description="Acuse de recibo, recibo del bien, documento soporte")
 * @OA\Tag(name="Habilitación DIAN", description="Proceso de habilitación: pruebas y activación de producción")
 * @OA\Tag(name="Nómina - Rangos", description="CRUD de rangos de consecutivos para nómina electrónica")
 * @OA\Tag(name="Nómina - Lotes", description="Gestión de lotes/periodos de nómina electrónica")
 * @OA\Tag(name="Nómina - Empleados", description="Datos laborales, devengados, deducciones, emisión y anulación DIAN")
 */
class ApiDocumentation
{
    // ===== AUTH =====

    /**
     * @OA\Post(
     *     path="/auth/login",
     *     summary="Iniciar sesión",
     *     description="Obtiene un token Bearer para autenticar las demás peticiones.",
     *     tags={"Auth"},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"email", "password"},
     *         @OA\Property(property="email", type="string", format="email", example="admin@example.com"),
     *         @OA\Property(property="password", type="string", example="password")
     *     )),
     *     @OA\Response(response=200, description="Login exitoso", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="token", type="string", example="1|abc123..."),
     *         @OA\Property(property="user", type="object",
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string")
     *         )
     *     )),
     *     @OA\Response(response=401, description="Credenciales inválidas")
     * )
     */
    public function login() {}

    // ===== CATÁLOGOS =====

    /**
     * @OA\Get(
     *     path="/electronic-invoicing/catalogs",
     *     summary="Obtener catálogos DIAN",
     *     description="Obtiene todos los catálogos DIAN almacenados localmente. Endpoint público.",
     *     tags={"Catálogos"},
     *     @OA\Response(response=200, description="Catálogos obtenidos", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="object")
     *     ))
     * )
     */
    public function getCatalogs() {}

    /**
     * @OA\Post(
     *     path="/electronic-invoicing/sync-catalogs",
     *     summary="Sincronizar catálogos desde DIAN",
     *     description="Sincroniza los catálogos desde la API externa. Endpoint público.",
     *     tags={"Catálogos"},
     *     @OA\Response(response=200, description="Catálogos sincronizados")
     * )
     */
    public function syncCatalogs() {}

    // ===== REGISTRO Y CONFIGURACIÓN =====

    /**
     * @OA\Get(
     *     path="/electronic-invoicing/status",
     *     summary="Estado de registro",
     *     description="Verifica si la sede está registrada y tiene token activo.",
     *     tags={"Registro y Configuración"},
     *     security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Estado obtenido", @OA\JsonContent(
     *         @OA\Property(property="registered", type="boolean"),
     *         @OA\Property(property="has_token", type="boolean"),
     *         @OA\Property(property="branch_data", type="object")
     *     )),
     *     @OA\Response(response=401, description="No autenticado")
     * )
     */
    public function status() {}

    /**
     * @OA\Post(
     *     path="/electronic-invoicing/register",
     *     summary="Registrar sede en DIAN",
     *     description="Registra la sede ante la DIAN. Permiso: electronic-invoicing.manage",
     *     tags={"Registro y Configuración"},
     *     security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"tax_id","type_document_identification_id","type_organization_id","type_regime_id","type_liability_id","business_name","merchant_registration","municipality_id","address","phone","email"},
     *         @OA\Property(property="tax_id", type="string", example="900123456"),
     *         @OA\Property(property="type_document_identification_id", type="integer", example=6),
     *         @OA\Property(property="type_organization_id", type="integer", example=1),
     *         @OA\Property(property="type_regime_id", type="integer", example=1),
     *         @OA\Property(property="type_liability_id", type="integer", example=14),
     *         @OA\Property(property="business_name", type="string", example="Mi Empresa S.A.S"),
     *         @OA\Property(property="merchant_registration", type="string", example="0000000-00"),
     *         @OA\Property(property="municipality_id", type="integer", example=149),
     *         @OA\Property(property="address", type="string", example="Calle 100 # 50-25"),
     *         @OA\Property(property="phone", type="string", example="3001234567"),
     *         @OA\Property(property="email", type="string", format="email", example="facturacion@empresa.com")
     *     )),
     *     @OA\Response(response=200, description="Sede registrada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function register() {}

    /**
     * @OA\Put(
     *     path="/electronic-invoicing/register",
     *     summary="Actualizar registro en DIAN",
     *     description="Actualiza datos de registro (NIT no se puede cambiar). Permiso: electronic-invoicing.manage",
     *     tags={"Registro y Configuración"},
     *     security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="type_organization_id", type="integer"),
     *         @OA\Property(property="type_regime_id", type="integer"),
     *         @OA\Property(property="type_liability_id", type="integer"),
     *         @OA\Property(property="business_name", type="string"),
     *         @OA\Property(property="municipality_id", type="integer"),
     *         @OA\Property(property="address", type="string"),
     *         @OA\Property(property="phone", type="string"),
     *         @OA\Property(property="email", type="string", format="email")
     *     )),
     *     @OA\Response(response=200, description="Datos actualizados"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function updateRegister() {}

    /**
     * @OA\Get(path="/electronic-invoicing/config", summary="Obtener configuración FE", description="Resoluciones, prefijos, consecutivos. Permiso: electronic-invoicing.config", tags={"Registro y Configuración"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Configuración obtenida"))
     */
    public function getConfig() {}

    /**
     * @OA\Put(path="/electronic-invoicing/config", summary="Actualizar configuración FE", description="Todos los campos opcionales. Permiso: electronic-invoicing.config", tags={"Registro y Configuración"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="prefix", type="string", example="SETT"),
     *         @OA\Property(property="consecutive_start", type="integer"),
     *         @OA\Property(property="consecutive_end", type="integer"),
     *         @OA\Property(property="cn_prefix", type="string"),
     *         @OA\Property(property="payroll_software_id", type="string"),
     *         @OA\Property(property="payroll_pin", type="string")
     *     )),
     *     @OA\Response(response=200, description="Configuración actualizada"))
     */
    public function updateConfig() {}

    /**
     * @OA\Get(path="/electronic-invoicing/resolutions", summary="Consultar resoluciones DIAN", tags={"Registro y Configuración"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Resoluciones obtenidas"))
     */
    public function getResolutions() {}

    // ===== FACTURAS ELECTRÓNICAS =====

    /**
     * @OA\Post(path="/electronic-invoicing/sales/{sale}/generate", summary="Generar factura desde venta", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Factura generada"), @OA\Response(response=422, description="Error"))
     */
    public function generateInvoice() {}

    /**
     * @OA\Post(path="/electronic-invoicing/sales/{sale}/generate-pos", summary="Generar factura POS", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="sale", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Factura POS generada"))
     */
    public function generatePosInvoice() {}

    /**
     * @OA\Post(path="/electronic-invoicing/invoice", summary="Enviar factura directa (raw)", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="number", type="integer", example=1),
     *         @OA\Property(property="sync", type="boolean", example=true),
     *         @OA\Property(property="type_document_id", type="integer"),
     *         @OA\Property(property="customer", type="object"),
     *         @OA\Property(property="date", type="string", format="date"),
     *         @OA\Property(property="invoice_lines", type="array", @OA\Items(type="object")),
     *         @OA\Property(property="legal_monetary_totals", type="object")
     *     )),
     *     @OA\Response(response=200, description="Factura enviada"), @OA\Response(response=422, description="Error"))
     */
    public function sendInvoice() {}

    /**
     * @OA\Get(path="/electronic-invoicing/{electronicInvoice}/pdf", summary="Descargar PDF factura", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicInvoice", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")), @OA\Response(response=404, description="No disponible"))
     */
    public function downloadInvoicePdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/{electronicInvoice}/void", summary="Anular factura (crea NC)", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicInvoice", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Factura anulada"), @OA\Response(response=422, description="Error"))
     */
    public function voidInvoice() {}

    /**
     * @OA\Post(path="/electronic-invoicing/{electronicInvoice}/send-email", summary="Enviar factura por email", tags={"Facturas Electrónicas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicInvoice", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendInvoiceEmail() {}

    // ===== NOTAS CRÉDITO =====

    /**
     * @OA\Post(path="/electronic-invoicing/{electronicInvoice}/adjustment-credit-note", summary="Crear NC de ajuste", tags={"Notas Crédito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicInvoice", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="adjustment_lines", type="array", @OA\Items(type="object",
     *             @OA\Property(property="original_line_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="adjustment_amount", type="number")
     *         ))
     *     )),
     *     @OA\Response(response=200, description="NC creada"), @OA\Response(response=422, description="Error"))
     */
    public function createCreditNote() {}

    /**
     * @OA\Get(path="/electronic-invoicing/credit-notes/{electronicCreditNote}/pdf", summary="PDF nota crédito", tags={"Notas Crédito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicCreditNote", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadCreditNotePdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/credit-notes/{electronicCreditNote}/send-email", summary="Email nota crédito", tags={"Notas Crédito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicCreditNote", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendCreditNoteEmail() {}

    // ===== NOTAS DÉBITO =====

    /**
     * @OA\Post(path="/electronic-invoicing/{electronicInvoice}/debit-note", summary="Crear nota débito", tags={"Notas Débito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicInvoice", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="ND creada"))
     */
    public function createDebitNote() {}

    /**
     * @OA\Get(path="/electronic-invoicing/debit-notes/{electronicDebitNote}/pdf", summary="PDF nota débito", tags={"Notas Débito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicDebitNote", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadDebitNotePdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/debit-notes/{electronicDebitNote}/send-email", summary="Email nota débito", tags={"Notas Débito"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="electronicDebitNote", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendDebitNoteEmail() {}

    // ===== EVENTOS DE COMPRA =====

    /**
     * @OA\Post(path="/electronic-invoicing/inventory-purchases/{inventoryPurchase}/receipt-acknowledgment", summary="Acuse de recibo (evento 030)", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(@OA\Property(property="uuid", type="string"))),
     *     @OA\Response(response=200, description="Acuse creado"))
     */
    public function createReceiptAcknowledgment() {}

    /**
     * @OA\Get(path="/electronic-invoicing/receipt-acknowledgments/{receiptAcknowledgment}/pdf", summary="PDF acuse de recibo", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="receiptAcknowledgment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadReceiptPdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/receipt-acknowledgments/{receiptAcknowledgment}/send-email", summary="Email acuse de recibo", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="receiptAcknowledgment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendReceiptEmail() {}

    /**
     * @OA\Post(path="/electronic-invoicing/inventory-purchases/{inventoryPurchase}/goods-receipt", summary="Recibo del bien (evento 032)", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="type_document_identification_id", type="integer", example=3),
     *         @OA\Property(property="identification_number", type="string"),
     *         @OA\Property(property="first_name", type="string"),
     *         @OA\Property(property="family_name", type="string"),
     *         @OA\Property(property="job_title", type="string")
     *     )),
     *     @OA\Response(response=200, description="Recibo creado"))
     */
    public function createGoodsReceipt() {}

    /**
     * @OA\Get(path="/electronic-invoicing/goods-receipts/{goodsReceipt}/pdf", summary="PDF recibo del bien", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="goodsReceipt", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadGoodsReceiptPdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/goods-receipts/{goodsReceipt}/send-email", summary="Email recibo del bien", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="goodsReceipt", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendGoodsReceiptEmail() {}

    /**
     * @OA\Post(path="/electronic-invoicing/inventory-purchases/{inventoryPurchase}/document-support", summary="Crear documento soporte", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="inventoryPurchase", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Doc. soporte creado"))
     */
    public function createDocumentSupport() {}

    /**
     * @OA\Get(path="/electronic-invoicing/document-supports/{documentSupport}/pdf", summary="PDF documento soporte", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="documentSupport", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadDocumentSupportPdf() {}

    /**
     * @OA\Post(path="/electronic-invoicing/document-supports/{documentSupport}/send-email", summary="Email documento soporte", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="documentSupport", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Email enviado"))
     */
    public function sendDocumentSupportEmail() {}

    /**
     * @OA\Post(path="/electronic-invoicing/document-supports/{documentSupport}/void", summary="Anular documento soporte", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="documentSupport", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Anulado"))
     */
    public function voidDocumentSupport() {}

    /**
     * @OA\Get(path="/electronic-invoicing/document-supports/{documentSupport}/void-pdf", summary="PDF anulación doc. soporte", tags={"Eventos de Compra"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="documentSupport", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")))
     */
    public function downloadDocumentSupportVoidPdf() {}

    // ===== HABILITACIÓN DIAN =====

    /**
     * @OA\Get(path="/electronic-invoicing/habilitacion/status", summary="Estado de habilitación", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Estado"))
     */
    public function habStatus() {}

    /**
     * @OA\Post(path="/electronic-invoicing/habilitacion/set-environment", summary="Configurar ambiente", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Configurado"))
     */
    public function setEnvironment() {}

    /**
     * @OA\Post(path="/electronic-invoicing/habilitacion/send-invoice", summary="Factura de prueba", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Resultado"))
     */
    public function habSendInvoice() {}

    /**
     * @OA\Post(path="/electronic-invoicing/habilitacion/send-credit-note", summary="NC de prueba", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Resultado"))
     */
    public function habSendCreditNote() {}

    /**
     * @OA\Post(path="/electronic-invoicing/habilitacion/send-debit-note", summary="ND de prueba", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Resultado"))
     */
    public function habSendDebitNote() {}

    /**
     * @OA\Post(path="/electronic-invoicing/habilitacion/enable-production", summary="Activar producción", tags={"Habilitación DIAN"}, security={{"bearerAuth": {}}}, @OA\Response(response=200, description="Activado"))
     */
    public function enableProduction() {}

    // ===== NÓMINA - RANGOS =====

    /**
     * @OA\Get(path="/electronic-invoicing/payroll-numbering-ranges", summary="Listar rangos de numeración", tags={"Nómina - Rangos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Rangos obtenidos", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="array", @OA\Items(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string", enum={"payroll","payroll_note"}),
     *             @OA\Property(property="prefix", type="string"),
     *             @OA\Property(property="consecutive_start", type="integer"),
     *             @OA\Property(property="consecutive_end", type="integer"),
     *             @OA\Property(property="current_consecutive", type="integer"),
     *             @OA\Property(property="is_active", type="boolean")
     *         ))
     *     ))
     * )
     */
    public function listRanges() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payroll-numbering-ranges", summary="Crear rango", description="type: payroll (emisión) o payroll_note (anulación). Prefijo único por sede.", tags={"Nómina - Rangos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string", example="Nómina Electrónica"),
     *         @OA\Property(property="type", type="string", enum={"payroll","payroll_note"}, example="payroll"),
     *         @OA\Property(property="prefix", type="string", example="NE"),
     *         @OA\Property(property="consecutive_start", type="integer", example=1),
     *         @OA\Property(property="consecutive_end", type="integer", example=99999999999)
     *     )),
     *     @OA\Response(response=201, description="Rango creado"), @OA\Response(response=422, description="Error"))
     */
    public function createRange() {}

    /**
     * @OA\Put(path="/electronic-invoicing/payroll-numbering-ranges/{payrollNumberingRange}", summary="Actualizar rango", tags={"Nómina - Rangos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollNumberingRange", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="type", type="string", enum={"payroll","payroll_note"}),
     *         @OA\Property(property="prefix", type="string"),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Actualizado"), @OA\Response(response=422, description="Error"))
     */
    public function updateRange() {}

    /**
     * @OA\Delete(path="/electronic-invoicing/payroll-numbering-ranges/{payrollNumberingRange}", summary="Eliminar rango", tags={"Nómina - Rangos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollNumberingRange", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Eliminado"), @OA\Response(response=422, description="En uso"))
     */
    public function deleteRange() {}

    // ===== NÓMINA - LOTES =====

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls", summary="Listar lotes de nómina", tags={"Nómina - Lotes"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Nóminas obtenidas"))
     */
    public function listPayrolls() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payrolls", summary="Crear lote de nómina", tags={"Nómina - Lotes"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="settlement_start_date", type="string", format="date", example="2026-02-01"),
     *         @OA\Property(property="settlement_end_date", type="string", format="date", example="2026-02-28"),
     *         @OA\Property(property="issue_date", type="string", format="date", example="2026-02-24"),
     *         @OA\Property(property="numbering_range_id", type="integer", example=1),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Nómina creada"), @OA\Response(response=422, description="Error"))
     */
    public function createPayroll() {}

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls/{payroll}", summary="Ver detalle nómina", tags={"Nómina - Lotes"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payroll", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle obtenido"))
     */
    public function showPayroll() {}

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls/catalogs", summary="Catálogos de nómina", description="Tipos de trabajador, contratos, formas de pago.", tags={"Nómina - Lotes"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Catálogos obtenidos"))
     */
    public function payrollCatalogs() {}

    // ===== NÓMINA - EMPLEADOS =====

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls/{payroll}/employees/{user}", summary="Ver/Crear empleado en nómina", description="Obtiene o crea registro. Incluye devengados, deducciones e historial.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payroll", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Datos del empleado"))
     */
    public function showPayrollEmployee() {}

    /**
     * @OA\Put(path="/electronic-invoicing/payrolls/employees/{payrollEmployee}/labor-data", summary="Actualizar datos laborales", description="Tipo trabajador, contrato, salario, banco. Todos opcionales.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="type_worker_id", type="integer", example=1),
     *         @OA\Property(property="type_contract_id", type="integer", example=2),
     *         @OA\Property(property="salary", type="number", example=2500000),
     *         @OA\Property(property="admission_date", type="string", format="date"),
     *         @OA\Property(property="municipality_id", type="integer"),
     *         @OA\Property(property="address", type="string"),
     *         @OA\Property(property="bank", type="string"),
     *         @OA\Property(property="account_type", type="string"),
     *         @OA\Property(property="account_number", type="string")
     *     )),
     *     @OA\Response(response=200, description="Datos actualizados"), @OA\Response(response=422, description="Error"))
     */
    public function updateLaborData() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payrolls/employees/{payrollEmployee}/earnings", summary="Agregar devengado", description="Conceptos: basic, overtime, primas, commissions, transport_allowance.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="concept", type="string", example="basic"),
     *         @OA\Property(property="data", type="object"),
     *         @OA\Property(property="payment", type="number", example=2500000)
     *     )),
     *     @OA\Response(response=201, description="Devengado creado"))
     */
    public function storeEarning() {}

    /**
     * @OA\Put(path="/electronic-invoicing/payrolls/employee-earnings/{earning}", summary="Actualizar devengado", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="earning", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(@OA\JsonContent(@OA\Property(property="data", type="object"), @OA\Property(property="payment", type="number"), @OA\Property(property="is_active", type="boolean"))),
     *     @OA\Response(response=200, description="Actualizado"))
     */
    public function updateEarning() {}

    /**
     * @OA\Delete(path="/electronic-invoicing/payrolls/employee-earnings/{earning}", summary="Eliminar devengado", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="earning", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Eliminado"))
     */
    public function deleteEarning() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payrolls/employees/{payrollEmployee}/deductions", summary="Agregar deducción", description="Conceptos: health, pension, withholding, other_deductions.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="concept", type="string", example="health"),
     *         @OA\Property(property="data", type="object"),
     *         @OA\Property(property="payment", type="number", example=100000)
     *     )),
     *     @OA\Response(response=201, description="Deducción creada"))
     */
    public function storeDeduction() {}

    /**
     * @OA\Put(path="/electronic-invoicing/payrolls/employee-deductions/{deduction}", summary="Actualizar deducción", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="deduction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(@OA\JsonContent(@OA\Property(property="data", type="object"), @OA\Property(property="payment", type="number"), @OA\Property(property="is_active", type="boolean"))),
     *     @OA\Response(response=200, description="Actualizada"))
     */
    public function updateDeduction() {}

    /**
     * @OA\Delete(path="/electronic-invoicing/payrolls/employee-deductions/{deduction}", summary="Eliminar deducción", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="deduction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Eliminada"))
     */
    public function deleteDeduction() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payrolls/{payroll}/employees/{payrollEmployee}/send", summary="Emitir nómina a DIAN", description="Envía nómina individual. Valida datos laborales y devengados activos.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payroll", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Nómina enviada", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="object",
     *             @OA\Property(property="uuid", type="string"),
     *             @OA\Property(property="qr_link", type="string"),
     *             @OA\Property(property="has_pdf", type="boolean")
     *         )
     *     )),
     *     @OA\Response(response=422, description="Error"))
     */
    public function sendPayrollEmployee() {}

    /**
     * @OA\Post(path="/electronic-invoicing/payrolls/{payroll}/employees/{payrollEmployee}/annul", summary="Anular nómina en DIAN", description="Nota de ajuste tipo eliminación. Solo si fue aceptada. Usa rango payroll_note.", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payroll", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Nómina anulada", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="object",
     *             @OA\Property(property="annulment_uuid", type="string"),
     *             @OA\Property(property="annulment_number", type="string"),
     *             @OA\Property(property="has_annulment_pdf", type="boolean")
     *         )
     *     )),
     *     @OA\Response(response=422, description="No se puede anular"))
     */
    public function annulPayrollEmployee() {}

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls/employees/{payrollEmployee}/pdf", summary="PDF nómina empleado", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")),
     *     @OA\Response(response=404, description="No disponible"))
     */
    public function downloadPayrollPdf() {}

    /**
     * @OA\Get(path="/electronic-invoicing/payrolls/employees/{payrollEmployee}/annulment-pdf", summary="PDF anulación nómina", tags={"Nómina - Empleados"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="payrollEmployee", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="PDF", @OA\MediaType(mediaType="application/pdf")),
     *     @OA\Response(response=404, description="No disponible"))
     */
    public function downloadAnnulmentPdf() {}
}
