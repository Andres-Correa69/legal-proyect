<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\Templates\ClientTemplate;
use App\Exports\Templates\SupplierTemplate;
use App\Exports\Templates\ProductTemplate;
use App\Exports\Templates\ServiceTemplate;
use App\Imports\ClientImport;
use App\Imports\SupplierImport;
use App\Imports\ProductImport;
use App\Imports\ServiceImport;
use App\Models\ProductCategory;
use App\Models\Supplier;
use App\Models\Location;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BulkImportController extends Controller
{
    private array $validTypes = ['clients', 'suppliers', 'products', 'services'];

    private array $permissionMap = [
        'clients' => 'clients.import',
        'suppliers' => 'suppliers.import',
        'products' => 'products.import',
        'services' => 'services.import',
    ];

    private function authorizeType(string $type): void
    {
        $permission = $this->permissionMap[$type] ?? null;
        if (!$permission || !auth()->user()->hasPermission($permission)) {
            abort(403, 'No tienes permiso para realizar esta acción.');
        }
    }

    /**
     * Download import template Excel file
     */
    public function template(Request $request, string $type)
    {
        if (!in_array($type, $this->validTypes)) {
            return response()->json(['success' => false, 'message' => 'Tipo de importación no válido'], 422);
        }

        $this->authorizeType($type);

        $companyId = auth()->user()->company_id;
        $fileName = "plantilla_importacion_{$type}.xlsx";

        $export = match ($type) {
            'clients' => new ClientTemplate(['CC', 'CE', 'NIT', 'TI', 'PP', 'DIE', 'PEP', 'RC']),
            'suppliers' => new SupplierTemplate(),
            'products' => new ProductTemplate(
                ProductCategory::where('company_id', $companyId)->select('id', 'name')->get()->toArray(),
                Supplier::where('company_id', $companyId)->where('is_active', true)->select('id', 'name')->get()->toArray(),
                Location::whereHas('warehouse', fn($q) => $q->where('company_id', $companyId))->select('id', 'name')->get()->toArray(),
            ),
            'services' => new ServiceTemplate(),
        };

        return Excel::download($export, $fileName);
    }

    /**
     * Validate file without importing (preview)
     */
    public function validate(Request $request, string $type)
    {
        if (!in_array($type, $this->validTypes)) {
            return response()->json(['success' => false, 'message' => 'Tipo de importación no válido'], 422);
        }

        $this->authorizeType($type);

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        $rows = $this->readFile($request->file('file'));

        if (count($rows) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo no contiene datos para importar',
            ], 422);
        }

        $user = auth()->user();
        $importer = $this->getImporter($type, $user);
        $result = $importer->validate($rows);

        // ProductImport returns { rows, missing_references }, others return flat array
        $missingReferences = [];
        if (isset($result['rows'])) {
            $preview = $result['rows'];
            $missingReferences = $result['missing_references'] ?? [];
        } else {
            $preview = $result;
        }

        $validCount = count(array_filter($preview, fn($r) => $r['valid']));
        $errorCount = count(array_filter($preview, fn($r) => !$r['valid']));
        $duplicateCount = count(array_filter($preview, fn($r) => $r['is_duplicate']));

        return response()->json([
            'success' => true,
            'data' => [
                'preview' => $preview,
                'summary' => [
                    'total' => count($preview),
                    'valid' => $validCount,
                    'errors' => $errorCount,
                    'duplicates' => $duplicateCount,
                ],
                'missing_references' => $missingReferences,
            ],
        ]);
    }

    /**
     * Import data from file
     */
    public function import(Request $request, string $type)
    {
        if (!in_array($type, $this->validTypes)) {
            return response()->json(['success' => false, 'message' => 'Tipo de importación no válido'], 422);
        }

        $this->authorizeType($type);

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
            'duplicate_mode' => 'nullable|in:skip,update',
        ]);

        $rows = $this->readFile($request->file('file'));

        if (count($rows) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'El archivo no contiene datos para importar',
            ], 422);
        }

        $user = auth()->user();
        $duplicateMode = $request->input('duplicate_mode', 'skip');

        $importer = $this->getImporter($type, $user, $duplicateMode);

        $results = DB::transaction(function () use ($importer, $rows) {
            return $importer->import($rows);
        });

        $typeLabels = [
            'clients' => 'clientes',
            'suppliers' => 'proveedores',
            'products' => 'productos',
            'services' => 'servicios',
        ];

        return response()->json([
            'success' => true,
            'data' => $results,
            'message' => "Importación de {$typeLabels[$type]} completada: {$results['inserted']} insertados, {$results['updated']} actualizados, {$results['skipped']} omitidos" .
                (!empty($results['errors']) ? ", " . count($results['errors']) . " errores" : ""),
        ]);
    }

    protected function getImporter(string $type, $user, string $duplicateMode = 'skip')
    {
        return match ($type) {
            'clients' => new ClientImport($user->company_id, $user->branch_id, $duplicateMode),
            'suppliers' => new SupplierImport($user->company_id, $duplicateMode),
            'products' => new ProductImport($user->company_id, $duplicateMode),
            'services' => new ServiceImport($user->company_id, $user->branch_id, $user->id, $duplicateMode),
        };
    }

    protected function readFile($file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'csv') {
            return $this->readCsv($file);
        }

        $spreadsheet = IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = [];

        foreach ($worksheet->toArray(null, true, true, false) as $row) {
            $rows[] = $row;
        }

        return $rows;
    }

    protected function readCsv($file): array
    {
        $rows = [];
        $handle = fopen($file->getPathname(), 'r');

        // Detect delimiter
        $firstLine = fgets($handle);
        rewind($handle);
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';

        while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
            $rows[] = $data;
        }

        fclose($handle);
        return $rows;
    }
}
