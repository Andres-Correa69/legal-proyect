# Documentacion Tecnica - Sistema de Cuentas Contables

## 1. Arquitectura General

El modulo contable se integra como una **capa transversal** sobre el sistema financiero existente, usando el patron **Observer** de Laravel para generar asientos contables automaticos cuando ocurren transacciones.

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACION                  │
│  resources/js/pages/admin/accounting/                    │
│  (React + TypeScript + Inertia)                         │
├─────────────────────────────────────────────────────────┤
│                    CAPA API                              │
│  app/Http/Controllers/Api/                              │
│  AccountingAccountController                            │
│  JournalEntryController                                 │
│  AccountingReportController                             │
├─────────────────────────────────────────────────────────┤
│                 CAPA DE SERVICIO                         │
│  app/Services/AccountingService.php                     │
│  (Logica contable centralizada)                         │
├─────────────────────────────────────────────────────────┤
│                 CAPA OBSERVER                            │
│  app/Observers/                                         │
│  SaleObserver, PaymentObserver,                         │
│  InventoryPurchaseObserver,                             │
│  CashRegisterTransferObserver                           │
├─────────────────────────────────────────────────────────┤
│              CAPA DE MODELOS                             │
│  AccountingAccount, JournalEntry,                       │
│  JournalEntryLine, AccountingPeriod                     │
├─────────────────────────────────────────────────────────┤
│           SISTEMA EXISTENTE (sin modificar)              │
│  Sale, Payment, CashRegister, InventoryPurchase,        │
│  SalePayment, CashRegisterTransfer, Supplier            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Modelos y Migraciones

### 2.1 `AccountingAccount` - Plan de Cuentas

**Tabla:** `accounting_accounts`

```php
Schema::create('accounting_accounts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->onDelete('cascade');
    $table->foreignId('parent_id')->nullable()->constrained('accounting_accounts')->onDelete('cascade');
    $table->string('code', 20);           // "110505"
    $table->string('name');                // "Caja General"
    $table->enum('type', [
        'asset',      // 1xxx - Activo
        'liability',  // 2xxx - Pasivo
        'equity',     // 3xxx - Patrimonio
        'revenue',    // 4xxx - Ingresos
        'expense',    // 5xxx - Gastos
        'cost',       // 6xxx - Costos de Venta
    ]);
    $table->enum('nature', ['debit', 'credit']);
    $table->tinyInteger('level');          // 1-6
    $table->boolean('is_active')->default(true);
    $table->boolean('is_parent')->default(false);   // true = no acepta movimientos directos
    $table->text('description')->nullable();
    $table->timestamps();

    $table->unique(['company_id', 'code']);
    $table->index(['company_id', 'type']);
    $table->index(['company_id', 'parent_id']);
});
```

**Modelo:** `app/Models/AccountingAccount.php`

```php
class AccountingAccount extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id', 'parent_id', 'code', 'name', 'type',
        'nature', 'level', 'is_active', 'is_parent', 'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_parent' => 'boolean',
        'level' => 'integer',
    ];

    // -- Relaciones --

    public function parent(): BelongsTo
    {
        return $this->belongsTo(AccountingAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(AccountingAccount::class, 'parent_id');
    }

    public function journalEntryLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function cashRegisters(): BelongsToMany
    {
        return $this->belongsToMany(CashRegister::class, 'accounting_account_cash_register')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    public function suppliers(): BelongsToMany
    {
        return $this->belongsToMany(Supplier::class, 'accounting_account_supplier')
            ->withPivot('is_active')
            ->withTimestamps();
    }

    // -- Scopes --

    public function scopeLeaf(Builder $query): Builder
    {
        return $query->where('is_parent', false);
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    // -- Helpers --

    public function getBalance(string $dateFrom = null, string $dateTo = null): float
    {
        $query = $this->journalEntryLines()
            ->whereHas('journalEntry', fn ($q) => $q->where('status', 'posted'));

        if ($dateFrom) $query->whereHas('journalEntry', fn ($q) => $q->where('date', '>=', $dateFrom));
        if ($dateTo) $query->whereHas('journalEntry', fn ($q) => $q->where('date', '<=', $dateTo));

        $totalDebit = (clone $query)->sum('debit');
        $totalCredit = (clone $query)->sum('credit');

        // Cuentas de naturaleza debito: saldo = debitos - creditos
        // Cuentas de naturaleza credito: saldo = creditos - debitos
        return $this->nature === 'debit'
            ? $totalDebit - $totalCredit
            : $totalCredit - $totalDebit;
    }
}
```

