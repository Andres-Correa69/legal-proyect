<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductArea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductAreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $areas = ProductArea::withCount('products')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($areas);
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

        $area = ProductArea::create($validated);

        return response()->json($area, 201);
    }

    public function show(Request $request, ProductArea $productArea): JsonResponse
    {
        return response()->json($productArea->load('products'));
    }

    public function update(Request $request, ProductArea $productArea): JsonResponse
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

        $productArea->update($validated);

        return response()->json($productArea);
    }

    public function destroy(Request $request, ProductArea $productArea): JsonResponse
    {
        if ($productArea->products()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar un area con productos asociados'], 400);
        }

        $productArea->delete();

        return response()->json(null, 204);
    }
}
