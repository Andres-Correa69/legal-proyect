<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ClientStatementExport implements FromArray, WithColumnFormatting, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $sales;
    protected array $payments;
    protected array $totals;
    protected array $client;

    public function __construct(array $client, array $sales, array $payments, array $totals)
    {
        $this->client = $client;
        $this->sales = $sales;
        $this->payments = $payments;
        $this->totals = $totals;
    }

    public function array(): array
    {
        $rows = [];

        // Client info header
        $rows[] = ['ESTADO DE CUENTA', '', '', '', '', '', '', ''];
        $rows[] = ['Cliente:', $this->client['name'] ?? '', '', 'Documento:', ($this->client['document_type'] ?? '') . ' ' . ($this->client['document_id'] ?? ''), '', '', ''];
        $rows[] = ['Email:', $this->client['email'] ?? '-', '', 'Telefono:', $this->client['phone'] ?? '-', '', '', ''];
        $rows[] = ['', '', '', '', '', '', '', ''];

        // Summary
        $rows[] = ['RESUMEN', '', '', '', '', '', '', ''];
        $rows[] = ['Total Ventas:', '', (float)($this->totals['total_sales'] ?? 0), '', 'Ventas:', $this->totals['sales_count'] ?? 0, '', ''];
        $rows[] = ['Total Pagado:', '', (float)($this->totals['total_paid'] ?? 0), '', 'Pendientes:', $this->totals['pending_sales'] ?? 0, '', ''];
        $rows[] = ['Total Pendiente:', '', (float)($this->totals['total_balance_due'] ?? 0), '', 'Parciales:', $this->totals['partial_sales'] ?? 0, '', ''];
        $rows[] = ['', '', '', '', '', '', '', ''];

        // Sales section header
        $rows[] = ['VENTAS', '', '', '', '', '', '', ''];
        $rows[] = ['Factura', 'Tipo', 'Fecha', 'Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado'];

        foreach ($this->sales as $sale) {
            $rows[] = [
                $sale['invoice_number'] ?? '',
                $sale['type_label'] ?? '',
                $sale['date'] ?? '',
                $sale['due_date'] ?? '-',
                (float)($sale['total_amount'] ?? 0),
                (float)($sale['paid_amount'] ?? 0),
                (float)($sale['balance'] ?? 0),
                $sale['payment_status_label'] ?? $sale['payment_status'] ?? '',
            ];
        }

        $rows[] = ['', '', '', '', '', '', '', ''];

        // Payments section
        $rows[] = ['HISTORIAL DE PAGOS', '', '', '', '', '', '', ''];
        $rows[] = ['Fecha', 'Factura', 'Metodo de Pago', 'Referencia', 'Monto', '', '', ''];

        foreach ($this->payments as $payment) {
            $rows[] = [
                $payment['payment_date'] ?? '',
                $payment['invoice_number'] ?? '',
                $payment['payment_method'] ?? '',
                $payment['reference'] ?? '-',
                (float)($payment['amount'] ?? 0),
                '',
                '',
                '',
            ];
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        $salesStartRow = 12;
        $salesEndRow = $salesStartRow + count($this->sales);
        $paymentsHeaderRow = $salesEndRow + 2;
        $paymentsDataRow = $paymentsHeaderRow + 1;

        $styles = [
            // Title
            1 => [
                'font' => ['bold' => true, 'size' => 14],
            ],
            // Client info
            2 => ['font' => ['size' => 11]],
            3 => ['font' => ['size' => 11]],
            // Summary header
            5 => [
                'font' => ['bold' => true, 'size' => 12],
            ],
            // Sales header row
            10 => [
                'font' => ['bold' => true, 'size' => 12],
            ],
            // Sales column headers
            11 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            // Payments section header
            $paymentsHeaderRow => [
                'font' => ['bold' => true, 'size' => 12],
            ],
            // Payments column headers
            $paymentsDataRow => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '059669'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];

        // Amount columns right aligned
        $sheet->getStyle('E:G')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        return $styles;
    }

    public function columnFormats(): array
    {
        return [
            'C' => '#,##0',
            'E' => '#,##0',
            'F' => '#,##0',
            'G' => '#,##0',
        ];
    }

    public function title(): string
    {
        return 'Estado de Cuenta';
    }
}
