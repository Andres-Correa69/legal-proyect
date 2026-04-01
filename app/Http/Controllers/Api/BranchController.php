<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Branch::with('company');

        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        } elseif ($request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        $branches = $query
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($branches);
    }

    public function store(Request $request): JsonResponse
    {
        // Solo super admin puede crear sucursales
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Solo el super administrador puede crear sucursales'], 403);
        }

        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'is_active' => 'boolean',
            'is_main' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        // Generar slug automaticamente si no se proporciona
        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Branch::where('slug', $slug)->where('company_id', $validated['company_id'])->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $branch = Branch::create($validated);

        return response()->json($branch, 201);
    }

    public function show(Request $request, Branch $branch): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && !$request->user()->canAccessCompany($branch->company_id)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($branch->load('company'));
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        // Solo super admin puede editar sucursales
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Solo el super administrador puede editar sucursales'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'is_active' => 'boolean',
            'is_main' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $branch->update($validated);

        return response()->json($branch);
    }

    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        // Solo super admin puede eliminar sucursales
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Solo el super administrador puede eliminar sucursales'], 403);
        }

        $branch->delete();

        return response()->json(null, 204);
    }

    /**
     * Activar/desactivar una sucursal
     */
    public function toggleActive(Request $request, Branch $branch): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $branch->update(['is_active' => !$branch->is_active]);

        return response()->json($branch->load('company'));
    }

    /**
     * Cambiar la sede activa del usuario autenticado
     */
    public function switchBranch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
        ]);

        $user = $request->user();
        $branch = Branch::where('id', $validated['branch_id'])
            ->where('is_active', true)
            ->first();

        if (!$branch) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'La sede seleccionada no existe o no está activa.',
            ], 422);
        }

        if (!$user->isSuperAdmin() && $branch->company_id !== $user->company_id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No tienes acceso a esta sede.',
            ], 403);
        }

        $user->update(['branch_id' => $branch->id]);

        return response()->json([
            'success' => true,
            'data' => $user->load('branch'),
            'message' => 'Sede cambiada exitosamente a ' . $branch->name,
        ]);
    }
}
