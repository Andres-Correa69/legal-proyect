<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $types = ProductType::withCount('products')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($types);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $type = ProductType::create($validated);

        return response()->json($type, 201);
    }

    public function show(Request $request, ProductType $productType): JsonResponse
    {
        return response()->json($productType->load('products'));
    }

    public function update(Request $request, ProductType $productType): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['name']) && empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $productType->update($validated);

        return response()->json($productType);
    }

    public function destroy(Request $request, ProductType $productType): JsonResponse
    {
        if ($productType->products()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar un tipo de producto con productos asociados'], 400);
        }

        $productType->delete();

        return response()->json(null, 204);
    }
}
