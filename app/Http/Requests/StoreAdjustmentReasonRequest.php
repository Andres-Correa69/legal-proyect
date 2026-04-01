<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdjustmentReasonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('inventory.adjustments.manage');
    }

    public function rules(): array
    {
        $user = $this->user();

        $companyId = $user->isSuperAdmin()
            ? ($this->input('company_id') ?? null)
            : $user->company_id;

        $rules = [
            'code' => [
                'required',
                'string',
                'max:50',
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'requires_approval' => ['boolean'],
            'approval_threshold_amount' => ['nullable', 'numeric', 'min:0'],
            'approval_threshold_quantity' => ['nullable', 'integer', 'min:1'],
            'company_id' => [
                $user->isSuperAdmin() ? 'nullable' : 'nullable',
                'exists:companies,id',
            ],
        ];

        if ($companyId !== null) {
            $rules['code'][] = Rule::unique('adjustment_reasons', 'code')->where(function ($query) use ($companyId) {
                return $query->where('company_id', $companyId);
            });
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'code.required' => 'El código es obligatorio.',
            'code.unique' => 'Ya existe un motivo con este código en tu empresa.',
            'name.required' => 'El nombre es obligatorio.',
            'approval_threshold_amount.numeric' => 'El umbral de monto debe ser un número.',
            'approval_threshold_quantity.integer' => 'El umbral de cantidad debe ser un número entero.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if (!$user->isSuperAdmin()) {
            $this->merge([
                'company_id' => $user->company_id,
            ]);
        } else {
            if (!$this->has('company_id') || !$this->input('company_id')) {
                if ($user->company_id) {
                    $this->merge([
                        'company_id' => $user->company_id,
                    ]);
                }
            }
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            ]);
        }

        if ($this->has('requires_approval')) {
            $this->merge([
                'requires_approval' => filter_var($this->input('requires_approval'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
            ]);
        }

        if ($this->has('approval_threshold_amount') && ($this->input('approval_threshold_amount') === '' || $this->input('approval_threshold_amount') === null)) {
            $this->merge(['approval_threshold_amount' => null]);
        }

        if ($this->has('approval_threshold_quantity') && ($this->input('approval_threshold_quantity') === '' || $this->input('approval_threshold_quantity') === null)) {
            $this->merge(['approval_threshold_quantity' => null]);
        }
    }
}
