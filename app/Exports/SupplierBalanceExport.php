<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;

class SupplierBalanceExport implements FromArray, WithHeadings, WithStyles, WithTitle, ShouldAutoSize, WithColumnFormatting
{
    protected array $data;
    protected array $totals;

    public function __construct(array $data, array $totals)
    {
        $this->data = $data;
        $this->totals = $totals;
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->data as $item) {
            $rows[] = [
                $item['supplier_name'] ?? '',
                $item['tax_id'] ?? '',
                $item['contact_name'] ?? '',
                $item['phone'] ?? '',
                $item['email'] ?? '',
                (float)($item['total_purchases'] ?? 0),
                (float)($item['total_paid'] ?? 0),
                (float)($item['total_pending'] ?? 0),
                $item['last_purchase_date'] ? date('d/m/Y', strtotime($item['last_purchase_date'])) : '-',
                $item['last_payment_date'] ? date('d/m/Y', strtotime($item['last_payment_date'])) : '-',
                $this->getPaymentStatusLabel($item['payment_status'] ?? ''),
            ];
        }

        // Empty row separator
        $rows[] = array_fill(0, 11, '');

        // Totals section
        $rows[] = ['RESUMEN', '', '', '', '', '', '', '', '', '', ''];
        $rows[] = ['Total Proveedores', '', '', '', '', '', '', '', '', $this->totals['suppliers_count'] ?? 0, ''];
        $rows[] = ['Proveedores con deuda', '', '', '', '', '', '', '', '', $this->totals['suppliers_with_debt'] ?? 0, ''];
        $rows[] = ['Total Compras', '', '', '', '', (float)($this->totals['total_purchases'] ?? 0), '', '', '', '', ''];
        $rows[] = ['Total Pagado', '', '', '', '', '', (float)($this->totals['total_paid'] ?? 0), '', '', '', ''];
        $rows[] = ['Total Pendiente', '', '', '', '', '', '', (float)($this->totals['total_pending'] ?? 0), '', '', ''];

        return $rows;
    }

    public function columnFormats(): array
    {
        return [
            'F' => '#,##0',
            'G' => '#,##0',
            'H' => '#,##0',
        ];
    }

    public function headings(): array
    {
        return [
            'Proveedor',
            'NIT/RUT',
            'Contacto',
            'Teléfono',
            'Email',
            'Total Compras',
            'Total Pagado',
            'Saldo Pendiente',
            'Última Compra',
            'Último Pago',
            'Estado',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = count($this->data) + 8; // +1 header, +7 totals section

        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            'A1:K' . $lastRow => [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E5E7EB'],
                    ],
                ],
            ],
            'F' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
            'G' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
            'H' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
        ];
    }

    public function title(): string
    {
        return 'Saldos de Proveedores';
    }

    private function getPaymentStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pendiente',
            'partial' => 'Parcial',
            'paid' => 'Pagado',
            default => $status,
        };
    }
}
