<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $user = $request->user();

        // Cargar relaciones solo si no están cargadas (optimización)
        if (!$user->relationLoaded('roles')) {
            $user->load(['roles.permissions']);
        }

        // Super admin tiene acceso a todo
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Verificar que el usuario tenga una empresa asignada
        if (!$user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes una empresa asignada. Contacta al administrador.',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        // Si se está accediendo a un recurso específico de empresa
        $companyId = $request->route('company')
            ? (is_object($request->route('company')) ? $request->route('company')->id : $request->route('company'))
            : null;

        if ($companyId && !$user->canAccessCompany($companyId)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes acceso a esta empresa',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        return $next($request);
    }
}
