<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\AnalyticsExport;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AnalyticsExportController extends Controller
{
    public function export(Request $request): BinaryFileResponse|JsonResponse|\Illuminate\Http\Response
    {
        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'sections' => 'nullable|array',
            'sections.*' => 'string|in:ventas,stock,clientes,rentabilidad,crecimiento',
        ]);

        $sections = $validated['sections'] ?? ['ventas', 'stock', 'clientes', 'rentabilidad', 'crecimiento'];

        $user = $request->user();
        $dateFrom = $validated['date_from'];
        $dateTo = $validated['date_to'];

        $reportController = app(ReportController::class);

        // Helper to create sub-requests preserving auth
        $makeRequest = function (array $params) use ($request) {
            $sub = Request::create('', 'GET', $params);
            $sub->setUserResolver($request->getUserResolver());
            return $sub;
        };

        // Fetch all report data via existing controller methods
        $bestSellers = json_decode(
            $reportController->bestSellers($makeRequest([
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'limit' => 10,
                'order_by' => 'quantity',
            ]))->getContent(),
            true
        )['data'];

        $clientsByCount = json_decode(
            $reportController->topClients($makeRequest([
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'limit' => 10,
                'order_by' => 'count',
            ]))->getContent(),
            true
        )['data'];

        $clientsByAmount = json_decode(
            $reportController->topClients($makeRequest([
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'limit' => 10,
                'order_by' => 'amount',
            ]))->getContent(),
            true
        )['data'];

        $productProfit = json_decode(
            $reportController->productProfit($makeRequest([
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ]))->getContent(),
            true
        )['data'];

        $monthlyGrowth = json_decode(
            $reportController->monthlyGrowth($makeRequest([
                'year' => now('America/Bogota')->year,
            ]))->getContent(),
            true
        )['data'];

        // Low stock - direct query
        $lowStockQuery = Product::query()
            ->whereRaw('current_stock <= min_stock')
            ->where('is_active', true);

        if (!$user->isSuperAdmin()) {
            $lowStockQuery->where('company_id', $user->company_id);
        }

        $lowStockProducts = $lowStockQuery
            ->select(['name', 'sku', 'current_stock', 'min_stock'])
            ->orderByRaw('(min_stock - current_stock) DESC')
            ->limit(10)
            ->get()
            ->map(fn($p) => [
                'name' => $p->name,
                'sku' => $p->sku,
                'current_stock' => $p->current_stock,
                'min_stock' => $p->min_stock,
                'deficit' => max(0, $p->min_stock - $p->current_stock),
            ])
            ->toArray();

        // Top margin products (sorted)
        $topMargin = collect($productProfit['items'])
            ->sortByDesc('margin_percent')
            ->take(10)
            ->values()
            ->toArray();

        $periodLabel = \Carbon\Carbon::parse($dateFrom, 'America/Bogota')->format('d/m/Y') . ' - ' . \Carbon\Carbon::parse($dateTo, 'America/Bogota')->format('d/m/Y');

        $data = [
            'best_sellers' => $bestSellers,
            'clients_by_count' => $clientsByCount,
            'clients_by_amount' => $clientsByAmount,
            'product_profit' => $productProfit,
            'top_margin' => $topMargin,
            'monthly_growth' => $monthlyGrowth,
            'low_stock' => $lowStockProducts,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'period_label' => $periodLabel,
        ];

        $filename = 'analisis_' . now('America/Bogota')->format('Y-m-d_His');

        if ($validated['format'] === 'excel') {
            return Excel::download(new AnalyticsExport($data, $sections), $filename . '.xlsx');
        }

        // PDF
        $company = $user->company ?? (object) [
            'name' => 'LEGAL SISTEMA',
            'tax_id' => '',
            'address' => '',
            'city' => '',
        ];

        $pdf = Pdf::loadView('pdf.analytics', array_merge($data, [
            'company' => $company,
        ]))
            ->setPaper('letter', 'portrait')
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }
}
