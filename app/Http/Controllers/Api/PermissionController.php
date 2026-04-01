<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Database\Seeders\PermissionSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Lista todos los permisos
     * Si el usuario no es super admin, excluye los permisos exclusivos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Permission::orderBy('group')
            ->orderBy('name');

        // Siempre excluir permisos ocultos (no se pueden asignar manualmente)
        $query->where(function ($q) {
            $q->where('is_hidden', false)
                ->orWhereNull('is_hidden');
        });

        // Si no es super admin, excluir permisos exclusivos de super admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where(function ($q) {
                $q->where('is_super_admin_only', false)
                    ->orWhereNull('is_super_admin_only');
            })
            ->whereNotIn('slug', PermissionSeeder::$superAdminOnlyPermissions);
        }

        $permissions = $query->get();

        return response()->json($permissions);
    }

    /**
     * Lista permisos agrupados por grupo
     * Si el usuario no es super admin, excluye los permisos exclusivos
     */
    public function grouped(Request $request): JsonResponse
    {
        $query = Permission::orderBy('name');

        // Siempre excluir permisos ocultos (no se pueden asignar manualmente)
        $query->where(function ($q) {
            $q->where('is_hidden', false)
                ->orWhereNull('is_hidden');
        });

        // Si no es super admin, excluir permisos exclusivos de super admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where(function ($q) {
                $q->where('is_super_admin_only', false)
                    ->orWhereNull('is_super_admin_only');
            })
            ->whereNotIn('slug', PermissionSeeder::$superAdminOnlyPermissions);
        }

        $permissions = $query->get()->groupBy('group');

        return response()->json($permissions);
    }
}
