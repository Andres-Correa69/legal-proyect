<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    protected static array $cachedPermissions = [];

    /**
     * Get all permission slugs for a user (cached in memory per request)
     */
    protected function getUserPermissions($user): \Illuminate\Support\Collection
    {
        if (!isset(static::$cachedPermissions[$user->id])) {
            static::$cachedPermissions[$user->id] = DB::table('role_user')
                ->join('permission_role', 'role_user.role_id', '=', 'permission_role.role_id')
                ->join('permissions', 'permission_role.permission_id', '=', 'permissions.id')
                ->where('role_user.user_id', $user->id)
                ->pluck('permissions.slug');
        }

        return static::$cachedPermissions[$user->id];
    }

    /**
     * Check if request is an Inertia/web request (not API)
     */
    protected function isInertiaRequest(Request $request): bool
    {
        return !$request->is('api/*') && !$request->expectsJson();
    }

    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        if (!$request->user()) {
            if ($this->isInertiaRequest($request)) {
                return redirect()->route('login');
            }
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        $user = $request->user();

        // Super Admin tiene acceso a todo automáticamente
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Load all user permissions once per request (1 query instead of N)
        $userPermissions = $this->getUserPermissions($user);

        foreach ($permissions as $permission) {
            if (!$userPermissions->contains($permission)) {
                if ($this->isInertiaRequest($request)) {
                    return Inertia::render('errors/unauthorized', [
                        'status' => 403,
                        'message' => 'No tienes permiso para acceder a esta sección.',
                        'requiredPermission' => $permission,
                    ])->toResponse($request)->setStatusCode(403);
                }
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para realizar esta acción.',
                    'error_code' => 'FORBIDDEN',
                ], 403);
            }
        }

        return $next($request);
    }
}
