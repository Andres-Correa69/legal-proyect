<?php

namespace App\Imports;

use App\Models\Supplier;
use Illuminate\Support\Facades\Validator;

class SupplierImport
{
    protected int $companyId;
    protected string $duplicateMode;
    protected array $results = ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

    protected array $headerMap = [
        'nombre' => 'name',
        'nit' => 'tax_id',
        'tipo_documento' => 'document_type',
        'email' => 'email',
        'telefono' => 'phone',
        'direccion' => 'address',
        'nombre_contacto' => 'contact_name',
        'terminos_pago' => 'payment_terms',
    ];

    public function __construct(int $companyId, string $duplicateMode = 'skip')
    {
        $this->companyId = $companyId;
        $this->duplicateMode = $duplicateMode;
    }

    public function import(array $rows): array
    {
        $headers = array_map(fn($h) => $this->normalizeHeader($h), array_shift($rows));

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            if ($this->isEmptyRow($row)) continue;

            $mapped = $this->mapRow($headers, $row);
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
            $errors = $this->validateRow($mapped, $rowNumber);

            $existing = false;
            if (!empty($mapped['tax_id'])) {
                $existing = Supplier::where('tax_id', $mapped['tax_id'])->where('company_id', $this->companyId)->exists();
            } elseif (!empty($mapped['name'])) {
                $existing = Supplier::where('name', $mapped['name'])->where('company_id', $this->companyId)->exists();
            }

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
        $existing = null;
        if (!empty($data['tax_id'])) {
            $existing = Supplier::where('tax_id', $data['tax_id'])->where('company_id', $this->companyId)->first();
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

        Supplier::create(array_merge($data, [
            'company_id' => $this->companyId,
            'is_active' => true,
        ]));

        $this->results['inserted']++;
    }

    protected function validateRow(array $data, int $rowNumber): array
    {
        $errors = [];

        $fieldLabels = [
            'name' => 'Nombre',
            'tax_id' => 'NIT',
            'document_type' => 'Tipo de documento',
            'email' => 'Correo electrónico',
            'phone' => 'Teléfono',
            'address' => 'Dirección',
            'contact_name' => 'Nombre de contacto',
            'payment_terms' => 'Términos de pago',
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'tax_id' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'contact_name' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|string|max:255',
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => ':attribute debe ser texto.',
            'email' => ':attribute no es un correo válido.',
            'max' => ':attribute no puede exceder :max caracteres.',
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
