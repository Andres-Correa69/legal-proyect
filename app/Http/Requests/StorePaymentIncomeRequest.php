<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentIncomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('payments.create-income');
    }

    public function rules(): array
    {
        return [
            'sale_id' => ['required', 'exists:sales,id'],
            'cash_register_id' => ['required', 'exists:cash_registers,id'],
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reference' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'sale_id.required' => 'La venta es obligatoria.',
            'sale_id.exists' => 'La venta seleccionada no existe.',
            'cash_register_id.required' => 'La caja es obligatoria.',
            'cash_register_id.exists' => 'La caja seleccionada no existe.',
            'payment_method_id.required' => 'El método de pago es obligatorio.',
            'payment_method_id.exists' => 'El método de pago seleccionado no existe.',
            'amount.required' => 'El monto es obligatorio.',
            'amount.numeric' => 'El monto debe ser un número.',
            'amount.min' => 'El monto debe ser mayor a cero.',
        ];
    }
}
