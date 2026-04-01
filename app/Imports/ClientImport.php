<?php

namespace App\Imports;

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ClientImport
{
    protected int $companyId;
    protected ?int $branchId;
    protected string $duplicateMode;
    protected array $results = ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];

    protected array $headerMap = [
        'nombre' => 'name',
        'email' => 'email',
        'tipo_documento' => 'document_type',
        'numero_documento' => 'document_id',
        'telefono' => 'phone',
        'whatsapp_pais' => 'whatsapp_country',
        'whatsapp_numero' => 'whatsapp_number',
        'direccion' => 'address',
        'fecha_nacimiento' => 'birth_date',
        'genero' => 'gender',
        'pais' => 'country_name',
        'departamento' => 'state_name',
        'ciudad' => 'city_name',
        'barrio' => 'neighborhood',
        'ocupacion' => 'occupation',
        'observaciones' => 'observations',
        'etiquetas' => 'tags',
    ];

    public function __construct(int $companyId, ?int $branchId, string $duplicateMode = 'skip')
    {
        $this->companyId = $companyId;
        $this->branchId = $branchId;
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

            $existing = isset($mapped['email']) ? User::where('email', $mapped['email'])->where('company_id', $this->companyId)->exists() : false;

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
        $existing = User::where('email', $data['email'])->where('company_id', $this->companyId)->first();

        if ($existing) {
            if ($this->duplicateMode === 'update') {
                $updateData = array_filter($data, fn($v) => $v !== null && $v !== '');
                unset($updateData['email']);
                $existing->update($updateData);
                $this->results['updated']++;
            } else {
                $this->results['skipped']++;
            }
            return;
        }

        if (isset($data['tags']) && is_string($data['tags'])) {
            $data['tags'] = array_map('trim', explode(',', $data['tags']));
        }

        $user = User::create(array_merge($data, [
            'company_id' => $this->companyId,
            'branch_id' => $this->branchId,
            'password' => Hash::make('cliente123'),
            'is_active' => true,
        ]));

        $clientRole = Role::where('slug', 'client')->where('company_id', $this->companyId)->first();
        if ($clientRole) {
            $user->roles()->syncWithoutDetaching([$clientRole->id]);
        }

        $this->results['inserted']++;
    }

    protected function validateRow(array $data, int $rowNumber): array
    {
        $errors = [];

        $fieldLabels = [
            'name' => 'Nombre',
            'email' => 'Correo electrónico',
            'document_type' => 'Tipo de documento',
            'document_id' => 'Número de documento',
            'phone' => 'Teléfono',
            'whatsapp_country' => 'País WhatsApp',
            'whatsapp_number' => 'Número WhatsApp',
            'address' => 'Dirección',
            'birth_date' => 'Fecha de nacimiento',
            'gender' => 'Género',
            'country_name' => 'País',
            'state_name' => 'Departamento',
            'city_name' => 'Ciudad',
            'neighborhood' => 'Barrio',
            'occupation' => 'Ocupación',
            'observations' => 'Observaciones',
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'document_type' => 'nullable|string|max:50',
            'document_id' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'country_name' => 'nullable|string|max:100',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:150',
            'occupation' => 'nullable|string|max:100',
            'observations' => 'nullable|string|max:5000',
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => ':attribute debe ser texto.',
            'email' => ':attribute no es un correo válido.',
            'date' => ':attribute no es una fecha válida (usar formato AAAA-MM-DD).',
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
        $header = mb_strtolower(trim($header));
        $header = str_replace(['*', '(', ')'], '', $header);
        return trim($header);
    }

    protected function isEmptyRow(array $row): bool
    {
        return empty(array_filter($row, fn($v) => $v !== null && trim((string)$v) !== ''));
    }
}
