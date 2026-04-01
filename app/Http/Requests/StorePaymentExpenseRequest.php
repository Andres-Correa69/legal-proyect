<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->hasPermission('payments.create-expense');
    }

    public function rules(): array
    {
        return [
            'purchase_id' => ['required', 'exists:inventory_purchases,id'],
            'cash_register_id' => ['required', 'exists:cash_registers,id'],
            'payment_method_id' => ['required', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'installments' => ['nullable', 'array'],
            'installments.*.amount' => ['required_with:installments', 'numeric', 'min:0.01'],
            'installments.*.payment_date' => ['required_with:installments', 'date'],
            'installments.*.due_date' => ['nullable', 'date'],
            'installments.*.status' => ['nullable', 'in:paid,pending,overdue'],
            'installments.*.notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'purchase_id.required' => 'La compra es obligatoria.',
            'cash_register_id.required' => 'La caja es obligatoria.',
            'payment_method_id.required' => 'El método de pago es obligatorio.',
            'amount.required' => 'El monto es obligatorio.',
            'amount.numeric' => 'El monto debe ser un número.',
            'amount.min' => 'El monto debe ser mayor a cero.',
        ];
    }
}
