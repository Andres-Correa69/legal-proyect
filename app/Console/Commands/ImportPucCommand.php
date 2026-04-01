<?php

namespace App\Console\Commands;

use App\Models\AccountingAccount;
use App\Models\Company;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportPucCommand extends Command
{
    protected $signature = 'puc:import
        {file : Ruta al archivo Excel con el PUC}
        {--company= : ID de empresa especifica (si no se indica, importa para todas)}
        {--fresh : Eliminar TODAS las cuentas, asientos y configuracion contable antes de importar}
        {--dry-run : Simular sin insertar en la base de datos}';

    protected $description = 'Importa el Plan Unico de Cuentas (PUC) desde un archivo Excel';

    /**
     * Codigos de cuenta hoja usados por los observers contables (nuevos codigos PUC).
     */
    private const OBSERVER_LEAF_CODES = [
        '11050501', // Caja general (PaymentObserver fallback)
        '11051001', // Cajas menores
        '11100501', // Bancos moneda nacional
        '13050501', // Clientes nacionales (CxC)
        '14350101', // Mercancias no fabricadas (Inventario)
        '22050501', // Proveedores nacionales (CxP)
        '24080501', // IVA generado en ventas
        '24081001', // IVA descontable por compras 19%
        '41350101', // Comercio al por mayor y al detal (Ingresos)
        '61350501', // Costo de ventas comercio
        '23654001', // Retencion por compras 2,5% (Retefuente)
        '23670101', // IVA retenido 15% (ReteIVA)
        '23680501', // ReteICA 11,04
        '42950501', // Aprovechamientos (sobrante inventario)
        '52959505', // Gastos diversos POS (faltante/daño inventario)
    ];

    public function handle(): int
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            $this->error("Archivo no encontrado: {$filePath}");
            return Command::FAILURE;
        }

        $this->info('Leyendo archivo Excel...');

        try {
            $spreadsheet = IOFactory::load($filePath);
        } catch (\Exception $e) {
            $this->error("Error al leer el archivo: {$e->getMessage()}");
            return Command::FAILURE;
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        // Encontrar la fila de encabezado (buscar "Código" en columna A)
        $headerRow = null;
        foreach ($rows as $index => $row) {
            $val = trim($row['A'] ?? '');
            if (in_array(mb_strtolower($val), ['código', 'codigo'])) {
                $headerRow = $index;
                break;
            }
        }

        if (!$headerRow) {
            $this->error('No se encontro la fila de encabezado (columna "Código")');
            return Command::FAILURE;
        }

        // Parsear cuentas desde las filas de datos
        $accounts = $this->parseAccounts($rows, $headerRow);

        if (empty($accounts)) {
            $this->error('No se encontraron cuentas validas en el archivo');
            return Command::FAILURE;
        }

        $this->info("Cuentas encontradas: " . count($accounts));

        // Determinar is_parent basado en relaciones entre codigos
        $this->resolveParentFlags($accounts);

        // Ordenar: codigos cortos primero (padres antes que hijos)
        usort($accounts, function ($a, $b) {
            $lenDiff = strlen($a['code']) - strlen($b['code']);
            return $lenDiff !== 0 ? $lenDiff : strcmp($a['code'], $b['code']);
        });

        // Obtener empresas target
        $companyId = $this->option('company');
        $companies = $companyId
            ? Company::where('id', $companyId)->get()
            : Company::all();

        if ($companies->isEmpty()) {
            $this->error($companyId
                ? "Empresa con ID {$companyId} no encontrada"
                : 'No hay empresas en el sistema');
            return Command::FAILURE;
        }

        $dryRun = $this->option('dry-run');
        $fresh = $this->option('fresh');

        if ($dryRun) {
            $this->warn('--- MODO SIMULACION (dry-run) ---');
        }

        if ($fresh && !$dryRun) {
            if (!$this->confirm('Esto eliminara TODOS los datos contables (cuentas, asientos, periodos, configuraciones). Continuar?')) {
                $this->info('Operacion cancelada.');
                return Command::SUCCESS;
            }
        }

        foreach ($companies as $company) {
            if ($fresh && !$dryRun) {
                $this->cleanCompanyAccounting($company);
            }
            $this->importForCompany($company, $accounts, $dryRun);
        }

        return Command::SUCCESS;
    }

    private function cleanCompanyAccounting(Company $company): void
    {
        $this->warn("Limpiando datos contables de: {$company->name} (ID: {$company->id})...");

        DB::beginTransaction();
        try {
            $accountIds = AccountingAccount::withTrashed()
                ->where('company_id', $company->id)
                ->pluck('id');

            // 1. Eliminar lineas de asientos
            DB::table('journal_entry_lines')
                ->whereIn('accounting_account_id', $accountIds)
                ->delete();

            // 2. Eliminar asientos contables
            DB::table('journal_entries')
                ->where('company_id', $company->id)
                ->delete();

            // 3. Eliminar tablas pivot
            DB::table('accounting_account_cash_register')
                ->whereIn('accounting_account_id', $accountIds)
                ->delete();

            DB::table('accounting_account_supplier')
                ->whereIn('accounting_account_id', $accountIds)
                ->delete();

            DB::table('accounting_account_sale_type')
                ->where('company_id', $company->id)
                ->delete();

            // 4. Eliminar periodos contables
            DB::table('accounting_periods')
                ->where('company_id', $company->id)
                ->delete();

            // 5. Eliminar todas las cuentas (incluyendo soft-deleted)
            DB::table('accounting_accounts')
                ->where('company_id', $company->id)
                ->delete();

            DB::commit();
            $this->info("  Datos contables eliminados correctamente.");
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("  Error limpiando datos: {$e->getMessage()}");
        }
    }

    private function parseAccounts(array $rows, int $headerRow): array
    {
        $accounts = [];
        $totalRows = count($rows);

        for ($i = $headerRow + 1; $i <= $totalRows; $i++) {
            if (!isset($rows[$i])) {
                continue;
            }

            $row = $rows[$i];
            $code = trim((string) ($row['A'] ?? ''));

            // Saltar filas sin codigo o con codigos no numericos
            if (empty($code) || !ctype_digit($code)) {
                continue;
            }

            $firstDigit = $code[0];

            // Mapear tipo segun primer digito del PUC colombiano
            $type = match ($firstDigit) {
                '1' => 'asset',
                '2' => 'liability',
                '3' => 'equity',
                '4' => 'revenue',
                '5' => 'expense',
                '6', '7' => 'cost', // 6=Costo de ventas, 7=Costos de produccion
                default => null,
            };

            // Saltar clases 8 y 9 (cuentas de orden) - no soportadas en el sistema
            if ($type === null) {
                continue;
            }

            $name = trim((string) ($row['B'] ?? ''));
            if (empty($name)) {
                continue;
            }

            $nature = AccountingAccount::getNatureByType($type);

            // Nivel basado en longitud del codigo
            $level = match (strlen($code)) {
                1 => 1,
                2 => 2,
                4 => 3,
                6 => 4,
                8 => 5,
                default => strlen($code) <= 3 ? 2 : 6,
            };

            // Activo: "Sí" o vacio (padres) = true, "No" = false
            $activoVal = mb_strtolower(trim((string) ($row['H'] ?? '')));
            $isActive = !in_array($activoVal, ['no', '0', 'false']);

            // Nivel de agrupacion: "Transaccional" = hoja, vacio = padre
            $nivelAgrupacion = trim((string) ($row['I'] ?? ''));
            $isTransactional = mb_strtolower($nivelAgrupacion) === 'transaccional';

            $accounts[] = [
                'code' => $code,
                'name' => $name,
                'type' => $type,
                'nature' => $nature,
                'level' => $level,
                'is_active' => $isActive,
                'is_transactional' => $isTransactional,
                'is_parent' => false, // Se resuelve despues
            ];
        }

        return $accounts;
    }

    private function resolveParentFlags(array &$accounts): void
    {
        $allCodes = array_column($accounts, 'code');

        foreach ($accounts as &$account) {
            // Una cuenta es padre si:
            // 1. El Excel dice que NO es transaccional, O
            // 2. Algun otro codigo empieza con este codigo
            if (!$account['is_transactional']) {
                $account['is_parent'] = true;
                continue;
            }

            foreach ($allCodes as $otherCode) {
                if ($otherCode !== $account['code'] && str_starts_with($otherCode, $account['code'])) {
                    $account['is_parent'] = true;
                    break;
                }
            }
        }
        unset($account);
    }

    private function resolveParentId(string $code, array $codeToId): ?int
    {
        // Buscar el codigo existente mas largo que sea prefijo de este codigo
        for ($len = strlen($code) - 1; $len >= 1; $len--) {
            $possibleParent = substr($code, 0, $len);
            if (isset($codeToId[$possibleParent])) {
                return $codeToId[$possibleParent];
            }
        }

        return null;
    }

    private function importForCompany(Company $company, array $accounts, bool $dryRun): void
    {
        $this->newLine();
        $this->info("=== Empresa: {$company->name} (ID: {$company->id}) ===");

        if ($dryRun) {
            $this->dryRunForCompany($company, $accounts);
            return;
        }

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $restored = 0;
        $codeToId = [];

        // Cargar cuentas existentes para resolver parent_id
        $existingAccounts = AccountingAccount::withTrashed()
            ->where('company_id', $company->id)
            ->pluck('id', 'code')
            ->toArray();

        $codeToId = $existingAccounts;

        $bar = $this->output->createProgressBar(count($accounts));
        $bar->start();

        DB::beginTransaction();

        try {
            // Suprimir eventos del observer para evitar logs de auditoria masivos
            AccountingAccount::withoutEvents(function () use (
                $company, $accounts, &$codeToId, &$created, &$updated, &$skipped, &$restored, $bar
            ) {
                foreach ($accounts as $accountData) {
                    $code = $accountData['code'];
                    $parentId = $this->resolveParentId($code, $codeToId);

                    $existing = AccountingAccount::withTrashed()
                        ->where('company_id', $company->id)
                        ->where('code', $code)
                        ->first();

                    if ($existing) {
                        $changes = [];

                        if ($existing->name !== $accountData['name']) {
                            $changes['name'] = $accountData['name'];
                        }
                        if ($existing->is_parent !== $accountData['is_parent']) {
                            $changes['is_parent'] = $accountData['is_parent'];
                        }
                        if ($existing->parent_id !== $parentId && $parentId !== null) {
                            $changes['parent_id'] = $parentId;
                        }
                        if ($existing->level !== $accountData['level']) {
                            $changes['level'] = $accountData['level'];
                        }

                        if ($existing->trashed()) {
                            $existing->restore();
                            $changes['is_active'] = $accountData['is_active'];
                            $restored++;
                        }

                        if (!empty($changes)) {
                            $existing->update($changes);
                            $updated++;
                        } else {
                            $skipped++;
                        }

                        $codeToId[$code] = $existing->id;
                    } else {
                        $account = AccountingAccount::create([
                            'company_id' => $company->id,
                            'parent_id' => $parentId,
                            'code' => $code,
                            'name' => $accountData['name'],
                            'type' => $accountData['type'],
                            'nature' => $accountData['nature'],
                            'level' => $accountData['level'],
                            'is_active' => $accountData['is_active'],
                            'is_parent' => $accountData['is_parent'],
                        ]);

                        $codeToId[$code] = $account->id;
                        $created++;
                    }

                    $bar->advance();
                }
            });

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            $bar->finish();
            $this->newLine();
            $this->error("Error durante la importacion: {$e->getMessage()}");
            return;
        }

        $bar->finish();
        $this->newLine();

        $this->table(
            ['Accion', 'Cantidad'],
            [
                ['Creadas', $created],
                ['Actualizadas', $updated],
                ['Sin cambios', $skipped],
                ['Restauradas', $restored],
                ['Total procesadas', $created + $updated + $skipped + $restored],
            ]
        );

        // Verificar cuentas criticas de observers
        $this->verifyObserverAccounts($company);
    }

    private function dryRunForCompany(Company $company, array $accounts): void
    {
        $codeToId = AccountingAccount::withTrashed()
            ->where('company_id', $company->id)
            ->pluck('id', 'code')
            ->toArray();

        $wouldCreate = 0;
        $existing = 0;

        foreach ($accounts as $accountData) {
            $code = $accountData['code'];

            if (isset($codeToId[$code])) {
                $existing++;
            } else {
                $wouldCreate++;
            }
        }

        $this->table(
            ['Accion', 'Cantidad'],
            [
                ['Existentes', $existing],
                ['Se crearian', $wouldCreate],
                ['Total en Excel', count($accounts)],
            ]
        );

        $this->verifyObserverAccounts($company);
    }

    private function verifyObserverAccounts(Company $company): void
    {
        $this->newLine();
        $this->info('Verificando cuentas hoja de observers...');

        $issues = [];

        foreach (self::OBSERVER_LEAF_CODES as $code) {
            $account = AccountingAccount::where('company_id', $company->id)
                ->where('code', $code)
                ->first();

            if (!$account) {
                $issues[] = [$code, 'NO EXISTE', 'Verificar que el Excel contiene esta cuenta'];
            } elseif ($account->is_parent) {
                $issues[] = [$code, 'ES PADRE', 'Buscar cuenta hoja bajo este codigo'];
            } elseif (!$account->is_active) {
                $issues[] = [$code, 'INACTIVA', 'Activar esta cuenta en el plan de cuentas'];
            }
        }

        if (empty($issues)) {
            $this->info('Todas las cuentas hoja de observers existen y estan activas.');
        } else {
            $this->warn('Problemas con cuentas de observers:');
            $this->table(['Codigo', 'Problema', 'Sugerencia'], $issues);
        }
    }
}
