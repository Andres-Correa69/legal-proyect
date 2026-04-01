<?php

namespace App\Http\Requests;

use App\Models\CashRegister;
use Illuminate\Foundation\Http\FormRequest;

class UpdateCashRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        if (!$user->hasPermission('cash-registers.manage')) {
            return false;
        }

        $cashRegister = $this->route('cashRegister');
        return $user->company_id === $cashRegister->company_id;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', 'in:minor,major,bank'],
            'name' => ['sometimes', 'string', 'max:255'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'bank_name' => ['required_if:type,bank', 'nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_type' => ['nullable', 'string', 'max:50'],
            'payment_method_id' => ['nullable', 'exists:payment_methods,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in' => 'El tipo de caja debe ser: menor, mayor o banco.',
            'bank_name.required_if' => 'El nombre del banco es obligatorio para cuentas bancarias.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->has('payment_method_id') && $this->payment_method_id) {
                $cashRegister = $this->route('cashRegister');
                $branchId = $this->branch_id ?? $cashRegister->branch_id;

                $existing = CashRegister::where('branch_id', $branchId)
                    ->where('payment_method_id', $this->payment_method_id)
                    ->where('id', '!=', $cashRegister->id)
                    ->first();

                if ($existing) {
                    $validator->errors()->add(
                        'payment_method_id',
                        'Este método de pago ya está asignado a la caja "' . $existing->name . '" en esta sucursal.'
                    );
                }
            }
        });
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }
    }
}
