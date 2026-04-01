<?php

namespace App\Swagger;

/**
 * @OA\Tag(name="Productos", description="CRUD de productos con stock y ajuste masivo de precios")
 * @OA\Tag(name="Categorías de Producto", description="CRUD de categorías de producto")
 * @OA\Tag(name="Áreas de Producto", description="CRUD de áreas/zonas de producto")
 * @OA\Tag(name="Servicios", description="CRUD de servicios facturables")
 */
class ProductServiceDocs
{
    // ===== PRODUCTOS =====

    /**
     * @OA\Get(path="/products", summary="Listar productos", description="Con filtros por búsqueda, categoría, área, activo, stock bajo. Permiso: products.view", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", description="Buscar por nombre, SKU o código de barras", @OA\Schema(type="string")),
     *     @OA\Parameter(name="category_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="area_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="low_stock", in="query", description="Solo productos con stock bajo", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="Lista de productos con relaciones")
     * )
     */
    public function indexProducts() {}

    /**
     * @OA\Get(path="/products/low-stock", summary="Productos con stock bajo", description="Productos donde current_stock <= min_stock.", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de productos con stock bajo")
     * )
     */
    public function lowStock() {}

    /**
     * @OA\Get(path="/products/filter-options", summary="Opciones de filtro", description="Marcas y unidades únicas para ajuste masivo. Permiso: products.bulk-price-adjust", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Opciones", @OA\JsonContent(
     *         @OA\Property(property="brands", type="array", @OA\Items(type="string")),
     *         @OA\Property(property="units", type="array", @OA\Items(type="string"))
     *     ))
     * )
     */
    public function filterOptions() {}

    /**
     * @OA\Post(path="/products/bulk-price-adjust", summary="Ajuste masivo de precios", description="Aumentar/disminuir precios por porcentaje o valor fijo. Permiso: products.bulk-price-adjust", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"target_field","operation","adjustment_type","value"},
     *         @OA\Property(property="target_field", type="string", enum={"purchase_price","sale_price"}),
     *         @OA\Property(property="operation", type="string", enum={"increase","decrease"}),
     *         @OA\Property(property="adjustment_type", type="string", enum={"fixed","percentage"}),
     *         @OA\Property(property="value", type="number", example=10),
     *         @OA\Property(property="filter_type", type="string", enum={"brand","category_id","unit_of_measure","location_id","supplier_id","area_id","all"}, nullable=true),
     *         @OA\Property(property="filter_value", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=200, description="Ajuste realizado", @OA\JsonContent(
     *         @OA\Property(property="message", type="string"),
     *         @OA\Property(property="updated_count", type="integer")
     *     ))
     * )
     */
    public function bulkPriceAdjust() {}

    /**
     * @OA\Get(path="/products/{product}", summary="Ver producto", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="product", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Producto con categoría, área, ubicación, proveedor y últimos movimientos")
     * )
     */
    public function showProduct() {}

    /**
     * @OA\Post(path="/products", summary="Crear producto", description="Permiso: products.manage", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"category_id","sku","name","purchase_price","sale_price"},
     *         @OA\Property(property="category_id", type="integer"),
     *         @OA\Property(property="area_id", type="integer", nullable=true),
     *         @OA\Property(property="location_id", type="integer", nullable=true),
     *         @OA\Property(property="supplier_id", type="integer", nullable=true),
     *         @OA\Property(property="sku", type="string", example="PROD-001"),
     *         @OA\Property(property="barcode", type="string", nullable=true),
     *         @OA\Property(property="name", type="string", example="Producto ejemplo"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="brand", type="string", nullable=true),
     *         @OA\Property(property="purchase_price", type="number", example=50000),
     *         @OA\Property(property="sale_price", type="number", example=75000),
     *         @OA\Property(property="tax_rate", type="number", example=19),
     *         @OA\Property(property="current_stock", type="integer", example=100),
     *         @OA\Property(property="min_stock", type="integer", example=10),
     *         @OA\Property(property="max_stock", type="integer", nullable=true),
     *         @OA\Property(property="unit_of_measure", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean"),
     *         @OA\Property(property="is_trackable", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Producto creado"),
     *     @OA\Response(response=422, description="Error de validación")
     * )
     */
    public function storeProduct() {}

    /**
     * @OA\Put(path="/products/{product}", summary="Actualizar producto", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="product", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="sku", type="string"),
     *         @OA\Property(property="purchase_price", type="number"),
     *         @OA\Property(property="sale_price", type="number"),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Producto actualizado")
     * )
     */
    public function updateProduct() {}

    /**
     * @OA\Delete(path="/products/{product}", summary="Eliminar producto", description="No se puede eliminar si tiene stock > 0.", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="product", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado"),
     *     @OA\Response(response=400, description="Tiene stock")
     * )
     */
    public function destroyProduct() {}

    /**
     * @OA\Post(path="/products/{product}/update-stock", summary="Actualizar stock manualmente", description="Operaciones: add, subtract, set. Crea movimiento de inventario.", tags={"Productos"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="product", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"quantity","operation"},
     *         @OA\Property(property="quantity", type="integer", example=50),
     *         @OA\Property(property="operation", type="string", enum={"add","subtract","set"}),
     *         @OA\Property(property="notes", type="string", nullable=true)
     *     )),
     *     @OA\Response(response=200, description="Stock actualizado", @OA\JsonContent(
     *         @OA\Property(property="product", type="object"),
     *         @OA\Property(property="stock_change", type="object",
     *             @OA\Property(property="before", type="integer"),
     *             @OA\Property(property="after", type="integer"),
     *             @OA\Property(property="difference", type="integer")
     *         ),
     *         @OA\Property(property="needs_restock", type="boolean")
     *     )),
     *     @OA\Response(response=400, description="Stock insuficiente o producto no rastreable")
     * )
     */
    public function updateStock() {}

