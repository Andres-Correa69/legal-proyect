<?php

namespace App\Imports;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Supplier;
use Illuminate\Support\Facades\Validator;

class ProductImport
{
    protected int $companyId;
    protected string $duplicateMode;
    protected array $results = ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
    protected array $categoriesCache = [];
    protected array $suppliersCache = [];

    protected array $headerMap = [
        'nombre' => 'name',
        'categoria' => '_category_name',
        'precio_compra' => 'purchase_price',
        'precio_venta' => 'sale_price',
        'sku' => 'sku',
        'codigo_barras' => 'barcode',
        'marca' => 'brand',
        'descripcion' => 'description',
        'stock_actual' => 'current_stock',
        'stock_minimo' => 'min_stock',
        'stock_maximo' => 'max_stock',
        'impuesto' => 'tax_rate',
        'unidad_medida' => 'unit_of_measure',
        'proveedor' => '_supplier_name',
        'es_rastreable' => '_is_trackable',
    ];

    public function __construct(int $companyId, string $duplicateMode = 'skip')
    {
        $this->companyId = $companyId;
        $this->duplicateMode = $duplicateMode;
        $this->loadCaches();
    }

    protected function loadCaches(): void
    {
        $this->categoriesCache = ProductCategory::where('company_id', $this->companyId)
            ->pluck('id', 'name')
            ->mapWithKeys(fn($id, $name) => [mb_strtolower($name) => $id])
            ->toArray();

        $this->suppliersCache = Supplier::where('company_id', $this->companyId)
            ->pluck('id', 'name')
            ->mapWithKeys(fn($id, $name) => [mb_strtolower($name) => $id])
            ->toArray();
    }

    public function import(array $rows): array
    {
        $headers = array_map(fn($h) => $this->normalizeHeader($h), array_shift($rows));

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            if ($this->isEmptyRow($row)) continue;

            $mapped = $this->mapRow($headers, $row);
            $resolved = $this->resolveReferences($mapped, $rowNumber);

            if ($resolved === null) continue;

            $errors = $this->validateRow($resolved, $rowNumber);
            if (!empty($errors)) {
                foreach ($errors as $error) {
                    $this->results['errors'][] = $error;
                }
                continue;
            }

            $this->processRow($resolved, $rowNumber);
        }

