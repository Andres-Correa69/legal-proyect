<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    protected function isInertiaRequest(Request $request): bool
    {
        return !$request->is('api/*') && !$request->expectsJson();
    }

    public function handle(Request $request, Closure $next): Response
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

        if (!$request->user()->isSuperAdmin()) {
            if ($this->isInertiaRequest($request)) {
                return Inertia::render('errors/unauthorized', [
                    'status' => 403,
                    'message' => 'Acceso restringido a Super Administradores.',
                ])->toResponse($request)->setStatusCode(403);
            }
            return response()->json([
                'success' => false,
                'message' => 'Acceso restringido a Super Administradores.',
                'error_code' => 'FORBIDDEN',
            ], 403);
        }

        return $next($request);
    }
}
