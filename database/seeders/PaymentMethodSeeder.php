<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use App\Models\Company;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Métodos de pago del sistema que se crean para cada empresa
     */
    public static array $systemPaymentMethods = [
        [
            'name' => 'Efectivo',
            'code' => 'CASH',
            'description' => 'Pago en efectivo',
            'type' => 'system',
            'is_active' => true,
        ],
        [
            'name' => 'Tarjeta de Crédito',
            'code' => 'CREDIT_CARD',
            'description' => 'Pago con tarjeta de crédito',
            'type' => 'system',
            'is_active' => true,
        ],
        [
            'name' => 'Tarjeta de Débito',
            'code' => 'DEBIT_CARD',
            'description' => 'Pago con tarjeta de débito',
            'type' => 'system',
            'is_active' => true,
        ],
        [
            'name' => 'Transferencia Bancaria',
            'code' => 'BANK_TRANSFER',
            'description' => 'Transferencia bancaria',
            'type' => 'system',
            'is_active' => true,
        ],
        [
            'name' => 'Cheque',
            'code' => 'CHECK',
            'description' => 'Pago con cheque',
            'type' => 'system',
            'is_active' => true,
        ],
    ];

    public function run(): void
    {
        // Crear métodos de pago del sistema para Distribuidora del Norte
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            $this->command->error('Empresa Distribuidora del Norte no encontrada');
            return;
        }

        foreach (self::$systemPaymentMethods as $methodData) {
            // Use name instead of code to find existing payment methods
            $paymentMethod = PaymentMethod::where('company_id', $company->id)
                ->where('name', $methodData['name'])
                ->first();

            if ($paymentMethod) {
                // Update existing payment method with code if it doesn't have one
                if (!$paymentMethod->code) {
                    $paymentMethod->update([
                        'code' => $methodData['code'],
                        'type' => 'system',
                    ]);
                }
            } else {
                // Create new payment method
                PaymentMethod::create(array_merge($methodData, ['company_id' => $company->id]));
            }
        }

        $this->command->info('Métodos de pago creados para: ' . $company->name);
    }
}
