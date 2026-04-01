<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auxiliar por Tercero</title>
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
            max-width: 1000px;
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

        /* Third Party Header */
        .third-party-header {
            background: #F3F4F6;
            padding: 8px 10px;
            margin-top: 18px;
            margin-bottom: 5px;
            border-left: 3px solid #4F46E5;
            border-radius: 4px;
        }

        .third-party-name {
            font-size: 11px;
            font-weight: bold;
            color: #1F2937;
        }

        .third-party-meta {
            font-size: 9px;
            color: #6B7280;
        }

        /* Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
        }

        .data-table th {
            background: #F9FAFB;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            color: #374151;
            padding: 6px 6px;
            text-align: left;
            border-bottom: 2px solid #E5E7EB;
        }

        .data-table th.right {
            text-align: right;
        }

        .data-table td {
            padding: 5px 6px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 10px;
        }

        .data-table td.right {
            text-align: right;
        }

        .data-table tr:nth-child(even) {
            background: #FAFAFA;
        }

        .subtotal-row td {
            background: #F3F4F6 !important;
            font-weight: bold;
            border-top: 2px solid #D1D5DB;
        }

        .difference-positive {
            color: #059669;
            font-weight: bold;
        }

        .difference-negative {
            color: #DC2626;
            font-weight: bold;
        }

        /* Grand Totals */
        .grand-totals {
            margin-top: 25px;
            border: 2px solid #4F46E5;
            border-radius: 6px;
            overflow: hidden;
        }

        .grand-totals-title {
            background: #4F46E5;
            color: #fff;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 12px;
        }

        .grand-totals-table {
            width: 100%;
            border-collapse: collapse;
        }

        .grand-totals-table td {
            padding: 8px 12px;
            font-size: 11px;
            border-bottom: 1px solid #E5E7EB;
        }

        .grand-totals-table td.label {
            font-weight: bold;
            color: #374151;
            width: 60%;
        }

        .grand-totals-table td.value {
            text-align: right;
            font-weight: bold;
            width: 40%;
        }

        .grand-totals-table tr:last-child td {
            border-bottom: none;
        }

        /* Fixed footer on every page */
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company { font-size: 8px; color: #9CA3AF; }
        .footer-developer { font-size: 7px; color: #B0B5BF; margin-top: 2px; }
        .footer-developer a { color: #4F46E5; text-decoration: none; }
        .footer-generated { font-size: 7px; color: #D1D5DB; margin-top: 1px; }
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
                    NIT: {{ $company->nit ?? '' }}<br>
                    {{ $company->address ?? '' }}<br>
                    {{ $company->city ?? '' }}
                </div>
            </div>
            <div class="header-right">
                <div class="report-type">AUXILIAR POR TERCERO</div>
                <div class="report-title">Movimientos por Proveedor</div>
                <div class="report-period">
                    Periodo: {{ \Carbon\Carbon::parse($dateFrom)->format('d/m/Y') }}
                    al {{ \Carbon\Carbon::parse($dateTo)->format('d/m/Y') }}
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-container">
            <div class="summary-card">
                <div class="summary-box income">
                    <div class="summary-label">Total Debito</div>
                    <div class="summary-value income">${{ number_format($grandTotalDebit, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box expense">
                    <div class="summary-label">Total Credito</div>
                    <div class="summary-value expense">${{ number_format($grandTotalCredit, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box balance">
                    <div class="summary-label">Diferencia</div>
                    <div class="summary-value balance">${{ number_format($grandTotalDifference, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <!-- Per Third Party Sections -->
        @foreach($entries as $entry)
            @php
                $tp = $entry['third_party'];
                $difference = $entry['total_debit'] - $entry['total_credit'];
            @endphp

            <div class="third-party-header">
                <span class="third-party-name">{{ $tp['name'] }}</span>
                <span class="third-party-meta">
                    &nbsp;&mdash;&nbsp;Proveedor
                    @if($tp['document'])
                        &nbsp;|&nbsp;{{ $tp['document'] }}
                    @endif
                    &nbsp;|&nbsp;{{ count($entry['movements']) }} movimiento{{ count($entry['movements']) !== 1 ? 's' : '' }}
                </span>
            </div>

            @php
                $previousBalance = $entry['previous_balance'] ?? 0;
                $finalBalance = $entry['final_balance'] ?? ($previousBalance + $entry['total_debit'] - $entry['total_credit']);
            @endphp

            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Fecha</th>
                        <th style="width: 9%;">No. Registro</th>
                        <th style="width: 18%;">Cuenta</th>
                        <th style="width: 23%;">Descripción</th>
                        <th class="right" style="width: 13%;">Débito</th>
                        <th class="right" style="width: 13%;">Crédito</th>
                        <th class="right" style="width: 14%;">Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    {{-- Saldo Anterior --}}
                    <tr style="background: #EEF2FF;">
                        <td colspan="6" style="text-align: right; font-weight: bold;">Saldo Anterior</td>
                        <td class="right" style="font-weight: bold;">${{ number_format($previousBalance, 0, ',', '.') }}</td>
                    </tr>
                    @foreach($entry['movements'] as $mov)
                    <tr>
                        <td>{{ $mov['date'] }}</td>
                        <td>{{ $mov['entry_number'] }}</td>
                        <td>{{ $mov['account_code'] }} - {{ $mov['account_name'] }}</td>
                        <td>{{ $mov['description'] }}</td>
                        <td class="right">{{ $mov['debit'] > 0 ? '$' . number_format($mov['debit'], 0, ',', '.') : '-' }}</td>
                        <td class="right">{{ $mov['credit'] > 0 ? '$' . number_format($mov['credit'], 0, ',', '.') : '-' }}</td>
                        <td class="right {{ ($mov['balance'] ?? 0) >= 0 ? 'difference-positive' : 'difference-negative' }}">
                            ${{ number_format($mov['balance'] ?? 0, 0, ',', '.') }}
                        </td>
                    </tr>
                    @endforeach
                    {{-- Subtotals --}}
                    <tr class="subtotal-row">
                        <td colspan="4" style="text-align: right;">Subtotal</td>
                        <td class="right">${{ number_format($entry['total_debit'], 0, ',', '.') }}</td>
                        <td class="right">${{ number_format($entry['total_credit'], 0, ',', '.') }}</td>
                        <td class="right"></td>
                    </tr>
                    {{-- Saldo Final --}}
                    <tr class="subtotal-row">
                        <td colspan="6" style="text-align: right;">Saldo Final</td>
                        <td class="right {{ $finalBalance >= 0 ? 'difference-positive' : 'difference-negative' }}">
                            ${{ number_format(abs($finalBalance), 0, ',', '.') }}{{ $finalBalance < 0 ? ' (Cr)' : ' (Db)' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        @endforeach

        <!-- Grand Totals -->
        <div class="grand-totals">
            <div class="grand-totals-title">Totales Generales — {{ count($entries) }} Proveedor{{ count($entries) !== 1 ? 'es' : '' }}</div>
            <table class="grand-totals-table">
                <tr>
                    <td class="label">Total Debito</td>
                    <td class="value" style="color: #059669;">${{ number_format($grandTotalDebit, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td class="label">Total Credito</td>
                    <td class="value" style="color: #DC2626;">${{ number_format($grandTotalCredit, 0, ',', '.') }}</td>
                </tr>
                <tr>
                    <td class="label">Diferencia</td>
                    <td class="value {{ $grandTotalDifference >= 0 ? 'difference-positive' : 'difference-negative' }}">
                        ${{ number_format(abs($grandTotalDifference), 0, ',', '.') }}{{ $grandTotalDifference < 0 ? ' (Cr)' : ' (Db)' }}
                    </td>
                </tr>
            </table>
        </div>

    </div>
</body>
</html>
