<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class TwoFactorController extends Controller
{
    public function __construct(
        protected TwoFactorService $twoFactorService
    ) {}

    /**
     * Verifica el estado de 2FA del usuario autenticado
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'email_2fa_enabled' => $user->hasEmail2FAEnabled(),
                'enabled_at' => $user->email_2fa_enabled_at,
                'trusted_devices_count' => $user->trustedDevices()->count(),
            ],
        ]);
    }

    /**
     * Inicia el proceso de activacion de 2FA
     * Envia codigo al email del usuario
     */
    public function initiateActivation(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasEmail2FAEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La autenticacion en 2 pasos ya esta activada',
            ], 400);
        }

        $this->twoFactorService->sendVerificationCode($user, 'activation', $request);

        return response()->json([
            'success' => true,
            'message' => 'Se ha enviado un codigo de verificacion a tu correo electronico',
        ]);
    }

    /**
     * Confirma la activacion de 2FA con el codigo recibido
     */
    public function confirmActivation(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if ($user->hasEmail2FAEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La autenticacion en 2 pasos ya esta activada',
            ], 400);
        }

        $verified = $this->twoFactorService->verifyCode($user, $request->code, 'activation');

        if (!$verified) {
            throw ValidationException::withMessages([
                'code' => ['El codigo es invalido o ha expirado'],
            ]);
        }

        // Activar 2FA
        $user->enableEmail2FA();

        // Confiar en el dispositivo actual
        $this->twoFactorService->trustCurrentDevice($user, $request);

        return response()->json([
            'success' => true,
            'message' => 'Autenticacion en 2 pasos activada exitosamente',
        ]);
    }

    /**
     * Desactiva 2FA (requiere contrasena)
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!$user->hasEmail2FAEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'La autenticacion en 2 pasos no esta activada',
            ], 400);
        }

        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['La contrasena es incorrecta'],
            ]);
        }

        // Desactivar 2FA
        $user->disableEmail2FA();

        // Eliminar dispositivos confiables
        $user->trustedDevices()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Autenticacion en 2 pasos desactivada',
        ]);
    }

    /**
     * Lista los dispositivos confiables del usuario
     */
    public function trustedDevices(Request $request): JsonResponse
    {
        $devices = $request->user()->trustedDevices()
            ->orderByDesc('last_used_at')
            ->get(['id', 'device_name', 'browser', 'platform', 'ip_address', 'last_used_at', 'trusted_until']);

        return response()->json([
            'success' => true,
            'data' => $devices,
        ]);
    }

    /**
     * Elimina un dispositivo confiable
     */
    public function removeTrustedDevice(Request $request, int $deviceId): JsonResponse
    {
        $deleted = $request->user()->trustedDevices()
            ->where('id', $deviceId)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Dispositivo no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Dispositivo eliminado',
        ]);
    }

    /**
     * Envia codigo de verificacion durante login (para dispositivo nuevo)
     */
    public function sendLoginCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // No revelar si el usuario existe
            return response()->json([
                'success' => true,
                'message' => 'Si el correo existe, recibiras un codigo de verificacion',
            ]);
        }

        if (!$user->hasEmail2FAEnabled()) {
            return response()->json([
                'success' => false,
                'message' => 'Este usuario no tiene 2FA activado',
            ], 400);
        }

        $this->twoFactorService->sendVerificationCode($user, 'login', $request);

        return response()->json([
            'success' => true,
            'message' => 'Se ha enviado un codigo de verificacion a tu correo electronico',
        ]);
    }

    /**
     * Verifica codigo de login y completa autenticacion
     */
    public function verifyLoginCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'code' => 'required|string|size:6',
            'remember' => 'boolean',
            'trust_device' => 'boolean',
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

        // Verificar codigo 2FA
        $verified = $this->twoFactorService->verifyCode($user, $request->code, 'login');

        if (!$verified) {
            throw ValidationException::withMessages([
                'code' => ['El codigo es invalido o ha expirado'],
            ]);
        }

        // Si el usuario quiere confiar en el dispositivo
        if ($request->boolean('trust_device', false)) {
            $this->twoFactorService->trustCurrentDevice($user, $request);
        }

        // Crear token y sesion
        $token = $user->createToken('api-token')->plainTextToken;
        $user->load('roles');

        auth('web')->login($user, $request->boolean('remember', false));
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }
}