### 2.2 `JournalEntry` - Asientos Contables

**Tabla:** `journal_entries`

```php
Schema::create('journal_entries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->onDelete('cascade');
    $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
    $table->string('entry_number', 30)->unique();       // "AC-20260218-0001"
    $table->date('date');
    $table->string('description');
    $table->nullableMorphs('reference');                 // reference_type + reference_id
    $table->enum('status', ['draft', 'posted', 'voided'])->default('draft');
    $table->decimal('total_debit', 15, 2)->default(0);
    $table->decimal('total_credit', 15, 2)->default(0);
    $table->enum('source', ['manual', 'auto'])->default('manual');
    $table->string('auto_source')->nullable();           // "sale_created", "payment_income", etc.
    $table->foreignId('created_by_user_id')->constrained('users')->onDelete('restrict');
    $table->timestamp('posted_at')->nullable();
    $table->timestamp('voided_at')->nullable();
    $table->foreignId('voided_by_user_id')->nullable()->constrained('users')->onDelete('set null');
    $table->text('notes')->nullable();
    $table->text('void_reason')->nullable();
    $table->timestamps();

    $table->index(['company_id', 'date']);
    $table->index(['company_id', 'status']);
    $table->index(['reference_type', 'reference_id']);
});
```

**Modelo:** `app/Models/JournalEntry.php`

```php
class JournalEntry extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id', 'branch_id', 'entry_number', 'date', 'description',
        'reference_type', 'reference_id', 'status', 'total_debit', 'total_credit',
        'source', 'auto_source', 'created_by_user_id', 'posted_at', 'voided_at',
        'voided_by_user_id', 'notes', 'void_reason',
    ];

    protected $casts = [
        'date' => 'date',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'posted_at' => 'datetime',
        'voided_at' => 'datetime',
    ];

    // -- Relaciones --

    public function lines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    // -- Helpers --

    public function isBalanced(): bool
    {
        return bccomp((string) $this->total_debit, (string) $this->total_credit, 2) === 0;
    }

    public static function generateEntryNumber(int $companyId): string
    {
        $today = now()->format('Ymd');
        $count = static::where('company_id', $companyId)
            ->where('entry_number', 'like', "AC-{$today}-%")
            ->count();
        return sprintf('AC-%s-%04d', $today, $count + 1);
    }

    public function post(): void
    {
        if (!$this->isBalanced()) {
            throw new \Exception('El asiento no esta balanceado');
        }
        $this->update([
            'status' => 'posted',
            'posted_at' => now(),
        ]);
    }
}
```

### 2.3 `JournalEntryLine` - Lineas del Asiento

**Tabla:** `journal_entry_lines`

```php
Schema::create('journal_entry_lines', function (Blueprint $table) {
    $table->id();
    $table->foreignId('journal_entry_id')->constrained()->onDelete('cascade');
    $table->foreignId('accounting_account_id')->constrained()->onDelete('restrict');
    $table->decimal('debit', 15, 2)->default(0);
    $table->decimal('credit', 15, 2)->default(0);
    $table->string('description')->nullable();
    $table->timestamps();

    $table->index('accounting_account_id');
});
```

### 2.4 `AccountingPeriod` - Periodos Contables

**Tabla:** `accounting_periods`

```php
Schema::create('accounting_periods', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->onDelete('cascade');
    $table->unsignedSmallInteger('year');
    $table->unsignedTinyInteger('month');
    $table->enum('status', ['open', 'closed'])->default('open');
    $table->timestamp('closed_at')->nullable();
    $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->onDelete('set null');
    $table->timestamps();

    $table->unique(['company_id', 'year', 'month']);
});
```

