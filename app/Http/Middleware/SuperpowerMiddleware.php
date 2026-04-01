<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class SuperpowerMiddleware
{
    protected function isInertiaRequest(Request $request): bool
    {
        return !$request->is('api/*') && !$request->expectsJson();
    }

    /**
     * Check if the user's company has a specific superpower enabled.
     *
     * Usage: ->middleware('superpower:service_orders_enabled')
     */
    public function handle(Request $request, Closure $next, string $flag): Response
    {
        $user = $request->user();

        if (!$user) {
            if ($this->isInertiaRequest($request)) {
                return redirect()->route('login');
            }
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
                'error_code' => 'UNAUTHORIZED',
            ], 401);
        }

        // Super Admin siempre puede acceder
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $company = $user->company;
        $settings = $company?->settings ?? [];
        $enabled = $settings[$flag] ?? false;

        if (!$enabled) {
            if ($this->isInertiaRequest($request)) {
                return Inertia::render('errors/unauthorized', [
                    'status' => 403,
                    'message' => 'Este módulo no está habilitado para tu empresa. Contacta al administrador para activarlo.',
                    'type' => 'superpower',
                ])->toResponse($request)->setStatusCode(403);
            }
            return response()->json([
                'success' => false,
                'message' => 'Este módulo no está habilitado para tu empresa.',
                'error_code' => 'MODULE_DISABLED',
            ], 403);
        }

        return $next($request);
    }
}
