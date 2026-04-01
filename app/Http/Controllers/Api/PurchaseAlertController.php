<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryPurchase;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseAlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $soonThreshold = Carbon::today()->addDays(7);

        $baseQuery = InventoryPurchase::where('status', '!=', 'cancelled');

        $selectFields = ['id', 'purchase_number', 'supplier_id', 'total_amount', 'balance_due', 'credit_due_date', 'status', 'payment_status'];

        // 1. Compras vencidas (credit_due_date < hoy AND no pagadas completamente)
        $overdueCount = (clone $baseQuery)
            ->whereNotNull('credit_due_date')
            ->where('credit_due_date', '<', $today)
            ->where('payment_status', '!=', 'paid')
            ->count();

        $overdueItems = (clone $baseQuery)
            ->whereNotNull('credit_due_date')
            ->where('credit_due_date', '<', $today)
            ->where('payment_status', '!=', 'paid')
            ->with('supplier:id,name,tax_id')
            ->select($selectFields)
            ->orderBy('credit_due_date', 'asc')
            ->limit(10)
            ->get();

        // 2. Compras por vencer (credit_due_date entre hoy y hoy+7, no pagadas)
        $dueSoonCount = (clone $baseQuery)
            ->whereNotNull('credit_due_date')
            ->whereBetween('credit_due_date', [$today, $soonThreshold])
            ->where('payment_status', '!=', 'paid')
            ->count();

        $dueSoonItems = (clone $baseQuery)
            ->whereNotNull('credit_due_date')
            ->whereBetween('credit_due_date', [$today, $soonThreshold])
            ->where('payment_status', '!=', 'paid')
            ->with('supplier:id,name,tax_id')
            ->select($selectFields)
            ->orderBy('credit_due_date', 'asc')
            ->limit(10)
            ->get();

        // 3. Compras con pago parcial
        $partialCount = (clone $baseQuery)
            ->where('payment_status', 'partial')
            ->count();

        $partialItems = (clone $baseQuery)
            ->where('payment_status', 'partial')
            ->with('supplier:id,name,tax_id')
            ->select($selectFields)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'overdue' => [
                    'count' => $overdueCount,
                    'items' => $overdueItems,
                ],
                'due_soon' => [
                    'count' => $dueSoonCount,
                    'items' => $dueSoonItems,
                ],
                'partial_payment' => [
                    'count' => $partialCount,
                    'items' => $partialItems,
                ],
                'total_alerts' => $overdueCount + $dueSoonCount + $partialCount,
            ],
        ]);
    }
}
