<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Services\FreeTrialService;
use App\Services\RutParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RegistrationController extends Controller
{
    public function __construct(
        private FreeTrialService $freeTrialService,
        private RutParserService $rutParserService,
    ) {}

    /**
     * Parsea un PDF de RUT y extrae datos estructurados.
     */
    public function parseRut(Request $request): JsonResponse
    {
        $request->validate([
            'rut_file' => 'required|file|mimes:pdf|max:5120',
        ]);

        try {
            $data = $this->rutParserService->parse($request->file('rut_file'));

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'RUT procesado exitosamente.',
            ]);
        } catch (\Exception $e) {
            Log::warning('Error al parsear RUT en registro', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo procesar el PDF del RUT. ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Valida datos de la empresa antes de crearla (unicidad).
     */
    public function validateCompany(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:50',
            'admin_email' => 'required|email|max:255',
        ]);

        $errors = [];

        // Verificar unicidad del NIT
        if ($request->tax_id && Company::where('tax_id', $request->tax_id)->exists()) {
            $errors['tax_id'] = 'Ya existe una empresa registrada con este NIT.';
        }

        // Verificar unicidad del email del admin
        if (User::where('email', $request->admin_email)->exists()) {
            $errors['admin_email'] = 'Ya existe un usuario con este correo electronico.';
        }

        if (!empty($errors)) {
            return response()->json([
                'success' => false,
                'errors' => $errors,
                'message' => 'Algunos datos ya estan en uso.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Datos validos.',
        ]);
    }

    /**
     * Descarga la plantilla Excel para importar productos.
     */
    public function downloadProductTemplate(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = ['nombre', 'precio_venta', 'precio_compra', 'sku', 'codigo_barras', 'tipo', 'impuesto', 'descripcion'];
        $exampleRow = ['Producto Ejemplo', '50000', '30000', 'SKU-001', '7701234567890', 'producto', '19', 'Descripcion del producto'];

        $callback = function () use ($headers, $exampleRow) {
            $file = fopen('php://output', 'w');
            // BOM para UTF-8 en Excel
            fwrite($file, "\xEF\xBB\xBF");
            fputcsv($file, $headers);
            fputcsv($file, $exampleRow);
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_productos_legal_sistema.csv"',
        ]);
    }

    /**
     * Importa productos desde un archivo CSV/Excel subido en el wizard.
     */
    public function importProducts(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
        ]);

        try {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());

            $rows = [];
            if (in_array($extension, ['csv', 'txt'])) {
                $rows = $this->parseCsv($file->getRealPath());
            } else {
                $rows = $this->parseExcel($file->getRealPath());
            }

            if (empty($rows)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El archivo esta vacio o no se pudo leer.',
                ], 422);
            }

            $headers = array_map(fn($h) => strtolower(trim(str_replace(['*', '(', ')'], '', $h))), $rows[0]);
            $products = [];

            $headerMap = [
                'nombre' => 'name',
                'precio_venta' => 'price',
                'precio_compra' => 'cost',
                'sku' => 'sku',
                'codigo_barras' => 'barcode',
                'tipo' => 'type',
                'impuesto' => 'tax_rate',
                'descripcion' => 'description',
            ];

            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                if (empty(array_filter($row))) continue;

                $product = [
                    'name' => '',
                    'price' => '0',
                    'cost' => '0',
                    'sku' => '',
                    'type' => 'product',
                    'tax_rate' => '19',
                    'description' => '',
                ];

                foreach ($headers as $colIndex => $header) {
                    $field = $headerMap[$header] ?? null;
                    if ($field && isset($row[$colIndex])) {
                        $value = trim($row[$colIndex]);
                        if ($field === 'type') {
                            $value = in_array(strtolower($value), ['servicio', 'service']) ? 'service' : 'product';
                        }
                        $product[$field] = $value;
                    }
                }

                if (!empty($product['name'])) {
                    $products[] = $product;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $products,
                'message' => count($products) . ' producto(s) leidos del archivo.',
            ]);
        } catch (\Exception $e) {
            Log::warning('Error al importar productos en registro', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el archivo: ' . $e->getMessage(),
            ], 422);
        }
    }

    private function parseCsv(string $path): array
    {
        $rows = [];
        $firstLine = file_get_contents($path, false, null, 0, 1024);
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

        if (($handle = fopen($path, 'r')) !== false) {
            while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
                $rows[] = $data;
            }
            fclose($handle);
        }
        return $rows;
    }

    private function parseExcel(string $path): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = [];
        foreach ($sheet->getRowIterator() as $row) {
            $cells = [];
            foreach ($row->getCellIterator() as $cell) {
                $cells[] = (string) $cell->getValue();
            }
            $rows[] = $cells;
        }
        return $rows;
    }

    /**
     * Sube un logo temporalmente durante el wizard de registro.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|max:5120',
            'registration_token' => 'required|string|max:100',
        ]);

        return $this->uploadTempFile($request->file('logo'), $request->registration_token, 'logos');
    }

    /**
     * Sube un logo icono temporalmente durante el wizard de registro.
     */
    public function uploadLogoIcon(Request $request): JsonResponse
    {
        $request->validate([
            'logo_icon' => 'required|image|max:5120',
            'registration_token' => 'required|string|max:100',
        ]);

        return $this->uploadTempFile($request->file('logo_icon'), $request->registration_token, 'logos/icon');
    }

    /**
     * Completa el registro: crea empresa, sede, usuario admin y suscripcion.
     */
    public function complete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Honeypot - debe estar vacio
            'website' => 'nullable|string|max:0',

            // Datos de empresa (obligatorios)
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',

            // Credenciales admin
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255',
            'admin_password' => 'required|string|min:8|confirmed',

            // Token de registro (para archivos temporales)
            'registration_token' => 'nullable|string|max:100',

            // Logos temporales (paths en S3)
            'temp_logo_path' => 'nullable|string|max:500',
            'temp_logo_icon_path' => 'nullable|string|max:500',

            // Productos (opcional)
            'products' => 'nullable|array|max:100',
            'products.*.name' => 'required_with:products|string|max:255',
            'products.*.price' => 'required_with:products|numeric|min:0',
            'products.*.cost' => 'nullable|numeric|min:0',
            'products.*.sku' => 'nullable|string|max:100',
            'products.*.barcode' => 'nullable|string|max:100',
            'products.*.description' => 'nullable|string|max:1000',
            'products.*.type' => 'nullable|in:product,service',
            'products.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'products.*.track_inventory' => 'nullable|boolean',
            'products.*.image_url' => 'nullable|string|max:500',

            // Config DIAN (opcional)
            'dian_config' => 'nullable|array',
            'dian_config.electronic_invoicing_token' => 'nullable|string|max:500',
            'dian_config.ei_type_document_identification_id' => 'nullable|integer',
            'dian_config.ei_type_organization_id' => 'nullable|integer',
            'dian_config.ei_type_regime_id' => 'nullable|integer',
            'dian_config.ei_type_liability_id' => 'nullable|integer',
            'dian_config.ei_municipality_id' => 'nullable|integer',
            'dian_config.ei_business_name' => 'nullable|string|max:255',
            'dian_config.ei_merchant_registration' => 'nullable|string|max:100',
            'dian_config.ei_address' => 'nullable|string|max:500',
            'dian_config.ei_phone' => 'nullable|string|max:50',
            'dian_config.ei_email' => 'nullable|email|max:255',
        ]);

        // Honeypot check
        if (!empty($validated['website'])) {
            // Bot detected - return fake success
            return response()->json([
                'success' => true,
                'message' => 'Empresa creada exitosamente.',
            ]);
        }

        // Validar unicidad
        if (!empty($validated['tax_id']) && Company::where('tax_id', $validated['tax_id'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una empresa registrada con este NIT.',
            ], 422);
        }

        if (User::where('email', $validated['admin_email'])->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe un usuario con este correo electronico.',
            ], 422);
        }

        try {
            $result = $this->freeTrialService->createTrialCompany($validated);

            return response()->json([
                'success' => true,
                'data' => [
                    'company_name' => $result['company']->name,
                    'admin_email' => $result['admin_user']->email,
                    'admin_name' => $result['admin_user']->name,
                ],
                'message' => 'Empresa creada exitosamente. Ya puedes iniciar sesion con tus credenciales.',
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error al completar registro de prueba gratuita', [
                'name' => $validated['name'],
                'admin_email' => $validated['admin_email'],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al crear la empresa. Por favor, intenta de nuevo.',
            ], 500);
        }
    }

    /**
     * Sube un archivo temporal a S3 para el wizard.
     */
    private function uploadTempFile($file, string $token, string $subfolder): JsonResponse
    {
        try {
            $extension = $file->getClientOriginalExtension() ?: 'png';
            $fileName = Str::uuid() . '.' . $extension;
            $filePath = "temp/registrations/{$token}/{$subfolder}/{$fileName}";

            $content = file_get_contents($file->getRealPath());
            $uploaded = Storage::disk('s3')->put($filePath, $content);

            if ($uploaded) {
                $url = Storage::disk('s3')->url($filePath);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'url' => $url,
                        'path' => $filePath,
                    ],
                    'message' => 'Archivo subido exitosamente.',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al subir el archivo.',
            ], 500);
        } catch (\Exception $e) {
            Log::error('Error al subir archivo temporal de registro', [
                'token' => $token,
                'subfolder' => $subfolder,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al subir el archivo.',
            ], 500);
        }
    }
}
