<?php

namespace Database\Seeders;

use App\Models\AdjustmentReason;
use App\Models\Company;
use Illuminate\Database\Seeder;

class AdjustmentReasonSeeder extends Seeder
{
    public function run(): void
    {
        $defaultReasons = [
            [
                'code' => 'DAMAGE',
                'name' => 'Daño de mercancía',
                'description' => 'Producto dañado que no puede ser vendido',
                'requires_approval' => true,
                'approval_threshold_quantity' => 10,
                'approval_threshold_amount' => 500000,
                'is_active' => true,
            ],
            [
                'code' => 'LOSS',
                'name' => 'Pérdida',
                'description' => 'Producto perdido o extraviado',
                'requires_approval' => true,
                'approval_threshold_quantity' => 5,
                'approval_threshold_amount' => 200000,
                'is_active' => true,
            ],
            [
                'code' => 'THEFT',
                'name' => 'Robo',
                'description' => 'Producto robado',
                'requires_approval' => true,
                'approval_threshold_quantity' => 1,
                'approval_threshold_amount' => 50000,
                'is_active' => true,
            ],
            [
                'code' => 'EXPIRY',
                'name' => 'Vencimiento',
                'description' => 'Producto vencido o caducado',
                'requires_approval' => true,
                'approval_threshold_quantity' => 20,
                'approval_threshold_amount' => 300000,
                'is_active' => true,
            ],
            [
                'code' => 'COUNT_ERROR',
                'name' => 'Error de conteo',
                'description' => 'Diferencia detectada en inventario físico',
                'requires_approval' => false,
                'approval_threshold_quantity' => null,
                'approval_threshold_amount' => null,
                'is_active' => true,
            ],
            [
                'code' => 'INITIAL',
                'name' => 'Inventario inicial',
                'description' => 'Carga de inventario inicial del sistema',
                'requires_approval' => false,
                'approval_threshold_quantity' => null,
                'approval_threshold_amount' => null,
                'is_active' => true,
            ],
            [
                'code' => 'RETURN_SUPPLIER',
                'name' => 'Devolución a proveedor',
                'description' => 'Producto devuelto al proveedor',
                'requires_approval' => true,
                'approval_threshold_quantity' => 5,
                'approval_threshold_amount' => 100000,
                'is_active' => true,
            ],
            [
                'code' => 'DONATION',
                'name' => 'Donación',
                'description' => 'Producto donado',
                'requires_approval' => true,
                'approval_threshold_quantity' => 10,
                'approval_threshold_amount' => 200000,
                'is_active' => true,
            ],
            [
                'code' => 'INTERNAL_USE',
                'name' => 'Uso interno',
                'description' => 'Producto utilizado internamente en la empresa',
                'requires_approval' => false,
                'approval_threshold_quantity' => null,
                'approval_threshold_amount' => null,
                'is_active' => true,
            ],
            [
                'code' => 'OTHER',
                'name' => 'Otro',
                'description' => 'Otra razón de ajuste',
                'requires_approval' => true,
                'approval_threshold_quantity' => 1,
                'approval_threshold_amount' => 50000,
                'is_active' => true,
            ],
        ];

        // Obtener todas las empresas
        $companies = Company::all();

        foreach ($companies as $company) {
            foreach ($defaultReasons as $reason) {
                AdjustmentReason::firstOrCreate(
                    [
                        'company_id' => $company->id,
                        'code' => $reason['code'],
                    ],
                    array_merge($reason, ['company_id' => $company->id])
                );
            }
        }
    }
}