        return $this->results;
    }

    protected array $missingCategories = [];
    protected array $missingSuppliers = [];

    public function validate(array $rows): array
    {
        $headers = array_map(fn($h) => $this->normalizeHeader($h), array_shift($rows));
        $preview = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            if ($this->isEmptyRow($row)) continue;

            $mapped = $this->mapRow($headers, $row);
            $resolved = $this->resolveReferences($mapped, $rowNumber, true);
            $errors = $this->validateRow($resolved ?? $mapped, $rowNumber);

            $existing = false;
            if (!empty($resolved['sku'])) {
                $existing = Product::where('sku', $resolved['sku'])->where('company_id', $this->companyId)->exists();
            } elseif (!empty($resolved['barcode'])) {
                $existing = Product::where('barcode', $resolved['barcode'])->where('company_id', $this->companyId)->exists();
            }

            $preview[] = [
                'row' => $rowNumber,
                'data' => $resolved ?? $mapped,
                'errors' => $errors,
                'is_duplicate' => $existing,
                'valid' => empty($errors),
            ];
        }

        return [
            'rows' => $preview,
            'missing_references' => [
                'categories' => array_values(array_unique($this->missingCategories)),
                'suppliers' => array_values(array_unique($this->missingSuppliers)),
            ],
        ];
    }

    protected function resolveReferences(array $data, int $rowNumber, bool $previewMode = false): ?array
    {
        $errors = [];

        // Resolve category
        if (!empty($data['_category_name'])) {
            $catKey = mb_strtolower($data['_category_name']);
            if (isset($this->categoriesCache[$catKey])) {
                $data['category_id'] = $this->categoriesCache[$catKey];
            } else {
                $this->missingCategories[] = $data['_category_name'];
                $errors[] = ['row' => $rowNumber, 'field' => 'Categoría', 'message' => "La categoría '{$data['_category_name']}' no existe. Debes crearla primero.", 'type' => 'missing_category', 'value' => $data['_category_name']];
            }
        }
        unset($data['_category_name']);

        // Resolve supplier
        if (!empty($data['_supplier_name'])) {
            $supKey = mb_strtolower($data['_supplier_name']);
            if (isset($this->suppliersCache[$supKey])) {
                $data['supplier_id'] = $this->suppliersCache[$supKey];
            } else {
                $this->missingSuppliers[] = $data['_supplier_name'];
                $errors[] = ['row' => $rowNumber, 'field' => 'Proveedor', 'message' => "El proveedor '{$data['_supplier_name']}' no existe. Debes crearlo primero.", 'type' => 'missing_supplier', 'value' => $data['_supplier_name']];
            }
        }
        unset($data['_supplier_name']);

        // Resolve trackable
        if (isset($data['_is_trackable'])) {
            $val = mb_strtolower($data['_is_trackable']);
            $data['is_trackable'] = in_array($val, ['si', 'sí', 'yes', '1', 'true']);
        }
        unset($data['_is_trackable']);

        // Cast numeric fields
        foreach (['purchase_price', 'sale_price', 'tax_rate'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = $this->parseNumber($data[$field]);
            }
        }
        foreach (['current_stock', 'min_stock', 'max_stock'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = (int) $this->parseNumber($data[$field]);
            }
        }

        if (!empty($errors)) {
            foreach ($errors as $error) {
                $this->results['errors'][] = $error;
            }
            if (!$previewMode) return null;
        }

        return $data;
    }

    protected function processRow(array $data, int $rowNumber): void
    {
        $existing = null;
        if (!empty($data['sku'])) {
            $existing = Product::where('sku', $data['sku'])->where('company_id', $this->companyId)->first();
        } elseif (!empty($data['barcode'])) {
            $existing = Product::where('barcode', $data['barcode'])->where('company_id', $this->companyId)->first();
        }

        if ($existing) {
            if ($this->duplicateMode === 'update') {
                $updateData = array_filter($data, fn($v) => $v !== null && $v !== '');
                $existing->update($updateData);
                $this->results['updated']++;
            } else {
                $this->results['skipped']++;
            }
            return;
        }

        if (empty($data['sku'])) {
            $data['sku'] = Product::generateSku($this->companyId);
        }

        Product::create(array_merge($data, [
            'company_id' => $this->companyId,
            'is_active' => true,
            'is_trackable' => $data['is_trackable'] ?? true,
        ]));

        $this->results['inserted']++;
    }

    protected function validateRow(array $data, int $rowNumber): array
    {
        $errors = [];

        $fieldLabels = [
            'name' => 'Nombre',
            'category_id' => 'Categoría',
            'purchase_price' => 'Precio de compra',
            'sale_price' => 'Precio de venta',
            'sku' => 'SKU',
            'barcode' => 'Código de barras',
            'brand' => 'Marca',
            'description' => 'Descripción',
            'current_stock' => 'Stock actual',
            'min_stock' => 'Stock mínimo',
            'max_stock' => 'Stock máximo',
            'tax_rate' => 'Impuesto',
            'unit_of_measure' => 'Unidad de medida',
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'category_id' => 'required|integer|exists:product_categories,id',
            'purchase_price' => 'required|numeric|min:0',
            'sale_price' => 'required|numeric|min:0',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'current_stock' => 'nullable|integer|min:0',
            'min_stock' => 'nullable|integer|min:0',
            'max_stock' => 'nullable|integer|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'unit_of_measure' => 'nullable|string|max:50',
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => ':attribute debe ser texto.',
            'integer' => ':attribute debe ser un número entero.',
            'numeric' => ':attribute debe ser un número.',
            'min' => ':attribute no puede ser menor a :min.',
            'max' => ':attribute no puede exceder :max caracteres.',
            'email' => ':attribute no es un correo válido.',
            'exists' => ':attribute no existe en el sistema.',
        ], $fieldLabels);

        if ($validator->fails()) {
            foreach ($validator->errors()->toArray() as $field => $messages) {
                $errors[] = ['row' => $rowNumber, 'field' => $fieldLabels[$field] ?? $field, 'message' => $messages[0]];
            }
        }

        return $errors;
    }

    protected function parseNumber(string $value): float
    {
        $value = str_replace(['$', ' '], '', $value);
        // Handle Colombian format: 85.000 or 85,000
        if (preg_match('/^\d{1,3}(\.\d{3})+(,\d+)?$/', $value)) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } elseif (preg_match('/^\d{1,3}(,\d{3})+(\.\d+)?$/', $value)) {
            $value = str_replace(',', '', $value);
        } else {
            $value = str_replace(',', '.', $value);
        }
        return (float) $value;
    }

    protected function mapRow(array $headers, array $row): array
    {
        $mapped = [];
        foreach ($headers as $i => $header) {
            $field = $this->headerMap[$header] ?? null;
            if ($field && isset($row[$i])) {
                $value = trim((string)$row[$i]);
                if ($value !== '') {
                    $mapped[$field] = $value;
                }
            }
        }
        return $mapped;
    }

    protected function normalizeHeader(string $header): string
    {
        return trim(str_replace(['*', '(', ')'], '', mb_strtolower(trim($header))));
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn($v) => $v !== null && trim((string)$v) !== ''));
    }
}
