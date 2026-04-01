<?php

namespace App\Http\Requests;

use App\Models\Branch;
use App\Models\Service;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('services.manage');
    }

    /**
     * Reglas de validación
     */
    public function rules(): array
    {
        $user = $this->user();
        $service = $this->route('service');

        $companyId = $user->isSuperAdmin()
            ? ($service->company_id ?? $user->company_id)
            : $user->company_id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => [
                'sometimes',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('services', 'slug')
                    ->where(function ($query) use ($companyId) {
                        return $query->where('company_id', $companyId)->whereNull('deleted_at');
                    })
                    ->ignore($service->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'category' => [
                'sometimes',
                'string',
                Rule::in(array_keys(Service::CATEGORIES)),
            ],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'base_price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'tax_rate' => ['nullable', 'numeric', 'in:0,5,19'],
            'estimated_duration' => ['nullable', 'integer', 'min:1', 'max:10080'],
            'unit' => [
                'sometimes',
                'string',
                Rule::in(array_keys(Service::UNITS)),
            ],
            'is_active' => ['sometimes', 'boolean'],
            'branch_id' => [
                'nullable',
                'exists:branches,id',
                function ($attribute, $value, $fail) use ($companyId) {
                    if ($value) {
                        $branch = Branch::find($value);
                        if (!$branch || $branch->company_id !== $companyId) {
                            $fail('La sucursal seleccionada no pertenece a tu empresa.');
                        }
                    }
                },
            ],

            // Productos asociados al servicio
            'products' => ['nullable', 'array'],
            'products.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'products.*.quantity' => ['required', 'integer', 'min:1'],
            'products.*.is_included' => ['required', 'boolean'],
        ];
    }

    /**
     * Mensajes de error personalizados
     */
    public function messages(): array
    {
        return [
            'name.max' => 'El nombre no puede exceder 255 caracteres.',
            'slug.unique' => 'Ya existe un servicio con este identificador en tu empresa.',
            'slug.regex' => 'El identificador solo puede contener letras minúsculas, números y guiones.',
            'category.in' => 'La categoría seleccionada no es válida.',
            'price.numeric' => 'El precio debe ser un número.',
            'price.min' => 'El precio no puede ser negativo.',
            'unit.in' => 'La unidad seleccionada no es válida.',
            'estimated_duration.min' => 'La duración estimada debe ser al menos 1 minuto.',
            'estimated_duration.max' => 'La duración estimada no puede exceder 1 semana.',
        ];
    }

    /**
     * Prepara los datos antes de la validación
     */
    protected function prepareForValidation(): void
    {
        // Convertir is_active a boolean si viene como string
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            ]);
        }

        // Limpiar valores vacíos
        if ($this->has('base_price') && $this->input('base_price') === '') {
            $this->merge(['base_price' => null]);
        }

        if ($this->has('estimated_duration') && $this->input('estimated_duration') === '') {
            $this->merge(['estimated_duration' => null]);
        }
    }
}
