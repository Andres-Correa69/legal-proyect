<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class JournalEntryExport implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $rows = [];
    protected array $sectionHeaderRows = [];
    protected array $columnHeaderRows = [];
    protected array $totals;

    private const STATUS_LABELS = [
        'draft' => 'Borrador',
        'posted' => 'Publicado',
        'voided' => 'Anulado',
    ];

    private const SOURCE_LABELS = [
        'manual' => 'Manual',
        'automatic' => 'Automático',
    ];

    public function __construct(array $data)
    {
        $this->totals = $data['totals'] ?? [];
        $this->buildRows($data);
    }

    private function buildRows(array $data): void
    {
        $row = 1;

        // Header
        $this->rows[] = ['REGISTROS CONTABLES - LIBRO DIARIO', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = [
            'Total: ' . ($this->totals['total'] ?? 0) . ' registros | '
            . 'Publicados: ' . ($this->totals['posted'] ?? 0) . ' | '
            . 'Borradores: ' . ($this->totals['draft'] ?? 0) . ' | '
            . 'Anulados: ' . ($this->totals['voided'] ?? 0),
            '', '', '', '', '', '',
        ];
        $row++;
        $this->rows[] = array_fill(0, 7, '');
        $row++;

        // Column headers
        $this->rows[] = ['Número', 'Fecha', 'Descripción', 'Total Débito', 'Total Crédito', 'Fuente', 'Estado'];
        $this->columnHeaderRows[] = $row;
        $row++;

        // Data rows
        foreach ($data['items'] ?? [] as $entry) {
            $this->rows[] = [
                $entry['entry_number'],
                $entry['date'],
                $entry['description'],
                $entry['total_debit'],
                $entry['total_credit'],
                self::SOURCE_LABELS[$entry['source']] ?? $entry['source'],
                self::STATUS_LABELS[$entry['status']] ?? $entry['status'],
            ];
            $row++;
        }
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function styles(Worksheet $sheet)
    {
        $styles = [];
        $lastRow = count($this->rows);
        $lastCol = 'G';

        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
            ];
        }

        foreach ($this->columnHeaderRows as $r) {
            $styles[$r] = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E5E7EB'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ];
        }

        // Number format for debit/credit columns
        $sheet->getStyle('D5:E' . $lastRow)->getNumberFormat()->setFormatCode('#,##0.00');

        $styles['A1:' . $lastCol . $lastRow] = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'E5E7EB'],
                ],
            ],
        ];

        return $styles;
    }

    public function title(): string
    {
        return 'Registros Contables';
    }
}
