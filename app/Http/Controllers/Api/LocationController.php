<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locations = Location::with(['warehouse', 'parent', 'children'])
            ->withCount('products')
            ->when($request->warehouse_id, function ($query, $warehouseId) {
                $query->where('warehouse_id', $warehouseId);
            })
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->when($request->type, function ($query, $type) {
                $query->where('type', $type);
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->when($request->parent_id, function ($query, $parentId) {
                $query->where('parent_id', $parentId);
            })
            ->when($request->root_only, function ($query) {
                $query->whereNull('parent_id');
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($locations);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'parent_id' => 'nullable|exists:locations,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'type' => 'required|in:zone,aisle,shelf,bin',
            'is_active' => 'boolean',
        ]);

        // Generar código automáticamente si no se proporciona
        if (empty($validated['code'])) {
            $typePrefix = strtoupper(substr($validated['type'], 0, 3));
            $baseCode = $typePrefix . '-' . strtoupper(Str::substr(Str::slug($validated['name']), 0, 3));
            $code = $baseCode;
            $counter = 1;
            while (Location::where('code', $code)->where('warehouse_id', $validated['warehouse_id'])->exists()) {
                $code = $baseCode . '-' . str_pad($counter, 2, '0', STR_PAD_LEFT);
                $counter++;
            }
            $validated['code'] = $code;
        }

        $location = Location::create($validated);

        return response()->json($location->load(['warehouse', 'parent']), 201);
    }

    public function show(Request $request, Location $location): JsonResponse
    {
        return response()->json($location->load(['warehouse', 'parent', 'children', 'products']));
    }

    public function update(Request $request, Location $location): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'sometimes|exists:warehouses,id',
            'parent_id' => 'nullable|exists:locations,id',
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50',
            'type' => 'sometimes|in:zone,aisle,shelf,bin',
            'is_active' => 'boolean',
        ]);

        // Evitar ciclos en la jerarquía
        if (isset($validated['parent_id']) && $validated['parent_id'] == $location->id) {
            return response()->json(['message' => 'Una ubicación no puede ser su propio padre'], 400);
        }

        $location->update($validated);

        return response()->json($location->load(['warehouse', 'parent']));
    }

    public function destroy(Request $request, Location $location): JsonResponse
    {
        if ($location->children()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar una ubicación con sub-ubicaciones'], 400);
        }

        if ($location->products()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar una ubicación con productos'], 400);
        }

        $location->delete();

        return response()->json(null, 204);
    }
}