### 2.5 Tablas Pivot - Vinculaciones

**`accounting_account_cash_register`**

```php
Schema::create('accounting_account_cash_register', function (Blueprint $table) {
    $table->id();
    $table->foreignId('accounting_account_id')->constrained()->onDelete('cascade');
    $table->foreignId('cash_register_id')->constrained()->onDelete('cascade');
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->unique(['accounting_account_id', 'cash_register_id'], 'acct_cash_unique');
});
```

**`accounting_account_supplier`**

```php
Schema::create('accounting_account_supplier', function (Blueprint $table) {
    $table->id();
    $table->foreignId('accounting_account_id')->constrained()->onDelete('cascade');
    $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->unique(['accounting_account_id', 'supplier_id'], 'acct_supplier_unique');
});
```

**`accounting_account_sale_type`** - Mapeo de tipos de venta a cuentas

```php
Schema::create('accounting_account_sale_type', function (Blueprint $table) {
    $table->id();
    $table->foreignId('company_id')->constrained()->onDelete('cascade');
    $table->foreignId('accounting_account_id')->constrained()->onDelete('cascade');
    $table->string('sale_type', 30);                    // pos, electronic, account, credit
    $table->string('transaction_type', 30);             // revenue, tax, discount, retention, cxc
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->unique(['company_id', 'sale_type', 'transaction_type'], 'acct_sale_type_unique');
});
```

---

## 3. Servicio Central: `AccountingService`

**Archivo:** `app/Services/AccountingService.php`

Este servicio centraliza toda la logica contable. Los Observers lo llaman, nunca crean asientos directamente.

```php
class AccountingService
{
    /**
     * Crear asiento contable desde una venta nueva
     * Evento: Sale::created (status=completed)
     */
    public static function createFromSale(Sale $sale): ?JournalEntry
    {
        // 1. Buscar cuentas configuradas para este tipo de venta
        // 2. Crear asiento:
        //    Debito: CxC Clientes (por total_amount)
        //    Credito: Ingresos por Ventas (por subtotal - discount)
        //    Credito: IVA por Pagar (por tax_amount, si > 0)
        //    Debito: Retenciones (por retention_amount, si > 0)
        // 3. Post automatico si esta balanceado
    }

    /**
     * Crear asiento contable desde un pago de ingreso
     * Evento: Payment::created (type=income)
     */
    public static function createFromIncomePayment(Payment $payment): ?JournalEntry
    {
        // 1. Buscar cuenta contable de la caja (via pivot)
        // 2. Crear asiento:
        //    Debito: Caja/Banco (cuenta vinculada a la caja)
        //    Credito: CxC Clientes
        // 3. Post automatico
    }

    /**
     * Crear asiento contable desde una compra
     * Evento: InventoryPurchase status -> received/partial
     */
    public static function createFromPurchase(InventoryPurchase $purchase): ?JournalEntry
    {
        // 1. Buscar cuenta del proveedor (via pivot)
        // 2. Crear asiento:
        //    Debito: Inventario (por subtotal)
        //    Debito: IVA Descontable (por tax_amount, si > 0)
        //    Credito: CxP Proveedores (cuenta del proveedor)
        // 3. Post automatico
    }

    /**
     * Crear asiento desde pago a proveedor (egreso)
     * Evento: Payment::created (type=expense)
     */
    public static function createFromExpensePayment(Payment $payment): ?JournalEntry
    {
        // 1. Buscar cuenta de la caja y del proveedor
        // 2. Crear asiento:
        //    Debito: CxP Proveedores
        //    Credito: Caja/Banco
        // 3. Post automatico
    }

    /**
     * Crear asiento desde transferencia entre cajas
     * Evento: CashRegisterTransfer::created (status=completed)
     */
    public static function createFromTransfer(CashRegisterTransfer $transfer): ?JournalEntry
    {
        // 1. Buscar cuentas de ambas cajas
        // 2. Crear asiento:
        //    Debito: Caja Destino
        //    Credito: Caja Origen
        // 3. Post automatico
    }

    /**
     * Revertir asiento (para cancelaciones)
     */
    public static function reverseEntry(JournalEntry $entry, string $reason): JournalEntry
    {
        // 1. Crear asiento inverso (debitos ↔ creditos)
        // 2. Referenciar al asiento original
        // 3. Marcar original como voided
    }

    /**
     * Validar que el periodo contable esta abierto
     */
    public static function validatePeriodOpen(int $companyId, string $date): void
    {
        $period = AccountingPeriod::where('company_id', $companyId)
            ->where('year', Carbon::parse($date)->year)
            ->where('month', Carbon::parse($date)->month)
            ->first();

        if ($period && $period->status === 'closed') {
            throw new \Exception('El periodo contable esta cerrado');
        }
    }

    /**
     * Generar balance de comprobacion
     */
    public static function trialBalance(int $companyId, string $dateFrom, string $dateTo): array
    {
        // Consultar todas las cuentas con movimientos en el rango
        // Calcular saldo anterior, movimiento del periodo, saldo final
        // Verificar que suma debitos = suma creditos
    }
}
```

