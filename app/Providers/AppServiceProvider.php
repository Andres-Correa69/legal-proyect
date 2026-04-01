<?php

namespace App\Providers;

use App\Models\AccountingAccount;
use App\Models\AccountingPeriod;
use App\Models\AdjustmentReason;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\CashRegisterTransfer;
use App\Models\Company;
use App\Models\ElectronicCreditNote;
use App\Models\ElectronicDebitNote;
use App\Models\ElectronicInvoice;
use App\Models\InventoryAdjustment;
use App\Models\InventoryPurchase;
use App\Models\InventoryTransfer;
use App\Models\JournalEntry;
use App\Models\Location;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductArea;
use App\Models\ProductCategory;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\Service;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Observers\AccountingAccountObserver;
use App\Observers\AccountingAdjustmentObserver;
use App\Observers\AccountingCashTransferObserver;
use App\Observers\AccountingPaymentObserver;
use App\Observers\AccountingPeriodObserver;
use App\Observers\AccountingPurchaseObserver;
use App\Observers\AccountingSaleObserver;
use App\Observers\AdjustmentReasonObserver;
use App\Observers\BranchObserver;
use App\Observers\CashRegisterObserver;
use App\Observers\CashRegisterSessionObserver;
use App\Observers\CashRegisterTransferActivityObserver;
use App\Observers\CompanyObserver;
use App\Observers\ElectronicCreditNoteObserver;
use App\Observers\ElectronicDebitNoteObserver;
use App\Observers\ElectronicInvoiceObserver;
use App\Observers\InventoryAdjustmentObserver;
use App\Observers\InventoryPurchaseObserver;
use App\Observers\InventoryTransferObserver;
use App\Observers\JournalEntryObserver;
use App\Observers\LocationObserver;
use App\Observers\PaymentMethodObserver;
use App\Observers\PaymentObserver;
use App\Observers\ProductAreaObserver;
use App\Observers\ProductCategoryObserver;
use App\Observers\ProductObserver;
use App\Observers\RoleObserver;
use App\Observers\InternalNoteObserver;
use App\Observers\SaleActivityObserver;
use App\Observers\SalePaymentObserver;
use App\Observers\ServiceObserver;
use App\Observers\SupplierObserver;
use App\Observers\UserObserver;
use App\Observers\WarehouseObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate limiter para API externa
        RateLimiter::for('external-api', function (Request $request) {
            return Limit::perMinute(60)->by($request->header('X-API-Key') ?? $request->ip());
        });

        // Rate limiter para endpoints del wizard de registro (generoso para no bloquear el flujo)
        RateLimiter::for('registration', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Rate limiter estricto solo para crear empresa (evitar abuso)
        RateLimiter::for('registration-complete', function (Request $request) {
            return Limit::perHour(5)->by($request->ip());
        });

        // Registrar Observers para auditoria
        // -- Configuración y Usuarios --
        Company::observe(CompanyObserver::class);
        Branch::observe(BranchObserver::class);
        User::observe(UserObserver::class);
        Role::observe(RoleObserver::class);
        PaymentMethod::observe(PaymentMethodObserver::class);
        Location::observe(LocationObserver::class);
        AdjustmentReason::observe(AdjustmentReasonObserver::class);

        // -- Inventario --
        Product::observe(ProductObserver::class);
        Service::observe(ServiceObserver::class);
        Warehouse::observe(WarehouseObserver::class);
        Supplier::observe(SupplierObserver::class);
        ProductCategory::observe(ProductCategoryObserver::class);
        ProductArea::observe(ProductAreaObserver::class);
        InventoryPurchase::observe(InventoryPurchaseObserver::class);
        InventoryTransfer::observe(InventoryTransferObserver::class);
        InventoryAdjustment::observe(InventoryAdjustmentObserver::class);

        // -- Ventas y Cartera --
        Sale::observe(SaleActivityObserver::class);
        SalePayment::observe(SalePaymentObserver::class);
        Payment::observe(PaymentObserver::class);
        \App\Models\InternalNote::observe(InternalNoteObserver::class);

        // -- Citas (Google Calendar) --
        \App\Models\Appointment::observe(\App\Observers\AppointmentObserver::class);

        // -- Cajas --
        CashRegister::observe(CashRegisterObserver::class);
        CashRegisterSession::observe(CashRegisterSessionObserver::class);
        CashRegisterTransfer::observe(CashRegisterTransferActivityObserver::class);

        // -- Contabilidad --
        AccountingAccount::observe(AccountingAccountObserver::class);
        AccountingPeriod::observe(AccountingPeriodObserver::class);
        JournalEntry::observe(JournalEntryObserver::class);

        // -- Facturación Electrónica DIAN --
        ElectronicInvoice::observe(ElectronicInvoiceObserver::class);
        ElectronicCreditNote::observe(ElectronicCreditNoteObserver::class);
        ElectronicDebitNote::observe(ElectronicDebitNoteObserver::class);

        // Registrar Observers contables (separados de auditoria)
        Sale::observe(AccountingSaleObserver::class);
        Payment::observe(AccountingPaymentObserver::class);
        CashRegisterTransfer::observe(AccountingCashTransferObserver::class);
        InventoryPurchase::observe(AccountingPurchaseObserver::class);
        InventoryAdjustment::observe(AccountingAdjustmentObserver::class);
    }
}
