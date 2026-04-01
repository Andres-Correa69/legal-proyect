<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('payment-methods.manage');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del método de pago es obligatorio.',
        ];
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

        // Tipo siempre es custom para creados por usuarios
        $this->merge(['type' => 'custom']);

        // Convertir is_active a booleano
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        } else {
            $this->merge(['is_active' => true]);
        }
    }
}
