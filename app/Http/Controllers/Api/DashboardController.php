<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\InventoryPurchase;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get all dashboard statistics in a single endpoint.
     */
    public function statistics(): JsonResponse
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $sevenDaysAgo = Carbon::now()->subDays(7);

        // ── KPI Stats ──
        $salesToday = Sale::whereDate('invoice_date', $today)
            ->where('status', 'completed')
            ->sum('total_amount');

        $monthlyIncome = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $accountsReceivable = Sale::whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->sum('balance');

        $accountsPayable = InventoryPurchase::whereIn('payment_status', ['pending', 'partial'])
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->sum('balance_due');

        $monthlyExpenses = Payment::where('type', 'expense')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $collectionsLast7Days = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $sevenDaysAgo)
            ->sum('amount');

        $netMargin = $monthlyIncome > 0
            ? round((($monthlyIncome - $monthlyExpenses) / $monthlyIncome) * 100, 1)
            : 0;

        $activeClients = Sale::where('status', 'completed')
            ->where('invoice_date', '>=', $startOfMonth)
            ->distinct('client_id')
            ->count('client_id');

        $salesTodayCount = Sale::whereDate('invoice_date', $today)
            ->where('status', 'completed')
            ->count();

        $pendingInvoicesCount = Sale::whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->count();

        $payableInvoicesCount = InventoryPurchase::whereIn('payment_status', ['pending', 'partial'])
            ->whereNotIn('status', ['cancelled', 'draft'])
            ->count();

        $expenseOrdersCount = Payment::where('type', 'expense')
            ->where('status', 'completed')
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->count();

        $newClientsThisMonth = Sale::where('status', 'completed')
            ->where('invoice_date', '>=', $startOfMonth)
            ->whereNotExists(function ($query) use ($startOfMonth) {
                $query->select(DB::raw(1))
                    ->from('sales as s2')
                    ->whereColumn('s2.client_id', 'sales.client_id')
                    ->where('s2.invoice_date', '<', $startOfMonth)
                    ->where('s2.status', 'completed');
            })
            ->distinct('client_id')
            ->count('client_id');

        // ── Detect DB driver for SQL compatibility ──
        $driver = DB::connection()->getDriverName();

        // ── Charts: Income vs Expenses (last 6 months) ──
        $sixMonthsAgo = Carbon::now()->subMonths(5)->startOfMonth();
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $monthExpr = DB::raw("TO_CHAR(payment_date, 'YYYY-MM') as month");
        } else {
            $monthExpr = DB::raw("DATE_FORMAT(payment_date, '%Y-%m') as month");
        }

        $monthExpr = $driver === 'pgsql'
            ? "TO_CHAR(payment_date, 'YYYY-MM')"
            : "DATE_FORMAT(payment_date, '%Y-%m')";

        $monthlyIncomeData = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $sixMonthsAgo)
            ->select(
                DB::raw("{$monthExpr} as month"),
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('month')
            ->pluck('total', 'month');

        $monthlyExpenseData = Payment::where('type', 'expense')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $sixMonthsAgo)
            ->select(
                DB::raw("{$monthExpr} as month"),
                DB::raw('SUM(amount) as total')
            )
            ->groupBy('month')
            ->pluck('total', 'month');

        $monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        $incomeExpenseChart = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $key = $date->format('Y-m');
            $incomeExpenseChart[] = [
                'month' => $monthNames[$date->month - 1],
                'ingresos' => (float) ($monthlyIncomeData[$key] ?? 0),
                'gastos' => (float) ($monthlyExpenseData[$key] ?? 0),
            ];
        }

        // ── Charts: Cash flow (current week) ──
        $startOfWeek = Carbon::now()->startOfWeek();
        $dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        if ($driver === 'pgsql') {
            // PostgreSQL EXTRACT(DOW): 0=Sunday, 1=Monday, ... 6=Saturday
            $dayExpr = DB::raw("EXTRACT(DOW FROM payment_date)::integer as day_num");
            $dayMapping = [1, 2, 3, 4, 5, 6, 0]; // Mon(1) to Sun(0)
        } else {
            // MySQL/MariaDB DAYOFWEEK(): 1=Sunday, 2=Monday, ... 7=Saturday
            $dayExpr = DB::raw('DAYOFWEEK(payment_date) as day_num');
            $dayMapping = [2, 3, 4, 5, 6, 7, 1]; // Mon(2) to Sun(1)
        }

        $dailyIncome = Payment::where('type', 'income')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startOfWeek)
            ->select($dayExpr, DB::raw('SUM(amount) as total'))
            ->groupBy('day_num')
            ->pluck('total', 'day_num');

        $dailyExpense = Payment::where('type', 'expense')
            ->where('status', 'completed')
            ->where('payment_date', '>=', $startOfWeek)
            ->select($dayExpr, DB::raw('SUM(amount) as total'))
            ->groupBy('day_num')
            ->pluck('total', 'day_num');

        $cashFlowChart = [];
        foreach ($dayMapping as $idx => $dayOfWeek) {
            $inc = (float) ($dailyIncome[$dayOfWeek] ?? 0);
            $exp = (float) ($dailyExpense[$dayOfWeek] ?? 0);
            $cashFlowChart[] = [
                'day' => $dayNames[$idx],
                'value' => $inc - $exp,
            ];
        }

        // ── Financial Summary ──
        $totalBalance = $accountsReceivable - $accountsPayable;
        $netProfit = $monthlyIncome - $monthlyExpenses;

        // ── Recent Transactions (last 10 payments) ──
        $recentTransactions = Payment::with(['reference'])
            ->where('status', 'completed')
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(function (Payment $payment) {
                $title = $payment->description ?: ($payment->type === 'income' ? 'Ingreso' : 'Gasto');

                // Try to get better title from reference
                if ($payment->reference) {
                    $ref = $payment->reference;
                    if ($ref instanceof Sale) {
                        $title = "Factura #{$ref->invoice_number}";
                    } elseif ($ref instanceof InventoryPurchase) {
                        $title = "Compra #{$ref->purchase_number}";
                    }
                }

                return [
                    'id' => $payment->id,
                    'type' => $payment->type === 'income' ? 'income' : 'expense',
                    'title' => $title,
                    'subtitle' => Carbon::parse($payment->payment_date)->locale('es')->diffForHumans(),
                    'amount' => $payment->type === 'income'
                        ? (float) $payment->amount
                        : -(float) $payment->amount,
                    'status' => $payment->is_partial ? 'pending' : 'completed',
                ];
            });

        // ── Top Clients (by total billed) ──
        $topClients = Sale::where('status', 'completed')
            ->select(
                'client_id',
                DB::raw('SUM(total_amount) as total_billed'),
                DB::raw('COUNT(*) as visits'),
                DB::raw('MAX(invoice_date) as last_visit')
            )
            ->groupBy('client_id')
            ->orderByDesc('total_billed')
            ->limit(5)
            ->with(['client:id,name,email'])
            ->get()
            ->map(function ($row) {
                $client = $row->client;
                $name = $client?->name ?? 'Cliente eliminado';
                $words = explode(' ', $name);
                $initials = '';
                foreach (array_slice($words, 0, 2) as $word) {
                    $initials .= mb_strtoupper(mb_substr($word, 0, 1));
                }

                return [
                    'id' => (string) $row->client_id,
                    'name' => $name,
                    'email' => $client?->email ?? '',
                    'initials' => $initials,
                    'totalBilled' => (float) $row->total_billed,
                    'visits' => (int) $row->visits,
                    'lastVisit' => Carbon::parse($row->last_visit)->locale('es')->diffForHumans(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => [
                    'sales_today' => (float) $salesToday,
                    'sales_today_count' => $salesTodayCount,
                    'monthly_income' => (float) $monthlyIncome,
                    'accounts_receivable' => (float) $accountsReceivable,
                    'accounts_receivable_count' => $pendingInvoicesCount,
                    'accounts_payable' => (float) $accountsPayable,
                    'accounts_payable_count' => $payableInvoicesCount,
                    'monthly_expenses' => (float) $monthlyExpenses,
                    'monthly_expenses_count' => $expenseOrdersCount,
                    'collections_last_7_days' => (float) $collectionsLast7Days,
                    'net_margin' => $netMargin,
                    'net_profit' => (float) $netProfit,
                    'active_clients' => $activeClients,
                    'new_clients_this_month' => $newClientsThisMonth,
                ],
                'charts' => [
                    'income_expense' => $incomeExpenseChart,
                    'cash_flow' => $cashFlowChart,
                ],
                'financial_summary' => [
                    'total_balance' => (float) $totalBalance,
                    'accounts_receivable' => (float) $accountsReceivable,
                    'accounts_payable' => (float) $accountsPayable,
                    'monthly_income' => (float) $monthlyIncome,
                    'monthly_expenses' => (float) $monthlyExpenses,
                    'net_profit' => (float) $netProfit,
                ],
                'recent_transactions' => $recentTransactions,
                'top_clients' => $topClients,
            ],
        ]);
    }
}
