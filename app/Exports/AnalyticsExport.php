<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class AnalyticsExport implements FromArray, WithColumnFormatting, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $rows = [];
    protected array $sectionHeaderRows = [];
    protected array $columnHeaderRows = [];
    protected array $sections;

    public function __construct(array $data, array $sections = ['ventas', 'stock', 'clientes', 'rentabilidad', 'crecimiento'])
    {
        $this->sections = $sections;
        $this->buildRows($data);
    }

    private function fmt(float $value): float
    {
        return (float) $value;
    }

    private function buildRows(array $data): void
    {
        $row = 1;

        // ── Report header ──
        $this->rows[] = ['ANÁLISIS DEL NEGOCIO — ' . ($data['period_label'] ?? ''), '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Periodo: ' . ($data['date_from'] ?? '') . ' a ' . ($data['date_to'] ?? ''), '', '', '', '', ''];
        $row++;
        $this->rows[] = array_fill(0, 6, '');
        $row++;

        // ── Section 1: Productos Más Vendidos ──
        if (in_array('ventas', $this->sections)) {
            $this->rows[] = ['PRODUCTOS MÁS VENDIDOS', '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['#', 'Producto', 'SKU', 'Cantidad', 'Total', '% Part.'];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['best_sellers']['items'] ?? [] as $item) {
                $this->rows[] = [
                    $item['rank'],
                    $item['product_name'],
                    $item['sku'] ?? '',
                    $item['total_quantity'],
                    $this->fmt($item['total_amount']),
                    $item['amount_percentage'] . '%',
                ];
                $row++;
            }
            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }

        // ── Section 2: Productos con Menos Stock ──
        if (in_array('stock', $this->sections)) {
            $this->rows[] = ['PRODUCTOS CON MENOS STOCK', '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['Producto', 'SKU', 'Stock Actual', 'Stock Mínimo', 'Faltan', ''];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['low_stock'] ?? [] as $item) {
                $this->rows[] = [
                    $item['name'],
                    $item['sku'] ?? '',
                    $item['current_stock'],
                    $item['min_stock'],
                    $item['deficit'],
                    '',
                ];
                $row++;
            }
            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }

        // ── Section 3: Clientes Más Recurrentes ──
        if (in_array('clientes', $this->sections)) {
            $this->rows[] = ['CLIENTES MÁS RECURRENTES', '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['#', 'Cliente', 'Email', 'Compras', 'Total', 'Ticket Prom.'];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['clients_by_count']['items'] ?? [] as $item) {
                $this->rows[] = [
                    $item['rank'],
                    $item['client_name'],
                    $item['email'] ?? '',
                    $item['sales_count'],
                    $this->fmt($item['total_amount']),
                    $this->fmt($item['avg_ticket']),
                ];
                $row++;
            }
            $this->rows[] = array_fill(0, 6, '');
            $row++;

            // ── Section 4: Clientes que Más Compran ──
            $this->rows[] = ['CLIENTES QUE MÁS COMPRAN', '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['#', 'Cliente', 'Email', 'Total', 'Pagado', 'Pendiente'];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['clients_by_amount']['items'] ?? [] as $item) {
                $this->rows[] = [
                    $item['rank'],
                    $item['client_name'],
                    $item['email'] ?? '',
                    $this->fmt($item['total_amount']),
                    $this->fmt($item['total_paid']),
                    $this->fmt($item['total_balance']),
                ];
                $row++;
            }
            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }

        // ── Section 5: Productos con Más Margen ──
        if (in_array('rentabilidad', $this->sections)) {
            $this->rows[] = ['PRODUCTOS CON MÁS MARGEN', '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['Producto', 'SKU', 'Ingresos', 'Costos', 'Utilidad', 'Margen'];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['top_margin'] ?? [] as $item) {
                $this->rows[] = [
                    $item['product_name'],
                    $item['sku'] ?? '',
                    $this->fmt($item['total_revenue']),
                    $this->fmt($item['total_cost']),
                    $this->fmt($item['profit']),
                    $item['margin_percent'] . '%',
                ];
                $row++;
            }
            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }

        // ── Section 6: Crecimiento Mensual ──
        if (in_array('crecimiento', $this->sections)) {
            $yearLabel = $data['monthly_growth']['year'] ?? date('Y');
            $this->rows[] = ['CRECIMIENTO MENSUAL ' . $yearLabel, '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;
            $this->rows[] = ['Mes', '# Ventas', 'Monto', 'Ticket Prom.', 'Año Anterior', 'Crecimiento'];
            $this->columnHeaderRows[] = $row;
            $row++;
            foreach ($data['monthly_growth']['months'] ?? [] as $item) {
                $growth = $item['growth_percent'];
                $growthStr = ($item['total_amount'] > 0 || $item['prev_year_amount'] > 0)
                    ? (($growth > 0 ? '+' : '') . $growth . '%')
                    : '-';
                $this->rows[] = [
                    $item['month_name'],
                    $item['sales_count'],
                    $this->fmt($item['total_amount']),
                    $item['sales_count'] > 0 ? $this->fmt($item['avg_ticket']) : '-',
                    $this->fmt($item['prev_year_amount']),
                    $growthStr,
                ];
                $row++;
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

        // Style section headers (dark indigo background, white text)
        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
            ];
        }

        // Style column headers (gray background, bold, centered)
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

        // Thin borders on all cells
        if ($lastRow > 0) {
            $styles['A1:F' . $lastRow] = [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E5E7EB'],
                    ],
                ],
            ];
        }

        return $styles;
    }

    public function columnFormats(): array
    {
        return [
            'C' => '#,##0',
            'D' => '#,##0',
            'E' => '#,##0',
            'F' => '#,##0',
        ];
    }

    public function title(): string
    {
        return 'Análisis';
    }
}
