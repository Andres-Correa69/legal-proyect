<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreServiceRequest;
use App\Http\Requests\UpdateServiceRequest;
use App\Models\Service;
use App\Models\ServiceProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * Lista servicios con filtros
     */
    public function index(Request $request): JsonResponse
    {
        $services = Service::with(['branch', 'createdBy'])
            // Filtro por sucursal específica
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            })
            // Filtro por categoría
            ->when($request->category, function ($query, $category) {
                $query->where('category', $category);
            })
            // Filtro por unidad
            ->when($request->unit, function ($query, $unit) {
                $query->where('unit', $unit);
            })
            // Filtro por rango de precio mínimo
            ->when($request->price_min, function ($query, $priceMin) {
                $query->where('price', '>=', $priceMin);
            })
            // Filtro por rango de precio máximo
            ->when($request->price_max, function ($query, $priceMax) {
                $query->where('price', '<=', $priceMax);
            })
            // Filtro por estado activo/inactivo
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            // Búsqueda por texto (nombre, descripción, slug)
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            // Ordenamiento
            ->when($request->sort_by, function ($query, $sortBy) use ($request) {
                $direction = $request->input('sort_direction', 'asc');
                $allowedColumns = ['name', 'price', 'category', 'created_at', 'estimated_duration', 'unit'];
                if (in_array($sortBy, $allowedColumns)) {
                    $query->orderBy($sortBy, $direction);
                }
            }, function ($query) {
                $query->orderBy('name');
            })
            ->paginate($request->per_page ?? 15);

        // Agregar atributos computados a la respuesta
        $services->getCollection()->transform(function ($service) {
            $service->category_name = $service->category_name;
            $service->unit_name = $service->unit_name;
            $service->formatted_duration = $service->formatted_duration;
            $service->discount_percentage = $service->discount_percentage;
            return $service;
        });

        return response()->json($services);
    }

    /**
     * Crea un nuevo servicio
     */
    public function store(StoreServiceRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Asignar company_id automáticamente
        $validated['company_id'] = $user->isSuperAdmin()
            ? ($request->input('company_id') ?? $user->company_id)
            : $user->company_id;

        $products = $validated['products'] ?? null;
        unset($validated['products']);

        $service = Service::create($validated);

        if ($products) {
            $this->saveServiceProducts($service, $products);
        }

        return response()->json(
            $service->load(['branch', 'createdBy', 'serviceProducts.product']),
            201
        );
    }

    /**
     * Muestra un servicio específico
     */
    public function show(Request $request, Service $service): JsonResponse
    {
        $service->load(['branch', 'createdBy', 'lastPriceChangedBy', 'serviceProducts.product']);

        // Agregar atributos computados
        $service->category_name = $service->category_name;
        $service->unit_name = $service->unit_name;
        $service->formatted_duration = $service->formatted_duration;
        $service->discount_percentage = $service->discount_percentage;

        return response()->json($service);
    }

    /**
     * Actualiza un servicio
     */
    public function update(UpdateServiceRequest $request, Service $service): JsonResponse
    {
        $validated = $request->validated();

        $products = $validated['products'] ?? null;
        unset($validated['products']);

        $service->update($validated);

        if ($products !== null) {
            $this->saveServiceProducts($service, $products);
        }

        $service->load(['branch', 'createdBy', 'lastPriceChangedBy', 'serviceProducts.product']);

        // Agregar atributos computados
        $service->category_name = $service->category_name;
        $service->unit_name = $service->unit_name;
        $service->formatted_duration = $service->formatted_duration;
        $service->discount_percentage = $service->discount_percentage;

        return response()->json($service);
    }

    /**
     * Elimina un servicio (soft delete)
     */
    public function destroy(Request $request, Service $service): JsonResponse
    {
        $user = $request->user();

        // Solo admin o superadmin pueden eliminar
        if (!$user->isAdmin() && !$user->isSuperAdmin()) {
            return response()->json([
                'message' => 'Solo los administradores pueden eliminar servicios.',
            ], 403);
        }

        $service->delete();

        return response()->json(null, 204);
    }

    /**
     * Sincroniza los productos de un servicio (endpoint dedicado)
     */
    public function syncProducts(Request $request, Service $service): JsonResponse
    {
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.product_id' => 'required|integer|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.is_included' => 'required|boolean',
        ]);

        $this->saveServiceProducts($service, $validated['products']);

        $service->load('serviceProducts.product');

        return response()->json($service);
    }

    /**
     * Guarda/sincroniza los productos de un servicio
     */
    private function saveServiceProducts(Service $service, array $products): void
    {
        $service->serviceProducts()->delete();

        foreach ($products as $item) {
            ServiceProduct::create([
                'company_id' => $service->company_id,
                'service_id' => $service->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'is_included' => $item['is_included'],
            ]);
        }
    }

    /**
     * Obtiene las categorías disponibles
     */
    public function categories(): JsonResponse
    {
        return response()->json(Service::CATEGORIES);
    }

    /**
     * Obtiene las unidades de medida disponibles
     */
    public function units(): JsonResponse
    {
        return response()->json(Service::UNITS);
    }
}