---

## 4. Observers

### 4.1 `PaymentObserver`

**Archivo:** `app/Observers/PaymentObserver.php`

Es el observer principal porque el modelo `Payment` ya captura TODOS los movimientos financieros del sistema (tanto ingresos como egresos).

```php
class PaymentObserver
{
    public function created(Payment $payment): void
    {
        if ($payment->status !== 'completed') return;

        if ($payment->type === 'income') {
            AccountingService::createFromIncomePayment($payment);
        } elseif ($payment->type === 'expense') {
            AccountingService::createFromExpensePayment($payment);
        }
    }

    public function updated(Payment $payment): void
    {
        // Si se cancelo un pago, revertir el asiento contable
        if ($payment->isDirty('status') && $payment->status === 'cancelled') {
            $entry = JournalEntry::where('reference_type', Payment::class)
                ->where('reference_id', $payment->id)
                ->where('status', 'posted')
                ->first();

            if ($entry) {
                AccountingService::reverseEntry($entry, $payment->cancellation_reason ?? 'Pago cancelado');
            }
        }
    }
}
```

### 4.2 `SaleObserver`

```php
class SaleObserver
{
    public function created(Sale $sale): void
    {
        if ($sale->status === 'completed') {
            AccountingService::createFromSale($sale);
        }
    }

    public function updated(Sale $sale): void
    {
        if ($sale->isDirty('status') && $sale->status === 'cancelled') {
            $entry = JournalEntry::where('reference_type', Sale::class)
                ->where('reference_id', $sale->id)
                ->where('status', 'posted')
                ->first();

            if ($entry) {
                AccountingService::reverseEntry($entry, 'Venta cancelada');
            }
        }
    }
}
```

### 4.3 `CashRegisterTransferObserver`

```php
class CashRegisterTransferObserver
{
    public function created(CashRegisterTransfer $transfer): void
    {
        if ($transfer->status === 'completed') {
            AccountingService::createFromTransfer($transfer);
        }
    }

    public function updated(CashRegisterTransfer $transfer): void
    {
        if ($transfer->isDirty('status') && $transfer->status === 'cancelled') {
            $entry = JournalEntry::where('reference_type', CashRegisterTransfer::class)
                ->where('reference_id', $transfer->id)
                ->where('status', 'posted')
                ->first();

            if ($entry) {
                AccountingService::reverseEntry($entry, $transfer->cancellation_reason ?? 'Transferencia cancelada');
            }
        }
    }
}
```

### Registro de Observers

**Archivo:** `app/Providers/AppServiceProvider.php` (en `boot()`)

```php
public function boot(): void
{
    Sale::observe(SaleObserver::class);
    Payment::observe(PaymentObserver::class);
    CashRegisterTransfer::observe(CashRegisterTransferObserver::class);
}
```

---

## 5. Controladores API

### 5.1 `AccountingAccountController`

