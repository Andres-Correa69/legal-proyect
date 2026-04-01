<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class CashFlowExport implements FromArray, WithColumnFormatting, WithHeadings, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $data;
    protected array $totals;
    protected string $dateFrom;
    protected string $dateTo;

    public function __construct(array $data, array $totals, string $dateFrom, string $dateTo)
    {
        $this->data = $data;
        $this->totals = $totals;
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function array(): array
    {
        $rows = [];

        foreach ($this->data as $item) {
            $rows[] = [
                $item['date'] ?? '',
                $item['type'] === 'income' ? 'Ingreso' : 'Egreso',
                $item['payment_number'] ?? '',
                $item['concept'] ?? $item['notes'] ?? '',
                $item['cash_register'] ?? '',
                $item['payment_method'] ?? '',
                (float)($item['amount'] ?? 0),
                (float)($item['balance'] ?? 0),
            ];
        }

        // Empty row separator
        $rows[] = ['', '', '', '', '', '', '', ''];

        // Totals section
        $rows[] = ['RESUMEN', '', '', '', '', '', '', ''];
        $rows[] = ['Saldo Inicial', '', '', '', '', '', '', (float)($this->totals['opening_balance'] ?? 0)];
        $rows[] = ['Total Ingresos', '', '', '', '', '', '', (float)($this->totals['total_income'] ?? 0)];
        $rows[] = ['Total Egresos', '', '', '', '', '', '', (float)($this->totals['total_expense'] ?? 0)];
        $rows[] = ['Saldo Final', '', '', '', '', '', '', (float)($this->totals['closing_balance'] ?? 0)];
        $rows[] = ['', '', '', '', '', '', '', ''];
        $rows[] = ['Periodo:', $this->dateFrom . ' al ' . $this->dateTo, '', '', '', '', '', ''];

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Fecha',
            'Tipo',
            'Número',
            'Concepto',
            'Caja',
            'Método de Pago',
            'Monto',
            'Saldo',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = count($this->data) + 8; // +1 header, +7 totals section

        return [
            // Header row
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            // All cells border
            'A1:H' . $lastRow => [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E5E7EB'],
                    ],
                ],
            ],
            // Amount column right aligned
            'G' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
            // Balance column right aligned
            'H' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'G' => '#,##0',
            'H' => '#,##0',
        ];
    }

    public function title(): string
    {
        return 'Flujo de Caja';
    }
}
