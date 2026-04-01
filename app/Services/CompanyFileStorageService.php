<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CompanyFileStorageService
{
    public function getCompanyBasePath(Company $company): string
    {
        $slug = $company->slug;

        if (!$slug || empty(trim($slug))) {
            Log::error('Intento de generar path sin slug', [
                'company_id' => $company->id,
                'company_name' => $company->name ?? 'unknown',
            ]);
            throw new \Exception("La empresa no tiene un slug configurado. Company ID: {$company->id}");
        }

        return $slug;
    }

    public function uploadFile(Company $company, UploadedFile $file, string $subfolder): ?string
    {
        try {
            $extension = $file->getClientOriginalExtension();
            $fileName = Str::uuid() . '.' . $extension;
            $filePath = "{$this->getCompanyBasePath($company)}/{$subfolder}/{$fileName}";

            $fileContent = file_get_contents($file->getRealPath());
            $uploaded = Storage::disk('s3')->put($filePath, $fileContent);

            if ($uploaded) {
                $url = Storage::disk('s3')->url($filePath);
                Log::info('Archivo subido a S3', [
                    'company_id' => $company->id,
                    'subfolder' => $subfolder,
                    'file_path' => $filePath,
                    'url' => $url,
                ]);
                return $url;
            }

            Log::error('Error al subir archivo a S3', [
                'company_id' => $company->id,
                'file_path' => $filePath,
            ]);
            return null;
        } catch (\Exception $e) {
            Log::error('Excepcion al subir archivo a S3', [
                'company_id' => $company->id,
                'subfolder' => $subfolder,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function uploadLogo(Company $company, UploadedFile $file): ?string
    {
        if ($company->logo_url) {
            $this->deleteFileFromUrl($company->logo_url);
        }

        return $this->uploadFile($company, $file, 'logos');
    }

    public function uploadLogoIcon(Company $company, UploadedFile $file): ?string
    {
        if ($company->logo_icon_url) {
            $this->deleteFileFromUrl($company->logo_icon_url);
        }

        return $this->uploadFile($company, $file, 'logos/icon');
    }

    public function uploadBirthdayImage(Company $company, UploadedFile $file): ?string
    {
        $currentUrl = $company->settings['birthday_image_url'] ?? null;
        if ($currentUrl) {
            $this->deleteFileFromUrl($currentUrl);
        }

        return $this->uploadFile($company, $file, 'birthday');
    }

    public function uploadProductImage(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'products');
    }

    public function uploadUserAvatar(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'users/avatars');
    }

    public function uploadUserSignature(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'users/signatures');
    }

    public function uploadChatAttachment(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'chat/attachments');
    }

    public function uploadSupportAttachment(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'support/attachments');
    }

    public function uploadServiceOrderAttachment(Company $company, UploadedFile $file): ?string
    {
        return $this->uploadFile($company, $file, 'service-orders');
    }

    /**
     * Sube un archivo desde contenido base64 (para firmas dibujadas en canvas).
     */
    public function uploadBase64File(Company $company, string $base64Data, string $subfolder, string $extension = 'png'): ?string
    {
        try {
            $data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Data);
            $content = base64_decode($data);

            if ($content === false) {
                return null;
            }

            $fileName = Str::uuid() . '.' . $extension;
            $filePath = "{$this->getCompanyBasePath($company)}/{$subfolder}/{$fileName}";

            $uploaded = Storage::disk('s3')->put($filePath, $content);

            if ($uploaded) {
                return Storage::disk('s3')->url($filePath);
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Error al subir archivo base64 a S3', [
                'company_id' => $company->id,
                'subfolder' => $subfolder,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function deleteFileFromUrl(string $url): bool
    {
        try {
            $path = $this->extractPathFromUrl($url);

            if ($path && Storage::disk('s3')->exists($path)) {
                Storage::disk('s3')->delete($path);
                Log::info('Archivo eliminado de S3', ['path' => $path]);
                return true;
            }

            Log::warning('Archivo no encontrado en S3', ['path' => $path, 'url' => $url]);
            return false;
        } catch (\Exception $e) {
            Log::error('Error al eliminar archivo de S3', [
                'url' => $url,
                'message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function extractPathFromUrl(string $url): ?string
    {
        try {
            $urlParts = parse_url($url);
            $path = ltrim($urlParts['path'] ?? '', '/');

            $bucketName = config('filesystems.disks.s3.bucket');
            if ($bucketName && str_starts_with($path, $bucketName . '/')) {
                $path = substr($path, strlen($bucketName) + 1);
            }

            return $path;
        } catch (\Exception $e) {
            Log::error('Error al extraer path de URL', [
                'url' => $url,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
