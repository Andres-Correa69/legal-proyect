<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Plan de Cuentas</title>
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

        .header { display: table; width: 100%; margin-bottom: 15px; border-bottom: 2px solid #4F46E5; padding-bottom: 12px; }
        .header-left { display: table-cell; width: 60%; vertical-align: top; }
        .header-right { display: table-cell; width: 40%; text-align: right; vertical-align: top; }
        .company-logo { max-height: 50px; max-width: 180px; margin-bottom: 8px; }
        .company-name { font-size: 18px; font-weight: bold; color: #1F2937; margin-bottom: 4px; }
        .company-info { font-size: 9px; color: #6B7280; }
        .report-type { display: inline-block; background: #EEF2FF; color: #4F46E5; font-size: 9px; font-weight: bold; padding: 3px 10px; border-radius: 4px; margin-bottom: 6px; }
        .report-title { font-size: 16px; font-weight: bold; color: #4F46E5; margin-bottom: 4px; }
        .report-period { font-size: 9px; color: #6B7280; }

        .summary-container { display: table; width: 100%; margin-bottom: 15px; }
        .summary-card { display: table-cell; padding: 0 4px; }
        .summary-card:first-child { padding-left: 0; }
        .summary-card:last-child { padding-right: 0; }
        .summary-box { border: 1px solid #E5E7EB; border-radius: 5px; padding: 8px; text-align: center; }
        .summary-box.blue { background: #EEF2FF; border-color: #C7D2FE; }
        .summary-box.green { background: #ECFDF5; border-color: #A7F3D0; }
        .summary-box.amber { background: #FFFBEB; border-color: #FDE68A; }
        .summary-box.red { background: #FEF2F2; border-color: #FECACA; }
        .summary-box.purple { background: #F5F3FF; border-color: #DDD6FE; }
        .summary-box.teal { background: #F0FDFA; border-color: #99F6E4; }
        .summary-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #6B7280; margin-bottom: 3px; }
        .summary-value { font-size: 14px; font-weight: bold; }
        .summary-value.blue { color: #4F46E5; }
        .summary-value.green { color: #059669; }
        .summary-value.amber { color: #D97706; }
        .summary-value.red { color: #DC2626; }
        .summary-value.purple { color: #7C3AED; }
        .summary-value.teal { color: #0D9488; }

        .section-title { background: #4F46E5; color: #fff; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px 4px 0 0; margin-top: 12px; }

        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .data-table th { background: #F3F4F6; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #374151; padding: 6px 5px; text-align: left; border-bottom: 2px solid #E5E7EB; }
        .data-table th.right { text-align: right; }
        .data-table th.center { text-align: center; }
        .data-table td { padding: 5px 5px; border-bottom: 1px solid #E5E7EB; font-size: 9px; }
        .data-table td.right { text-align: right; }
        .data-table td.center { text-align: center; }
        .data-table td.bold { font-weight: bold; }
        .data-table tr:nth-child(even) { background: #F9FAFB; }
        .data-table tr.parent-row { background: #EEF2FF; }
        .data-table tr.parent-row td { font-weight: bold; }

        .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .badge-blue { background: #EFF6FF; color: #2563EB; }
        .badge-red { background: #FEF2F2; color: #DC2626; }
        .badge-purple { background: #F5F3FF; color: #7C3AED; }
        .badge-green { background: #ECFDF5; color: #059669; }
        .badge-orange { background: #FFF7ED; color: #EA580C; }
        .badge-amber { background: #FFFBEB; color: #D97706; }
        .badge-active { background: #ECFDF5; color: #059669; }
        .badge-inactive { background: #FEF2F2; color: #DC2626; }

        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company { font-size: 8px; color: #9CA3AF; }
        .footer-developer { font-size: 7px; color: #B0B5BF; margin-top: 2px; }
        .footer-generated { font-size: 7px; color: #D1D5DB; margin-top: 1px; }
    </style>
</head>
<body>
    <div class="page-footer">
        <div class="footer-company">{{ $company->name ?? 'LEGAL SISTEMA' }} — Sistema de Gestión</div>
        <div class="footer-developer">Desarrollado por <strong>Legal Sistema</strong> · www.legalsistema.co</div>
        <div class="footer-generated">Generado el {{ now('America/Bogota')->format('d/m/Y H:i:s') }}</div>
    </div>

    <div class="container">
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
                    {{ $company->address ?? '' }}
                </div>
            </div>
            <div class="header-right">
                <div class="report-type">Contabilidad</div>
                <div class="report-title">Plan de Cuentas</div>
                <div class="report-period">Generado el {{ now('America/Bogota')->format('d/m/Y') }}</div>
            </div>
        </div>

        @php
            $totals = $data['totals'] ?? [];
            $byType = $totals['by_type'] ?? [];
            $typeLabels = [
                'asset' => 'Activos',
                'liability' => 'Pasivos',
                'equity' => 'Patrimonio',
                'revenue' => 'Ingresos',
                'expense' => 'Gastos',
                'cost' => 'Costos',
            ];
            $typeColors = [
                'asset' => 'blue',
                'liability' => 'red',
                'equity' => 'purple',
                'revenue' => 'green',
                'expense' => 'amber',
                'cost' => 'teal',
            ];
            $typeBadges = [
                'asset' => 'badge-blue',
                'liability' => 'badge-red',
                'equity' => 'badge-purple',
                'revenue' => 'badge-green',
                'expense' => 'badge-orange',
                'cost' => 'badge-amber',
            ];
        @endphp

        <div class="summary-container">
            <div class="summary-card">
                <div class="summary-box blue">
                    <div class="summary-label">Total Cuentas</div>
                    <div class="summary-value blue">{{ $totals['total'] ?? 0 }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box green">
                    <div class="summary-label">Activas</div>
                    <div class="summary-value green">{{ $totals['active'] ?? 0 }}</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-box red">
                    <div class="summary-label">Inactivas</div>
                    <div class="summary-value red">{{ $totals['inactive'] ?? 0 }}</div>
                </div>
            </div>
            @foreach(['asset', 'liability', 'equity', 'revenue'] as $type)
                <div class="summary-card">
                    <div class="summary-box {{ $typeColors[$type] ?? 'blue' }}">
                        <div class="summary-label">{{ $typeLabels[$type] ?? $type }}</div>
                        <div class="summary-value {{ $typeColors[$type] ?? 'blue' }}">{{ $byType[$type] ?? 0 }}</div>
                    </div>
                </div>
            @endforeach
        </div>

        <div class="section-title">Plan de Cuentas Contables</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 12%;">Código</th>
                    <th style="width: 35%;">Nombre</th>
                    <th class="center" style="width: 10%;">Tipo</th>
                    <th class="center" style="width: 10%;">Naturaleza</th>
                    <th class="center" style="width: 8%;">Nivel</th>
                    <th style="width: 12%;">Cuenta Padre</th>
                    <th class="center" style="width: 8%;">Estado</th>
                </tr>
            </thead>
            <tbody>
                @php
                    $typeLabelsLocal = [
                        'asset' => 'Activo', 'liability' => 'Pasivo', 'equity' => 'Patrimonio',
                        'revenue' => 'Ingreso', 'expense' => 'Gasto', 'cost' => 'Costo',
                    ];
                    $typeBadgesLocal = [
                        'asset' => 'badge-blue', 'liability' => 'badge-red', 'equity' => 'badge-purple',
                        'revenue' => 'badge-green', 'expense' => 'badge-orange', 'cost' => 'badge-amber',
                    ];
                    $natureLabels = ['debit' => 'Débito', 'credit' => 'Crédito'];
                @endphp
                @foreach($flatItems ?? [] as $item)
                    <tr class="{{ $item['is_parent_row'] ? 'parent-row' : '' }}">
                        <td class="bold" style="font-family: monospace;">{{ $item['code'] }}</td>
                        <td>{!! str_repeat('&nbsp;&nbsp;&nbsp;', $item['depth']) !!}{{ $item['name'] }}</td>
                        <td class="center"><span class="badge {{ $typeBadgesLocal[$item['type']] ?? '' }}">{{ $typeLabelsLocal[$item['type']] ?? $item['type'] }}</span></td>
                        <td class="center">{{ $natureLabels[$item['nature']] ?? $item['nature'] }}</td>
                        <td class="center">{{ $item['level'] }}</td>
                        <td style="font-family: monospace; font-size: 8px;">{{ $item['parent_code'] ?? '' }}</td>
                        <td class="center"><span class="badge {{ $item['is_active'] ? 'badge-active' : 'badge-inactive' }}">{{ $item['is_active'] ? 'Activa' : 'Inactiva' }}</span></td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</body>
</html>