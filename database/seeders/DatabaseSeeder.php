<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            // 1. Permisos primero
            PermissionSeeder::class,

            // 2. Roles con sus permisos asignados
            RoleSeeder::class,

            // 3. Empresas, sucursales y usuarios de prueba
            CompanySeeder::class,

            // 4. Plan Unico de Cuentas (PUC) base colombiano por empresa
            PucSeeder::class,

            // 5. Metodos de pago por empresa
            DefaultPaymentMethodsSeeder::class,

            // 6. Bodegas y ubicaciones
            WarehouseSeeder::class,

            // 7. Motivos de ajuste de inventario
            AdjustmentReasonSeeder::class,

            // 8. Proveedores
            SupplierSeeder::class,

            // 9. Areas de productos
            ProductAreaSeeder::class,

            // 10. Categorias de productos (vinculadas a areas)
            ProductCategorySeeder::class,

            // 11. Productos de prueba
            ProductSeeder::class,

            // 12. Servicios de prueba
            ServiceSeeder::class,

            // 13. Datos de inventario de prueba (compras, transferencias, ajustes)
            InventorySeeder::class,
        ]);
    }
}
