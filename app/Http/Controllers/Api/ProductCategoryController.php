<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $categories = ProductCategory::with('area')->withCount('products')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->area_id, function ($query, $areaId) {
                $query->where('area_id', $areaId);
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'area_id' => 'nullable|exists:product_areas,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category = ProductCategory::create($validated);

        return response()->json($category->load('area'), 201);
    }

    public function show(Request $request, ProductCategory $productCategory): JsonResponse
    {
        return response()->json($productCategory->load('products'));
    }

    public function update(Request $request, ProductCategory $productCategory): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255',
            'area_id' => 'nullable|exists:product_areas,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['name']) && empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $productCategory->update($validated);

        return response()->json($productCategory->load('area'));
    }

    public function destroy(Request $request, ProductCategory $productCategory): JsonResponse
    {
        if ($productCategory->products()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar una categoría con productos'], 400);
        }

        $productCategory->delete();

        return response()->json(null, 204);
    }
}