**Rutas:**
```php
Route::prefix('accounting-accounts')->group(function () {
    Route::get('/', [AccountingAccountController::class, 'index']);        // Listar (arbol)
    Route::post('/', [AccountingAccountController::class, 'store']);       // Crear
    Route::get('/{id}', [AccountingAccountController::class, 'show']);     // Ver detalle
    Route::put('/{id}', [AccountingAccountController::class, 'update']);   // Editar
    Route::delete('/{id}', [AccountingAccountController::class, 'destroy']); // Eliminar
    Route::get('/{id}/ledger', [AccountingAccountController::class, 'ledger']); // Libro mayor
    Route::get('/{id}/balance', [AccountingAccountController::class, 'balance']); // Saldo
});
```

### 5.2 `JournalEntryController`

**Rutas:**
```php
Route::prefix('journal-entries')->group(function () {
    Route::get('/', [JournalEntryController::class, 'index']);            // Listar (libro diario)
    Route::post('/', [JournalEntryController::class, 'store']);           // Crear manual
    Route::get('/{id}', [JournalEntryController::class, 'show']);         // Ver detalle
    Route::put('/{id}', [JournalEntryController::class, 'update']);       // Editar (solo drafts)
    Route::post('/{id}/post', [JournalEntryController::class, 'post']);   // Contabilizar
    Route::post('/{id}/void', [JournalEntryController::class, 'void']);   // Anular
});
```

### 5.3 `AccountingReportController`

**Rutas:**
```php
Route::prefix('accounting-reports')->group(function () {
    Route::get('/trial-balance', [AccountingReportController::class, 'trialBalance']);
    Route::get('/balance-sheet', [AccountingReportController::class, 'balanceSheet']);
    Route::get('/income-statement', [AccountingReportController::class, 'incomeStatement']);
    Route::get('/general-ledger', [AccountingReportController::class, 'generalLedger']);
    Route::get('/journal', [AccountingReportController::class, 'journal']);
});
```

### 5.4 `AccountingSettingsController`

**Rutas:**
```php
Route::prefix('accounting-settings')->group(function () {
    Route::get('/mappings', [AccountingSettingsController::class, 'getMappings']);
    Route::post('/cash-registers', [AccountingSettingsController::class, 'linkCashRegister']);
    Route::delete('/cash-registers/{id}', [AccountingSettingsController::class, 'unlinkCashRegister']);
    Route::post('/suppliers', [AccountingSettingsController::class, 'linkSupplier']);
    Route::delete('/suppliers/{id}', [AccountingSettingsController::class, 'unlinkSupplier']);
    Route::post('/sale-types', [AccountingSettingsController::class, 'configureSaleType']);
});
```

### 5.5 `AccountingPeriodController`

**Rutas:**
```php
Route::prefix('accounting-periods')->group(function () {
    Route::get('/', [AccountingPeriodController::class, 'index']);
    Route::post('/{id}/close', [AccountingPeriodController::class, 'close']);
    Route::post('/{id}/reopen', [AccountingPeriodController::class, 'reopen']);
});
```

---

## 6. Permisos (PermissionSeeder)

```php
// Modulo: Contabilidad
['name' => 'Ver modulo contable',         'slug' => 'accounting.view',            'module' => 'accounting'],
['name' => 'Gestionar plan de cuentas',   'slug' => 'accounting.manage',          'module' => 'accounting'],
['name' => 'Crear asientos manuales',     'slug' => 'accounting.entries.create',  'module' => 'accounting'],
['name' => 'Anular asientos',             'slug' => 'accounting.entries.void',    'module' => 'accounting'],
['name' => 'Ver reportes contables',      'slug' => 'accounting.reports',         'module' => 'accounting'],
['name' => 'Gestionar periodos',          'slug' => 'accounting.periods',         'module' => 'accounting'],
['name' => 'Configurar vinculaciones',    'slug' => 'accounting.settings',        'module' => 'accounting'],
```

**Asignacion a roles:**
- `super-admin`: Todos
- `admin`: `accounting.view`, `accounting.manage`, `accounting.reports`, `accounting.settings`
- `employee` (contador): Todos excepto `accounting.settings`

