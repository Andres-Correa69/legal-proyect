<?php

namespace Database\Seeders;

use App\Models\AccountingAccount;
use Illuminate\Database\Seeder;

class PucSeeder extends Seeder
{
    /**
     * Seeder con las cuentas PUC minimas necesarias para que los observers contables
     * funcionen correctamente (AccountingSaleObserver, AccountingPaymentObserver,
     * AccountingPurchaseObserver, AccountingCashTransferObserver).
     *
     * Para importar el PUC completo desde un Excel, usar:
     *   php artisan puc:import "PUC LIMPIO.xlsx"
     *
     * El comando de importacion preserva estas cuentas base y agrega las adicionales.
     */

    /**
     * Ejecuta el seeder para todas las empresas existentes
     */
    public function run(): void
    {
        $companyIds = \App\Models\Company::pluck('id');

        foreach ($companyIds as $companyId) {
            self::seedForCompany($companyId);
        }
    }

    /**
     * Crea el PUC base colombiano para una empresa especifica
     */
    public static function seedForCompany(int $companyId): void
    {
        $accounts = [
            // ===== NIVEL 1 - CLASES =====
            ['code' => '1', 'name' => 'Activo', 'type' => 'asset', 'nature' => 'debit', 'level' => 1, 'is_parent' => true],
            ['code' => '2', 'name' => 'Pasivo', 'type' => 'liability', 'nature' => 'credit', 'level' => 1, 'is_parent' => true],
            ['code' => '3', 'name' => 'Patrimonio', 'type' => 'equity', 'nature' => 'credit', 'level' => 1, 'is_parent' => true],
            ['code' => '4', 'name' => 'Ingresos', 'type' => 'revenue', 'nature' => 'credit', 'level' => 1, 'is_parent' => true],
            ['code' => '5', 'name' => 'Gastos', 'type' => 'expense', 'nature' => 'debit', 'level' => 1, 'is_parent' => true],
            ['code' => '6', 'name' => 'Costos de Venta', 'type' => 'cost', 'nature' => 'debit', 'level' => 1, 'is_parent' => true],

            // ===== NIVEL 2 - GRUPOS =====
            // Activo
            ['code' => '11', 'name' => 'Disponible', 'type' => 'asset', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '1'],
            ['code' => '13', 'name' => 'Deudores', 'type' => 'asset', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '1'],
            ['code' => '14', 'name' => 'Inventarios', 'type' => 'asset', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '1'],

            // Pasivo
            ['code' => '22', 'name' => 'Proveedores', 'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '2'],
            ['code' => '23', 'name' => 'Cuentas por Pagar', 'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '2'],
            ['code' => '24', 'name' => 'Impuestos, Gravamenes y Tasas', 'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '2'],

            // Patrimonio
            ['code' => '31', 'name' => 'Capital Social', 'type' => 'equity', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '3'],
            ['code' => '36', 'name' => 'Resultados del Ejercicio', 'type' => 'equity', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '3'],

            // Ingresos
            ['code' => '41', 'name' => 'Ingresos Operacionales', 'type' => 'revenue', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '4'],
            ['code' => '42', 'name' => 'Ingresos No Operacionales', 'type' => 'revenue', 'nature' => 'credit', 'level' => 2, 'is_parent' => true, 'parent_code' => '4'],

            // Gastos
            ['code' => '51', 'name' => 'Gastos Operacionales de Administracion', 'type' => 'expense', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '5'],
            ['code' => '52', 'name' => 'Gastos Operacionales de Ventas', 'type' => 'expense', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '5'],

            // Costos
            ['code' => '61', 'name' => 'Costo de Ventas', 'type' => 'cost', 'nature' => 'debit', 'level' => 2, 'is_parent' => true, 'parent_code' => '6'],

            // ===== NIVEL 3 - CUENTAS =====
            // Disponible
            ['code' => '1105', 'name' => 'Caja', 'type' => 'asset', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '11'],
            ['code' => '1110', 'name' => 'Bancos', 'type' => 'asset', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '11'],

            // Deudores
            ['code' => '1305', 'name' => 'Clientes', 'type' => 'asset', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '13'],

            // Inventarios
            ['code' => '1435', 'name' => 'Mercancias no Fabricadas por la Empresa', 'type' => 'asset', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '14'],

            // Proveedores
            ['code' => '2205', 'name' => 'Proveedores Nacionales', 'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '22'],

            // Cuentas por Pagar - Retenciones
            ['code' => '2365', 'name' => 'Retencion en la Fuente', 'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '23'],
            ['code' => '2367', 'name' => 'Impuesto a las Ventas Retenido (ReteIVA)', 'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '23'],
            ['code' => '2368', 'name' => 'Impuesto de Industria y Comercio Retenido (ReteICA)', 'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '23'],

            // Impuestos
            ['code' => '2408', 'name' => 'IVA por Pagar', 'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => true, 'parent_code' => '24'],

            // ===== NIVEL 4 - SUBCUENTAS (hojas para movimientos) =====
            // Caja
            ['code' => '110505', 'name' => 'Caja General', 'type' => 'asset', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '1105'],
            ['code' => '110510', 'name' => 'Cajas Menores', 'type' => 'asset', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '1105'],

            // Bancos
            ['code' => '111005', 'name' => 'Bancos Nacionales', 'type' => 'asset', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '1110'],

            // Clientes
            ['code' => '130505', 'name' => 'Clientes Nacionales', 'type' => 'asset', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '1305'],

            // IVA en Ventas (desglosado por tarifa)
            ['code' => '240801', 'name' => 'IVA Excluido en Ventas', 'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '2408'],
            ['code' => '240802', 'name' => 'IVA Exento en Ventas', 'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '2408'],
            ['code' => '240803', 'name' => 'IVA 5% en Ventas', 'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '2408'],
            ['code' => '240804', 'name' => 'IVA 19% en Ventas', 'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '2408'],
            // IVA en Compras
            ['code' => '240805', 'name' => 'IVA Descontable en Compras', 'type' => 'liability', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '2408'],

            // Ingresos Operacionales
            ['code' => '4135', 'name' => 'Comercio al por Mayor y Menor', 'type' => 'revenue', 'nature' => 'credit', 'level' => 3, 'is_parent' => true, 'parent_code' => '41'],
            ['code' => '413535', 'name' => 'Ventas al por Mayor', 'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '4135'],
            ['code' => '413536', 'name' => 'Ventas al por Menor', 'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '4135'],
            ['code' => '413537', 'name' => 'Ventas de Productos', 'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '4135'],

            // Ingresos por Servicios
            ['code' => '4155', 'name' => 'Ingresos por Servicios', 'type' => 'revenue', 'nature' => 'credit', 'level' => 3, 'is_parent' => true, 'parent_code' => '41'],
            ['code' => '415505', 'name' => 'Ventas de Servicios', 'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false, 'parent_code' => '4155'],

            // Devoluciones en ventas
            ['code' => '4175', 'name' => 'Devoluciones en Ventas', 'type' => 'revenue', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '41'],

            // Gastos de Administracion (clase 51)
            ['code' => '5105', 'name' => 'Gastos de Personal', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '51'],
            ['code' => '510506', 'name' => 'Sueldos', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510527', 'name' => 'Auxilio de Transporte', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510530', 'name' => 'Cesantias', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510536', 'name' => 'Prima de Servicios', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510539', 'name' => 'Vacaciones', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510568', 'name' => 'Aportes ARL', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510570', 'name' => 'Aportes a Fondos de Pensiones', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '510572', 'name' => 'Aportes Caja de Compensacion', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5105'],
            ['code' => '5110', 'name' => 'Honorarios', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5115', 'name' => 'Impuestos', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5120', 'name' => 'Arrendamientos', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5130', 'name' => 'Seguros', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5135', 'name' => 'Servicios', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '51'],
            ['code' => '513525', 'name' => 'Acueducto y Alcantarillado', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5135'],
            ['code' => '513530', 'name' => 'Energia Electrica', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5135'],
            ['code' => '513535', 'name' => 'Telefono e Internet', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5135'],
            ['code' => '513595', 'name' => 'Otros Servicios', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5135'],
            ['code' => '5145', 'name' => 'Mantenimiento y Reparaciones', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5160', 'name' => 'Depreciaciones', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '51'],
            ['code' => '5195', 'name' => 'Diversos', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => true, 'parent_code' => '51'],
            ['code' => '519530', 'name' => 'Utiles, Papeleria y Fotocopias', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5195'],
            ['code' => '519595', 'name' => 'Otros Gastos Diversos', 'type' => 'expense', 'nature' => 'debit', 'level' => 4, 'is_parent' => false, 'parent_code' => '5195'],

            // Gastos de Ventas (clase 52)
            ['code' => '5205', 'name' => 'Gastos de Personal de Ventas', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '52'],
            ['code' => '5220', 'name' => 'Arrendamientos de Ventas', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '52'],
            ['code' => '5235', 'name' => 'Servicios de Ventas', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '52'],
            ['code' => '5295', 'name' => 'Diversos de Ventas', 'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '52'],

            // Costos de Ventas
            ['code' => '6135', 'name' => 'Comercio al por Mayor y Menor', 'type' => 'cost', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '61'],

            // Capital
            ['code' => '3105', 'name' => 'Capital Suscrito y Pagado', 'type' => 'equity', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '31'],

            // Resultados
            ['code' => '3605', 'name' => 'Utilidad del Ejercicio', 'type' => 'equity', 'nature' => 'credit', 'level' => 3, 'is_parent' => false, 'parent_code' => '36'],
            ['code' => '3610', 'name' => 'Perdida del Ejercicio', 'type' => 'equity', 'nature' => 'debit', 'level' => 3, 'is_parent' => false, 'parent_code' => '36'],
        ];

        // Cache de codigos a IDs para resolver parent_id
        $codeToId = [];

        foreach ($accounts as $accountData) {
            $parentCode = $accountData['parent_code'] ?? null;
            unset($accountData['parent_code']);

            $accountData['company_id'] = $companyId;
            $accountData['parent_id'] = $parentCode ? ($codeToId[$parentCode] ?? null) : null;

            $account = AccountingAccount::firstOrCreate(
                ['company_id' => $companyId, 'code' => $accountData['code']],
                $accountData
            );

            $codeToId[$accountData['code']] = $account->id;
        }
    }
}
