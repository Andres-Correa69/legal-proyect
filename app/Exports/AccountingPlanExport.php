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

class AccountingPlanExport implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $rows = [];
    protected array $sectionHeaderRows = [];
    protected array $columnHeaderRows = [];
    protected int $maxCols = 7;
    protected array $totals;

    private const TYPE_LABELS = [
        'asset' => 'Activo',
        'liability' => 'Pasivo',
        'equity' => 'Patrimonio',
        'revenue' => 'Ingreso',
        'expense' => 'Gasto',
        'cost' => 'Costo',
    ];

    private const NATURE_LABELS = [
        'debit' => 'Débito',
        'credit' => 'Crédito',
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
        $this->rows[] = ['PLAN DE CUENTAS', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = [
            'Total: ' . ($this->totals['total'] ?? 0) . ' cuentas | '
            . 'Activas: ' . ($this->totals['active'] ?? 0) . ' | '
            . 'Inactivas: ' . ($this->totals['inactive'] ?? 0),
            '', '', '', '', '', '',
        ];
        $row++;
        $this->rows[] = array_fill(0, 7, '');
        $row++;

        // Column headers
        $this->rows[] = ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Nivel', 'Padre', 'Estado'];
        $this->columnHeaderRows[] = $row;
        $row++;

        // Flatten tree into rows
        $this->flattenAccounts($data['items'] ?? [], $row, 0);
    }

    private function flattenAccounts(array $accounts, int &$row, int $depth): void
    {
        foreach ($accounts as $account) {
            $indent = str_repeat('  ', $depth);
            $this->rows[] = [
                $account['code'],
                $indent . $account['name'],
                self::TYPE_LABELS[$account['type']] ?? $account['type'],
                self::NATURE_LABELS[$account['nature']] ?? $account['nature'],
                $account['level'] ?? ($depth + 1),
                $account['parent_code'] ?? '',
                $account['is_active'] ? 'Activa' : 'Inactiva',
            ];
            $row++;

            if (!empty($account['children'])) {
                $this->flattenAccounts($account['children'], $row, $depth + 1);
            }
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
        return 'Plan de Cuentas';
    }
}
