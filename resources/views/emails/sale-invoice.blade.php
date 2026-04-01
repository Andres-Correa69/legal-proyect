<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f97316; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .body { padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; }
        .footer { padding: 15px 20px; text-align: center; font-size: 12px; color: #9ca3af; background: #f3f4f6; border-radius: 0 0 8px 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-size: 13px; color: #6b7280; }
        td { font-size: 14px; }
        .total-row { font-weight: bold; font-size: 16px; color: #f97316; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin:0;">{{ $companyName }}</h2>
            <p style="margin:5px 0 0;">Factura {{ $sale->invoice_number }}</p>
        </div>
        <div class="body">
            <p>Estimado(a) <strong>{{ $sale->client->name ?? 'Cliente' }}</strong>,</p>
            <p>Adjunto encontrará la factura <strong>{{ $sale->invoice_number }}</strong> correspondiente a su compra.</p>

            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th style="text-align:right">Cant.</th>
                        <th style="text-align:right">Precio</th>
                        <th style="text-align:right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($sale->items as $item)
                    <tr>
                        <td>{{ $item->description }}</td>
                        <td style="text-align:right">{{ $item->quantity }}</td>
                        <td style="text-align:right">${{ number_format($item->unit_price, 0, ',', '.') }}</td>
                        <td style="text-align:right">${{ number_format($item->total, 0, ',', '.') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <table>
                <tr>
                    <td>Subtotal</td>
                    <td style="text-align:right">${{ number_format($sale->subtotal, 0, ',', '.') }}</td>
                </tr>
                @if ($sale->tax_amount > 0)
                <tr>
                    <td>IVA</td>
                    <td style="text-align:right">${{ number_format($sale->tax_amount, 0, ',', '.') }}</td>
                </tr>
                @endif
                @if ($sale->discount_amount > 0)
                <tr>
                    <td>Descuento</td>
                    <td style="text-align:right">-${{ number_format($sale->discount_amount, 0, ',', '.') }}</td>
                </tr>
                @endif
                <tr class="total-row">
                    <td>Total</td>
                    <td style="text-align:right">${{ number_format($sale->total_amount, 0, ',', '.') }}</td>
                </tr>
            </table>

            <p style="font-size:13px; color:#6b7280;">Fecha: {{ $sale->invoice_date?->format('d/m/Y') ?? now()->format('d/m/Y') }}</p>
        </div>
        <div class="footer">
            <p>Este correo fue enviado desde el sistema de facturación de {{ $companyName }}.</p>
        </div>
    </div>
</body>
</html>
