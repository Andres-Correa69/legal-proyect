<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis del Negocio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 15px 20px 50px 20px;
        }

        /* Header */
        .header {
            display: table;
            width: 100%;
            margin-bottom: 15px;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 12px;
        }

        .header-left {
            display: table-cell;
            width: 60%;
            vertical-align: top;
        }

        .header-right {
            display: table-cell;
            width: 40%;
            text-align: right;
            vertical-align: top;
        }

        .company-logo {
            max-height: 50px;
            max-width: 180px;
            margin-bottom: 8px;
        }

        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 4px;
        }

        .company-info {
            font-size: 9px;
            color: #6B7280;
        }

        .report-type {
            display: inline-block;
            background: #EEF2FF;
            color: #4F46E5;
            font-size: 9px;
            font-weight: bold;
            padding: 3px 10px;
            border-radius: 4px;
            margin-bottom: 6px;
        }

        .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 4px;
        }

        .report-period {
            font-size: 9px;
            color: #6B7280;
        }

        /* Summary Cards */
        .summary-container {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }

        .summary-card {
            display: table-cell;
            width: 25%;
            padding: 0 4px;
        }

        .summary-card:first-child { padding-left: 0; }
        .summary-card:last-child { padding-right: 0; }

        .summary-box {
            border: 1px solid #E5E7EB;
            border-radius: 5px;
            padding: 8px;
            text-align: center;
        }

        .summary-box.green { background: #ECFDF5; border-color: #A7F3D0; }
        .summary-box.blue { background: #EEF2FF; border-color: #C7D2FE; }
        .summary-box.amber { background: #FFFBEB; border-color: #FDE68A; }
        .summary-box.red { background: #FEF2F2; border-color: #FECACA; }

        .summary-label {
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            color: #6B7280;
            margin-bottom: 3px;
        }

        .summary-value {
            font-size: 14px;
            font-weight: bold;
        }

        .summary-value.green { color: #059669; }
        .summary-value.blue { color: #4F46E5; }
        .summary-value.amber { color: #D97706; }
        .summary-value.red { color: #DC2626; }

        .summary-sub {
            font-size: 7px;
            color: #9CA3AF;
            margin-top: 2px;
        }

        /* Section headers */
        .section-title {
            background: #4F46E5;
            color: #fff;
            font-size: 11px;
            font-weight: bold;
            padding: 6px 10px;
            border-radius: 4px 4px 0 0;
            margin-top: 12px;
        }

        /* Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }

        .data-table th {
            background: #F3F4F6;
            font-size: 8px;
            font-weight: bold;
            text-transform: uppercase;
            color: #374151;
            padding: 6px 5px;
            text-align: left;
            border-bottom: 2px solid #E5E7EB;
        }

        .data-table th.right { text-align: right; }
        .data-table th.center { text-align: center; }

        .data-table td {
            padding: 5px 5px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 9px;
        }

        .data-table td.right { text-align: right; }
        .data-table td.center { text-align: center; }
        .data-table td.bold { font-weight: bold; }

        .data-table tr:nth-child(even) {
            background: #F9FAFB;
        }

        /* Badges */
        .badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }

        .badge-green { background: #ECFDF5; color: #059669; }
        .badge-yellow { background: #FFFBEB; color: #D97706; }
        .badge-orange { background: #FFF7ED; color: #EA580C; }
        .badge-red { background: #FEF2F2; color: #DC2626; }

        .text-green { color: #059669; }
        .text-red { color: #DC2626; }
        .text-muted { color: #9CA3AF; }

        /* Two-column layout */
        .two-col {
            display: table;
            width: 100%;
        }

        .two-col .col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 0 5px;
        }

        .two-col .col:first-child { padding-left: 0; }
        .two-col .col:last-child { padding-right: 0; }

        .empty-msg {
            text-align: center;
            color: #6B7280;
            padding: 15px;
            font-size: 9px;
        }

        /* Fixed footer on every page */
        .page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            padding-top: 6px;
            background: #fff;
        }

        .footer-company {
            font-size: 8px;
            color: #9CA3AF;
        }

        .footer-developer {
            font-size: 7px;
            color: #B0B5BF;
            margin-top: 2px;
        }

        .footer-developer a {
            color: #4F46E5;
            text-decoration: none;
        }

        .footer-generated {
            font-size: 7px;
            color: #D1D5DB;
            margin-top: 1px;
        }

        .page-break {
            page-break-before: always;
        }
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
                <div class="report-type">ANÁLISIS</div>
                <div class="report-title">Análisis del Negocio</div>
                <div class="report-period">
                    {{ $period_label }} ({{ $date_from }} a {{ $date_to }})<br>
                    Generado el {{ now('America/Bogota')->format('d/m/Y H:i') }}
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-container">
            <div class="summary-card">
                <div class="summary-box green">
                    <div class="summary-label">Total Ventas</div>
                    <div class="summary-value green">${{ number_format($best_sellers['totals']['total_amount'] ?? 0, 0, ',', '.') }}</div>
                    <div class="summary-sub">{{ $best_sellers['totals']['products_count'] ?? 0 }} productos</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box blue">
                    <div class="summary-label">Clientes Activos</div>
                    <div class="summary-value blue">{{ $clients_by_amount['totals']['clients_count'] ?? 0 }}</div>
                    <div class="summary-sub">${{ number_format($clients_by_amount['totals']['total_amount'] ?? 0, 0, ',', '.') }} facturado</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box amber">
                    <div class="summary-label">Margen Promedio</div>
                    <div class="summary-value amber">{{ $product_profit['totals']['avg_margin'] ?? 0 }}%</div>
                    <div class="summary-sub">${{ number_format($product_profit['totals']['total_profit'] ?? 0, 0, ',', '.') }} utilidad</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box red">
                    <div class="summary-label">Bajo Stock</div>
                    <div class="summary-value red">{{ count($low_stock) }}</div>
                    <div class="summary-sub">productos por reabastecer</div>
                </div>
            </div>
        </div>

        <!-- Section 1: Productos Más Vendidos -->
        <div class="two-col">
            <div class="col">
                <div class="section-title">Productos Más Vendidos</div>
                @if(count($best_sellers['items'] ?? []) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 40%;">Producto</th>
                            <th class="right" style="width: 15%;">Cant.</th>
                            <th class="right" style="width: 25%;">Total</th>
                            <th class="right" style="width: 15%;">% Part.</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($best_sellers['items'] as $item)
                        <tr>
                            <td class="bold">{{ $item['rank'] }}</td>
                            <td>
                                {{ $item['product_name'] }}
                                @if(!empty($item['sku']))
                                <br><span class="text-muted">{{ $item['sku'] }}</span>
                                @endif
                            </td>
                            <td class="right bold">{{ number_format($item['total_quantity'], 0, ',', '.') }}</td>
                            <td class="right">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                            <td class="right text-muted">{{ $item['amount_percentage'] }}%</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg">Sin datos</p>
                @endif
            </div>
            <div class="col">
                <div class="section-title">Productos con Menos Stock</div>
                @if(count($low_stock) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40%;">Producto</th>
                            <th class="right" style="width: 20%;">Actual</th>
                            <th class="right" style="width: 20%;">Mínimo</th>
                            <th class="center" style="width: 20%;">Faltan</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($low_stock as $item)
                        <tr>
                            <td>
                                {{ $item['name'] }}
                                @if(!empty($item['sku']))
                                <br><span class="text-muted">{{ $item['sku'] }}</span>
                                @endif
                            </td>
                            <td class="right {{ $item['current_stock'] == 0 ? 'text-red' : '' }}" style="font-weight: bold;">
                                {{ $item['current_stock'] }}
                            </td>
                            <td class="right text-muted">{{ $item['min_stock'] }}</td>
                            <td class="center">
                                <span class="badge badge-red">-{{ $item['deficit'] }}</span>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg" style="color: #059669;">Stock suficiente en todos los productos</p>
                @endif
            </div>
        </div>

        <!-- Section 2: Clientes -->
        <div class="two-col">
            <div class="col">
                <div class="section-title">Clientes Más Recurrentes</div>
                @if(count($clients_by_count['items'] ?? []) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 35%;">Cliente</th>
                            <th class="right" style="width: 15%;">Compras</th>
                            <th class="right" style="width: 25%;">Total</th>
                            <th class="right" style="width: 20%;">Ticket</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($clients_by_count['items'] as $item)
                        <tr>
                            <td class="bold">{{ $item['rank'] }}</td>
                            <td>
                                {{ $item['client_name'] }}
                                @if(!empty($item['email']))
                                <br><span class="text-muted">{{ $item['email'] }}</span>
                                @endif
                            </td>
                            <td class="right bold">{{ $item['sales_count'] }}</td>
                            <td class="right">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                            <td class="right text-muted">${{ number_format($item['avg_ticket'], 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg">Sin datos</p>
                @endif
            </div>
            <div class="col">
                <div class="section-title">Clientes que Más Compran</div>
                @if(count($clients_by_amount['items'] ?? []) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 35%;">Cliente</th>
                            <th class="right" style="width: 20%;">Total</th>
                            <th class="right" style="width: 20%;">Pagado</th>
                            <th class="right" style="width: 20%;">Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($clients_by_amount['items'] as $item)
                        <tr>
                            <td class="bold">{{ $item['rank'] }}</td>
                            <td>
                                {{ $item['client_name'] }}
                                @if(!empty($item['email']))
                                <br><span class="text-muted">{{ $item['email'] }}</span>
                                @endif
                            </td>
                            <td class="right bold">${{ number_format($item['total_amount'], 0, ',', '.') }}</td>
                            <td class="right text-green">${{ number_format($item['total_paid'], 0, ',', '.') }}</td>
                            <td class="right text-red">${{ number_format($item['total_balance'], 0, ',', '.') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg">Sin datos</p>
                @endif
            </div>
        </div>

        <!-- Section 3: Margen y Crecimiento -->
        <div class="page-break"></div>

        <!-- Repeat header on second page -->
        <div style="margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
            <span style="font-size: 14px; font-weight: bold; color: #4F46E5;">Análisis del Negocio</span>
            <span style="font-size: 9px; color: #6B7280; margin-left: 10px;">{{ $period_label }} ({{ $date_from }} a {{ $date_to }})</span>
        </div>

        <div class="two-col">
            <div class="col">
                <div class="section-title">Productos con Más Margen</div>
                @if(count($top_margin) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 30%;">Producto</th>
                            <th class="right" style="width: 18%;">Ingresos</th>
                            <th class="right" style="width: 18%;">Costos</th>
                            <th class="right" style="width: 18%;">Utilidad</th>
                            <th class="center" style="width: 16%;">Margen</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($top_margin as $item)
                        @php
                            $margin = $item['margin_percent'];
                            $badgeClass = $margin >= 40 ? 'badge-green' : ($margin >= 20 ? 'badge-green' : ($margin >= 10 ? 'badge-yellow' : ($margin > 0 ? 'badge-orange' : 'badge-red')));
                        @endphp
                        <tr>
                            <td>
                                {{ $item['product_name'] }}
                                @if(!empty($item['sku']))
                                <br><span class="text-muted">{{ $item['sku'] }}</span>
                                @endif
                            </td>
                            <td class="right text-green">${{ number_format($item['total_revenue'], 0, ',', '.') }}</td>
                            <td class="right text-red">${{ number_format($item['total_cost'], 0, ',', '.') }}</td>
                            <td class="right bold {{ $item['profit'] >= 0 ? 'text-green' : 'text-red' }}">
                                ${{ number_format($item['profit'], 0, ',', '.') }}
                            </td>
                            <td class="center">
                                <span class="badge {{ $badgeClass }}">{{ $margin }}%</span>
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg">Sin datos</p>
                @endif
            </div>
            <div class="col">
                <div class="section-title">Crecimiento Mensual {{ $monthly_growth['year'] ?? '' }}</div>
                @if(count($monthly_growth['months'] ?? []) > 0)
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Mes</th>
                            <th class="right" style="width: 15%;"># Ventas</th>
                            <th class="right" style="width: 25%;">Monto</th>
                            <th class="right" style="width: 20%;">Ticket</th>
                            <th class="center" style="width: 20%;">Crec.</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($monthly_growth['months'] as $m)
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
                            <td class="right text-muted">
                                {{ $m['sales_count'] > 0 ? '$' . number_format($m['avg_ticket'], 0, ',', '.') : '-' }}
                            </td>
                            <td class="center">
                                @if($hasData)
                                <span class="badge {{ $growthBadge }}">{{ $growthText }}</span>
                                @else
                                <span class="text-muted">-</span>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @else
                <p class="empty-msg">Sin datos</p>
                @endif
            </div>
        </div>

    </div>
</body>
</html>
