<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Branch;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CompanySetupService
{
    /**
     * Configura una empresa recien creada:
     * - Crea la sede principal
     * - Crea el usuario administrador
     *
     * @param Company $company
     * @return array ['branch' => Branch, 'admin_user' => User]
     * @throws \Exception
     */
    public function setupCompany(Company $company): array
    {
        return DB::transaction(function () use ($company) {
            // 1. Crear sede principal
            $branch = $this->createMainBranch($company);

            // 2. Crear usuario administrador
            $adminUser = $this->createAdminUser($company, $branch);

            Log::info('Empresa configurada automaticamente', [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'admin_user_id' => $adminUser->id,
                'admin_user_email' => $adminUser->email,
            ]);

            return [
                'branch' => $branch,
                'admin_user' => $adminUser,
            ];
        });
    }

    /**
     * Crea la sede principal de la empresa
     */
    public function createMainBranch(Company $company): Branch
    {
        $slug = $this->generateBranchSlug($company, $company->name);
        $code = $this->generateBranchCode($company);

        $branchData = [
            'company_id' => $company->id,
            'name' => $company->name,
            'slug' => $slug,
            'code' => $code,
            'email' => $company->email,
            'phone' => $company->phone,
            'address' => $company->address,
            'city' => null,
            'state' => null,
            'country' => 'CO',
            'postal_code' => null,
            'is_active' => true,
            'is_main' => true,
            'settings' => null,
        ];

        $branch = Branch::create($branchData);

        Log::info('Sede principal creada automaticamente', [
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'branch_slug' => $branch->slug,
        ]);

        return $branch;
    }

    /**
     * Crea el usuario administrador de la empresa
     */
    public function createAdminUser(Company $company, Branch $branch): User
    {
        $adminRole = Role::where('slug', 'admin')
            ->whereNull('company_id')
            ->first();

        if (!$adminRole) {
            throw new \Exception('El rol "admin" no existe en el sistema. Ejecuta los seeders primero.');
        }

        $email = $this->generateUniqueEmail($company->email, $company->slug);

        $userData = [
            'name' => "Administrador de {$company->name}",
            'email' => $email,
            'password' => Hash::make('password'),
            'phone' => $company->phone,
            'address' => $company->address,
            'document_id' => null,
            'birth_date' => null,
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'is_active' => true,
            'email_verified_at' => now(),
            'country_code' => null,
            'country_name' => null,
            'state_code' => null,
            'state_name' => null,
            'city_name' => null,
        ];

        $user = User::create($userData);
        $user->roles()->attach($adminRole->id);

        Log::info('Usuario administrador creado automaticamente', [
            'company_id' => $company->id,
            'branch_id' => $branch->id,
            'user_id' => $user->id,
            'user_email' => $user->email,
            'user_name' => $user->name,
        ]);

        return $user;
    }

    /**
     * Genera un slug unico para la sede dentro de la empresa
     */
    private function generateBranchSlug(Company $company, string $name): string
    {
        $baseSlug = Str::slug($name);
        $slug = $baseSlug;
        $counter = 1;

        while (Branch::where('company_id', $company->id)
            ->where('slug', $slug)
            ->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Genera un codigo unico para la sede
     */
    private function generateBranchCode(Company $company): string
    {
        $branchCount = Branch::where('company_id', $company->id)->count();
        $number = str_pad($branchCount + 1, 3, '0', STR_PAD_LEFT);

        $companyInitials = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $company->name), 0, 3));
        if (empty($companyInitials)) {
            $companyInitials = 'EMP';
        }

        $code = "{$companyInitials}-{$number}";

        $originalCode = $code;
        $counter = 1;
        while (Branch::where('company_id', $company->id)
            ->where('code', $code)
            ->exists()) {
            $code = $originalCode . '-' . $counter;
            $counter++;
        }

        return $code;
    }

    /**
     * Genera un email unico para el usuario administrador
     */
    private function generateUniqueEmail(?string $companyEmail, string $companySlug): string
    {
        if (empty($companyEmail)) {
            $email = "admin@{$companySlug}.local";
        } else {
            $email = $companyEmail;
        }

        if (!User::where('email', $email)->exists()) {
            return $email;
        }

        $baseEmail = $companyEmail ? explode('@', $companyEmail)[0] : 'admin';
        $domain = $companyEmail ? explode('@', $companyEmail)[1] : "{$companySlug}.local";

        $counter = 1;
        do {
            $email = "{$baseEmail}{$counter}@{$domain}";
            $counter++;
        } while (User::where('email', $email)->exists() && $counter < 100);

        if ($counter >= 100) {
            $email = "admin-" . time() . "@{$domain}";
        }

        return $email;
    }
}
