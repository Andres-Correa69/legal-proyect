<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Location;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener empresa Distribuidora del Norte (tiene 2 sucursales para pruebas)
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            return;
        }

        $mainBranch = Branch::where('company_id', $company->id)->where('is_main', true)->first();

        if (!$mainBranch) {
            return;
        }

        // Crear bodega principal
        $mainWarehouse = Warehouse::firstOrCreate(
            [
                'company_id' => $company->id,
                'code' => 'BOD-001',
            ],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'Bodega Principal',
                'address' => 'Calle 123 #45-67, Bogotá',
                'is_active' => true,
                'is_default' => true,
            ]
        );

        // Crear ubicaciones para la bodega principal
        $locations = [
            [
                'name' => 'Zona A',
                'code' => 'ZA',
                'type' => 'zone',
                'children' => [
                    ['name' => 'Pasillo A1', 'code' => 'ZA-A1', 'type' => 'aisle'],
                    ['name' => 'Pasillo A2', 'code' => 'ZA-A2', 'type' => 'aisle'],
                ],
            ],
            [
                'name' => 'Zona B',
                'code' => 'ZB',
                'type' => 'zone',
                'children' => [
                    ['name' => 'Pasillo B1', 'code' => 'ZB-B1', 'type' => 'aisle'],
                    ['name' => 'Pasillo B2', 'code' => 'ZB-B2', 'type' => 'aisle'],
                ],
            ],
            [
                'name' => 'Zona de Recepción',
                'code' => 'ZR',
                'type' => 'zone',
                'children' => [],
            ],
            [
                'name' => 'Zona de Despacho',
                'code' => 'ZD',
                'type' => 'zone',
                'children' => [],
            ],
        ];

        foreach ($locations as $locationData) {
            $parentLocation = Location::firstOrCreate(
                [
                    'warehouse_id' => $mainWarehouse->id,
                    'code' => $locationData['code'],
                ],
                [
                    'company_id' => $company->id,
                    'name' => $locationData['name'],
                    'type' => $locationData['type'],
                    'parent_id' => null,
                    'is_active' => true,
                ]
            );

            foreach ($locationData['children'] as $childData) {
                Location::firstOrCreate(
                    [
                        'warehouse_id' => $mainWarehouse->id,
                        'code' => $childData['code'],
                    ],
                    [
                        'company_id' => $company->id,
                        'name' => $childData['name'],
                        'type' => $childData['type'],
                        'parent_id' => $parentLocation->id,
                        'is_active' => true,
                    ]
                );
            }
        }

        // Crear bodega secundaria en la sede principal
        Warehouse::firstOrCreate(
            [
                'company_id' => $company->id,
                'code' => 'BOD-002',
            ],
            [
                'branch_id' => $mainBranch->id,
                'name' => 'Bodega Secundaria',
                'address' => 'Carrera 50 #100-20, Bogotá',
                'is_active' => true,
                'is_default' => false,
            ]
        );

        // Crear bodega en la sucursal Sur (para pruebas de transferencias entre sucursales)
        $secondaryBranch = Branch::where('company_id', $company->id)->where('is_main', false)->first();
        if ($secondaryBranch) {
            Warehouse::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'code' => 'BOD-SUR-001',
                ],
                [
                    'branch_id' => $secondaryBranch->id,
                    'name' => 'Bodega Sucursal Sur',
                    'address' => 'Calle 40 Sur #78-90, Bogotá',
                    'is_active' => true,
                    'is_default' => true,
                ]
            );
        }
    }
}
