<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdjustmentReasonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('inventory.adjustments.manage')) {
            return false;
        }

        $reason = $this->route('adjustmentReason');
        return $user->company_id === $reason->company_id;
    }

    public function rules(): array
    {
        $reason = $this->route('adjustmentReason');
        $companyId = $reason->company_id;

        return [
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('adjustment_reasons', 'code')
                    ->where(function ($query) use ($companyId) {
                        return $query->where('company_id', $companyId);
                    })
                    ->ignore($reason->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'requires_approval' => ['boolean'],
            'approval_threshold_amount' => ['nullable', 'numeric', 'min:0'],
            'approval_threshold_quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Ya existe un motivo con este código en tu empresa.',
            'name.required' => 'El nombre es obligatorio.',
        ];
    }

    protected function prepareForValidation(): void
    {
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
