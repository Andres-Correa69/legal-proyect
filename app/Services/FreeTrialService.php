<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FreeTrialService
{
    public function __construct(
        private CompanyFileStorageService $fileStorage,
        private AdminApiService $adminApi,
    ) {}

    /**
     * Crea una empresa completa con prueba gratuita de 30 dias.
     *
     * @param array $data Datos del wizard de registro
     * @return array ['company' => Company, 'admin_user' => User, 'subscription' => array]
     */
    public function createTrialCompany(array $data): array
    {
        return DB::transaction(function () use ($data) {
            // 1. Crear la empresa (CompanyObserver auto-crea Branch + Admin User)
            $company = $this->createCompany($data);

            // 2. Override credenciales del admin user
            $adminUser = $this->updateAdminCredentials($company, $data);

            // 3. Mover logos de temp a permanente en S3
            $this->moveLogosFromTemp($company, $data);

            // 4. Crear productos si los hay
            if (!empty($data['products'])) {
                $this->createProducts($company, $data['products']);
            }

            // 5. Guardar config DIAN si se proporciono
            if (!empty($data['dian_config'])) {
                $this->saveDianConfig($company, $data['dian_config']);
            }

            // 6. Crear suscripcion de prueba en Administrador
            $subscription = $this->adminApi->createTrialSubscription($company->id);

            Log::info('Empresa de prueba gratuita creada exitosamente', [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'admin_email' => $adminUser->email,
            ]);

            return [
                'company' => $company->fresh()->load('branches'),
                'admin_user' => $adminUser,
                'subscription' => $subscription,
            ];
        });
    }

    private function createCompany(array $data): Company
    {
        $slug = Str::slug($data['name']);
        $baseSlug = $slug;
        $counter = 1;
        while (Company::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return Company::create([
            'name' => $data['name'],
            'slug' => $slug,
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'tax_id' => $data['tax_id'] ?? null,
            'is_active' => true,
            'settings' => null,
        ]);
    }

    private function updateAdminCredentials(Company $company, array $data): User
    {
        $adminUser = User::where('company_id', $company->id)
            ->whereHas('roles', fn($q) => $q->where('slug', 'admin'))
            ->first();

        if (!$adminUser) {
            throw new \RuntimeException('No se encontro el usuario administrador creado automaticamente.');
        }

        $updateData = [];

        if (!empty($data['admin_email'])) {
            $updateData['email'] = $data['admin_email'];
        }

        if (!empty($data['admin_password'])) {
            $updateData['password'] = Hash::make($data['admin_password']);
        }

        if (!empty($data['admin_name'])) {
            $updateData['name'] = $data['admin_name'];
        }

        if (!empty($updateData)) {
            $adminUser->update($updateData);
        }

        return $adminUser->fresh();
    }

    private function moveLogosFromTemp(Company $company, array $data): void
    {
        $token = $data['registration_token'] ?? null;
        if (!$token) {
            return;
        }

        $tempBase = "temp/registrations/{$token}";
        $companyBase = $this->fileStorage->getCompanyBasePath($company);

        // Mover logo horizontal
        if (!empty($data['temp_logo_path'])) {
            $newPath = $this->moveS3File($data['temp_logo_path'], $companyBase . '/logos/');
            if ($newPath) {
                $company->update(['logo_url' => Storage::disk('s3')->url($newPath)]);
            }
        }

        // Mover logo icono
        if (!empty($data['temp_logo_icon_path'])) {
            $newPath = $this->moveS3File($data['temp_logo_icon_path'], $companyBase . '/logos/icon/');
            if ($newPath) {
                $company->update(['logo_icon_url' => Storage::disk('s3')->url($newPath)]);
            }
        }

        // Limpiar carpeta temporal
        try {
            Storage::disk('s3')->deleteDirectory($tempBase);
        } catch (\Exception $e) {
            Log::warning('Error al limpiar carpeta temporal de registro', [
                'path' => $tempBase,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function moveS3File(string $sourcePath, string $destFolder): ?string
    {
        try {
            $fileName = basename($sourcePath);
            $destPath = rtrim($destFolder, '/') . '/' . $fileName;

            if (Storage::disk('s3')->exists($sourcePath)) {
                Storage::disk('s3')->copy($sourcePath, $destPath);
                Storage::disk('s3')->delete($sourcePath);
                return $destPath;
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Error al mover archivo S3', [
                'source' => $sourcePath,
                'dest' => $destFolder,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function createProducts(Company $company, array $products): void
    {
        $branch = $company->mainBranch();
        if (!$branch) {
            return;
        }

        // Crear o encontrar categoria "General" para los productos del wizard
        $defaultCategory = ProductCategory::firstOrCreate(
            ['company_id' => $company->id, 'slug' => 'general'],
            ['name' => 'General', 'is_active' => true]
        );

        foreach ($products as $productData) {
            try {
                // Usar savepoint para que un error individual no aborte la transaccion en PostgreSQL
                DB::beginTransaction();
                Product::create([
                    'company_id' => $company->id,
                    'branch_id' => $branch->id,
                    'category_id' => $defaultCategory->id,
                    'name' => $productData['name'],
                    'price' => $productData['price'] ?? 0,
                    'cost' => $productData['cost'] ?? 0,
                    'sku' => $productData['sku'] ?? null,
                    'barcode' => $productData['barcode'] ?? null,
                    'description' => $productData['description'] ?? null,
                    'type' => $productData['type'] ?? 'product',
                    'is_active' => true,
                    'track_inventory' => $productData['track_inventory'] ?? false,
                    'tax_rate' => $productData['tax_rate'] ?? 0,
                    'image_url' => $productData['image_url'] ?? null,
                ]);
                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::warning('Error al crear producto durante registro', [
                    'company_id' => $company->id,
                    'product' => $productData['name'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function saveDianConfig(Company $company, array $dianConfig): void
    {
        $updateData = [];

        $dianFields = [
            'electronic_invoicing_token',
            'ei_type_document_identification_id',
            'ei_type_organization_id',
            'ei_type_regime_id',
            'ei_type_liability_id',
            'ei_municipality_id',
            'ei_business_name',
            'ei_merchant_registration',
            'ei_address',
            'ei_phone',
            'ei_email',
        ];

        foreach ($dianFields as $field) {
            if (isset($dianConfig[$field])) {
                $updateData[$field] = $dianConfig[$field];
            }
        }

        if (!empty($updateData)) {
            $company->update($updateData);
        }
    }
}
