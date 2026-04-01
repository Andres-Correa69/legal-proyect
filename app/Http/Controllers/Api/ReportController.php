<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\InventoryPurchase;
use App\Models\ProductPriceHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function yearExpr(string $column): string
    {
        return DB::connection()->getDriverName() === 'pgsql'
            ? "EXTRACT(YEAR FROM {$column})::integer"
            : "YEAR({$column})";
    }

    private function monthExpr(string $column): string
    {
        return DB::connection()->getDriverName() === 'pgsql'
            ? "EXTRACT(MONTH FROM {$column})::integer"
            : "MONTH({$column})";
    }

    public function salesByProduct(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;

        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('product_categories', 'products.category_id', '=', 'product_categories.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        // Company scope
        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $companyId);
        }

        // Optional filters
        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        if ($request->product_id) {
            $query->where('sale_items.product_id', $request->product_id);
        }

        $items = $query
            ->select([
                'products.id as product_id',
                'products.name as product_name',
                'products.sku',
                'products.purchase_price',
                'product_categories.name as category_name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.subtotal) as total_subtotal'),
                DB::raw('SUM(sale_items.discount_amount) as total_discount'),
                DB::raw('SUM(sale_items.tax_amount) as total_tax'),
                DB::raw('SUM(sale_items.total) as total_amount'),
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as sales_count'),
            ])
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.purchase_price', 'product_categories.name')
            ->orderByDesc('total_amount')
            ->get();

        // Cast numeric fields
        $items = $items->map(function ($item) {
            return [
                'product_id' => (int) $item->product_id,
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'purchase_price' => (float) $item->purchase_price,
                'category_name' => $item->category_name,
                'total_quantity' => (int) $item->total_quantity,
                'total_subtotal' => (float) $item->total_subtotal,
                'total_discount' => (float) $item->total_discount,
                'total_tax' => (float) $item->total_tax,
                'total_amount' => (float) $item->total_amount,
                'sales_count' => (int) $item->sales_count,
            ];
        });

        $totals = [
            'total_quantity' => $items->sum('total_quantity'),
            'total_subtotal' => $items->sum('total_subtotal'),
            'total_discount' => $items->sum('total_discount'),
            'total_tax' => $items->sum('total_tax'),
            'total_amount' => $items->sum('total_amount'),
            'total_sales_count' => $items->sum('sales_count'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items->values(),
                'totals' => $totals,
            ],
        ]);
    }

    public function salesByProductInvoices(Request $request, int $productId): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;

        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('users', 'sales.client_id', '=', 'users.id')
            ->where('sale_items.product_id', $productId)
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $companyId);
        }

        $invoices = $query
            ->select([
                'sales.id as sale_id',
                'sales.invoice_number',
                'sales.invoice_date',
                'users.name as client_name',
                'sale_items.quantity',
                'sale_items.unit_price',
                'sale_items.total',
            ])
            ->orderByDesc('sales.invoice_date')
            ->get();

        $invoices = $invoices->map(function ($inv) {
            return [
                'sale_id' => (int) $inv->sale_id,
                'invoice_number' => $inv->invoice_number,
                'invoice_date' => $inv->invoice_date,
                'client_name' => $inv->client_name,
                'quantity' => (int) $inv->quantity,
                'unit_price' => (float) $inv->unit_price,
                'total' => (float) $inv->total,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $invoices->values(),
        ]);
    }

    /**
     * Más Vendidos - Top products by quantity sold and revenue
     */
    public function bestSellers(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'category_id' => 'nullable|integer',
            'limit' => 'nullable|integer|min:5|max:100',
            'order_by' => 'nullable|in:quantity,amount',
        ]);

        $user = $request->user();
        $limit = $request->integer('limit', 20);
        $orderBy = $request->input('order_by', 'quantity');

        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('product_categories', 'products.category_id', '=', 'product_categories.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $user->company_id);
        }

        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        $items = $query
            ->select([
                'products.id as product_id',
                'products.name as product_name',
                'products.sku',
                'products.sale_price as current_price',
                'product_categories.name as category_name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.total) as total_amount'),
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as sales_count'),
                DB::raw('AVG(sale_items.unit_price) as avg_price'),
            ])
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.sale_price', 'product_categories.name')
            ->orderByDesc($orderBy === 'amount' ? 'total_amount' : 'total_quantity')
            ->limit($limit)
            ->get();

        $grandTotalQuantity = $items->sum('total_quantity');
        $grandTotalAmount = $items->sum('total_amount');

        $items = $items->map(function ($item, $index) use ($grandTotalQuantity, $grandTotalAmount) {
            return [
                'rank' => $index + 1,
                'product_id' => (int) $item->product_id,
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'category_name' => $item->category_name,
                'current_price' => (float) $item->current_price,
                'total_quantity' => (int) $item->total_quantity,
                'total_amount' => (float) $item->total_amount,
                'sales_count' => (int) $item->sales_count,
                'avg_price' => round((float) $item->avg_price, 2),
                'quantity_percentage' => $grandTotalQuantity > 0 ? round(((int) $item->total_quantity / $grandTotalQuantity) * 100, 1) : 0,
                'amount_percentage' => $grandTotalAmount > 0 ? round((float) $item->total_amount / $grandTotalAmount * 100, 1) : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items->values(),
                'totals' => [
                    'total_quantity' => (int) $grandTotalQuantity,
                    'total_amount' => (float) $grandTotalAmount,
                    'products_count' => $items->count(),
                ],
            ],
        ]);
    }

    /**
     * Top Clientes - Ranking of clients by purchases
     */
    public function topClients(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'limit' => 'nullable|integer|min:5|max:100',
            'order_by' => 'nullable|in:amount,count',
        ]);

        $user = $request->user();
        $limit = $request->integer('limit', 20);
        $orderBy = $request->input('order_by', 'amount');

        $query = Sale::query()
            ->join('users', 'sales.client_id', '=', 'users.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereNotNull('sales.client_id')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $user->company_id);
        }

        $clients = $query
            ->select([
                'users.id as client_id',
                'users.name as client_name',
                'users.email',
                'users.phone',
                DB::raw('COUNT(sales.id) as sales_count'),
                DB::raw('SUM(sales.total_amount) as total_amount'),
                DB::raw('SUM(sales.paid_amount) as total_paid'),
                DB::raw('SUM(sales.balance) as total_balance'),
                DB::raw('AVG(sales.total_amount) as avg_ticket'),
                DB::raw('MAX(sales.invoice_date) as last_purchase_date'),
            ])
            ->groupBy('users.id', 'users.name', 'users.email', 'users.phone')
            ->orderByDesc($orderBy === 'count' ? 'sales_count' : 'total_amount')
            ->limit($limit)
            ->get();

        $grandTotalAmount = $clients->sum('total_amount');

        $clients = $clients->map(function ($client, $index) use ($grandTotalAmount) {
            return [
                'rank' => $index + 1,
                'client_id' => (int) $client->client_id,
                'client_name' => $client->client_name,
                'email' => $client->email,
                'phone' => $client->phone,
                'sales_count' => (int) $client->sales_count,
                'total_amount' => (float) $client->total_amount,
                'total_paid' => (float) $client->total_paid,
                'total_balance' => (float) $client->total_balance,
                'avg_ticket' => round((float) $client->avg_ticket, 2),
                'last_purchase_date' => $client->last_purchase_date,
                'amount_percentage' => $grandTotalAmount > 0 ? round((float) $client->total_amount / $grandTotalAmount * 100, 1) : 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $clients->values(),
                'totals' => [
                    'total_amount' => (float) $grandTotalAmount,
                    'total_paid' => (float) $clients->sum('total_paid'),
                    'total_balance' => (float) $clients->sum('total_balance'),
                    'clients_count' => $clients->count(),
                ],
            ],
        ]);
    }

    /**
     * Utilidad por Producto - Product profit margin analysis
     */
    public function productProfit(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'category_id' => 'nullable|integer',
        ]);

        $user = $request->user();

        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->leftJoin('product_categories', 'products.category_id', '=', 'product_categories.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $user->company_id);
        }

        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        $items = $query
            ->select([
                'products.id as product_id',
                'products.name as product_name',
                'products.sku',
                'products.purchase_price',
                'products.average_cost',
                'product_categories.name as category_name',
                DB::raw('SUM(sale_items.quantity) as total_quantity'),
                DB::raw('SUM(sale_items.total) as total_revenue'),
                DB::raw('AVG(sale_items.unit_price) as avg_sale_price'),
            ])
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.purchase_price', 'products.average_cost', 'product_categories.name')
            ->orderByDesc('total_revenue')
            ->get();

        $items = $items->map(function ($item) {
            $costPerUnit = (float) $item->average_cost > 0 ? (float) $item->average_cost : (float) $item->purchase_price;
            $totalCost = $costPerUnit * (int) $item->total_quantity;
            $totalRevenue = (float) $item->total_revenue;
            $profit = $totalRevenue - $totalCost;
            $marginPercent = $totalRevenue > 0 ? ($profit / $totalRevenue) * 100 : 0;

            return [
                'product_id' => (int) $item->product_id,
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'category_name' => $item->category_name,
                'total_quantity' => (int) $item->total_quantity,
                'avg_sale_price' => round((float) $item->avg_sale_price, 2),
                'cost_per_unit' => round($costPerUnit, 2),
                'total_revenue' => round($totalRevenue, 2),
                'total_cost' => round($totalCost, 2),
                'profit' => round($profit, 2),
                'margin_percent' => round($marginPercent, 1),
            ];
        });

        $totals = [
            'total_revenue' => $items->sum('total_revenue'),
            'total_cost' => $items->sum('total_cost'),
            'total_profit' => $items->sum('profit'),
            'avg_margin' => $items->sum('total_revenue') > 0 ? round($items->sum('profit') / $items->sum('total_revenue') * 100, 1) : 0,
            'products_count' => $items->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items->values(),
                'totals' => $totals,
            ],
        ]);
    }

    /**
     * Crecimiento Mensual - Monthly sales comparison
     */
    public function monthlyGrowth(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2099',
        ]);

        $user = $request->user();
        $year = $request->integer('year');

        $query = Sale::query()
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->whereYear('invoice_date', $year);

        if (!$user->isSuperAdmin()) {
            $query->where('company_id', $user->company_id);
        }

        $monthExpr = $this->monthExpr('invoice_date');

        $currentYear = $query
            ->select([
                DB::raw("{$monthExpr} as month"),
                DB::raw('COUNT(id) as sales_count'),
                DB::raw('SUM(total_amount) as total_amount'),
                DB::raw('SUM(paid_amount) as total_paid'),
                DB::raw('AVG(total_amount) as avg_ticket'),
            ])
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('month')
            ->get()
            ->keyBy(fn($item) => intval($item->month));

        // Previous year for comparison
        $prevQuery = Sale::query()
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->whereYear('invoice_date', $year - 1);

        if (!$user->isSuperAdmin()) {
            $prevQuery->where('company_id', $user->company_id);
        }

        $previousYear = $prevQuery
            ->select([
                DB::raw("{$monthExpr} as month"),
                DB::raw('SUM(total_amount) as total_amount'),
                DB::raw('COUNT(id) as sales_count'),
            ])
            ->groupBy(DB::raw($monthExpr))
            ->orderBy('month')
            ->get()
            ->keyBy(fn($item) => intval($item->month));

        $months = [];
        $monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        for ($m = 1; $m <= 12; $m++) {
            $current = $currentYear->get($m);
            $previous = $previousYear->get($m);

            $currentAmount = $current ? (float) $current->total_amount : 0;
            $previousAmount = $previous ? (float) $previous->total_amount : 0;
            $growth = $previousAmount > 0 ? round(($currentAmount - $previousAmount) / $previousAmount * 100, 1) : ($currentAmount > 0 ? 100 : 0);

            $months[] = [
                'month' => $m,
                'month_name' => $monthNames[$m - 1],
                'sales_count' => $current ? (int) $current->sales_count : 0,
                'total_amount' => $currentAmount,
                'total_paid' => $current ? (float) $current->total_paid : 0,
                'avg_ticket' => $current ? round((float) $current->avg_ticket, 2) : 0,
                'prev_year_amount' => $previousAmount,
                'prev_year_sales_count' => $previous ? (int) $previous->sales_count : 0,
                'growth_percent' => $growth,
            ];
        }

        $yearTotal = collect($months)->sum('total_amount');
        $prevYearTotal = collect($months)->sum('prev_year_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'months' => $months,
                'year' => $year,
                'totals' => [
                    'year_total' => $yearTotal,
                    'prev_year_total' => $prevYearTotal,
                    'year_sales_count' => collect($months)->sum('sales_count'),
                    'prev_year_sales_count' => collect($months)->sum('prev_year_sales_count'),
                    'year_growth' => $prevYearTotal > 0 ? round(($yearTotal - $prevYearTotal) / $prevYearTotal * 100, 1) : ($yearTotal > 0 ? 100 : 0),
                ],
            ],
        ]);
    }

    /**
     * Recaudo de Impuestos - Tax collection report
     */
    public function taxCollection(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $user = $request->user();

        // By tax rate
        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('sales.company_id', $user->company_id);
        }

        $byTaxRate = $query
            ->select([
                'sale_items.tax_rate',
                DB::raw('SUM(sale_items.subtotal) as taxable_base'),
                DB::raw('SUM(sale_items.tax_amount) as tax_collected'),
                DB::raw('SUM(sale_items.total) as total_with_tax'),
                DB::raw('COUNT(DISTINCT sale_items.sale_id) as sales_count'),
            ])
            ->groupBy('sale_items.tax_rate')
            ->orderByDesc('tax_collected')
            ->get()
            ->map(function ($item) {
                return [
                    'tax_rate' => (float) $item->tax_rate,
                    'taxable_base' => (float) $item->taxable_base,
                    'tax_collected' => (float) $item->tax_collected,
                    'total_with_tax' => (float) $item->total_with_tax,
                    'sales_count' => (int) $item->sales_count,
                ];
            });

        // Monthly breakdown
        $monthlyQuery = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereNull('sales.deleted_at')
            ->whereBetween('sales.invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $monthlyQuery->where('sales.company_id', $user->company_id);
        }

        $taxYearExpr = $this->yearExpr('sales.invoice_date');
        $taxMonthExpr = $this->monthExpr('sales.invoice_date');

        $monthly = $monthlyQuery
            ->select([
                DB::raw("{$taxYearExpr} as year"),
                DB::raw("{$taxMonthExpr} as month"),
                DB::raw('SUM(sale_items.subtotal) as taxable_base'),
                DB::raw('SUM(sale_items.tax_amount) as tax_collected'),
                DB::raw('SUM(sale_items.total) as total_with_tax'),
            ])
            ->groupBy(DB::raw($taxYearExpr), DB::raw($taxMonthExpr))
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                $monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return [
                    'year' => (int) $item->year,
                    'month' => (int) $item->month,
                    'month_name' => $monthNames[(int) $item->month],
                    'period' => $monthNames[(int) $item->month] . ' ' . $item->year,
                    'taxable_base' => (float) $item->taxable_base,
                    'tax_collected' => (float) $item->tax_collected,
                    'total_with_tax' => (float) $item->total_with_tax,
                ];
            });

        $totals = [
            'taxable_base' => $byTaxRate->sum('taxable_base'),
            'tax_collected' => $byTaxRate->sum('tax_collected'),
            'total_with_tax' => $byTaxRate->sum('total_with_tax'),
            'effective_rate' => $byTaxRate->sum('taxable_base') > 0
                ? round($byTaxRate->sum('tax_collected') / $byTaxRate->sum('taxable_base') * 100, 2)
                : 0,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'by_tax_rate' => $byTaxRate->values(),
                'monthly' => $monthly->values(),
                'totals' => $totals,
            ],
        ]);
    }

    /**
     * Ingresos y Egresos - Income vs Expenses report
     */
    public function incomeExpenses(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $user = $request->user();

        // Income: Sales
        $salesQuery = Sale::query()
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->whereBetween('invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $salesQuery->where('company_id', $user->company_id);
        }

        $saleYearExpr = $this->yearExpr('invoice_date');
        $saleMonthExpr = $this->monthExpr('invoice_date');

        $salesMonthly = $salesQuery
            ->select([
                DB::raw("{$saleYearExpr} as year"),
                DB::raw("{$saleMonthExpr} as month"),
                DB::raw('COUNT(id) as count'),
                DB::raw('SUM(total_amount) as total'),
                DB::raw('SUM(paid_amount) as paid'),
            ])
            ->groupBy(DB::raw($saleYearExpr), DB::raw($saleMonthExpr))
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->keyBy(fn($item) => intval($item->year) . '-' . intval($item->month));

        // Expenses: Inventory Purchases
        $purchasesQuery = InventoryPurchase::query()
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59']);

        if (!$user->isSuperAdmin()) {
            $purchasesQuery->where('company_id', $user->company_id);
        }

        $purchaseYearExpr = $this->yearExpr('created_at');
        $purchaseMonthExpr = $this->monthExpr('created_at');

        $purchasesMonthly = $purchasesQuery
            ->select([
                DB::raw("{$purchaseYearExpr} as year"),
                DB::raw("{$purchaseMonthExpr} as month"),
                DB::raw('COUNT(id) as count'),
                DB::raw('SUM(total_amount) as total'),
                DB::raw('SUM(total_paid) as paid'),
            ])
            ->groupBy(DB::raw($purchaseYearExpr), DB::raw($purchaseMonthExpr))
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->keyBy(fn($item) => intval($item->year) . '-' . intval($item->month));

        // Merge into periods
        $allKeys = $salesMonthly->keys()->merge($purchasesMonthly->keys())->unique()->sort();
        $monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        $periods = $allKeys->map(function ($key) use ($salesMonthly, $purchasesMonthly, $monthNames) {
            $sale = $salesMonthly->get($key);
            $purchase = $purchasesMonthly->get($key);
            [$year, $month] = explode('-', $key);

            $income = $sale ? (float) $sale->total : 0;
            $expense = $purchase ? (float) $purchase->total : 0;

            return [
                'year' => (int) $year,
                'month' => (int) $month,
                'period' => $monthNames[(int) $month] . ' ' . $year,
                'income' => $income,
                'income_count' => $sale ? (int) $sale->count : 0,
                'income_paid' => $sale ? (float) $sale->paid : 0,
                'expense' => $expense,
                'expense_count' => $purchase ? (int) $purchase->count : 0,
                'expense_paid' => $purchase ? (float) $purchase->paid : 0,
                'net' => $income - $expense,
            ];
        })->values();

        $totalIncome = $periods->sum('income');
        $totalExpense = $periods->sum('expense');

        return response()->json([
            'success' => true,
            'data' => [
                'periods' => $periods,
                'totals' => [
                    'total_income' => $totalIncome,
                    'total_income_paid' => $periods->sum('income_paid'),
                    'total_expense' => $totalExpense,
                    'total_expense_paid' => $periods->sum('expense_paid'),
                    'net' => $totalIncome - $totalExpense,
                    'income_count' => $periods->sum('income_count'),
                    'expense_count' => $periods->sum('expense_count'),
                ],
            ],
        ]);
    }

    /**
     * Detail of individual sales and purchases for a given month.
     */
    public function incomeExpensesDetail(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer|between:1,12',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $user = $request->user();
        $year = (int) $request->year;
        $month = (int) $request->month;

        // Calculate the actual date range for this month (clamped to filter range)
        $monthStart = max($request->date_from, sprintf('%04d-%02d-01', $year, $month));
        $monthEnd = min($request->date_to, date('Y-m-t', strtotime("$year-$month-01")));

        // Sales for this month
        $salesQuery = Sale::query()
            ->where('status', '!=', 'cancelled')
            ->whereNull('deleted_at')
            ->whereBetween('invoice_date', [$monthStart, $monthEnd])
            ->with('client:id,name');

        if (!$user->isSuperAdmin()) {
            $salesQuery->where('company_id', $user->company_id);
        }

        $sales = $salesQuery
            ->select(['id', 'invoice_number', 'invoice_date', 'client_id', 'total_amount', 'paid_amount', 'payment_status'])
            ->orderBy('invoice_date', 'desc')
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'invoice_number' => $s->invoice_number,
                'date' => $s->invoice_date,
                'client_name' => $s->client?->name,
                'total_amount' => (float) $s->total_amount,
                'paid_amount' => (float) $s->paid_amount,
                'payment_status' => $s->payment_status,
            ]);

        // Purchases for this month
        $purchasesQuery = InventoryPurchase::query()
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$monthStart . ' 00:00:00', $monthEnd . ' 23:59:59'])
            ->with('supplier:id,name');

        if (!$user->isSuperAdmin()) {
            $purchasesQuery->where('company_id', $user->company_id);
        }

        $purchases = $purchasesQuery
            ->select(['id', 'purchase_number', 'created_at', 'supplier_id', 'total_amount', 'total_paid', 'payment_status', 'status'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'purchase_number' => $p->purchase_number,
                'date' => $p->created_at->format('Y-m-d'),
                'supplier_name' => $p->supplier?->name,
                'total_amount' => (float) $p->total_amount,
                'total_paid' => (float) $p->total_paid,
                'payment_status' => $p->payment_status,
                'status' => $p->status,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'sales' => $sales,
                'purchases' => $purchases,
            ],
        ]);
    }

    /**
     * Informe de Pagos - All payments (income + expense) in a date range
     */
    public function payments(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'type' => 'nullable|in:income,expense',
            'payment_method_id' => 'nullable|integer',
        ]);

        $user = $request->user();

        $query = Payment::query()
            ->leftJoin('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
            ->leftJoin('users as creator', 'payments.created_by_user_id', '=', 'creator.id')
            ->leftJoin('cash_registers', 'payments.cash_register_id', '=', 'cash_registers.id')
            ->where('payments.status', '!=', 'cancelled')
            ->whereNull('payments.deleted_at')
            ->whereBetween('payments.payment_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $query->where('payments.company_id', $user->company_id);
        }

        if ($request->type) {
            $query->where('payments.type', $request->type);
        }

        if ($request->payment_method_id) {
            $query->where('payments.payment_method_id', $request->payment_method_id);
        }

        $items = $query
            ->select([
                'payments.id',
                'payments.payment_number',
                'payments.payment_date',
                'payments.amount',
                'payments.type',
                'payments.reference_type',
                'payments.reference_id',
                'payments.notes',
                'payments.is_partial',
                'payments.status',
                'payment_methods.name as payment_method_name',
                'creator.name as created_by_name',
                'cash_registers.name as cash_register_name',
            ])
            ->orderByDesc('payments.payment_date')
            ->orderByDesc('payments.id')
            ->get();

        $items = $items->map(function ($item) {
            // Resolve reference info
            $referenceLabel = null;
            $referencePath = null;
            if ($item->reference_type === Sale::class && $item->reference_id) {
                $sale = Sale::select('invoice_number')->find($item->reference_id);
                $referenceLabel = $sale ? $sale->invoice_number : 'Venta #' . $item->reference_id;
                $referencePath = '/admin/sales/' . $item->reference_id;
            } elseif ($item->reference_type === InventoryPurchase::class && $item->reference_id) {
                $purchase = InventoryPurchase::select('purchase_number')->find($item->reference_id);
                $referenceLabel = $purchase ? $purchase->purchase_number : 'Compra #' . $item->reference_id;
                $referencePath = '/admin/inventory-purchases/' . $item->reference_id;
            }

            return [
                'id' => (int) $item->id,
                'payment_number' => $item->payment_number,
                'payment_date' => $item->payment_date,
                'amount' => (float) $item->amount,
                'type' => $item->type,
                'is_partial' => (bool) $item->is_partial,
                'status' => $item->status,
                'notes' => $item->notes,
                'payment_method_name' => $item->payment_method_name,
                'created_by_name' => $item->created_by_name,
                'cash_register_name' => $item->cash_register_name,
                'reference_label' => $referenceLabel,
                'reference_path' => $referencePath,
            ];
        });

        $totalIncome = $items->where('type', 'income')->sum('amount');
        $totalExpense = $items->where('type', 'expense')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items->values(),
                'totals' => [
                    'total_income' => (float) $totalIncome,
                    'total_expense' => (float) $totalExpense,
                    'net' => (float) ($totalIncome - $totalExpense),
                    'total_count' => $items->count(),
                    'income_count' => $items->where('type', 'income')->count(),
                    'expense_count' => $items->where('type', 'expense')->count(),
                ],
            ],
        ]);
    }

    /**
     * Informe de Entradas - Income payments only
     */
    public function entries(Request $request): JsonResponse
    {
        $request->merge(['type' => 'income']);
        return $this->payments($request);
    }

    /**
     * Informe de Gastos - Expense payments only
     */
    public function expenses(Request $request): JsonResponse
    {
        $request->merge(['type' => 'expense']);
        return $this->payments($request);
    }

    /**
     * Distribución de Gastos por Factura - Proportional expense allocation per invoice
     */
    public function expenseDistribution(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $user = $request->user();

        // 1. Query expenses (Payment type='expense', status='completed')
        $expensesQuery = Payment::query()
            ->where('type', 'expense')
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->whereBetween('payment_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $expensesQuery->where('company_id', $user->company_id);
        }

        $expenses = $expensesQuery
            ->with(['paymentMethod:id,name', 'createdBy:id,name', 'cashRegister:id,name'])
            ->orderByDesc('payment_date')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'payment_number' => $p->payment_number,
                'payment_date' => $p->payment_date,
                'amount' => (float) $p->amount,
                'concept' => $p->concept,
                'notes' => $p->notes,
                'payment_method_name' => $p->paymentMethod?->name,
                'created_by_name' => $p->createdBy?->name,
                'cash_register_name' => $p->cashRegister?->name,
            ]);

        $totalExpenses = $expenses->sum('amount');

        // 2. Query total income for summary
        $incomeQuery = Payment::query()
            ->where('type', 'income')
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->whereBetween('payment_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $incomeQuery->where('company_id', $user->company_id);
        }

        $totalIncome = (float) $incomeQuery->sum('amount');

        // 3. Query invoices (completed + pending)
        $salesQuery = Sale::query()
            ->whereIn('status', ['completed', 'pending'])
            ->whereNull('deleted_at')
            ->whereBetween('invoice_date', [$request->date_from, $request->date_to]);

        if (!$user->isSuperAdmin()) {
            $salesQuery->where('company_id', $user->company_id);
        }

        $sales = $salesQuery
            ->with(['client:id,name'])
            ->orderByDesc('invoice_date')
            ->get();

        // 4. Calculate distribution
        $sumEffective = $sales->sum(fn($s) => $s->effectiveTotal());

        $invoices = $sales->map(function ($s) use ($totalExpenses, $sumEffective) {
            $effectiveTotal = $s->effectiveTotal();
            $weight = $sumEffective > 0 ? $effectiveTotal / $sumEffective : 0;

            return [
                'id' => $s->id,
                'invoice_number' => $s->invoice_number,
                'invoice_date' => $s->invoice_date,
                'type' => $s->type,
                'type_label' => $s->getTypeLabel(),
                'status' => $s->status,
                'client_name' => $s->client?->name,
                'total_amount' => (float) $s->total_amount,
                'effective_total' => (float) $effectiveTotal,
                'payment_status' => $s->payment_status,
                'weight' => round($weight, 6),
                'expense_share' => round($weight * $totalExpenses, 2),
                'expense_percentage' => round($weight * 100, 1),
            ];
        })->sortByDesc('expense_share')->values();

        $invoiceCount = $invoices->count();

        return response()->json([
            'success' => true,
            'data' => [
                'expenses' => $expenses->values(),
                'invoices' => $invoices,
                'totals' => [
                    'total_expenses' => $totalExpenses,
                    'total_income' => $totalIncome,
                    'total_invoices_effective' => (float) $sumEffective,
                    'invoice_count' => $invoiceCount,
                    'expense_count' => $expenses->count(),
                    'avg_expense_per_invoice' => $invoiceCount > 0 ? round($totalExpenses / $invoiceCount, 2) : 0,
                ],
            ],
        ]);
    }

    /**
     * Informe de Comisiones - Commission report by seller
     */
    public function commissions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date',
            'seller_id' => 'nullable|exists:users,id',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;

        $baseQuery = Sale::query()
            ->where('commission_amount', '>', 0)
            ->where('status', 'completed');

        if (!$user->isSuperAdmin()) {
            $baseQuery->where('company_id', $companyId);
        }

        $baseQuery->whereDate('created_at', '>=', $validated['date_from'])
            ->whereDate('created_at', '<=', $validated['date_to']);

        if (!empty($validated['seller_id'])) {
            $baseQuery->where('seller_id', $validated['seller_id']);
        }

        // Sellers aggregation
        $sellers = (clone $baseQuery)
            ->select([
                'seller_id',
                DB::raw('COUNT(*) as sales_count'),
                DB::raw('SUM(total_amount) as total_sales'),
                DB::raw('SUM(commission_amount) as total_commission'),
                DB::raw('AVG(commission_percentage) as avg_percentage'),
            ])
            ->whereNotNull('seller_id')
            ->groupBy('seller_id')
            ->orderByDesc('total_commission')
            ->get()
            ->map(function ($row) {
                $seller = \App\Models\User::find($row->seller_id);
                return [
                    'seller_id' => (int) $row->seller_id,
                    'seller_name' => $seller ? $seller->name : 'Sin vendedor',
                    'sales_count' => (int) $row->sales_count,
                    'total_sales' => (float) $row->total_sales,
                    'total_commission' => (float) $row->total_commission,
                    'avg_percentage' => round((float) $row->avg_percentage, 2),
                ];
            });

        // Sales detail
        $sales = (clone $baseQuery)
            ->with(['seller:id,name', 'client:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'sale_number' => $sale->invoice_number,
                    'created_at' => $sale->created_at->toDateString(),
                    'client_name' => $sale->client?->name,
                    'seller_name' => $sale->seller?->name ?? 'Sin vendedor',
                    'total_amount' => (float) $sale->total_amount,
                    'commission_percentage' => (float) $sale->commission_percentage,
                    'commission_amount' => (float) $sale->commission_amount,
                ];
            });

        // Totals
        $totalSalesAmount = $sales->sum('total_amount');
        $totalCommission = $sales->sum('commission_amount');
        $salesCount = $sales->count();
        $sellersCount = $sellers->count();
        $avgPercentage = $totalSalesAmount > 0
            ? round(($totalCommission / $totalSalesAmount) * 100, 2)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'sellers' => $sellers,
                'sales' => $sales,
                'totals' => [
                    'total_sales_amount' => $totalSalesAmount,
                    'total_commission' => $totalCommission,
                    'sales_count' => $salesCount,
                    'sellers_count' => $sellersCount,
                    'avg_percentage' => $avgPercentage,
                ],
            ],
        ]);
    }

    /**
     * Inventory report — snapshot of current inventory state.
     */
    public function inventoryReport(Request $request): JsonResponse
    {
        $request->validate([
            'category_id' => 'nullable|integer',
            'search' => 'nullable|string|max:255',
            'stock_status' => 'nullable|in:all,low,normal,over',
        ]);

        $user = $request->user();

        $query = Product::query()
            ->leftJoin('product_categories', 'products.category_id', '=', 'product_categories.id')
            ->where('products.is_active', true)
            ->where('products.is_trackable', true);

        // Company scope
        if (!$user->isSuperAdmin()) {
            $query->where('products.company_id', $user->company_id);
        }

        // Filters
        if ($request->category_id) {
            $query->where('products.category_id', $request->category_id);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('products.name', 'like', "%{$search}%")
                  ->orWhere('products.sku', 'like', "%{$search}%");
            });
        }

        if ($request->stock_status && $request->stock_status !== 'all') {
            match ($request->stock_status) {
                'low' => $query->whereRaw('products.current_stock <= products.min_stock'),
                'over' => $query->whereNotNull('products.max_stock')
                                ->whereRaw('products.current_stock > products.max_stock'),
                'normal' => $query->whereRaw('products.current_stock > products.min_stock')
                                  ->where(function ($q) {
                                      $q->whereNull('products.max_stock')
                                        ->orWhereRaw('products.current_stock <= products.max_stock');
                                  }),
            };
        }

        $products = $query->select([
            'products.id as product_id',
            'products.name as product_name',
            'products.sku',
            'product_categories.name as category_name',
            'products.current_stock',
            'products.min_stock',
            'products.max_stock',
            'products.purchase_price',
            'products.average_cost',
            'products.sale_price',
            'products.tax_rate',
        ])->get();

        // Build items with computed values (IVA = tax_rate % del costo)
        $items = $products->map(function ($p) {
            $totalCost = $p->current_stock * $p->average_cost;
            $taxRate = (float) ($p->tax_rate ?? 0);
            $ivaAmount = $totalCost * ($taxRate / 100);

            $stockStatus = 'normal';
            if ($p->current_stock <= $p->min_stock) {
                $stockStatus = 'low';
            } elseif ($p->max_stock !== null && $p->current_stock > $p->max_stock) {
                $stockStatus = 'over';
            }

            return [
                'product_id' => (int) $p->product_id,
                'product_name' => $p->product_name,
                'sku' => $p->sku,
                'category_name' => $p->category_name,
                'current_stock' => (int) $p->current_stock,
                'min_stock' => (int) $p->min_stock,
                'max_stock' => $p->max_stock ? (int) $p->max_stock : null,
                'purchase_price' => (float) $p->purchase_price,
                'average_cost' => (float) $p->average_cost,
                'sale_price' => (float) $p->sale_price,
                'tax_rate' => $taxRate,
                'total_cost' => round($totalCost, 2),
                'iva_amount' => round($ivaAmount, 2),
                'stock_status' => $stockStatus,
            ];
        })->toArray();

        // Totals
        $totalProducts = count($items);
        $totalUnits = array_sum(array_column($items, 'current_stock'));
        $totalCost = array_sum(array_column($items, 'total_cost'));
        $totalIva = array_sum(array_column($items, 'iva_amount'));
        $lowStockCount = count(array_filter($items, fn($i) => $i['stock_status'] === 'low'));
        $overStockCount = count(array_filter($items, fn($i) => $i['stock_status'] === 'over'));

        // By category aggregation
        $byCategory = collect($items)
            ->groupBy('category_name')
            ->map(function ($group, $categoryName) {
                return [
                    'category_name' => $categoryName ?: 'Sin categoría',
                    'product_count' => $group->count(),
                    'total_units' => $group->sum('current_stock'),
                    'total_cost' => round($group->sum('total_cost'), 2),
                    'total_iva' => round($group->sum('iva_amount'), 2),
                ];
            })
            ->sortByDesc('total_cost')
            ->values()
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'totals' => [
                    'total_products' => $totalProducts,
                    'total_units' => $totalUnits,
                    'total_cost' => round($totalCost, 2),
                    'total_iva' => round($totalIva, 2),
                    'low_stock_count' => $lowStockCount,
                    'over_stock_count' => $overStockCount,
                ],
                'by_category' => $byCategory,
                'items' => $items,
            ],
        ]);
    }

    public function costHistory(Request $request): JsonResponse
    {
        return $this->priceHistory($request, 'purchase_price');
    }

    public function salePriceHistory(Request $request): JsonResponse
    {
        return $this->priceHistory($request, 'sale_price');
    }

    private function priceHistory(Request $request, string $field): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'product_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;

        $query = ProductPriceHistory::where('field', $field)
            ->whereBetween('created_at', [$request->date_from . ' 00:00:00', $request->date_to . ' 23:59:59']);

        if (!$user->isSuperAdmin()) {
            $query->where('company_id', $companyId);
        }

        if ($request->product_id) {
            $query->where('product_id', $request->product_id);
        }

        $histories = $query->with(['product:id,name,sku,category_id', 'product.category:id,name', 'changedBy:id,name'])
            ->orderByDesc('created_at')
            ->get();

        // Filtrar por categoría si se especificó
        if ($request->category_id) {
            $histories = $histories->filter(fn($h) => $h->product && $h->product->category_id == $request->category_id)->values();
        }

        $items = $histories->map(function ($h) {
            $changeAmount = $h->new_value - $h->old_value;
            $changePercent = $h->old_value > 0 ? round(($changeAmount / $h->old_value) * 100, 2) : 0;

            return [
                'id' => $h->id,
                'product_id' => $h->product_id,
                'product_name' => $h->product?->name ?? 'Producto eliminado',
                'sku' => $h->product?->sku,
                'category_name' => $h->product?->category?->name,
                'old_value' => (float) $h->old_value,
                'new_value' => (float) $h->new_value,
                'change_amount' => round($changeAmount, 2),
                'change_percent' => $changePercent,
                'reason' => $h->reason,
                'reference_type' => $h->reference_type,
                'reference_id' => $h->reference_id,
                'changed_by_name' => $h->changedBy?->name ?? 'Sistema',
                'created_at' => $h->created_at->toISOString(),
            ];
        })->toArray();

        // Totales
        $totalChanges = count($items);
        $productsAffected = collect($items)->pluck('product_id')->unique()->count();
        $increases = collect($items)->where('change_amount', '>', 0)->count();
        $decreases = collect($items)->where('change_amount', '<', 0)->count();
        $avgChangePercent = $totalChanges > 0
            ? round(collect($items)->avg('change_percent'), 2)
            : 0;

        // Agrupado por producto para gráfica
        $byProduct = collect($items)
            ->groupBy('product_id')
            ->map(function ($group) {
                $sorted = $group->sortBy('created_at');
                return [
                    'product_name' => $group->first()['product_name'],
                    'changes_count' => $group->count(),
                    'first_value' => $sorted->first()['old_value'],
                    'last_value' => $sorted->last()['new_value'],
                    'net_change' => round($sorted->last()['new_value'] - $sorted->first()['old_value'], 2),
                ];
            })
            ->sortByDesc('changes_count')
            ->values()
            ->take(10)
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'totals' => [
                    'total_changes' => $totalChanges,
                    'products_affected' => $productsAffected,
                    'avg_change_percent' => $avgChangePercent,
                    'increases' => $increases,
                    'decreases' => $decreases,
                ],
                'items' => $items,
                'by_product' => $byProduct,
            ],
        ]);
    }
}