---

## 7. Frontend (React + TypeScript)

### 7.1 Tipos TypeScript

```typescript
// resources/js/types/accounting.d.ts

export interface AccountingAccount {
    id: number;
    company_id: number;
    parent_id: number | null;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';
    nature: 'debit' | 'credit';
    level: number;
    is_active: boolean;
    is_parent: boolean;
    description?: string;
    children?: AccountingAccount[];
    balance?: number;
    created_at?: string;
    updated_at?: string;
}

export interface JournalEntry {
    id: number;
    company_id: number;
    branch_id?: number;
    entry_number: string;
    date: string;
    description: string;
    reference_type?: string;
    reference_id?: number;
    status: 'draft' | 'posted' | 'voided';
    total_debit: number;
    total_credit: number;
    source: 'manual' | 'auto';
    auto_source?: string;
    lines: JournalEntryLine[];
    created_by?: User;
    posted_at?: string;
    voided_at?: string;
    notes?: string;
    void_reason?: string;
    created_at?: string;
}

export interface JournalEntryLine {
    id: number;
    journal_entry_id: number;
    accounting_account_id: number;
    debit: number;
    credit: number;
    description?: string;
    account?: AccountingAccount;
}

export interface AccountingPeriod {
    id: number;
    company_id: number;
    year: number;
    month: number;
    status: 'open' | 'closed';
    closed_at?: string;
    closed_by?: User;
}

export interface TrialBalanceRow {
    account_id: number;
    account_code: string;
    account_name: string;
    account_type: string;
    previous_debit: number;
    previous_credit: number;
    period_debit: number;
    period_credit: number;
    final_debit: number;
    final_credit: number;
}

export interface AccountLedgerEntry {
    date: string;
    entry_number: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    reference_type?: string;
    reference_id?: number;
}
```

### 7.2 API Client

```typescript
// Agregar a resources/js/lib/api.ts

export const accountingApi = {
    // Plan de cuentas
    accounts: {
        getAll: async (): Promise<AccountingAccount[]> => { ... },
        getTree: async (): Promise<AccountingAccount[]> => { ... },
        getById: async (id: number): Promise<AccountingAccount> => { ... },
        create: async (data: Partial<AccountingAccount>): Promise<AccountingAccount> => { ... },
        update: async (id: number, data: Partial<AccountingAccount>): Promise<AccountingAccount> => { ... },
        delete: async (id: number): Promise<void> => { ... },
        getLedger: async (id: number, params?: { date_from?: string; date_to?: string }): Promise<AccountLedgerEntry[]> => { ... },
    },

    // Asientos contables
    entries: {
        getAll: async (params?: { ... }): Promise<JournalEntry[]> => { ... },
        getById: async (id: number): Promise<JournalEntry> => { ... },
        create: async (data: CreateJournalEntryData): Promise<JournalEntry> => { ... },
        post: async (id: number): Promise<JournalEntry> => { ... },
        void: async (id: number, reason: string): Promise<JournalEntry> => { ... },
    },

    // Reportes
    reports: {
        trialBalance: async (params: { date_from: string; date_to: string }): Promise<TrialBalanceRow[]> => { ... },
        balanceSheet: async (params: { date: string }): Promise<any> => { ... },
        incomeStatement: async (params: { date_from: string; date_to: string }): Promise<any> => { ... },
    },

    // Configuracion
    settings: {
        getMappings: async (): Promise<AccountingMappings> => { ... },
        linkCashRegister: async (accountId: number, cashRegisterId: number): Promise<void> => { ... },
        unlinkCashRegister: async (id: number): Promise<void> => { ... },
        linkSupplier: async (accountId: number, supplierId: number): Promise<void> => { ... },
        unlinkSupplier: async (id: number): Promise<void> => { ... },
        configureSaleType: async (data: SaleTypeMapping): Promise<void> => { ... },
    },

    // Periodos
    periods: {
        getAll: async (): Promise<AccountingPeriod[]> => { ... },
        close: async (id: number): Promise<AccountingPeriod> => { ... },
        reopen: async (id: number): Promise<AccountingPeriod> => { ... },
    },
};
```

