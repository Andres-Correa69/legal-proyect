<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\ProductArea;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductAreaSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            return;
        }

        $areas = [
            [
                'name' => 'Tecnologia',
                'description' => 'Productos tecnologicos y electronicos',
                'is_active' => true,
            ],
            [
                'name' => 'Hogar y Limpieza',
                'description' => 'Articulos para el hogar, decoracion y limpieza',
                'is_active' => true,
            ],
            [
                'name' => 'Oficina y Papeleria',
                'description' => 'Suministros de oficina y papeleria',
                'is_active' => true,
            ],
            [
                'name' => 'Ferreteria',
                'description' => 'Herramientas y materiales de ferreteria',
                'is_active' => true,
            ],
            [
                'name' => 'Consumo',
                'description' => 'Alimentos, bebidas y productos de consumo',
                'is_active' => true,
            ],
            [
                'name' => 'Moda y Deportes',
                'description' => 'Ropa, accesorios y articulos deportivos',
                'is_active' => true,
            ],
        ];

        foreach ($areas as $areaData) {
            $slug = Str::slug($areaData['name']);

            ProductArea::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'slug' => $slug,
                ],
                array_merge($areaData, [
                    'company_id' => $company->id,
                    'slug' => $slug,
                ])
            );
        }
    }
}
