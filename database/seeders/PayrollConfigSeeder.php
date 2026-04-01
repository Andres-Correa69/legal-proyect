<?php

namespace Database\Seeders;

use App\Models\PayrollConfig;
use Illuminate\Database\Seeder;

class PayrollConfigSeeder extends Seeder
{
    public function run(): void
    {
        $configs = [
            [
                'year' => 2024,
                'smmlv' => 1300000,
                'auxilio_transporte' => 162000,
                'smmlv_previous' => 1160000,
                'increase_percentage' => 12.07,
                'decree_number' => 'Decreto 2292 de 2023',
                'effective_date' => '2024-01-01',
            ],
            [
                'year' => 2025,
                'smmlv' => 1423500,
                'auxilio_transporte' => 200000,
                'smmlv_previous' => 1300000,
                'increase_percentage' => 9.54,
                'decree_number' => 'Decreto 2325 de 2024',
                'effective_date' => '2025-01-01',
            ],
            [
                'year' => 2026,
                'smmlv' => 1750905,
                'auxilio_transporte' => 249095,
                'smmlv_previous' => 1423500,
                'increase_percentage' => 23.0,
                'decree_number' => 'Decretos 1469 y 1470 de 2025',
                'effective_date' => '2026-01-01',
            ],
        ];

        foreach ($configs as $config) {
            PayrollConfig::firstOrCreate(
                ['year' => $config['year']],
                $config
            );
        }
    }
}
