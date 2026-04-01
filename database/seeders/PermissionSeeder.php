<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Permisos exclusivos de Super Admin que NO se pueden asignar a otros roles
     */
    public static array $superAdminOnlyPermissions = [
        'companies.view',
        'companies.manage',
        'branches.manage',
        'audit-logs.view',
        'external-api-logs.view',
        'sales-audit.view',
    ];

    public function run(): void
    {
        $permissions = [
            // Dashboard
            ['name' => 'Ver Dashboard', 'slug' => 'dashboard.view', 'group' => 'dashboard', 'description' => 'Ver el dashboard principal'],

            // Sales (Ventas)
            ['name' => 'Ver Ventas', 'slug' => 'sales.view', 'group' => 'sales', 'description' => 'Ver listado de ventas y facturas'],
            ['name' => 'Crear Ventas', 'slug' => 'sales.create', 'group' => 'sales', 'description' => 'Crear ventas, facturas y cotizaciones'],
            ['name' => 'Gestionar Ventas', 'slug' => 'sales.manage', 'group' => 'sales', 'description' => 'Editar, anular y gestionar ventas'],
            ['name' => 'Imprimir Factura Tirilla', 'slug' => 'sales.thermal-receipt', 'group' => 'sales', 'description' => 'Imprimir facturas en formato tirilla para impresoras termicas'],

            // Users
            ['name' => 'Ver Usuarios', 'slug' => 'users.view', 'group' => 'users', 'description' => 'Ver listado de usuarios'],
            ['name' => 'Gestionar Usuarios', 'slug' => 'users.manage', 'group' => 'users', 'description' => 'Crear, editar y eliminar usuarios'],
            ['name' => 'Ajuste Masivo de Salarios', 'slug' => 'users.bulk-salary', 'group' => 'users', 'description' => 'Actualizar salarios de multiples usuarios a la vez'],

            // Roles
            ['name' => 'Ver Roles', 'slug' => 'roles.view', 'group' => 'roles', 'description' => 'Ver listado de roles'],
            ['name' => 'Gestionar Roles', 'slug' => 'roles.manage', 'group' => 'roles', 'description' => 'Crear, editar y eliminar roles'],

            // Companies (Super Admin Only)
            ['name' => 'Ver Empresas', 'slug' => 'companies.view', 'group' => 'companies', 'description' => 'Ver listado de empresas', 'is_super_admin_only' => true],
            ['name' => 'Gestionar Empresas', 'slug' => 'companies.manage', 'group' => 'companies', 'description' => 'Crear, editar y eliminar empresas', 'is_super_admin_only' => true],

            // Branches (Gestionar es exclusivo de Super Admin)
            ['name' => 'Ver Sucursales', 'slug' => 'branches.view', 'group' => 'branches', 'description' => 'Ver listado de sucursales'],
            ['name' => 'Gestionar Sucursales', 'slug' => 'branches.manage', 'group' => 'branches', 'description' => 'Crear, editar y eliminar sucursales', 'is_super_admin_only' => true],
            ['name' => 'Cambiar Sede', 'slug' => 'branches.switch', 'group' => 'branches', 'description' => 'Cambiar la sede activa del usuario'],

            // Clients
            ['name' => 'Ver Clientes', 'slug' => 'clients.view', 'group' => 'clients', 'description' => 'Ver listado de clientes'],
            ['name' => 'Gestionar Clientes', 'slug' => 'clients.manage', 'group' => 'clients', 'description' => 'Crear, editar y eliminar clientes'],

            // Cash Registers
            ['name' => 'Ver Cajas', 'slug' => 'cash-registers.view', 'group' => 'cash-registers', 'description' => 'Ver listado de cajas'],
            ['name' => 'Gestionar Cajas', 'slug' => 'cash-registers.manage', 'group' => 'cash-registers', 'description' => 'Crear, editar y eliminar cajas'],
            ['name' => 'Abrir Cajas', 'slug' => 'cash-registers.open', 'group' => 'cash-registers', 'description' => 'Abrir sesiones de caja'],
            ['name' => 'Cerrar Cajas', 'slug' => 'cash-registers.close', 'group' => 'cash-registers', 'description' => 'Cerrar sesiones de caja'],

            // Cash Transfers
            ['name' => 'Ver Transferencias de Caja', 'slug' => 'cash-transfers.view', 'group' => 'cash-transfers', 'description' => 'Ver transferencias entre cajas'],
            ['name' => 'Crear Transferencias de Caja', 'slug' => 'cash-transfers.create', 'group' => 'cash-transfers', 'description' => 'Crear transferencias entre cajas'],
            ['name' => 'Cancelar Transferencias', 'slug' => 'cash-transfers.cancel', 'group' => 'cash-transfers', 'description' => 'Cancelar transferencias entre cajas'],

            // Payments
            ['name' => 'Ver Pagos', 'slug' => 'payments.view', 'group' => 'payments', 'description' => 'Ver listado de pagos'],
            ['name' => 'Crear Ingresos', 'slug' => 'payments.create-income', 'group' => 'payments', 'description' => 'Registrar ingresos'],
            ['name' => 'Crear Egresos', 'slug' => 'payments.create-expense', 'group' => 'payments', 'description' => 'Registrar egresos'],
            ['name' => 'Gestionar Pagos', 'slug' => 'payments.manage', 'group' => 'payments', 'description' => 'Cancelar y gestionar pagos'],

            // Payment Methods
            ['name' => 'Ver Metodos de Pago', 'slug' => 'payment-methods.view', 'group' => 'payment-methods', 'description' => 'Ver metodos de pago'],
            ['name' => 'Gestionar Metodos de Pago', 'slug' => 'payment-methods.manage', 'group' => 'payment-methods', 'description' => 'Crear, editar y eliminar metodos de pago'],

            // Cash Reports
            ['name' => 'Ver Reportes de Caja', 'slug' => 'cash-reports.view', 'group' => 'cash-reports', 'description' => 'Ver reportes de flujo de caja'],
            ['name' => 'Exportar Reportes de Caja', 'slug' => 'cash-reports.export', 'group' => 'cash-reports', 'description' => 'Exportar reportes de caja a Excel/PDF'],

            // Inventory General
            ['name' => 'Ver Inventario', 'slug' => 'inventory.view', 'group' => 'inventory', 'description' => 'Ver inventario general'],
            ['name' => 'Gestionar Inventario', 'slug' => 'inventory.manage', 'group' => 'inventory', 'description' => 'Gestionar inventario general'],

            // Products
            ['name' => 'Ver Productos', 'slug' => 'products.view', 'group' => 'products', 'description' => 'Ver listado de productos'],
            ['name' => 'Gestionar Productos', 'slug' => 'products.manage', 'group' => 'products', 'description' => 'Crear, editar y eliminar productos'],
            ['name' => 'Ajuste Masivo de Precios', 'slug' => 'products.bulk-price-adjust', 'group' => 'products', 'description' => 'Ajustar precios masivamente por marca, categoria, proveedor, etc.'],

            // Services
            ['name' => 'Ver Servicios', 'slug' => 'services.view', 'group' => 'services', 'description' => 'Ver listado de servicios'],
            ['name' => 'Gestionar Servicios', 'slug' => 'services.manage', 'group' => 'services', 'description' => 'Crear, editar y eliminar servicios'],

            // Price Lists
            ['name' => 'Ver Listas de Precios', 'slug' => 'price-lists.view', 'group' => 'price-lists', 'description' => 'Ver listas de precios de la empresa'],
            ['name' => 'Gestionar Listas de Precios', 'slug' => 'price-lists.manage', 'group' => 'price-lists', 'description' => 'Crear, editar y eliminar listas de precios'],

            // Product Categories
            ['name' => 'Ver Categorias', 'slug' => 'categories.view', 'group' => 'products', 'description' => 'Ver categorias de productos'],
            ['name' => 'Gestionar Categorias', 'slug' => 'categories.manage', 'group' => 'products', 'description' => 'Crear, editar y eliminar categorias'],

            // Product Areas
            ['name' => 'Ver Areas', 'slug' => 'areas.view', 'group' => 'products', 'description' => 'Ver areas de productos'],
            ['name' => 'Gestionar Areas', 'slug' => 'areas.manage', 'group' => 'products', 'description' => 'Crear, editar y eliminar areas'],

            // Warehouses
            ['name' => 'Ver Bodegas', 'slug' => 'warehouses.view', 'group' => 'warehouses', 'description' => 'Ver listado de bodegas'],
            ['name' => 'Gestionar Bodegas', 'slug' => 'warehouses.manage', 'group' => 'warehouses', 'description' => 'Crear, editar y eliminar bodegas'],

            // Locations
            ['name' => 'Ver Ubicaciones', 'slug' => 'locations.view', 'group' => 'warehouses', 'description' => 'Ver ubicaciones de bodegas'],
            ['name' => 'Gestionar Ubicaciones', 'slug' => 'locations.manage', 'group' => 'warehouses', 'description' => 'Crear, editar y eliminar ubicaciones'],

            // Suppliers
            ['name' => 'Ver Proveedores', 'slug' => 'suppliers.view', 'group' => 'suppliers', 'description' => 'Ver listado de proveedores'],
            ['name' => 'Gestionar Proveedores', 'slug' => 'suppliers.manage', 'group' => 'suppliers', 'description' => 'Crear, editar y eliminar proveedores'],

            // Inventory Purchases
            ['name' => 'Ver Compras', 'slug' => 'inventory.purchases.view', 'group' => 'inventory-purchases', 'description' => 'Ver ordenes de compra'],
            ['name' => 'Gestionar Compras', 'slug' => 'inventory.purchases.manage', 'group' => 'inventory-purchases', 'description' => 'Crear y editar ordenes de compra'],
            ['name' => 'Aprobar Compras', 'slug' => 'inventory.purchases.approve', 'group' => 'inventory-purchases', 'description' => 'Aprobar ordenes de compra'],
            ['name' => 'Recibir Compras', 'slug' => 'inventory.purchases.receive', 'group' => 'inventory-purchases', 'description' => 'Registrar recepcion de compras'],

            // Inventory Transfers
            ['name' => 'Ver Transferencias', 'slug' => 'inventory.transfers.view', 'group' => 'inventory-transfers', 'description' => 'Ver transferencias de inventario'],
            ['name' => 'Crear Transferencias', 'slug' => 'inventory.transfers.create', 'group' => 'inventory-transfers', 'description' => 'Crear solicitudes de transferencia'],
            ['name' => 'Aprobar Transferencias', 'slug' => 'inventory.transfers.approve', 'group' => 'inventory-transfers', 'description' => 'Aprobar transferencias de inventario'],
            ['name' => 'Completar Transferencias', 'slug' => 'inventory.transfers.complete', 'group' => 'inventory-transfers', 'description' => 'Marcar transferencias como completadas'],

            // Inventory Adjustments
            ['name' => 'Ver Ajustes', 'slug' => 'inventory.adjustments.view', 'group' => 'inventory-adjustments', 'description' => 'Ver ajustes de inventario'],
            ['name' => 'Crear Ajustes', 'slug' => 'inventory.adjustments.create', 'group' => 'inventory-adjustments', 'description' => 'Crear ajustes de inventario'],
            ['name' => 'Aprobar Ajustes', 'slug' => 'inventory.adjustments.approve', 'group' => 'inventory-adjustments', 'description' => 'Aprobar ajustes de inventario'],
            ['name' => 'Gestionar Motivos', 'slug' => 'inventory.adjustments.manage', 'group' => 'inventory-adjustments', 'description' => 'Gestionar motivos de ajuste'],

            // Inventory Movements
            ['name' => 'Ver Movimientos', 'slug' => 'inventory.movements.view', 'group' => 'inventory-movements', 'description' => 'Ver historial de movimientos'],

            // Inventory Reconciliations
            ['name' => 'Ver Conciliaciones', 'slug' => 'inventory.reconciliations.view', 'group' => 'inventory-reconciliations', 'description' => 'Ver conciliaciones de inventario'],
            ['name' => 'Crear Conciliaciones', 'slug' => 'inventory.reconciliations.create', 'group' => 'inventory-reconciliations', 'description' => 'Crear y gestionar conciliaciones de inventario'],
            ['name' => 'Contar Inventario', 'slug' => 'inventory.reconciliations.count', 'group' => 'inventory-reconciliations', 'description' => 'Realizar conteos fisicos de inventario'],
            ['name' => 'Aprobar Conciliaciones', 'slug' => 'inventory.reconciliations.approve', 'group' => 'inventory-reconciliations', 'description' => 'Aprobar y aplicar conciliaciones de inventario'],

            // Analytics
            ['name' => 'Ver Análisis', 'slug' => 'analytics.view', 'group' => 'analytics', 'description' => 'Ver dashboard de análisis del negocio'],
            ['name' => 'Exportar Análisis', 'slug' => 'analytics.export', 'group' => 'analytics', 'description' => 'Exportar análisis a PDF/Excel'],

            // Reports
            ['name' => 'Ver Reportes', 'slug' => 'reports.view', 'group' => 'reports', 'description' => 'Ver reportes del sistema'],
            ['name' => 'Exportar Reportes', 'slug' => 'reports.export', 'group' => 'reports', 'description' => 'Exportar reportes'],

            // Audit (Super Admin Only)
            ['name' => 'Ver Auditoria', 'slug' => 'audit-logs.view', 'group' => 'audit', 'description' => 'Ver logs de auditoria', 'is_super_admin_only' => true],
            ['name' => 'Ver Auditoria API Externa', 'slug' => 'external-api-logs.view', 'group' => 'audit', 'description' => 'Ver logs de auditoria de la API externa', 'is_super_admin_only' => true],
            ['name' => 'Ver Auditoria de Facturacion', 'slug' => 'sales-audit.view', 'group' => 'audit', 'description' => 'Ver auditoria de ventas y facturacion de todas las empresas', 'is_super_admin_only' => true],

            // Settings
            ['name' => 'Ver Configuracion', 'slug' => 'settings.view', 'group' => 'settings', 'description' => 'Ver configuracion del sistema'],
            ['name' => 'Gestionar Configuracion', 'slug' => 'settings.manage', 'group' => 'settings', 'description' => 'Modificar configuracion del sistema'],
            ['name' => 'Gestionar Tickets de Barcode', 'slug' => 'settings.barcode-ticket', 'group' => 'settings', 'description' => 'Configurar y generar tickets de codigo de barras/QR'],

            // Trash (Papelera de reciclaje)
            ['name' => 'Ver Papelera', 'slug' => 'trash.view', 'group' => 'trash', 'description' => 'Ver elementos eliminados en la papelera'],
            ['name' => 'Restaurar Papelera', 'slug' => 'trash.restore', 'group' => 'trash', 'description' => 'Restaurar elementos desde la papelera'],

            // Electronic Invoicing
            ['name' => 'Ver Facturacion Electronica', 'slug' => 'electronic-invoicing.view', 'group' => 'electronic-invoicing', 'description' => 'Ver seccion de facturacion electronica y enviar facturas'],
            ['name' => 'Gestionar Facturacion Electronica', 'slug' => 'electronic-invoicing.manage', 'group' => 'electronic-invoicing', 'description' => 'Registrar y actualizar datos de empresa en DIAN', 'is_hidden' => true],
            ['name' => 'Configurar Facturacion Electronica', 'slug' => 'electronic-invoicing.config', 'group' => 'electronic-invoicing', 'description' => 'Configurar resolucion y consecutivos de facturacion electronica', 'is_hidden' => true],

            // Accounting (Contabilidad)
            ['name' => 'Ver Contabilidad', 'slug' => 'accounting.view', 'group' => 'accounting', 'description' => 'Ver modulo de contabilidad'],
            ['name' => 'Gestionar Plan de Cuentas', 'slug' => 'accounting.manage', 'group' => 'accounting', 'description' => 'Crear, editar y eliminar cuentas contables'],
            ['name' => 'Crear Registros', 'slug' => 'accounting.entries.create', 'group' => 'accounting', 'description' => 'Crear registros contables manuales'],
            ['name' => 'Publicar Registros', 'slug' => 'accounting.entries.post', 'group' => 'accounting', 'description' => 'Publicar registros contables'],
            ['name' => 'Anular Registros', 'slug' => 'accounting.entries.void', 'group' => 'accounting', 'description' => 'Anular registros contables'],
            ['name' => 'Ver Reportes Contables', 'slug' => 'accounting.reports', 'group' => 'accounting', 'description' => 'Ver reportes contables'],
            ['name' => 'Gestionar Periodos', 'slug' => 'accounting.periods', 'group' => 'accounting', 'description' => 'Cerrar y reabrir periodos contables'],
            ['name' => 'Configurar Contabilidad', 'slug' => 'accounting.settings', 'group' => 'accounting', 'description' => 'Vincular cuentas contables a cajas, proveedores y tipos de venta'],

            // Third Parties (Terceros)
            ['name' => 'Ver Terceros', 'slug' => 'third-parties.view', 'group' => 'third-parties', 'description' => 'Ver listado de terceros en contabilidad'],
            ['name' => 'Gestionar Terceros', 'slug' => 'third-parties.manage', 'group' => 'third-parties', 'description' => 'Crear, editar y eliminar terceros'],

            // Alerts (Alertas configurables)
            ['name' => 'Ver Alertas', 'slug' => 'alerts.view', 'group' => 'alerts', 'description' => 'Ver reglas de alerta y su historial'],
            ['name' => 'Gestionar Alertas', 'slug' => 'alerts.manage', 'group' => 'alerts', 'description' => 'Crear, editar, eliminar y probar reglas de alerta'],

            // Bulk Import (Importación Masiva)
            ['name' => 'Importar Clientes', 'slug' => 'clients.import', 'group' => 'clients', 'description' => 'Importar clientes masivamente desde archivo Excel'],
            ['name' => 'Importar Proveedores', 'slug' => 'suppliers.import', 'group' => 'suppliers', 'description' => 'Importar proveedores masivamente desde archivo Excel'],
            ['name' => 'Importar Productos', 'slug' => 'products.import', 'group' => 'products', 'description' => 'Importar productos masivamente desde archivo Excel'],
            ['name' => 'Importar Servicios', 'slug' => 'services.import', 'group' => 'services', 'description' => 'Importar servicios masivamente desde archivo Excel'],

            // Appointments (Calendario)
            ['name' => 'Ver Calendario', 'slug' => 'appointments.view', 'group' => 'appointments', 'description' => 'Ver calendario y citas'],
            ['name' => 'Crear Citas', 'slug' => 'appointments.create', 'group' => 'appointments', 'description' => 'Crear citas y recordatorios'],
            ['name' => 'Gestionar Citas', 'slug' => 'appointments.manage', 'group' => 'appointments', 'description' => 'Editar, cancelar y eliminar citas'],
            ['name' => 'Google Calendar', 'slug' => 'appointments.google_calendar', 'group' => 'appointments', 'description' => 'Conectar y gestionar Google Calendar'],

            // Chat (Chat interno)
            ['name' => 'Ver Chat', 'slug' => 'chat.view', 'group' => 'chat', 'description' => 'Ver y acceder al chat interno de la empresa'],
            ['name' => 'Enviar Mensajes', 'slug' => 'chat.send', 'group' => 'chat', 'description' => 'Enviar mensajes en el chat interno'],

            // Soporte (Chat de soporte con administradores)
            ['name' => 'Ver Soporte', 'slug' => 'support.view', 'group' => 'support', 'description' => 'Ver y acceder al chat de soporte'],
            ['name' => 'Enviar Soporte', 'slug' => 'support.send', 'group' => 'support', 'description' => 'Enviar mensajes en el chat de soporte'],

            // Ordenes de Servicio (Superpoder)
            ['name' => 'Ver Ordenes de Servicio', 'slug' => 'service-orders.view', 'group' => 'service-orders', 'description' => 'Ver listado de ordenes de servicio'],
            ['name' => 'Crear Ordenes de Servicio', 'slug' => 'service-orders.create', 'group' => 'service-orders', 'description' => 'Crear nuevas ordenes de servicio'],
            ['name' => 'Gestionar Ordenes de Servicio', 'slug' => 'service-orders.manage', 'group' => 'service-orders', 'description' => 'Editar, asignar y cambiar estado de ordenes'],
            ['name' => 'Completar Ordenes', 'slug' => 'service-orders.complete', 'group' => 'service-orders', 'description' => 'Marcar ordenes como completadas'],
            ['name' => 'Facturar Ordenes', 'slug' => 'service-orders.invoice', 'group' => 'service-orders', 'description' => 'Convertir orden completada en factura'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['slug' => $permission['slug']],
                $permission
            );
        }
    }
}
