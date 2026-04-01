<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\ReportExport;
use App\Models\Product;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ReportExportController extends Controller
{
    private const VALID_REPORTS = [
        'best-sellers',
        'top-clients',
        'product-profit',
        'monthly-growth',
        'tax-collection',
        'income-expenses',
        'payments',
        'entries',
        'expenses',
        'commissions',
        'sales-products',
        'inventory',
        'cost-history',
        'sale-price-history',
        'products',
    ];

    private const REPORT_TITLES = [
        'best-sellers' => 'Productos Más Vendidos',
        'top-clients' => 'Clientes Principales',
        'product-profit' => 'Utilidad de Productos',
        'monthly-growth' => 'Crecimiento Mensual',
        'tax-collection' => 'Recaudo de Impuestos',
        'income-expenses' => 'Ingresos y Egresos',
        'payments' => 'Pagos',
        'entries' => 'Entradas',
        'expenses' => 'Gastos',
        'commissions' => 'Comisiones',
        'sales-products' => 'Ventas por Producto',
        'inventory' => 'Informe de Inventario',
        'cost-history' => 'Historial de Costos de Compra',
        'sale-price-history' => 'Historial de Precios de Venta',
        'products' => 'Catálogo de Productos',
    ];

    public function export(Request $request): BinaryFileResponse|JsonResponse|\Illuminate\Http\Response
    {
        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
            'report_type' => 'required|in:' . implode(',', self::VALID_REPORTS),
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'category_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'order_by' => 'nullable|string',
            'year' => 'nullable|integer',
            'type' => 'nullable|string',
            'payment_method_id' => 'nullable|integer',
            'seller_id' => 'nullable|integer',
            'search' => 'nullable|string',
            'stock_status' => 'nullable|string',
            'limit' => 'nullable|integer',
        ]);

        $user = $request->user();
        $reportType = $validated['report_type'];
        $format = $validated['format'];

        // Get report data based on type
        $data = $this->getReportData($request, $reportType);

        if ($data === null) {
            return response()->json(['success' => false, 'message' => 'Tipo de reporte no válido'], 400);
        }

        $title = self::REPORT_TITLES[$reportType] ?? 'Reporte';
        $periodLabel = $this->getPeriodLabel($validated);
        $filename = str_replace(' ', '_', strtolower($title)) . '_' . now('America/Bogota')->format('Y-m-d_His');

        $company = $user->company ?? (object) [
            'name' => 'LEGAL SISTEMA',
            'tax_id' => '',
            'address' => '',
            'city' => '',
        ];

        if ($format === 'excel') {
            return Excel::download(
                new ReportExport($data, $reportType, $title, $periodLabel),
                $filename . '.xlsx'
            );
        }

        // PDF
        $pdf = Pdf::loadView('pdf.report', [
            'data' => $data,
            'report_type' => $reportType,
            'title' => $title,
            'period_label' => $periodLabel,
            'company' => $company,
            'date_from' => $validated['date_from'] ?? '',
            'date_to' => $validated['date_to'] ?? '',
        ])
            ->setPaper('letter', 'portrait')
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }

    private function getReportData(Request $request, string $reportType): ?array
    {
        $reportController = app(ReportController::class);

        $makeRequest = function (array $params) use ($request) {
            $sub = Request::create('', 'GET', $params);
            $sub->setUserResolver($request->getUserResolver());
            return $sub;
        };

        $params = $request->only([
            'date_from', 'date_to', 'category_id', 'product_id',
            'order_by', 'year', 'type', 'payment_method_id',
            'seller_id', 'search', 'stock_status', 'limit',
        ]);
        $params = array_filter($params, fn($v) => $v !== null && $v !== '');

        try {
            switch ($reportType) {
                case 'best-sellers':
                    return json_decode(
                        $reportController->bestSellers($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'top-clients':
                    return json_decode(
                        $reportController->topClients($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'product-profit':
                    return json_decode(
                        $reportController->productProfit($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'monthly-growth':
                    if (!isset($params['year'])) {
                        $params['year'] = now('America/Bogota')->year;
                    }
                    return json_decode(
                        $reportController->monthlyGrowth($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'tax-collection':
                    return json_decode(
                        $reportController->taxCollection($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'income-expenses':
                    return json_decode(
                        $reportController->incomeExpenses($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'payments':
                    return json_decode(
                        $reportController->payments($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'entries':
                    return json_decode(
                        $reportController->entries($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'expenses':
                    return json_decode(
                        $reportController->expenses($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'commissions':
                    return json_decode(
                        $reportController->commissions($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'sales-products':
                    return json_decode(
                        $reportController->salesByProduct($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'inventory':
                    return json_decode(
                        $reportController->inventoryReport($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'cost-history':
                    return json_decode(
                        $reportController->costHistory($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'sale-price-history':
                    return json_decode(
                        $reportController->salePriceHistory($makeRequest($params))->getContent(),
                        true
                    )['data'];

                case 'products':
                    return $this->getProductsData($request);

                default:
                    return null;
            }
        } catch (\Exception $e) {
            \Log::error("Report export error: " . $e->getMessage());
            return null;
        }
    }

    private function getProductsData(Request $request): array
    {
        $user = $request->user();

        $query = Product::query()
            ->leftJoin('product_categories', 'products.category_id', '=', 'product_categories.id')
            ->leftJoin('product_areas', 'products.area_id', '=', 'product_areas.id')
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.barcode',
                'products.brand',
                'products.sale_price',
                'products.purchase_price',
                'products.current_stock',
                'products.min_stock',
                'products.max_stock',
                'products.unit_of_measure',
                'products.tax_rate',
                'products.is_active',
                'product_categories.name as category_name',
                'product_areas.name as area_name',
            ]);

        if (!$user->isSuperAdmin()) {
            $query->where('products.company_id', $user->company_id);
        }

        $products = $query->orderBy('products.name')->get();

        $totalProducts = $products->count();
        $activeProducts = $products->where('is_active', true)->count();
        $lowStock = $products->filter(fn($p) => $p->current_stock <= $p->min_stock && $p->is_active)->count();
        $totalValue = $products->sum(fn($p) => $p->current_stock * $p->purchase_price);

        return [
            'totals' => [
                'total_products' => $totalProducts,
                'active_products' => $activeProducts,
                'low_stock' => $lowStock,
                'total_inventory_value' => round($totalValue, 2),
            ],
            'items' => $products->map(fn($p) => [
                'name' => $p->name,
                'sku' => $p->sku ?? '',
                'barcode' => $p->barcode ?? '',
                'brand' => $p->brand ?? '',
                'category_name' => $p->category_name ?? 'Sin categoría',
                'area_name' => $p->area_name ?? '',
                'sale_price' => (float) $p->sale_price,
                'purchase_price' => (float) $p->purchase_price,
                'current_stock' => (int) $p->current_stock,
                'min_stock' => (int) $p->min_stock,
                'max_stock' => (int) ($p->max_stock ?? 0),
                'unit_of_measure' => $p->unit_of_measure ?? 'unidad',
                'tax_rate' => $p->tax_rate,
                'is_active' => (bool) $p->is_active,
            ])->toArray(),
        ];
    }

    private function getPeriodLabel(array $params): string
    {
        if (!empty($params['date_from']) && !empty($params['date_to'])) {
            return $params['date_from'] . ' a ' . $params['date_to'];
        }
        if (!empty($params['year'])) {
            return 'Año ' . $params['year'];
        }
        return 'Todos los datos';
    }
}
