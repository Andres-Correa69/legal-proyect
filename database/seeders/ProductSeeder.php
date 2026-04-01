<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Location;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            return;
        }

        // Obtener categorias
        $electronica = ProductCategory::where('company_id', $company->id)->where('slug', 'electronica')->first();
        $hogar = ProductCategory::where('company_id', $company->id)->where('slug', 'hogar')->first();
        $oficina = ProductCategory::where('company_id', $company->id)->where('slug', 'oficina')->first();
        $herramientas = ProductCategory::where('company_id', $company->id)->where('slug', 'herramientas')->first();
        $alimentos = ProductCategory::where('company_id', $company->id)->where('slug', 'alimentos')->first();
        $limpieza = ProductCategory::where('company_id', $company->id)->where('slug', 'limpieza')->first();

        // Obtener una ubicacion para asignar a algunos productos
        $location = Location::whereHas('warehouse', function ($q) use ($company) {
            $q->where('company_id', $company->id);
        })->first();

        // Obtener proveedores
        $suppliers = Supplier::where('company_id', $company->id)->get();
        $supplierElectronicaHogar = $suppliers->first(); // Primer proveedor para electronica/hogar
        $supplierOficina = $suppliers->skip(1)->first(); // Segundo proveedor para oficina
        $supplierHerramientas = $suppliers->skip(2)->first(); // Tercer proveedor para herramientas
        $supplierAlimentos = $suppliers->skip(3)->first(); // Cuarto proveedor para alimentos/limpieza

        $products = [
            // Electronica
            [
                'category_id' => $electronica?->id,
                'sku' => 'ELEC-001',
                'barcode' => '7701234567890',
                'name' => 'Audifonos Bluetooth Premium',
                'description' => 'Audifonos inalambricos con cancelacion de ruido activa',
                'brand' => 'TechSound',
                'purchase_price' => 85000,
                'sale_price' => 149900,
                'current_stock' => 50,
                'min_stock' => 10,
                'max_stock' => 100,
                'unit_of_measure' => 'unidad',
            ],
            [
                'category_id' => $electronica?->id,
                'sku' => 'ELEC-002',
                'barcode' => '7701234567891',
                'name' => 'Cargador Portatil 20000mAh',
                'description' => 'Power bank de alta capacidad con carga rapida',
                'brand' => 'PowerMax',
                'purchase_price' => 45000,
                'sale_price' => 79900,
                'current_stock' => 75,
                'min_stock' => 15,
                'max_stock' => 150,
                'unit_of_measure' => 'unidad',
            ],
            [
                'category_id' => $electronica?->id,
                'sku' => 'ELEC-003',
                'barcode' => '7701234567892',
                'name' => 'Cable USB-C 2 metros',
                'description' => 'Cable de carga y datos USB-C de alta velocidad',
                'brand' => 'ConnectPro',
                'purchase_price' => 8000,
                'sale_price' => 19900,
                'current_stock' => 200,
                'min_stock' => 30,
                'max_stock' => 300,
                'unit_of_measure' => 'unidad',
            ],
            // Hogar
            [
                'category_id' => $hogar?->id,
                'sku' => 'HOG-001',
                'barcode' => '7702234567890',
                'name' => 'Lampara LED de Escritorio',
                'description' => 'Lampara LED con 3 niveles de intensidad',
                'brand' => 'LuzBrillante',
                'purchase_price' => 35000,
                'sale_price' => 59900,
                'current_stock' => 30,
                'min_stock' => 5,
                'max_stock' => 50,
                'unit_of_measure' => 'unidad',
            ],
            [
                'category_id' => $hogar?->id,
                'sku' => 'HOG-002',
                'barcode' => '7702234567891',
                'name' => 'Organizador Multiusos',
                'description' => 'Organizador plastico con 6 compartimentos',
                'brand' => 'OrganizaMax',
                'purchase_price' => 12000,
                'sale_price' => 24900,
                'current_stock' => 45,
                'min_stock' => 10,
                'max_stock' => 80,
                'unit_of_measure' => 'unidad',
            ],
            // Oficina
            [
                'category_id' => $oficina?->id,
                'sku' => 'OFI-001',
                'barcode' => '7703234567890',
                'name' => 'Resma Papel Carta',
                'description' => 'Papel bond carta 75g x 500 hojas',
                'brand' => 'PapelPro',
                'purchase_price' => 12000,
                'sale_price' => 18900,
                'current_stock' => 100,
                'min_stock' => 20,
                'max_stock' => 200,
                'unit_of_measure' => 'resma',
            ],
            [
                'category_id' => $oficina?->id,
                'sku' => 'OFI-002',
                'barcode' => '7703234567891',
                'name' => 'Grapadora Metalica',
                'description' => 'Grapadora de escritorio para 25 hojas',
                'brand' => 'OficinaPro',
                'purchase_price' => 15000,
                'sale_price' => 29900,
                'current_stock' => 40,
                'min_stock' => 8,
                'max_stock' => 60,
                'unit_of_measure' => 'unidad',
            ],
            [
                'category_id' => $oficina?->id,
                'sku' => 'OFI-003',
                'barcode' => '7703234567892',
                'name' => 'Caja Lapices x12',
                'description' => 'Caja de 12 lapices HB #2',
                'brand' => 'EscribeBien',
                'purchase_price' => 5000,
                'sale_price' => 9900,
                'current_stock' => 150,
                'min_stock' => 25,
                'max_stock' => 250,
                'unit_of_measure' => 'caja',
            ],
            // Herramientas
            [
                'category_id' => $herramientas?->id,
                'sku' => 'HER-001',
                'barcode' => '7704234567890',
                'name' => 'Destornillador Juego x6',
                'description' => 'Set de 6 destornilladores punta plana y estrella',
                'brand' => 'ToolMaster',
                'purchase_price' => 18000,
                'sale_price' => 34900,
                'current_stock' => 35,
                'min_stock' => 8,
                'max_stock' => 60,
                'unit_of_measure' => 'juego',
            ],
            [
                'category_id' => $herramientas?->id,
                'sku' => 'HER-002',
                'barcode' => '7704234567891',
                'name' => 'Cinta Metrica 5m',
                'description' => 'Flexometro de 5 metros con freno automatico',
                'brand' => 'MedidaPro',
                'purchase_price' => 8000,
                'sale_price' => 16900,
                'current_stock' => 60,
                'min_stock' => 12,
                'max_stock' => 100,
                'unit_of_measure' => 'unidad',
            ],
            // Alimentos
            [
                'category_id' => $alimentos?->id,
                'sku' => 'ALI-001',
                'barcode' => '7705234567890',
                'name' => 'Cafe Premium 500g',
                'description' => 'Cafe molido tostado premium origen colombiano',
                'brand' => 'CafeDelicia',
                'purchase_price' => 18000,
                'sale_price' => 29900,
                'current_stock' => 80,
                'min_stock' => 15,
                'max_stock' => 120,
                'unit_of_measure' => 'bolsa',
            ],
            [
                'category_id' => $alimentos?->id,
                'sku' => 'ALI-002',
                'barcode' => '7705234567891',
                'name' => 'Galletas Surtido x24',
                'description' => 'Paquete surtido de galletas dulces',
                'brand' => 'Galleteria',
                'purchase_price' => 12000,
                'sale_price' => 19900,
                'current_stock' => 5, // Bajo stock para pruebas
                'min_stock' => 20,
                'max_stock' => 100,
                'unit_of_measure' => 'paquete',
            ],
            // Limpieza
            [
                'category_id' => $limpieza?->id,
                'sku' => 'LIM-001',
                'barcode' => '7706234567890',
                'name' => 'Desinfectante Multiusos 1L',
                'description' => 'Desinfectante antibacterial para superficies',
                'brand' => 'LimpiaTodo',
                'purchase_price' => 8000,
                'sale_price' => 14900,
                'current_stock' => 90,
                'min_stock' => 20,
                'max_stock' => 150,
                'unit_of_measure' => 'litro',
            ],
            [
                'category_id' => $limpieza?->id,
                'sku' => 'LIM-002',
                'barcode' => '7706234567891',
                'name' => 'Jabon Liquido 500ml',
                'description' => 'Jabon liquido para manos antibacterial',
                'brand' => 'ManosSanas',
                'purchase_price' => 6000,
                'sale_price' => 11900,
                'current_stock' => 3, // Bajo stock para pruebas
                'min_stock' => 15,
                'max_stock' => 80,
                'unit_of_measure' => 'botella',
            ],
            [
                'category_id' => $limpieza?->id,
                'sku' => 'LIM-003',
                'barcode' => '7706234567892',
                'name' => 'Escoba Industrial',
                'description' => 'Escoba de cerdas duras para uso industrial',
                'brand' => 'LimpiezaPro',
                'purchase_price' => 15000,
                'sale_price' => 27900,
                'current_stock' => 25,
                'min_stock' => 5,
                'max_stock' => 40,
                'unit_of_measure' => 'unidad',
            ],
        ];

        foreach ($products as $index => $productData) {
            // Asignar ubicacion a algunos productos (alternando)
            $locationId = ($index % 3 === 0 && $location) ? $location->id : null;

            // Asignar proveedor segun categoria
            $supplierId = null;
            $autoPurchase = false;
            if ($productData['category_id'] === $electronica?->id || $productData['category_id'] === $hogar?->id) {
                $supplierId = $supplierElectronicaHogar?->id;
                $autoPurchase = true; // Electronica y hogar con compra automatica
            } elseif ($productData['category_id'] === $oficina?->id) {
                $supplierId = $supplierOficina?->id;
                $autoPurchase = true;
            } elseif ($productData['category_id'] === $herramientas?->id) {
                $supplierId = $supplierHerramientas?->id;
            } elseif ($productData['category_id'] === $alimentos?->id || $productData['category_id'] === $limpieza?->id) {
                $supplierId = $supplierAlimentos?->id;
                $autoPurchase = true;
            }

            // Obtener area_id de la categoria asignada
            $areaId = null;
            if ($productData['category_id']) {
                $cat = ProductCategory::find($productData['category_id']);
                $areaId = $cat?->area_id;
            }

            Product::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'sku' => $productData['sku'],
                ],
                array_merge($productData, [
                    'company_id' => $company->id,
                    'area_id' => $areaId,
                    'location_id' => $locationId,
                    'supplier_id' => $supplierId,
                    'average_cost' => $productData['purchase_price'], // Costo promedio inicial = precio compra
                    'is_active' => true,
                    'is_trackable' => true,
                    'auto_purchase_enabled' => $autoPurchase,
                ])
            );
        }
    }
}
