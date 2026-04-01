<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class DefaultPaymentMethodsSeeder extends Seeder
{
    public function run(): void
    {
        $defaultMethods = [
            [
                'name' => 'Efectivo',
                'code' => 'CASH',
                'description' => 'Pago en efectivo',
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
                'name' => 'Tarjeta de Crédito',
                'code' => 'CREDIT_CARD',
                'description' => 'Pago con tarjeta de crédito',
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
                'name' => 'Nequi',
                'code' => 'NEQUI',
                'description' => 'Pago por Nequi',
                'type' => 'system',
                'is_active' => true,
            ],
            [
                'name' => 'Daviplata',
                'code' => 'DAVIPLATA',
                'description' => 'Pago por Daviplata',
                'type' => 'system',
                'is_active' => true,
            ],
            [
                'name' => 'PSE',
                'code' => 'PSE',
                'description' => 'Pago por PSE',
                'type' => 'system',
                'is_active' => true,
            ],
        ];

        // Obtener todas las empresas
        $companies = Company::all();

        foreach ($companies as $company) {
            foreach ($defaultMethods as $method) {
                PaymentMethod::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'name' => $method['name'],
                    ],
                    array_merge($method, ['company_id' => $company->id])
                );
            }
        }
    }
}
