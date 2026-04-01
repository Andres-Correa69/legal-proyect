<?php

namespace App\Http\Controllers\Api;

use App\Exports\ClientBalanceExport;
use App\Exports\ClientStatementExport;
use App\Exports\SupplierBalanceExport;
use App\Http\Controllers\Controller;
use App\Models\InventoryPurchase;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\Supplier;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BalanceInquiryController extends Controller
{
    /**
     * Obtiene los IDs de empresa del usuario autenticado
     * Retorna null si es super admin (sin restricción)
     */
    private function getUserCompanyIds(Request $request): ?array
    {
        $user = $request->user();
        if ($user->isSuperAdmin()) {
            return null; // Sin restricción para super admin
        }

        $companyIds = [$user->company_id];

        // Incluir franquicias si las tiene
        if ($user->company && method_exists($user->company, 'hasFranchises') && $user->company->hasFranchises()) {
            $franchiseIds = $user->company->children()->pluck('id')->toArray();
            $companyIds = array_merge($companyIds, $franchiseIds);
        }

        return $companyIds;
    }

    /**
     * Obtiene los saldos de todos los proveedores
     * Alias para suppliers()
     */
    public function supplierBalances(Request $request): JsonResponse
    {
        return $this->suppliers($request);
    }

    /**
     * Obtiene los saldos de todos los proveedores
     */
    public function suppliers(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para consultar saldos',
                ], 403);
            }

            // Obtener IDs de empresa del usuario (null = super admin sin restricción)
            $companyIds = $this->getUserCompanyIds($request);

            $suppliersQuery = Supplier::with(['company'])
                ->where('is_active', true)
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('tax_id', 'like', "%{$search}%");
                    });
                });

            // Filtrar por empresa - obligatorio para usuarios no super admin
            if ($companyIds !== null) {
                $suppliersQuery->whereIn('company_id', $companyIds);
            } elseif ($request->company_id) {
                // Super admin puede filtrar por empresa específica si lo desea
                $suppliersQuery->where('company_id', $request->company_id);
            }

            $suppliers = $suppliersQuery->get()
                ->map(function ($supplier) use ($companyIds) {
                    // Calcular totales de compras - filtrando por empresa
                    $purchasesQuery = InventoryPurchase::where('supplier_id', $supplier->id)
                        ->where('status', '!=', 'cancelled');

                    // Aplicar filtro de empresa a las compras
                    if ($companyIds !== null) {
                        $purchasesQuery->whereIn('company_id', $companyIds);
                    }

                    $purchases = $purchasesQuery->select(
                            DB::raw('SUM(total_amount) as total_purchases'),
                            DB::raw('MAX(created_at) as last_purchase_date')
                        )
                        ->first();

                    $totalPurchases = (float)($purchases->total_purchases ?? 0);

                    // Calcular total pagado desde la tabla de pagos (fuente de verdad) - filtrando por empresa
                    $paymentsQuery = DB::table('payments')
                        ->join('inventory_purchases', function ($join) use ($supplier) {
                            $join->on('payments.reference_id', '=', 'inventory_purchases.id')
                                ->where('payments.reference_type', '=', InventoryPurchase::class)
                                ->where('inventory_purchases.supplier_id', '=', $supplier->id);
                        })
                        ->where('payments.status', 'completed')
                        ->where('payments.type', 'expense');

                    // Aplicar filtro de empresa a los pagos
                    if ($companyIds !== null) {
                        $paymentsQuery->whereIn('inventory_purchases.company_id', $companyIds);
                    }

                    $totalPaid = (float)$paymentsQuery->sum('payments.amount');

                    // Calcular saldo pendiente
                    $totalPending = max(0, $totalPurchases - $totalPaid);

                    // Obtener fecha del último pago - filtrando por empresa
                    $lastPaymentQuery = DB::table('payments')
                        ->join('inventory_purchases', function ($join) use ($supplier) {
                            $join->on('payments.reference_id', '=', 'inventory_purchases.id')
                                ->where('payments.reference_type', '=', InventoryPurchase::class)
                                ->where('inventory_purchases.supplier_id', '=', $supplier->id);
                        })
                        ->where('payments.status', 'completed');

                    // Aplicar filtro de empresa
                    if ($companyIds !== null) {
                        $lastPaymentQuery->whereIn('inventory_purchases.company_id', $companyIds);
                    }

                    $lastPayment = $lastPaymentQuery->max('payments.payment_date');

                    return [
                        'supplier_id' => $supplier->id,
                        'supplier_name' => $supplier->name,
                        'tax_id' => $supplier->tax_id,
                        'contact_name' => $supplier->contact_name,
                        'phone' => $supplier->phone,
                        'email' => $supplier->email,
                        'total_purchases' => $totalPurchases,
                        'total_paid' => $totalPaid,
                        'total_pending' => $totalPending,
                        'last_purchase_date' => $purchases->last_purchase_date,
                        'last_payment_date' => $lastPayment,
                        'payment_status' => $this->getPaymentStatus($totalPending),
                    ];
                })
                ->filter(function ($supplier) use ($request) {
                    // Filtrar por estado de pago si se especifica
                    if ($request->payment_status) {
                        return $supplier['payment_status'] === $request->payment_status;
                    }
                    // Filtrar por has_pending
                    if ($request->has_pending === 'true' || $request->has_pending === true) {
                        return $supplier['total_pending'] > 0;
                    }
                    if ($request->has_pending === 'false' || $request->has_pending === false) {
                        return $supplier['total_pending'] <= 0;
                    }
                    return true;
                })
                ->sortByDesc('total_pending')
                ->values();

            // Calcular totales generales
            $totals = [
                'total_purchases' => $suppliers->sum('total_purchases'),
                'total_paid' => $suppliers->sum('total_paid'),
                'total_pending' => $suppliers->sum('total_pending'),
                'suppliers_count' => $suppliers->count(),
                'suppliers_with_debt' => $suppliers->where('total_pending', '>', 0)->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'suppliers' => $suppliers,
                    'totals' => $totals,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los saldos de proveedores',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene el saldo de un proveedor específico
     * Alias para supplier()
     */
    public function supplierBalance(Request $request, Supplier $supplier): JsonResponse
    {
        return $this->supplier($request, $supplier);
    }

    /**
     * Obtiene el saldo de un proveedor específico
     */
    public function supplier(Request $request, Supplier $supplier): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para consultar saldos',
                ], 403);
            }

            // Obtener IDs de empresa del usuario (null = super admin sin restricción)
            $companyIds = $this->getUserCompanyIds($request);

            // Verificar que el proveedor pertenezca a la empresa del usuario
            if ($companyIds !== null && !in_array($supplier->company_id, $companyIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene acceso a este proveedor',
                ], 403);
            }

            // Obtener compras del proveedor - filtrando por empresa
            $purchasesQuery = InventoryPurchase::where('supplier_id', $supplier->id)
                ->where('status', '!=', 'cancelled')
                ->with(['warehouse', 'branch', 'createdBy'])
                ->when($companyIds !== null, function ($query) use ($companyIds) {
                    $query->whereIn('company_id', $companyIds);
                })
                ->when($request->date_from, function ($query, $dateFrom) {
                    $query->whereDate('created_at', '>=', $dateFrom);
                })
                ->when($request->date_to, function ($query, $dateTo) {
                    $query->whereDate('created_at', '<=', $dateTo);
                })
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($purchase) {
                    // Calcular total pagado desde la tabla de pagos (fuente de verdad)
                    $totalPaid = (float)DB::table('payments')
                        ->where('reference_type', InventoryPurchase::class)
                        ->where('reference_id', $purchase->id)
                        ->where('status', 'completed')
                        ->where('type', 'expense')
                        ->sum('amount');

                    $totalAmount = (float)$purchase->total_amount;
                    $balanceDue = max(0, $totalAmount - $totalPaid);

                    // Determinar estado de pago dinámicamente
                    $paymentStatus = 'pending';
                    if ($balanceDue <= 0) {
                        $paymentStatus = 'paid';
                    } elseif ($totalPaid > 0) {
                        $paymentStatus = 'partial';
                    }

                    return [
                        'id' => $purchase->id,
                        'purchase_number' => $purchase->purchase_number,
                        'date' => $purchase->created_at ? $purchase->created_at->format('Y-m-d') : null,
                        'total_amount' => $totalAmount,
                        'total_paid' => $totalPaid,
                        'balance_due' => $balanceDue,
                        'payment_status' => $paymentStatus,
                        'status' => $purchase->status,
                        'warehouse' => $purchase->warehouse?->name,
                        'branch' => $purchase->branch?->name,
                    ];
                });

            // Filtrar por estado de pago si se especifica (después de calcular)
            $purchases = $purchasesQuery->when($request->payment_status, function ($collection) use ($request) {
                return $collection->filter(function ($purchase) use ($request) {
                    return $purchase['payment_status'] === $request->payment_status;
                });
            })->values();

            // Calcular totales
            $totals = [
                'total_purchases' => $purchases->sum('total_amount'),
                'total_paid' => $purchases->sum('total_paid'),
                'total_balance_due' => $purchases->sum('balance_due'),
                'purchases_count' => $purchases->count(),
                'pending_purchases' => $purchases->where('payment_status', 'pending')->count(),
                'partial_purchases' => $purchases->where('payment_status', 'partial')->count(),
                'paid_purchases' => $purchases->where('payment_status', 'paid')->count(),
            ];

            // Obtener historial de pagos - filtrando por empresa
            $paymentsQuery = DB::table('payments')
                ->join('inventory_purchases', function ($join) use ($supplier) {
                    $join->on('payments.reference_id', '=', 'inventory_purchases.id')
                        ->where('payments.reference_type', '=', InventoryPurchase::class)
                        ->where('inventory_purchases.supplier_id', '=', $supplier->id);
                })
                ->leftJoin('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
                ->leftJoin('cash_registers', 'payments.cash_register_id', '=', 'cash_registers.id')
                ->where('payments.status', 'completed')
                ->where('payments.type', 'expense');

            // Aplicar filtro de empresa a los pagos
            if ($companyIds !== null) {
                $paymentsQuery->whereIn('inventory_purchases.company_id', $companyIds);
            }

            $payments = $paymentsQuery->select(
                    'payments.id',
                    'payments.payment_number',
                    'payments.payment_date',
                    'payments.amount',
                    'payment_methods.name as payment_method',
                    'cash_registers.name as cash_register',
                    'inventory_purchases.purchase_number'
                )
                ->orderBy('payments.payment_date', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'supplier' => [
                        'id' => $supplier->id,
                        'name' => $supplier->name,
                        'tax_id' => $supplier->tax_id,
                        'contact_name' => $supplier->contact_name,
                        'phone' => $supplier->phone,
                        'email' => $supplier->email,
                        'payment_terms' => $supplier->payment_terms,
                    ],
                    'purchases' => $purchases,
                    'payments' => $payments,
                    'totals' => $totals,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el saldo del proveedor',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene un resumen general de saldos
     */
    public function summary(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para consultar saldos',
                ], 403);
            }

            // Obtener IDs de empresa del usuario (null = super admin sin restricción)
            $companyIds = $this->getUserCompanyIds($request);

            // Resumen de proveedores - calcular desde las tablas fuente - filtrando por empresa
            $purchaseSummaryQuery = DB::table('inventory_purchases')
                ->where('status', '!=', 'cancelled');

            // Aplicar filtro de empresa
            if ($companyIds !== null) {
                $purchaseSummaryQuery->whereIn('company_id', $companyIds);
            }

            $purchaseSummary = $purchaseSummaryQuery->selectRaw('
                    COUNT(DISTINCT supplier_id) as total_suppliers,
                    COUNT(*) as total_purchases,
                    COALESCE(SUM(total_amount), 0) as total_amount
                ')
                ->first();

            // Calcular total pagado desde la tabla de pagos (fuente de verdad) - filtrando por empresa
            $paymentsQuery = DB::table('payments')
                ->join('inventory_purchases', function ($join) {
                    $join->on('payments.reference_id', '=', 'inventory_purchases.id')
                        ->where('payments.reference_type', '=', InventoryPurchase::class);
                })
                ->where('payments.status', 'completed')
                ->where('payments.type', 'expense');

            // Aplicar filtro de empresa a los pagos
            if ($companyIds !== null) {
                $paymentsQuery->whereIn('inventory_purchases.company_id', $companyIds);
            }

            $totalPaidFromPayments = (float)$paymentsQuery->sum('payments.amount');

            $supplierSummary = (object)[
                'total_suppliers' => $purchaseSummary->total_suppliers ?? 0,
                'total_purchases' => $purchaseSummary->total_purchases ?? 0,
                'total_amount' => (float)($purchaseSummary->total_amount ?? 0),
                'total_paid' => $totalPaidFromPayments,
                'balance_due' => max(0, (float)($purchaseSummary->total_amount ?? 0) - $totalPaidFromPayments),
            ];

            // Resumen por estado de pago - filtrando por empresa
            $byPaymentStatusQuery = DB::table('inventory_purchases')
                ->where('status', '!=', 'cancelled');

            // Aplicar filtro de empresa
            if ($companyIds !== null) {
                $byPaymentStatusQuery->whereIn('company_id', $companyIds);
            }

            $byPaymentStatus = $byPaymentStatusQuery->select(
                    'payment_status',
                    DB::raw('COUNT(*) as count'),
                    DB::raw('COALESCE(SUM(total_amount), 0) as total_amount'),
                    DB::raw('COALESCE(SUM(COALESCE(balance_due, total_amount)), 0) as balance_due')
                )
                ->groupBy('payment_status')
                ->get();

            // Proveedores con mayor deuda - filtrando por empresa
            $topDebtorsQuery = DB::table('suppliers')
                ->join('inventory_purchases', 'suppliers.id', '=', 'inventory_purchases.supplier_id')
                ->where('suppliers.is_active', true)
                ->where('inventory_purchases.status', '!=', 'cancelled');

            // Aplicar filtro de empresa
            if ($companyIds !== null) {
                $topDebtorsQuery->whereIn('suppliers.company_id', $companyIds)
                    ->whereIn('inventory_purchases.company_id', $companyIds);
            }

            $topDebtors = $topDebtorsQuery->select(
                    'suppliers.id',
                    'suppliers.name',
                    DB::raw('COALESCE(SUM(COALESCE(inventory_purchases.balance_due, inventory_purchases.total_amount)), 0) as balance_due')
                )
                ->groupBy('suppliers.id', 'suppliers.name')
                ->havingRaw('COALESCE(SUM(COALESCE(inventory_purchases.balance_due, inventory_purchases.total_amount)), 0) > 0')
                ->orderByDesc('balance_due')
                ->limit(10)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'supplier_summary' => [
                        'total_suppliers' => (int)($supplierSummary->total_suppliers ?? 0),
                        'total_purchases' => (int)($supplierSummary->total_purchases ?? 0),
                        'total_amount' => (float)($supplierSummary->total_amount ?? 0),
                        'total_paid' => (float)($supplierSummary->total_paid ?? 0),
                        'balance_due' => (float)($supplierSummary->balance_due ?? 0),
                    ],
                    'by_payment_status' => $byPaymentStatus,
                    'top_debtors' => $topDebtors,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error en balance summary: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el resumen de saldos',
                'error' => config('app.debug') ? $e->getMessage() : 'Error interno del servidor',
            ], 500);
        }
    }

    /**
     * Obtiene los saldos de todos los clientes basado en ventas
     */
    public function clients(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para consultar saldos',
                ], 403);
            }

            $user = $request->user();

            // Determinar los IDs de empresa a filtrar
            $companyIds = [];
            if (!$user->isSuperAdmin() && $user->company_id) {
                $companyIds = [$user->company_id];
                // Incluir franquicias si las tiene
                if ($user->company && method_exists($user->company, 'hasFranchises') && $user->company->hasFranchises()) {
                    $franchiseIds = $user->company->children()->pluck('id')->toArray();
                    $companyIds = array_merge($companyIds, $franchiseIds);
                }
            }

            // Obtener usuarios que tienen ventas como clientes
            // Usamos withoutGlobalScopes para evitar conflictos con CompanyScope
            $clientsQuery = User::query();

            // Si hay filtro de empresa, filtrar por ventas de esas empresas
            if (!empty($companyIds)) {
                $clientsQuery->whereHas('salesAsClient', function ($query) use ($companyIds) {
                    $query->withoutGlobalScopes()
                        ->whereIn('company_id', $companyIds)
                        ->where('status', '!=', 'cancelled');
                });
            } else {
                // Super admin: ver todos los clientes con ventas
                $clientsQuery->whereHas('salesAsClient', function ($query) {
                    $query->withoutGlobalScopes()
                        ->where('status', '!=', 'cancelled');
                });
            }

            $clients = $clientsQuery
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('document_id', 'like', "%{$search}%");
                    });
                })
                ->get()
                ->map(function ($client) use ($companyIds) {
                    // Calcular totales de ventas para este cliente
                    $salesQuery = Sale::withoutGlobalScopes()
                        ->where('client_id', $client->id)
                        ->where('status', '!=', 'cancelled');

                    // Filtrar por empresa si aplica
                    if (!empty($companyIds)) {
                        $salesQuery->whereIn('company_id', $companyIds);
                    }

                    $salesData = $salesQuery->select(
                            DB::raw('SUM(total_amount) as total_sales'),
                            DB::raw('SUM(COALESCE(paid_amount, 0)) as total_paid'),
                            DB::raw('SUM(COALESCE(balance, total_amount)) as balance_due'),
                            DB::raw('COUNT(*) as sales_count')
                        )
                        ->first();

                    return [
                        'client_id' => $client->id,
                        'client_name' => $client->name,
                        'document_type' => $client->document_type,
                        'document_id' => $client->document_id,
                        'email' => $client->email,
                        'phone' => $client->phone,
                        'total_sales' => (float)($salesData->total_sales ?? 0),
                        'total_paid' => (float)($salesData->total_paid ?? 0),
                        'balance_due' => (float)($salesData->balance_due ?? 0),
                        'sales_count' => (int)($salesData->sales_count ?? 0),
                        'payment_status' => $this->getPaymentStatus((float)($salesData->balance_due ?? 0)),
                    ];
                })
                ->filter(function ($client) use ($request) {
                    // Filtrar por estado de pago si se especifica
                    if ($request->payment_status) {
                        if ($request->payment_status === 'with_debt') {
                            return $client['balance_due'] > 0;
                        }
                        return $client['payment_status'] === $request->payment_status;
                    }
                    return true;
                })
                ->sortByDesc('balance_due')
                ->values();

            // Calcular totales generales
            $totals = [
                'total_sales' => $clients->sum('total_sales'),
                'total_paid' => $clients->sum('total_paid'),
                'total_balance_due' => $clients->sum('balance_due'),
                'clients_count' => $clients->count(),
                'clients_with_debt' => $clients->where('balance_due', '>', 0)->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'clients' => $clients,
                    'totals' => $totals,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los saldos de clientes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene el saldo de un cliente específico con detalle de ventas y pagos
     */
    public function client(Request $request, $clientId): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para consultar saldos',
                ], 403);
            }

            $client = User::find($clientId);

            if (!$client) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            $user = $request->user();

            // Determinar los IDs de empresa a filtrar
            $companyIds = [];
            if (!$user->isSuperAdmin() && $user->company_id) {
                $companyIds = [$user->company_id];
                if ($user->company && method_exists($user->company, 'hasFranchises') && $user->company->hasFranchises()) {
                    $franchiseIds = $user->company->children()->pluck('id')->toArray();
                    $companyIds = array_merge($companyIds, $franchiseIds);
                }
            }

            // Obtener ventas del cliente
            $salesQuery = Sale::withoutGlobalScopes()
                ->where('client_id', $client->id)
                ->where('status', '!=', 'cancelled')
                ->with(['branch', 'seller', 'items']);

            // Filtrar por empresa si aplica
            if (!empty($companyIds)) {
                $salesQuery->whereIn('company_id', $companyIds);
            }

            $sales = $salesQuery
                ->when($request->payment_status, function ($query, $status) {
                    $query->where('payment_status', $status);
                })
                ->when($request->date_from, function ($query, $dateFrom) {
                    $query->whereDate('invoice_date', '>=', $dateFrom);
                })
                ->when($request->date_to, function ($query, $dateTo) {
                    $query->whereDate('invoice_date', '<=', $dateTo);
                })
                ->orderBy('invoice_date', 'desc')
                ->get()
                ->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'invoice_number' => $sale->invoice_number,
                        'type' => $sale->type,
                        'type_label' => $sale->getTypeLabel(),
                        'date' => $sale->invoice_date->format('Y-m-d'),
                        'due_date' => $sale->due_date?->format('Y-m-d'),
                        'total_amount' => (float)$sale->total_amount,
                        'paid_amount' => (float)($sale->paid_amount ?? 0),
                        'balance' => (float)($sale->balance ?? $sale->total_amount),
                        'payment_status' => $sale->payment_status,
                        'payment_status_label' => $sale->getPaymentStatusLabel(),
                        'status' => $sale->status,
                        'branch' => $sale->branch?->name,
                        'seller' => $sale->seller?->name,
                        'items_count' => $sale->items->count(),
                    ];
                });

            // Calcular totales
            $totals = [
                'total_sales' => $sales->sum('total_amount'),
                'total_paid' => $sales->sum('paid_amount'),
                'total_balance_due' => $sales->sum('balance'),
                'sales_count' => $sales->count(),
                'pending_sales' => $sales->where('payment_status', 'pending')->count(),
                'partial_sales' => $sales->where('payment_status', 'partial')->count(),
                'paid_sales' => $sales->where('payment_status', 'paid')->count(),
            ];

            // Obtener IDs de ventas filtradas
            $saleIds = $sales->pluck('id')->toArray();

            // Obtener historial de pagos recientes solo de las ventas filtradas
            $payments = SalePayment::whereIn('sale_id', $saleIds)
                ->with(['sale:id,invoice_number', 'paymentMethod'])
                ->orderBy('payment_date', 'desc')
                ->limit(50)
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'payment_date' => $payment->payment_date->format('Y-m-d'),
                        'amount' => (float)$payment->amount,
                        'payment_method' => $payment->payment_method_name ?? $payment->paymentMethod?->name,
                        'reference' => $payment->reference,
                        'notes' => $payment->notes,
                        'invoice_number' => $payment->sale?->invoice_number,
                        'sale_id' => $payment->sale_id,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'client' => [
                        'id' => $client->id,
                        'name' => $client->name,
                        'document_type' => $client->document_type,
                        'document_id' => $client->document_id,
                        'email' => $client->email,
                        'phone' => $client->phone,
                        'address' => $client->address,
                    ],
                    'sales' => $sales,
                    'payments' => $payments,
                    'totals' => $totals,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el saldo del cliente',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Registra un pago/abono a una venta de un cliente
     */
    public function registerSalePayment(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payments.create-income')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para registrar pagos',
                ], 403);
            }

            $validated = $request->validate([
                'sale_id' => 'required|integer|exists:sales,id',
                'payment_method_id' => 'required|integer|exists:payment_methods,id',
                'amount' => 'required|numeric|min:0.01',
                'reference' => 'nullable|string|max:100',
                'notes' => 'nullable|string|max:500',
            ]);

            $sale = Sale::findOrFail($validated['sale_id']);

            $paymentService = app(\App\Services\PaymentService::class);
            $payment = $paymentService->registerIncomeFromSale(
                $sale,
                $validated['payment_method_id'],
                $validated['amount'],
                $request->user()->id,
                $validated['reference'] ?? null,
                $validated['notes'] ?? null
            );

            // Recargar la venta para obtener los datos actualizados
            $sale->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Pago registrado exitosamente',
                'data' => [
                    'payment' => [
                        'id' => $payment->id,
                        'amount' => (float)$payment->amount,
                        'payment_date' => $payment->payment_date->format('Y-m-d'),
                        'payment_method' => $payment->payment_method_name,
                        'reference' => $payment->reference,
                        'notes' => $payment->notes,
                        'invoice_number' => $sale->invoice_number,
                    ],
                    'sale' => [
                        'id' => $sale->id,
                        'invoice_number' => $sale->invoice_number,
                        'total_amount' => (float)$sale->total_amount,
                        'paid_amount' => (float)$sale->paid_amount,
                        'balance' => (float)$sale->balance,
                        'payment_status' => $sale->payment_status,
                        'payment_status_label' => $sale->getPaymentStatusLabel(),
                    ],
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Exporta los saldos de clientes en PDF o Excel
     */
    public function exportClients(Request $request): BinaryFileResponse|JsonResponse|\Illuminate\Http\Response
    {
        ini_set('memory_limit', '512M');

        try {
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para exportar saldos',
                ], 403);
            }

            $validated = $request->validate([
                'format' => 'required|in:pdf,excel',
                'search' => 'nullable|string',
                'payment_status' => 'nullable|string',
            ]);

            // Re-use the clients() logic to get data
            $clientsResponse = $this->clients($request);
            $responseData = json_decode($clientsResponse->getContent(), true);

            if (!($responseData['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al obtener los datos de clientes',
                ], 500);
            }

            $clients = $responseData['data']['clients'] ?? [];
            $totals = $responseData['data']['totals'] ?? [];

            $filename = 'saldos_clientes_' . now('America/Bogota')->format('Y-m-d_His');

            if ($validated['format'] === 'excel') {
                $export = new ClientBalanceExport($clients, $totals);
                return Excel::download($export, $filename . '.xlsx');
            }

            // PDF
            $user = auth()->user();
            $company = $user->company ?? (object) [
                'name' => 'LEGAL SISTEMA',
                'tax_id' => '',
                'address' => '',
                'city' => '',
            ];

            $pdf = Pdf::loadView('pdf.client-balances', [
                'company' => $company,
                'clients' => $clients,
                'totals' => $totals,
            ])
                ->setPaper('letter', 'portrait')
                ->setOption('isHtml5ParserEnabled', true);

            return $pdf->download($filename . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar saldos de clientes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exporta los saldos de proveedores en PDF o Excel
     */
    public function exportSuppliers(Request $request): BinaryFileResponse|JsonResponse|\Illuminate\Http\Response
    {
        ini_set('memory_limit', '512M');

        try {
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para exportar saldos',
                ], 403);
            }

            $validated = $request->validate([
                'format' => 'required|in:pdf,excel',
                'has_pending' => 'nullable',
            ]);

            // Re-use the suppliers() logic to get data
            $suppliersResponse = $this->suppliers($request);
            $responseData = json_decode($suppliersResponse->getContent(), true);

            if (!($responseData['success'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al obtener los datos de proveedores',
                ], 500);
            }

            $suppliers = $responseData['data']['suppliers'] ?? [];
            $totals = $responseData['data']['totals'] ?? [];

            $filename = 'saldos_proveedores_' . now('America/Bogota')->format('Y-m-d_His');

            if ($validated['format'] === 'excel') {
                $export = new SupplierBalanceExport($suppliers, $totals);
                return Excel::download($export, $filename . '.xlsx');
            }

            // PDF
            $user = auth()->user();
            $company = $user->company ?? (object) [
                'name' => 'LEGAL SISTEMA',
                'tax_id' => '',
                'address' => '',
                'city' => '',
            ];

            $pdf = Pdf::loadView('pdf.supplier-balances', [
                'company' => $company,
                'suppliers' => $suppliers,
                'totals' => $totals,
            ])
                ->setPaper('letter', 'portrait')
                ->setOption('isHtml5ParserEnabled', true);

            return $pdf->download($filename . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar saldos de proveedores',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exporta el estado de cuenta de un cliente a Excel
     */
    public function exportClientBalance(Request $request, $clientId)
    {
        try {
            if (!$request->user()->hasPermission('payments.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para exportar',
                ], 403);
            }

            $client = User::find($clientId);

            if (!$client) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente no encontrado',
                ], 404);
            }

            $user = $request->user();
            $companyIds = [];
            if (!$user->isSuperAdmin() && $user->company_id) {
                $companyIds = [$user->company_id];
                if ($user->company && method_exists($user->company, 'hasFranchises') && $user->company->hasFranchises()) {
                    $franchiseIds = $user->company->children()->pluck('id')->toArray();
                    $companyIds = array_merge($companyIds, $franchiseIds);
                }
            }

            // Obtener ventas
            $salesQuery = Sale::withoutGlobalScopes()
                ->where('client_id', $client->id)
                ->where('status', '!=', 'cancelled')
                ->with(['branch', 'seller']);

            if (!empty($companyIds)) {
                $salesQuery->whereIn('company_id', $companyIds);
            }

            $sales = $salesQuery->orderBy('invoice_date', 'desc')
                ->get()
                ->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'invoice_number' => $sale->invoice_number,
                        'type_label' => $sale->getTypeLabel(),
                        'date' => $sale->invoice_date->format('Y-m-d'),
                        'due_date' => $sale->due_date?->format('Y-m-d'),
                        'total_amount' => (float)$sale->total_amount,
                        'paid_amount' => (float)($sale->paid_amount ?? 0),
                        'balance' => (float)($sale->balance ?? $sale->total_amount),
                        'payment_status' => $sale->payment_status,
                        'payment_status_label' => $sale->getPaymentStatusLabel(),
                    ];
                });

            $totals = [
                'total_sales' => $sales->sum('total_amount'),
                'total_paid' => $sales->sum('paid_amount'),
                'total_balance_due' => $sales->sum('balance'),
                'sales_count' => $sales->count(),
                'pending_sales' => $sales->where('payment_status', 'pending')->count(),
                'partial_sales' => $sales->where('payment_status', 'partial')->count(),
                'paid_sales' => $sales->where('payment_status', 'paid')->count(),
            ];

            $saleIds = $sales->pluck('id')->toArray();

            $payments = SalePayment::whereIn('sale_id', $saleIds)
                ->with(['sale:id,invoice_number', 'paymentMethod'])
                ->orderBy('payment_date', 'desc')
                ->get()
                ->map(function ($payment) {
                    return [
                        'payment_date' => $payment->payment_date->format('Y-m-d'),
                        'amount' => (float)$payment->amount,
                        'payment_method' => $payment->payment_method_name ?? $payment->paymentMethod?->name,
                        'reference' => $payment->reference,
                        'invoice_number' => $payment->sale?->invoice_number,
                    ];
                });

            $clientData = [
                'name' => $client->name,
                'document_type' => $client->document_type,
                'document_id' => $client->document_id,
                'email' => $client->email,
                'phone' => $client->phone,
            ];

            $export = new ClientStatementExport(
                $clientData,
                $sales->toArray(),
                $payments->toArray(),
                $totals
            );

            $filename = 'estado_cuenta_' . str_replace(' ', '_', $client->name) . '_' . now('America/Bogota')->format('Y-m-d') . '.xlsx';

            return Excel::download($export, $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar estado de cuenta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Determina el estado de pago basado en el saldo
     */
    protected function getPaymentStatus(float $balanceDue): string
    {
        if ($balanceDue <= 0) {
            return 'paid';
        } elseif ($balanceDue > 0) {
            return 'pending';
        }
        return 'unknown';
    }
}
