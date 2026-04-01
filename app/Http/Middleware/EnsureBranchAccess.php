<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBranchAccess
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

        // Super admin tiene acceso a todo
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Si se está accediendo a un recurso específico de sucursal
        $branchId = $request->route('branch')
            ? (is_object($request->route('branch')) ? $request->route('branch')->id : $request->route('branch'))
            : null;

        if ($branchId && !$user->canAccessBranch($branchId)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes acceso a esta sucursal',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        return $next($request);
    }
}
