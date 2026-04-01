<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ThirdPartySubledgerExport implements FromArray, WithColumnFormatting, WithHeadings, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $entries;
    protected float $grandTotalDebit;
    protected float $grandTotalCredit;
    protected float $grandTotalDifference;
    protected string $dateFrom;
    protected string $dateTo;
    protected int $totalRows = 0;
    protected array $supplierHeaderRows = [];
    protected array $subtotalRows = [];
    protected int $grandTotalStartRow = 0;

    public function __construct(
        array $entries,
        float $grandTotalDebit,
        float $grandTotalCredit,
        float $grandTotalDifference,
        string $dateFrom,
        string $dateTo
    ) {
        $this->entries = $entries;
        $this->grandTotalDebit = $grandTotalDebit;
        $this->grandTotalCredit = $grandTotalCredit;
        $this->grandTotalDifference = $grandTotalDifference;
        $this->dateFrom = $dateFrom;
        $this->dateTo = $dateTo;
    }

    public function array(): array
    {
        $rows = [];
        $currentRow = 2; // Row 1 is headings

        foreach ($this->entries as $entry) {
            $thirdParty = $entry['third_party'];
            $previousBalance = $entry['previous_balance'] ?? 0;
            $finalBalance = $entry['final_balance'] ?? ($previousBalance + $entry['total_debit'] - $entry['total_credit']);
            $tpType = $thirdParty['type'] === 'supplier' ? 'Proveedor' : ($thirdParty['type'] === 'client' ? 'Cliente' : 'Tercero');

            // Third party header row
            $rows[] = [
                'TERCERO: ' . $thirdParty['name'],
                $tpType,
                $thirdParty['document'] ?? '',
                count($entry['movements']) . ' movimiento(s)',
                '',
                '',
                '',
                '',
            ];
            $this->supplierHeaderRows[] = $currentRow;
            $currentRow++;

            // Saldo Anterior row
            $rows[] = [
                '',
                '',
                '',
                '',
                'SALDO ANTERIOR',
                '',
                '',
                (float) $previousBalance,
            ];
            $this->subtotalRows[] = $currentRow;
            $currentRow++;

            // Movement rows
            foreach ($entry['movements'] as $mov) {
                $rows[] = [
                    $mov['date'],
                    $mov['entry_number'],
                    $mov['account_code'],
                    $mov['account_name'],
                    $mov['description'],
                    (float) $mov['debit'],
                    (float) $mov['credit'],
                    (float) ($mov['balance'] ?? 0),
                ];
                $currentRow++;
            }

            // Subtotal row
            $rows[] = [
                '',
                '',
                '',
                '',
                'SUBTOTAL',
                (float) $entry['total_debit'],
                (float) $entry['total_credit'],
                '',
            ];
            $this->subtotalRows[] = $currentRow;
            $currentRow++;

            // Saldo Final row
            $rows[] = [
                '',
                '',
                '',
                '',
                'SALDO FINAL',
                '',
                '',
                (float) $finalBalance,
            ];
            $this->subtotalRows[] = $currentRow;
            $currentRow++;

            // Empty separator
            $rows[] = array_fill(0, 8, '');
            $currentRow++;
        }

        // Grand totals section
        $this->grandTotalStartRow = $currentRow;
        $rows[] = ['TOTALES GENERALES', '', '', '', '', '', '', ''];
        $currentRow++;
        $rows[] = ['Total Débito', '', '', '', '', (float) $this->grandTotalDebit, '', ''];
        $currentRow++;
        $rows[] = ['Total Crédito', '', '', '', '', '', (float) $this->grandTotalCredit, ''];
        $currentRow++;
        $rows[] = ['Diferencia Total', '', '', '', '', '', '', (float) $this->grandTotalDifference];
        $currentRow++;
        $rows[] = array_fill(0, 8, '');
        $currentRow++;
        $rows[] = ['Periodo:', $this->dateFrom . ' al ' . $this->dateTo, '', '', '', '', '', ''];

        $this->totalRows = count($rows);

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Fecha',
            'No. Registro',
            'Código Cuenta',
            'Nombre Cuenta',
            'Descripción',
            'Débito',
            'Crédito',
            'Saldo',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $lastRow = $this->totalRows + 1;

        $styles = [
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
            // Debit column right aligned
            'F' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
            // Credit column right aligned
            'G' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
            // Balance column right aligned
            'H' => [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
            ],
        ];

        // Style supplier header rows
        foreach ($this->supplierHeaderRows as $row) {
            $styles[$row] = [
                'font' => ['bold' => true, 'color' => ['rgb' => '1F2937']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'EEF2FF'],
                ],
            ];
        }

        // Style subtotal rows
        foreach ($this->subtotalRows as $row) {
            $styles[$row] = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'F3F4F6'],
                ],
            ];
        }

        // Style grand totals
        if ($this->grandTotalStartRow > 0) {
            for ($i = $this->grandTotalStartRow; $i <= $this->grandTotalStartRow + 3; $i++) {
                $styles[$i] = [
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '4F46E5'],
                    ],
                ];
            }
        }

        return $styles;
    }

    public function columnFormats(): array
    {
        $fmt = '#,##0';

        return [
            'F' => $fmt,
            'G' => $fmt,
            'H' => $fmt,
        ];
    }

    public function title(): string
    {
        return 'Auxiliar por Tercero';
    }
}
