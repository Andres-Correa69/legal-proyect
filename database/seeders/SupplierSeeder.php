<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            return;
        }

        $suppliers = [
            [
                'name' => 'Distribuidora Nacional S.A.',
                'contact_name' => 'Carlos Rodriguez',
                'email' => 'ventas@distribuidoranacional.com',
                'phone' => '601-555-1234',
                'address' => 'Calle 100 #15-45, Bogota',
                'tax_id' => '900123456-1',
                'is_active' => true,
            ],
            [
                'name' => 'Importaciones del Caribe',
                'contact_name' => 'Maria Fernandez',
                'email' => 'contacto@importcaribe.com',
                'phone' => '605-555-5678',
                'address' => 'Carrera 50 #70-30, Barranquilla',
                'tax_id' => '900234567-2',
                'is_active' => true,
            ],
            [
                'name' => 'Suministros Industriales Ltda',
                'contact_name' => 'Pedro Gomez',
                'email' => 'pedidos@suministrosindustriales.co',
                'phone' => '604-555-9012',
                'address' => 'Avenida Industrial #45-67, Medellin',
                'tax_id' => '900345678-3',
                'is_active' => true,
            ],
            [
                'name' => 'Comercializadora Andina',
                'contact_name' => 'Ana Martinez',
                'email' => 'info@comercializadoraandina.com',
                'phone' => '602-555-3456',
                'address' => 'Calle 5 #23-45, Cali',
                'tax_id' => '900456789-4',
                'is_active' => true,
            ],
        ];

        foreach ($suppliers as $supplierData) {
            Supplier::firstOrCreate(
                [
                    'company_id' => $company->id,
                    'tax_id' => $supplierData['tax_id'],
                ],
                array_merge($supplierData, ['company_id' => $company->id])
            );
        }
    }
}
