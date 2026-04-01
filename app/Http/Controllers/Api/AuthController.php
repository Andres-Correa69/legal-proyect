<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Login de usuario y generación de token
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with(['company', 'branch', 'roles'])->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales son incorrectas.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Tu cuenta ha sido desactivada. Contacta al administrador.'],
            ]);
        }

        // Verificar si la empresa o sede del usuario esta activa
        if (!$user->isSuperAdmin()) {
            if ($user->company_id && $user->company && !$user->company->is_active) {
                return response()->json([
                    'message' => 'Suscripcion vencida',
                    'subscription_expired' => true,
                ], 403);
            }

            if ($user->branch_id && $user->branch && !$user->branch->is_active) {
                return response()->json([
                    'message' => 'Suscripcion vencida',
                    'subscription_expired' => true,
                ], 403);
            }
        }

        // Verificar si requiere 2FA
        $twoFactorService = app(TwoFactorService::class);

        if ($twoFactorService->requiresTwoFactorForLogin($user, $request)) {
            // Enviar codigo de verificacion
            $twoFactorService->sendVerificationCode($user, 'login', $request);

            return response()->json([
                'requires_2fa' => true,
                'message' => 'Se ha enviado un codigo de verificacion a tu correo electronico',
            ], 200);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        // Cargar roles (sin permisos) - login rápido
        $user->load('roles');

        // Crear sesión web para Inertia (permite navegación con cookies de sesión)
        auth('web')->login($user, $request->boolean('remember', false));
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Actualizar ultimo uso del dispositivo si tiene 2FA
        if ($user->hasEmail2FAEnabled()) {
            $twoFactorService->trustCurrentDevice($user, $request);
        }

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

    /**
     * Logout - Revoca el token y cierra la sesión web
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revocar token API solo si es un PersonalAccessToken (no TransientToken)
        if ($user) {
            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }
        }

        // Cerrar sesión web
        auth('web')->logout();

        // Invalidar y regenerar sesión
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Sesión cerrada exitosamente']);
    }

    /**
     * Crea una sesión web desde el token API
     */
    public function createSession(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
            ], 401);
        }

        // Crear sesión web para Inertia (regenera sesión y autentica vía guard web)
        auth('web')->login($user, $request->boolean('remember', false));
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'message' => 'Sesión creada exitosamente',
        ]);
    }

    /**
     * Obtiene el usuario autenticado con sus roles y permisos
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->relationLoaded('roles')) {
            $user->load(['roles.permissions', 'company', 'branch']);
        }

        return response()->json($user);
    }
}
