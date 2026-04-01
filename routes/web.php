<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Landing page publica (presentacion del sistema)
Route::get('/', function () {
    if (auth()->check()) {
        return redirect('/admin/dashboard');
    }
    return Inertia::render('welcome');
});

// Wizard de registro de prueba gratuita (publico)
Route::get('/registro', function () {
    return Inertia::render('registration/wizard');
})->name('registration.wizard')->middleware('guest');

// Auth routes
Route::get('/login', function () {
    return Inertia::render('auth/login');
})->name('login')->middleware('guest');

// Google Calendar OAuth Callback (outside admin group - public route for OAuth redirect)
Route::get('/google-calendar/callback', function (\Illuminate\Http\Request $request) {
    return view('google-calendar.callback', [
        'success' => !$request->has('error'),
        'code' => $request->get('code'),
        'state' => $request->get('state'),
        'message' => $request->get('error', ''),
    ]);
})->name('google-calendar.callback');

// Admin routes (protected)
Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {

    // ─── Dashboard ───────────────────────────────────────────────────
    Route::get('/dashboard', function () {
        return Inertia::render('admin/dashboard');
    })->middleware('permission:dashboard.view')->name('dashboard');

    // ─── Sales / Sell ────────────────────────────────────────────────
    Route::get('/sell', function (\Illuminate\Http\Request $request) {
        return Inertia::render('admin/sell/index', [
            'invoiceNumber' => 'FACT-' . str_pad(rand(1, 9999), 6, '0', STR_PAD_LEFT),
            'draftId' => $request->query('draft') ? (int) $request->query('draft') : null,
        ]);
    })->middleware('permission:sales.create')->name('sell.index');

    Route::get('/sales', function () {
        return Inertia::render('admin/sales/index');
    })->middleware('permission:sales.view')->name('sales.index');

    Route::get('/sales/{id}', function ($id) {
        return Inertia::render('admin/sales/show', [
            'saleId' => (int) $id,
        ]);
    })->middleware('permission:sales.view')->name('sales.show');

    // ─── Cash ────────────────────────────────────────────────────────
    Route::get('/cash-registers', function () {
        return Inertia::render('admin/cash-registers/index');
    })->middleware('permission:cash-registers.view')->name('cash-registers.index');

    Route::get('/cash-transfers', function () {
        return Inertia::render('admin/cash-transfers/index');
    })->middleware('permission:cash-transfers.view')->name('cash-transfers.index');

    Route::get('/cash-transfers-history', function () {
        return Inertia::render('admin/cash-transfers/history');
    })->middleware('permission:cash-transfers.view')->name('cash-transfers-history.index');

    Route::get('/cash-reports', function () {
        return Inertia::render('admin/cash-reports/index');
    })->middleware('permission:cash-reports.view')->name('cash-reports.index');

    Route::get('/cash-closures', function () {
        return Inertia::render('admin/cash-closures/index');
    })->middleware('permission:cash-registers.view')->name('cash-closures.index');

    // ─── Analytics ───────────────────────────────────────────────────
    Route::get('/analytics', function () {
        return Inertia::render('admin/analytics/index');
    })->middleware('permission:analytics.view')->name('analytics.index');

    // ─── Service Orders (Superpoder) ─────────────────────────────────
    Route::middleware(['superpower:service_orders_enabled', 'permission:service-orders.view'])->group(function () {
        Route::get('/service-orders', function () {
            return Inertia::render('admin/service-orders/index');
        })->name('service-orders.index');

        Route::get('/service-orders/create', function () {
            return Inertia::render('admin/service-orders/create', ['pageMode' => 'create']);
        })->middleware('permission:service-orders.create')->name('service-orders.create');

        Route::get('/service-orders/{id}/edit', function ($id) {
            return Inertia::render('admin/service-orders/create', ['pageMode' => 'edit', 'entityId' => (int) $id]);
        })->middleware('permission:service-orders.manage')->name('service-orders.edit');

        Route::get('/service-orders/{id}', function ($id) {
            return Inertia::render('admin/service-orders/show', ['serviceOrderId' => (int) $id]);
        })->name('service-orders.show');
    });

    // ─── Reports ─────────────────────────────────────────────────────
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('/reports', function () {
            return Inertia::render('admin/reports/index');
        })->name('reports.index');

        Route::get('/reports/sales-products', function () {
            return Inertia::render('admin/reports/sales-products');
        })->name('reports.sales-products');

        Route::get('/reports/best-sellers', function () {
            return Inertia::render('admin/reports/best-sellers');
        })->name('reports.best-sellers');

        Route::get('/reports/top-clients', function () {
            return Inertia::render('admin/reports/top-clients');
        })->name('reports.top-clients');

        Route::get('/reports/product-profit', function () {
            return Inertia::render('admin/reports/product-profit');
        })->name('reports.product-profit');

        Route::get('/reports/monthly-growth', function () {
            return Inertia::render('admin/reports/monthly-growth');
        })->name('reports.monthly-growth');

        Route::get('/reports/tax-collection', function () {
            return Inertia::render('admin/reports/tax-collection');
        })->name('reports.tax-collection');

        Route::get('/reports/income-expenses', function () {
            return Inertia::render('admin/reports/income-expenses');
        })->name('reports.income-expenses');

        Route::get('/reports/payments', function () {
            return Inertia::render('admin/reports/payments');
        })->name('reports.payments');

        Route::get('/reports/entries', function () {
            return Inertia::render('admin/reports/entries');
        })->name('reports.entries');

        Route::get('/reports/expenses', function () {
            return Inertia::render('admin/reports/expenses');
        })->name('reports.expenses');

        Route::get('/reports/expense-distribution', function () {
            return Inertia::render('admin/reports/expense-distribution');
        })->name('reports.expense-distribution');

        Route::get('/reports/commissions', function () {
            return Inertia::render('admin/reports/commissions');
        })->name('reports.commissions');

        Route::get('/reports/inventory', function () {
            return Inertia::render('admin/reports/inventory');
        })->name('reports.inventory');

        Route::get('/reports/cost-history', function () {
            return Inertia::render('admin/reports/cost-history');
        })->name('reports.cost-history');

        Route::get('/reports/sale-price-history', function () {
            return Inertia::render('admin/reports/sale-price-history');
        })->name('reports.sale-price-history');
    });

    // ─── Balances (Cartera) ──────────────────────────────────────────
    Route::middleware('permission:payments.view')->group(function () {
        Route::get('/client-balances', function () {
            return Inertia::render('admin/client-balances/index');
        })->name('client-balances.index');

        Route::get('/balances/suppliers', function () {
            return Inertia::render('admin/balances/suppliers/index');
        })->name('balances.suppliers.index');

        Route::get('/balances/suppliers/{id}', function ($id) {
            return Inertia::render('admin/supplier-balances/show', [
                'supplierId' => (int) $id,
            ]);
        })->name('balances.suppliers.show');

        Route::get('/balances/clients', function () {
            return Inertia::render('admin/balances/clients/index');
        })->name('balances.clients.index');

        Route::get('/balances/clients/{id}', function ($id) {
            return Inertia::render('admin/client-balances/show', [
                'clientId' => (int) $id,
            ]);
        })->name('balances.clients.show');
    });

    // ─── Payments ────────────────────────────────────────────────────
    Route::middleware('permission:payments.view')->group(function () {
        Route::get('/payments', function () {
            return Inertia::render('admin/payments/index');
        })->name('payments.index');

        Route::get('/payments/income', function () {
            return Inertia::render('admin/payments/income');
        })->middleware('permission:payments.create-income')->name('payments.income');

        Route::get('/payments/expense', function () {
            return Inertia::render('admin/payments/expense');
        })->middleware('permission:payments.create-expense')->name('payments.expense');
    });

    Route::get('/payment-methods', function () {
        return Inertia::render('admin/payment-methods/index');
    })->middleware('permission:payment-methods.view')->name('payment-methods.index');

    // ─── Products ────────────────────────────────────────────────────
    Route::middleware('permission:products.view')->group(function () {
        Route::get('/products', function () {
            return Inertia::render('admin/products/index');
        })->name('products.index');

        Route::get('/products/create', function (Request $request) {
            return Inertia::render('admin/products/create', [
                'tipo' => $request->query('tipo', 'producto'),
                'mode' => 'create',
            ]);
        })->middleware('permission:products.manage')->name('products.create');

        Route::get('/products/{id}/edit', function (Request $request, $id) {
            return Inertia::render('admin/products/create', [
                'tipo' => $request->query('tipo', 'producto'),
                'mode' => 'edit',
                'entityId' => (int) $id,
            ]);
        })->middleware('permission:products.manage')->name('products.edit');

        Route::get('/products/{id}', function (Request $request, $id) {
            return Inertia::render('admin/products/show', [
                'productId' => (int) $id,
                'tipo' => $request->query('tipo', 'producto'),
            ]);
        })->name('products.show');
    });

    Route::get('/product-categories', function () {
        return Inertia::render('admin/product-categories/index');
    })->middleware('permission:categories.view')->name('product-categories.index');

    Route::get('/product-areas', function () {
        return Inertia::render('admin/product-areas/index');
    })->middleware('permission:areas.view')->name('product-areas.index');

    // Redirect old unified views to individual pages
    Route::redirect('/catalog', '/admin/product-areas');
    Route::redirect('/storage', '/admin/warehouses');

    Route::get('/inventory-operations', function () {
        return Inertia::render('admin/inventory-operations/index');
    })->middleware('permission:inventory.view')->name('inventory-operations.index');

    // ─── Inventory ───────────────────────────────────────────────────
    Route::get('/warehouses', function () {
        return Inertia::render('admin/warehouses/index');
    })->middleware('permission:warehouses.view')->name('warehouses.index');

    Route::get('/locations', function () {
        return Inertia::render('admin/locations/index');
    })->middleware('permission:locations.view')->name('locations.index');

    // ─── Price Lists ─────────────────────────────────────────────────
    Route::middleware('permission:price-lists.view')->group(function () {
        Route::get('/price-lists', function () {
            return Inertia::render('admin/price-lists/index');
        })->name('price-lists.index');

        Route::get('/price-lists/create', function () {
            return Inertia::render('admin/price-lists/create');
        })->middleware('permission:price-lists.manage')->name('price-lists.create');

        Route::get('/price-lists/{id}/edit', function ($id) {
            return Inertia::render('admin/price-lists/create', [
                'pageMode' => 'edit',
                'entityId' => (int) $id,
            ]);
        })->middleware('permission:price-lists.manage')->name('price-lists.edit');

        Route::get('/price-lists/{id}', function ($id) {
            return Inertia::render('admin/price-lists/show', [
                'priceListId' => (int) $id,
            ]);
        })->name('price-lists.show');
    });

    // ─── Suppliers ───────────────────────────────────────────────────
    Route::middleware('permission:suppliers.view')->group(function () {
        Route::get('/suppliers', function () {
            return Inertia::render('admin/suppliers/index');
        })->name('suppliers.index');

        Route::get('/suppliers/create', function () {
            return Inertia::render('admin/suppliers/create');
        })->middleware('permission:suppliers.manage')->name('suppliers.create');

        Route::get('/suppliers/{id}/edit', function ($id) {
            return Inertia::render('admin/suppliers/create', [
                'pageMode' => 'edit',
                'entityId' => (int) $id,
            ]);
        })->middleware('permission:suppliers.manage')->name('suppliers.edit');

        Route::get('/suppliers/{id}', function ($id) {
            return Inertia::render('admin/suppliers/show', [
                'supplierId' => (int) $id,
            ]);
        })->name('suppliers.show');
    });

    // ─── Inventory Purchases ─────────────────────────────────────────
    Route::middleware('permission:inventory.purchases.view')->group(function () {
        Route::get('/inventory-purchases', function () {
            return Inertia::render('admin/inventory-purchases/index');
        })->name('inventory-purchases.index');

        Route::get('/inventory-purchases/create', function () {
            return Inertia::render('admin/inventory-purchases/create');
        })->middleware('permission:inventory.purchases.manage')->name('inventory-purchases.create');

        Route::get('/inventory-purchases/import', function () {
            return Inertia::render('admin/inventory-purchases/import');
        })->middleware('permission:inventory.purchases.manage')->name('inventory-purchases.import');

        Route::get('/inventory-purchases/{id}', function ($id) {
            return Inertia::render('admin/inventory-purchases/show', ['purchaseId' => (int) $id]);
        })->name('inventory-purchases.show');
    });

    Route::get('/inventory-transfers', function () {
        return Inertia::render('admin/inventory-transfers/index');
    })->middleware('permission:inventory.transfers.view')->name('inventory-transfers.index');

    Route::get('/adjustment-reasons', function () {
        return Inertia::render('admin/adjustment-reasons/index');
    })->middleware('permission:inventory.adjustments.manage')->name('adjustment-reasons.index');

    Route::get('/inventory-adjustments', function () {
        return Inertia::render('admin/inventory-adjustments/index');
    })->middleware('permission:inventory.adjustments.view')->name('inventory-adjustments.index');

    Route::get('/inventory-movements', function () {
        return Inertia::render('admin/inventory-movements/index');
    })->middleware('permission:inventory.movements.view')->name('inventory-movements.index');

    Route::get('/inventory-reconciliations', function () {
        return Inertia::render('admin/inventory-reconciliations/index');
    })->middleware('permission:inventory.reconciliations.view')->name('inventory-reconciliations.index');

    // ─── Clients ─────────────────────────────────────────────────────
    Route::middleware('permission:clients.view')->group(function () {
        Route::get('/clients', function () {
            return Inertia::render('admin/clients/index');
        })->name('clients.index');

        Route::get('/clients/create', function () {
            return Inertia::render('admin/clients/create', [
                'mode' => 'client',
            ]);
        })->middleware('permission:clients.manage')->name('clients.create');

        Route::get('/clients/{id}/edit', function ($id) {
            return Inertia::render('admin/clients/create', [
                'mode' => 'client',
                'pageMode' => 'edit',
                'entityId' => (int) $id,
            ]);
        })->middleware('permission:clients.manage')->name('clients.edit');

        Route::get('/clients/{id}', function ($id) {
            return Inertia::render('admin/clients/show', [
                'clientId' => (int) $id,
            ]);
        })->name('clients.show');
    });

    // ─── Users & Roles ───────────────────────────────────────────────
    Route::middleware('permission:users.view')->group(function () {
        Route::get('/users', function () {
            return Inertia::render('admin/users/index');
        })->name('users.index');

        Route::get('/users/create', function () {
            return Inertia::render('admin/clients/create', [
                'mode' => 'user',
            ]);
        })->middleware('permission:users.manage')->name('users.create');

        Route::get('/users/{id}/edit', function ($id) {
            return Inertia::render('admin/clients/create', [
                'mode' => 'user',
                'pageMode' => 'edit',
                'entityId' => (int) $id,
            ]);
        })->middleware('permission:users.manage')->name('users.edit');

        Route::get('/users/bulk-salary', function () {
            return Inertia::render('admin/users/bulk-salary');
        })->middleware('permission:users.bulk-salary')->name('users.bulk-salary');

        Route::get('/users/{id}', function ($id) {
            return Inertia::render('admin/users/show', [
                'userId' => (int) $id,
            ]);
        })->name('users.show');
    });

    Route::middleware('permission:roles.view')->group(function () {
        Route::get('/roles', function () {
            return Inertia::render('admin/roles/index');
        })->name('roles.index');

        Route::get('/roles/create', function () {
            return Inertia::render('admin/roles/create');
        })->middleware('permission:roles.manage')->name('roles.create');

        Route::get('/roles/{id}', function ($id) {
            return Inertia::render('admin/roles/show', ['roleId' => (int) $id]);
        })->name('roles.show');
    });

    // ─── Companies & Branches (Super Admin) ──────────────────────────
    Route::get('/companies', function () {
        return Inertia::render('admin/companies/index');
    })->middleware('super-admin')->name('companies.index');

    Route::get('/companies/{id}', function ($id) {
        return Inertia::render('admin/companies/show', [
            'companyId' => (int) $id,
        ]);
    })->middleware('super-admin')->name('companies.show');

    Route::get('/branches', function () {
        return Inertia::render('admin/branches/index');
    })->middleware('permission:branches.view')->name('branches.index');

    // ─── Audit (Super Admin) ─────────────────────────────────────────
    Route::get('/audit-logs', function () {
        return Inertia::render('admin/audit-logs/index');
    })->middleware('super-admin')->name('audit-logs.index');

    Route::get('/sales-audit', function () {
        return Inertia::render('admin/sales-audit/index');
    })->middleware('super-admin')->name('sales-audit.index');

    // ─── Settings ────────────────────────────────────────────────────
    Route::get('/profile', function () {
        return Inertia::render('admin/settings/index');
    })->middleware('permission:settings.view')->name('settings.index');

    // My Profile (user info & password) — no specific permission needed
    Route::get('/my-profile', function () {
        return Inertia::render('admin/profile/index');
    })->name('my-profile.index');

    // Calendar
    Route::get('/calendar', function () {
        return Inertia::render('admin/calendar/index');
    })->middleware('permission:appointments.view')->name('calendar.index');

    // General Settings (company config)
    Route::get('/settings/general', function () {
        return Inertia::render('admin/settings/general');
    })->middleware('permission:settings.manage')->name('settings.general');

    Route::get('/settings/messages', function () {
        return Inertia::render('admin/settings/messages');
    })->middleware('permission:settings.manage')->name('settings.messages');

    // Security (2FA) — no specific permission needed (own account)
    Route::get('/security', function () {
        return Inertia::render('admin/security');
    })->name('security.index');

    // ─── Trash ───────────────────────────────────────────────────────
    Route::get('/trash/{type}', function (string $type) {
        $allowed = ['sales', 'clients', 'products'];
        if (!in_array($type, $allowed)) {
            abort(404);
        }
        return Inertia::render('admin/trash/index', ['type' => $type]);
    })->middleware('permission:trash.view')->name('trash.index');

    // ─── Subscriptions (Super Admin) ─────────────────────────────────
    Route::get('/subscriptions', function () {
        return Inertia::render('admin/subscriptions/index');
    })->middleware('super-admin')->name('subscriptions.index');

    // ─── Electronic Invoicing ────────────────────────────────────────
    Route::middleware('permission:electronic-invoicing.view')->group(function () {
        Route::get('/electronic-invoicing', function () {
            return Inertia::render('admin/electronic-invoicing/index');
        })->name('electronic-invoicing.index');

        Route::get('/electronic-invoicing/config', function () {
            return Inertia::render('admin/electronic-invoicing/config');
        })->middleware('permission:electronic-invoicing.config')->name('electronic-invoicing.config');

        Route::get('/electronic-invoicing/habilitacion', function () {
            return Inertia::render('admin/electronic-invoicing/habilitacion');
        })->middleware('permission:electronic-invoicing.manage')->name('electronic-invoicing.habilitacion');
    });

    // ─── Payroll ─────────────────────────────────────────────────────
    Route::middleware('permission:electronic-invoicing.view')->group(function () {
        Route::get('/payroll', function () {
            return Inertia::render('admin/payroll/index');
        })->name('payroll.index');

        Route::get('/payroll/{id}', function ($id) {
            return Inertia::render('admin/payroll/show', ['id' => (int) $id]);
        })->name('payroll.show');

        Route::get('/payroll/{payrollId}/employee/{userId}', function ($payrollId, $userId) {
            return Inertia::render('admin/payroll/edit-employee', ['payrollId' => (int) $payrollId, 'userId' => (int) $userId]);
        })->name('payroll.employee.edit');

        Route::get('/payroll/{payrollId}/employee/{userId}/detail', function ($payrollId, $userId) {
            return Inertia::render('admin/payroll/employee-detail', ['payrollId' => (int) $payrollId, 'userId' => (int) $userId]);
        })->name('payroll.employee.detail');
    });

    // ─── Accounting ──────────────────────────────────────────────────
    Route::middleware('permission:accounting.view')->group(function () {
        Route::get('/accounting/accounts', function () {
            return Inertia::render('admin/accounting/accounts/index');
        })->name('accounting.accounts.index');

        Route::get('/accounting/accounts/create', function () {
            return Inertia::render('admin/accounting/accounts/create');
        })->middleware('permission:accounting.manage')->name('accounting.accounts.create');

        Route::get('/accounting/journal-entries', function () {
            return Inertia::render('admin/accounting/journal-entries/index');
        })->name('accounting.journal-entries.index');

        Route::get('/accounting/journal-entries/create', function () {
            return Inertia::render('admin/accounting/journal-entries/create');
        })->middleware('permission:accounting.entries.create')->name('accounting.journal-entries.create');

        Route::get('/accounting/journal-entries/{id}', function ($id) {
            return Inertia::render('admin/accounting/journal-entries/show', ['entryId' => (int) $id]);
        })->name('accounting.journal-entries.show');

        Route::get('/accounting/reports', function () {
            return Inertia::render('admin/accounting/reports/index');
        })->middleware('permission:accounting.reports')->name('accounting.reports.index');

        Route::get('/accounting/reports/trial-balance', function () {
            return Inertia::render('admin/accounting/reports/trial-balance');
        })->middleware('permission:accounting.reports')->name('accounting.reports.trial-balance');

        Route::get('/accounting/reports/general-ledger', function () {
            return Inertia::render('admin/accounting/reports/general-ledger');
        })->middleware('permission:accounting.reports')->name('accounting.reports.general-ledger');

        Route::get('/accounting/reports/journal-book', function () {
            return Inertia::render('admin/accounting/reports/journal-book');
        })->middleware('permission:accounting.reports')->name('accounting.reports.journal-book');

        Route::get('/accounting/reports/income-statement', function () {
            return Inertia::render('admin/accounting/reports/income-statement');
        })->middleware('permission:accounting.reports')->name('accounting.reports.income-statement');

        Route::get('/accounting/reports/balance-sheet', function () {
            return Inertia::render('admin/accounting/reports/balance-sheet');
        })->middleware('permission:accounting.reports')->name('accounting.reports.balance-sheet');

        Route::get('/accounting/reports/account-subledger', function () {
            return Inertia::render('admin/accounting/reports/account-subledger');
        })->middleware('permission:accounting.reports')->name('accounting.reports.account-subledger');

        Route::get('/accounting/reports/third-party-subledger', function () {
            return Inertia::render('admin/accounting/reports/third-party-subledger');
        })->middleware('permission:accounting.reports')->name('accounting.reports.third-party-subledger');

        Route::get('/accounting/periods', function () {
            return Inertia::render('admin/accounting/periods/index');
        })->middleware('permission:accounting.periods')->name('accounting.periods.index');

        Route::get('/accounting/config', function () {
            return Inertia::render('admin/accounting/config/index');
        })->middleware('permission:accounting.settings')->name('accounting.config.index');

        Route::get('/accounting/third-parties', function () {
            return Inertia::render('admin/accounting/third-parties/index');
        })->middleware('permission:third-parties.view')->name('accounting.third-parties.index');

        Route::get('/accounting/third-parties/create', function () {
            return Inertia::render('admin/accounting/third-parties/create');
        })->middleware('permission:third-parties.manage')->name('accounting.third-parties.create');
    });

    // ─── Notifications & Alerts ──────────────────────────────────────
    Route::get('/notifications', function () {
        return Inertia::render('admin/notifications/index');
    })->name('notifications.index');

    Route::get('/alerts', function () {
        return Inertia::render('admin/alerts/index');
    })->middleware('permission:alerts.view')->name('alerts.index');

    // ─── Bulk Import ─────────────────────────────────────────────────
    Route::get('/bulk-import', function () {
        return Inertia::render('admin/bulk-import/index');
    })->middleware('permission:products.manage')->name('bulk-import.index');

    // ─── Chat ────────────────────────────────────────────────────────
    Route::get('/chat', function () {
        return Inertia::render('admin/chat/index');
    })->middleware('permission:chat.view')->name('chat.index');

    // ─── Soporte ─────────────────────────────────────────────────────
    Route::get('/soporte', function () {
        return Inertia::render('admin/support/Index');
    })->middleware('permission:support.view')->name('support.index');
});
