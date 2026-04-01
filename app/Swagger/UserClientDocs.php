<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Usuarios", description="CRUD de usuarios del sistema (excluye clientes)")
 * @OA\Tag(name="Clientes", description="CRUD de clientes (usuarios con rol client)")
 * @OA\Tag(name="Roles y Permisos", description="Gestión de roles, permisos y asignación")
 */
class UserClientDocs
{
    // ===== USUARIOS =====

    /**
     * @OA\Get(path="/users", summary="Listar usuarios", description="Excluye usuarios con rol 'client'. Permiso: users.view", tags={"Usuarios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="role", in="query", description="Filtrar por slug de rol", @OA\Schema(type="string")),
     *     @OA\Parameter(name="company_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Lista paginada de usuarios")
     * )
     */
    public function indexUsers() {}

    /**
     * @OA\Get(path="/users/{user}", summary="Ver usuario", tags={"Usuarios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Usuario con roles, permisos, empresa y sucursal")
     * )
     */
    public function showUser() {}

    /**
     * @OA\Post(path="/users", summary="Crear usuario", description="Permiso: users.manage", tags={"Usuarios"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","email","password"},
     *         @OA\Property(property="name", type="string", example="Juan Pérez"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", format="password"),
     *         @OA\Property(property="company_id", type="integer", nullable=true),
     *         @OA\Property(property="branch_id", type="integer", nullable=true),
     *         @OA\Property(property="document_id", type="string", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="birth_date", type="string", format="date", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="role_ids", type="array", @OA\Items(type="integer"))
     *     )),
     *     @OA\Response(response=201, description="Usuario creado"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeUser() {}

    /**
     * @OA\Put(path="/users/{user}", summary="Actualizar usuario", tags={"Usuarios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", format="password"),
     *         @OA\Property(property="branch_id", type="integer", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="role_ids", type="array", @OA\Items(type="integer"))
     *     )),
     *     @OA\Response(response=200, description="Usuario actualizado")
     * )
     */
    public function updateUser() {}

    /**
     * @OA\Delete(path="/users/{user}", summary="Eliminar usuario", tags={"Usuarios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado"),
     *     @OA\Response(response=400, description="No puedes eliminar tu propia cuenta")
     * )
     */
    public function destroyUser() {}

    // ===== CLIENTES =====

    /**
     * @OA\Get(path="/clients", summary="Listar clientes", description="Usuarios con rol 'client'. Incluye estadísticas de ventas. Permiso: clients.view", tags={"Clientes"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Lista paginada de clientes con invoices_count, total_invoiced, last_sale_date")
     * )
     */
    public function indexClients() {}

    /**
     * @OA\Get(path="/clients/{client}", summary="Ver cliente", tags={"Clientes"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="client", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Cliente con empresa y sucursal"),
     *     @OA\Response(response=404, description="No es cliente")
     * )
     */
    public function showClient() {}

    /**
     * @OA\Post(path="/clients", summary="Crear cliente", description="Asigna rol 'client' automáticamente. Permiso: clients.manage", tags={"Clientes"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","email"},
     *         @OA\Property(property="name", type="string", example="María García"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="password", type="string", nullable=true),
     *         @OA\Property(property="document_id", type="string", nullable=true),
     *         @OA\Property(property="document_type", type="string", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="birth_date", type="string", format="date", nullable=true),
     *         @OA\Property(property="gender", type="string", nullable=true),
     *         @OA\Property(property="business_name", type="string", nullable=true),
     *         @OA\Property(property="observations", type="string", nullable=true),
     *         @OA\Property(property="tags", type="array", @OA\Items(type="string"), nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Cliente creado"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeClient() {}

    /**
     * @OA\Put(path="/clients/{client}", summary="Actualizar cliente", tags={"Clientes"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="client", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="email", type="string", format="email"),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="document_id", type="string", nullable=true),
     *         @OA\Property(property="tags", type="array", @OA\Items(type="string"), nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Cliente actualizado")
     * )
     */
    public function updateClient() {}

    /**
     * @OA\Delete(path="/clients/{client}", summary="Eliminar cliente", tags={"Clientes"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="client", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado")
     * )
     */
    public function destroyClient() {}

    // ===== ROLES =====

    /**
     * @OA\Get(path="/roles", summary="Listar roles", description="Excluye super-admin y client. Permiso: roles.view", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Lista paginada de roles con permisos")
     * )
     */
    public function indexRoles() {}

    /**
     * @OA\Get(path="/roles/{role}", summary="Ver rol", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="role", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Rol con permisos")
     * )
     */
    public function showRole() {}

    /**
     * @OA\Post(path="/roles", summary="Crear rol", description="Permiso: roles.manage", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name"},
     *         @OA\Property(property="name", type="string", example="Vendedor"),
     *         @OA\Property(property="slug", type="string", nullable=true),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="permissions", type="array", @OA\Items(type="integer"))
     *     )),
     *     @OA\Response(response=201, description="Rol creado")
     * )
     */
    public function storeRole() {}

    /**
     * @OA\Put(path="/roles/{role}", summary="Actualizar rol", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="role", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="permissions", type="array", @OA\Items(type="integer"))
     *     )),
     *     @OA\Response(response=200, description="Rol actualizado"),
     *     @OA\Response(response=403, description="No se puede modificar roles del sistema")
     * )
     */
    public function updateRole() {}

    /**
     * @OA\Delete(path="/roles/{role}", summary="Eliminar rol", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="role", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado"),
     *     @OA\Response(response=403, description="No se puede eliminar roles del sistema")
     * )
     */
    public function destroyRole() {}

    /**
     * @OA\Post(path="/roles/{role}/assign-permissions", summary="Asignar permisos a rol", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="role", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"permission_ids"},
     *         @OA\Property(property="permission_ids", type="array", @OA\Items(type="integer"))
     *     )),
     *     @OA\Response(response=200, description="Permisos asignados")
     * )
     */
    public function assignPermissions() {}

    /**
     * @OA\Get(path="/permissions", summary="Listar permisos", description="Excluye ocultos y super-admin-only para usuarios normales.", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de permisos")
     * )
     */
    public function indexPermissions() {}

    /**
     * @OA\Get(path="/permissions/grouped", summary="Permisos agrupados", description="Permisos agrupados por módulo.", tags={"Roles y Permisos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Permisos agrupados por group")
     * )
     */
    public function groupedPermissions() {}
}
