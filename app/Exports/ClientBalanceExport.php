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

class ClientBalanceExport implements FromArray, WithHeadings, WithStyles, WithTitle, ShouldAutoSize, WithColumnFormatting
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
                $item['client_name'] ?? '',
                $item['document_type'] ?? '',
                $item['document_id'] ?? '',
                $item['email'] ?? '',
                $item['phone'] ?? '',
                (float)($item['total_sales'] ?? 0),
                (float)($item['total_paid'] ?? 0),
                (float)($item['balance_due'] ?? 0),
                (int)($item['sales_count'] ?? 0),
                $this->getPaymentStatusLabel($item['payment_status'] ?? ''),
            ];
        }

        // Empty row separator
        $rows[] = array_fill(0, 10, '');

        // Totals section
        $rows[] = ['RESUMEN', '', '', '', '', '', '', '', '', ''];
        $rows[] = ['Total Clientes', '', '', '', '', '', '', '', $this->totals['clients_count'] ?? 0, ''];
        $rows[] = ['Clientes con deuda', '', '', '', '', '', '', '', $this->totals['clients_with_debt'] ?? 0, ''];
        $rows[] = ['Total Ventas', '', '', '', '', (float)($this->totals['total_sales'] ?? 0), '', '', '', ''];
        $rows[] = ['Total Pagado', '', '', '', '', '', (float)($this->totals['total_paid'] ?? 0), '', '', ''];
        $rows[] = ['Total Pendiente', '', '', '', '', '', '', (float)($this->totals['total_balance_due'] ?? 0), '', ''];

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
            'Cliente',
            'Tipo Doc.',
            'Documento',
            'Email',
            'Teléfono',
            'Total Ventas',
            'Total Pagado',
            'Saldo Pendiente',
            'Nº Ventas',
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
            'A1:J' . $lastRow => [
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
            'I' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    public function title(): string
    {
        return 'Saldos de Clientes';
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
