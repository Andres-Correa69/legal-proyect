<?php

namespace App\Imports;

use App\Models\Service;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class ServiceImport
{
    protected int $companyId;
    protected ?int $branchId;
    protected int $userId;
    protected string $duplicateMode;
    protected array $results = ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

    protected array $headerMap = [
        'nombre' => 'name',
        'precio' => 'price',
        'categoria' => 'category',
        'descripcion' => 'description',
        'duracion_estimada' => 'estimated_duration',
        'unidad' => 'unit',
        'precio_base' => 'base_price',
    ];

    protected array $validCategories = [
        'consultoria', 'capacitacion', 'instalacion', 'mantenimiento', 'soporte', 'otro',
    ];

    protected array $validUnits = [
        'servicio', 'hora', 'dia', 'sesion', 'proyecto', 'visita', 'unidad',
    ];

    public function __construct(int $companyId, ?int $branchId, int $userId, string $duplicateMode = 'skip')
    {
        $this->companyId = $companyId;
        $this->branchId = $branchId;
        $this->userId = $userId;
        $this->duplicateMode = $duplicateMode;
    }

    public function import(array $rows): array
    {
        $headers = array_map(fn($h) => $this->normalizeHeader($h), array_shift($rows));

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            if ($this->isEmptyRow($row)) continue;

            $mapped = $this->mapRow($headers, $row);
            $mapped = $this->castFields($mapped);
            $errors = $this->validateRow($mapped, $rowNumber);

            if (!empty($errors)) {
                foreach ($errors as $error) {
                    $this->results['errors'][] = $error;
                }
                continue;
            }

            $this->processRow($mapped, $rowNumber);
        }

        return $this->results;
    }

    public function validate(array $rows): array
    {
        $headers = array_map(fn($h) => $this->normalizeHeader($h), array_shift($rows));
        $preview = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            if ($this->isEmptyRow($row)) continue;

            $mapped = $this->mapRow($headers, $row);
            $mapped = $this->castFields($mapped);
            $errors = $this->validateRow($mapped, $rowNumber);

            $existing = !empty($mapped['name'])
                ? Service::where('name', $mapped['name'])->where('company_id', $this->companyId)->exists()
                : false;

            $preview[] = [
                'row' => $rowNumber,
                'data' => $mapped,
                'errors' => $errors,
                'is_duplicate' => $existing,
                'valid' => empty($errors),
            ];
        }

        return $preview;
    }

    protected function processRow(array $data, int $rowNumber): void
    {
        $existing = Service::where('name', $data['name'])->where('company_id', $this->companyId)->first();

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

        Service::create(array_merge($data, [
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'created_by_user_id' => $this->userId,
            'slug' => Str::slug($data['name']),
            'base_price' => $data['base_price'] ?? $data['price'],
            'is_active' => true,
        ]));

        $this->results['inserted']++;
    }

    protected function castFields(array $data): array
    {
        foreach (['price', 'base_price'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = (float) str_replace(['$', ' ', ','], ['', '', ''], $data[$field]);
            }
        }
        if (isset($data['estimated_duration'])) {
            $data['estimated_duration'] = (int) $data['estimated_duration'];
        }
        if (isset($data['category'])) {
            $data['category'] = mb_strtolower($data['category']);
        }
        if (isset($data['unit'])) {
            $data['unit'] = mb_strtolower($data['unit']);
        }
        return $data;
    }

    protected function validateRow(array $data, int $rowNumber): array
    {
        $errors = [];

        $fieldLabels = [
            'name' => 'Nombre',
            'price' => 'Precio',
            'category' => 'Categoría',
            'description' => 'Descripción',
            'estimated_duration' => 'Duración estimada',
            'unit' => 'Unidad',
            'base_price' => 'Precio base',
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'category' => 'nullable|string|in:' . implode(',', $this->validCategories),
            'description' => 'nullable|string',
            'estimated_duration' => 'nullable|integer|min:1',
            'unit' => 'nullable|string|in:' . implode(',', $this->validUnits),
            'base_price' => 'nullable|numeric|min:0',
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => ':attribute debe ser texto.',
            'numeric' => ':attribute debe ser un número.',
            'integer' => ':attribute debe ser un número entero.',
            'min' => ':attribute no puede ser menor a :min.',
            'in' => ':attribute no es válido. Opciones: ' . implode(', ', $this->validCategories) . ' / ' . implode(', ', $this->validUnits),
        ], $fieldLabels);

        if ($validator->fails()) {
            foreach ($validator->errors()->toArray() as $field => $messages) {
                $errors[] = ['row' => $rowNumber, 'field' => $fieldLabels[$field] ?? $field, 'message' => $messages[0]];
            }
        }

        return $errors;
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
