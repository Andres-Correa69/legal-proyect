<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OpenCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('cash-registers.open');
    }

    public function rules(): array
    {
        return [
            'opening_balance' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'opening_balance.required' => 'El saldo inicial es obligatorio.',
            'opening_balance.numeric' => 'El saldo inicial debe ser un número.',
            'opening_balance.min' => 'El saldo inicial no puede ser negativo.',
        ];
    }
}
