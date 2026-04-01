<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Auth - Sesión", description="Login, logout, sesión web y usuario actual")
 * @OA\Tag(name="Auth - 2FA", description="Autenticación en dos pasos por email")
 */
class AuthDocs
{
    // ===== AUTH - SESIÓN =====

    /**
     * @OA\Post(path="/auth/logout", summary="Cerrar sesión", description="Revoca el token y cierra la sesión web.", tags={"Auth - Sesión"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Sesión cerrada", @OA\JsonContent(
     *         @OA\Property(property="message", type="string", example="Sesión cerrada exitosamente")
     *     ))
     * )
     */
    public function logout() {}

    /**
     * @OA\Post(path="/auth/session", summary="Crear sesión web", description="Crea sesión web desde token API para navegación con Inertia.", tags={"Auth - Sesión"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(@OA\JsonContent(
     *         @OA\Property(property="remember", type="boolean", example=false)
     *     )),
     *     @OA\Response(response=200, description="Sesión creada", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="message", type="string")
     *     ))
     * )
     */
    public function createSession() {}

    /**
     * @OA\Get(path="/user", summary="Usuario autenticado", description="Retorna el usuario con roles, permisos, empresa y sucursal.", tags={"Auth - Sesión"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Usuario obtenido", @OA\JsonContent(
     *         @OA\Property(property="id", type="integer"),
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="email", type="string"),
     *         @OA\Property(property="company_id", type="integer", nullable=true),
     *         @OA\Property(property="branch_id", type="integer", nullable=true),
     *         @OA\Property(property="roles", type="array", @OA\Items(type="object"))
     *     ))
     * )
     */
    public function user() {}

    // ===== 2FA - PÚBLICO =====

    /**
     * @OA\Post(path="/2fa/send-login-code", summary="Enviar código 2FA para login", description="Envía código de verificación al email durante login (público).", tags={"Auth - 2FA"},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"email"},
     *         @OA\Property(property="email", type="string", format="email", example="user@example.com")
     *     )),
     *     @OA\Response(response=200, description="Código enviado", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="message", type="string")
     *     ))
     * )
     */
    public function sendLoginCode() {}

    /**
     * @OA\Post(path="/2fa/verify-login", summary="Verificar código 2FA y completar login", description="Verifica el código, crea token y sesión. Público.", tags={"Auth - 2FA"},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"email","password","code"},
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string"),
     *         @OA\Property(property="code", type="string", example="123456"),
     *         @OA\Property(property="remember", type="boolean"),
     *         @OA\Property(property="trust_device", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Login exitoso", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="access_token", type="string"),
     *         @OA\Property(property="token_type", type="string", example="Bearer"),
     *         @OA\Property(property="user", type="object")
     *     )),
     *     @OA\Response(response=422, description="Código inválido")
     * )
     */
    public function verifyLoginCode() {}

    // ===== 2FA - PROTEGIDO =====

    /**
     * @OA\Get(path="/2fa/status", summary="Estado de 2FA", description="Verifica si el usuario tiene 2FA habilitado.", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Estado obtenido", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="object",
     *             @OA\Property(property="email_2fa_enabled", type="boolean"),
     *             @OA\Property(property="enabled_at", type="string", format="date-time", nullable=true),
     *             @OA\Property(property="trusted_devices_count", type="integer")
     *         )
     *     ))
     * )
     */
    public function twoFactorStatus() {}

    /**
     * @OA\Post(path="/2fa/initiate-activation", summary="Iniciar activación 2FA", description="Envía código al email para activar 2FA.", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Código enviado"),
     *     @OA\Response(response=400, description="Ya está activado")
     * )
     */
    public function initiateActivation() {}

    /**
     * @OA\Post(path="/2fa/confirm-activation", summary="Confirmar activación 2FA", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"code"},
     *         @OA\Property(property="code", type="string", example="123456")
     *     )),
     *     @OA\Response(response=200, description="2FA activado"),
     *     @OA\Response(response=422, description="Código inválido")
     * )
     */
    public function confirmActivation() {}

    /**
     * @OA\Post(path="/2fa/disable", summary="Desactivar 2FA", description="Requiere contraseña actual.", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"password"},
     *         @OA\Property(property="password", type="string")
     *     )),
     *     @OA\Response(response=200, description="2FA desactivado"),
     *     @OA\Response(response=422, description="Contraseña incorrecta")
     * )
     */
    public function disable2fa() {}

    /**
     * @OA\Get(path="/2fa/trusted-devices", summary="Listar dispositivos confiables", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Dispositivos obtenidos", @OA\JsonContent(
     *         @OA\Property(property="success", type="boolean", example=true),
     *         @OA\Property(property="data", type="array", @OA\Items(
     *             @OA\Property(property="id", type="integer"),
     *             @OA\Property(property="device_name", type="string"),
     *             @OA\Property(property="browser", type="string"),
     *             @OA\Property(property="platform", type="string"),
     *             @OA\Property(property="ip_address", type="string"),
     *             @OA\Property(property="last_used_at", type="string", format="date-time"),
     *             @OA\Property(property="trusted_until", type="string", format="date-time")
     *         ))
     *     ))
     * )
     */
    public function trustedDevices() {}

    /**
     * @OA\Delete(path="/2fa/trusted-devices/{deviceId}", summary="Eliminar dispositivo confiable", tags={"Auth - 2FA"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="deviceId", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Dispositivo eliminado"),
     *     @OA\Response(response=404, description="No encontrado")
     * )
     */
    public function removeTrustedDevice() {}
}
