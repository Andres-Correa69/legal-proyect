<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Configuración de Empresa", description="Ajustes generales de la empresa")
 * @OA\Tag(name="Perfil", description="Actualización de datos y contraseña del usuario")
 * @OA\Tag(name="Logs de Auditoría", description="Registro de actividades del sistema")
 * @OA\Tag(name="Logs API Externa", description="Registro de peticiones a la API externa")
 * @OA\Tag(name="Catálogos del Sistema", description="Municipios, tipos de documento, etc.")
 * @OA\Tag(name="API Externa", description="Endpoints para proyectos externos (VetDash, Zyscore, etc.) con autenticación por X-API-Key")
 */
class SettingsExternalDocs
{
    // ===== CONFIGURACIÓN =====

    /**
     * @OA\Get(path="/company-settings", summary="Ver configuración de empresa", description="Permiso: settings.manage", tags={"Configuración de Empresa"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Configuración actual")
     * )
     */
    public function showSettings() {}

    /**
     * @OA\Put(path="/company-settings", summary="Actualizar configuración de empresa", tags={"Configuración de Empresa"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Configuración actualizada")
     * )
     */
    public function updateSettings() {}

    // ===== PERFIL =====

    /**
     * @OA\Put(path="/profile", summary="Actualizar perfil", description="Actualiza nombre, email, teléfono, etc.", tags={"Perfil"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=200, description="Perfil actualizado")
     * )
     */
    public function updateProfile() {}

    /**
     * @OA\Put(path="/profile/password", summary="Cambiar contraseña", tags={"Perfil"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"current_password","password","password_confirmation"},
     *         @OA\Property(property="current_password", type="string"),
     *         @OA\Property(property="password", type="string"),
     *         @OA\Property(property="password_confirmation", type="string")
     *     )),
     *     @OA\Response(response=200, description="Contraseña actualizada"),
     *     @OA\Response(response=422, description="Contraseña actual incorrecta")
     * )
     */
    public function updatePassword() {}

    // ===== AUDIT LOGS =====

    /**
     * @OA\Get(path="/audit-logs", summary="Listar logs de auditoría", description="Permiso: audit-logs.view", tags={"Logs de Auditoría"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de logs")
     * )
     */
    public function indexAuditLogs() {}

    /**
     * @OA\Get(path="/audit-logs/{activityLog}", summary="Ver log de auditoría", tags={"Logs de Auditoría"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="activityLog", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Detalle del log")
     * )
     */
    public function showAuditLog() {}

    // ===== EXTERNAL API LOGS =====

    /**
     * @OA\Get(path="/external-api-logs", summary="Listar logs de API externa", description="Permiso: external-api-logs.view", tags={"Logs API Externa"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista paginada de logs de API externa")
     * )
     */
    public function indexExternalApiLogs() {}

    // ===== CATÁLOGOS =====

    /**
     * @OA\Get(path="/municipalities", summary="Listar municipios", description="Catálogo de municipios colombianos.", tags={"Catálogos del Sistema"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de municipios con id, name, code")
     * )
     */
    public function municipalities() {}

    /**
     * @OA\Get(path="/type-document-identifications", summary="Tipos de documento de identificación", description="CC, NIT, CE, etc.", tags={"Catálogos del Sistema"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de tipos con id, name, code")
     * )
     */
    public function typeDocumentIdentifications() {}

    // ===== API EXTERNA =====

    /**
     * @OA\Get(path="/external/v1/catalogs", summary="Catálogos DIAN (externo)", description="Autenticación: header X-API-Key", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Catálogos DIAN"),
     *     @OA\Response(response=401, description="API Key inválida")
     * )
     */
    public function externalCatalogs() {}

    /**
     * @OA\Post(path="/external/v1/company/register", summary="Registrar empresa en DIAN (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"dian_token"},
     *         @OA\Property(property="dian_token", type="string"),
     *         @OA\Property(property="company", type="object")
     *     )),
     *     @OA\Response(response=200, description="Empresa registrada")
     * )
     */
    public function externalRegisterCompany() {}

    /**
     * @OA\Put(path="/external/v1/company/register", summary="Actualizar empresa en DIAN (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Empresa actualizada")
     * )
     */
    public function externalUpdateCompany() {}

    /**
     * @OA\Put(path="/external/v1/company/environment", summary="Configurar ambiente DIAN (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Ambiente configurado")
     * )
     */
    public function externalSetEnvironment() {}

    /**
     * @OA\Post(path="/external/v1/invoice", summary="Enviar factura electrónica (externo)", description="Envía factura desde proyecto externo. Autenticación: X-API-Key + dian_token en body.", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"dian_token","invoice"},
     *         @OA\Property(property="dian_token", type="string"),
     *         @OA\Property(property="invoice", type="object",
     *             @OA\Property(property="number", type="integer"),
     *             @OA\Property(property="sync", type="boolean"),
     *             @OA\Property(property="type_document_id", type="integer"),
     *             @OA\Property(property="customer", type="object"),
     *             @OA\Property(property="date", type="string", format="date"),
     *             @OA\Property(property="invoice_lines", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="legal_monetary_totals", type="object")
     *         )
     *     )),
     *     @OA\Response(response=200, description="Factura enviada", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="is_valid", type="boolean"),
     *         @OA\Property(property="uuid", type="string"),
     *         @OA\Property(property="qr_link", type="string")
     *     )),
     *     @OA\Response(response=401, description="API Key inválida"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function externalSendInvoice() {}

    /**
     * @OA\Post(path="/external/v1/invoice/send-raw", summary="Enviar factura raw (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Factura enviada")
     * )
     */
    public function externalSendInvoiceRaw() {}

    /**
     * @OA\Post(path="/external/v1/credit-note", summary="Enviar nota crédito (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Nota crédito enviada")
     * )
     */
    public function externalSendCreditNote() {}

    /**
     * @OA\Post(path="/external/v1/debit-note", summary="Enviar nota débito (externo)", tags={"API Externa"},
     *     @OA\Parameter(name="X-API-Key", in="header", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Nota débito enviada")
     * )
     */
    public function externalSendDebitNote() {}
}
