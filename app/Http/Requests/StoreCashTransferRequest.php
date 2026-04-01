<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('cash-transfers.create');
    }

    public function rules(): array
    {
        return [
            'source_cash_register_id' => ['required', 'exists:cash_registers,id'],
            'destination_cash_register_id' => ['required', 'exists:cash_registers,id', 'different:source_cash_register_id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'source_cash_register_id.required' => 'La caja de origen es obligatoria.',
            'destination_cash_register_id.required' => 'La caja de destino es obligatoria.',
            'destination_cash_register_id.different' => 'La caja de destino debe ser diferente a la de origen.',
            'amount.required' => 'El monto es obligatorio.',
            'amount.numeric' => 'El monto debe ser un número.',
            'amount.min' => 'El monto debe ser mayor a cero.',
        ];
    }
}
