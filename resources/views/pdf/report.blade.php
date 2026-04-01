<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }
        .container { max-width: 100%; margin: 0 auto; padding: 15px 20px 50px 20px; }

        /* Header */
        .header { display: table; width: 100%; margin-bottom: 15px; border-bottom: 2px solid #4F46E5; padding-bottom: 12px; }
        .header-left { display: table-cell; width: 60%; vertical-align: top; }
        .header-right { display: table-cell; width: 40%; text-align: right; vertical-align: top; }
        .company-logo { max-height: 50px; max-width: 180px; margin-bottom: 8px; }
        .company-name { font-size: 18px; font-weight: bold; color: #1F2937; margin-bottom: 4px; }
        .company-info { font-size: 9px; color: #6B7280; }
        .report-type { display: inline-block; background: #EEF2FF; color: #4F46E5; font-size: 9px; font-weight: bold; padding: 3px 10px; border-radius: 4px; margin-bottom: 6px; }
        .report-title { font-size: 16px; font-weight: bold; color: #4F46E5; margin-bottom: 4px; }
        .report-period { font-size: 9px; color: #6B7280; }

        /* Summary Cards */
        .summary-container { display: table; width: 100%; margin-bottom: 15px; }
        .summary-card { display: table-cell; padding: 0 4px; }
        .summary-card:first-child { padding-left: 0; }
        .summary-card:last-child { padding-right: 0; }
        .summary-box { border: 1px solid #E5E7EB; border-radius: 5px; padding: 8px; text-align: center; }
        .summary-box.green { background: #ECFDF5; border-color: #A7F3D0; }
        .summary-box.blue { background: #EEF2FF; border-color: #C7D2FE; }
        .summary-box.amber { background: #FFFBEB; border-color: #FDE68A; }
        .summary-box.red { background: #FEF2F2; border-color: #FECACA; }
        .summary-box.purple { background: #F5F3FF; border-color: #DDD6FE; }
        .summary-box.teal { background: #F0FDFA; border-color: #99F6E4; }
        .summary-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #6B7280; margin-bottom: 3px; }
        .summary-value { font-size: 14px; font-weight: bold; }
        .summary-value.green { color: #059669; }
        .summary-value.blue { color: #4F46E5; }
        .summary-value.amber { color: #D97706; }
        .summary-value.red { color: #DC2626; }
        .summary-value.purple { color: #7C3AED; }
        .summary-value.teal { color: #0D9488; }
        .summary-sub { font-size: 7px; color: #9CA3AF; margin-top: 2px; }

        /* Section headers */
        .section-title { background: #4F46E5; color: #fff; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px 4px 0 0; margin-top: 12px; }

        /* Table */
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .data-table th { background: #F3F4F6; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #374151; padding: 6px 5px; text-align: left; border-bottom: 2px solid #E5E7EB; }
        .data-table th.right { text-align: right; }
        .data-table th.center { text-align: center; }
        .data-table td { padding: 5px 5px; border-bottom: 1px solid #E5E7EB; font-size: 9px; }
        .data-table td.right { text-align: right; }
        .data-table td.center { text-align: center; }
        .data-table td.bold { font-weight: bold; }
        .data-table tr:nth-child(even) { background: #F9FAFB; }

        /* Badges */
        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .badge-green { background: #ECFDF5; color: #059669; }
        .badge-yellow { background: #FFFBEB; color: #D97706; }
        .badge-orange { background: #FFF7ED; color: #EA580C; }
        .badge-red { background: #FEF2F2; color: #DC2626; }
        .badge-blue { background: #EFF6FF; color: #2563EB; }

        .text-green { color: #059669; }
        .text-red { color: #DC2626; }
        .text-muted { color: #9CA3AF; }

        /* Two-column layout */
        .two-col { display: table; width: 100%; }
        .two-col .col { display: table-cell; width: 50%; vertical-align: top; padding: 0 5px; }
        .two-col .col:first-child { padding-left: 0; }
        .two-col .col:last-child { padding-right: 0; }

        .empty-msg { text-align: center; color: #6B7280; padding: 15px; font-size: 9px; }

        /* Fixed footer on every page */
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company { font-size: 8px; color: #9CA3AF; }
        .footer-developer { font-size: 7px; color: #B0B5BF; margin-top: 2px; }
        .footer-developer a { color: #4F46E5; text-decoration: none; }
        .footer-generated { font-size: 7px; color: #D1D5DB; margin-top: 1px; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <!-- Fixed footer on every page -->
    <div class="page-footer">
        <div class="footer-company">{{ $company->name ?? 'LEGAL SISTEMA' }} — Sistema de Gestión</div>
        <div class="footer-developer">Desarrollado por <strong>Legal Sistema</strong> · www.legalsistema.co</div>
        <div class="footer-generated">Generado el {{ now('America/Bogota')->format('d/m/Y H:i:s') }}</div>
    </div>

    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                @php
                    $logoSrc = null;
                    if (!empty($company->logo_url)) {
                        try {
                            $logoContent = @file_get_contents($company->logo_url);
                            if ($logoContent !== false) {
                                $ext = pathinfo(parse_url($company->logo_url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'png';
                                $logoSrc = 'data:image/' . $ext . ';base64,' . base64_encode($logoContent);
                            }
                        } catch (\Exception $e) {}
                    }
                    if (!$logoSrc) {
                        $defaultLogo = public_path('images/legal-sistema-logo.png');
                        if (file_exists($defaultLogo)) {
                            $logoSrc = 'data:image/png;base64,' . base64_encode(file_get_contents($defaultLogo));
                        }
                    }
                @endphp
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" class="company-logo" alt="{{ $company->name ?? 'Legal Sistema' }}">
                @endif
                <div class="company-name">{{ $company->name ?? 'LEGAL SISTEMA' }}</div>
                <div class="company-info">
                    NIT: {{ $company->tax_id ?? $company->nit ?? '' }}<br>
                    {{ $company->address ?? '' }}<br>
                    {{ $company->city ?? '' }}
                </div>
            </div>
            <div class="header-right">
                <div class="report-type">REPORTE</div>
                <div class="report-title">{{ $title }}</div>
                <div class="report-period">
                    {{ $period_label }}<br>
                    Generado el {{ now('America/Bogota')->format('d/m/Y H:i') }}
                </div>
            </div>
        </div>

        {{-- ============ BEST SELLERS ============ --}}
        @if($report_type === 'best-sellers')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Productos Vendidos', 'value' => $data['totals']['products_count'] ?? 0, 'color' => 'blue'],
                ['label' => 'Total Cantidad', 'value' => number_format($data['totals']['total_quantity'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Total Ventas', 'value' => '$' . number_format($data['totals']['total_amount'] ?? 0, 0, ',', '.'), 'color' => 'amber'],
            ]])
            <div class="section-title">Productos Más Vendidos</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:5%;">#</th>
                    <th style="width:35%;">Producto</th>
                    <th>SKU</th>
                    <th class="right">Cantidad</th>
                    <th class="right">Total</th>
                    <th class="right">% Part.</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td class="bold">{{ $item['rank'] }}</td>
                        <td>{{ $item['product_name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td class="right bold">{{ number_format($item['total_quantity'], 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                        <td class="right text-muted">{{ $item['amount_percentage'] }}%</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos en el periodo seleccionado</p>
            @endif

        {{-- ============ TOP CLIENTS ============ --}}
        @elseif($report_type === 'top-clients')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Clientes', 'value' => $data['totals']['clients_count'] ?? 0, 'color' => 'blue'],
                ['label' => 'Total Compras', 'value' => '$' . number_format($data['totals']['total_amount'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Ticket Promedio', 'value' => '$' . number_format($data['totals']['avg_ticket'] ?? 0, 0, ',', '.'), 'color' => 'amber'],
            ]])
            <div class="section-title">Clientes Principales</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:5%;">#</th>
                    <th style="width:30%;">Cliente</th>
                    <th>Email</th>
                    <th class="right">Compras</th>
                    <th class="right">Total</th>
                    <th class="right">Ticket Prom.</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td class="bold">{{ $item['rank'] }}</td>
                        <td>{{ $item['client_name'] }}</td>
                        <td class="text-muted">{{ $item['email'] ?? '-' }}</td>
                        <td class="right bold">{{ $item['sales_count'] }}</td>
                        <td class="right">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                        <td class="right text-muted">${{ number_format($item['avg_ticket'] ?? 0, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos en el periodo seleccionado</p>
            @endif

        {{-- ============ PRODUCT PROFIT ============ --}}
        @elseif($report_type === 'product-profit')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Ingresos', 'value' => '$' . number_format($data['totals']['total_revenue'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Costos', 'value' => '$' . number_format($data['totals']['total_cost'] ?? 0, 0, ',', '.'), 'color' => 'red'],
                ['label' => 'Utilidad', 'value' => '$' . number_format($data['totals']['total_profit'] ?? 0, 0, ',', '.'), 'color' => 'blue'],
                ['label' => 'Margen Prom.', 'value' => ($data['totals']['avg_margin'] ?? 0) . '%', 'color' => 'amber'],
            ]])
            <div class="section-title">Utilidad por Producto</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:25%;">Producto</th>
                    <th>SKU</th>
                    <th class="right">Cant.</th>
                    <th class="right">Ingresos</th>
                    <th class="right">Costos</th>
                    <th class="right">Utilidad</th>
                    <th class="center">Margen</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    @php
                        $margin = $item['margin_percent'];
                        $badgeClass = $margin >= 40 ? 'badge-green' : ($margin >= 20 ? 'badge-green' : ($margin >= 10 ? 'badge-yellow' : ($margin > 0 ? 'badge-orange' : 'badge-red')));
                    @endphp
                    <tr>
                        <td>{{ $item['product_name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td class="right">{{ number_format($item['total_quantity'], 0, ',', '.') }}</td>
                        <td class="right text-green">${{ number_format($item['total_revenue'], 0, ',', '.') }}</td>
                        <td class="right text-red">${{ number_format($item['total_cost'], 0, ',', '.') }}</td>
                        <td class="right bold {{ $item['profit'] >= 0 ? 'text-green' : 'text-red' }}">${{ number_format($item['profit'], 0, ',', '.') }}</td>
                        <td class="center"><span class="badge {{ $badgeClass }}">{{ $margin }}%</span></td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos en el periodo seleccionado</p>
            @endif

        {{-- ============ MONTHLY GROWTH ============ --}}
        @elseif($report_type === 'monthly-growth')
            <div class="section-title">Crecimiento Mensual {{ $data['year'] ?? '' }}</div>
            @if(count($data['months'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:15%;">Mes</th>
                    <th class="right"># Ventas</th>
                    <th class="right">Monto</th>
                    <th class="right">Ticket Prom.</th>
                    <th class="right">Año Anterior</th>
                    <th class="center">Crecimiento</th>
                </tr></thead>
                <tbody>
                    @foreach($data['months'] as $m)
                    @php
                        $growth = $m['growth_percent'];
                        $hasData = $m['total_amount'] > 0 || $m['prev_year_amount'] > 0;
                        $growthBadge = $hasData ? ($growth > 0 ? 'badge-green' : ($growth < 0 ? 'badge-red' : 'badge-yellow')) : '';
                        $growthText = $hasData ? (($growth > 0 ? '+' : '') . $growth . '%') : '-';
                    @endphp
                    <tr>
                        <td class="bold">{{ $m['month_name'] }}</td>
                        <td class="right">{{ number_format($m['sales_count'], 0, ',', '.') }}</td>
                        <td class="right bold">${{ number_format($m['total_amount'], 0, ',', '.') }}</td>
                        <td class="right text-muted">{{ $m['sales_count'] > 0 ? '$' . number_format($m['avg_ticket'], 0, ',', '.') : '-' }}</td>
                        <td class="right">${{ number_format($m['prev_year_amount'], 0, ',', '.') }}</td>
                        <td class="center">
                            @if($hasData)<span class="badge {{ $growthBadge }}">{{ $growthText }}</span>@else <span class="text-muted">-</span> @endif
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ TAX COLLECTION ============ --}}
        @elseif($report_type === 'tax-collection')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'IVA Cobrado', 'value' => '$' . number_format($data['totals']['total_tax_collected'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Base Gravable', 'value' => '$' . number_format($data['totals']['total_taxable_base'] ?? 0, 0, ',', '.'), 'color' => 'blue'],
                ['label' => 'Ventas Gravadas', 'value' => $data['totals']['taxed_sales_count'] ?? 0, 'color' => 'amber'],
            ]])
            <div class="section-title">Recaudo por Tasa de Impuesto</div>
            @if(count($data['by_rate'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Tasa IVA</th>
                    <th class="right"># Ventas</th>
                    <th class="right">Base Gravable</th>
                    <th class="right">IVA Cobrado</th>
                    <th class="right">Total</th>
                </tr></thead>
                <tbody>
                    @foreach($data['by_rate'] as $rate)
                    <tr>
                        <td class="bold">{{ $rate['tax_rate'] }}%</td>
                        <td class="right">{{ $rate['sales_count'] }}</td>
                        <td class="right">${{ number_format($rate['taxable_base'], 0, ',', '.') }}</td>
                        <td class="right text-green">${{ number_format($rate['tax_collected'], 0, ',', '.') }}</td>
                        <td class="right bold">${{ number_format($rate['total_with_tax'], 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ INCOME-EXPENSES ============ --}}
        @elseif($report_type === 'income-expenses')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Ingresos', 'value' => '$' . number_format($data['totals']['total_income'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Egresos', 'value' => '$' . number_format($data['totals']['total_expense'] ?? 0, 0, ',', '.'), 'color' => 'red'],
                ['label' => 'Balance', 'value' => '$' . number_format($data['totals']['balance'] ?? 0, 0, ',', '.'), 'color' => ($data['totals']['balance'] ?? 0) >= 0 ? 'blue' : 'red'],
            ]])
            <div class="section-title">Ingresos y Egresos por Periodo</div>
            @if(count($data['periods'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Periodo</th>
                    <th class="right">Ingresos</th>
                    <th class="right">Egresos</th>
                    <th class="right">Balance</th>
                </tr></thead>
                <tbody>
                    @foreach($data['periods'] as $period)
                    <tr>
                        <td class="bold">{{ $period['period_label'] }}</td>
                        <td class="right text-green">${{ number_format($period['income'], 0, ',', '.') }}</td>
                        <td class="right text-red">${{ number_format($period['expense'], 0, ',', '.') }}</td>
                        <td class="right bold {{ $period['balance'] >= 0 ? 'text-green' : 'text-red' }}">${{ number_format($period['balance'], 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ PAYMENTS / ENTRIES / EXPENSES ============ --}}
        @elseif(in_array($report_type, ['payments', 'entries', 'expenses']))
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Total Registros', 'value' => $data['totals']['total_count'] ?? 0, 'color' => 'blue'],
                ['label' => 'Monto Total', 'value' => '$' . number_format($data['totals']['total_amount'] ?? 0, 0, ',', '.'), 'color' => 'green'],
            ]])
            <div class="section-title">{{ $title }}</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Método de Pago</th>
                    <th>Referencia</th>
                    <th class="right">Monto</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td>{{ $item['date'] ?? '' }}</td>
                        <td>{{ $item['description'] ?? '' }}</td>
                        <td>{{ $item['payment_method_name'] ?? '-' }}</td>
                        <td class="text-muted">{{ $item['reference'] ?? '-' }}</td>
                        <td class="right bold">${{ number_format($item['amount'] ?? 0, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ COMMISSIONS ============ --}}
        @elseif($report_type === 'commissions')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Vendedores', 'value' => $data['totals']['sellers_count'] ?? 0, 'color' => 'blue'],
                ['label' => 'Total Ventas', 'value' => '$' . number_format($data['totals']['total_sales'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Total Comisiones', 'value' => '$' . number_format($data['totals']['total_commissions'] ?? 0, 0, ',', '.'), 'color' => 'amber'],
            ]])
            <div class="section-title">Comisiones por Vendedor</div>
            @if(count($data['sellers'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:30%;">Vendedor</th>
                    <th class="right"># Ventas</th>
                    <th class="right">Total Ventas</th>
                    <th class="right">% Comisión</th>
                    <th class="right">Comisión</th>
                </tr></thead>
                <tbody>
                    @foreach($data['sellers'] as $seller)
                    <tr>
                        <td class="bold">{{ $seller['seller_name'] }}</td>
                        <td class="right">{{ $seller['sales_count'] }}</td>
                        <td class="right">${{ number_format($seller['total_sales'], 0, ',', '.') }}</td>
                        <td class="right text-muted">{{ $seller['commission_rate'] }}%</td>
                        <td class="right bold text-green">${{ number_format($seller['total_commission'], 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ SALES-PRODUCTS ============ --}}
        @elseif($report_type === 'sales-products')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Productos', 'value' => $data['totals']['products_count'] ?? 0, 'color' => 'blue'],
                ['label' => 'Cantidad', 'value' => number_format($data['totals']['total_quantity'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Total Ventas', 'value' => '$' . number_format($data['totals']['total_amount'] ?? 0, 0, ',', '.'), 'color' => 'amber'],
            ]])
            <div class="section-title">Ventas por Producto/Servicio</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:30%;">Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th class="right">Cantidad</th>
                    <th class="right">Subtotal</th>
                    <th class="right">Descuento</th>
                    <th class="right">Impuesto</th>
                    <th class="right">Total</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td>{{ $item['product_name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td>{{ $item['category_name'] ?? '-' }}</td>
                        <td class="right bold">{{ number_format($item['total_quantity'], 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($item['total_subtotal'], 0, ',', '.') }}</td>
                        <td class="right text-red">${{ number_format($item['total_discount'], 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($item['total_tax'], 0, ',', '.') }}</td>
                        <td class="right bold">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ INVENTORY ============ --}}
        @elseif($report_type === 'inventory')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Productos', 'value' => $data['totals']['total_products'] ?? 0, 'color' => 'blue'],
                ['label' => 'Valor Inventario', 'value' => '$' . number_format($data['totals']['total_value'] ?? 0, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Stock Bajo', 'value' => $data['totals']['low_stock_count'] ?? 0, 'color' => 'red'],
                ['label' => 'Sin Stock', 'value' => $data['totals']['out_of_stock_count'] ?? 0, 'color' => 'amber'],
            ]])
            <div class="section-title">Inventario de Productos</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:25%;">Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th class="right">Stock</th>
                    <th class="right">Mínimo</th>
                    <th class="right">Costo</th>
                    <th class="right">Precio</th>
                    <th class="right">Valor</th>
                    <th class="center">Estado</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    @php
                        $stockStatus = ($item['current_stock'] ?? 0) <= 0 ? 'badge-red' : (($item['current_stock'] ?? 0) <= ($item['min_stock'] ?? 0) ? 'badge-orange' : 'badge-green');
                        $stockLabel = ($item['current_stock'] ?? 0) <= 0 ? 'Agotado' : (($item['current_stock'] ?? 0) <= ($item['min_stock'] ?? 0) ? 'Bajo' : 'OK');
                    @endphp
                    <tr>
                        <td>{{ $item['product_name'] ?? $item['name'] ?? '' }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td>{{ $item['category_name'] ?? '-' }}</td>
                        <td class="right bold">{{ $item['current_stock'] ?? 0 }}</td>
                        <td class="right text-muted">{{ $item['min_stock'] ?? 0 }}</td>
                        <td class="right">${{ number_format($item['purchase_price'] ?? $item['cost'] ?? 0, 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($item['sale_price'] ?? $item['price'] ?? 0, 0, ',', '.') }}</td>
                        <td class="right">${{ number_format(($item['current_stock'] ?? 0) * ($item['purchase_price'] ?? $item['cost'] ?? 0), 0, ',', '.') }}</td>
                        <td class="center"><span class="badge {{ $stockStatus }}">{{ $stockLabel }}</span></td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos</p>
            @endif

        {{-- ============ COST HISTORY ============ --}}
        @elseif($report_type === 'cost-history')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Total Cambios', 'value' => $data['totals']['total_changes'] ?? 0, 'color' => 'blue'],
                ['label' => 'Productos Afectados', 'value' => $data['totals']['products_affected'] ?? 0, 'color' => 'purple'],
                ['label' => 'Subidas', 'value' => $data['totals']['increases'] ?? 0, 'color' => 'green'],
                ['label' => 'Bajadas', 'value' => $data['totals']['decreases'] ?? 0, 'color' => 'red'],
            ]])
            <div class="section-title">Historial de Cambios de Costo</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Fecha</th>
                    <th style="width:20%;">Producto</th>
                    <th>SKU</th>
                    <th class="right">Anterior</th>
                    <th class="right">Nuevo</th>
                    <th class="right">Cambio $</th>
                    <th class="center">Cambio %</th>
                    <th>Razón</th>
                    <th>Usuario</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($item['created_at'])->format('d/m/Y H:i') }}</td>
                        <td>{{ $item['product_name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td class="right">${{ number_format($item['old_value'], 0, ',', '.') }}</td>
                        <td class="right bold">${{ number_format($item['new_value'], 0, ',', '.') }}</td>
                        <td class="right {{ $item['change_amount'] > 0 ? 'text-green' : ($item['change_amount'] < 0 ? 'text-red' : '') }}">
                            {{ $item['change_amount'] > 0 ? '+' : '' }}${{ number_format($item['change_amount'], 0, ',', '.') }}
                        </td>
                        <td class="center">
                            <span class="badge {{ $item['change_amount'] > 0 ? 'badge-green' : ($item['change_amount'] < 0 ? 'badge-red' : 'badge-yellow') }}">
                                {{ $item['change_amount'] > 0 ? '+' : '' }}{{ $item['change_percent'] }}%
                            </span>
                        </td>
                        <td>{{ $item['reason'] ?? '-' }}</td>
                        <td class="text-muted">{{ $item['changed_by_name'] ?? '-' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin cambios de costo en el periodo</p>
            @endif

        {{-- ============ SALE PRICE HISTORY ============ --}}
        @elseif($report_type === 'sale-price-history')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Total Cambios', 'value' => $data['totals']['total_changes'] ?? 0, 'color' => 'blue'],
                ['label' => 'Productos Afectados', 'value' => $data['totals']['products_affected'] ?? 0, 'color' => 'purple'],
                ['label' => 'Subidas', 'value' => $data['totals']['increases'] ?? 0, 'color' => 'green'],
                ['label' => 'Bajadas', 'value' => $data['totals']['decreases'] ?? 0, 'color' => 'red'],
            ]])
            <div class="section-title">Historial de Cambios de Precio de Venta</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Fecha</th>
                    <th style="width:20%;">Producto</th>
                    <th>SKU</th>
                    <th class="right">Anterior</th>
                    <th class="right">Nuevo</th>
                    <th class="right">Cambio $</th>
                    <th class="center">Cambio %</th>
                    <th>Razón</th>
                    <th>Usuario</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($item['created_at'])->format('d/m/Y H:i') }}</td>
                        <td>{{ $item['product_name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?? '-' }}</td>
                        <td class="right">${{ number_format($item['old_value'], 0, ',', '.') }}</td>
                        <td class="right bold">${{ number_format($item['new_value'], 0, ',', '.') }}</td>
                        <td class="right {{ $item['change_amount'] > 0 ? 'text-green' : ($item['change_amount'] < 0 ? 'text-red' : '') }}">
                            {{ $item['change_amount'] > 0 ? '+' : '' }}${{ number_format($item['change_amount'], 0, ',', '.') }}
                        </td>
                        <td class="center">
                            <span class="badge {{ $item['change_amount'] > 0 ? 'badge-green' : ($item['change_amount'] < 0 ? 'badge-red' : 'badge-yellow') }}">
                                {{ $item['change_amount'] > 0 ? '+' : '' }}{{ $item['change_percent'] }}%
                            </span>
                        </td>
                        <td>{{ $item['reason'] ?? '-' }}</td>
                        <td class="text-muted">{{ $item['changed_by_name'] ?? '-' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin cambios de precio en el periodo</p>
            @endif

        {{-- ============ JOURNAL BOOK ============ --}}
        @elseif($report_type === 'journal-book')
            @php
                $totalDebit = 0;
                $totalCredit = 0;
                foreach ($data as $entry) {
                    $totalDebit += (float) ($entry['total_debit'] ?? 0);
                    $totalCredit += (float) ($entry['total_credit'] ?? 0);
                }
            @endphp
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Total Registros', 'value' => count($data), 'color' => 'blue'],
                ['label' => 'Total Débitos', 'value' => '$' . number_format($totalDebit, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Total Créditos', 'value' => '$' . number_format($totalCredit, 0, ',', '.'), 'color' => 'red'],
            ]])
            @if(count($data) > 0)
                @foreach($data as $entry)
                    <div class="section-title">
                        {{ $entry['entry_number'] ?? '' }} — {{ $entry['date'] ?? '' }} — {{ $entry['description'] ?? '' }}
                    </div>
                    <table class="data-table">
                        <thead><tr>
                            <th style="width:15%;">Código</th>
                            <th style="width:35%;">Cuenta</th>
                            <th style="width:20%;">Descripción</th>
                            <th class="right" style="width:15%;">Débito</th>
                            <th class="right" style="width:15%;">Crédito</th>
                        </tr></thead>
                        <tbody>
                            @foreach($entry['lines'] ?? [] as $line)
                                @php $account = $line['accounting_account'] ?? []; @endphp
                                <tr>
                                    <td class="bold">{{ $account['code'] ?? '' }}</td>
                                    <td>{{ $account['name'] ?? '' }}</td>
                                    <td class="text-muted">{{ $line['description'] ?? '' }}</td>
                                    <td class="right">{{ (float)($line['debit'] ?? 0) > 0 ? '$' . number_format((float)$line['debit'], 0, ',', '.') : '-' }}</td>
                                    <td class="right">{{ (float)($line['credit'] ?? 0) > 0 ? '$' . number_format((float)$line['credit'], 0, ',', '.') : '-' }}</td>
                                </tr>
                            @endforeach
                            <tr style="background: #F3F4F6;">
                                <td colspan="3" class="bold" style="text-align:right;">Total:</td>
                                <td class="right bold">${{ number_format((float)($entry['total_debit'] ?? 0), 0, ',', '.') }}</td>
                                <td class="right bold">${{ number_format((float)($entry['total_credit'] ?? 0), 0, ',', '.') }}</td>
                            </tr>
                        </tbody>
                    </table>
                @endforeach
            @else
                <p class="empty-msg">Sin registros contables en el periodo</p>
            @endif

        {{-- ============ TRIAL BALANCE ============ --}}
        @elseif($report_type === 'trial-balance')
            @php
                $totalPrev   = 0; $totalDebit = 0; $totalCredit = 0; $totalFinal = 0;
                foreach ($data as $row) {
                    $totalPrev   += (float) ($row['previous_balance'] ?? 0);
                    $totalDebit  += (float) ($row['debit_movement']   ?? $row['debit']   ?? 0);
                    $totalCredit += (float) ($row['credit_movement']  ?? $row['credit']  ?? 0);
                    $totalFinal  += (float) ($row['final_balance']    ?? 0);
                }
            @endphp
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Cuentas',          'value' => count($data),                                        'color' => 'blue'],
                ['label' => 'Mov. Débito',       'value' => '$' . number_format($totalDebit,  0, ',', '.'),    'color' => 'green'],
                ['label' => 'Mov. Crédito',      'value' => '$' . number_format($totalCredit, 0, ',', '.'),    'color' => 'red'],
                ['label' => 'Saldo Final',       'value' => '$' . number_format($totalFinal,  0, ',', '.'),    'color' => 'amber'],
            ]])
            <div class="section-title">Balance de Comprobación</div>
            @if(count($data) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:10%;">Código</th>
                    <th style="width:30%;">Nombre Cuenta</th>
                    <th class="right" style="width:15%;">Saldo Anterior</th>
                    <th class="right" style="width:15%;">Mov. Débito</th>
                    <th class="right" style="width:15%;">Mov. Crédito</th>
                    <th class="right" style="width:15%;">Saldo Final</th>
                </tr></thead>
                <tbody>
                    @foreach($data as $row)
                    @php
                        $prev   = (float)($row['previous_balance'] ?? 0);
                        $debit  = (float)($row['debit_movement']   ?? $row['debit']   ?? 0);
                        $credit = (float)($row['credit_movement']  ?? $row['credit']  ?? 0);
                        $final  = (float)($row['final_balance']    ?? 0);
                    @endphp
                    <tr>
                        <td class="bold">{{ $row['account_code'] ?? $row['code'] ?? '' }}</td>
                        <td>{{ $row['account_name'] ?? $row['name'] ?? '' }}</td>
                        <td class="right">{{ $prev   !== 0 ? '$' . number_format($prev,   0, ',', '.') : '-' }}</td>
                        <td class="right">{{ $debit  >  0  ? '$' . number_format($debit,  0, ',', '.') : '-' }}</td>
                        <td class="right">{{ $credit >  0  ? '$' . number_format($credit, 0, ',', '.') : '-' }}</td>
                        <td class="right bold">{{ $final !== 0 ? '$' . number_format($final, 0, ',', '.') : '-' }}</td>
                    </tr>
                    @endforeach
                    <tr style="background: #EEF2FF; font-weight: bold;">
                        <td colspan="2" style="text-align:right; color:#3730A3;">TOTALES</td>
                        <td class="right" style="color:#3730A3;">${{ number_format($totalPrev,   0, ',', '.') }}</td>
                        <td class="right" style="color:#3730A3;">${{ number_format($totalDebit,  0, ',', '.') }}</td>
                        <td class="right" style="color:#3730A3;">${{ number_format($totalCredit, 0, ',', '.') }}</td>
                        <td class="right" style="color:#3730A3;">${{ number_format($totalFinal,  0, ',', '.') }}</td>
                    </tr>
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin datos en el periodo seleccionado</p>
            @endif

        {{-- ============ GENERAL LEDGER ============ --}}
        @elseif($report_type === 'general-ledger')
            <div class="section-title">Libro Mayor</div>
            @if(count($data) > 0)
            <table class="data-table">
                <thead><tr>
                    <th>Fecha</th>
                    <th>No. Registro</th>
                    <th style="width:30%;">Descripción</th>
                    <th class="right">Débito</th>
                    <th class="right">Crédito</th>
                    <th class="right">Saldo</th>
                </tr></thead>
                <tbody>
                    @foreach($data as $row)
                    <tr>
                        <td>{{ $row['date'] ?? '' }}</td>
                        <td class="bold">{{ $row['entry_number'] ?? '' }}</td>
                        <td>{{ $row['description'] ?? '' }}</td>
                        <td class="right">{{ (float)($row['debit'] ?? 0) > 0 ? '$' . number_format((float)$row['debit'], 0, ',', '.') : '-' }}</td>
                        <td class="right">{{ (float)($row['credit'] ?? 0) > 0 ? '$' . number_format((float)$row['credit'], 0, ',', '.') : '-' }}</td>
                        <td class="right bold">${{ number_format((float)($row['balance'] ?? 0), 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin movimientos en el periodo seleccionado</p>
            @endif

        {{-- ============ INCOME STATEMENT ============ --}}
        @elseif($report_type === 'income-statement')
            @php
                $totalIngresos = 0; $totalCostos = 0; $totalGastos = 0;
                foreach ($data as $section) {
                    $t = strtolower($section['title'] ?? '');
                    if (str_contains($t, 'ingreso')) $totalIngresos = (float) ($section['total'] ?? 0);
                    elseif (str_contains($t, 'costo') || str_contains($t, 'venta')) $totalCostos = (float) ($section['total'] ?? 0);
                    elseif (str_contains($t, 'gasto')) $totalGastos = (float) ($section['total'] ?? 0);
                }
                $netResult = $totalIngresos - $totalCostos - $totalGastos;
            @endphp
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Ingresos', 'value' => '$' . number_format($totalIngresos, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Costos', 'value' => '$' . number_format($totalCostos, 0, ',', '.'), 'color' => 'red'],
                ['label' => 'Gastos', 'value' => '$' . number_format($totalGastos, 0, ',', '.'), 'color' => 'amber'],
                ['label' => $netResult >= 0 ? 'Utilidad' : 'Pérdida', 'value' => '$' . number_format(abs($netResult), 0, ',', '.'), 'color' => $netResult >= 0 ? 'blue' : 'red'],
            ]])
            @foreach($data as $section)
                <div class="section-title">{{ $section['title'] ?? '' }}</div>
                <table class="data-table">
                    <thead><tr>
                        <th style="width:15%;">Código</th>
                        <th style="width:55%;">Cuenta</th>
                        <th class="right" style="width:30%;">Monto</th>
                    </tr></thead>
                    <tbody>
                        @foreach($section['accounts'] ?? [] as $account)
                        <tr>
                            <td class="bold">{{ $account['code'] ?? '' }}</td>
                            <td>{{ $account['name'] ?? '' }}</td>
                            <td class="right">${{ number_format((float)($account['amount'] ?? 0), 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                        <tr style="background: #F3F4F6; font-weight: bold;">
                            <td colspan="2" style="text-align:right;">Total {{ $section['title'] ?? '' }}:</td>
                            <td class="right">${{ number_format((float)($section['total'] ?? 0), 0, ',', '.') }}</td>
                        </tr>
                    </tbody>
                </table>
            @endforeach
            <div style="margin-top: 12px; padding: 8px 10px; background: {{ $netResult >= 0 ? '#ECFDF5' : '#FEF2F2' }}; border-radius: 5px; text-align: center;">
                <span style="font-size: 12px; font-weight: bold; color: {{ $netResult >= 0 ? '#059669' : '#DC2626' }};">
                    {{ $netResult >= 0 ? 'Utilidad Neta' : 'Pérdida Neta' }}: ${{ number_format(abs($netResult), 0, ',', '.') }}
                </span>
            </div>

        {{-- ============ BALANCE SHEET ============ --}}
        @elseif($report_type === 'balance-sheet')
            @php
                $totalActivos = 0; $totalPasivos = 0; $totalPatrimonio = 0;
                foreach ($data as $section) {
                    $t = strtolower($section['title'] ?? '');
                    if (str_contains($t, 'activo')) $totalActivos = (float) ($section['total'] ?? 0);
                    elseif (str_contains($t, 'pasivo')) $totalPasivos = (float) ($section['total'] ?? 0);
                    elseif (str_contains($t, 'patrimonio') || str_contains($t, 'capital')) $totalPatrimonio = (float) ($section['total'] ?? 0);
                }
                $pasivosYPatrimonio = $totalPasivos + $totalPatrimonio;
                $isBalanced = abs($totalActivos - $pasivosYPatrimonio) < 0.01;
            @endphp
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Activos', 'value' => '$' . number_format($totalActivos, 0, ',', '.'), 'color' => 'blue'],
                ['label' => 'Pasivos', 'value' => '$' . number_format($totalPasivos, 0, ',', '.'), 'color' => 'red'],
                ['label' => 'Patrimonio', 'value' => '$' . number_format($totalPatrimonio, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Ecuación', 'value' => $isBalanced ? 'Cuadra' : 'No Cuadra', 'color' => $isBalanced ? 'green' : 'red'],
            ]])
            @foreach($data as $section)
                <div class="section-title">{{ $section['title'] ?? '' }}</div>
                <table class="data-table">
                    <thead><tr>
                        <th style="width:15%;">Código</th>
                        <th style="width:55%;">Cuenta</th>
                        <th class="right" style="width:30%;">Monto</th>
                    </tr></thead>
                    <tbody>
                        @foreach($section['accounts'] ?? [] as $account)
                        <tr>
                            <td class="bold">{{ $account['code'] ?? '' }}</td>
                            <td>{{ $account['name'] ?? '' }}</td>
                            <td class="right">${{ number_format((float)($account['amount'] ?? 0), 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                        <tr style="background: #F3F4F6; font-weight: bold;">
                            <td colspan="2" style="text-align:right;">Total {{ $section['title'] ?? '' }}:</td>
                            <td class="right">${{ number_format((float)($section['total'] ?? 0), 0, ',', '.') }}</td>
                        </tr>
                    </tbody>
                </table>
            @endforeach
            <div style="margin-top: 12px; padding: 8px 10px; background: {{ $isBalanced ? '#ECFDF5' : '#FEF2F2' }}; border-radius: 5px; text-align: center;">
                <span style="font-size: 11px; font-weight: bold; color: {{ $isBalanced ? '#059669' : '#DC2626' }};">
                    {{ $isBalanced ? 'Ecuación Contable Verificada: Activos = Pasivos + Patrimonio' : 'Diferencia de $' . number_format(abs($totalActivos - $pasivosYPatrimonio), 0, ',', '.') . ' — La ecuación contable NO cuadra' }}
                </span>
            </div>

        {{-- ============ ACCOUNT SUBLEDGER ============ --}}
        @elseif($report_type === 'account-subledger')
            @php
                $grandDebit = 0; $grandCredit = 0;
                foreach ($data as $entry) {
                    $grandDebit += (float) ($entry['total_debit'] ?? 0);
                    $grandCredit += (float) ($entry['total_credit'] ?? 0);
                }
            @endphp
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Cuentas', 'value' => count($data), 'color' => 'blue'],
                ['label' => 'Total Débitos', 'value' => '$' . number_format($grandDebit, 0, ',', '.'), 'color' => 'green'],
                ['label' => 'Total Créditos', 'value' => '$' . number_format($grandCredit, 0, ',', '.'), 'color' => 'red'],
            ]])
            @if(count($data) > 0)
                @foreach($data as $entry)
                    @php $account = $entry['account'] ?? []; @endphp
                    <div class="section-title">
                        {{ $account['code'] ?? '' }} — {{ $account['name'] ?? '' }}
                        (Saldo: ${{ number_format((float)($entry['final_balance'] ?? 0), 0, ',', '.') }})
                    </div>
                    <table class="data-table">
                        <thead><tr>
                            <th>Fecha</th>
                            <th>No. Registro</th>
                            <th style="width:30%;">Descripción</th>
                            <th class="right">Débito</th>
                            <th class="right">Crédito</th>
                            <th class="right">Saldo</th>
                        </tr></thead>
                        <tbody>
                            @foreach($entry['movements'] ?? [] as $mov)
                            <tr>
                                <td>{{ $mov['date'] ?? '' }}</td>
                                <td class="bold">{{ $mov['entry_number'] ?? '' }}</td>
                                <td>{{ $mov['description'] ?? '' }}</td>
                                <td class="right">{{ (float)($mov['debit'] ?? 0) > 0 ? '$' . number_format((float)$mov['debit'], 0, ',', '.') : '-' }}</td>
                                <td class="right">{{ (float)($mov['credit'] ?? 0) > 0 ? '$' . number_format((float)$mov['credit'], 0, ',', '.') : '-' }}</td>
                                <td class="right bold">${{ number_format((float)($mov['balance'] ?? 0), 0, ',', '.') }}</td>
                            </tr>
                            @endforeach
                            <tr style="background: #F3F4F6; font-weight: bold;">
                                <td colspan="3" style="text-align:right;">Totales:</td>
                                <td class="right">${{ number_format((float)($entry['total_debit'] ?? 0), 0, ',', '.') }}</td>
                                <td class="right">${{ number_format((float)($entry['total_credit'] ?? 0), 0, ',', '.') }}</td>
                                <td class="right">${{ number_format((float)($entry['final_balance'] ?? 0), 0, ',', '.') }}</td>
                            </tr>
                        </tbody>
                    </table>
                @endforeach
            @else
                <p class="empty-msg">Sin datos en el periodo seleccionado</p>
            @endif

        {{-- ============ PRODUCTS CATALOG ============ --}}
        @elseif($report_type === 'products')
            @include('pdf.partials.summary-cards', ['cards' => [
                ['label' => 'Total Productos', 'value' => $data['totals']['total_products'] ?? 0, 'color' => 'blue'],
                ['label' => 'Activos', 'value' => $data['totals']['active_products'] ?? 0, 'color' => 'green'],
                ['label' => 'Stock Bajo', 'value' => $data['totals']['low_stock'] ?? 0, 'color' => 'red'],
                ['label' => 'Valor Inventario', 'value' => '$' . number_format($data['totals']['total_inventory_value'] ?? 0, 0, ',', '.'), 'color' => 'amber'],
            ]])
            <div class="section-title">Catálogo de Productos</div>
            @if(count($data['items'] ?? []) > 0)
            <table class="data-table">
                <thead><tr>
                    <th style="width:22%;">Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Marca</th>
                    <th class="right">P. Venta</th>
                    <th class="right">P. Compra</th>
                    <th class="right">Stock</th>
                    <th class="right">Mín.</th>
                    <th class="center">IVA</th>
                    <th class="center">Estado</th>
                </tr></thead>
                <tbody>
                    @foreach($data['items'] as $item)
                    <tr>
                        <td>{{ $item['name'] }}</td>
                        <td class="text-muted">{{ $item['sku'] ?: '-' }}</td>
                        <td>{{ $item['category_name'] }}</td>
                        <td>{{ $item['brand'] ?: '-' }}</td>
                        <td class="right bold">${{ number_format($item['sale_price'], 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($item['purchase_price'], 0, ',', '.') }}</td>
                        <td class="right bold {{ $item['current_stock'] <= $item['min_stock'] ? 'text-red' : '' }}">{{ $item['current_stock'] }}</td>
                        <td class="right text-muted">{{ $item['min_stock'] }}</td>
                        <td class="center">{{ $item['tax_rate'] !== null ? $item['tax_rate'] . '%' : 'Excl.' }}</td>
                        <td class="center">
                            <span class="badge {{ $item['is_active'] ? 'badge-green' : 'badge-red' }}">{{ $item['is_active'] ? 'Activo' : 'Inactivo' }}</span>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @else
            <p class="empty-msg">Sin productos registrados</p>
            @endif
        @endif
    </div>
</body>
</html>