    // ===== CATEGORÍAS =====

    /**
     * @OA\Get(path="/product-categories", summary="Listar categorías", tags={"Categorías de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="area_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Lista paginada con products_count")
     * )
     */
    public function indexCategories() {}

    /**
     * @OA\Get(path="/product-categories/{productCategory}", summary="Ver categoría", tags={"Categorías de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productCategory", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Categoría con productos")
     * )
     */
    public function showCategory() {}

    /**
     * @OA\Post(path="/product-categories", summary="Crear categoría", tags={"Categorías de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name"},
     *         @OA\Property(property="name", type="string", example="Electrónicos"),
     *         @OA\Property(property="area_id", type="integer", nullable=true),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Categoría creada")
     * )
     */
    public function storeCategory() {}

    /**
     * @OA\Put(path="/product-categories/{productCategory}", summary="Actualizar categoría", tags={"Categorías de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productCategory", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="area_id", type="integer", nullable=true),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Categoría actualizada")
     * )
     */
    public function updateCategory() {}

    /**
     * @OA\Delete(path="/product-categories/{productCategory}", summary="Eliminar categoría", tags={"Categorías de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productCategory", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada"),
     *     @OA\Response(response=400, description="Tiene productos asociados")
     * )
     */
    public function destroyCategory() {}

    // ===== ÁREAS =====

    /**
     * @OA\Get(path="/product-areas", summary="Listar áreas", tags={"Áreas de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="Lista paginada con products_count")
     * )
     */
    public function indexAreas() {}

    /**
     * @OA\Get(path="/product-areas/{productArea}", summary="Ver área", tags={"Áreas de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productArea", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Área con productos")
     * )
     */
    public function showArea() {}

    /**
     * @OA\Post(path="/product-areas", summary="Crear área", tags={"Áreas de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name"},
     *         @OA\Property(property="name", type="string", example="Farmacia"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Área creada")
     * )
     */
    public function storeArea() {}

    /**
     * @OA\Put(path="/product-areas/{productArea}", summary="Actualizar área", tags={"Áreas de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productArea", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Área actualizada")
     * )
     */
    public function updateArea() {}

    /**
     * @OA\Delete(path="/product-areas/{productArea}", summary="Eliminar área", tags={"Áreas de Producto"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="productArea", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminada"),
     *     @OA\Response(response=400, description="Tiene productos asociados")
     * )
     */
    public function destroyArea() {}

    // ===== SERVICIOS =====

    /**
     * @OA\Get(path="/services", summary="Listar servicios", description="Con filtros por categoría, unidad, precio, estado. Permiso: services.view", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="category", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="unit", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="price_min", in="query", @OA\Schema(type="number")),
     *     @OA\Parameter(name="price_max", in="query", @OA\Schema(type="number")),
     *     @OA\Parameter(name="is_active", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="sort_by", in="query", @OA\Schema(type="string", enum={"name","price","category","created_at"})),
     *     @OA\Response(response=200, description="Lista paginada de servicios")
     * )
     */
    public function indexServices() {}

    /**
     * @OA\Get(path="/services/categories", summary="Categorías de servicio", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de categorías disponibles")
     * )
     */
    public function serviceCategories() {}

    /**
     * @OA\Get(path="/services/units", summary="Unidades de medida de servicio", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Response(response=200, description="Lista de unidades disponibles")
     * )
     */
    public function serviceUnits() {}

    /**
     * @OA\Get(path="/services/{service}", summary="Ver servicio", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="service", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Servicio con sucursal, creador y atributos computados")
     * )
     */
    public function showService() {}

    /**
     * @OA\Post(path="/services", summary="Crear servicio", description="Permiso: services.manage", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"name","price"},
     *         @OA\Property(property="name", type="string", example="Consulta veterinaria"),
     *         @OA\Property(property="description", type="string", nullable=true),
     *         @OA\Property(property="price", type="number", example=50000),
     *         @OA\Property(property="category", type="string", nullable=true),
     *         @OA\Property(property="unit", type="string", nullable=true),
     *         @OA\Property(property="estimated_duration", type="integer", nullable=true),
     *         @OA\Property(property="branch_id", type="integer", nullable=true),
     *         @OA\Property(property="tax_rate", type="number", nullable=true),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Servicio creado")
     * )
     */
    public function storeService() {}

    /**
     * @OA\Put(path="/services/{service}", summary="Actualizar servicio", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="service", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         @OA\Property(property="name", type="string"),
     *         @OA\Property(property="price", type="number"),
     *         @OA\Property(property="is_active", type="boolean")
     *     )),
     *     @OA\Response(response=200, description="Servicio actualizado")
     * )
     */
    public function updateService() {}

    /**
     * @OA\Delete(path="/services/{service}", summary="Eliminar servicio", tags={"Servicios"}, security={{"bearerAuth": {}}},
     *     @OA\Parameter(name="service", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="Eliminado")
     * )
     */
    public function destroyService() {}
}
