<?php

use App\Http\Controllers\Api\AccountingAccountController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AccountingConfigController;
use App\Http\Controllers\Api\AccountingPeriodController;
use App\Http\Controllers\Api\AccountingReportController;
use App\Http\Controllers\Api\AdjustmentReasonController;
use App\Http\Controllers\ElectronicInvoicingController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\TrashController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\BalanceInquiryController;
use App\Http\Controllers\Api\CashRegisterController;
use App\Http\Controllers\Api\CashRegisterSessionController;
use App\Http\Controllers\Api\CashRegisterTransferController;
use App\Http\Controllers\Api\CashReportController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\CompanySettingsController;
use App\Http\Controllers\Api\InventoryAdjustmentController;
use App\Http\Controllers\Api\InventoryMovementController;
use App\Http\Controllers\Api\InventoryPurchaseController;
use App\Http\Controllers\Api\InventoryTransferController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\PayrollEmployeeController;
use App\Http\Controllers\Api\PayrollNumberingRangeController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PriceListController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProductAreaController;
use App\Http\Controllers\Api\ProductCategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InvoiceAlertController;
use App\Http\Controllers\Api\PurchaseAlertController;
use App\Http\Controllers\Api\AnalyticsExportController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReportExportController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SalesAuditController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\ThirdPartyController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AlertRuleController;
use App\Http\Controllers\Api\BulkImportController;
use App\Http\Controllers\Api\BirthdayController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\SupportChatController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InventoryReconciliationController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\WarehouseController;
use App\Http\Controllers\Api\ServiceOrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rutas publicas de autenticacion
Route::post('/auth/login', [AuthController::class, 'login']);

// Rutas publicas de 2FA (para login)
Route::post('/2fa/send-login-code', [TwoFactorController::class, 'sendLoginCode']);
Route::post('/2fa/verify-login', [TwoFactorController::class, 'verifyLoginCode']);

// Rutas públicas de facturación electrónica (catálogos)
Route::prefix('electronic-invoicing')->group(function () {
    Route::get('/catalogs', [ElectronicInvoicingController::class, 'getCatalogs']);
    Route::post('/sync-catalogs', [ElectronicInvoicingController::class, 'syncCatalogs']);
});

// Rutas publicas de registro (prueba gratuita)
Route::prefix('registration')->group(function () {
    Route::post('/parse-rut', [RegistrationController::class, 'parseRut']);
    Route::post('/validate-company', [RegistrationController::class, 'validateCompany']);
    Route::get('/product-template', [RegistrationController::class, 'downloadProductTemplate']);
    Route::post('/import-products', [RegistrationController::class, 'importProducts']);
    Route::post('/upload-logo', [RegistrationController::class, 'uploadLogo']);
    Route::post('/upload-logo-icon', [RegistrationController::class, 'uploadLogoIcon']);
    Route::post('/complete', [RegistrationController::class, 'complete']);
});

