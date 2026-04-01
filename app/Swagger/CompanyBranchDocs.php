<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Empresas", description="CRUD de empresas (Solo SuperAdmin)")
 * @OA\Tag(name="Sucursales", description="CRUD de sucursales por empresa")
 */
class CompanyBranchDocs
{
    // ===== EMPRESAS =====

    /**
     * @OA\Get(path="/companies", summary="Listar empresas", description="Paginado con búsqueda. Solo SuperAdmin.", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", example=15)),
     *     @OA\Response(response=200, description="Lista paginada de empresas"),
     *     @OA\Response(response=403, description="No autorizado")
     * )
     */
    public function indexCompanies() {}

    /**
     * @OA\Get(path="/companies/{company}", summary="Ver empresa", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="company", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Empresa con sucursales, padre e hijas")
     * )
     */
    public function showCompany() {}

    /**
     * @OA\Post(path="/companies", summary="Crear empresa", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name"},
     *         @OA\Property(property="name", type="string", example="Mi Empresa S.A.S"),
     *         @OA\Property(property="slug", type="string", nullable=true),
     *         @OA\Property(property="email", type="string", format="email", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="tax_id", type="string", nullable=true, example="900123456"),
     *         @OA\Property(property="parent_id", type="integer", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="settings", type="object", nullable=true),
     *         @OA\Property(property="logo_url", type="string", format="url", nullable=true)
     *     )),
     *     @OA\Response(response=201, description="Empresa creada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeCompany() {}

    /**
     * @OA\Put(path="/companies/{company}", summary="Actualizar empresa", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="company", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="email", type="string", format="email", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="tax_id", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="settings", type="object", nullable=true)
     *     )),
     *     @OA\Response(response=200, description="Empresa actualizada")
     * )
     */
    public function updateCompany() {}

    /**
     * @OA\Delete(path="/companies/{company}", summary="Eliminar empresa", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="company", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada")
     * )
     */
    public function destroyCompany() {}

    /**
     * @OA\Patch(path="/companies/{company}/toggle-active", summary="Activar/desactivar empresa", tags={"Empresas"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="company", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Estado cambiado")
     * )
     */
    public function toggleActiveCompany() {}

    // ===== SUCURSALES =====

    /**
     * @OA\Get(path="/branches", summary="Listar sucursales", description="Filtrada por empresa del usuario. SuperAdmin ve todas.", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="company_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Lista paginada de sucursales")
     * )
     */
    public function indexBranches() {}

    /**
     * @OA\Get(path="/branches/{branch}", summary="Ver sucursal", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="branch", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Sucursal con empresa")
     * )
     */
    public function showBranch() {}

    /**
     * @OA\Post(path="/branches", summary="Crear sucursal", description="Solo SuperAdmin.", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"company_id","name"},
     *         @OA\Property(property="company_id", type="integer"),
     *         @OA\Property(property="name", type="string", example="Sucursal Principal"),
     *         @OA\Property(property="code", type="string", nullable=true),
     *         @OA\Property(property="email", type="string", format="email", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="city", type="string", nullable=true),
     *         @OA\Property(property="state", type="string", nullable=true),
     *         @OA\Property(property="country", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="is_main", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Sucursal creada"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeBranch() {}

    /**
     * @OA\Put(path="/branches/{branch}", summary="Actualizar sucursal", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="branch", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="code", type="string", nullable=true),
     *         @OA\Property(property="email", type="string", format="email", nullable=true),
     *         @OA\Property(property="phone", type="string", nullable=true),
     *         @OA\Property(property="address", type="string", nullable=true),
     *         @OA\Property(property="city", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="is_main", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Sucursal actualizada")
     * )
     */
    public function updateBranch() {}

    /**
     * @OA\Delete(path="/branches/{branch}", summary="Eliminar sucursal", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="branch", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada")
     * )
     */
    public function destroyBranch() {}

    /**
     * @OA\Patch(path="/branches/{branch}/toggle-active", summary="Activar/desactivar sucursal", tags={"Sucursales"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="branch", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Estado cambiado")
     * )
     */
    public function toggleActiveBranch() {}
}