### 7.3 Estructura de Paginas

```
resources/js/pages/admin/accounting/
├── index.tsx                    // Dashboard contable (resumen)
├── chart/
│   └── index.tsx                // Plan de cuentas (vista arbol)
├── journal/
│   ├── index.tsx                // Libro diario (listado de asientos)
│   └── create.tsx               // Crear asiento manual
├── ledger/
│   └── index.tsx                // Libro mayor (por cuenta)
├── reports/
│   ├── trial-balance.tsx        // Balance de comprobacion
│   ├── balance-sheet.tsx        // Balance general
│   └── income-statement.tsx     // Estado de resultados
├── periods/
│   └── index.tsx                // Gestion de periodos
└── settings/
    └── index.tsx                // Vinculaciones (cajas, proveedores, tipos)
```

---

## 8. Seeder del PUC Base

**Archivo:** `database/seeders/AccountingAccountSeeder.php`

El seeder carga un PUC basico colombiano con las cuentas mas usadas. Ejemplo parcial:

```php
$accounts = [
    // CLASE 1 - ACTIVOS
    ['code' => '1',      'name' => 'Activo',              'type' => 'asset',     'nature' => 'debit', 'level' => 1, 'is_parent' => true],
    ['code' => '11',     'name' => 'Disponible',          'type' => 'asset',     'nature' => 'debit', 'level' => 2, 'is_parent' => true],
    ['code' => '1105',   'name' => 'Caja',                'type' => 'asset',     'nature' => 'debit', 'level' => 3, 'is_parent' => true],
    ['code' => '110505', 'name' => 'Caja General',        'type' => 'asset',     'nature' => 'debit', 'level' => 4, 'is_parent' => false],
    ['code' => '110510', 'name' => 'Cajas Menores',       'type' => 'asset',     'nature' => 'debit', 'level' => 4, 'is_parent' => false],
    ['code' => '1110',   'name' => 'Bancos',              'type' => 'asset',     'nature' => 'debit', 'level' => 3, 'is_parent' => true],
    ['code' => '111005', 'name' => 'Bancos Nacionales',   'type' => 'asset',     'nature' => 'debit', 'level' => 4, 'is_parent' => false],
    ['code' => '13',     'name' => 'Deudores',            'type' => 'asset',     'nature' => 'debit', 'level' => 2, 'is_parent' => true],
    ['code' => '1305',   'name' => 'Clientes',            'type' => 'asset',     'nature' => 'debit', 'level' => 3, 'is_parent' => true],
    ['code' => '130505', 'name' => 'Clientes Nacionales', 'type' => 'asset',     'nature' => 'debit', 'level' => 4, 'is_parent' => false],
    ['code' => '14',     'name' => 'Inventarios',         'type' => 'asset',     'nature' => 'debit', 'level' => 2, 'is_parent' => true],
    ['code' => '1435',   'name' => 'Mercancias',          'type' => 'asset',     'nature' => 'debit', 'level' => 3, 'is_parent' => true],
    ['code' => '143505', 'name' => 'Mercancia no Fabricada', 'type' => 'asset',  'nature' => 'debit', 'level' => 4, 'is_parent' => false],

    // CLASE 2 - PASIVOS
    ['code' => '2',      'name' => 'Pasivo',                  'type' => 'liability', 'nature' => 'credit', 'level' => 1, 'is_parent' => true],
    ['code' => '22',     'name' => 'Proveedores',             'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true],
    ['code' => '2205',   'name' => 'Proveedores Nacionales',  'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],
    ['code' => '220505', 'name' => 'Proveedores Nacionales',  'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '23',     'name' => 'Cuentas por Pagar',       'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true],
    ['code' => '24',     'name' => 'Impuestos',               'type' => 'liability', 'nature' => 'credit', 'level' => 2, 'is_parent' => true],
    ['code' => '2408',   'name' => 'IVA',                     'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],
    ['code' => '240804', 'name' => 'IVA Generado 19%',        'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '240805', 'name' => 'IVA Descontable',         'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '2365',   'name' => 'Retencion en la Fuente',  'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],
    ['code' => '236540', 'name' => 'Rete Fuente Compras',     'type' => 'liability', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '2368',   'name' => 'Retencion ICA',           'type' => 'liability', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],

    // CLASE 4 - INGRESOS
    ['code' => '4',      'name' => 'Ingresos',                    'type' => 'revenue', 'nature' => 'credit', 'level' => 1, 'is_parent' => true],
    ['code' => '41',     'name' => 'Ingresos Operacionales',      'type' => 'revenue', 'nature' => 'credit', 'level' => 2, 'is_parent' => true],
    ['code' => '4135',   'name' => 'Comercio al por Mayor/Menor', 'type' => 'revenue', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],
    ['code' => '413535', 'name' => 'Ventas al por Mayor',         'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '413536', 'name' => 'Ventas al por Menor',         'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],
    ['code' => '4175',   'name' => 'Devoluciones en Ventas',      'type' => 'revenue', 'nature' => 'credit', 'level' => 3, 'is_parent' => true],
    ['code' => '417505', 'name' => 'Devoluciones en Ventas',      'type' => 'revenue', 'nature' => 'credit', 'level' => 4, 'is_parent' => false],

    // CLASE 5 - GASTOS
    ['code' => '5',      'name' => 'Gastos',                        'type' => 'expense', 'nature' => 'debit', 'level' => 1, 'is_parent' => true],
    ['code' => '51',     'name' => 'Gastos Operacionales Admin',    'type' => 'expense', 'nature' => 'debit', 'level' => 2, 'is_parent' => true],
    ['code' => '5120',   'name' => 'Arrendamientos',                'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false],
    ['code' => '5135',   'name' => 'Servicios',                     'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false],
    ['code' => '5195',   'name' => 'Gastos Diversos',               'type' => 'expense', 'nature' => 'debit', 'level' => 3, 'is_parent' => false],

    // CLASE 6 - COSTOS DE VENTAS
    ['code' => '6',      'name' => 'Costos de Ventas',               'type' => 'cost', 'nature' => 'debit', 'level' => 1, 'is_parent' => true],
    ['code' => '61',     'name' => 'Costo de Ventas Mercancias',     'type' => 'cost', 'nature' => 'debit', 'level' => 2, 'is_parent' => true],
    ['code' => '6135',   'name' => 'Costo Mercancia Vendida',        'type' => 'cost', 'nature' => 'debit', 'level' => 3, 'is_parent' => false],
];
```

