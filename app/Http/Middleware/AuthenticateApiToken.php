<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        // Si ya hay un usuario autenticado (sesión web), continuar
        if ($request->user()) {
            return $next($request);
        }

        // Intentar autenticar con token de Sanctum
        $token = $request->bearerToken()
            ?? ($request->header('Authorization')
                ? str_replace('Bearer ', '', $request->header('Authorization'))
                : null);

        if ($token) {
            // Buscar el usuario por el token
            $user = User::whereHas('tokens', function ($query) use ($token) {
                $query->where('token', hash('sha256', $token));
            })->first();

            if ($user && $user->is_active) {
                // Autenticar al usuario en la sesión web
                auth()->login($user);
            }
        }

        return $next($request);
    }
}
