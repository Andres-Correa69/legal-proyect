<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $sale->invoice_number }} - Cuenta de Cobro</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.5;
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
            border-bottom: 2px solid #6B21A8;
            padding-bottom: 20px;
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
            font-size: 22px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 5px;
        }

        .company-info {
            font-size: 11px;
            color: #6B7280;
        }

        .invoice-type {
            display: inline-block;
            background: #F3E8FF;
            color: #6B21A8;
            font-size: 11px;
            font-weight: bold;
            padding: 4px 12px;
            border-radius: 4px;
            margin-bottom: 8px;
        }

        .invoice-number {
            font-size: 20px;
            font-weight: bold;
            color: #6B21A8;
            margin-bottom: 5px;
        }

        .invoice-date {
            font-size: 11px;
            color: #6B7280;
        }

        /* Client Section */
        .section {
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #6B7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .client-box {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 6px;
            padding: 12px;
        }

        .client-name {
            font-size: 14px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 5px;
        }

        .client-info {
            font-size: 11px;
            color: #6B7280;
        }

        /* Payment Status */
        .status-box {
            border: 1px solid;
            border-radius: 6px;
            padding: 12px;
        }

        .status-paid {
            background: #ECFDF5;
            border-color: #A7F3D0;
            color: #065F46;
        }

        .status-partial {
            background: #FFFBEB;
            border-color: #FDE68A;
            color: #92400E;
        }

        .status-pending {
            background: #FEF2F2;
            border-color: #FECACA;
            color: #991B1B;
        }

        .status-label {
            font-size: 13px;
            font-weight: bold;
        }

        .status-balance {
            font-size: 11px;
            margin-top: 3px;
        }

        /* Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .items-table th {
            background: #F3F4F6;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #374151;
            padding: 10px 8px;
            text-align: left;
            border-bottom: 2px solid #E5E7EB;
        }

        .items-table th.right {
            text-align: right;
        }

        .items-table th.center {
            text-align: center;
        }

        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 11px;
        }

        .items-table td.right {
            text-align: right;
        }

        .items-table td.center {
            text-align: center;
        }

        .item-description {
            font-weight: 500;
            color: #1F2937;
        }

        .discount {
            color: #DC2626;
        }

        /* Totals */
        .totals-container {
            display: table;
            width: 100%;
        }

        .totals-spacer {
            display: table-cell;
            width: 60%;
        }

        .totals-box {
            display: table-cell;
            width: 40%;
        }

        .total-row {
            display: table;
            width: 100%;
            margin-bottom: 6px;
        }

        .total-label {
            display: table-cell;
            font-size: 11px;
            color: #6B7280;
        }

        .total-value {
            display: table-cell;
            text-align: right;
            font-size: 11px;
            font-weight: 500;
        }

        .total-row.final {
            border-top: 2px solid #E5E7EB;
            padding-top: 8px;
            margin-top: 8px;
        }

        .total-row.final .total-label,
        .total-row.final .total-value {
            font-size: 14px;
            font-weight: bold;
            color: #6B21A8;
        }

        /* Payments Section */
        .payments-section {
            margin-top: 25px;
            border-top: 1px dashed #E5E7EB;
            padding-top: 20px;
        }

        .payments-table {
            width: 100%;
            border-collapse: collapse;
        }

        .payments-table th {
            background: #F3F4F6;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: #374151;
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #E5E7EB;
        }

        .payments-table th.right {
            text-align: right;
        }

        .payments-table td {
            padding: 8px;
            font-size: 11px;
            border-bottom: 1px solid #F3F4F6;
        }

        .payments-table td.right {
            text-align: right;
        }

        .payments-table tr.total-paid {
            background: #ECFDF5;
        }

        .payments-table tr.total-paid td {
            font-weight: bold;
            color: #065F46;
        }

        .payments-table tr.balance {
            background: #FFFBEB;
        }

        .payments-table tr.balance td {
            font-weight: bold;
            color: #92400E;
        }

        /* Fixed footer on every page */
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company { font-size: 8px; color: #9CA3AF; }
        .footer-developer { font-size: 7px; color: #B0B5BF; margin-top: 2px; }
        .footer-developer a { color: #4F46E5; text-decoration: none; }
        .footer-generated { font-size: 7px; color: #D1D5DB; margin-top: 1px; }

        /* Utility Classes */
        .text-success {
            color: #059669;
        }

        .text-warning {
            color: #D97706;
        }

        .text-danger {
            color: #DC2626;
        }

        .font-bold {
            font-weight: bold;
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
                    {{ $company->address ?? 'Carrera 14 #15-30, Centro' }}<br>
                    {{ $company->city ?? 'Armenia, Quindio' }}
                </div>
            </div>
            <div class="header-right">
                <div class="invoice-type">CUENTA DE COBRO</div>
                <div class="invoice-number">{{ $sale->invoice_number }}</div>
                <div class="invoice-date">
                    Fecha: {{ \Carbon\Carbon::parse($sale->invoice_date)->format('d/m/Y') }}
                </div>
            </div>
        </div>

        <!-- Client & Status -->
        <div style="display: table; width: 100%; margin-bottom: 20px;">
            <div style="display: table-cell; width: 55%; padding-right: 15px; vertical-align: top;">
                <div class="section-title">Datos del Cliente</div>
                <div class="client-box">
                    <div class="client-name">{{ $sale->client->name ?? 'N/A' }}</div>
                    <div class="client-info">
                        @if($sale->client->document_type && $sale->client->document_id)
                            {{ $sale->client->document_type }}: {{ $sale->client->document_id }}<br>
                        @endif
                        @if($sale->client->email)
                            {{ $sale->client->email }}<br>
                        @endif
                        @if($sale->client->phone)
                            Tel: {{ $sale->client->phone }}<br>
                        @endif
                        @if($sale->client->address)
                            {{ $sale->client->address }}
                        @endif
                    </div>
                </div>
            </div>
            <div style="display: table-cell; width: 45%; vertical-align: top;">
                <div class="section-title">Estado del Pago</div>
                @php
                    $statusClass = match($sale->payment_status) {
                        'paid' => 'status-paid',
                        'partial' => 'status-partial',
                        default => 'status-pending',
                    };
                    $statusLabel = match($sale->payment_status) {
                        'paid' => 'Pagada Completamente',
                        'partial' => 'Pago Parcial',
                        default => 'Pendiente de Pago',
                    };
                @endphp
                <div class="status-box {{ $statusClass }}">
                    <div class="status-label">{{ $statusLabel }}</div>
                    @if($sale->payment_status !== 'paid')
                        <div class="status-balance">
                            Saldo pendiente: ${{ number_format($sale->balance, 0, ',', '.') }}
                        </div>
                    @endif
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <div class="section">
            <div class="section-title">Detalle de Productos/Servicios</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40%;">Descripcion</th>
                        <th class="center" style="width: 10%;">Cant.</th>
                        <th class="right" style="width: 15%;">Precio Unit.</th>
                        <th class="center" style="width: 10%;">Dcto</th>
                        <th class="center" style="width: 10%;">IVA</th>
                        <th class="right" style="width: 15%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($sale->items as $item)
                    <tr>
                        <td class="item-description">{{ $item->description }}</td>
                        <td class="center">{{ $item->quantity }}</td>
                        <td class="right">${{ number_format($item->unit_price, 0, ',', '.') }}</td>
                        <td class="center discount">
                            {{ $item->discount_percentage > 0 ? '-' . $item->discount_percentage . '%' : '-' }}
                        </td>
                        <td class="center">
                            {{ $item->tax_rate !== null ? $item->tax_rate . '%' : 'Excl.' }}
                        </td>
                        <td class="right font-bold">${{ number_format($item->total, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Totals -->
        <div class="totals-container">
            <div class="totals-spacer"></div>
            <div class="totals-box">
                <div class="total-row">
                    <div class="total-label">Subtotal</div>
                    <div class="total-value">${{ number_format($sale->subtotal, 0, ',', '.') }}</div>
                </div>
                @if($sale->discount_amount > 0)
                <div class="total-row">
                    <div class="total-label">Descuentos</div>
                    <div class="total-value text-danger">-${{ number_format($sale->discount_amount, 0, ',', '.') }}</div>
                </div>
                @endif
                <div class="total-row">
                    <div class="total-label">IVA</div>
                    <div class="total-value">${{ number_format($sale->tax_amount, 0, ',', '.') }}</div>
                </div>
                @if($sale->retention_amount > 0)
                <div class="total-row">
                    <div class="total-label">Retenciones</div>
                    <div class="total-value text-danger">-${{ number_format($sale->retention_amount, 0, ',', '.') }}</div>
                </div>
                @endif
                <div class="total-row final">
                    <div class="total-label">Total</div>
                    <div class="total-value">${{ number_format($sale->total_amount, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        <!-- Payments -->
        @if($sale->payments->count() > 0)
        <div class="payments-section">
            <div class="section-title">Historial de Pagos / Abonos</div>
            <table class="payments-table">
                <thead>
                    <tr>
                        <th style="width: 20%;">Fecha</th>
                        <th style="width: 22%;">Metodo</th>
                        <th style="width: 22%;">Caja / Banco</th>
                        <th style="width: 18%;">Referencia</th>
                        <th class="right" style="width: 18%;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($sale->payments as $payment)
                    <tr>
                        <td>{{ \Carbon\Carbon::parse($payment->payment_date)->format('d/m/Y') }}</td>
                        <td>{{ $payment->payment_method_name }}</td>
                        <td>{{ $payment->cashRegister->name ?? '-' }}</td>
                        <td>{{ $payment->reference ?? '-' }}</td>
                        <td class="right text-success font-bold">${{ number_format($payment->amount, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                    <tr class="total-paid">
                        <td colspan="4">Total Pagado</td>
                        <td class="right">${{ number_format($sale->paid_amount, 0, ',', '.') }}</td>
                    </tr>
                    @if($sale->balance > 0)
                    <tr class="balance">
                        <td colspan="4">Saldo Pendiente</td>
                        <td class="right">${{ number_format($sale->balance, 0, ',', '.') }}</td>
                    </tr>
                    @endif
                </tbody>
            </table>
        </div>
        @endif

    </div>
</body>
</html>
