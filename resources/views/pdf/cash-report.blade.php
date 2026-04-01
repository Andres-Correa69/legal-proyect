<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Caja - {{ $reportTitle }}</title>
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
            width: 33.33%;
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

        .summary-box.income {
            background: #ECFDF5;
            border-color: #A7F3D0;
        }

        .summary-box.expense {
            background: #FEF2F2;
            border-color: #FECACA;
        }

        .summary-box.balance {
            background: #EEF2FF;
            border-color: #C7D2FE;
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

        .summary-value.income {
            color: #059669;
        }

        .summary-value.expense {
            color: #DC2626;
        }

        .summary-value.balance {
            color: #4F46E5;
        }

        /* Section Title */
        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
            margin-top: 15px;
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

        /* Type badges */
        .type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
        }

        .type-income {
            background: #ECFDF5;
            color: #059669;
        }

        .type-expense {
            background: #FEF2F2;
            color: #DC2626;
        }

        /* Amount colors */
        .amount-income {
            color: #059669;
            font-weight: bold;
        }

        .amount-expense {
            color: #DC2626;
            font-weight: bold;
        }

        /* Fixed footer on every page */
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company { font-size: 8px; color: #9CA3AF; }
        .footer-developer { font-size: 7px; color: #B0B5BF; margin-top: 2px; }
        .footer-developer a { color: #4F46E5; text-decoration: none; }
        .footer-generated { font-size: 7px; color: #D1D5DB; margin-top: 1px; }

        /* Page break for multiple sections */
        .page-break {
            page-break-after: always;
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
                    NIT: {{ $company->nit ?? '900123456-7' }}<br>
                    {{ $company->address ?? '' }}<br>
                    {{ $company->city ?? '' }}
                </div>
            </div>
            <div class="header-right">
                <div class="report-type">REPORTE DE CAJA</div>
                <div class="report-title">{{ $reportTitle }}</div>
                @if(isset($dateFrom) && isset($dateTo))
                <div class="report-period">
                    Periodo: {{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }} al {{ \Carbon\Carbon::parse($dateTo)->format('d/m/Y') }}
                </div>
                @endif
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-container">
            @if(isset($totals['opening_balance']))
            <div class="summary-card" style="width: 25%;">
                <div class="summary-box" style="background: #F3F4F6; border-color: #D1D5DB;">
                    <div class="summary-label">Saldo Inicial</div>
                    <div class="summary-value" style="color: #374151;">${{ number_format($totals['opening_balance'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
            @endif
            <div class="summary-card" style="width: {{ isset($totals['opening_balance']) ? '25%' : '33.33%' }};">
                <div class="summary-box income">
                    <div class="summary-label">Total Ingresos</div>
                    <div class="summary-value income">${{ number_format($totals['total_income'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card" style="width: {{ isset($totals['opening_balance']) ? '25%' : '33.33%' }};">
                <div class="summary-box expense">
                    <div class="summary-label">Total Egresos</div>
                    <div class="summary-value expense">${{ number_format($totals['total_expense'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card" style="width: {{ isset($totals['opening_balance']) ? '25%' : '33.33%' }};">
                <div class="summary-box balance">
                    <div class="summary-label">{{ isset($totals['closing_balance']) ? 'Saldo Final' : 'Flujo Neto' }}</div>
                    <div class="summary-value balance">${{ number_format($totals['closing_balance'] ?? $totals['net_flow'] ?? 0, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <!-- Transactions Table -->
        @if(isset($transactions) && count($transactions) > 0)
        <div class="section-title">Detalle de Transacciones</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 11%;">Fecha</th>
                    <th style="width: 8%;">Tipo</th>
                    <th style="width: 10%;">Numero</th>
                    <th style="width: 22%;">Concepto</th>
                    <th style="width: 12%;">Caja</th>
                    <th style="width: 10%;">Metodo</th>
                    <th class="right" style="width: 12%;">Monto</th>
                    <th class="right" style="width: 15%;">Saldo</th>
                </tr>
            </thead>
            <tbody>
                @foreach($transactions as $transaction)
                <tr>
                    <td>{{ $transaction['date'] ?? '' }}</td>
                    <td>
                        <span class="type-badge {{ $transaction['type'] === 'income' ? 'type-income' : 'type-expense' }}">
                            {{ $transaction['type'] === 'income' ? 'Ingreso' : 'Egreso' }}
                        </span>
                    </td>
                    <td>{{ $transaction['payment_number'] ?? '' }}</td>
                    <td>{{ $transaction['concept'] ?? '' }}</td>
                    <td>{{ $transaction['cash_register'] ?? '' }}</td>
                    <td>{{ $transaction['payment_method'] ?? '' }}</td>
                    <td class="right {{ $transaction['type'] === 'income' ? 'amount-income' : 'amount-expense' }}">
                        ${{ number_format($transaction['amount'] ?? 0, 0, ',', '.') }}
                    </td>
                    <td class="right" style="font-weight: bold;">
                        ${{ number_format($transaction['balance'] ?? 0, 0, ',', '.') }}
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- By Date Summary (if available) -->
        @if(isset($byDate) && count($byDate) > 0)
        <div class="section-title">Resumen por Fecha</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 20%;">Fecha</th>
                    <th class="right" style="width: 20%;">Ingresos</th>
                    <th class="right" style="width: 20%;">Egresos</th>
                    <th class="right" style="width: 20%;">Flujo Neto</th>
                    <th class="center" style="width: 20%;">Transacciones</th>
                </tr>
            </thead>
            <tbody>
                @foreach($byDate as $day)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($day['date'])->format('d/m/Y') }}</td>
                    <td class="right amount-income">${{ number_format($day['income'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-expense">${{ number_format($day['expense'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right" style="font-weight: bold;">${{ number_format($day['net_flow'] ?? 0, 0, ',', '.') }}</td>
                    <td class="center">{{ ($day['income_count'] ?? 0) + ($day['expense_count'] ?? 0) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- By Payment Method Summary (if available) -->
        @if(isset($byPaymentMethod) && count($byPaymentMethod) > 0)
        <div class="section-title">Resumen por Metodo de Pago</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Metodo de Pago</th>
                    <th class="right" style="width: 20%;">Ingresos</th>
                    <th class="right" style="width: 20%;">Egresos</th>
                    <th class="right" style="width: 15%;">Neto</th>
                    <th class="center" style="width: 15%;">Cantidad</th>
                </tr>
            </thead>
            <tbody>
                @foreach($byPaymentMethod as $method)
                <tr>
                    <td>{{ $method['payment_method'] ?? '' }}</td>
                    <td class="right amount-income">${{ number_format($method['income'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-expense">${{ number_format($method['expense'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right" style="font-weight: bold;">${{ number_format($method['net_flow'] ?? 0, 0, ',', '.') }}</td>
                    <td class="center">{{ $method['count'] ?? 0 }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Cash Registers Summary (for by_register report) -->
        @if(isset($cashRegisters) && count($cashRegisters) > 0)
        <div class="section-title">Resumen por Caja</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 25%;">Caja</th>
                    <th class="center" style="width: 10%;">Tipo</th>
                    <th class="right" style="width: 15%;">Saldo Actual</th>
                    <th class="right" style="width: 15%;">Ingresos</th>
                    <th class="right" style="width: 15%;">Egresos</th>
                    <th class="right" style="width: 10%;">Neto</th>
                    <th class="center" style="width: 10%;">Sesiones</th>
                </tr>
            </thead>
            <tbody>
                @foreach($cashRegisters as $register)
                <tr>
                    <td>{{ $register['name'] ?? '' }}</td>
                    <td class="center">
                        @php
                            $typeLabel = match($register['type'] ?? '') {
                                'minor' => 'Menor',
                                'major' => 'Mayor',
                                'bank' => 'Banco',
                                default => $register['type'] ?? '',
                            };
                        @endphp
                        {{ $typeLabel }}
                    </td>
                    <td class="right" style="font-weight: bold;">${{ number_format($register['current_balance'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-income">${{ number_format($register['total_income'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-expense">${{ number_format($register['total_expense'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right">${{ number_format($register['net_flow'] ?? 0, 0, ',', '.') }}</td>
                    <td class="center">{{ $register['sessions_count'] ?? 0 }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Sessions Details (for by_register report) -->
        @if(isset($sessions) && count($sessions) > 0)
        <div class="section-title">Detalle de Sesiones</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 12%;">Numero</th>
                    <th style="width: 15%;">Apertura</th>
                    <th style="width: 15%;">Cierre</th>
                    <th style="width: 10%;">Estado</th>
                    <th class="right" style="width: 12%;">Saldo Inicial</th>
                    <th class="right" style="width: 12%;">Saldo Final</th>
                    <th class="right" style="width: 12%;">Ingresos</th>
                    <th class="right" style="width: 12%;">Egresos</th>
                </tr>
            </thead>
            <tbody>
                @foreach($sessions as $session)
                <tr>
                    <td>{{ $session['session_number'] ?? '' }}</td>
                    <td>{{ $session['opened_at'] ?? '' }}</td>
                    <td>{{ $session['closed_at'] ?? 'Abierta' }}</td>
                    <td class="center">
                        <span class="type-badge {{ ($session['status'] ?? 'closed') === 'open' ? 'type-income' : '' }}" style="{{ ($session['status'] ?? 'closed') !== 'open' ? 'background: #F3F4F6; color: #374151;' : '' }}">
                            {{ ($session['status'] ?? 'closed') === 'open' ? 'Abierta' : 'Cerrada' }}
                        </span>
                    </td>
                    <td class="right">${{ number_format($session['opening_balance'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right" style="font-weight: bold;">
                        @if(isset($session['closing_balance']))
                            ${{ number_format($session['closing_balance'], 0, ',', '.') }}
                        @else
                            -
                        @endif
                    </td>
                    <td class="right amount-income">${{ number_format($session['total_income'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-expense">${{ number_format($session['total_expense'] ?? 0, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

        <!-- Active Sessions (for global report) -->
        @if(isset($activeSessions) && count($activeSessions) > 0)
        <div class="section-title">Sesiones Activas</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 20%;">Caja</th>
                    <th style="width: 15%;">Abierta por</th>
                    <th style="width: 15%;">Apertura</th>
                    <th class="right" style="width: 12%;">Saldo Inicial</th>
                    <th class="right" style="width: 12%;">Saldo Actual</th>
                    <th class="right" style="width: 12%;">Ingresos</th>
                    <th class="right" style="width: 14%;">Egresos</th>
                </tr>
            </thead>
            <tbody>
                @foreach($activeSessions as $session)
                <tr>
                    <td>{{ $session['cash_register'] ?? '' }}</td>
                    <td>{{ $session['opened_by'] ?? '' }}</td>
                    <td>{{ $session['opened_at'] ?? '' }}</td>
                    <td class="right">${{ number_format($session['opening_balance'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right" style="font-weight: bold;">${{ number_format($session['current_balance'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-income">${{ number_format($session['total_income'] ?? 0, 0, ',', '.') }}</td>
                    <td class="right amount-expense">${{ number_format($session['total_expense'] ?? 0, 0, ',', '.') }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
        @endif

    </div>
</body>
</html>
