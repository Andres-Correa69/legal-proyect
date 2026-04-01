<?php

namespace App\Http\Requests;

use App\Models\CashRegister;
use Illuminate\Foundation\Http\FormRequest;

class StoreCashRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('cash-registers.manage');
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:minor,major,bank'],
            'name' => ['required', 'string', 'max:255'],
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
            'type.required' => 'El tipo de caja es obligatorio.',
            'type.in' => 'El tipo de caja debe ser: menor, mayor o banco.',
            'name.required' => 'El nombre de la caja es obligatorio.',
            'bank_name.required_if' => 'El nombre del banco es obligatorio para cuentas bancarias.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->payment_method_id) {
                $branchId = $this->branch_id ?? $this->user()->branch_id;

                $existing = CashRegister::where('branch_id', $branchId)
                    ->where('payment_method_id', $this->payment_method_id)
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
        $user = $this->user();

        // Asignar company_id automáticamente
        if (!$user->isSuperAdmin()) {
            $this->merge(['company_id' => $user->company_id]);
        } else {
            if (!$this->has('company_id') || !$this->input('company_id')) {
                if ($user->company_id) {
                    $this->merge(['company_id' => $user->company_id]);
                }
            }
        }

        // Convertir is_active a booleano
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }

        // Status por defecto: closed
        if (!$this->has('status')) {
            $this->merge(['status' => 'closed']);
        }

        // Current balance por defecto: 0
        if (!$this->has('current_balance')) {
            $this->merge(['current_balance' => 0]);
        }
    }
}
