<?php

namespace App\Services;

use App\Models\AccountingAccount;
use App\Models\AccountingPeriod;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountingService
{
    // ============================================================
    // CREACION DE ASIENTOS
    // ============================================================

    /**
     * Crea un registro contable manual
     *
     * @param array $data ['company_id', 'branch_id', 'date', 'description', 'notes', 'lines' => [['account_id', 'debit', 'credit', 'description']]]
     * @param int $userId
     * @param bool $autoPost
     */
    public function createJournalEntry(array $data, int $userId, bool $autoPost = false): JournalEntry
    {
        $this->validatePeriodOpen($data['company_id'], $data['date']);
        $this->validateLines($data['lines']);

        return DB::transaction(function () use ($data, $userId, $autoPost) {
            $totalDebit = collect($data['lines'])->sum('debit');
            $totalCredit = collect($data['lines'])->sum('credit');

            $entry = JournalEntry::create([
                'company_id' => $data['company_id'],
                'branch_id' => $data['branch_id'] ?? null,
                'entry_number' => JournalEntry::generateEntryNumber($data['company_id']),
                'date' => $data['date'],
                'description' => $data['description'],
                'status' => $autoPost ? 'posted' : 'draft',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'source' => 'manual',
                'created_by_user_id' => $userId,
                'posted_at' => $autoPost ? now() : null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['lines'] as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'accounting_account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'description' => $line['description'] ?? null,
                ]);
            }

            return $entry->load('lines.accountingAccount');
        });
    }

    /**
     * Crea un asiento automatico (llamado por observers)
     * Se auto-publica inmediatamente
     *
     * @param Model $referenceModel El modelo que origino el registro (Sale, Payment, etc)
     * @param string $autoSource Identificador: 'sale_completed', 'payment_income_created', etc
     * @param array $lines [['account_id' => int, 'debit' => float, 'credit' => float, 'description' => string]]
     * @param string|null $description Descripcion del registro
     */
    public function createAutoEntry(Model $referenceModel, string $autoSource, array $lines, ?string $description = null): JournalEntry
    {
        $companyId = $referenceModel->company_id;
        $branchId = $referenceModel->branch_id ?? null;
        $date = now()->toDateString();

        $this->validatePeriodOpen($companyId, $date);

        return DB::transaction(function () use ($referenceModel, $autoSource, $lines, $description, $companyId, $branchId, $date) {
            $totalDebit = collect($lines)->sum('debit');
            $totalCredit = collect($lines)->sum('credit');

            $entry = JournalEntry::create([
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'entry_number' => JournalEntry::generateEntryNumber($companyId),
                'date' => $date,
                'description' => $description ?? "Registro automatico: {$autoSource}",
                'reference_type' => get_class($referenceModel),
                'reference_id' => $referenceModel->id,
                'status' => 'posted',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'source' => 'automatic',
                'auto_source' => $autoSource,
                'created_by_user_id' => auth()->id() ?? 1,
                'posted_at' => now(),
            ]);

            foreach ($lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'accounting_account_id' => $line['account_id'],
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'description' => $line['description'] ?? null,
                ]);
            }

            return $entry;
        });
    }

    /**
     * Crea un asiento de reverso para anulaciones
     */
    public function createReversalEntry(JournalEntry $originalEntry, string $reason): JournalEntry
    {
        $companyId = $originalEntry->company_id;
        $date = now()->toDateString();

        $this->validatePeriodOpen($companyId, $date);

        return DB::transaction(function () use ($originalEntry, $reason, $companyId, $date) {
            $entry = JournalEntry::create([
                'company_id' => $companyId,
                'branch_id' => $originalEntry->branch_id,
                'entry_number' => JournalEntry::generateEntryNumber($companyId),
                'date' => $date,
                'description' => "Reverso de {$originalEntry->entry_number}: {$reason}",
                'reference_type' => $originalEntry->reference_type,
                'reference_id' => $originalEntry->reference_id,
                'status' => 'posted',
                'total_debit' => $originalEntry->total_credit,
                'total_credit' => $originalEntry->total_debit,
                'source' => 'automatic',
                'auto_source' => 'reversal',
                'created_by_user_id' => auth()->id() ?? 1,
                'posted_at' => now(),
                'notes' => "Reverso del registro {$originalEntry->entry_number}",
            ]);

            // Invertir debitos y creditos
            foreach ($originalEntry->lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'accounting_account_id' => $line->accounting_account_id,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'description' => "Reverso: " . ($line->description ?? ''),
                ]);
            }

            // Anular el registro original
            $originalEntry->void($reason);

            return $entry;
        });
    }

    /**
     * Publica un asiento borrador
     */
    public function postEntry(JournalEntry $entry): void
    {
        if ($entry->status !== 'draft') {
            throw new \Exception('Solo se pueden publicar registros en estado borrador');
        }

        if (!$entry->isBalanced()) {
            throw new \Exception('El registro no esta balanceado (debitos != creditos)');
        }

        $this->validatePeriodOpen($entry->company_id, $entry->date->toDateString());
        $entry->post();
    }

    /**
     * Anula un asiento publicado
     */
    public function voidEntry(JournalEntry $entry, string $reason): JournalEntry
    {
        if ($entry->status !== 'posted') {
            throw new \Exception('Solo se pueden anular registros publicados');
        }

        return $this->createReversalEntry($entry, $reason);
    }

    // ============================================================
    // VALIDACIONES
    // ============================================================

    /**
     * Valida que el periodo contable este abierto para la fecha dada
     * Auto-crea el periodo si no existe
     */
    public function validatePeriodOpen(int $companyId, string $date): void
    {
        $dateObj = \Carbon\Carbon::parse($date);
        $year = $dateObj->year;
        $month = $dateObj->month;

        $period = AccountingPeriod::firstOrCreate(
            ['company_id' => $companyId, 'year' => $year, 'month' => $month],
            ['status' => 'open']
        );

        if ($period->isClosed()) {
            throw new \Exception("El periodo contable {$month}/{$year} esta cerrado. No se pueden registrar movimientos.");
        }
    }

    /**
     * Valida las lineas de un asiento
     */
    private function validateLines(array $lines): void
    {
        if (count($lines) < 2) {
            throw new \Exception('Un registro contable debe tener al menos 2 lineas');
        }

        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($lines as $line) {
            if (empty($line['account_id'])) {
                throw new \Exception('Cada linea debe tener una cuenta contable');
            }

            $debit = $line['debit'] ?? 0;
            $credit = $line['credit'] ?? 0;

            if ($debit < 0 || $credit < 0) {
                throw new \Exception('Los valores de debito y credito no pueden ser negativos');
            }

            if ($debit > 0 && $credit > 0) {
                throw new \Exception('Una linea no puede tener debito y credito simultaneamente');
            }

            if ($debit == 0 && $credit == 0) {
                throw new \Exception('Cada linea debe tener un valor en debito o credito');
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new \Exception("El registro no esta balanceado. Debitos: {$totalDebit}, Creditos: {$totalCredit}");
        }
    }

    // ============================================================
    // MAPEO DE CUENTAS (para observers)
    // ============================================================

    /**
     * Verifica si la empresa tiene contabilidad configurada
     */
    public function hasAccountingConfigured(int $companyId): bool
    {
        return AccountingAccount::where('company_id', $companyId)->exists();
    }

    /**
     * Obtiene la cuenta contable asociada a una caja
     */
    public function getCashRegisterAccount(int $cashRegisterId): ?AccountingAccount
    {
        return AccountingAccount::whereHas('cashRegisters', function ($query) use ($cashRegisterId) {
            $query->where('cash_register_id', $cashRegisterId)
                ->where('accounting_account_cash_register.is_active', true);
        })->first();
    }

    /**
     * Obtiene la cuenta contable asociada a un proveedor
     */
    public function getSupplierAccount(int $supplierId): ?AccountingAccount
    {
        return AccountingAccount::whereHas('suppliers', function ($query) use ($supplierId) {
            $query->where('supplier_id', $supplierId)
                ->where('accounting_account_supplier.is_active', true);
        })->first();
    }

    /**
     * Obtiene la cuenta contable configurada para un tipo de transaccion (configuracion general, sin distincion por tipo de venta)
     */
    public function getSaleTypeAccount(int $companyId, string $transactionType): ?AccountingAccount
    {
        $mapping = DB::table('accounting_account_sale_type')
            ->where('company_id', $companyId)
            ->where('transaction_type', $transactionType)
            ->where('is_active', true)
            ->first();

        if (!$mapping) {
            return null;
        }

        return AccountingAccount::find($mapping->accounting_account_id);
    }

    /**
     * Obtiene cuenta por defecto por codigo PUC para la empresa
     */
    public function getAccountByCode(int $companyId, string $code): ?AccountingAccount
    {
        return AccountingAccount::where('company_id', $companyId)
            ->where('code', $code)
            ->first();
    }

    // ============================================================
    // ASIENTOS AUTOMATICOS DE COMPRAS
    // ============================================================

    /**
     * Crea el asiento contable de compra recibida.
     * Usado por PurchaseObserver y PaymentObserver.
     *
     * DR Inventario (subtotal sin IVA)
     * DR IVA Descontable por tasa (5%, 19%)
     * CR Caja/Banco (pagos iniciales) + CR CxP (restante)
     *
     * @param array $cashCredits [['amount' => float, 'account_id' => int], ...] pagos en efectivo/banco
     */
    public function createPurchaseReceivedEntry(
        \App\Models\InventoryPurchase $purchase,
        array $cashCredits = []
    ): void {
        $lines = [];
        $companyId = $purchase->company_id;

        // Cuenta de inventario
        $inventoryAccount = $this->getSaleTypeAccount($companyId, 'purchase_inventory')
            ?? $this->getAccountByCode($companyId, '14350101');

        // Cuenta de CxP: proveedor especifico o generica
        $cxpAccount = null;
        if ($purchase->supplier_id) {
            $cxpAccount = $this->getSupplierAccount($purchase->supplier_id);
        }
        if (!$cxpAccount) {
            $cxpAccount = $this->getSaleTypeAccount($companyId, 'purchase_cxp')
                ?? $this->getAccountByCode($companyId, '22050501');
        }

        if (!$inventoryAccount || !$cxpAccount) {
            Log::warning('AccountingService: Cuentas no configuradas para compra', [
                'purchase_id' => $purchase->id,
                'company_id' => $companyId,
            ]);
            return;
        }

        $subtotal    = (float) $purchase->subtotal;
        $totalAmount = (float) $purchase->total_amount;

        // DR: Inventario por subtotal (sin IVA)
        if ($subtotal > 0) {
            $lines[] = [
                'account_id' => $inventoryAccount->id,
                'debit'      => $subtotal,
                'credit'     => 0,
                'description' => "Compra inventario {$purchase->purchase_number}",
            ];
        }

        // DR: IVA Descontable separado por tasa
        $purchase->load('items');
        $taxByRate = [];

        foreach ($purchase->items as $item) {
            $rate = (float) ($item->tax_rate ?? 0);
            if ($rate > 0) {
                $taxByRate[$rate] = ($taxByRate[$rate] ?? 0) + (float) $item->tax_amount;
            }
        }

        $ivaRateConfig = [
            5.0  => ['transaction' => 'purchase_tax_5',  'default_code' => '24081003', 'label' => 'IVA Descontable 5%'],
            19.0 => ['transaction' => 'purchase_tax_19', 'default_code' => '24081001', 'label' => 'IVA Descontable 19%'],
        ];

        foreach ($ivaRateConfig as $rate => $config) {
            $taxAmount = $taxByRate[$rate] ?? 0;
            if ($taxAmount <= 0) {
                continue;
            }

            $ivaAccount = $this->getSaleTypeAccount($companyId, $config['transaction'])
                ?? $this->getAccountByCode($companyId, $config['default_code']);

            if ($ivaAccount) {
                $lines[] = [
                    'account_id' => $ivaAccount->id,
                    'debit'      => $taxAmount,
                    'credit'     => 0,
                    'description' => "{$config['label']} compra {$purchase->purchase_number}",
                ];
            }
        }

        // CR: Lado credito - Caja/Banco para pagos iniciales, CxP para el restante
        $totalCashCredited = 0;

        if (!empty($cashCredits)) {
            foreach ($cashCredits as $cashCredit) {
                $creditAmount = round((float) $cashCredit['amount'], 2);
                $cashAccount = AccountingAccount::find($cashCredit['account_id']);

                if ($cashAccount && $creditAmount > 0) {
                    $lines[] = [
                        'account_id' => $cashAccount->id,
                        'debit'      => 0,
                        'credit'     => $creditAmount,
                        'description' => "Pago compra {$purchase->purchase_number}",
                    ];
                    $totalCashCredited += $creditAmount;
                }
            }
        }

        $cxpAmount = max(0, round($totalAmount - $totalCashCredited, 2));
        if ($cxpAmount > 0) {
            $lines[] = [
                'account_id' => $cxpAccount->id,
                'debit'      => 0,
                'credit'     => $cxpAmount,
                'description' => "CxP compra {$purchase->purchase_number}",
            ];
        }

        if (count($lines) >= 2) {
            $this->createAutoEntry(
                $purchase,
                'purchase_received',
                $lines,
                "Compra recibida {$purchase->purchase_number}"
            );
        }
    }

    // ============================================================
    // REPORTES
    // ============================================================

    /**
     * Balance de Comprobacion
     */
    public function getTrialBalance(int $companyId, string $dateFrom, string $dateTo): array
    {
        $accounts = AccountingAccount::where('company_id', $companyId)
            ->where('is_parent', false)
            ->where('is_active', true)
            ->orderBy('code')
            ->get();

        $result = [];
        $previousDay = date('Y-m-d', strtotime($dateFrom . ' -1 day'));

        foreach ($accounts as $account) {
            // Movimientos BRUTOS en el periodo (debitos y creditos reales)
            $periodQuery = $account->journalEntryLines()
                ->whereHas('journalEntry', fn (Builder $q) => $q->where('status', 'posted')
                    ->whereBetween('date', [$dateFrom, $dateTo]));

            $debitMovement = (float) (clone $periodQuery)->sum('debit');
            $creditMovement = (float) (clone $periodQuery)->sum('credit');

            // Saldo anterior (neto, todo antes del periodo)
            $previousBalance = $account->getBalance(null, $previousDay);

            // Saldo total = saldo anterior + movimiento neto del periodo
            $periodNet = $account->nature === 'debit'
                ? $debitMovement - $creditMovement
                : $creditMovement - $debitMovement;
            $totalBalance = $previousBalance + $periodNet;

            // Omitir cuentas sin movimiento y sin saldo
            if ($debitMovement < 0.01 && $creditMovement < 0.01 && abs($previousBalance) < 0.01) {
                continue;
            }

            $result[] = [
                'account_id' => $account->id,
                'account_code' => $account->code,
                'account_name' => $account->name,
                'account_type' => $account->type,
                'debit_movement' => round($debitMovement, 2),
                'credit_movement' => round($creditMovement, 2),
                'previous_balance' => round($previousBalance, 2),
                'total_balance' => round($totalBalance, 2),
                'final_balance' => round($totalBalance, 2),
            ];
        }

        return $result;
    }

    /**
     * Libro Mayor - Movimientos de una cuenta
     */
    public function getGeneralLedger(int $accountId, string $dateFrom, string $dateTo): array
    {
        $account = AccountingAccount::findOrFail($accountId);

        // Query all entries up to dateTo to compute previous balance
        $lines = JournalEntryLine::where('accounting_account_id', $accountId)
            ->whereHas('journalEntry', function ($query) use ($dateTo) {
                $query->where('status', 'posted')
                    ->where('date', '<=', $dateTo);
            })
            ->with(['journalEntry' => function ($query) {
                $query->select('id', 'entry_number', 'date', 'description');
            }])
            ->get()
            ->sortBy('journalEntry.date');

        $previousBalance = 0;
        $movements = [];

        foreach ($lines as $line) {
            $lineDate = $line->journalEntry->date->format('Y-m-d');
            $delta = $account->nature === 'debit'
                ? $line->debit - $line->credit
                : $line->credit - $line->debit;

            if ($lineDate < $dateFrom) {
                $previousBalance += $delta;
            } else {
                $movements[] = [
                    'date' => $lineDate,
                    'entry_number' => $line->journalEntry->entry_number,
                    'description' => $line->description ?? $line->journalEntry->description,
                    'debit' => (float) $line->debit,
                    'credit' => (float) $line->credit,
                ];
            }
        }

        $previousBalance = round($previousBalance, 2);

        // Add running balance to each movement
        $runningBalance = $previousBalance;
        foreach ($movements as &$mov) {
            $delta = $account->nature === 'debit'
                ? $mov['debit'] - $mov['credit']
                : $mov['credit'] - $mov['debit'];
            $runningBalance += $delta;
            $mov['balance'] = round($runningBalance, 2);
        }
        unset($mov);

        return [
            'previous_balance' => $previousBalance,
            'movements' => $movements,
            'final_balance' => round($runningBalance, 2),
        ];
    }

    /**
     * Estado de Resultados Integral (PyG)
     */
    public function getIncomeStatement(int $companyId, string $dateFrom, string $dateTo): array
    {
        $sections = [];

        // Ingresos (clase 4)
        $sections[] = $this->getReportSection($companyId, 'revenue', 'Ingresos', $dateFrom, $dateTo);

        // Gastos (clase 5)
        $sections[] = $this->getReportSection($companyId, 'expense', 'Gastos Operacionales', $dateFrom, $dateTo);

        // Costos de Venta (clase 6)
        $sections[] = $this->getReportSection($companyId, 'cost', 'Costos de Venta', $dateFrom, $dateTo);

        return $sections;
    }

    /**
     * Estado de Situacion Financiera (Balance General)
     */
    public function getBalanceSheet(int $companyId, string $dateFrom, string $dateTo): array
    {
        $sections = [];

        // Activos (clase 1)
        $sections[] = $this->getReportSection($companyId, 'asset', 'Activos', $dateFrom, $dateTo);

        // Pasivos (clase 2)
        $sections[] = $this->getReportSection($companyId, 'liability', 'Pasivos', $dateFrom, $dateTo);

        // Patrimonio (clase 3) + Resultado del periodo
        $patrimonio = $this->getReportSection($companyId, 'equity', 'Patrimonio', $dateFrom, $dateTo);

        // Calcular resultado del periodo: Ingresos - Costos - Gastos
        $revenue = $this->getReportSection($companyId, 'revenue', 'Ingresos', $dateFrom, $dateTo);
        $costs = $this->getReportSection($companyId, 'cost', 'Costos', $dateFrom, $dateTo);
        $expenses = $this->getReportSection($companyId, 'expense', 'Gastos', $dateFrom, $dateTo);
        $netIncome = round($revenue['total'] - $costs['total'] - $expenses['total'], 2);

        if (abs($netIncome) >= 0.01) {
            $patrimonio['accounts'][] = [
                'code' => '---',
                'name' => $netIncome >= 0 ? 'Utilidad del Periodo' : 'Perdida del Periodo',
                'amount' => $netIncome,
            ];
            $patrimonio['total'] = round($patrimonio['total'] + $netIncome, 2);
        }

        $sections[] = $patrimonio;

        return $sections;
    }

    /**
     * Helper: genera una seccion de reporte por tipo de cuenta
     */
    private function getReportSection(int $companyId, string $type, string $title, ?string $dateFrom, string $dateTo): array
    {
        $accounts = AccountingAccount::where('company_id', $companyId)
            ->where('type', $type)
            ->where('is_parent', false)
            ->where('is_active', true)
            ->orderBy('code')
            ->get();

        $items = [];
        $total = 0;

        foreach ($accounts as $account) {
            $balance = $account->getBalance($dateFrom, $dateTo);

            if (abs($balance) < 0.01) {
                continue;
            }

            $items[] = [
                'code' => $account->code,
                'name' => $account->name,
                'amount' => round($balance, 2),
            ];

            $total += $balance;
        }

        return [
            'title' => $title,
            'accounts' => $items,
            'total' => round($total, 2),
        ];
    }

    /**
     * Auxiliar de Cuenta Contable
     * Movimientos de multiples cuentas en un rango de fechas, agrupados por cuenta
     */
    public function getAccountSubledger(int $companyId, string $dateFrom, string $dateTo, ?string $codeFrom = null, ?string $codeTo = null): array
    {
        $query = AccountingAccount::where('company_id', $companyId)
            ->where('is_parent', false)
            ->where('is_active', true);

        if ($codeFrom) {
            $query->where('code', '>=', $codeFrom);
        }
        if ($codeTo) {
            $query->where('code', '<=', $codeTo);
        }

        $accounts = $query->orderBy('code')->get();
        $result = [];

        foreach ($accounts as $account) {
            // Query all entries up to dateTo to compute previous balance
            $lines = JournalEntryLine::where('accounting_account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($dateTo) {
                    $q->where('status', 'posted')
                        ->where('date', '<=', $dateTo);
                })
                ->with(['journalEntry:id,entry_number,date,description'])
                ->get()
                ->sortBy('journalEntry.date');

            if ($lines->isEmpty()) {
                continue;
            }

            $previousBalance = 0;
            $movements = [];
            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($lines as $line) {
                $lineDate = $line->journalEntry->date->format('Y-m-d');
                $delta = $account->nature === 'debit'
                    ? $line->debit - $line->credit
                    : $line->credit - $line->debit;

                if ($lineDate < $dateFrom) {
                    $previousBalance += $delta;
                } else {
                    $totalDebit += $line->debit;
                    $totalCredit += $line->credit;

                    $movements[] = [
                        'date' => $lineDate,
                        'entry_number' => $line->journalEntry->entry_number,
                        'description' => $line->description ?? $line->journalEntry->description,
                        'debit' => (float) $line->debit,
                        'credit' => (float) $line->credit,
                    ];
                }
            }

            // Skip accounts with no movements in period and no previous balance
            if (empty($movements) && $previousBalance == 0) {
                continue;
            }

            $previousBalance = round($previousBalance, 2);

            // Add running balance starting from previous balance
            $runningBalance = $previousBalance;
            foreach ($movements as &$mov) {
                $delta = $account->nature === 'debit'
                    ? $mov['debit'] - $mov['credit']
                    : $mov['credit'] - $mov['debit'];
                $runningBalance += $delta;
                $mov['balance'] = round($runningBalance, 2);
            }
            unset($mov);

            $result[] = [
                'account' => [
                    'id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'type' => $account->type,
                    'nature' => $account->nature,
                ],
                'previous_balance' => $previousBalance,
                'movements' => $movements,
                'total_debit' => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
                'final_balance' => round($runningBalance, 2),
            ];
        }

        return $result;
    }

    /**
     * Auxiliar por Tercero
     * Movimientos agrupados por tercero (proveedor) derivados de los documentos de referencia (compras)
     */
    public function getThirdPartySubledger(int $companyId, string $dateFrom, string $dateTo, ?int $accountId = null, ?string $thirdPartyType = null, ?int $thirdPartyId = null): array
    {
        // Build filter for specific third party
        $filterReferenceIds = null;
        if ($thirdPartyType && $thirdPartyId) {
            $filterReferenceIds = [];

            if ($thirdPartyType === 'supplier') {
                $purchaseIds = \App\Models\InventoryPurchase::where('supplier_id', $thirdPartyId)
                    ->where('company_id', $companyId)
                    ->pluck('id')
                    ->toArray();
                foreach ($purchaseIds as $pid) {
                    $filterReferenceIds[] = ['type' => 'App\\Models\\InventoryPurchase', 'id' => $pid];
                }
                // Also find payments linked to those purchases
                if (!empty($purchaseIds)) {
                    $paymentIds = \App\Models\Payment::where('reference_type', 'App\\Models\\InventoryPurchase')
                        ->whereIn('reference_id', $purchaseIds)
                        ->pluck('id')
                        ->toArray();
                    foreach ($paymentIds as $payId) {
                        $filterReferenceIds[] = ['type' => 'App\\Models\\Payment', 'id' => $payId];
                    }
                }
            } elseif ($thirdPartyType === 'client') {
                $saleIds = \App\Models\Sale::where('client_id', $thirdPartyId)
                    ->where('company_id', $companyId)
                    ->pluck('id')
                    ->toArray();
                foreach ($saleIds as $sid) {
                    $filterReferenceIds[] = ['type' => 'App\\Models\\Sale', 'id' => $sid];
                }
                // Also find payments linked to those sales
                if (!empty($saleIds)) {
                    $paymentIds = \App\Models\Payment::where('reference_type', 'App\\Models\\Sale')
                        ->whereIn('reference_id', $saleIds)
                        ->pluck('id')
                        ->toArray();
                    foreach ($paymentIds as $payId) {
                        $filterReferenceIds[] = ['type' => 'App\\Models\\Payment', 'id' => $payId];
                    }
                }
            }
        }

        // Query ALL entries up to dateTo (to compute previous balance from entries before dateFrom)
        $query = JournalEntryLine::query()
            ->whereHas('journalEntry', function ($q) use ($companyId, $dateTo, $filterReferenceIds) {
                $q->where('company_id', $companyId)
                    ->where('status', 'posted')
                    ->where('date', '<=', $dateTo)
                    ->whereNotNull('reference_type')
                    ->whereNotNull('reference_id');

                if ($filterReferenceIds !== null) {
                    if (empty($filterReferenceIds)) {
                        // No matching references found, return no results
                        $q->whereRaw('1 = 0');
                    } else {
                        $q->where(function ($sub) use ($filterReferenceIds) {
                            foreach ($filterReferenceIds as $ref) {
                                $sub->orWhere(function ($w) use ($ref) {
                                    $w->where('reference_type', $ref['type'])
                                        ->where('reference_id', $ref['id']);
                                });
                            }
                        });
                    }
                } else {
                    // All third parties: purchases, sales, and payments
                    $q->whereIn('reference_type', [
                        'App\\Models\\InventoryPurchase',
                        'App\\Models\\Sale',
                        'App\\Models\\Payment',
                    ]);
                }
            })
            ->with([
                'journalEntry:id,entry_number,date,description,reference_type,reference_id',
                'accountingAccount:id,code,name,nature',
            ]);

        if ($accountId) {
            $query->where('accounting_account_id', $accountId);
        }

        $lines = $query->get();

        // Collect reference IDs by type
        $purchaseIds = [];
        $saleIds = [];
        $paymentIds = [];

        foreach ($lines as $line) {
            $entry = $line->journalEntry;
            if (!$entry->reference_type || !$entry->reference_id) {
                continue;
            }
            if ($entry->reference_type === 'App\\Models\\InventoryPurchase') {
                $purchaseIds[] = $entry->reference_id;
            } elseif ($entry->reference_type === 'App\\Models\\Sale') {
                $saleIds[] = $entry->reference_id;
            } elseif ($entry->reference_type === 'App\\Models\\Payment') {
                $paymentIds[] = $entry->reference_id;
            }
        }

        // Batch load references to extract third parties
        $thirdPartyMap = []; // "reference_type:reference_id" => third party info

        // Resolve Payments → trace back to their linked Purchase or Sale
        $payments = collect();
        if (!empty($paymentIds)) {
            $payments = \App\Models\Payment::whereIn('id', array_unique($paymentIds))->get();

            foreach ($payments as $payment) {
                if ($payment->reference_type === 'App\\Models\\InventoryPurchase' && $payment->reference_id) {
                    $purchaseIds[] = $payment->reference_id;
                } elseif ($payment->reference_type === 'App\\Models\\Sale' && $payment->reference_id) {
                    $saleIds[] = $payment->reference_id;
                }
            }
        }

        // Resolve Purchases → Suppliers
        if (!empty($purchaseIds)) {
            $purchases = \App\Models\InventoryPurchase::whereIn('id', array_unique($purchaseIds))
                ->with('supplier:id,name,tax_id')
                ->get()
                ->keyBy('id');

            foreach ($purchases as $purchase) {
                $key = 'App\\Models\\InventoryPurchase:' . $purchase->id;
                if ($purchase->supplier) {
                    $thirdPartyMap[$key] = [
                        'id' => $purchase->supplier->id,
                        'name' => $purchase->supplier->name,
                        'type' => 'supplier',
                        'document' => $purchase->supplier->tax_id,
                    ];
                }
            }
        }

        // Resolve Sales → Clients
        if (!empty($saleIds)) {
            $sales = \App\Models\Sale::whereIn('id', array_unique($saleIds))
                ->with('client:id,name,document_id')
                ->get()
                ->keyBy('id');

            foreach ($sales as $sale) {
                $key = 'App\\Models\\Sale:' . $sale->id;
                if ($sale->client) {
                    $thirdPartyMap[$key] = [
                        'id' => $sale->client->id,
                        'name' => $sale->client->name,
                        'type' => 'client',
                        'document' => $sale->client->document_id,
                    ];
                }
            }
        }

        // Map Payment entries to their resolved third party
        foreach ($payments as $payment) {
            $paymentKey = 'App\\Models\\Payment:' . $payment->id;
            if ($payment->reference_type && $payment->reference_id) {
                $refKey = $payment->reference_type . ':' . $payment->reference_id;
                if (isset($thirdPartyMap[$refKey])) {
                    $thirdPartyMap[$paymentKey] = $thirdPartyMap[$refKey];
                }
            }
        }

        // Group lines by third party, separating previous balance from period movements
        $thirdParties = [];

        foreach ($lines->sortBy('journalEntry.date') as $line) {
            $entry = $line->journalEntry;
            $refKey = ($entry->reference_type && $entry->reference_id)
                ? $entry->reference_type . ':' . $entry->reference_id
                : 'none:0';

            $thirdParty = $thirdPartyMap[$refKey] ?? [
                'id' => 0,
                'name' => 'Sin tercero',
                'type' => 'none',
                'document' => null,
            ];

            $tpKey = $thirdParty['type'] . ':' . $thirdParty['id'];

            if (!isset($thirdParties[$tpKey])) {
                $thirdParties[$tpKey] = [
                    'third_party' => $thirdParty,
                    'movements' => [],
                    'previous_balance' => 0,
                    'total_debit' => 0,
                    'total_credit' => 0,
                ];
            }

            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $entryDate = $entry->date->format('Y-m-d');

            // Entries before dateFrom contribute to previous balance
            if ($entryDate < $dateFrom) {
                $thirdParties[$tpKey]['previous_balance'] += ($debit - $credit);
            } else {
                $thirdParties[$tpKey]['movements'][] = [
                    'date' => $entryDate,
                    'entry_number' => $entry->entry_number,
                    'account_code' => $line->accountingAccount->code,
                    'account_name' => $line->accountingAccount->name,
                    'description' => $line->description ?? $entry->description,
                    'debit' => $debit,
                    'credit' => $credit,
                ];

                $thirdParties[$tpKey]['total_debit'] += $debit;
                $thirdParties[$tpKey]['total_credit'] += $credit;
            }
        }

        // Clean up totals, compute running balance per movement, and sort
        $result = [];
        foreach ($thirdParties as $tp) {
            // Skip third parties that have no movements in the period and no previous balance
            if (empty($tp['movements']) && $tp['previous_balance'] == 0) {
                continue;
            }

            $tp['previous_balance'] = round($tp['previous_balance'], 2);
            $tp['total_debit'] = round($tp['total_debit'], 2);
            $tp['total_credit'] = round($tp['total_credit'], 2);

            // Add running balance to each movement
            $runningBalance = $tp['previous_balance'];
            foreach ($tp['movements'] as &$mov) {
                $runningBalance += ($mov['debit'] - $mov['credit']);
                $mov['balance'] = round($runningBalance, 2);
            }
            unset($mov);

            $tp['final_balance'] = round($runningBalance, 2);
            $result[] = $tp;
        }

        usort($result, fn ($a, $b) => strcmp($a['third_party']['name'], $b['third_party']['name']));

        return $result;
    }

    // ============================================================
    // PERIODOS
    // ============================================================

    /**
     * Cierra un periodo contable
     */
    public function closePeriod(int $companyId, int $year, int $month, int $userId): AccountingPeriod
    {
        $period = AccountingPeriod::where('company_id', $companyId)
            ->where('year', $year)
            ->where('month', $month)
            ->firstOrFail();

        if ($period->isClosed()) {
            throw new \Exception('El periodo ya esta cerrado');
        }

        $period->close($userId);

        return $period->fresh();
    }

    /**
     * Reabre un periodo contable
     */
    public function reopenPeriod(int $companyId, int $year, int $month): AccountingPeriod
    {
        $period = AccountingPeriod::where('company_id', $companyId)
            ->where('year', $year)
            ->where('month', $month)
            ->firstOrFail();

        if ($period->isOpen()) {
            throw new \Exception('El periodo ya esta abierto');
        }

        $period->reopen();

        return $period->fresh();
    }
}
