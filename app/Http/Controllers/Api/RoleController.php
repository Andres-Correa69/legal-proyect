<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Role::with('permissions');

        // Excluir roles del sistema que no deben mostrarse en la UI
        $query->whereNotIn('slug', ['super-admin', 'client']);

        if (!$request->user()->isSuperAdmin()) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('company_id')
                    ->orWhere('company_id', $request->user()->company_id);
            });
        } elseif ($request->company_id) {
            $query->where(function ($q) use ($request) {
                $q->whereNull('company_id')
                    ->orWhere('company_id', $request->company_id);
            });
        }

        $roles = $query
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($roles);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:roles',
            'description' => 'nullable|string|max:500',
            'company_id' => 'nullable|exists:companies,id',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        if (!$request->user()->isSuperAdmin()) {
            $validated['company_id'] = $request->user()->company_id;
        }

        // Generar slug automaticamente si no se proporciona
        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Role::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $role = Role::create($validated);

        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json($role->load('permissions'), 201);
    }

    public function show(Request $request, Role $role): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $role->company_id !== null && $role->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $role->load(['permissions', 'users:id,name,email,branch_id', 'users.branch:id,name']);
        $role->loadCount('users');

        return response()->json($role);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if ($role->isSystemRole() && !$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No puedes modificar roles del sistema'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:roles,slug,' . $role->id,
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update($validated);

        if (isset($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return response()->json($role->load('permissions'));
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($role->isSystemRole()) {
            return response()->json(['message' => 'No puedes eliminar roles del sistema'], 403);
        }

        if (!$request->user()->isSuperAdmin() && $role->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $role->delete();

        return response()->json(null, 204);
    }

    public function assignPermissions(Request $request, Role $role): JsonResponse
    {
        // Verificar acceso al rol
        if (!$request->user()->isSuperAdmin() && $role->company_id !== null && $role->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($validated['permission_ids']);

        return response()->json($role->load('permissions'));
    }
}
