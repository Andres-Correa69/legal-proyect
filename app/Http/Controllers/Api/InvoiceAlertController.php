<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvoiceAlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $soonThreshold = Carbon::today()->addDays(7);

        $baseQuery = Sale::where('status', '!=', 'cancelled');

        // 1. Facturas vencidas (due_date < hoy AND no pagadas completamente)
        $overdueCount = (clone $baseQuery)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->where('payment_status', '!=', 'paid')
            ->count();

        $overdueItems = (clone $baseQuery)
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->where('payment_status', '!=', 'paid')
            ->with('client:id,name,document_id')
            ->select('id', 'invoice_number', 'client_id', 'total_amount', 'balance', 'due_date', 'type', 'payment_status')
            ->orderBy('due_date', 'asc')
            ->limit(10)
            ->get();

        // 2. Facturas por vencer (due_date entre hoy y hoy+7, no pagadas)
        $dueSoonCount = (clone $baseQuery)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$today, $soonThreshold])
            ->where('payment_status', '!=', 'paid')
            ->count();

        $dueSoonItems = (clone $baseQuery)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$today, $soonThreshold])
            ->where('payment_status', '!=', 'paid')
            ->with('client:id,name,document_id')
            ->select('id', 'invoice_number', 'client_id', 'total_amount', 'balance', 'due_date', 'type', 'payment_status')
            ->orderBy('due_date', 'asc')
            ->limit(10)
            ->get();

        // 3. Facturas con pago parcial
        $partialCount = (clone $baseQuery)
            ->where('payment_status', 'partial')
            ->count();

        $partialItems = (clone $baseQuery)
            ->where('payment_status', 'partial')
            ->with('client:id,name,document_id')
            ->select('id', 'invoice_number', 'client_id', 'total_amount', 'balance', 'due_date', 'type', 'payment_status')
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
