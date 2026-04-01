<?php

namespace App\Services;

use App\Models\AlertLog;
use App\Models\AlertRule;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use App\Models\Payment;
use App\Mail\AlertNotificationMail;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class AlertCheckService
{
    public function checkAlert(AlertRule $rule): ?AlertLog
    {
        $result = match ($rule->type) {
            'low_stock' => $this->checkLowStock($rule),
            'sales_decrease' => $this->checkSalesDecrease($rule),
            'inactive_clients' => $this->checkInactiveClients($rule),
            'no_movement_products' => $this->checkNoMovementProducts($rule),
            'sales_target' => $this->checkSalesTarget($rule),
            'upcoming_invoices' => $this->checkUpcomingInvoices($rule),
            'high_expenses' => $this->checkHighExpenses($rule),
            'client_birthday' => $this->checkClientBirthdays($rule),
            default => null,
        };

        $rule->update(['last_checked_at' => now()]);

        if ($result && !empty($result['items'])) {
            $log = AlertLog::create([
                'alert_rule_id' => $rule->id,
                'company_id' => $rule->company_id,
                'data' => $result,
                'email_sent' => false,
                'triggered_at' => now(),
            ]);

            $rule->update(['last_triggered_at' => now()]);

            $this->sendEmail($rule, $log);

            return $log;
        }

        return null;
    }

    protected function checkLowStock(AlertRule $rule): array
    {
        $threshold = $rule->conditions['threshold'] ?? 10;

        $query = Product::where('company_id', $rule->company_id)
            ->where('is_active', true)
            ->where('is_trackable', true)
            ->where('current_stock', '<=', $threshold)
            ->where('current_stock', '>', 0);

        $items = $query->select('id', 'name', 'sku', 'current_stock', 'min_stock')
            ->orderBy('current_stock', 'asc')
            ->limit(50)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
            ])
            ->toArray();

        return [
            'items' => $items,
            'summary' => count($items) . ' productos con stock igual o menor a ' . $threshold . ' unidades',
            'threshold' => $threshold,
        ];
    }

    protected function checkSalesDecrease(AlertRule $rule): array
    {
        $percentage = $rule->conditions['percentage'] ?? 20;
        $periodDays = $rule->conditions['period_days'] ?? 7;

        $currentStart = Carbon::now()->subDays($periodDays);
        $previousStart = Carbon::now()->subDays($periodDays * 2);
        $previousEnd = Carbon::now()->subDays($periodDays);

        $currentSales = Sale::where('company_id', $rule->company_id)
            ->where('status', '!=', 'cancelled')
            ->where('invoice_date', '>=', $currentStart)
            ->sum('total_amount');

        $previousSales = Sale::where('company_id', $rule->company_id)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('invoice_date', [$previousStart, $previousEnd])
            ->sum('total_amount');

        $items = [];
        if ($previousSales > 0) {
            $change = (($currentSales - $previousSales) / $previousSales) * 100;
            if ($change <= -$percentage) {
                $items = [[
                    'current_sales' => $currentSales,
                    'previous_sales' => $previousSales,
                    'change_percentage' => round($change, 1),
                    'period_days' => $periodDays,
                ]];
            }
        }

        return [
            'items' => $items,
            'summary' => !empty($items)
                ? 'Las ventas disminuyeron un ' . abs($items[0]['change_percentage']) . '% en los últimos ' . $periodDays . ' días'
                : 'Sin disminución significativa',
            'current_sales' => $currentSales,
            'previous_sales' => $previousSales,
        ];
    }

    protected function checkInactiveClients(AlertRule $rule): array
    {
        $days = $rule->conditions['days'] ?? 30;
        $minPurchases = $rule->conditions['min_purchases'] ?? 3;

        $cutoffDate = Carbon::now()->subDays($days);

        $items = User::where('company_id', $rule->company_id)
            ->whereHas('salesAsClient', function ($q) {
                $q->where('status', '!=', 'cancelled');
            }, '>=', $minPurchases)
            ->whereDoesntHave('salesAsClient', function ($q) use ($cutoffDate) {
                $q->where('status', '!=', 'cancelled')
                    ->where('invoice_date', '>=', $cutoffDate);
            })
            ->select('id', 'name', 'email', 'phone')
            ->withCount(['salesAsClient' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }])
            ->limit(50)
            ->get()
            ->map(function ($user) {
                $lastSale = $user->salesAsClient()
                    ->where('status', '!=', 'cancelled')
                    ->latest('invoice_date')
                    ->first();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'total_purchases' => $user->sales_as_client_count,
                    'last_purchase' => $lastSale?->invoice_date?->format('Y-m-d'),
                ];
            })
            ->toArray();

        return [
            'items' => $items,
            'summary' => count($items) . ' clientes recurrentes sin compras en los últimos ' . $days . ' días',
            'days' => $days,
            'min_purchases' => $minPurchases,
        ];
    }

    protected function checkNoMovementProducts(AlertRule $rule): array
    {
        $days = $rule->conditions['days'] ?? 30;
        $cutoffDate = Carbon::now()->subDays($days);

        // Get product IDs that HAVE been sold recently
        $soldProductIds = SaleItem::whereHas('sale', function ($q) use ($rule, $cutoffDate) {
            $q->where('company_id', $rule->company_id)
                ->where('status', '!=', 'cancelled')
                ->where('invoice_date', '>=', $cutoffDate);
        })->distinct()->pluck('product_id')->toArray();

        $items = Product::where('company_id', $rule->company_id)
            ->where('is_active', true)
            ->where('is_trackable', true)
            ->where('current_stock', '>', 0)
            ->whereNotIn('id', $soldProductIds)
            ->select('id', 'name', 'sku', 'current_stock', 'sale_price')
            ->limit(50)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'stock' => $p->current_stock,
                'sale_price' => $p->sale_price,
            ])
            ->toArray();

        return [
            'items' => $items,
            'summary' => count($items) . ' productos sin ventas en los últimos ' . $days . ' días',
            'days' => $days,
        ];
    }

    protected function checkSalesTarget(AlertRule $rule): array
    {
        $targetAmount = $rule->conditions['target_amount'] ?? 0;
        $periodDays = $rule->conditions['period_days'] ?? 30;

        $startDate = Carbon::now()->subDays($periodDays);

        $totalSales = Sale::where('company_id', $rule->company_id)
            ->where('status', '!=', 'cancelled')
            ->where('invoice_date', '>=', $startDate)
            ->sum('total_amount');

        $items = [];
        if ($totalSales < $targetAmount) {
            $deficit = $targetAmount - $totalSales;
            $percentage = $targetAmount > 0 ? round(($totalSales / $targetAmount) * 100, 1) : 0;
            $items = [[
                'target' => $targetAmount,
                'current' => $totalSales,
                'deficit' => $deficit,
                'percentage' => $percentage,
                'period_days' => $periodDays,
            ]];
        }

        return [
            'items' => $items,
            'summary' => !empty($items)
                ? 'Meta de ventas no alcanzada: $' . number_format($totalSales, 0) . ' de $' . number_format($targetAmount, 0) . ' (' . ($items[0]['percentage'] ?? 0) . '%)'
                : 'Meta de ventas alcanzada',
            'total_sales' => $totalSales,
            'target' => $targetAmount,
        ];
    }

    protected function checkUpcomingInvoices(AlertRule $rule): array
    {
        $days = $rule->conditions['days'] ?? 7;
        $today = Carbon::today();
        $threshold = Carbon::today()->addDays($days);

        $items = Sale::where('company_id', $rule->company_id)
            ->where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'paid')
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$today, $threshold])
            ->with('client:id,name')
            ->select('id', 'invoice_number', 'client_id', 'total_amount', 'balance', 'due_date')
            ->orderBy('due_date', 'asc')
            ->limit(50)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'invoice_number' => $s->invoice_number,
                'client' => $s->client?->name,
                'total_amount' => $s->total_amount,
                'balance' => $s->balance,
                'due_date' => $s->due_date?->format('Y-m-d'),
            ])
            ->toArray();

        return [
            'items' => $items,
            'summary' => count($items) . ' facturas por vencer en los próximos ' . $days . ' días',
            'days' => $days,
        ];
    }

    protected function checkHighExpenses(AlertRule $rule): array
    {
        $threshold = $rule->conditions['threshold'] ?? 1000000;
        $periodDays = $rule->conditions['period_days'] ?? 30;

        $startDate = Carbon::now()->subDays($periodDays);

        $totalExpenses = Payment::where('company_id', $rule->company_id)
            ->where('type', 'expense')
            ->where('status', '!=', 'cancelled')
            ->where('payment_date', '>=', $startDate)
            ->sum('amount');

        $items = [];
        if ($totalExpenses >= $threshold) {
            $items = [[
                'total_expenses' => $totalExpenses,
                'threshold' => $threshold,
                'period_days' => $periodDays,
                'exceeded_by' => $totalExpenses - $threshold,
            ]];
        }

        return [
            'items' => $items,
            'summary' => !empty($items)
                ? 'Gastos de $' . number_format($totalExpenses, 0) . ' superan el límite de $' . number_format($threshold, 0)
                : 'Gastos dentro del límite',
            'total_expenses' => $totalExpenses,
            'threshold' => $threshold,
        ];
    }

    protected function checkClientBirthdays(AlertRule $rule): array
    {
        $days = $rule->conditions['days'] ?? 7;
        $today = Carbon::today();

        $clients = User::where('company_id', $rule->company_id)
            ->whereNotNull('birth_date')
            ->whereHas('roles', fn($q) => $q->where('slug', 'client'))
            ->select('id', 'name', 'email', 'phone', 'birth_date')
            ->get()
            ->map(function ($client) use ($today) {
                $birthDate = Carbon::parse($client->birth_date);
                $nextBirthday = $birthDate->copy()->year($today->year);

                if ($nextBirthday->lt($today)) {
                    $nextBirthday->addYear();
                }

                $daysUntil = $today->diffInDays($nextBirthday, false);
                $isToday = $daysUntil === 0;

                return [
                    'id' => $client->id,
                    'name' => $client->name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                    'birth_date' => $birthDate->format('Y-m-d'),
                    'turning_age' => $birthDate->age + ($isToday ? 0 : 1),
                    'days_until' => $daysUntil,
                    'is_today' => $isToday,
                ];
            })
            ->filter(fn($c) => $c['days_until'] >= 0 && $c['days_until'] <= $days)
            ->sortBy('days_until')
            ->values()
            ->toArray();

        $todayCount = count(array_filter($clients, fn($c) => $c['is_today']));

        return [
            'items' => $clients,
            'summary' => $todayCount > 0
                ? $todayCount . ' cliente(s) cumplen años hoy, ' . (count($clients) - $todayCount) . ' en los próximos ' . $days . ' días'
                : count($clients) . ' cliente(s) cumplen años en los próximos ' . $days . ' días',
            'days' => $days,
            'today_count' => $todayCount,
        ];
    }

    protected function sendEmail(AlertRule $rule, AlertLog $log): void
    {
        try {
            $company = $rule->company;
            foreach ($rule->recipients as $email) {
                Mail::to($email)->send(new AlertNotificationMail($rule, $log, $company));
            }
            $log->update(['email_sent' => true]);
        } catch (\Exception $e) {
            Log::error('Alert email failed', [
                'alert_rule_id' => $rule->id,
                'error' => $e->getMessage(),
            ]);
            $log->update(['email_error' => $e->getMessage()]);
        }
    }
}
