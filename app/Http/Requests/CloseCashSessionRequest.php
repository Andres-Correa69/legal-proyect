<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CloseCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('cash-registers.close');
    }

    public function rules(): array
    {
        return [
            'closing_balance' => ['required', 'numeric', 'min:0'],
            'transfer_to_cash_register_id' => ['nullable', 'integer', 'exists:cash_registers,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'closing_balance.required' => 'El saldo de cierre es obligatorio.',
            'closing_balance.numeric' => 'El saldo de cierre debe ser un número.',
            'closing_balance.min' => 'El saldo de cierre no puede ser negativo.',
            'transfer_to_cash_register_id.exists' => 'La caja destino seleccionada no existe.',
        ];
    }
}
