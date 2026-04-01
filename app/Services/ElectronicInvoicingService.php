<?php

namespace App\Services;

use App\Models\TypeDocumentIdentification;
use App\Models\TypeOrganization;
use App\Models\TypeRegime;
use App\Models\TypeLiability;
use App\Models\Municipality;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ElectronicInvoicingService
{
    protected string $proxyUrl;
    protected string $apiKey;
    protected bool $mockMode;

    public function __construct()
    {
        $this->proxyUrl = config('services.electronic_invoicing.proxy_url');
        $this->apiKey = config('services.electronic_invoicing.api_key', '');
        $this->mockMode = config('services.electronic_invoicing.mock', false);
    }

    /**
     * Helper to make proxy requests with X-API-Key header
     */
    private function proxyRequest(string $method, string $endpoint, array $data = [], int $timeout = 30): \Illuminate\Http\Client\Response
    {
        $request = Http::timeout($timeout)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->apiKey,
            ]);

        return match (strtoupper($method)) {
            'GET' => $request->get("{$this->proxyUrl}/{$endpoint}", $data),
            'PUT' => $request->put("{$this->proxyUrl}/{$endpoint}", $data),
            default => $request->post("{$this->proxyUrl}/{$endpoint}", $data),
        };
    }

    /**
     * Get listings from the external API
     */
    public function getListings(): array
    {
        try {
            $response = $this->proxyRequest('GET', 'catalogs');

            if ($response->successful()) {
                $data = $response->json();
                return $data['data'] ?? $data;
            }

            Log::error('Failed to get listings from proxy API', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [];
        } catch (\Exception $e) {
            Log::error('Exception getting listings from proxy API', [
                'message' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Sync all catalogs from the external API
     */
    public function syncCatalogs(): array
    {
        $listings = $this->getListings();

        $synced = [
            'type_document_identifications' => 0,
            'type_organizations' => 0,
            'type_regimes' => 0,
            'type_liabilities' => 0,
            'municipalities' => 0,
        ];

        // Sync type_document_identifications
        if (isset($listings['type_document_identifications'])) {
            foreach ($listings['type_document_identifications'] as $item) {
                TypeDocumentIdentification::updateOrCreate(
                    ['external_id' => $item['id']],
                    [
                        'name' => $item['name'],
                        'code' => $item['code'],
                    ]
                );
                $synced['type_document_identifications']++;
            }
        }

        // Sync type_organizations
        if (isset($listings['type_organizations'])) {
            foreach ($listings['type_organizations'] as $item) {
                TypeOrganization::updateOrCreate(
                    ['external_id' => $item['id']],
                    [
                        'name' => $item['name'],
                        'code' => $item['code'],
                    ]
                );
                $synced['type_organizations']++;
            }
        }

        // Sync type_regimes
        if (isset($listings['type_regimes'])) {
            foreach ($listings['type_regimes'] as $item) {
                TypeRegime::updateOrCreate(
                    ['external_id' => $item['id']],
                    [
                        'name' => $item['name'],
                        'code' => $item['code'],
                    ]
                );
                $synced['type_regimes']++;
            }
        }

        // Sync type_liabilities
        if (isset($listings['type_liabilities'])) {
            foreach ($listings['type_liabilities'] as $item) {
                TypeLiability::updateOrCreate(
                    ['external_id' => $item['id']],
                    [
                        'name' => $item['name'],
                        'code' => $item['code'],
                    ]
                );
                $synced['type_liabilities']++;
            }
        }

        // Sync municipalities
        if (isset($listings['municipalities'])) {
            foreach ($listings['municipalities'] as $item) {
                Municipality::updateOrCreate(
                    ['external_id' => $item['id']],
                    [
                        'name' => $item['name'],
                        'code' => $item['code'],
                    ]
                );
                $synced['municipalities']++;
            }
        }

        Cache::forget('dian_catalogs');

        return $synced;
    }

    /**
     * Get all catalogs from local database (cached 24h)
     */
    public function getCatalogs(): array
    {
        return Cache::remember('dian_catalogs', 60 * 60 * 24, function () {
            return [
                'type_document_identifications' => TypeDocumentIdentification::whereRaw("CHAR_LENGTH(code) = 2 AND code ~ '^[0-9]+$'")->orderBy('name')->get(),
                'type_organizations' => TypeOrganization::orderBy('name')->get(),
                'type_regimes' => TypeRegime::orderBy('name')->get(),
                'type_liabilities' => TypeLiability::orderBy('name')->get(),
                'municipalities' => Municipality::orderBy('name')->get(),
                'departments' => [
                    ['code' => '05', 'name' => 'Antioquia'],
                    ['code' => '08', 'name' => 'Atlántico'],
                    ['code' => '11', 'name' => 'Bogotá D.C.'],
                    ['code' => '13', 'name' => 'Bolívar'],
                    ['code' => '15', 'name' => 'Boyacá'],
                    ['code' => '17', 'name' => 'Caldas'],
                    ['code' => '18', 'name' => 'Caquetá'],
                    ['code' => '19', 'name' => 'Cauca'],
                    ['code' => '20', 'name' => 'Cesar'],
                    ['code' => '23', 'name' => 'Córdoba'],
                    ['code' => '25', 'name' => 'Cundinamarca'],
                    ['code' => '27', 'name' => 'Chocó'],
                    ['code' => '41', 'name' => 'Huila'],
                    ['code' => '44', 'name' => 'La Guajira'],
                    ['code' => '47', 'name' => 'Magdalena'],
                    ['code' => '50', 'name' => 'Meta'],
                    ['code' => '52', 'name' => 'Nariño'],
                    ['code' => '54', 'name' => 'Norte de Santander'],
                    ['code' => '63', 'name' => 'Quindío'],
                    ['code' => '66', 'name' => 'Risaralda'],
                    ['code' => '68', 'name' => 'Santander'],
                    ['code' => '70', 'name' => 'Sucre'],
                    ['code' => '73', 'name' => 'Tolima'],
                    ['code' => '76', 'name' => 'Valle del Cauca'],
                    ['code' => '81', 'name' => 'Arauca'],
                    ['code' => '85', 'name' => 'Casanare'],
                    ['code' => '86', 'name' => 'Putumayo'],
                    ['code' => '88', 'name' => 'San Andrés y Providencia'],
                    ['code' => '91', 'name' => 'Amazonas'],
                    ['code' => '94', 'name' => 'Guainía'],
                    ['code' => '95', 'name' => 'Guaviare'],
                    ['code' => '97', 'name' => 'Vaupés'],
                    ['code' => '99', 'name' => 'Vichada'],
                ],
            ];
        });
    }

    /**
     * Get payroll-specific catalogs (DIAN static values + local DB)
     */
    public function getPayrollCatalogs(): array
    {
        return Cache::remember('dian_payroll_catalogs', 60 * 60 * 24, function () {
            return [
                'type_document_identifications' => TypeDocumentIdentification::whereRaw("CHAR_LENGTH(code) = 2 AND code ~ '^[0-9]+$'")->orderBy('name')->get(),
                'municipalities' => Municipality::orderBy('name')->get(),
                'departments' => [
                    ['code' => '05', 'name' => 'Antioquia'],
                    ['code' => '08', 'name' => 'Atlántico'],
                    ['code' => '11', 'name' => 'Bogotá D.C.'],
                    ['code' => '13', 'name' => 'Bolívar'],
                    ['code' => '15', 'name' => 'Boyacá'],
                    ['code' => '17', 'name' => 'Caldas'],
                    ['code' => '18', 'name' => 'Caquetá'],
                    ['code' => '19', 'name' => 'Cauca'],
                    ['code' => '20', 'name' => 'Cesar'],
                    ['code' => '23', 'name' => 'Córdoba'],
                    ['code' => '25', 'name' => 'Cundinamarca'],
                    ['code' => '27', 'name' => 'Chocó'],
                    ['code' => '41', 'name' => 'Huila'],
                    ['code' => '44', 'name' => 'La Guajira'],
                    ['code' => '47', 'name' => 'Magdalena'],
                    ['code' => '50', 'name' => 'Meta'],
                    ['code' => '52', 'name' => 'Nariño'],
                    ['code' => '54', 'name' => 'Norte de Santander'],
                    ['code' => '63', 'name' => 'Quindío'],
                    ['code' => '66', 'name' => 'Risaralda'],
                    ['code' => '68', 'name' => 'Santander'],
                    ['code' => '70', 'name' => 'Sucre'],
                    ['code' => '73', 'name' => 'Tolima'],
                    ['code' => '76', 'name' => 'Valle del Cauca'],
                    ['code' => '81', 'name' => 'Arauca'],
                    ['code' => '85', 'name' => 'Casanare'],
                    ['code' => '86', 'name' => 'Putumayo'],
                    ['code' => '88', 'name' => 'San Andrés y Providencia'],
                    ['code' => '91', 'name' => 'Amazonas'],
                    ['code' => '94', 'name' => 'Guainía'],
                    ['code' => '95', 'name' => 'Guaviare'],
                    ['code' => '97', 'name' => 'Vaupés'],
                    ['code' => '99', 'name' => 'Vichada'],
                ],
                'type_workers' => [
                    ['id' => 1, 'name' => 'Dependiente'],
                    ['id' => 2, 'name' => 'Servicio doméstico'],
                    ['id' => 3, 'name' => 'Madre comunitaria'],
                    ['id' => 4, 'name' => 'Aprendices del SENA en etapa lectiva'],
                    ['id' => 5, 'name' => 'Funcionarios públicos sin tope máximo de IBC'],
                    ['id' => 6, 'name' => 'Aprendices del SENA en etapa productiva'],
                    ['id' => 7, 'name' => 'Estudiantes de postgrado en salud'],
                    ['id' => 8, 'name' => 'Profesor de establecimiento particular'],
                    ['id' => 9, 'name' => 'Estudiantes aportes solo riesgos laborales'],
                    ['id' => 10, 'name' => 'Dependiente entidades públicas con régimen especial en salud'],
                    ['id' => 11, 'name' => 'Cooperados o pre cooperativas de trabajo asociado'],
                    ['id' => 12, 'name' => 'Trabajador dependiente de entidad beneficiaria del SGP'],
                    ['id' => 13, 'name' => 'Trabajador de tiempo parcial'],
                    ['id' => 14, 'name' => 'Pre pensionado de entidad en liquidación'],
                    ['id' => 15, 'name' => 'Pre pensionado con aporte voluntario a salud'],
                    ['id' => 16, 'name' => 'Estudiantes de prácticas laborales en el sector público'],
                ],
                'sub_type_workers' => [
                    ['id' => 1, 'name' => 'Ninguno'],
                    ['id' => 2, 'name' => 'Pensionado'],
                ],
                'type_contracts' => [
                    ['id' => 1, 'name' => 'Término fijo'],
                    ['id' => 2, 'name' => 'Término indefinido'],
                    ['id' => 3, 'name' => 'Obra o labor'],
                    ['id' => 4, 'name' => 'Aprendizaje'],
                    ['id' => 5, 'name' => 'Prácticas o pasantías'],
                ],
                'payment_forms' => [
                    ['id' => 1, 'name' => 'Contado'],
                    ['id' => 2, 'name' => 'Crédito'],
                ],
                'payment_methods' => [
                    ['id' => 10, 'name' => 'Efectivo'],
                    ['id' => 42, 'name' => 'Débito ACH'],
                    ['id' => 47, 'name' => 'Transferencia débito'],
                    ['id' => 48, 'name' => 'Tarjeta crédito'],
                    ['id' => 49, 'name' => 'Tarjeta débito'],
                    ['id' => 60, 'name' => 'Nota promisoria'],
                    ['id' => 1, 'name' => 'Instrumento no definido'],
                ],
                'payroll_periods' => [
                    ['id' => 1, 'name' => 'Mensual'],
                    ['id' => 2, 'name' => 'Quincenal'],
                    ['id' => 3, 'name' => 'Semanal'],
                    ['id' => 4, 'name' => 'Decenal'],
                    ['id' => 5, 'name' => 'Catorcenal'],
                ],
                'account_types' => [
                    ['id' => 'AHORROS', 'name' => 'Ahorros'],
                    ['id' => 'CORRIENTE', 'name' => 'Corriente'],
                ],
            ];
        });
    }

    /**
     * Register a company in the external API
     */
    public function registerCompany(array $data, string $token): array
    {
        try {
            $response = $this->proxyRequest('POST', 'company/register', array_merge($data, [
                'dian_token' => $token,
            ]));

            $responseData = $response->json();

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return [
                    'success' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Error registering company',
                'errors' => $responseData['errors'] ?? [],
            ];
        } catch (\Exception $e) {
            Log::error('Exception registering company via proxy', [
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send electronic invoice to DIAN API
     *
     * @param string|null $testUuid UUID for test environment (appended to URL)
     */
    public function sendInvoice(array $invoiceData, string $token, ?string $testUuid = null): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendInvoice', ['number' => $invoiceData['number'] ?? null]);
            usleep(800000); // 0.8s delay
            $prefix = 'SETP';
            $number = $invoiceData['number'] ?? 990000001;
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => "{$prefix}{$number}",
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Documento validado por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'invoice', [
                'dian_token' => $token,
                'test_uuid' => $testUuid,
                'invoice' => $invoiceData,
            ], 60);

            $responseData = $response->json();

            Log::info('DIAN Proxy Invoice Response', [
                'status' => $response->status(),
                'is_valid' => $responseData['is_valid'] ?? null,
                'errors_messages' => $responseData['errors_messages'] ?? [],
            ]);

            $isValid = $responseData['is_valid'] ?? false;

            if ($response->successful() && $isValid) {
                return [
                    'success' => true,
                    'is_valid' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'is_valid' => false,
                'message' => $responseData['message'] ?? $responseData['status_message'] ?? 'Error enviando factura',
                'errors_messages' => $responseData['errors_messages'] ?? [],
                'errors' => $responseData['errors'] ?? [],
                'data' => $responseData['data'] ?? $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception sending invoice via proxy', [
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'is_valid' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Set DIAN environment configuration (pruebas/producción)
     */
    public function setEnvironment(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] setEnvironment', $data);
            usleep(500000); // 0.5s delay
            return [
                'success' => true,
                'data' => ['success' => true, 'message' => '[MOCK] Ambiente configurado exitosamente'],
            ];
        }

        try {
            $response = $this->proxyRequest('PUT', 'company/environment', array_merge($data, [
                'dian_token' => $token,
            ]));

            $responseData = $response->json();

            Log::info('DIAN Proxy Environment Config Response', [
                'status' => $response->status(),
                'data' => $responseData,
            ]);

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return [
                    'success' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Error configurando ambiente',
                'errors' => $responseData['errors'] ?? [],
                'data' => $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception setting DIAN environment via proxy', [
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send credit note to DIAN API
     */
    public function sendCreditNote(array $data, string $token, ?string $testUuid = null): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendCreditNote', ['number' => $data['number'] ?? null]);
            usleep(800000);
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => 'NC' . ($data['number'] ?? 1),
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Nota crédito validada por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'credit-note', [
                'dian_token' => $token,
                'test_uuid' => $testUuid,
                'credit_note' => $data,
            ], 60);

            $responseData = $response->json();

            Log::info('DIAN Proxy Credit Note Response', [
                'status' => $response->status(),
                'is_valid' => $responseData['is_valid'] ?? null,
                'errors_messages' => $responseData['errors_messages'] ?? [],
            ]);

            $isValid = $responseData['is_valid'] ?? false;

            if ($response->successful() && $isValid) {
                return [
                    'success' => true,
                    'is_valid' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'is_valid' => false,
                'message' => $responseData['message'] ?? $responseData['status_message'] ?? 'Error enviando nota crédito',
                'errors_messages' => $responseData['errors_messages'] ?? [],
                'errors' => $responseData['errors'] ?? [],
                'data' => $responseData['data'] ?? $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception sending credit note via proxy', [
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'is_valid' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send email for a document (FE, NC, ND) via DIAN API
     * Endpoint: /api/ubl2.1/mail/send/{uuid}
     */
    public function sendEmail(string $uuid, string $token, array $to, array $cc = []): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendEmail', ['uuid' => $uuid, 'to' => $to, 'cc' => $cc]);
            usleep(300000);
            return [
                'success' => true,
                'message' => '[MOCK] Correo enviado exitosamente',
            ];
        }

        try {
            $response = $this->proxyRequest('POST', "email/send/{$uuid}", [
                'dian_token' => $token,
                'to' => $to,
                'cc' => $cc,
            ]);

            $responseData = $response->json();

            Log::info('DIAN Proxy Email Response', [
                'uuid' => $uuid,
                'status' => $response->status(),
                'data' => $responseData,
            ]);

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return [
                    'success' => true,
                    'message' => 'Correo enviado exitosamente',
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Error al enviar correo',
                'data' => $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception sending email via proxy', [
                'uuid' => $uuid,
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send receipt acknowledgment (event 030) to DIAN API
     */
    public function sendReceiptAcknowledgment(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendReceiptAcknowledgment', ['number' => $data['number'] ?? null]);
            usleep(800000);
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => 'AR' . ($data['number'] ?? 1),
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Acuse de recibo validado por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'event/receipt-acknowledgment', [
                'dian_token' => $token,
                'event_data' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'acuse de recibo');
        } catch (\Exception $e) {
            Log::error('Exception sending receipt acknowledgment via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send goods receipt (event 032) to DIAN API
     */
    public function sendGoodsReceipt(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendGoodsReceipt', ['number' => $data['number'] ?? null]);
            usleep(800000);
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => 'RB' . ($data['number'] ?? 1),
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Recibo del bien validado por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'event/goods-receipt', [
                'dian_token' => $token,
                'event_data' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'recibo del bien');
        } catch (\Exception $e) {
            Log::error('Exception sending goods receipt via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send express acceptance (event 033) to DIAN API
     */
    public function sendExpressAcceptance(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendExpressAcceptance', ['number' => $data['number'] ?? null]);
            usleep(800000);
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => 'EA' . ($data['number'] ?? 1),
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Aceptación expresa validada por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'event/express-acceptance', [
                'dian_token' => $token,
                'event_data' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'aceptación expresa');
        } catch (\Exception $e) {
            Log::error('Exception sending express acceptance via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send debit note to DIAN API
     */
    /**
     * Get resolutions from DIAN API
     */
    public function getResolutions(string $token): array
    {
        try {
            $response = $this->proxyRequest('GET', 'resolutions', [
                'dian_token' => $token,
            ]);

            $responseData = $response->json();

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return [
                    'success' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Error al consultar resoluciones',
                'data' => $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception getting resolutions via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function sendDebitNote(array $data, string $token, ?string $testUuid = null): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendDebitNote', ['number' => $data['number'] ?? null]);
            usleep(800000);
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => 'ND' . ($data['number'] ?? 1),
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Nota débito validada por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'debit-note', [
                'dian_token' => $token,
                'test_uuid' => $testUuid,
                'debit_note' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'nota débito');
        } catch (\Exception $e) {
            Log::error('Exception sending debit note via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Get document logs from DIAN API (to retrieve original payload)
     */
    public function getDocumentLogs(string $uuid, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] getDocumentLogs', ['uuid' => $uuid]);
            usleep(300000);
            return [
                'success' => true,
                'data' => [
                    'payload' => [
                        'number' => 1,
                        'sync' => true,
                        'type_document_id' => 12,
                        'type_operation_id' => 28,
                        'resolution' => [
                            'prefix' => 'DS',
                            'resolution' => '000000',
                            'resolution_date' => now()->format('Y-m-d'),
                            'from' => 1,
                            'to' => 10000,
                            'date_from' => now()->format('Y-m-d'),
                            'date_to' => now()->addYear()->format('Y-m-d'),
                        ],
                        'customer' => [
                            'identification_number' => '000000000',
                            'name' => '[MOCK] Proveedor',
                            'municipality_id' => 1006,
                            'address' => 'Dirección mock',
                            'email' => 'mock@test.com',
                        ],
                        'legal_monetary_totals' => [
                            'line_extension_amount' => '100000.00',
                            'tax_exclusive_amount' => '0.00',
                            'tax_inclusive_amount' => '100000.00',
                            'payable_amount' => '100000.00',
                        ],
                        'invoice_lines' => [
                            [
                                'unit_mesure_id' => 642,
                                'invoiced_quantity' => '1.000000',
                                'line_extension_amount' => 100000,
                                'description' => '[MOCK] Producto',
                                'code' => '1',
                                'type_item_identification_id' => 3,
                                'price_amount' => '100000.00',
                                'base_quantity' => '1.000000',
                            ],
                        ],
                    ],
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('GET', "document-logs/{$uuid}", [
                'dian_token' => $token,
            ]);

            $responseData = $response->json();

            Log::info('DIAN Document Logs Response', [
                'uuid' => $uuid,
                'status' => $response->status(),
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? 'Error al consultar logs del documento',
                'data' => $responseData,
            ];
        } catch (\Exception $e) {
            Log::error('Exception getting document logs', [
                'uuid' => $uuid,
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Send note document support (credit note for document support) to DIAN API
     */
    public function sendNoteDocumentSupport(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendNoteDocumentSupport', ['number' => $data['number'] ?? null]);
            usleep(800000);
            $prefix = 'NCDS';
            $number = $data['number'] ?? 1;
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => "{$prefix}{$number}",
                    'uuid' => Str::uuid()->toString(),
                    'expedition_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Nota crédito documento soporte validada por la DIAN',
                    'pdf_base64_bytes' => null,
                    'xml_base64_bytes' => null,
                    'qr_link' => null,
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'note-document-support', [
                'dian_token' => $token,
                'note_document_support' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'nota crédito documento soporte');
        } catch (\Exception $e) {
            Log::error('Exception sending note document support via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send document support to DIAN API
     */
    public function sendDocumentSupport(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendDocumentSupport', ['number' => $data['number'] ?? null]);
            usleep(800000);
            $prefix = 'DS';
            $number = $data['number'] ?? 1;
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => "{$prefix}{$number}",
                    'uuid' => Str::uuid()->toString(),
                    'expedition_date' => now()->format('Y-m-d'),
                    'status_message' => '[MOCK] Documento soporte validado por la DIAN',
                    'pdf_base64_bytes' => null,
                    'xml_base64_bytes' => null,
                    'qr_link' => null,
                    'pdf_download_link' => null,
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'document-support', [
                'dian_token' => $token,
                'document_support' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'documento soporte');
        } catch (\Exception $e) {
            Log::error('Exception sending document support via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send POS electronic invoice to DIAN API
     * Endpoint: POST /pos
     */
    public function sendPosInvoice(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendPosInvoice', ['number' => $data['number'] ?? null]);
            usleep(800000);
            $number = $data['number'] ?? 990000001;
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => $number,
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'xml_name' => 'mock_pos_' . $number . '.xml',
                    'zip_name' => 'mock_pos_' . $number . '.zip',
                    'qr_link' => 'https://mock-qr.dian.gov.co/pos/' . Str::uuid()->toString(),
                    'pdf_base64_bytes' => null,
                    'status_message' => '[MOCK] Factura POS electrónica validada por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'pos/invoice', [
                'dian_token' => $token,
                'pos_invoice' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'factura POS');
        } catch (\Exception $e) {
            Log::error('Exception sending POS invoice via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send POS credit note (anulación factura POS) to DIAN API
     * Endpoint: POST /pos/credit-note
     */
    public function sendPosCreditNote(array $data, string $token): array
    {
        if ($this->mockMode) {
            Log::info('[MOCK] sendPosCreditNote', ['number' => $data['number'] ?? null]);
            usleep(800000);
            $number = $data['number'] ?? 1;
            return [
                'success' => true,
                'is_valid' => true,
                'data' => [
                    'is_valid' => true,
                    'number' => $number,
                    'uuid' => Str::uuid()->toString(),
                    'issue_date' => now()->format('Y-m-d'),
                    'xml_name' => 'mock_pos_cn_' . $number . '.xml',
                    'zip_name' => 'mock_pos_cn_' . $number . '.zip',
                    'qr_link' => 'https://mock-qr.dian.gov.co/pos-cn/' . Str::uuid()->toString(),
                    'pdf_base64_bytes' => null,
                    'status_message' => '[MOCK] Nota crédito POS validada por la DIAN',
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'pos/credit-note', [
                'dian_token' => $token,
                'pos_credit_note' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'nota crédito POS');
        } catch (\Exception $e) {
            Log::error('Exception sending POS credit note via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Send payroll (nómina electrónica) to DIAN API
     * Endpoint: POST /payroll/102
     */
    public function sendPayroll(array $data, string $token): array
    {
        if ($this->mockMode) {
            $prefix = $data['xml_sequence_number']['prefix'] ?? 'NE';
            $number = $data['xml_sequence_number']['number'] ?? 0;
            $mockUuid = Str::uuid()->toString();

            Log::info('[MOCK] sendPayroll', ['prefix' => $prefix, 'number' => $number]);
            usleep(800000);

            return [
                'success' => true,
                'is_valid' => true,
                'is_mock' => true,
                'request_payload' => $data,
                'data' => [
                    'is_valid' => true,
                    'is_restored' => false,
                    'algorithm' => 'CUNE-SHA384',
                    'number' => "{$prefix}{$number}",
                    'uuid' => $mockUuid,
                    'issue_date' => now()->format('Y-m-d H:i:s'),
                    'expedition_date' => now()->format('Y-m-d H:i:s'),
                    'zip_key' => null,
                    'status_code' => '00',
                    'status_description' => '[MOCK] Procesado Correctamente',
                    'errors_messages' => [],
                    'xml_name' => "ne{$mockUuid}.xml",
                    'zip_name' => "z{$mockUuid}.zip",
                    'qr_link' => "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey={$mockUuid}",
                    'xml_base64_bytes' => base64_encode('<mock>XML nómina electrónica</mock>'),
                    'pdf_base64_bytes' => null, // Mock no genera PDF real
                    'status_message' => '[MOCK] Nómina electrónica validada por la DIAN',
                    'payload' => $data,
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'payroll', [
                'dian_token' => $token,
                'payroll' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'nómina electrónica');
        } catch (\Exception $e) {
            Log::error('Exception sending payroll via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Annul payroll (nota de ajuste de nómina electrónica) via DIAN API
     * Endpoint: POST /payroll/103
     */
    public function annulPayroll(array $data, string $token): array
    {
        if ($this->mockMode) {
            $prefix = $data['xml_sequence_number']['prefix'] ?? 'NA';
            $number = $data['xml_sequence_number']['number'] ?? 0;
            $mockUuid = Str::uuid()->toString();

            Log::info('[MOCK] annulPayroll', ['prefix' => $prefix, 'number' => $number]);
            usleep(800000);

            return [
                'success' => true,
                'is_valid' => true,
                'is_mock' => true,
                'request_payload' => $data,
                'data' => [
                    'is_valid' => true,
                    'number' => "{$prefix}{$number}",
                    'uuid' => $mockUuid,
                    'issue_date' => now()->format('Y-m-d H:i:s'),
                    'status_code' => '00',
                    'status_description' => '[MOCK] Nota de ajuste procesada correctamente',
                    'errors_messages' => [],
                    'qr_link' => "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey={$mockUuid}",
                    'pdf_base64_bytes' => null,
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', 'payroll/annul', [
                'dian_token' => $token,
                'payroll' => $data,
            ], 60);

            $responseData = $response->json();
            return $this->parseDocumentResponse($responseData, $response->successful(), 'anulación de nómina');
        } catch (\Exception $e) {
            Log::error('Exception annulling payroll via proxy', ['message' => $e->getMessage()]);
            return ['success' => false, 'is_valid' => false, 'message' => $e->getMessage()];
        }
    }

    // ==================== STATUS ENDPOINTS ====================

    /**
     * Check ZIP processing status
     */
    public function getZipStatus(string $zipKey, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/zip/{$zipKey}", $token, $environment);
    }

    /**
     * Check document status by UUID
     */
    public function getDocumentStatus(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/document/{$uuid}", $token, $environment);
    }

    public function getDocumentInformation(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/document-information/{$uuid}", $token, $environment);
    }

    public function getNumberRangeStatus(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/number-range/{$uuid}", $token, $environment);
    }

    public function getDocumentXml(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/xml/{$uuid}", $token, $environment);
    }

    public function getDocumentNotes(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/notes/{$uuid}", $token, $environment);
    }

    public function getDocumentEvents(string $uuid, string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest("status/events/{$uuid}", $token, $environment);
    }

    public function getAcquirerData(string $token, int $environment = 2): array
    {
        return $this->proxyStatusRequest('status/acquirer', $token, $environment);
    }

    /**
     * Generic proxy status request helper
     */
    private function proxyStatusRequest(string $endpoint, string $token, int $environment = 2): array
    {
        if ($this->mockMode) {
            Log::info("[MOCK] proxyStatusRequest: {$endpoint}");
            usleep(300000);
            return [
                'success' => true,
                'data' => [
                    'status_code' => '00',
                    'status_description' => '[MOCK] Procesado Correctamente',
                    'status_message' => '[MOCK] Documento validado por la DIAN',
                    'is_valid' => true,
                ],
            ];
        }

        try {
            $response = $this->proxyRequest('POST', $endpoint, [
                'dian_token' => $token,
                'environment' => $environment,
            ]);

            $responseData = $response->json();

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return [
                    'success' => true,
                    'data' => $responseData['data'] ?? $responseData,
                ];
            }

            return [
                'success' => false,
                'message' => $responseData['message'] ?? "Error en consulta de estado",
                'data' => $responseData,
            ];
        } catch (\Exception $e) {
            Log::error("Exception in proxy status request: {$endpoint}", ['message' => $e->getMessage()]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Helper para parsear respuestas de documentos electrónicos del proxy
     */
    private function parseDocumentResponse(array $responseData, bool $httpSuccess, string $documentType): array
    {
        $isValid = $responseData['is_valid'] ?? false;

        if ($httpSuccess && $isValid) {
            return [
                'success' => true,
                'is_valid' => true,
                'data' => $responseData['data'] ?? $responseData,
            ];
        }

        return [
            'success' => false,
            'is_valid' => false,
            'message' => $responseData['message'] ?? "Error enviando {$documentType}",
            'errors_messages' => $responseData['errors_messages'] ?? [],
            'errors' => $responseData['errors'] ?? [],
            'data' => $responseData['data'] ?? $responseData,
        ];
    }
}
