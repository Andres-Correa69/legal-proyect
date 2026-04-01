<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $suppliers = Supplier::with('municipality')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('tax_id', 'like', "%{$search}%");
                });
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($suppliers);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|max:50',
            'municipality_id' => 'nullable|exists:municipalities,id',
            'company_id' => 'nullable|exists:companies,id',
            'payment_terms' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json($supplier->load('municipality'), 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        return response()->json($supplier->load(['purchases' => function ($query) {
            $query->latest()->limit(10);
        }]));
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|max:50',
            'municipality_id' => 'nullable|exists:municipalities,id',
            'company_id' => 'sometimes|exists:companies,id',
            'payment_terms' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $supplier->update($validated);

        return response()->json($supplier->load('municipality'));
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->purchases()->count() > 0) {
            return response()->json(['message' => 'No se puede eliminar un proveedor con compras'], 400);
        }

        $supplier->delete();

        return response()->json(null, 204);
    }
}
