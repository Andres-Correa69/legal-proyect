<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saldos de Clientes</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #333;
            background: #fff;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px 20px 50px 20px;
        }

        /* Header */
        .header {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            border-bottom: 2px solid #4F46E5;
            padding-bottom: 15px;
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
            font-size: 20px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 5px;
        }

        .company-info {
            font-size: 10px;
            color: #6B7280;
        }

        .report-type {
            display: inline-block;
            background: #EEF2FF;
            color: #4F46E5;
            font-size: 10px;
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .report-title {
            font-size: 18px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 5px;
        }

        .report-period {
            font-size: 10px;
            color: #6B7280;
        }

        /* Summary Cards */
        .summary-container {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }

        .summary-card {
            display: table-cell;
            width: 25%;
            padding: 0 5px;
        }

        .summary-card:first-child {
            padding-left: 0;
        }

        .summary-card:last-child {
            padding-right: 0;
        }

        .summary-box {
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }

        .summary-box.clients {
            background: #F3F4F6;
            border-color: #D1D5DB;
        }

        .summary-box.sales {
            background: #EEF2FF;
            border-color: #C7D2FE;
        }

        .summary-box.paid {
            background: #ECFDF5;
            border-color: #A7F3D0;
        }

        .summary-box.pending {
            background: #FEF2F2;
            border-color: #FECACA;
        }

        .summary-label {
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #6B7280;
            margin-bottom: 5px;
        }

        .summary-value {
            font-size: 16px;
            font-weight: bold;
        }

        .summary-value.clients {
            color: #374151;
        }

        .summary-value.sales {
            color: #4F46E5;
        }

        .summary-value.paid {
            color: #059669;
        }

        .summary-value.pending {
            color: #DC2626;
        }

        .summary-sub {
            font-size: 8px;
            color: #9CA3AF;
            margin-top: 2px;
        }

        /* Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .data-table th {
            background: #F3F4F6;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #374151;
            padding: 8px 6px;
            text-align: left;
            border-bottom: 2px solid #E5E7EB;
        }

        .data-table th.right {
            text-align: right;
        }

        .data-table th.center {
            text-align: center;
        }

        .data-table td {
            padding: 8px 6px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 10px;
        }

        .data-table td.right {
            text-align: right;
        }

        .data-table td.center {
            text-align: center;
        }

        .data-table tr:nth-child(even) {
            background: #F9FAFB;
        }

        /* Status badges */
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
        }

        .status-pending {
            background: #FEF2F2;
            color: #DC2626;
        }

        .status-partial {
            background: #FFFBEB;
            color: #D97706;
        }

        .status-paid {
            background: #ECFDF5;
            color: #059669;
        }

        /* Amount colors */
        .amount-paid {
            color: #059669;
            font-weight: bold;
        }

        .amount-pending {
            color: #DC2626;
            font-weight: bold;
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
                <div class="report-type">CARTERA</div>
                <div class="report-title">Saldos de Clientes</div>
                <div class="report-period">
                    Generado el {{ now('America/Bogota')->format('d/m/Y H:i') }}
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-container">
            <div class="summary-card">
                <div class="summary-box clients">
                    <div class="summary-label">Total Clientes</div>
                    <div class="summary-value clients">{{ $totals['clients_count'] ?? 0 }}</div>
                    <div class="summary-sub">{{ $totals['clients_with_debt'] ?? 0 }} con deuda</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box sales">
                    <div class="summary-label">Total Ventas</div>
                    <div class="summary-value sales">${{ number_format($totals['total_sales'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box paid">
                    <div class="summary-label">Total Pagado</div>
                    <div class="summary-value paid">${{ number_format($totals['total_paid'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box pending">
                    <div class="summary-label">Total Pendiente</div>
                    <div class="summary-value pending">${{ number_format($totals['total_balance_due'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <!-- Clients Table -->
        @if(count($clients) > 0)
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 22%;">Cliente</th>
                    <th style="width: 12%;">Documento</th>
                    <th style="width: 15%;">Email</th>
                    <th class="right" style="width: 13%;">Total Ventas</th>
                    <th class="right" style="width: 13%;">Total Pagado</th>
                    <th class="right" style="width: 13%;">Pendiente</th>
                    <th class="center" style="width: 5%;">Ventas</th>
                    <th class="center" style="width: 7%;">Estado</th>
                </tr>
            </thead>
            <tbody>
                @foreach($clients as $client)
                <tr>
                    <td>{{ $client['client_name'] ?? '' }}</td>
                    <td>
                        @if(!empty($client['document_type']) && !empty($client['document_id']))
                            {{ $client['document_type'] }}: {{ $client['document_id'] }}
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $client['email'] ?? '-' }}</td>
                    <td class="right" style="font-weight: bold;">
                        ${{ number_format($client['total_sales'] ?? 0, 0, ',', '.') }}
                    </td>
                    <td class="right amount-paid">
                        ${{ number_format($client['total_paid'] ?? 0, 0, ',', '.') }}
                    </td>
                    <td class="right amount-pending">
                        ${{ number_format($client['balance_due'] ?? 0, 0, ',', '.') }}
                    </td>
                    <td class="center">{{ $client['sales_count'] ?? 0 }}</td>
                    <td class="center">
                        @php
                            $status = $client['payment_status'] ?? 'pending';
                            $statusClass = match($status) {
                                'paid' => 'status-paid',
                                'partial' => 'status-partial',
                                default => 'status-pending',
                            };
                            $statusLabel = match($status) {
                                'paid' => 'Pagado',
                                'partial' => 'Parcial',
                                default => 'Pendiente',
                            };
                        @endphp
                        <span class="status-badge {{ $statusClass }}">{{ $statusLabel }}</span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @else
        <p style="text-align: center; color: #6B7280; padding: 20px;">No hay clientes con ventas registradas</p>
        @endif

    </div>
</body>
</html>
