<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin - Acceso total al sistema
        $superAdmin = Role::firstOrCreate(
            ['slug' => 'super-admin'],
            [
                'name' => 'Super Administrador',
                'description' => 'Acceso total al sistema, puede ver todas las empresas',
                'company_id' => null, // Rol del sistema
            ]
        );

        // Admin - Administrador de empresa
        $admin = Role::firstOrCreate(
            ['slug' => 'admin'],
            [
                'name' => 'Administrador',
                'description' => 'Administrador de la empresa con acceso completo a su empresa',
                'company_id' => null,
            ]
        );

        // Employee - Empleado general
        $employee = Role::firstOrCreate(
            ['slug' => 'employee'],
            [
                'name' => 'Empleado',
                'description' => 'Empleado con acceso limitado según permisos asignados',
                'company_id' => null,
            ]
        );

        // Cashier - Cajero
        $cashier = Role::firstOrCreate(
            ['slug' => 'cashier'],
            [
                'name' => 'Cajero',
                'description' => 'Cajero con acceso a cajas y pagos',
                'company_id' => null,
            ]
        );

        // Warehouse - Bodeguero
        $warehouse = Role::firstOrCreate(
            ['slug' => 'warehouse'],
            [
                'name' => 'Bodeguero',
                'description' => 'Encargado de bodega con acceso a inventario',
                'company_id' => null,
            ]
        );

        // Client - Cliente (sin permisos, solo para registro en la base de datos)
        $client = Role::firstOrCreate(
            ['slug' => 'client'],
            [
                'name' => 'Cliente',
                'description' => 'Cliente registrado en el sistema sin acceso a la aplicacion',
                'company_id' => null,
            ]
        );

        // Asignar todos los permisos al Super Admin
        $allPermissions = Permission::pluck('id')->toArray();
        $superAdmin->permissions()->sync($allPermissions);

        // Permisos para Admin (todos excepto permisos exclusivos de super admin)
        // Los permisos hidden (como electronic-invoicing.manage) SI se asignan al admin
        $adminPermissions = Permission::where(function ($query) {
            $query->whereNull('is_super_admin_only')
                  ->orWhere('is_super_admin_only', false);
        })->pluck('id')->toArray();
        $admin->permissions()->sync($adminPermissions);

        // Permisos para Empleado
        $employeePermissions = Permission::whereIn('slug', [
            'dashboard.view',
            'products.view',
            'categories.view',
            'warehouses.view',
            'locations.view',
            'suppliers.view',
            'inventory.view',
            'inventory.movements.view',
            'services.view',
            'support.view',
            'support.send',
            'branches.switch',
        ])->pluck('id')->toArray();
        $employee->permissions()->sync($employeePermissions);

        // Permisos para Cajero
        $cashierPermissions = Permission::whereIn('slug', [
            'dashboard.view',
            'sales.view',
            'sales.create',
            'cash-registers.view',
            'cash-registers.open',
            'cash-registers.close',
            'cash-transfers.view',
            'cash-transfers.create',
            'payments.view',
            'payments.create-income',
            'payments.create-expense',
            'payment-methods.view',
            'clients.view',
            'products.view',
            'cash-reports.view',
            'services.view',
            'support.view',
            'support.send',
            'branches.switch',
        ])->pluck('id')->toArray();
        $cashier->permissions()->sync($cashierPermissions);

        // Permisos para Bodeguero
        $warehousePermissions = Permission::whereIn('slug', [
            'dashboard.view',
            'inventory.view',
            'inventory.manage',
            'products.view',
            'products.manage',
            'categories.view',
            'warehouses.view',
            'locations.view',
            'locations.manage',
            'suppliers.view',
            'inventory.purchases.view',
            'inventory.purchases.manage',
            'inventory.purchases.receive',
            'inventory.transfers.view',
            'inventory.transfers.create',
            'inventory.transfers.complete',
            'inventory.adjustments.view',
            'inventory.adjustments.create',
            'inventory.adjustments.manage',
            'inventory.movements.view',
            'payments.view',
            'payments.create-expense',
            'payment-methods.view',
            'services.view',
            'services.manage',
            'support.view',
            'support.send',
            'products.import',
            'suppliers.import',
            'branches.switch',
        ])->pluck('id')->toArray();
        $warehouse->permissions()->sync($warehousePermissions);

        // Cliente sin permisos (solo registro en base de datos)
        $client->permissions()->sync([]);
    }
}
