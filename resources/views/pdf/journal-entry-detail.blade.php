<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Registro Contable {{ $entry->entry_number }}</title>
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
        .report-subtitle { font-size: 11px; color: #1F2937; font-weight: bold; margin-bottom: 4px; }
        .report-date { font-size: 9px; color: #6B7280; }

        /* Info cards row */
        .info-row { display: table; width: 100%; margin-bottom: 14px; }
        .info-cell { display: table-cell; padding: 0 4px; }
        .info-cell:first-child { padding-left: 0; }
        .info-cell:last-child { padding-right: 0; }
        .info-box { border: 1px solid #E5E7EB; border-radius: 5px; padding: 8px 10px; background: #F9FAFB; }
        .info-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #9CA3AF; margin-bottom: 3px; }
        .info-value { font-size: 10px; font-weight: bold; color: #111827; }
        .info-value.mono { font-family: 'Courier New', monospace; font-size: 11px; color: #4F46E5; }

        /* Badges */
        .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 9px; font-weight: bold; }
        .badge-draft   { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
        .badge-posted  { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
        .badge-voided  { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .badge-manual    { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .badge-automatic { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }

        /* Description block */
        .desc-block { border: 1px solid #E5E7EB; border-radius: 5px; padding: 10px 12px; margin-bottom: 14px; background: #FAFAFA; }
        .desc-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #9CA3AF; margin-bottom: 4px; }
        .desc-text { font-size: 11px; color: #1F2937; }

        /* Reference block */
        .ref-block { display: table; width: 100%; border: 1px solid #DBEAFE; border-radius: 5px; padding: 8px 12px; margin-bottom: 14px; background: #EFF6FF; }
        .ref-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #3B82F6; margin-bottom: 2px; }
        .ref-value { font-size: 10px; color: #1E40AF; }

        /* Void / notes alert */
        .alert-red { border: 1px solid #FECACA; border-radius: 5px; padding: 8px 12px; margin-bottom: 14px; background: #FEF2F2; }
        .alert-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #DC2626; margin-bottom: 3px; }
        .alert-text { font-size: 10px; color: #7F1D1D; }
        .alert-notes { border: 1px solid #E5E7EB; border-radius: 5px; padding: 8px 12px; margin-bottom: 14px; background: #F9FAFB; }
        .alert-notes-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #6B7280; margin-bottom: 3px; }
        .alert-notes-text { font-size: 10px; color: #374151; }

        /* Section header */
        .section-title { background: #4F46E5; color: #fff; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px 4px 0 0; margin-top: 4px; }

        /* Table */
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .data-table th { background: #F3F4F6; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #374151; padding: 6px 8px; text-align: left; border-bottom: 2px solid #E5E7EB; }
        .data-table th.right { text-align: right; }
        .data-table td { padding: 6px 8px; border-bottom: 1px solid #E5E7EB; font-size: 9px; vertical-align: top; }
        .data-table td.right { text-align: right; }
        .data-table td.bold { font-weight: bold; }
        .data-table td.mono { font-family: 'Courier New', monospace; font-size: 9px; }
        .data-table tr:nth-child(even) { background: #F9FAFB; }
        .data-table tfoot td { background: #EEF2FF; font-weight: bold; font-size: 10px; border-top: 2px solid #C7D2FE; color: #3730A3; }
        .account-code { color: #6B7280; font-family: 'Courier New', monospace; font-size: 8px; }
        .account-name { font-weight: bold; color: #111827; }
        .debit-val  { color: #166534; font-weight: bold; }
        .credit-val { color: #991B1B; font-weight: bold; }

        /* Balance check */
        .balance-ok  { color: #059669; font-weight: bold; }
        .balance-err { color: #DC2626; font-weight: bold; }

        /* Footer */
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; background: #fff; }
        .footer-company   { font-size: 8px; color: #9CA3AF; }
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
        {{-- HEADER --}}
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
                <div class="report-title">Comprobante Contable</div>
                <div class="report-subtitle">{{ $entry->entry_number }}</div>
                <div class="report-date">Generado el {{ now('America/Bogota')->format('d/m/Y H:i') }}</div>
            </div>
        </div>

        {{-- INFO ROW: Número / Fecha / Estado / Fuente / Creado por --}}
        @php
            $statusLabels  = ['draft' => 'Borrador', 'posted' => 'Publicado', 'voided' => 'Anulado'];
            $statusBadges  = ['draft' => 'badge-draft', 'posted' => 'badge-posted', 'voided' => 'badge-voided'];
            $sourceLabels  = ['manual' => 'Manual', 'automatic' => 'Automático'];
            $sourceBadges  = ['manual' => 'badge-manual', 'automatic' => 'badge-automatic'];
            $autoSourceLabels = [
                'payment_income_created'   => 'Pago de Ingreso',
                'payment_expense_created'  => 'Pago de Egreso',
                'purchase_received'        => 'Compra Recibida',
                'sale_completed'           => 'Venta Completada',
                'inventory_adjustment'     => 'Ajuste de Inventario',
                'cash_transfer'            => 'Traslado de Caja',
                'cash_session_opened'      => 'Apertura de Caja',
                'cash_session_closed'      => 'Cierre de Caja',
            ];
            $referenceLabels = [
                'App\\Models\\InventoryPurchase' => 'Compra',
                'App\\Models\\Sale'              => 'Venta',
                'App\\Models\\Payment'           => 'Pago',
                'App\\Models\\CashRegisterSession' => 'Sesión de Caja',
                'App\\Models\\CashRegisterTransfer' => 'Traslado de Caja',
            ];
        @endphp

        <div class="info-row">
            <div class="info-cell" style="width:20%">
                <div class="info-box">
                    <div class="info-label">Número</div>
                    <div class="info-value mono">{{ $entry->entry_number }}</div>
                </div>
            </div>
            <div class="info-cell" style="width:18%">
                <div class="info-box">
                    <div class="info-label">Fecha</div>
                    <div class="info-value">{{ \Carbon\Carbon::parse($entry->date)->format('d/m/Y') }}</div>
                </div>
            </div>
            <div class="info-cell" style="width:17%">
                <div class="info-box">
                    <div class="info-label">Estado</div>
                    <span class="badge {{ $statusBadges[$entry->status] ?? '' }}">
                        {{ $statusLabels[$entry->status] ?? $entry->status }}
                    </span>
                </div>
            </div>
            <div class="info-cell" style="width:17%">
                <div class="info-box">
                    <div class="info-label">Origen</div>
                    <span class="badge {{ $sourceBadges[$entry->source] ?? '' }}">
                        {{ $sourceLabels[$entry->source] ?? $entry->source }}
                    </span>
                </div>
            </div>
            <div class="info-cell" style="width:28%">
                <div class="info-box">
                    <div class="info-label">Creado por</div>
                    <div class="info-value">{{ $entry->createdBy->name ?? 'N/A' }}</div>
                </div>
            </div>
        </div>

        {{-- SECOND ROW: Publicado / Anulado / Débito total / Crédito total --}}
        <div class="info-row" style="margin-bottom: 14px;">
            @if($entry->posted_at)
            <div class="info-cell" style="width:25%">
                <div class="info-box">
                    <div class="info-label">Fecha Publicación</div>
                    <div class="info-value">{{ \Carbon\Carbon::parse($entry->posted_at)->format('d/m/Y H:i') }}</div>
                </div>
            </div>
            @endif
            @if($entry->voided_at)
            <div class="info-cell" style="width:25%">
                <div class="info-box" style="background:#FEF2F2;border-color:#FECACA;">
                    <div class="info-label" style="color:#DC2626;">Fecha Anulación</div>
                    <div class="info-value" style="color:#DC2626;">{{ \Carbon\Carbon::parse($entry->voided_at)->format('d/m/Y H:i') }}</div>
                </div>
            </div>
            @endif
            <div class="info-cell" style="width:25%">
                <div class="info-box" style="background:#ECFDF5;border-color:#A7F3D0;">
                    <div class="info-label" style="color:#059669;">Total Débito</div>
                    <div class="info-value" style="color:#059669;">${{ number_format($entry->total_debit, 0, ',', '.') }}</div>
                </div>
            </div>
            <div class="info-cell" style="width:25%">
                <div class="info-box" style="background:#FEF2F2;border-color:#FECACA;">
                    <div class="info-label" style="color:#DC2626;">Total Crédito</div>
                    <div class="info-value" style="color:#DC2626;">${{ number_format($entry->total_credit, 0, ',', '.') }}</div>
                </div>
            </div>
        </div>

        {{-- DESCRIPCIÓN --}}
        <div class="desc-block">
            <div class="desc-label">Descripción / Concepto</div>
            <div class="desc-text">{{ $entry->description }}</div>
        </div>

        {{-- AUTO SOURCE (si es automático) --}}
        @if($entry->source === 'automatic' && $entry->auto_source)
        <div class="ref-block" style="margin-bottom:14px;">
            <div class="ref-label">Tipo de movimiento automático</div>
            <div class="ref-value">
                {{ $autoSourceLabels[$entry->auto_source] ?? ucwords(str_replace('_', ' ', $entry->auto_source)) }}
                @if($entry->reference_type && $entry->reference_id)
                    — {{ $referenceLabels[$entry->reference_type] ?? class_basename($entry->reference_type) }} #{{ $entry->reference_id }}
                @endif
            </div>
        </div>
        @endif

        {{-- NOTAS --}}
        @if($entry->notes)
        <div class="alert-notes">
            <div class="alert-notes-label">Notas</div>
            <div class="alert-notes-text">{{ $entry->notes }}</div>
        </div>
        @endif

        {{-- RAZÓN DE ANULACIÓN --}}
        @if($entry->status === 'voided' && $entry->void_reason)
        <div class="alert-red">
            <div class="alert-label">⚠ Razón de Anulación</div>
            <div class="alert-text">{{ $entry->void_reason }}</div>
        </div>
        @endif

        {{-- LÍNEAS DEL ASIENTO --}}
        <div class="section-title">Líneas del Comprobante</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:14%">Código</th>
                    <th style="width:34%">Cuenta Contable</th>
                    <th style="width:10%">Tipo</th>
                    <th class="right" style="width:15%">Débito</th>
                    <th class="right" style="width:15%">Crédito</th>
                    <th style="width:12%">Descripción</th>
                </tr>
            </thead>
            <tbody>
                @foreach($entry->lines as $line)
                <tr>
                    <td class="mono account-code">{{ $line->accountingAccount->code ?? '-' }}</td>
                    <td class="account-name">{{ $line->accountingAccount->name ?? '-' }}</td>
                    <td>
                        @php
                            $type = $line->accountingAccount->type ?? '';
                            $typeLabels = [
                                'asset'     => 'Activo',
                                'liability' => 'Pasivo',
                                'equity'    => 'Patrimonio',
                                'revenue'   => 'Ingreso',
                                'expense'   => 'Gasto',
                                'cost'      => 'Costo',
                            ];
                        @endphp
                        <span style="font-size:8px;color:#6B7280;">{{ $typeLabels[$type] ?? $type }}</span>
                    </td>
                    <td class="right debit-val">
                        {{ $line->debit > 0 ? '$' . number_format($line->debit, 0, ',', '.') : '-' }}
                    </td>
                    <td class="right credit-val">
                        {{ $line->credit > 0 ? '$' . number_format($line->credit, 0, ',', '.') : '-' }}
                    </td>
                    <td style="font-size:8px;color:#6B7280;">{{ $line->description ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3">Totales</td>
                    <td class="right">${{ number_format($entry->total_debit, 0, ',', '.') }}</td>
                    <td class="right">${{ number_format($entry->total_credit, 0, ',', '.') }}</td>
                    <td class="right">${{ number_format(abs($entry->total_debit - $entry->total_credit), 0, ',', '.') }}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</body>
</html>