// Rutas protegidas
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/session', [AuthController::class, 'createSession']);
    Route::get('/user', [AuthController::class, 'user']);

    // Dashboard
    Route::get('/dashboard/statistics', [DashboardController::class, 'statistics']);

    // Two-Factor Authentication
    Route::prefix('2fa')->group(function () {
        Route::get('/status', [TwoFactorController::class, 'status']);
        Route::post('/initiate-activation', [TwoFactorController::class, 'initiateActivation']);
        Route::post('/confirm-activation', [TwoFactorController::class, 'confirmActivation']);
        Route::post('/disable', [TwoFactorController::class, 'disable']);
        Route::get('/trusted-devices', [TwoFactorController::class, 'trustedDevices']);
        Route::delete('/trusted-devices/{deviceId}', [TwoFactorController::class, 'removeTrustedDevice']);
    });

    // Companies (Solo SuperAdmin)
    Route::middleware('permission:companies.view')->get('companies', [CompanyController::class, 'index']);
    Route::middleware('permission:companies.view')->get('companies/{company}', [CompanyController::class, 'show']);
    Route::middleware('super-admin')->post('companies/parse-rut', [CompanyController::class, 'parseRut']);
    Route::middleware('super-admin')->post('companies/create-from-rut', [CompanyController::class, 'createFromRut']);
    Route::middleware('super-admin')->post('branches/{branch}/rut', [CompanyController::class, 'uploadBranchRut']);
    Route::middleware('super-admin')->delete('branches/{branch}/rut', [CompanyController::class, 'deleteBranchRut']);
    Route::middleware('permission:companies.manage')->post('companies', [CompanyController::class, 'store']);
    Route::middleware('permission:companies.manage')->put('companies/{company}', [CompanyController::class, 'update']);
    Route::middleware('permission:companies.manage')->delete('companies/{company}', [CompanyController::class, 'destroy']);
    Route::middleware('super-admin')->patch('companies/{company}/toggle-active', [CompanyController::class, 'toggleActive']);
    Route::middleware('super-admin')->post('companies/{company}/toggle-superpower', [CompanyController::class, 'toggleSuperpower']);
    Route::middleware('super-admin')->get('companies/{company}/summary', [CompanyController::class, 'summary']);

    // Branches
    Route::middleware('permission:branches.switch')->post('branches/switch', [BranchController::class, 'switchBranch']);
    Route::middleware('permission:branches.view')->get('branches', [BranchController::class, 'index']);
    Route::middleware('permission:branches.view')->get('branches/{branch}', [BranchController::class, 'show']);
    Route::middleware('permission:branches.manage')->post('branches', [BranchController::class, 'store']);
    Route::middleware('permission:branches.manage')->put('branches/{branch}', [BranchController::class, 'update']);
    Route::middleware('permission:branches.manage')->delete('branches/{branch}', [BranchController::class, 'destroy']);
    Route::middleware('super-admin')->patch('branches/{branch}/toggle-active', [BranchController::class, 'toggleActive']);

    // Users
    Route::middleware('permission:users.view')->get('users', [UserController::class, 'index']);
    Route::middleware('permission:users.bulk-salary')->post('users/bulk-salary-update', [UserController::class, 'bulkSalaryUpdate']);
    Route::middleware('permission:users.view')->get('users/payroll-config', [UserController::class, 'getPayrollConfig']);
    Route::middleware('permission:users.view')->get('users/{user}', [UserController::class, 'show']);
    Route::middleware('permission:users.manage')->post('users', [UserController::class, 'store']);
    Route::middleware('permission:users.manage')->put('users/{user}', [UserController::class, 'update']);
    Route::middleware('permission:users.manage')->delete('users/{user}', [UserController::class, 'destroy']);
    Route::middleware('permission:users.manage')->post('users/{user}/avatar', [UserController::class, 'uploadAvatar']);
    Route::middleware('permission:users.manage')->delete('users/{user}/avatar', [UserController::class, 'deleteAvatar']);
    Route::middleware('permission:users.manage')->post('users/{user}/signature', [UserController::class, 'uploadSignature']);
    Route::middleware('permission:users.manage')->delete('users/{user}/signature', [UserController::class, 'deleteSignature']);

    // Clients
    Route::middleware('permission:clients.view')->get('clients', [ClientController::class, 'index']);
    Route::middleware('permission:clients.view')->get('clients/{client}', [ClientController::class, 'show']);
    Route::middleware('permission:clients.manage')->post('clients', [ClientController::class, 'store']);
    Route::middleware('permission:clients.manage')->put('clients/{client}', [ClientController::class, 'update']);
    Route::middleware('permission:clients.manage')->delete('clients/{client}', [ClientController::class, 'destroy']);

    // Roles
    Route::middleware('permission:roles.view')->get('roles', [RoleController::class, 'index']);
    Route::middleware('permission:roles.view')->get('roles/{role}', [RoleController::class, 'show']);
    Route::middleware('permission:roles.manage')->post('roles', [RoleController::class, 'store']);
    Route::middleware('permission:roles.manage')->put('roles/{role}', [RoleController::class, 'update']);
    Route::middleware('permission:roles.manage')->delete('roles/{role}', [RoleController::class, 'destroy']);
    Route::middleware('permission:roles.manage')->post('roles/{role}/assign-permissions', [RoleController::class, 'assignPermissions']);

    // Permissions (solo lectura, accesible para quienes gestionan roles)
    Route::middleware('permission:roles.view')->get('permissions', [PermissionController::class, 'index']);
    Route::middleware('permission:roles.view')->get('permissions/grouped', [PermissionController::class, 'grouped']);

    // Cash Registers
    Route::middleware('permission:cash-registers.view')->get('cash-registers', [CashRegisterController::class, 'index']);
    Route::middleware('permission:cash-registers.view')->get('cash-registers/{cashRegister}', [CashRegisterController::class, 'show']);
    Route::middleware('permission:cash-registers.manage')->post('cash-registers', [CashRegisterController::class, 'store']);
    Route::middleware('permission:cash-registers.manage')->put('cash-registers/{cashRegister}', [CashRegisterController::class, 'update']);
    Route::middleware('permission:cash-registers.manage')->delete('cash-registers/{cashRegister}', [CashRegisterController::class, 'destroy']);

    // Cash Register Sessions
    Route::middleware('permission:cash-registers.view')->get('cash-sessions', [CashRegisterSessionController::class, 'index']);
    Route::middleware('permission:cash-registers.view')->get('cash-sessions/{session}', [CashRegisterSessionController::class, 'show']);
    Route::middleware('permission:cash-registers.open')->post('cash-registers/{cashRegister}/open', [CashRegisterSessionController::class, 'open']);
    Route::middleware('permission:cash-registers.close')->post('cash-sessions/{session}/close', [CashRegisterSessionController::class, 'close']);
    Route::middleware('permission:cash-registers.view')->get('cash-sessions/{session}/summary', [CashRegisterSessionController::class, 'summary']);
    Route::middleware('permission:cash-registers.view')->get('cash-registers/{cashRegister}/current-session', [CashRegisterSessionController::class, 'current']);

    // Cash Register Transfers
    Route::middleware('permission:cash-transfers.view')->get('cash-transfers', [CashRegisterTransferController::class, 'index']);
    Route::middleware('permission:cash-transfers.view')->get('cash-transfers/{transfer}', [CashRegisterTransferController::class, 'show']);
    Route::middleware('permission:cash-transfers.create')->post('cash-transfers', [CashRegisterTransferController::class, 'store']);
    Route::middleware('permission:cash-transfers.cancel')->post('cash-transfers/{transfer}/cancel', [CashRegisterTransferController::class, 'cancel']);

    // Payment Methods
    Route::middleware('permission:payment-methods.view')->get('payment-methods', [PaymentMethodController::class, 'index']);
    Route::middleware('permission:payment-methods.view')->get('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'show']);
    Route::middleware('permission:payment-methods.manage')->post('payment-methods', [PaymentMethodController::class, 'store']);
    Route::middleware('permission:payment-methods.manage')->put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
    Route::middleware('permission:payment-methods.manage')->delete('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);

    // Payments
    // IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
    Route::middleware('permission:payments.view')->get('payments', [PaymentController::class, 'index']);
    Route::middleware('permission:payments.create-income')->get('payments/sales-pending', [PaymentController::class, 'salesWithPendingBalance']);
    Route::middleware('permission:payments.create-expense')->get('payments/purchases-pending', [PaymentController::class, 'purchasesWithPendingBalance']);
    Route::middleware('permission:payments.create-income')->post('payments/income', [PaymentController::class, 'storeIncome']);
    Route::middleware('permission:payments.create-expense')->post('payments/expense', [PaymentController::class, 'storeExpense']);
    Route::middleware('permission:payments.create-expense')->post('payments/expense-free', [PaymentController::class, 'storeFreeExpense']);
    Route::middleware('permission:payments.view')->get('payments/{payment}', [PaymentController::class, 'show']);
    Route::middleware('permission:payments.manage')->post('payments/{payment}/cancel', [PaymentController::class, 'cancel']);
    Route::middleware('permission:payments.view')->get('purchases/{purchase}/payment-summary', [PaymentController::class, 'purchaseSummary']);

    // Balances (Consulta de Saldos)
    // IMPORTANTE: rutas específicas ANTES de rutas con parámetros dinámicos
    Route::middleware('permission:payments.view')->post('balances/clients/export', [BalanceInquiryController::class, 'exportClients']);
    Route::middleware('permission:payments.view')->post('balances/suppliers/export', [BalanceInquiryController::class, 'exportSuppliers']);
    Route::middleware('permission:payments.view')->get('balances/suppliers', [BalanceInquiryController::class, 'suppliers']);
    Route::middleware('permission:payments.view')->get('balances/suppliers/{supplier}', [BalanceInquiryController::class, 'supplier']);
    Route::middleware('permission:payments.view')->get('balances/clients', [BalanceInquiryController::class, 'clients']);
    Route::middleware('permission:payments.view')->get('balances/clients/{client}', [BalanceInquiryController::class, 'client']);
    Route::middleware('permission:payments.view')->get('balances/summary', [BalanceInquiryController::class, 'summary']);
    Route::middleware('permission:payments.create-income')->post('balances/sales/payment', [BalanceInquiryController::class, 'registerSalePayment']);
    Route::middleware('permission:payments.view')->get('balances/clients/{client}/export', [BalanceInquiryController::class, 'exportClientBalance']);

    // Cash Reports
    Route::middleware('permission:cash-reports.view')->get('cash-reports/cash-flow', [CashReportController::class, 'cashFlow']);
    Route::middleware('permission:cash-reports.view')->get('cash-reports/by-register/{cashRegister}', [CashReportController::class, 'byRegister']);
    Route::middleware('permission:cash-reports.view')->get('cash-reports/global', [CashReportController::class, 'global']);
    Route::middleware('permission:cash-reports.export')->post('cash-reports/export', [CashReportController::class, 'export']);

    // Reports
    Route::middleware('permission:sales.view')->get('reports/sales-products', [ReportController::class, 'salesByProduct']);
    Route::middleware('permission:sales.view')->get('reports/sales-products/{productId}/invoices', [ReportController::class, 'salesByProductInvoices']);
    Route::middleware('permission:sales.view')->get('reports/best-sellers', [ReportController::class, 'bestSellers']);
    Route::middleware('permission:sales.view')->get('reports/top-clients', [ReportController::class, 'topClients']);
    Route::middleware('permission:sales.view')->get('reports/product-profit', [ReportController::class, 'productProfit']);
    Route::middleware('permission:sales.view')->get('reports/monthly-growth', [ReportController::class, 'monthlyGrowth']);
    Route::middleware('permission:sales.view')->get('reports/tax-collection', [ReportController::class, 'taxCollection']);
    Route::middleware('permission:sales.view')->get('reports/income-expenses', [ReportController::class, 'incomeExpenses']);
    Route::middleware('permission:sales.view')->get('reports/income-expenses/detail', [ReportController::class, 'incomeExpensesDetail']);
    Route::middleware('permission:sales.view')->get('reports/payments', [ReportController::class, 'payments']);
    Route::middleware('permission:sales.view')->get('reports/entries', [ReportController::class, 'entries']);
    Route::middleware('permission:sales.view')->get('reports/expenses', [ReportController::class, 'expenses']);
    Route::middleware('permission:sales.view')->get('reports/expense-distribution', [ReportController::class, 'expenseDistribution']);
    Route::middleware('permission:sales.view')->get('reports/commissions', [ReportController::class, 'commissions']);
    Route::middleware('permission:inventory.view')->get('reports/inventory', [ReportController::class, 'inventoryReport']);
    Route::middleware('permission:inventory.view')->get('reports/cost-history', [ReportController::class, 'costHistory']);
    Route::middleware('permission:inventory.view')->get('reports/sale-price-history', [ReportController::class, 'salePriceHistory']);

    // Analytics Export
    Route::middleware('permission:analytics.export')->post('reports/analytics/export', [AnalyticsExportController::class, 'export']);

    // Generic Report Export (PDF/Excel)
    Route::middleware('permission:sales.view')->post('reports/export', [ReportExportController::class, 'export']);

    // Product Categories
    Route::middleware('permission:categories.view')->get('product-categories', [ProductCategoryController::class, 'index']);
    Route::middleware('permission:categories.view')->get('product-categories/{productCategory}', [ProductCategoryController::class, 'show']);
    Route::middleware('permission:categories.manage')->post('product-categories', [ProductCategoryController::class, 'store']);
    Route::middleware('permission:categories.manage')->put('product-categories/{productCategory}', [ProductCategoryController::class, 'update']);
    Route::middleware('permission:categories.manage')->delete('product-categories/{productCategory}', [ProductCategoryController::class, 'destroy']);

    // Product Areas
    Route::middleware('permission:areas.view')->get('product-areas', [ProductAreaController::class, 'index']);
    Route::middleware('permission:areas.view')->get('product-areas/{productArea}', [ProductAreaController::class, 'show']);
    Route::middleware('permission:areas.manage')->post('product-areas', [ProductAreaController::class, 'store']);
    Route::middleware('permission:areas.manage')->put('product-areas/{productArea}', [ProductAreaController::class, 'update']);
    Route::middleware('permission:areas.manage')->delete('product-areas/{productArea}', [ProductAreaController::class, 'destroy']);

    // Products
    Route::middleware('permission:products.view')->get('products', [ProductController::class, 'index']);
    Route::middleware('permission:products.view')->get('products/low-stock', [ProductController::class, 'lowStock']);
    Route::middleware('permission:products.bulk-price-adjust')->get('products/filter-options', [ProductController::class, 'getFilterOptions']);
    Route::middleware('permission:products.bulk-price-adjust')->post('products/bulk-price-adjust', [ProductController::class, 'bulkPriceAdjust']);
    Route::middleware('permission:products.manage')->get('products/next-sku', [ProductController::class, 'nextSku']);
    Route::middleware('permission:products.view')->get('products/{product}', [ProductController::class, 'show']);
    Route::middleware('permission:products.manage')->post('products', [ProductController::class, 'store']);
    Route::middleware('permission:products.manage')->put('products/{product}', [ProductController::class, 'update']);
    Route::middleware('permission:products.manage')->delete('products/{product}', [ProductController::class, 'destroy']);
    Route::middleware('permission:products.manage')->post('products/{product}/update-stock', [ProductController::class, 'updateStock']);
    Route::middleware('permission:products.view')->get('products/{product}/analytics', [ProductController::class, 'analytics']);
    Route::middleware('permission:products.view')->get('products/{product}/change-log', [ProductController::class, 'changeLog']);
    Route::middleware('permission:products.manage')->post('products/{product}/image', [ProductController::class, 'uploadImage']);
    Route::middleware('permission:products.manage')->delete('products/{product}/image', [ProductController::class, 'deleteImage']);

    // Price Lists
    Route::middleware('permission:price-lists.view')->get('price-lists', [PriceListController::class, 'index']);
    Route::middleware('permission:price-lists.view')->get('price-lists/for-sale', [PriceListController::class, 'getItemsForSale']);
    Route::middleware('permission:price-lists.view')->get('price-lists/{priceList}', [PriceListController::class, 'show']);
    Route::middleware('permission:price-lists.manage')->post('price-lists', [PriceListController::class, 'store']);
    Route::middleware('permission:price-lists.manage')->put('price-lists/{priceList}', [PriceListController::class, 'update']);
    Route::middleware('permission:price-lists.manage')->delete('price-lists/{priceList}', [PriceListController::class, 'destroy']);
    Route::middleware('permission:price-lists.manage')->post('price-lists/{priceList}/sync-items', [PriceListController::class, 'syncItems']);
    Route::middleware('permission:price-lists.view')->get('price-lists/{priceList}/sales', [PriceListController::class, 'sales']);

    // Services
    Route::middleware('permission:services.view')->get('services', [ServiceController::class, 'index']);
    Route::middleware('permission:services.view')->get('services/categories', [ServiceController::class, 'categories']);
    Route::middleware('permission:services.view')->get('services/units', [ServiceController::class, 'units']);
    Route::middleware('permission:services.view')->get('services/{service}', [ServiceController::class, 'show']);
    Route::middleware('permission:services.manage')->post('services', [ServiceController::class, 'store']);
    Route::middleware('permission:services.manage')->put('services/{service}', [ServiceController::class, 'update']);
    Route::middleware('permission:services.manage')->delete('services/{service}', [ServiceController::class, 'destroy']);
    Route::middleware('permission:services.manage')->post('services/{service}/sync-products', [ServiceController::class, 'syncProducts']);

    // Service Orders (Superpoder: Ordenes de Servicio)
    Route::middleware('permission:service-orders.view')->get('service-orders', [ServiceOrderController::class, 'index']);
    Route::middleware('permission:service-orders.view')->get('service-orders/{serviceOrder}', [ServiceOrderController::class, 'show']);
    Route::middleware('permission:service-orders.create')->post('service-orders', [ServiceOrderController::class, 'store']);
    Route::middleware('permission:service-orders.manage')->put('service-orders/{serviceOrder}', [ServiceOrderController::class, 'update']);
    Route::middleware('permission:service-orders.manage')->delete('service-orders/{serviceOrder}', [ServiceOrderController::class, 'destroy']);
    Route::middleware('permission:service-orders.manage')->post('service-orders/{serviceOrder}/status', [ServiceOrderController::class, 'updateStatus']);
    Route::middleware('permission:service-orders.manage')->post('service-orders/{serviceOrder}/assign', [ServiceOrderController::class, 'assignTo']);
    Route::middleware('permission:service-orders.invoice')->post('service-orders/{serviceOrder}/invoice', [ServiceOrderController::class, 'convertToInvoice']);
    Route::middleware('permission:service-orders.manage')->post('service-orders/{serviceOrder}/attachments', [ServiceOrderController::class, 'addAttachment']);
    Route::middleware('permission:service-orders.manage')->delete('service-orders/attachments/{attachment}', [ServiceOrderController::class, 'removeAttachment']);

    // Quotes (Presupuestos)
    Route::middleware('permission:sales.view')->get('quotes', [QuoteController::class, 'index']);
    Route::middleware('permission:sales.view')->get('quotes/{quote}', [QuoteController::class, 'show']);
    Route::middleware('permission:sales.create')->post('quotes', [QuoteController::class, 'store']);
    Route::middleware('permission:sales.create')->put('quotes/{quote}', [QuoteController::class, 'update']);
    Route::middleware('permission:sales.manage')->patch('quotes/{quote}/status', [QuoteController::class, 'updateStatus']);
    Route::middleware('permission:sales.manage')->delete('quotes/{quote}', [QuoteController::class, 'destroy']);

    // Warehouses
    Route::middleware('permission:warehouses.view')->get('warehouses', [WarehouseController::class, 'index']);
    Route::middleware('permission:warehouses.view')->get('warehouses/{warehouse}', [WarehouseController::class, 'show']);
    Route::middleware('permission:warehouses.manage')->post('warehouses', [WarehouseController::class, 'store']);
    Route::middleware('permission:warehouses.manage')->put('warehouses/{warehouse}', [WarehouseController::class, 'update']);
    Route::middleware('permission:warehouses.manage')->delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy']);

    // Locations
    Route::middleware('permission:locations.view')->get('locations', [LocationController::class, 'index']);
    Route::middleware('permission:locations.view')->get('locations/{location}', [LocationController::class, 'show']);
    Route::middleware('permission:locations.manage')->post('locations', [LocationController::class, 'store']);
    Route::middleware('permission:locations.manage')->put('locations/{location}', [LocationController::class, 'update']);
    Route::middleware('permission:locations.manage')->delete('locations/{location}', [LocationController::class, 'destroy']);

    // Catalogs
    Route::get('municipalities', function () {
        return response()->json(\App\Models\Municipality::orderBy('name')->get(['id', 'name', 'code']));
    });
    Route::get('type-document-identifications', function () {
        return response()->json(\App\Models\TypeDocumentIdentification::orderBy('id')->get(['id', 'name', 'code']));
    });

    // Suppliers
    Route::middleware('permission:suppliers.view')->get('suppliers', [SupplierController::class, 'index']);
    Route::middleware('permission:suppliers.view')->get('suppliers/{supplier}', [SupplierController::class, 'show']);
    Route::middleware('permission:suppliers.manage')->post('suppliers', [SupplierController::class, 'store']);
    Route::middleware('permission:suppliers.manage')->put('suppliers/{supplier}', [SupplierController::class, 'update']);
    Route::middleware('permission:suppliers.manage')->delete('suppliers/{supplier}', [SupplierController::class, 'destroy']);

    // Third Parties (Otros Terceros)
    Route::middleware('permission:third-parties.view')->get('third-parties', [ThirdPartyController::class, 'index']);
    Route::middleware('permission:third-parties.view')->get('third-parties/{thirdParty}', [ThirdPartyController::class, 'show']);
    Route::middleware('permission:third-parties.manage')->post('third-parties', [ThirdPartyController::class, 'store']);
    Route::middleware('permission:third-parties.manage')->put('third-parties/{thirdParty}', [ThirdPartyController::class, 'update']);
    Route::middleware('permission:third-parties.manage')->delete('third-parties/{thirdParty}', [ThirdPartyController::class, 'destroy']);

    // Inventory Purchases
    Route::middleware('permission:inventory.purchases.manage')->post('inventory-purchases/parse-invoice', [InventoryPurchaseController::class, 'parseInvoice']);
    Route::middleware('permission:inventory.purchases.view')->get('inventory-purchases', [InventoryPurchaseController::class, 'index']);
    Route::middleware('permission:inventory.purchases.view')->get('inventory-purchases/{inventoryPurchase}', [InventoryPurchaseController::class, 'show']);
    Route::middleware('permission:inventory.purchases.manage')->post('inventory-purchases', [InventoryPurchaseController::class, 'store']);
    Route::middleware('permission:inventory.purchases.manage')->put('inventory-purchases/{inventoryPurchase}', [InventoryPurchaseController::class, 'update']);
    Route::middleware('permission:inventory.purchases.manage')->delete('inventory-purchases/{inventoryPurchase}', [InventoryPurchaseController::class, 'destroy']);
    Route::middleware('permission:inventory.purchases.approve')->post('inventory-purchases/{inventoryPurchase}/approve', [InventoryPurchaseController::class, 'approve']);
    Route::middleware('permission:inventory.purchases.receive')->post('inventory-purchases/{inventoryPurchase}/receive', [InventoryPurchaseController::class, 'receive']);
    Route::middleware('permission:inventory.purchases.manage')->post('inventory-purchases/{inventoryPurchase}/cancel', [InventoryPurchaseController::class, 'cancel']);
    Route::middleware('permission:inventory.purchases.manage')->post('inventory-purchases/{inventoryPurchase}/payments', [InventoryPurchaseController::class, 'addPayment']);
    Route::middleware('permission:inventory.purchases.view')->post('inventory-purchases/{inventoryPurchase}/receipt-acknowledgment', [ElectronicInvoicingController::class, 'createReceiptAcknowledgment']);
    Route::middleware('permission:inventory.purchases.view')->get('receipt-acknowledgments/{receiptAcknowledgment}/pdf', [ElectronicInvoicingController::class, 'downloadReceiptAcknowledgmentPdf']);
    Route::middleware('permission:inventory.purchases.view')->post('receipt-acknowledgments/{receiptAcknowledgment}/send-email', [ElectronicInvoicingController::class, 'sendReceiptAcknowledgmentEmail']);
    Route::middleware('permission:inventory.purchases.view')->post('inventory-purchases/{inventoryPurchase}/goods-receipt', [ElectronicInvoicingController::class, 'createGoodsReceipt']);
    Route::middleware('permission:inventory.purchases.view')->get('goods-receipts/{goodsReceipt}/pdf', [ElectronicInvoicingController::class, 'downloadGoodsReceiptPdf']);
    Route::middleware('permission:inventory.purchases.view')->post('goods-receipts/{goodsReceipt}/send-email', [ElectronicInvoicingController::class, 'sendGoodsReceiptEmail']);
    Route::middleware('permission:inventory.purchases.view')->post('inventory-purchases/{inventoryPurchase}/express-acceptance', [ElectronicInvoicingController::class, 'createExpressAcceptance']);
    Route::middleware('permission:inventory.purchases.view')->get('express-acceptances/{expressAcceptance}/pdf', [ElectronicInvoicingController::class, 'downloadExpressAcceptancePdf']);
    Route::middleware('permission:inventory.purchases.view')->post('express-acceptances/{expressAcceptance}/send-email', [ElectronicInvoicingController::class, 'sendExpressAcceptanceEmail']);
    Route::middleware('permission:inventory.purchases.view')->get('electronic-invoicing/saved-person', [ElectronicInvoicingController::class, 'getSavedPerson']);
    Route::middleware('permission:inventory.purchases.view')->post('inventory-purchases/{inventoryPurchase}/document-support', [ElectronicInvoicingController::class, 'createDocumentSupport']);
    Route::middleware('permission:inventory.purchases.view')->get('document-supports/{documentSupport}/pdf', [ElectronicInvoicingController::class, 'downloadDocumentSupportPdf']);
    Route::middleware('permission:inventory.purchases.view')->post('document-supports/{documentSupport}/send-email', [ElectronicInvoicingController::class, 'sendDocumentSupportEmail']);
    Route::middleware('permission:inventory.purchases.view')->post('document-supports/{documentSupport}/void', [ElectronicInvoicingController::class, 'voidDocumentSupport']);
    Route::middleware('permission:inventory.purchases.view')->get('document-supports/{documentSupport}/void-pdf', [ElectronicInvoicingController::class, 'downloadDocumentSupportVoidPdf']);

    // Inventory Transfers
    Route::middleware('permission:inventory.transfers.view')->get('inventory-transfers', [InventoryTransferController::class, 'index']);
    Route::middleware('permission:inventory.transfers.view')->get('inventory-transfers/{inventoryTransfer}', [InventoryTransferController::class, 'show']);
    Route::middleware('permission:inventory.transfers.create')->post('inventory-transfers', [InventoryTransferController::class, 'store']);
    Route::middleware('permission:inventory.transfers.create')->put('inventory-transfers/{inventoryTransfer}', [InventoryTransferController::class, 'update']);
    Route::middleware('permission:inventory.transfers.create')->delete('inventory-transfers/{inventoryTransfer}', [InventoryTransferController::class, 'destroy']);
    Route::middleware('permission:inventory.transfers.approve')->post('inventory-transfers/{inventoryTransfer}/approve', [InventoryTransferController::class, 'approve']);
    Route::middleware('permission:inventory.transfers.approve')->post('inventory-transfers/{inventoryTransfer}/reject', [InventoryTransferController::class, 'reject']);
    Route::middleware('permission:inventory.transfers.complete')->post('inventory-transfers/{inventoryTransfer}/start-transit', [InventoryTransferController::class, 'startTransit']);
    Route::middleware('permission:inventory.transfers.complete')->post('inventory-transfers/{inventoryTransfer}/complete', [InventoryTransferController::class, 'complete']);

    // Adjustment Reasons
    Route::middleware('permission:inventory.adjustments.view')->get('adjustment-reasons', [AdjustmentReasonController::class, 'index']);
    Route::middleware('permission:inventory.adjustments.view')->get('adjustment-reasons/{adjustmentReason}', [AdjustmentReasonController::class, 'show']);
    Route::middleware('permission:inventory.adjustments.manage')->post('adjustment-reasons', [AdjustmentReasonController::class, 'store']);
    Route::middleware('permission:inventory.adjustments.manage')->put('adjustment-reasons/{adjustmentReason}', [AdjustmentReasonController::class, 'update']);
    Route::middleware('permission:inventory.adjustments.manage')->delete('adjustment-reasons/{adjustmentReason}', [AdjustmentReasonController::class, 'destroy']);

    // Inventory Adjustments
    Route::middleware('permission:inventory.adjustments.view')->get('inventory-adjustments', [InventoryAdjustmentController::class, 'index']);
    Route::middleware('permission:inventory.adjustments.view')->get('inventory-adjustments/{inventoryAdjustment}', [InventoryAdjustmentController::class, 'show']);
    Route::middleware('permission:inventory.adjustments.create')->post('inventory-adjustments', [InventoryAdjustmentController::class, 'store']);
    Route::middleware('permission:inventory.adjustments.create')->put('inventory-adjustments/{inventoryAdjustment}', [InventoryAdjustmentController::class, 'update']);
    Route::middleware('permission:inventory.adjustments.create')->delete('inventory-adjustments/{inventoryAdjustment}', [InventoryAdjustmentController::class, 'destroy']);
    Route::middleware('permission:inventory.adjustments.approve')->post('inventory-adjustments/{inventoryAdjustment}/approve', [InventoryAdjustmentController::class, 'approve']);
    Route::middleware('permission:inventory.adjustments.approve')->post('inventory-adjustments/{inventoryAdjustment}/reject', [InventoryAdjustmentController::class, 'reject']);

    // Inventory Movements (solo lectura)
    Route::middleware('permission:inventory.movements.view')->get('inventory-movements', [InventoryMovementController::class, 'index']);
    Route::middleware('permission:inventory.movements.view')->get('inventory-movements/{inventoryMovement}', [InventoryMovementController::class, 'show']);

    // Inventory Reconciliations (Conciliación de Inventario)
    Route::middleware('permission:inventory.reconciliations.view')->get('inventory-reconciliations', [InventoryReconciliationController::class, 'index']);
    Route::middleware('permission:inventory.reconciliations.view')->get('inventory-reconciliations/stats', [InventoryReconciliationController::class, 'stats']);
    Route::middleware('permission:inventory.reconciliations.view')->get('inventory-reconciliations/{inventoryReconciliation}', [InventoryReconciliationController::class, 'show']);
    Route::middleware('permission:inventory.reconciliations.create')->post('inventory-reconciliations', [InventoryReconciliationController::class, 'store']);
    Route::middleware('permission:inventory.reconciliations.create')->put('inventory-reconciliations/{inventoryReconciliation}', [InventoryReconciliationController::class, 'update']);
    Route::middleware('permission:inventory.reconciliations.create')->delete('inventory-reconciliations/{inventoryReconciliation}', [InventoryReconciliationController::class, 'destroy']);
    Route::middleware('permission:inventory.reconciliations.count')->post('inventory-reconciliations/{inventoryReconciliation}/start-counting', [InventoryReconciliationController::class, 'startCounting']);
    Route::middleware('permission:inventory.reconciliations.count')->post('inventory-reconciliations/{inventoryReconciliation}/update-counts', [InventoryReconciliationController::class, 'updateCounts']);
    Route::middleware('permission:inventory.reconciliations.count')->post('inventory-reconciliations/{inventoryReconciliation}/finish-counting', [InventoryReconciliationController::class, 'finishCounting']);
    Route::middleware('permission:inventory.reconciliations.approve')->post('inventory-reconciliations/{inventoryReconciliation}/approve', [InventoryReconciliationController::class, 'approve']);
    Route::middleware('permission:inventory.reconciliations.approve')->post('inventory-reconciliations/{inventoryReconciliation}/reject', [InventoryReconciliationController::class, 'reject']);
    Route::middleware('permission:inventory.reconciliations.approve')->post('inventory-reconciliations/{inventoryReconciliation}/apply', [InventoryReconciliationController::class, 'apply']);
    Route::middleware('permission:inventory.reconciliations.create')->post('inventory-reconciliations/{inventoryReconciliation}/cancel', [InventoryReconciliationController::class, 'cancel']);

    // Sales (Ventas)
    Route::middleware('permission:sales.view')->get('sales', [SaleController::class, 'index']);
    Route::middleware('permission:sales.view')->get('sales/stats', [SaleController::class, 'stats']);
    Route::middleware('permission:sales.view')->get('invoice-alerts', [InvoiceAlertController::class, 'index']);
    Route::middleware('permission:inventory.purchases.view')->get('purchase-alerts', [PurchaseAlertController::class, 'index']);
    Route::middleware('permission:sales.view')->get('sales/{sale}', [SaleController::class, 'show']);
    Route::middleware('permission:sales.view')->get('sales/{sale}/pdf', [SaleController::class, 'generatePdf']);
    Route::middleware('permission:sales.create')->post('sales', [SaleController::class, 'store']);
    Route::middleware('permission:sales.create')->post('sales/draft', [SaleController::class, 'storeDraft']);
    Route::middleware('permission:sales.create')->put('sales/{sale}/draft', [SaleController::class, 'updateDraft']);
    Route::middleware('permission:sales.create')->post('sales/{sale}/finalize', [SaleController::class, 'finalizeDraft']);
    Route::middleware('permission:sales.manage')->delete('sales/{sale}/draft', [SaleController::class, 'deleteDraft']);
    Route::middleware('permission:sales.manage')->put('sales/{sale}/items', [SaleController::class, 'updateItems']);
    Route::middleware('permission:sales.manage')->post('sales/{sale}/payments', [SaleController::class, 'addPayment']);
    Route::middleware('permission:sales.manage')->post('sales/{sale}/cancel', [SaleController::class, 'cancel']);
    Route::middleware('permission:sales.view')->post('sales/{sale}/send-email', [SaleController::class, 'sendEmail']);
    Route::middleware('permission:sales.manage')->patch('sales/{sale}/due-date', [SaleController::class, 'updateDueDate']);

    // Internal Notes (Notas Crédito/Débito Internas)
    Route::middleware('permission:sales.manage')->get('sales/{sale}/internal-notes', [\App\Http\Controllers\Api\InternalNoteController::class, 'index']);
    Route::middleware('permission:sales.manage')->post('sales/{sale}/internal-notes', [\App\Http\Controllers\Api\InternalNoteController::class, 'store']);
    Route::middleware('permission:sales.manage')->post('internal-notes/{internalNote}/cancel', [\App\Http\Controllers\Api\InternalNoteController::class, 'cancel']);

    // Audit Logs (Solo SuperAdmin)
    Route::middleware('permission:audit-logs.view')->get('audit-logs', [AuditLogController::class, 'index']);
    Route::middleware('permission:audit-logs.view')->get('audit-logs/{activityLog}', [AuditLogController::class, 'show']);

    // Sales Audit (Solo SuperAdmin)
    Route::middleware('permission:sales-audit.view')->get('sales-audit', [SalesAuditController::class, 'index']);

    // User summary, commissions, and history
    Route::middleware('permission:users.view')->get('users/{user}/summary', [UserController::class, 'userSummary']);
    Route::middleware('permission:users.view')->get('users/{user}/commissions', [UserController::class, 'userCommissions']);
    Route::middleware('permission:users.manage')->patch('users/{user}/commissions/{sale}/toggle-paid', [UserController::class, 'toggleCommissionPaid']);
    Route::middleware('permission:users.view')->get('users/{user}/history', [UserController::class, 'userHistory']);

    // Alert Rules (Alertas configurables)
    Route::middleware('permission:alerts.view')->get('alert-rules', [AlertRuleController::class, 'index']);
    Route::middleware('permission:alerts.view')->get('alert-rules/stats', [AlertRuleController::class, 'stats']);
    Route::middleware('permission:alerts.view')->get('alert-rules/recent-logs', [AlertRuleController::class, 'recentLogs']);
    Route::middleware('permission:alerts.manage')->post('alert-rules', [AlertRuleController::class, 'store']);
    Route::middleware('permission:alerts.view')->get('alert-rules/{alertRule}', [AlertRuleController::class, 'show']);
    Route::middleware('permission:alerts.manage')->put('alert-rules/{alertRule}', [AlertRuleController::class, 'update']);
    Route::middleware('permission:alerts.manage')->delete('alert-rules/{alertRule}', [AlertRuleController::class, 'destroy']);
    Route::middleware('permission:alerts.manage')->post('alert-rules/{alertRule}/toggle', [AlertRuleController::class, 'toggleActive']);
    Route::middleware('permission:alerts.manage')->post('alert-rules/{alertRule}/test', [AlertRuleController::class, 'test']);
    Route::middleware('permission:alerts.view')->get('alert-rules/{alertRule}/logs', [AlertRuleController::class, 'logs']);

    // Trash (Papelera de reciclaje)
    Route::middleware('permission:trash.view')->get('trash', [TrashController::class, 'index']);
    Route::middleware('permission:trash.restore')->post('trash/{type}/{id}/restore', [TrashController::class, 'restore']);

    // Profile
    Route::put('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'updatePassword']);

    // Company Settings
    Route::middleware('permission:settings.manage')->get('company-settings', [CompanySettingsController::class, 'show']);
    Route::middleware('permission:settings.manage')->put('company-settings', [CompanySettingsController::class, 'update']);
    Route::middleware('permission:settings.manage')->post('company-settings/logo', [CompanySettingsController::class, 'uploadLogo']);
    Route::middleware('permission:settings.manage')->delete('company-settings/logo', [CompanySettingsController::class, 'deleteLogo']);
    Route::get('company-settings/logo/proxy', [CompanySettingsController::class, 'proxyLogo']);
    Route::middleware('permission:settings.manage')->post('company-settings/logo-icon', [CompanySettingsController::class, 'uploadLogoIcon']);
    Route::middleware('permission:settings.manage')->delete('company-settings/logo-icon', [CompanySettingsController::class, 'deleteLogoIcon']);
    Route::middleware('permission:settings.manage')->post('company-settings/birthday-image', [CompanySettingsController::class, 'uploadBirthdayImage']);
    Route::middleware('permission:settings.manage')->delete('company-settings/birthday-image', [CompanySettingsController::class, 'deleteBirthdayImage']);

    // Electronic Invoicing
    Route::prefix('electronic-invoicing')->group(function () {
        // Ver estado, enviar facturas, descargar PDF, anular (asignable a cualquier rol)
        Route::middleware('permission:electronic-invoicing.view')->group(function () {
            Route::get('/status', [ElectronicInvoicingController::class, 'status']);

            // SOENAC Status endpoints
            Route::post('/check-status', [ElectronicInvoicingController::class, 'checkDocumentStatus']);
            Route::post('/status/zip/{zipKey}', [ElectronicInvoicingController::class, 'checkZipStatus']);
            Route::post('/status/document-information/{uuid}', [ElectronicInvoicingController::class, 'getDocumentInformation']);
            Route::post('/status/number-range/{uuid}', [ElectronicInvoicingController::class, 'getNumberRangeStatus']);
            Route::post('/status/xml/{uuid}', [ElectronicInvoicingController::class, 'getDocumentXml']);
            Route::post('/status/notes/{uuid}', [ElectronicInvoicingController::class, 'getDocumentNotes']);
            Route::post('/status/events/{uuid}', [ElectronicInvoicingController::class, 'getDocumentEvents']);
            Route::post('/status/acquirer', [ElectronicInvoicingController::class, 'getAcquirerData']);

            Route::post('/invoice', [ElectronicInvoicingController::class, 'sendInvoice']);
            Route::post('/sales/{sale}/generate', [ElectronicInvoicingController::class, 'generateFromSale']);
            Route::post('/sales/{sale}/generate-pos', [ElectronicInvoicingController::class, 'generatePosFromSale']);
            Route::get('/{electronicInvoice}/pdf', [ElectronicInvoicingController::class, 'downloadPdf']);
            Route::post('/{electronicInvoice}/void', [ElectronicInvoicingController::class, 'voidInvoice']);
            Route::get('/credit-notes/{electronicCreditNote}/pdf', [ElectronicInvoicingController::class, 'downloadCreditNotePdf']);
            Route::post('/{electronicInvoice}/debit-note', [ElectronicInvoicingController::class, 'createDebitNote']);
            Route::post('/{electronicInvoice}/adjustment-credit-note', [ElectronicInvoicingController::class, 'createAdjustmentCreditNote']);
            Route::get('/debit-notes/{electronicDebitNote}/pdf', [ElectronicInvoicingController::class, 'downloadDebitNotePdf']);
            // Email sending
            Route::post('/{electronicInvoice}/send-email', [ElectronicInvoicingController::class, 'sendInvoiceEmail']);
            Route::post('/credit-notes/{electronicCreditNote}/send-email', [ElectronicInvoicingController::class, 'sendCreditNoteEmail']);
            Route::post('/debit-notes/{electronicDebitNote}/send-email', [ElectronicInvoicingController::class, 'sendDebitNoteEmail']);
        });

        // Registrar y actualizar empresa en DIAN (solo admin)
        Route::middleware('permission:electronic-invoicing.manage')->group(function () {
            Route::post('/register', [ElectronicInvoicingController::class, 'register']);
            Route::put('/register', [ElectronicInvoicingController::class, 'update']);
        });

        // Configurar resolucion y consecutivos (solo admin)
        Route::middleware('permission:electronic-invoicing.config')->group(function () {
            Route::get('/config', [ElectronicInvoicingController::class, 'getConfig']);
            Route::put('/config', [ElectronicInvoicingController::class, 'updateConfig']);
            Route::get('/resolutions', [ElectronicInvoicingController::class, 'getResolutions']);
        });

        // Nómina electrónica
        Route::middleware('permission:electronic-invoicing.view')->post('/payroll', [ElectronicInvoicingController::class, 'sendPayroll']);

        // Nómina electrónica - gestión de lotes
        Route::prefix('payrolls')->middleware('permission:electronic-invoicing.view')->group(function () {
            Route::get('/catalogs', [PayrollController::class, 'getCatalogs']);
            Route::get('/', [PayrollController::class, 'index']);
            Route::post('/', [PayrollController::class, 'store']);
            Route::get('/{payroll}', [PayrollController::class, 'show']);

            // Detalle de empleado (devengados y deducciones)
            Route::get('/{payroll}/employees/{user}', [PayrollEmployeeController::class, 'show']);
            Route::get('/employees/{employeeId}/previous-records', [PayrollEmployeeController::class, 'previousRecords']);
            Route::put('/employees/{payrollEmployee}/labor-data', [PayrollEmployeeController::class, 'updateLaborData']);
            Route::post('/employees/{payrollEmployee}/earnings', [PayrollEmployeeController::class, 'storeEarning']);
            Route::put('/employee-earnings/{earning}', [PayrollEmployeeController::class, 'updateEarning']);
            Route::delete('/employee-earnings/{earning}', [PayrollEmployeeController::class, 'destroyEarning']);
            Route::post('/employees/{payrollEmployee}/deductions', [PayrollEmployeeController::class, 'storeDeduction']);
            Route::put('/employee-deductions/{deduction}', [PayrollEmployeeController::class, 'updateDeduction']);
            Route::delete('/employee-deductions/{deduction}', [PayrollEmployeeController::class, 'destroyDeduction']);

            // Registros previos de un empleado (para copiar datos)
            Route::get('/employees/previous-records/{employeeId}', [PayrollEmployeeController::class, 'previousRecords']);

            // Envío individual de nómina
            Route::post('/{payroll}/employees/{payrollEmployee}/send', [PayrollController::class, 'sendEmployee']);

            // Anulación individual de nómina (nota de ajuste)
            Route::post('/{payroll}/employees/{payrollEmployee}/annul', [PayrollController::class, 'annulEmployee']);

            // PDF de nómina electrónica
            Route::get('/employees/{payrollEmployee}/pdf', [PayrollEmployeeController::class, 'downloadPdf']);
            Route::get('/employees/{payrollEmployee}/annulment-pdf', [PayrollEmployeeController::class, 'downloadAnnulmentPdf']);
            Route::get('/emissions/{payrollEmission}/pdf', [PayrollEmployeeController::class, 'downloadEmissionPdf']);
        });

        // Nómina electrónica - rangos de numeración
        Route::prefix('payroll-numbering-ranges')->middleware('permission:electronic-invoicing.config')->group(function () {
            Route::get('/', [PayrollNumberingRangeController::class, 'index']);
            Route::post('/', [PayrollNumberingRangeController::class, 'store']);
            Route::put('/{payrollNumberingRange}', [PayrollNumberingRangeController::class, 'update']);
            Route::delete('/{payrollNumberingRange}', [PayrollNumberingRangeController::class, 'destroy']);
        });

        // Habilitación DIAN (proceso para pasar a PDN)
        Route::prefix('habilitacion')->middleware('permission:electronic-invoicing.manage')->group(function () {
            Route::get('/status', [ElectronicInvoicingController::class, 'habilitacionStatus']);
            Route::post('/set-environment', [ElectronicInvoicingController::class, 'habilitacionSetEnvironment']);
            Route::post('/send-invoice', [ElectronicInvoicingController::class, 'habilitacionSendInvoice']);
            Route::post('/send-credit-note', [ElectronicInvoicingController::class, 'habilitacionSendCreditNote']);
            Route::post('/send-debit-note', [ElectronicInvoicingController::class, 'habilitacionSendDebitNote']);
            Route::post('/enable-production', [ElectronicInvoicingController::class, 'habilitacionEnableProduction']);
        });
    });

    // Accounting (Contabilidad)
    Route::prefix('accounting')->group(function () {
        // Chart of Accounts
        Route::middleware('permission:accounting.view')->get('accounts', [AccountingAccountController::class, 'index']);
        Route::middleware('permission:accounting.view')->get('accounts/tree', [AccountingAccountController::class, 'tree']);
        Route::middleware('permission:accounting.view')->get('accounts/leaf', [AccountingAccountController::class, 'leaf']);
        Route::middleware('permission:accounting.view')->get('accounts/{account}', [AccountingAccountController::class, 'show']);
        Route::middleware('permission:accounting.manage')->post('accounts', [AccountingAccountController::class, 'store']);
        Route::middleware('permission:accounting.manage')->put('accounts/{account}', [AccountingAccountController::class, 'update']);
        Route::middleware('permission:accounting.manage')->delete('accounts/{account}', [AccountingAccountController::class, 'destroy']);
        Route::middleware('permission:accounting.view')->post('accounts/export', [AccountingAccountController::class, 'export']);

        // Account Linkages
        Route::middleware('permission:accounting.settings')->post('accounts/{account}/link-cash-register', [AccountingAccountController::class, 'linkCashRegister']);
        Route::middleware('permission:accounting.settings')->delete('accounts/{account}/unlink-cash-register/{cashRegister}', [AccountingAccountController::class, 'unlinkCashRegister']);
        Route::middleware('permission:accounting.settings')->post('accounts/{account}/link-supplier', [AccountingAccountController::class, 'linkSupplier']);
        Route::middleware('permission:accounting.settings')->delete('accounts/{account}/unlink-supplier/{supplier}', [AccountingAccountController::class, 'unlinkSupplier']);

        // Journal Entries
        Route::middleware('permission:accounting.view')->get('journal-entries', [JournalEntryController::class, 'index']);
        Route::middleware('permission:accounting.view')->get('journal-entries/{entry}', [JournalEntryController::class, 'show']);
        Route::middleware('permission:accounting.entries.create')->post('journal-entries', [JournalEntryController::class, 'store']);
        Route::middleware('permission:accounting.entries.post')->post('journal-entries/{entry}/post', [JournalEntryController::class, 'post']);
        Route::middleware('permission:accounting.entries.void')->post('journal-entries/{entry}/void', [JournalEntryController::class, 'void']);
        Route::middleware('permission:accounting.view')->post('journal-entries/{entry}/export', [JournalEntryController::class, 'exportSingle']);
        Route::middleware('permission:accounting.view')->post('journal-entries/export', [JournalEntryController::class, 'export']);

        // Reports
        Route::middleware('permission:accounting.reports')->get('reports/trial-balance', [AccountingReportController::class, 'trialBalance']);
        Route::middleware('permission:accounting.reports')->get('reports/general-ledger', [AccountingReportController::class, 'generalLedger']);
        Route::middleware('permission:accounting.reports')->get('reports/journal-book', [AccountingReportController::class, 'journalBook']);
        Route::middleware('permission:accounting.reports')->get('reports/income-statement', [AccountingReportController::class, 'incomeStatement']);
        Route::middleware('permission:accounting.reports')->get('reports/balance-sheet', [AccountingReportController::class, 'balanceSheet']);
        Route::middleware('permission:accounting.reports')->get('reports/account-subledger', [AccountingReportController::class, 'accountSubledger']);
        Route::middleware('permission:accounting.reports')->get('reports/third-party-subledger', [AccountingReportController::class, 'thirdPartySubledger']);
        Route::middleware('permission:accounting.reports')->post('reports/third-party-subledger/export', [AccountingReportController::class, 'exportThirdPartySubledger']);
        Route::middleware('permission:accounting.reports')->post('reports/export', [AccountingReportController::class, 'exportReport']);

        // Periods
        Route::middleware('permission:accounting.view')->get('periods', [AccountingPeriodController::class, 'index']);
        Route::middleware('permission:accounting.periods')->post('periods/close', [AccountingPeriodController::class, 'close']);
        Route::middleware('permission:accounting.periods')->post('periods/{period}/reopen', [AccountingPeriodController::class, 'reopen']);

        // Configuration
        Route::middleware('permission:accounting.settings')->get('config/sale-type-accounts', [AccountingConfigController::class, 'getSaleTypeAccounts']);
        Route::middleware('permission:accounting.settings')->put('config/sale-type-accounts', [AccountingConfigController::class, 'updateSaleTypeAccounts']);
        Route::middleware('permission:accounting.settings')->get('config/cash-register-accounts', [AccountingConfigController::class, 'getCashRegisterAccounts']);
        Route::middleware('permission:accounting.settings')->get('config/supplier-accounts', [AccountingConfigController::class, 'getSupplierAccounts']);
    });

    // Appointments (Calendar)
    Route::middleware('permission:appointments.view')->get('appointments/by-date-range', [AppointmentController::class, 'byDateRange']);
    Route::middleware('permission:appointments.view')->get('appointments/upcoming', [AppointmentController::class, 'upcoming']);
    Route::middleware('permission:appointments.view')->get('appointments/types', [AppointmentController::class, 'types']);
    Route::middleware('permission:appointments.view')->get('appointments', [AppointmentController::class, 'index']);
    Route::middleware('permission:appointments.view')->get('appointments/{appointment}', [AppointmentController::class, 'show']);
    Route::middleware('permission:appointments.create')->post('appointments', [AppointmentController::class, 'store']);
    Route::middleware('permission:appointments.manage')->put('appointments/{appointment}', [AppointmentController::class, 'update']);
    Route::middleware('permission:appointments.manage')->patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
    Route::middleware('permission:appointments.manage')->delete('appointments/{appointment}', [AppointmentController::class, 'destroy']);

    // Appointment Reminders
    Route::middleware('permission:appointments.view')->get('appointment-reminders', [AppointmentController::class, 'reminders']);
    Route::middleware('permission:appointments.view')->get('appointment-reminders/count', [AppointmentController::class, 'remindersCount']);
    Route::middleware('permission:appointments.view')->post('appointment-reminders/{reminder}/read', [AppointmentController::class, 'markReminderRead']);
    Route::middleware('permission:appointments.view')->post('appointment-reminders/read-all', [AppointmentController::class, 'markAllRemindersRead']);
    Route::middleware('permission:appointments.view')->post('appointment-reminders/{reminder}/dismiss', [AppointmentController::class, 'dismissReminder']);

    // Chat (Chat interno)
    Route::prefix('chat')->group(function () {
        Route::middleware('permission:chat.view')->group(function () {
            Route::get('conversations', [ChatController::class, 'conversations']);
            Route::get('conversations/{conversation}/messages', [ChatController::class, 'messages']);
            Route::get('contacts', [ChatController::class, 'contacts']);
            Route::get('unread-count', [ChatController::class, 'unreadCount']);
        });
        Route::middleware('permission:chat.send')->group(function () {
            Route::post('conversations', [ChatController::class, 'createConversation']);
            Route::post('conversations/{conversation}/messages', [ChatController::class, 'sendMessage']);
            Route::post('conversations/{conversation}/read', [ChatController::class, 'markAsRead']);
            Route::post('conversations/{conversation}/delivered', [ChatController::class, 'markAsDelivered']);
            Route::put('conversations/{conversation}', [ChatController::class, 'updateConversation']);
            Route::post('conversations/{conversation}/participants', [ChatController::class, 'addParticipants']);
            Route::delete('conversations/{conversation}/leave', [ChatController::class, 'leaveConversation']);
            Route::delete('conversations/{conversation}', [ChatController::class, 'deleteConversation']);
            Route::delete('conversations/{conversation}/messages/{message}', [ChatController::class, 'deleteMessage']);
        });
    });

    // Soporte (Chat con administradores + Tickets)
    Route::prefix('support')->group(function () {
        Route::middleware('permission:support.view')->group(function () {
            Route::get('conversations', [SupportChatController::class, 'conversations']);
            Route::get('conversations/{conversation}/messages', [SupportChatController::class, 'messages']);
            Route::get('unread-count', [SupportChatController::class, 'unreadCount']);
            Route::get('chat', [SupportChatController::class, 'getOrCreateChat']);
            Route::get('chat/conversations', [SupportChatController::class, 'chatConversations']);
        });
        Route::middleware('permission:support.send')->group(function () {
            Route::post('conversations', [SupportChatController::class, 'createConversation']);
            Route::post('conversations/{conversation}/messages', [SupportChatController::class, 'sendMessage']);
            Route::post('conversations/{conversation}/read', [SupportChatController::class, 'markAsRead']);
            Route::post('conversations/{conversation}/close', [SupportChatController::class, 'closeConversation']);
        });
    });

    // Holidays (Días festivos)
    Route::prefix('holidays')->middleware('permission:appointments.manage')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\HolidayController::class, 'index']);
        Route::post('import', [\App\Http\Controllers\Api\HolidayController::class, 'import']);
        Route::post('remove', [\App\Http\Controllers\Api\HolidayController::class, 'remove']);
    });

    // Google Calendar
    Route::prefix('google-calendar')->middleware('permission:appointments.google_calendar')->group(function () {
        Route::get('auth-url', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'getAuthUrl']);
        Route::post('callback', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'callback']);
        Route::get('calendars', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'getCalendars']);
        Route::post('{tokenId}/disconnect', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'disconnect']);
        Route::post('sync/{appointment}', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'syncAppointment']);
        Route::get('contacts', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'getContacts']);
        Route::post('contacts/import', [\App\Http\Controllers\Api\GoogleCalendarController::class, 'importContacts']);
    });

    // Bulk Import
    Route::prefix('bulk-import')->group(function () {
        Route::get('template/{type}', [BulkImportController::class, 'template']);
        Route::post('{type}/validate', [BulkImportController::class, 'validate']);
        Route::post('{type}', [BulkImportController::class, 'import']);
    });

    // Birthdays
    Route::prefix('birthdays')->middleware('permission:clients.view')->group(function () {
        Route::get('today', [BirthdayController::class, 'today']);
        Route::get('upcoming', [BirthdayController::class, 'upcoming']);
        Route::get('stats', [BirthdayController::class, 'stats']);
        Route::get('month/{month}', [BirthdayController::class, 'byMonth']);
    });
});
