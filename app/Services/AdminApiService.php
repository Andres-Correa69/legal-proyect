<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminApiService
{
    private string $baseUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.administrador.url', 'http://127.0.0.1:8002'), '/');
        $this->apiKey = config('services.administrador.api_key', '');
    }

    /**
     * Crea una suscripcion de prueba gratuita de 7 dias en el Administrador.
     *
     * @param int $companyId ID de la empresa en Facturacion
     * @return array Datos de la suscripcion creada
     * @throws \RuntimeException Si falla la comunicacion
     */
    public function createTrialSubscription(int $companyId): array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders([
                    'X-Internal-Api-Key' => $this->apiKey,
                    'Accept' => 'application/json',
                ])
                ->post("{$this->baseUrl}/api/internal/subscriptions/trial", [
                    'company_type' => 'legal-sistema',
                    'external_company_id' => $companyId,
                ]);

            if ($response->successful()) {
                Log::info('Suscripcion de prueba creada en Administrador', [
                    'company_id' => $companyId,
                    'subscription' => $response->json(),
                ]);
                return $response->json();
            }

            Log::error('Error al crear suscripcion de prueba', [
                'company_id' => $companyId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \RuntimeException(
                'No se pudo crear la suscripcion de prueba. Status: ' . $response->status()
            );
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::warning('No se pudo conectar con el Administrador para crear suscripcion', [
                'company_id' => $companyId,
                'message' => $e->getMessage(),
            ]);

            // No lanzar excepcion - la empresa se crea de todas formas
            // La suscripcion se puede crear manualmente despues
            return [
                'success' => false,
                'message' => 'Empresa creada pero no se pudo registrar la suscripcion automaticamente.',
            ];
        }
    }
}
