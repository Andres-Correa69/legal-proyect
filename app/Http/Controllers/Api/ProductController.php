<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductPriceHistory;
use App\Models\SaleItem;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $products = Product::with(['category', 'area', 'location', 'location.warehouse', 'supplier'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('category_id', $categoryId);
            })
            ->when($request->area_id, function ($query, $areaId) {
                $query->where('area_id', $areaId);
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->when($request->low_stock, function ($query) {
                $query->whereRaw('current_stock <= min_stock');
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:product_categories,id',
            'area_id' => 'nullable|exists:product_areas,id',
            'location_id' => 'nullable|exists:locations,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'sku' => 'nullable|string|max:100|unique:products',
            'barcode' => 'nullable|string|max:100|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:100',
            'purchase_price' => 'required|numeric|min:0',
            'sale_price' => 'required|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'current_stock' => 'integer|min:0',
            'min_stock' => 'integer|min:0',
            'max_stock' => 'nullable|integer|min:0',
            'unit_of_measure' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'is_trackable' => 'boolean',
            'auto_purchase_enabled' => 'boolean',
        ]);

        // Auto-generar SKU si no se envía
        if (empty($validated['sku'])) {
            $validated['sku'] = Product::generateSku($request->user()->company_id);
        }

        $validated['average_cost'] = $validated['purchase_price'];

        $product = Product::create($validated);

        return response()->json($product->load(['category', 'area', 'location', 'supplier']), 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'category.area', 'area', 'location', 'supplier', 'movements' => function ($query) {
            $query->latest()->limit(10);
        }]));
    }

    public function nextSku(Request $request): JsonResponse
    {
        $sku = Product::generateSku($request->user()->company_id);
        return response()->json(['sku' => $sku]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'category_id' => 'sometimes|exists:product_categories,id',
            'area_id' => 'nullable|exists:product_areas,id',
            'location_id' => 'nullable|exists:locations,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'sku' => 'sometimes|string|max:100|unique:products,sku,' . $product->id,
            'barcode' => 'nullable|string|max:100|unique:products,barcode,' . $product->id,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:100',
            'purchase_price' => 'sometimes|numeric|min:0',
            'sale_price' => 'sometimes|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'min_stock' => 'integer|min:0',
            'max_stock' => 'nullable|integer|min:0',
            'unit_of_measure' => 'nullable|string|max:50',
            'is_active' => 'boolean',
            'is_trackable' => 'boolean',
            'auto_purchase_enabled' => 'boolean',
        ]);

        // Log ALL field changes
        $numericFields = ['purchase_price', 'sale_price', 'tax_rate', 'min_stock', 'max_stock'];
        $textFields = ['name', 'description', 'brand', 'sku', 'barcode', 'unit_of_measure'];
        $relationFields = [
            'category_id' => ['model' => \App\Models\ProductCategory::class, 'label' => 'category'],
            'area_id' => ['model' => \App\Models\ProductArea::class, 'label' => 'area'],
            'location_id' => ['model' => \App\Models\Location::class, 'label' => 'location'],
            'supplier_id' => ['model' => \App\Models\Supplier::class, 'label' => 'supplier'],
        ];
        $booleanFields = ['is_active', 'is_trackable', 'auto_purchase_enabled'];

        foreach ($validated as $field => $newValue) {
            $oldValue = $product->getOriginal($field);

            // Skip if no change
            if ($oldValue == $newValue) continue;

            if (in_array($field, $numericFields)) {
                if (round((float)$oldValue, 2) == round((float)$newValue, 2)) continue;
                ProductPriceHistory::create([
                    'product_id' => $product->id,
                    'company_id' => $product->company_id,
                    'field' => $field,
                    'old_value' => (float)$oldValue,
                    'new_value' => (float)$newValue,
                    'reason' => 'Edicion manual',
                    'changed_by_user_id' => $request->user()->id,
                ]);
            } elseif (in_array($field, $textFields)) {
                if ((string)$oldValue === (string)$newValue) continue;
                ProductPriceHistory::create([
                    'product_id' => $product->id,
                    'company_id' => $product->company_id,
                    'field' => $field,
                    'old_value' => 0,
                    'new_value' => 0,
                    'old_text' => (string)$oldValue ?: null,
                    'new_text' => (string)$newValue ?: null,
                    'reason' => 'Edicion manual',
                    'changed_by_user_id' => $request->user()->id,
                ]);
            } elseif (isset($relationFields[$field])) {
                $config = $relationFields[$field];
                $oldName = $oldValue ? optional($config['model']::find($oldValue))->name : null;
                $newName = $newValue ? optional($config['model']::find($newValue))->name : null;
                ProductPriceHistory::create([
                    'product_id' => $product->id,
                    'company_id' => $product->company_id,
                    'field' => $config['label'],
                    'old_value' => (float)($oldValue ?? 0),
                    'new_value' => (float)($newValue ?? 0),
                    'old_text' => $oldName,
                    'new_text' => $newName,
                    'reason' => 'Edicion manual',
                    'changed_by_user_id' => $request->user()->id,
                ]);
            } elseif (in_array($field, $booleanFields)) {
                ProductPriceHistory::create([
                    'product_id' => $product->id,
                    'company_id' => $product->company_id,
                    'field' => $field,
                    'old_value' => (float)(bool)$oldValue,
                    'new_value' => (float)(bool)$newValue,
                    'old_text' => $oldValue ? 'Si' : 'No',
                    'new_text' => $newValue ? 'Si' : 'No',
                    'reason' => 'Edicion manual',
                    'changed_by_user_id' => $request->user()->id,
                ]);
            }
        }

        $product->update($validated);

        return response()->json($product->load(['category', 'area', 'location', 'supplier']));
    }

    public function changeLog(Product $product): JsonResponse
    {
        $logs = ProductPriceHistory::where('product_id', $product->id)
            ->with('changedBy:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($logs);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(null, 204);
    }

    public function updateStock(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
            'operation' => 'required|in:add,subtract,set',
            'notes' => 'nullable|string|max:500',
        ]);

        if (!$product->is_trackable) {
            return response()->json(['message' => 'Este producto no es rastreable'], 400);
        }

        $stockBefore = $product->current_stock;

        // Calcular nuevo stock segun operacion
        switch ($validated['operation']) {
            case 'add':
                $stockAfter = $stockBefore + $validated['quantity'];
                $movementQuantity = $validated['quantity'];
                $movementType = 'entry';
                break;
            case 'subtract':
                $stockAfter = $stockBefore - $validated['quantity'];
                if ($stockAfter < 0) {
                    return response()->json(['message' => 'Stock insuficiente'], 400);
                }
                $movementQuantity = -$validated['quantity'];
                $movementType = 'exit';
                break;
            case 'set':
            default:
                $stockAfter = $validated['quantity'];
                $movementQuantity = $stockAfter - $stockBefore;
                $movementType = 'adjustment';
                break;
        }

        // Validar max_stock si aplica
        if ($product->max_stock !== null && $stockAfter > $product->max_stock) {
            return response()->json([
                'message' => "El stock no puede exceder el maximo permitido ({$product->max_stock})"
            ], 400);
        }

        // Crear movimiento de inventario
        InventoryMovement::create([
            'product_id' => $product->id,
            'company_id' => $product->company_id,
            'branch_id' => $request->user()->branch_id,
            'type' => $movementType,
            'quantity' => $movementQuantity,
            'unit_cost' => $product->purchase_price ?? 0,
            'stock_before' => $stockBefore,
            'stock_after' => $stockAfter,
            'created_by_user_id' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        // Actualizar producto
        $product->update([
            'current_stock' => $stockAfter,
            'last_stock_update_at' => now(),
            'last_stock_update_by' => $request->user()->id,
        ]);

        return response()->json([
            'product' => $product->fresh()->load(['category', 'area', 'location', 'supplier']),
            'stock_change' => [
                'before' => $stockBefore,
                'after' => $stockAfter,
                'difference' => $stockAfter - $stockBefore,
                'operation' => $validated['operation'],
            ],
            'needs_restock' => $product->fresh()->needsRestock(),
        ]);
    }

    public function lowStock(Request $request): JsonResponse
    {
        $products = Product::with(['category', 'area', 'location', 'supplier'])
            ->whereRaw('current_stock <= min_stock')
            ->where('is_trackable', true)
            ->orderBy('current_stock', 'asc')
            ->get();

        return response()->json($products);
    }

    /**
     * Obtiene valores unicos de marca y unidad de medida para filtros de ajuste masivo
     */
    public function getFilterOptions(Request $request): JsonResponse
    {
        $brands = Product::whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->orderBy('brand')
            ->pluck('brand');

        $units = Product::whereNotNull('unit_of_measure')
            ->where('unit_of_measure', '!=', '')
            ->distinct()
            ->orderBy('unit_of_measure')
            ->pluck('unit_of_measure');

        return response()->json([
            'brands' => $brands,
            'units' => $units,
        ]);
    }

    /**
     * Ajuste masivo de precios (costo o precio de venta)
     */
    public function bulkPriceAdjust(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_field' => 'required|in:purchase_price,sale_price',
            'operation' => 'required|in:increase,decrease',
            'adjustment_type' => 'required|in:fixed,percentage',
            'value' => 'required|numeric|min:0.01',
            'filter_type' => 'nullable|in:brand,category_id,unit_of_measure,location_id,supplier_id,area_id,all',
            'filter_value' => 'nullable|string',
        ]);

        $query = Product::query();

        $filterType = $validated['filter_type'] ?? 'all';
        $filterValue = $validated['filter_value'] ?? null;

        if ($filterType !== 'all' && $filterValue) {
            switch ($filterType) {
                case 'brand':
                    $query->where('brand', $filterValue);
                    break;
                case 'category_id':
                    $query->where('category_id', (int) $filterValue);
                    break;
                case 'unit_of_measure':
                    $query->where('unit_of_measure', $filterValue);
                    break;
                case 'location_id':
                    $query->where('location_id', (int) $filterValue);
                    break;
                case 'supplier_id':
                    $query->where('supplier_id', (int) $filterValue);
                    break;
                case 'area_id':
                    $query->where('area_id', (int) $filterValue);
                    break;
            }
        }

        $field = $validated['target_field'];
        $products = $query->get();
        $updatedCount = 0;

        foreach ($products as $product) {
            $currentPrice = (float) $product->{$field};

            if ($validated['adjustment_type'] === 'percentage') {
                $adjustmentAmount = $currentPrice * ($validated['value'] / 100);
            } else {
                $adjustmentAmount = (float) $validated['value'];
            }

            if ($validated['operation'] === 'increase') {
                $newPrice = $currentPrice + $adjustmentAmount;
            } else {
                $newPrice = $currentPrice - $adjustmentAmount;
            }

            $newPrice = max(0, round($newPrice, 2));

            $product->{$field} = $newPrice;
            $product->save();
            $updatedCount++;
        }

        return response()->json([
            'message' => "Se actualizaron {$updatedCount} productos.",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * Analytics para un producto: ventas por mes, KPIs, top clientes
     */
    public function analytics(Request $request, Product $product): JsonResponse
    {
        $companyId = $product->company_id;

        // Ventas por mes (últimos 6 meses)
        $sixMonthsAgo = now()->subMonths(6)->startOfMonth();
        $salesByMonth = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sale_items.product_id', $product->id)
            ->where('sales.company_id', $companyId)
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->where('sales.invoice_date', '>=', $sixMonthsAgo)
            ->select([
                DB::raw(
                    DB::getDriverName() === 'pgsql'
                        ? "TO_CHAR(sales.invoice_date, 'YYYY-MM') as mes"
                        : "DATE_FORMAT(sales.invoice_date, '%Y-%m') as mes"
                ),
                DB::raw('SUM(sale_items.quantity) as ventas'),
                DB::raw('SUM(sale_items.total) as ingresos'),
            ])
            ->groupBy('mes')
            ->orderBy('mes')
            ->get()
            ->map(function ($row) {
                $date = \Carbon\Carbon::createFromFormat('Y-m', $row->mes);
                return [
                    'mes' => $date->translatedFormat('M'),
                    'mesNum' => $row->mes,
                    'ventas' => (int) $row->ventas,
                    'ingresos' => round((float) $row->ingresos),
                ];
            });

        // KPIs últimos 30 días
        $thirtyDaysAgo = now()->subDays(30);
        $sixtyDaysAgo = now()->subDays(60);

        $current30d = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sale_items.product_id', $product->id)
            ->where('sales.company_id', $companyId)
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->where('sales.invoice_date', '>=', $thirtyDaysAgo)
            ->select([
                DB::raw('COALESCE(SUM(sale_items.quantity), 0) as total_quantity'),
                DB::raw('COALESCE(SUM(sale_items.total), 0) as total_revenue'),
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as total_sales'),
            ])
            ->first();

        $previous30d = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sale_items.product_id', $product->id)
            ->where('sales.company_id', $companyId)
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$sixtyDaysAgo, $thirtyDaysAgo])
            ->select([
                DB::raw('COALESCE(SUM(sale_items.quantity), 0) as total_quantity'),
                DB::raw('COALESCE(SUM(sale_items.total), 0) as total_revenue'),
            ])
            ->first();

        $prevRevenue = (float) ($previous30d->total_revenue ?? 0);
        $currRevenue = (float) ($current30d->total_revenue ?? 0);
        $revenueChange = $prevRevenue > 0
            ? round((($currRevenue - $prevRevenue) / $prevRevenue) * 100, 1)
            : ($currRevenue > 0 ? 100 : 0);

        $totalQuantity30d = (int) ($current30d->total_quantity ?? 0);
        $rotacionDias = $product->is_trackable && $totalQuantity30d > 0
            ? round(($product->current_stock / ($totalQuantity30d / 30)) * 1)
            : 0;

        // Top clientes que compraron este producto
        $topClients = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('users', 'sales.client_id', '=', 'users.id')
            ->where('sale_items.product_id', $product->id)
            ->where('sales.company_id', $companyId)
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->where('sales.invoice_date', '>=', $sixMonthsAgo)
            ->select([
                'users.name as nombre',
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as compras'),
                DB::raw('SUM(sale_items.total) as total'),
            ])
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'nombre' => $row->nombre,
                'compras' => (int) $row->compras,
                'total' => round((float) $row->total),
            ]);

        // Movimientos de inventario (sin filtro de sucursal para ver todo el historial)
        $movements = InventoryMovement::withAllBranches()
            ->where('product_id', $product->id)
            ->where('company_id', $companyId)
            ->with('createdBy:id,name')
            ->latest()
            ->limit(50)
            ->get();

        // Adjuntar precio de venta unitario para movimientos de tipo venta
        $saleMovementIds = $movements
            ->filter(fn ($m) => str_contains($m->reference_type ?? '', 'Sale'))
            ->pluck('reference_id')
            ->unique();

        $saleUnitPrices = [];
        if ($saleMovementIds->isNotEmpty()) {
            $saleUnitPrices = SaleItem::whereIn('sale_id', $saleMovementIds)
                ->where('product_id', $product->id)
                ->pluck('unit_price', 'sale_id')
                ->toArray();
        }

        $movements->each(function ($movement) use ($saleUnitPrices) {
            $movement->sale_unit_price = null;
            if (str_contains($movement->reference_type ?? '', 'Sale') && isset($saleUnitPrices[$movement->reference_id])) {
                $movement->sale_unit_price = (float) $saleUnitPrices[$movement->reference_id];
            }
        });

        return response()->json([
            'sales_by_month' => $salesByMonth,
            'kpis' => [
                'total_ventas_30d' => $totalQuantity30d,
                'ingresos_30d' => round($currRevenue),
                'ganancia_30d' => round($currRevenue - ($totalQuantity30d * ($product->purchase_price ?? 0))),
                'margen' => $product->sale_price > 0 && $product->purchase_price > 0
                    ? round((($product->sale_price - $product->purchase_price) / $product->sale_price) * 100, 1)
                    : 0,
                'cambio_ventas' => $revenueChange,
                'rotacion_dias' => $rotacionDias,
            ],
            'top_clients' => $topClients,
            'movements' => $movements,
        ]);
    }

    public function uploadImage(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $service = app(CompanyFileStorageService::class);
        $company = $request->user()->company;

        if ($product->image_url) {
            $service->deleteFileFromUrl($product->image_url);
        }

        $url = $service->uploadProductImage($company, $request->file('image'));

        if (!$url) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir la imagen',
            ], 500);
        }

        $product->update(['image_url' => $url]);

        return response()->json([
            'success' => true,
            'data' => $product->fresh()->load(['category', 'area', 'location', 'supplier']),
            'message' => 'Imagen actualizada',
        ]);
    }

    public function deleteImage(Request $request, Product $product): JsonResponse
    {
        if ($product->image_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($product->image_url);
            $product->update(['image_url' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => $product->fresh()->load(['category', 'area', 'location', 'supplier']),
            'message' => 'Imagen eliminada',
        ]);
    }
}
