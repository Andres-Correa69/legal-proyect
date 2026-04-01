<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Company;
use App\Services\CompanySetupService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CompanyObserver
{
    protected CompanySetupService $setupService;

    public function __construct(CompanySetupService $setupService)
    {
        $this->setupService = $setupService;
    }

    /**
     * Handle the Company "created" event.
     * Automaticamente crea la sede principal y el usuario administrador
     */
    public function created(Company $company): void
    {
        // Crear log de auditoria
        $this->createActivityLog($company, 'created', "Empresa creada: {$company->name}");

        try {
            // Solo configurar si la empresa esta activa (por defecto lo esta)
            if ($company->is_active) {
                $this->setupService->setupCompany($company);
            }
        } catch (\Exception $e) {
            Log::error('Error al configurar empresa automaticamente', [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Handle the Company "updated" event.
     */
    public function updated(Company $company): void
    {
        $changes = $company->getChanges();
        unset($changes['updated_at']);

        if (!empty($changes)) {
            $this->createActivityLog(
                $company,
                'updated',
                "Empresa actualizada: {$company->name}",
                ['changes' => $changes]
            );
        }
    }

    /**
     * Handle the Company "deleted" event.
     */
    public function deleted(Company $company): void
    {
        $this->createActivityLog($company, 'deleted', "Empresa eliminada: {$company->name}");
    }

    /**
     * Crea un log de actividad
     */
    protected function createActivityLog(Company $company, string $event, string $description, ?array $properties = null): void
    {
        $user = Auth::user();

        if (!$user) {
            return;
        }

        try {
            ActivityLog::create([
                'description' => $description,
                'event' => $event,
                'causer_type' => get_class($user),
                'causer_id' => $user->id,
                'subject_type' => Company::class,
                'subject_id' => $company->id,
                'properties' => $properties,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error creating activity log', [
                'error' => $e->getMessage(),
                'company_id' => $company->id,
            ]);
        }
    }
}
