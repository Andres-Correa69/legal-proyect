<?php

namespace App\Exports;

use App\Models\JournalEntry;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class JournalEntryDetailExport implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $rows = [];
    protected array $sectionHeaderRows = [];
    protected array $columnHeaderRows = [];
    protected int $linesStartRow = 0;
    protected int $linesEndRow   = 0;

    private const STATUS_LABELS = [
        'draft'   => 'Borrador',
        'posted'  => 'Publicado',
        'voided'  => 'Anulado',
    ];

    private const SOURCE_LABELS = [
        'manual'    => 'Manual',
        'automatic' => 'Automático',
    ];

    private const AUTO_SOURCE_LABELS = [
        'payment_income_created'      => 'Pago de Ingreso',
        'payment_expense_created'     => 'Pago de Egreso',
        'purchase_received'           => 'Compra Recibida',
        'sale_completed'              => 'Venta Completada',
        'inventory_adjustment'        => 'Ajuste de Inventario',
        'cash_transfer'               => 'Traslado de Caja',
        'cash_session_opened'         => 'Apertura de Caja',
        'cash_session_closed'         => 'Cierre de Caja',
    ];

    private const TYPE_LABELS = [
        'asset'     => 'Activo',
        'liability' => 'Pasivo',
        'equity'    => 'Patrimonio',
        'revenue'   => 'Ingreso',
        'expense'   => 'Gasto',
        'cost'      => 'Costo',
    ];

    public function __construct(JournalEntry $entry)
    {
        $this->buildRows($entry);
    }

    private function buildRows(JournalEntry $entry): void
    {
        $row = 1;

        // Title
        $this->rows[] = ['COMPROBANTE CONTABLE', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row++;

        // Entry header info
        $this->rows[] = ['Número', $entry->entry_number, '', 'Estado', self::STATUS_LABELS[$entry->status] ?? $entry->status, ''];
        $row++;
        $this->rows[] = ['Fecha', \Carbon\Carbon::parse($entry->date)->format('d/m/Y'), '', 'Origen', self::SOURCE_LABELS[$entry->source] ?? $entry->source, ''];
        $row++;
        $this->rows[] = ['Creado por', $entry->createdBy->name ?? 'N/A', '', 'Total Débito', $entry->total_debit, ''];
        $row++;
        $this->rows[] = ['Descripción', $entry->description, '', 'Total Crédito', $entry->total_credit, ''];
        $row++;

        if ($entry->source === 'automatic' && $entry->auto_source) {
            $autoLabel = self::AUTO_SOURCE_LABELS[$entry->auto_source]
                ?? ucwords(str_replace('_', ' ', $entry->auto_source));
            $this->rows[] = ['Tipo Movimiento', $autoLabel, '', '', '', ''];
            $row++;
        }

        if ($entry->notes) {
            $this->rows[] = ['Notas', $entry->notes, '', '', '', ''];
            $row++;
        }

        if ($entry->status === 'voided' && $entry->void_reason) {
            $this->rows[] = ['Razón Anulación', $entry->void_reason, '', '', '', ''];
            $row++;
        }

        // Spacer
        $this->rows[] = array_fill(0, 6, '');
        $row++;

        // Lines section header
        $this->rows[] = ['LÍNEAS DEL COMPROBANTE', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row++;

        // Column headers for lines
        $this->rows[] = ['Código', 'Cuenta Contable', 'Tipo de Cuenta', 'Débito', 'Crédito', 'Descripción'];
        $this->columnHeaderRows[] = $row;
        $this->linesStartRow = $row + 1;
        $row++;

        // Lines
        foreach ($entry->lines as $line) {
            $account  = $line->accountingAccount;
            $this->rows[] = [
                $account->code ?? '-',
                $account->name ?? '-',
                self::TYPE_LABELS[$account->type ?? ''] ?? ($account->type ?? '-'),
                $line->debit  > 0 ? $line->debit  : '',
                $line->credit > 0 ? $line->credit : '',
                $line->description ?? '',
            ];
            $row++;
        }

        $this->linesEndRow = $row - 1;

        // Totals row
        $this->rows[] = ['', 'TOTALES', '', $entry->total_debit, $entry->total_credit, ''];
        $row++;
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function styles(Worksheet $sheet)
    {
        $styles = [];
        $lastRow = count($this->rows);
        $lastCol = 'F';

        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
            ];
        }

        foreach ($this->columnHeaderRows as $r) {
            $styles[$r] = [
                'font'      => ['bold' => true],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ];
        }

        // Format debit/credit columns
        if ($this->linesStartRow > 0 && $this->linesEndRow >= $this->linesStartRow) {
            $range = "D{$this->linesStartRow}:E{$this->linesEndRow}";
            $sheet->getStyle($range)->getNumberFormat()->setFormatCode('#,##0.00');
        }

        // Totals row: last row
        $styles[$lastRow] = [
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'EEF2FF']],
        ];

        $styles["A1:{$lastCol}{$lastRow}"] = [
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]],
        ];

        return $styles;
    }

    public function title(): string
    {
        return 'Comprobante Contable';
    }
}
