<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\ProductArea;
use App\Models\ProductCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            return;
        }

        // Obtener areas
        $tecnologia = ProductArea::where('company_id', $company->id)->where('slug', 'tecnologia')->first();
        $hogarLimpieza = ProductArea::where('company_id', $company->id)->where('slug', 'hogar-y-limpieza')->first();
        $oficina = ProductArea::where('company_id', $company->id)->where('slug', 'oficina-y-papeleria')->first();
        $ferreteria = ProductArea::where('company_id', $company->id)->where('slug', 'ferreteria')->first();
        $consumo = ProductArea::where('company_id', $company->id)->where('slug', 'consumo')->first();
        $modaDeportes = ProductArea::where('company_id', $company->id)->where('slug', 'moda-y-deportes')->first();

        $categories = [
            [
                'name' => 'Electronica',
                'description' => 'Productos electronicos y accesorios',
                'is_active' => true,
                'area_id' => $tecnologia?->id,
            ],
            [
                'name' => 'Hogar',
                'description' => 'Articulos para el hogar y decoracion',
                'is_active' => true,
                'area_id' => $hogarLimpieza?->id,
            ],
            [
                'name' => 'Oficina',
                'description' => 'Suministros y equipos de oficina',
                'is_active' => true,
                'area_id' => $oficina?->id,
            ],
            [
                'name' => 'Herramientas',
                'description' => 'Herramientas manuales y electricas',
                'is_active' => true,
                'area_id' => $ferreteria?->id,
            ],
            [
                'name' => 'Alimentos',
                'description' => 'Productos alimenticios y bebidas',
                'is_active' => true,
                'area_id' => $consumo?->id,
            ],
            [
                'name' => 'Limpieza',
                'description' => 'Productos de limpieza y aseo',
                'is_active' => true,
                'area_id' => $hogarLimpieza?->id,
            ],
            [
                'name' => 'Ropa y Accesorios',
                'description' => 'Prendas de vestir y accesorios',
                'is_active' => true,
                'area_id' => $modaDeportes?->id,
            ],
            [
                'name' => 'Deportes',
                'description' => 'Articulos deportivos y fitness',
                'is_active' => true,
                'area_id' => $modaDeportes?->id,
            ],
        ];

        foreach ($categories as $categoryData) {
            $slug = Str::slug($categoryData['name']);

            ProductCategory::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'slug' => $slug,
                ],
                array_merge($categoryData, [
                    'company_id' => $company->id,
                    'slug' => $slug,
                ])
            );
        }
    }
}
