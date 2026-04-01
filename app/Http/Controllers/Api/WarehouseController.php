<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $warehouses = Warehouse::with(['branch', 'locations'])
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($warehouses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ]);

        // Generar código automáticamente si no se proporciona
        if (empty($validated['code'])) {
            $baseCode = 'BOD-' . strtoupper(Str::substr(Str::slug($validated['name']), 0, 3));
            $code = $baseCode;
            $counter = 1;
            while (Warehouse::where('code', $code)->exists()) {
                $code = $baseCode . '-' . str_pad($counter, 2, '0', STR_PAD_LEFT);
                $counter++;
            }
            $validated['code'] = $code;
        }

        // Si es default, quitar default de otros
        if (!empty($validated['is_default']) && $validated['is_default']) {
            Warehouse::where('company_id', $request->user()->company_id)
                ->update(['is_default' => false]);
        }

        $warehouse = Warehouse::create($validated);

        return response()->json($warehouse->load('branch'), 201);
    }

    public function show(Request $request, Warehouse $warehouse): JsonResponse
    {
        return response()->json($warehouse->load(['branch', 'locations']));
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50',
            'address' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ]);

        if (!empty($validated['is_default']) && $validated['is_default']) {
            Warehouse::where('company_id', $warehouse->company_id)
                ->where('id', '!=', $warehouse->id)
                ->update(['is_default' => false]);
        }

        $warehouse->update($validated);

        return response()->json($warehouse->load('branch'));
    }

    public function destroy(Request $request, Warehouse $warehouse): JsonResponse
    {
        if ($warehouse->locations()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar una bodega con ubicaciones'], 400);
        }

        $warehouse->delete();

        return response()->json(null, 204);
    }
}