---

## 9. Diagrama de Flujo: Observer Pipeline

```
Sale::created (status=completed)
    │
    ├──→ SaleObserver::created()
    │       └──→ AccountingService::createFromSale()
    │               ├── Buscar config sale_type → accounting_account
    │               ├── Crear JournalEntry (source=auto, auto_source=sale_created)
    │               │     ├── Linea: Debito CxC Clientes
    │               │     ├── Linea: Credito Ingresos
    │               │     └── Linea: Credito IVA (si aplica)
    │               └── Post automatico
    │
    └──→ (En SaleController ya se crean Payments)
            │
            └──→ PaymentObserver::created()
                    └──→ AccountingService::createFromIncomePayment()
                            ├── Buscar pivot cash_register → accounting_account
                            ├── Crear JournalEntry (source=auto, auto_source=payment_income)
                            │     ├── Linea: Debito Caja
                            │     └── Linea: Credito CxC Clientes
                            └── Post automatico
```

---

## 10. Consideraciones de Rendimiento

- **Indices** en `journal_entry_lines.accounting_account_id` y `journal_entries.date` para consultas de libro mayor
- **Saldos calculados** bajo demanda (no precalculados) para garantizar consistencia
- **Paginacion** en libro diario y mayor para empresas con alto volumen
- **Cache** de plan de cuentas (arbol) ya que cambia poco
- Los observers son **sincronos** por defecto; si el volumen lo requiere, se pueden mover a **queues**
