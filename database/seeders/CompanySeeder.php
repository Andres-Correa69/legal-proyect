<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        // Obtener roles
        $superAdminRole = Role::where('slug', 'super-admin')->first();
        $adminRole = Role::where('slug', 'admin')->first();
        $cashierRole = Role::where('slug', 'cashier')->first();
        $warehouseRole = Role::where('slug', 'warehouse')->first();
        $clientRole = Role::where('slug', 'client')->first();

        // ==========================================
        // EMPRESA 1: Grupo CP (Empresa principal - proveedor del software)
        // ==========================================
        $grupoCP = Company::firstOrCreate(
            ['slug' => 'grupo-cp'],
            [
                'name' => 'Grupo CP',
                'email' => 'contacto@grupocp.com',
                'phone' => '+57 300 123 4567',
                'address' => 'Calle Principal #100, Centro Empresarial',
                'tax_id' => '900100200-1',
                'is_active' => true,
                'settings' => [
                    'currency' => 'COP',
                    'timezone' => 'America/Bogota',
                    'date_format' => 'd/m/Y',
                ],
            ]
        );

        $grupoCPMainBranch = Branch::firstOrCreate(
            ['slug' => 'grupo-cp-principal', 'company_id' => $grupoCP->id],
            [
                'name' => 'Sede Principal',
                'code' => 'GCP-001',
                'email' => 'principal@grupocp.com',
                'phone' => '+57 300 123 4567',
                'address' => 'Calle Principal #100',
                'city' => 'Bogotá',
                'state' => 'Cundinamarca',
                'country' => 'Colombia',
                'postal_code' => '110111',
                'is_active' => true,
                'is_main' => true,
            ]
        );

        // Super Admin (sin empresa específica)
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@grupocp.com'],
            [
                'name' => 'Super Administrador',
                'password' => Hash::make('password'),
                'company_id' => null,
                'branch_id' => null,
                'is_active' => true,
                'document_id' => '1234567890',
                'phone' => '+57 300 111 2222',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ]
        );
        if ($superAdminRole) {
            $superAdmin->roles()->syncWithoutDetaching([$superAdminRole->id]);
        }

        // ==========================================
        // EMPRESA 2: Distribuidora del Norte
        // ==========================================
        $distribuidora = Company::firstOrCreate(
            ['slug' => 'distribuidora-norte'],
            [
                'name' => 'Distribuidora del Norte',
                'email' => 'info@distribuidoranorte.com',
                'phone' => '+57 310 555 1234',
                'address' => 'Av. Norte #45-67, Zona Industrial',
                'tax_id' => '800987654-3',
                'is_active' => true,
                'settings' => [
                    'currency' => 'COP',
                    'timezone' => 'America/Bogota',
                    'date_format' => 'd/m/Y',
                ],
            ]
        );

        $distMainBranch = Branch::firstOrCreate(
            ['slug' => 'dist-norte-principal', 'company_id' => $distribuidora->id],
            [
                'name' => 'Sede Principal',
                'code' => 'DN-001',
                'email' => 'principal@distribuidoranorte.com',
                'phone' => '+57 310 555 1234',
                'address' => 'Av. Norte #45-67',
                'city' => 'Bogotá',
                'state' => 'Cundinamarca',
                'country' => 'Colombia',
                'postal_code' => '110211',
                'is_active' => true,
                'is_main' => true,
            ]
        );

        $distSurBranch = Branch::firstOrCreate(
            ['slug' => 'dist-norte-sur', 'company_id' => $distribuidora->id],
            [
                'name' => 'Sucursal Sur',
                'code' => 'DN-002',
                'email' => 'sur@distribuidoranorte.com',
                'phone' => '+57 310 555 5678',
                'address' => 'Calle 40 Sur #78-90',
                'city' => 'Bogotá',
                'state' => 'Cundinamarca',
                'country' => 'Colombia',
                'postal_code' => '110411',
                'is_active' => true,
                'is_main' => false,
            ]
        );

        // Admin de Distribuidora
        $adminDist = User::firstOrCreate(
            ['email' => 'admin@distribuidoranorte.com'],
            [
                'name' => 'Carlos Rodríguez',
                'password' => Hash::make('password'),
                'company_id' => $distribuidora->id,
                'branch_id' => $distMainBranch->id,
                'is_active' => true,
                'document_id' => '52345678',
                'phone' => '+57 310 555 1234',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ]
        );
        if ($adminRole) {
            $adminDist->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        // Cajero de Distribuidora
        $cajero1 = User::firstOrCreate(
            ['email' => 'cajero@distribuidoranorte.com'],
            [
                'name' => 'María García',
                'password' => Hash::make('password'),
                'company_id' => $distribuidora->id,
                'branch_id' => $distMainBranch->id,
                'is_active' => true,
                'document_id' => '53456789',
                'phone' => '+57 311 222 3333',
            ]
        );
        if ($cashierRole) {
            $cajero1->roles()->syncWithoutDetaching([$cashierRole->id]);
        }

        // Bodeguero de Distribuidora
        $bodeguero1 = User::firstOrCreate(
            ['email' => 'bodega@distribuidoranorte.com'],
            [
                'name' => 'Pedro Martínez',
                'password' => Hash::make('password'),
                'company_id' => $distribuidora->id,
                'branch_id' => $distMainBranch->id,
                'is_active' => true,
                'document_id' => '54567890',
                'phone' => '+57 312 333 4444',
            ]
        );
        if ($warehouseRole) {
            $bodeguero1->roles()->syncWithoutDetaching([$warehouseRole->id]);
        }

        // Clientes de Distribuidora del Norte
        $this->createClients($distribuidora, $distMainBranch, $clientRole, [
            [
                'name' => 'JUAN PABLO RAMÍREZ CASTRO',
                'email' => 'juan.ramirez@email.com',
                'document_type' => 'CC',
                'document_id' => '52678901',
                'phone' => '3101234567',
                'address' => 'Calle 72 #10-45, Chapinero',
                'birth_date' => '1985-03-15',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'ANDREA MILENA TORRES GÓMEZ',
                'email' => 'andrea.torres@email.com',
                'document_type' => 'CC',
                'document_id' => '52789012',
                'phone' => '3159876543',
                'address' => 'Av. Suba #115-30, Apto 201',
                'birth_date' => '1990-07-22',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'DISTRIBUCIONES LÓPEZ Y CIA LTDA',
                'email' => 'contacto@distlopez.com',
                'document_type' => 'NIT',
                'document_id' => '800123456-7',
                'phone' => '3047654321',
                'address' => 'Zona Industrial Calle 13 #68-90',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'ROBERTO CARLOS MENDOZA SILVA',
                'email' => 'roberto.mendoza@email.com',
                'document_type' => 'CC',
                'document_id' => '79890123',
                'phone' => '3208765432',
                'address' => 'Cra 30 #45-67, Teusaquillo',
                'birth_date' => '1978-11-05',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'CAROLINA GUTIÉRREZ PEÑA',
                'email' => 'carolina.gutierrez@email.com',
                'document_type' => 'CE',
                'document_id' => 'E-987654',
                'phone' => '3175432109',
                'address' => 'Calle 85 #15-30, Oficina 502',
                'birth_date' => '1995-01-28',
                'is_active' => false,
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
        ]);

        // ==========================================
        // EMPRESA 3: Comercializadora Express
        // ==========================================
        $comercializadora = Company::firstOrCreate(
            ['slug' => 'comercializadora-express'],
            [
                'name' => 'Comercializadora Express',
                'email' => 'contacto@comercializadoraexpress.com',
                'phone' => '+57 320 999 8888',
                'address' => 'Carrera 7 #123-45',
                'tax_id' => '800555444-2',
                'is_active' => true,
                'settings' => [
                    'currency' => 'COP',
                    'timezone' => 'America/Bogota',
                    'date_format' => 'd/m/Y',
                ],
            ]
        );

        $comMainBranch = Branch::firstOrCreate(
            ['slug' => 'comercializadora-principal', 'company_id' => $comercializadora->id],
            [
                'name' => 'Sede Medellín',
                'code' => 'CE-001',
                'email' => 'medellin@comercializadoraexpress.com',
                'phone' => '+57 320 999 8888',
                'address' => 'Carrera 7 #123-45',
                'city' => 'Medellín',
                'state' => 'Antioquia',
                'country' => 'Colombia',
                'postal_code' => '050001',
                'is_active' => true,
                'is_main' => true,
            ]
        );

        // Admin de Comercializadora
        $adminCom = User::firstOrCreate(
            ['email' => 'admin@comercializadoraexpress.com'],
            [
                'name' => 'Andrés López',
                'password' => Hash::make('password'),
                'company_id' => $comercializadora->id,
                'branch_id' => $comMainBranch->id,
                'is_active' => true,
                'document_id' => '71234567',
                'phone' => '+57 320 999 8888',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'ANT',
                'state_name' => 'Antioquia',
                'city_name' => 'Medellín',
            ]
        );
        if ($adminRole) {
            $adminCom->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        // Clientes de Comercializadora
        $this->createClients($comercializadora, $comMainBranch, $clientRole, [
            [
                'name' => 'CAMILA RESTREPO VILLA',
                'email' => 'camila.restrepo@email.com',
                'document_type' => 'CC',
                'document_id' => '1102345678',
                'phone' => '3214567890',
                'address' => 'Carrera 43A #7-50, El Poblado',
                'birth_date' => '1992-06-18',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'ANT',
                'state_name' => 'Antioquia',
                'city_name' => 'Medellín',
            ],
            [
                'name' => 'FELIPE MEJÍA ARANGO',
                'email' => 'felipe.mejia@email.com',
                'document_type' => 'CE',
                'document_id' => 'E-456789',
                'phone' => '3009876543',
                'address' => 'Calle 10 #32-15, Barrio Laureles',
                'birth_date' => '1988-09-12',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'ANT',
                'state_name' => 'Antioquia',
                'city_name' => 'Medellín',
            ],
            [
                'name' => 'VALENTINA OCHOA BEDOYA',
                'email' => 'valentina.ochoa@email.com',
                'document_type' => 'CC',
                'document_id' => '1102345680',
                'phone' => '3178901234',
                'address' => 'Calle 52 #70-20, Estadio',
                'birth_date' => '1997-12-03',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'ANT',
                'state_name' => 'Antioquia',
                'city_name' => 'Envigado',
            ],
            [
                'name' => 'COMERCIAL ANTIOQUEÑA LTDA',
                'email' => 'info@comercilantioquena.com',
                'document_type' => 'NIT',
                'document_id' => '811234567-9',
                'phone' => '3046781234',
                'address' => 'Cra 65 #48A-32, Guayabal',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'ANT',
                'state_name' => 'Antioquia',
                'city_name' => 'Medellín',
            ],
        ]);

        // ==========================================
        // EMPRESA 4: Inversiones del Valle (franquicia de Distribuidora)
        // ==========================================
        $inversionesValle = Company::firstOrCreate(
            ['slug' => 'inversiones-valle'],
            [
                'name' => 'Inversiones del Valle',
                'email' => 'info@inversionesvalle.com',
                'phone' => '+57 315 777 6666',
                'address' => 'Av. 6ta Norte #25-30',
                'tax_id' => '800111222-5',
                'parent_id' => $distribuidora->id, // Es franquicia de Distribuidora
                'is_active' => true,
                'settings' => [
                    'currency' => 'COP',
                    'timezone' => 'America/Bogota',
                    'date_format' => 'd/m/Y',
                ],
            ]
        );

        $invMainBranch = Branch::firstOrCreate(
            ['slug' => 'inversiones-valle-cali', 'company_id' => $inversionesValle->id],
            [
                'name' => 'Sede Cali Centro',
                'code' => 'IV-001',
                'email' => 'cali@inversionesvalle.com',
                'phone' => '+57 315 777 6666',
                'address' => 'Av. 6ta Norte #25-30',
                'city' => 'Cali',
                'state' => 'Valle del Cauca',
                'country' => 'Colombia',
                'postal_code' => '760001',
                'is_active' => true,
                'is_main' => true,
            ]
        );

        // Admin de Inversiones del Valle
        $adminInv = User::firstOrCreate(
            ['email' => 'admin@inversionesvalle.com'],
            [
                'name' => 'Sandra Vargas',
                'password' => Hash::make('password'),
                'company_id' => $inversionesValle->id,
                'branch_id' => $invMainBranch->id,
                'is_active' => true,
                'document_id' => '66789012',
                'phone' => '+57 315 777 6666',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'VAC',
                'state_name' => 'Valle del Cauca',
                'city_name' => 'Cali',
            ]
        );
        if ($adminRole) {
            $adminInv->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        // Clientes de Inversiones del Valle
        $this->createClients($inversionesValle, $invMainBranch, $clientRole, [
            [
                'name' => 'MAURICIO CAICEDO VALENCIA',
                'email' => 'mauricio.caicedo@email.com',
                'document_type' => 'CC',
                'document_id' => '1603456789',
                'phone' => '3226789012',
                'address' => 'Av. 6ta Norte #25-30, San Fernando',
                'birth_date' => '1982-04-25',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'VAC',
                'state_name' => 'Valle del Cauca',
                'city_name' => 'Cali',
            ],
            [
                'name' => 'PAOLA NARVÁEZ MUÑOZ',
                'email' => 'paola.narvaez@email.com',
                'document_type' => 'CC',
                'document_id' => '1603456790',
                'phone' => '3158901234',
                'address' => 'Calle 5 #38-22, Barrio Granada',
                'birth_date' => '1993-08-14',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'VAC',
                'state_name' => 'Valle del Cauca',
                'city_name' => 'Cali',
            ],
            [
                'name' => 'CARLOS EDUARDO HURTADO',
                'email' => 'carlos.hurtado@email.com',
                'document_type' => 'PAS',
                'document_id' => 'AP1234567',
                'phone' => '3501234567',
                'address' => 'Cra 100 #11-60, Ciudad Jardín',
                'birth_date' => '1975-02-10',
                'is_active' => false,
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'VAC',
                'state_name' => 'Valle del Cauca',
                'city_name' => 'Palmira',
            ],
        ]);

        // ==========================================
        // EMPRESA 5: Tech Solutions (empresa de tecnología)
        // ==========================================
        $techSolutions = Company::firstOrCreate(
            ['slug' => 'tech-solutions'],
            [
                'name' => 'Tech Solutions S.A.S',
                'email' => 'info@techsolutions.co',
                'phone' => '+57 301 888 9999',
                'address' => 'Cra 15 #93-75, Edificio Empresarial',
                'tax_id' => '901234567-8',
                'is_active' => true,
                'settings' => [
                    'currency' => 'COP',
                    'timezone' => 'America/Bogota',
                    'date_format' => 'd/m/Y',
                ],
            ]
        );

        $techMainBranch = Branch::firstOrCreate(
            ['slug' => 'tech-solutions-principal', 'company_id' => $techSolutions->id],
            [
                'name' => 'Oficina Principal',
                'code' => 'TS-001',
                'email' => 'principal@techsolutions.co',
                'phone' => '+57 301 888 9999',
                'address' => 'Cra 15 #93-75',
                'city' => 'Bogotá',
                'state' => 'Cundinamarca',
                'country' => 'Colombia',
                'postal_code' => '110221',
                'is_active' => true,
                'is_main' => true,
            ]
        );

        // Admin de Tech Solutions
        $adminTech = User::firstOrCreate(
            ['email' => 'admin@techsolutions.co'],
            [
                'name' => 'Ricardo Mendoza',
                'password' => Hash::make('password'),
                'company_id' => $techSolutions->id,
                'branch_id' => $techMainBranch->id,
                'is_active' => true,
                'document_id' => '80123456',
                'phone' => '+57 301 888 9999',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ]
        );
        if ($adminRole) {
            $adminTech->roles()->syncWithoutDetaching([$adminRole->id]);
        }

        // Clientes de Tech Solutions
        $this->createClients($techSolutions, $techMainBranch, $clientRole, [
            [
                'name' => 'EMPRESA ABC LTDA',
                'email' => 'contacto@empresaabc.com',
                'document_type' => 'NIT',
                'document_id' => '900111222-1',
                'phone' => '3231112222',
                'address' => 'Cra 15 #88-12, Oficina 401',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'STARTUP XYZ S.A.S',
                'email' => 'info@startupxyz.co',
                'document_type' => 'NIT',
                'document_id' => '901222333-2',
                'phone' => '3232223333',
                'address' => 'Calle 93 #11A-28, Chicó',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'SANTIAGO HERRERA DÍAZ',
                'email' => 'santiago.herrera@email.com',
                'document_type' => 'CC',
                'document_id' => '80456789',
                'phone' => '3103334444',
                'address' => 'Calle 140 #10-25, Cedritos',
                'birth_date' => '1991-05-20',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'DIGITAL AGENCY COLOMBIA',
                'email' => 'hello@digitalagency.co',
                'document_type' => 'NIT',
                'document_id' => '900444555-4',
                'phone' => '3234445555',
                'address' => 'Av. El Dorado #69C-03, Torre C Piso 7',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
            [
                'name' => 'MARIANA CASTRO BELTRÁN',
                'email' => 'mariana.castro@email.com',
                'document_type' => 'TI',
                'document_id' => '1012345678',
                'phone' => '3185556666',
                'address' => 'Cra 7 #72-41, Apto 502',
                'birth_date' => '2005-10-08',
                'country_code' => 'CO',
                'country_name' => 'Colombia',
                'state_code' => 'DC',
                'state_name' => 'Bogotá D.C.',
                'city_name' => 'Bogotá',
            ],
        ]);

        $this->command->info('✅ Empresas, sucursales, usuarios y clientes creados exitosamente');
        $this->command->info('   - Grupo CP (proveedor): 1 sede, 1 super admin');
        $this->command->info('   - Distribuidora del Norte: 2 sedes, 3 empleados, 5 clientes');
        $this->command->info('   - Comercializadora Express: 1 sede, 1 admin, 4 clientes');
        $this->command->info('   - Inversiones del Valle (franquicia): 1 sede, 1 admin, 3 clientes');
        $this->command->info('   - Tech Solutions: 1 sede, 1 admin, 5 clientes');
    }

    /**
     * Crear clientes para una empresa
     */
    private function createClients(Company $company, Branch $branch, ?Role $clientRole, array $clients): void
    {
        foreach ($clients as $clientData) {
            $client = User::firstOrCreate(
                ['email' => $clientData['email']],
                [
                    'name' => $clientData['name'],
                    'password' => Hash::make('password'),
                    'company_id' => $company->id,
                    'branch_id' => $branch->id,
                    'is_active' => $clientData['is_active'] ?? true,
                    'document_id' => $clientData['document_id'],
                    'document_type' => $clientData['document_type'] ?? 'CC',
                    'phone' => $clientData['phone'] ?? null,
                    'address' => $clientData['address'] ?? null,
                    'birth_date' => $clientData['birth_date'] ?? null,
                    'country_code' => $clientData['country_code'] ?? null,
                    'country_name' => $clientData['country_name'] ?? null,
                    'state_code' => $clientData['state_code'] ?? null,
                    'state_name' => $clientData['state_name'] ?? null,
                    'city_name' => $clientData['city_name'] ?? null,
                ]
            );

            if ($clientRole) {
                $client->roles()->syncWithoutDetaching([$clientRole->id]);
            }
        }
    }
}
