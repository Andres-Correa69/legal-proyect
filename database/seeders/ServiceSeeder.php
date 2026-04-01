<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        // Buscar Distribuidora del Norte (empresa de pruebas)
        $company = Company::where('slug', 'distribuidora-norte')->first();

        if (!$company) {
            $this->command->warn('Empresa Distribuidora del Norte no encontrada. Saltando ServiceSeeder.');
            return;
        }

        // Obtener la sucursal principal y el admin de la empresa
        $branch = Branch::where('company_id', $company->id)->where('is_main', true)->first();
        $adminUser = User::where('email', 'admin@distribuidoranorte.com')->first();

        $services = [
            // Consultoría
            [
                'name' => 'Asesoría General',
                'slug' => 'asesoria-general',
                'description' => 'Servicio de asesoría general para necesidades básicas del negocio.',
                'category' => 'consultoria',
                'price' => 80000,
                'base_price' => 100000,
                'estimated_duration' => 60,
                'unit' => 'hora',
            ],
            [
                'name' => 'Consultoría Especializada',
                'slug' => 'consultoria-especializada',
                'description' => 'Consultoría especializada con análisis profundo y recomendaciones detalladas.',
                'category' => 'consultoria',
                'price' => 150000,
                'base_price' => 180000,
                'estimated_duration' => 120,
                'unit' => 'sesion',
            ],
            [
                'name' => 'Auditoría de Procesos',
                'slug' => 'auditoria-procesos',
                'description' => 'Revisión completa de procesos con informe detallado de hallazgos.',
                'category' => 'consultoria',
                'price' => 500000,
                'base_price' => null,
                'estimated_duration' => 480,
                'unit' => 'proyecto',
            ],

            // Capacitación
            [
                'name' => 'Curso Básico',
                'slug' => 'curso-basico',
                'description' => 'Curso de formación básica en temas generales.',
                'category' => 'capacitacion',
                'price' => 120000,
                'base_price' => 150000,
                'estimated_duration' => 240,
                'unit' => 'sesion',
            ],
            [
                'name' => 'Taller Especializado',
                'slug' => 'taller-especializado',
                'description' => 'Taller práctico con ejercicios y casos de estudio.',
                'category' => 'capacitacion',
                'price' => 250000,
                'base_price' => 300000,
                'estimated_duration' => 480,
                'unit' => 'sesion',
            ],
            [
                'name' => 'Capacitación Grupal',
                'slug' => 'capacitacion-grupal',
                'description' => 'Capacitación para grupos de hasta 15 personas.',
                'category' => 'capacitacion',
                'price' => 450000,
                'base_price' => null,
                'estimated_duration' => 480,
                'unit' => 'dia',
            ],

            // Instalación
            [
                'name' => 'Instalación Básica',
                'slug' => 'instalacion-basica',
                'description' => 'Servicio de instalación básica con configuración estándar.',
                'category' => 'instalacion',
                'price' => 75000,
                'base_price' => 90000,
                'estimated_duration' => 60,
                'unit' => 'servicio',
            ],
            [
                'name' => 'Instalación Avanzada',
                'slug' => 'instalacion-avanzada',
                'description' => 'Instalación completa con configuración personalizada.',
                'category' => 'instalacion',
                'price' => 180000,
                'base_price' => 220000,
                'estimated_duration' => 180,
                'unit' => 'servicio',
            ],
            [
                'name' => 'Configuración de Sistema',
                'slug' => 'configuracion-sistema',
                'description' => 'Configuración y optimización de sistemas existentes.',
                'category' => 'instalacion',
                'price' => 100000,
                'base_price' => null,
                'estimated_duration' => 120,
                'unit' => 'hora',
            ],

            // Mantenimiento
            [
                'name' => 'Mantenimiento Preventivo',
                'slug' => 'mantenimiento-preventivo',
                'description' => 'Servicio de mantenimiento preventivo programado.',
                'category' => 'mantenimiento',
                'price' => 85000,
                'base_price' => 100000,
                'estimated_duration' => 90,
                'unit' => 'visita',
            ],
            [
                'name' => 'Mantenimiento Correctivo',
                'slug' => 'mantenimiento-correctivo',
                'description' => 'Servicio de reparación y corrección de fallas.',
                'category' => 'mantenimiento',
                'price' => 120000,
                'base_price' => null,
                'estimated_duration' => 120,
                'unit' => 'servicio',
            ],
            [
                'name' => 'Revisión General',
                'slug' => 'revision-general',
                'description' => 'Inspección completa con reporte de estado.',
                'category' => 'mantenimiento',
                'price' => 60000,
                'base_price' => 75000,
                'estimated_duration' => 60,
                'unit' => 'visita',
            ],

            // Soporte
            [
                'name' => 'Soporte Técnico',
                'slug' => 'soporte-tecnico',
                'description' => 'Asistencia técnica especializada.',
                'category' => 'soporte',
                'price' => 50000,
                'base_price' => 65000,
                'estimated_duration' => 30,
                'unit' => 'hora',
            ],
            [
                'name' => 'Soporte Remoto',
                'slug' => 'soporte-remoto',
                'description' => 'Asistencia remota para solución de problemas.',
                'category' => 'soporte',
                'price' => 35000,
                'base_price' => 45000,
                'estimated_duration' => 30,
                'unit' => 'hora',
            ],
            [
                'name' => 'Soporte en Sitio',
                'slug' => 'soporte-en-sitio',
                'description' => 'Visita técnica presencial para soporte.',
                'category' => 'soporte',
                'price' => 95000,
                'base_price' => 120000,
                'estimated_duration' => 60,
                'unit' => 'visita',
            ],

            // Diseño
            [
                'name' => 'Diseño Básico',
                'slug' => 'diseno-basico',
                'description' => 'Servicio de diseño con plantillas predefinidas.',
                'category' => 'diseno',
                'price' => 150000,
                'base_price' => 180000,
                'estimated_duration' => 240,
                'unit' => 'proyecto',
            ],
            [
                'name' => 'Diseño Personalizado',
                'slug' => 'diseno-personalizado',
                'description' => 'Diseño completamente personalizado según requerimientos.',
                'category' => 'diseno',
                'price' => 350000,
                'base_price' => 450000,
                'estimated_duration' => 480,
                'unit' => 'proyecto',
            ],
            [
                'name' => 'Rediseño',
                'slug' => 'rediseno',
                'description' => 'Actualización y mejora de diseños existentes.',
                'category' => 'diseno',
                'price' => 200000,
                'base_price' => null,
                'estimated_duration' => 360,
                'unit' => 'proyecto',
            ],
        ];

        foreach ($services as $serviceData) {
            Service::withoutGlobalScopes()->updateOrCreate(
                [
                    'company_id' => $company->id,
                    'slug' => $serviceData['slug'],
                ],
                array_merge($serviceData, [
                    'company_id' => $company->id,
                    'branch_id' => $branch?->id,
                    'is_active' => true,
                    'created_by_user_id' => $adminUser?->id,
                ])
            );
        }
    }
}
