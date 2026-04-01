<?php

namespace App\Services;

use App\Mail\TwoFactorCodeMail;
use App\Models\TrustedDevice;
use App\Models\TwoFactorCode;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TwoFactorService
{
    /**
     * Genera y envia un codigo de verificacion por email
     */
    public function sendVerificationCode(User $user, string $type, Request $request): TwoFactorCode
    {
        // Invalidar codigos anteriores del mismo tipo
        TwoFactorCode::where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->update(['expires_at' => now()]);

        // Generar codigo de 6 digitos
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Crear registro
        $twoFactorCode = TwoFactorCode::create([
            'user_id' => $user->id,
            'code' => $code,
            'type' => $type,
            'expires_at' => now()->addMinutes(10),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // Enviar email
        try {
            Mail::to($user->email)->send(new TwoFactorCodeMail($user, $code, $type));
            Log::info('Codigo 2FA enviado', [
                'user_id' => $user->id,
                'type' => $type,
            ]);
        } catch (\Exception $e) {
            Log::error('Error al enviar codigo 2FA', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $twoFactorCode;
    }

    /**
     * Verifica un codigo de 2FA
     */
    public function verifyCode(User $user, string $code, string $type): bool
    {
        $twoFactorCode = TwoFactorCode::where('user_id', $user->id)
            ->where('code', $code)
            ->where('type', $type)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();

        if (!$twoFactorCode) {
            return false;
        }

        $twoFactorCode->markAsUsed();
        return true;
    }

    /**
     * Verifica si el dispositivo actual es confiable
     */
    public function isDeviceTrusted(User $user, Request $request): bool
    {
        $deviceHash = TrustedDevice::generateDeviceHash(
            $request->userAgent() ?? '',
            $request->ip()
        );

        $device = TrustedDevice::where('user_id', $user->id)
            ->where('device_hash', $deviceHash)
            ->first();

        if (!$device) {
            return false;
        }

        return $device->isTrusted();
    }

    /**
     * Agrega el dispositivo actual como confiable
     */
    public function trustCurrentDevice(User $user, Request $request, int $daysToTrust = 30): TrustedDevice
    {
        $userAgent = $request->userAgent() ?? '';
        $ip = $request->ip();
        $deviceHash = TrustedDevice::generateDeviceHash($userAgent, $ip);

        // Extraer info del navegador/plataforma
        $browserInfo = $this->parseBrowserInfo($userAgent);

        return TrustedDevice::updateOrCreate(
            [
                'user_id' => $user->id,
                'device_hash' => $deviceHash,
            ],
            [
                'device_name' => $browserInfo['device_name'],
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'browser' => $browserInfo['browser'],
                'platform' => $browserInfo['platform'],
                'last_used_at' => now(),
                'trusted_until' => now()->addDays($daysToTrust),
            ]
        );
    }

    /**
     * Determina si se requiere verificacion 2FA para el login
     */
    public function requiresTwoFactorForLogin(User $user, Request $request): bool
    {
        // Si el usuario tiene 2FA habilitado y el dispositivo no es confiable
        if ($user->hasEmail2FAEnabled() && !$this->isDeviceTrusted($user, $request)) {
            return true;
        }

        return false;
    }

    /**
     * Parsea informacion del navegador desde user agent
     */
    protected function parseBrowserInfo(string $userAgent): array
    {
        $browser = 'Desconocido';
        $platform = 'Desconocido';

        // Detectar plataforma
        if (preg_match('/Windows/i', $userAgent)) {
            $platform = 'Windows';
        } elseif (preg_match('/Mac/i', $userAgent)) {
            $platform = 'macOS';
        } elseif (preg_match('/Linux/i', $userAgent)) {
            $platform = 'Linux';
        } elseif (preg_match('/Android/i', $userAgent)) {
            $platform = 'Android';
        } elseif (preg_match('/iPhone|iPad/i', $userAgent)) {
            $platform = 'iOS';
        }

        // Detectar navegador
        if (preg_match('/Chrome/i', $userAgent) && !preg_match('/Edge/i', $userAgent)) {
            $browser = 'Chrome';
        } elseif (preg_match('/Firefox/i', $userAgent)) {
            $browser = 'Firefox';
        } elseif (preg_match('/Safari/i', $userAgent) && !preg_match('/Chrome/i', $userAgent)) {
            $browser = 'Safari';
        } elseif (preg_match('/Edge/i', $userAgent)) {
            $browser = 'Edge';
        }

        return [
            'browser' => $browser,
            'platform' => $platform,
            'device_name' => "{$browser} en {$platform}",
        ];
    }
}
