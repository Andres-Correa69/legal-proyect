<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CompanySettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['message' => 'No hay empresa asociada'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $company->settings ?? [],
                'company_name' => $company->name,
                'company_id' => $company->id,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['message' => 'No hay empresa asociada'], 404);
        }

        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.barcode_ticket_enabled' => 'sometimes|boolean',
            'settings.thermal_receipt_enabled' => 'sometimes|boolean',
            'settings.birthday_message' => 'sometimes|nullable|string|max:1000',
            'settings.birthday_image_url' => 'sometimes|nullable|string|max:500',
            'settings.theme_color' => 'sometimes|nullable|string|in:blue,green,orange,red,gray,brown,yellow,pink',
            'settings.service_orders_enabled' => 'sometimes|boolean',
        ]);

        $currentSettings = $company->settings ?? [];
        $newSettings = array_merge($currentSettings, $validated['settings']);
        $company->settings = $newSettings;
        $company->save();

        return response()->json([
            'success' => true,
            'data' => ['settings' => $company->settings],
            'message' => 'Configuracion actualizada',
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        $service = app(CompanyFileStorageService::class);
        $url = $service->uploadLogo($company, $request->file('logo'));

        if (!$url) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir el logo',
            ], 500);
        }

        $company->update(['logo_url' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['logo_url' => $url],
            'message' => 'Logo actualizado',
        ]);
    }

    public function uploadLogoIcon(Request $request): JsonResponse
    {
        $request->validate([
            'logo_icon' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        $service = app(CompanyFileStorageService::class);
        $url = $service->uploadLogoIcon($company, $request->file('logo_icon'));

        if (!$url) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir el icono',
            ], 500);
        }

        $company->update(['logo_icon_url' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['logo_icon_url' => $url],
            'message' => 'Icono actualizado',
        ]);
    }

    public function deleteLogoIcon(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        if ($company->logo_icon_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($company->logo_icon_url);
            $company->update(['logo_icon_url' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => ['logo_icon_url' => null],
            'message' => 'Icono eliminado',
        ]);
    }

    public function uploadBirthdayImage(Request $request): JsonResponse
    {
        $company = $request->user()->company;
        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        $request->validate(['image' => 'required|image|max:5120']);

        $service = app(CompanyFileStorageService::class);
        $url = $service->uploadBirthdayImage($company, $request->file('image'));

        if (!$url) {
            return response()->json(['success' => false, 'message' => 'Error al subir la imagen'], 500);
        }

        $settings = $company->settings ?? [];
        $settings['birthday_image_url'] = $url;
        $company->settings = $settings;
        $company->save();

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
            'message' => 'Imagen de cumpleaños actualizada',
        ]);
    }

    public function deleteBirthdayImage(Request $request): JsonResponse
    {
        $company = $request->user()->company;
        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        $currentUrl = $company->settings['birthday_image_url'] ?? null;
        if ($currentUrl) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($currentUrl);
        }

        $settings = $company->settings ?? [];
        unset($settings['birthday_image_url']);
        $company->settings = $settings;
        $company->save();

        return response()->json(['success' => true, 'message' => 'Imagen eliminada']);
    }

    /**
     * Proxy para servir el logo de la empresa desde S3 (evita problemas de CORS).
     */
    public function proxyLogo(Request $request): Response
    {
        $company = $request->user()->company;

        if (!$company || !$company->logo_url) {
            abort(404);
        }

        $content = @file_get_contents($company->logo_url);

        if ($content === false) {
            abort(404);
        }

        $ext = pathinfo(parse_url($company->logo_url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'png';
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => 'image/png',
        };

        return response($content, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function deleteLogo(Request $request): JsonResponse
    {
        $company = $request->user()->company;

        if (!$company) {
            return response()->json(['success' => false, 'message' => 'No hay empresa asociada'], 404);
        }

        if ($company->logo_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($company->logo_url);
            $company->update(['logo_url' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => ['logo_url' => null],
            'message' => 'Logo eliminado',
        ]);
    }
}
