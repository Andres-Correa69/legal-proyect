<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h2 { margin: 0; font-size: 20px; }
        .header .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
        .body { padding: 24px; background: white; border: 1px solid #e5e7eb; border-top: none; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .alert-box h3 { margin: 0 0 8px; color: #dc2626; font-size: 16px; }
        .alert-box p { margin: 0; font-size: 14px; color: #7f1d1d; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: 600; color: #111827; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        tr:hover { background: #f9fafb; }
        .highlight { color: #dc2626; font-weight: 600; }
        .footer { padding: 16px 24px; text-align: center; font-size: 12px; color: #9ca3af; background: #f9fafb; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{{ $company?->name ?? 'Legal Sistema' }}</h2>
            <div class="badge">ALERTA AUTOMÁTICA</div>
        </div>
        <div class="body">
            <div class="alert-box">
                <h3>{{ $rule->name }}</h3>
                <p>{{ $log->data['summary'] ?? 'Se ha activado una alerta en su sistema.' }}</p>
            </div>

            <div style="margin-bottom: 16px;">
                <div class="info-row">
                    <span class="info-label">Tipo de alerta</span>
                    <span class="info-value">
                        @php
                            $typeLabels = [
                                'low_stock' => 'Stock Bajo',
                                'sales_decrease' => 'Disminución de Ventas',
                                'inactive_clients' => 'Clientes Inactivos',
                                'no_movement_products' => 'Productos sin Movimiento',
                                'sales_target' => 'Meta de Ventas',
                                'upcoming_invoices' => 'Facturas por Vencer',
                                'high_expenses' => 'Gastos Elevados',
                            ];
                        @endphp
                        {{ $typeLabels[$rule->type] ?? $rule->type }}
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Frecuencia</span>
                    <span class="info-value">
                        {{ $rule->frequency === 'hourly' ? 'Cada hora' : ($rule->frequency === 'daily' ? 'Diario' : 'Semanal') }}
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha de verificación</span>
                    <span class="info-value">{{ $log->triggered_at->format('d/m/Y H:i') }}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">Items encontrados</span>
                    <span class="info-value highlight">{{ count($log->data['items'] ?? []) }}</span>
                </div>
            </div>

            @if(!empty($log->data['items']))
                @if($rule->type === 'low_stock')
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>SKU</th>
                                <th style="text-align:right">Stock Actual</th>
                                <th style="text-align:right">Stock Mínimo</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach(array_slice($log->data['items'], 0, 20) as $item)
                            <tr>
                                <td>{{ $item['name'] }}</td>
                                <td style="color:#6b7280;">{{ $item['sku'] ?? '-' }}</td>
                                <td style="text-align:right" class="highlight">{{ $item['current_stock'] }}</td>
                                <td style="text-align:right">{{ $item['min_stock'] ?? '-' }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                @elseif($rule->type === 'sales_decrease')
                    @php $item = $log->data['items'][0] ?? []; @endphp
                    <div style="background:#fef2f2; border-radius:8px; padding:16px; text-align:center;">
                        <p style="font-size:32px; font-weight:bold; color:#dc2626; margin:0;">{{ $item['change_percentage'] ?? 0 }}%</p>
                        <p style="font-size:14px; color:#7f1d1d; margin:4px 0 0;">Disminución en ventas</p>
                        <p style="font-size:12px; color:#9ca3af; margin:8px 0 0;">
                            Período actual: ${{ number_format($item['current_sales'] ?? 0, 0, ',', '.') }} |
                            Período anterior: ${{ number_format($item['previous_sales'] ?? 0, 0, ',', '.') }}
                        </p>
                    </div>
                @elseif($rule->type === 'inactive_clients')
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Compras Totales</th>
                                <th>Última Compra</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach(array_slice($log->data['items'], 0, 20) as $item)
                            <tr>
                                <td>{{ $item['name'] }}</td>
                                <td style="text-align:center">{{ $item['total_purchases'] }}</td>
                                <td style="color:#6b7280;">{{ $item['last_purchase'] ?? 'N/A' }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                @elseif($rule->type === 'no_movement_products')
                    <table>
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>SKU</th>
                                <th style="text-align:right">Stock</th>
                                <th style="text-align:right">Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach(array_slice($log->data['items'], 0, 20) as $item)
                            <tr>
                                <td>{{ $item['name'] }}</td>
                                <td style="color:#6b7280;">{{ $item['sku'] ?? '-' }}</td>
                                <td style="text-align:right">{{ $item['stock'] }}</td>
                                <td style="text-align:right">${{ number_format($item['sale_price'] ?? 0, 0, ',', '.') }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                @elseif($rule->type === 'sales_target')
                    @php $item = $log->data['items'][0] ?? []; @endphp
                    <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:16px; text-align:center;">
                        <p style="font-size:14px; color:#92400e; margin:0;">Meta: ${{ number_format($item['target'] ?? 0, 0, ',', '.') }}</p>
                        <p style="font-size:28px; font-weight:bold; color:#d97706; margin:8px 0;">{{ $item['percentage'] ?? 0 }}%</p>
                        <p style="font-size:14px; color:#92400e; margin:0;">Actual: ${{ number_format($item['current'] ?? 0, 0, ',', '.') }}</p>
                        <p style="font-size:12px; color:#b45309; margin:8px 0 0;">Faltan ${{ number_format($item['deficit'] ?? 0, 0, ',', '.') }} para alcanzar la meta</p>
                    </div>
                @elseif($rule->type === 'upcoming_invoices')
                    <table>
                        <thead>
                            <tr>
                                <th>Factura</th>
                                <th>Cliente</th>
                                <th style="text-align:right">Saldo</th>
                                <th>Vence</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach(array_slice($log->data['items'], 0, 20) as $item)
                            <tr>
                                <td style="font-family:monospace;">{{ $item['invoice_number'] }}</td>
                                <td>{{ $item['client'] ?? '-' }}</td>
                                <td style="text-align:right" class="highlight">${{ number_format($item['balance'] ?? 0, 0, ',', '.') }}</td>
                                <td style="color:#6b7280;">{{ $item['due_date'] ?? '-' }}</td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                @elseif($rule->type === 'high_expenses')
                    @php $item = $log->data['items'][0] ?? []; @endphp
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; text-align:center;">
                        <p style="font-size:14px; color:#7f1d1d; margin:0;">Límite: ${{ number_format($item['threshold'] ?? 0, 0, ',', '.') }}</p>
                        <p style="font-size:28px; font-weight:bold; color:#dc2626; margin:8px 0;">${{ number_format($item['total_expenses'] ?? 0, 0, ',', '.') }}</p>
                        <p style="font-size:12px; color:#b91c1c; margin:0;">Excedido por ${{ number_format($item['exceeded_by'] ?? 0, 0, ',', '.') }}</p>
                    </div>
                @endif

                @if(count($log->data['items'] ?? []) > 20)
                    <p style="text-align:center; font-size:12px; color:#9ca3af; margin-top:8px;">
                        Mostrando 20 de {{ count($log->data['items']) }} items encontrados
                    </p>
                @endif
            @endif
        </div>
        <div class="footer">
            <p>{{ $company?->name ?? 'Legal Sistema' }} - Sistema de Gestión</p>
            <p>Desarrollado por Legal Sistema &middot; www.legalsistema.co</p>
            <p style="margin-top:8px; font-size:11px;">Esta es una alerta automática. Para configurar o desactivar esta alerta, ingrese al sistema.</p>
        </div>
    </div>
</body>
</html>
