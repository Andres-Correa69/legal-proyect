<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentFreeExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'concept'               => 'required|string|max:255',
            'accounting_account_id' => 'required|exists:accounting_accounts,id',
            'cash_register_id'      => 'required|exists:cash_registers,id',
            'payment_method_id'     => 'required|exists:payment_methods,id',
            'amount'                => 'required|numeric|min:0.01',
            'notes'                 => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'concept.required'               => 'El concepto es requerido.',
            'accounting_account_id.required' => 'Debes seleccionar una cuenta contable.',
            'accounting_account_id.exists'   => 'La cuenta contable seleccionada no existe.',
            'cash_register_id.required'      => 'Debes seleccionar una caja registradora.',
            'payment_method_id.required'     => 'Debes seleccionar un método de pago.',
            'amount.required'                => 'El monto es requerido.',
            'amount.numeric'                 => 'El monto debe ser un número.',
            'amount.min'                     => 'El monto debe ser mayor a 0.',
        ];
    }
}
