<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ReportExport implements FromArray, WithColumnFormatting, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $rows = [];
    protected array $sectionHeaderRows = [];
    protected array $columnHeaderRows = [];
    protected string $reportType;
    protected string $reportTitle;
    protected string $periodLabel;
    protected int $maxCols = 6;

    public function __construct(array $data, string $reportType, string $title, string $periodLabel)
    {
        $this->reportType = $reportType;
        $this->reportTitle = $title;
        $this->periodLabel = $periodLabel;
        $this->buildRows($data);
    }

    private function fmt(float $value): float
    {
        return (float) $value;
    }

    private function fmtLabel(float $value): string
    {
        return '$' . number_format($value, 0, ',', '.');
    }

    private function buildRows(array $data): void
    {
        $row = 1;

        // ── Report header ──
        $this->rows[] = [strtoupper($this->reportTitle), '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Periodo: ' . $this->periodLabel, '', '', '', '', ''];
        $row++;
        $this->rows[] = array_fill(0, 6, '');
        $row++;

        switch ($this->reportType) {
            case 'best-sellers':
                $this->buildBestSellers($data, $row);
                break;
            case 'top-clients':
                $this->buildTopClients($data, $row);
                break;
            case 'product-profit':
                $this->buildProductProfit($data, $row);
                break;
            case 'monthly-growth':
                $this->buildMonthlyGrowth($data, $row);
                break;
            case 'tax-collection':
                $this->buildTaxCollection($data, $row);
                break;
            case 'income-expenses':
                $this->buildIncomeExpenses($data, $row);
                break;
            case 'payments':
            case 'entries':
            case 'expenses':
                $this->buildPayments($data, $row);
                break;
            case 'commissions':
                $this->buildCommissions($data, $row);
                break;
            case 'sales-products':
                $this->buildSalesProducts($data, $row);
                break;
            case 'inventory':
                $this->buildInventory($data, $row);
                break;
            case 'cost-history':
            case 'sale-price-history':
                $this->buildPriceHistory($data, $row);
                break;
            case 'products':
                $this->buildProducts($data, $row);
                break;
            case 'journal-book':
                $this->buildJournalBook($data, $row);
                break;
            case 'trial-balance':
                $this->buildTrialBalance($data, $row);
                break;
            case 'general-ledger':
                $this->buildGeneralLedger($data, $row);
                break;
            case 'income-statement':
            case 'balance-sheet':
                $this->buildSectionReport($data, $row);
                break;
            case 'account-subledger':
                $this->buildAccountSubledger($data, $row);
                break;
        }
    }

    private function buildBestSellers(array $data, int &$row): void
    {
        $this->rows[] = ['PRODUCTOS MÁS VENDIDOS', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['#', 'Producto', 'SKU', 'Cantidad', 'Total', '% Part.'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
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
    }

    private function buildTopClients(array $data, int &$row): void
    {
        $this->rows[] = ['CLIENTES PRINCIPALES', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['#', 'Cliente', 'Email', 'Compras', 'Total', 'Ticket Prom.'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $this->rows[] = [
                $item['rank'],
                $item['client_name'],
                $item['email'] ?? '',
                $item['sales_count'],
                $this->fmt($item['total_amount']),
                $this->fmt($item['avg_ticket'] ?? 0),
            ];
            $row++;
        }
    }

    private function buildProductProfit(array $data, int &$row): void
    {
        $this->maxCols = 7;
        $this->rows[0] = array_pad($this->rows[0], 7, '');
        $this->rows[1] = array_pad($this->rows[1], 7, '');
        $this->rows[2] = array_pad($this->rows[2], 7, '');

        $this->rows[] = ['UTILIDAD POR PRODUCTO', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Producto', 'SKU', 'Cantidad', 'Ingresos', 'Costos', 'Utilidad', 'Margen'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $this->rows[] = [
                $item['product_name'],
                $item['sku'] ?? '',
                $item['total_quantity'],
                $this->fmt($item['total_revenue']),
                $this->fmt($item['total_cost']),
                $this->fmt($item['profit']),
                $item['margin_percent'] . '%',
            ];
            $row++;
        }
    }

    private function buildMonthlyGrowth(array $data, int &$row): void
    {
        $year = $data['year'] ?? date('Y');
        $this->rows[] = ['CRECIMIENTO MENSUAL ' . $year, '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Mes', '# Ventas', 'Monto', 'Ticket Prom.', 'Año Anterior', 'Crecimiento'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['months'] ?? [] as $m) {
            $growth = $m['growth_percent'];
            $growthStr = ($m['total_amount'] > 0 || $m['prev_year_amount'] > 0)
                ? (($growth > 0 ? '+' : '') . $growth . '%')
                : '-';
            $this->rows[] = [
                $m['month_name'],
                $m['sales_count'],
                $this->fmt($m['total_amount']),
                $m['sales_count'] > 0 ? $this->fmt($m['avg_ticket']) : '-',
                $this->fmt($m['prev_year_amount']),
                $growthStr,
            ];
            $row++;
        }
    }

    private function buildTaxCollection(array $data, int &$row): void
    {
        $this->rows[] = ['RECAUDO DE IMPUESTOS', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Tasa IVA', '# Ventas', 'Base Gravable', 'IVA Cobrado', 'Total', ''];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['by_rate'] ?? [] as $rate) {
            $this->rows[] = [
                $rate['tax_rate'] . '%',
                $rate['sales_count'],
                $this->fmt($rate['taxable_base']),
                $this->fmt($rate['tax_collected']),
                $this->fmt($rate['total_with_tax']),
                '',
            ];
            $row++;
        }
    }

    private function buildIncomeExpenses(array $data, int &$row): void
    {
        $this->rows[] = ['INGRESOS Y EGRESOS', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Periodo', 'Ingresos', 'Egresos', 'Balance', '', ''];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['periods'] ?? [] as $period) {
            $this->rows[] = [
                $period['period_label'],
                $this->fmt($period['income']),
                $this->fmt($period['expense']),
                $this->fmt($period['balance']),
                '',
                '',
            ];
            $row++;
        }
    }

    private function buildPayments(array $data, int &$row): void
    {
        $this->rows[] = [strtoupper($this->reportTitle), '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Fecha', 'Descripción', 'Método de Pago', 'Referencia', 'Monto', ''];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $this->rows[] = [
                $item['date'] ?? '',
                $item['description'] ?? '',
                $item['payment_method_name'] ?? '-',
                $item['reference'] ?? '-',
                $this->fmt($item['amount'] ?? 0),
                '',
            ];
            $row++;
        }
    }

    private function buildCommissions(array $data, int &$row): void
    {
        $this->rows[] = ['COMISIONES POR VENDEDOR', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Vendedor', '# Ventas', 'Total Ventas', '% Comisión', 'Comisión', ''];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['sellers'] ?? [] as $seller) {
            $this->rows[] = [
                $seller['seller_name'],
                $seller['sales_count'],
                $this->fmt($seller['total_sales']),
                $seller['commission_rate'] . '%',
                $this->fmt($seller['total_commission']),
                '',
            ];
            $row++;
        }
    }

    private function buildSalesProducts(array $data, int &$row): void
    {
        $this->maxCols = 8;
        $this->rows[0] = array_pad($this->rows[0], 8, '');
        $this->rows[1] = array_pad($this->rows[1], 8, '');
        $this->rows[2] = array_pad($this->rows[2], 8, '');

        $this->rows[] = ['VENTAS POR PRODUCTO/SERVICIO', '', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Producto', 'SKU', 'Categoría', 'Cantidad', 'Subtotal', 'Descuento', 'Impuesto', 'Total'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $this->rows[] = [
                $item['product_name'],
                $item['sku'] ?? '',
                $item['category_name'] ?? '',
                $item['total_quantity'],
                $this->fmt($item['total_subtotal']),
                $this->fmt($item['total_discount']),
                $this->fmt($item['total_tax']),
                $this->fmt($item['total_amount']),
            ];
            $row++;
        }
    }

    private function buildInventory(array $data, int &$row): void
    {
        $this->maxCols = 9;
        $this->rows[0] = array_pad($this->rows[0], 9, '');
        $this->rows[1] = array_pad($this->rows[1], 9, '');
        $this->rows[2] = array_pad($this->rows[2], 9, '');

        $this->rows[] = ['INVENTARIO DE PRODUCTOS', '', '', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Producto', 'SKU', 'Categoría', 'Stock', 'Mínimo', 'Costo', 'Precio', 'Valor', 'Estado'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $stock = $item['current_stock'] ?? 0;
            $min = $item['min_stock'] ?? 0;
            $status = $stock <= 0 ? 'Agotado' : ($stock <= $min ? 'Bajo' : 'OK');
            $cost = $item['purchase_price'] ?? $item['cost'] ?? 0;
            $this->rows[] = [
                $item['product_name'] ?? $item['name'] ?? '',
                $item['sku'] ?? '',
                $item['category_name'] ?? '',
                $stock,
                $min,
                $this->fmt($cost),
                $this->fmt($item['sale_price'] ?? $item['price'] ?? 0),
                $this->fmt($stock * $cost),
                $status,
            ];
            $row++;
        }
    }

    private function buildPriceHistory(array $data, int &$row): void
    {
        $this->maxCols = 9;
        $this->rows[0] = array_pad($this->rows[0], 9, '');
        $this->rows[1] = array_pad($this->rows[1], 9, '');
        $this->rows[2] = array_pad($this->rows[2], 9, '');

        $label = $this->reportType === 'cost-history' ? 'HISTORIAL DE COSTOS' : 'HISTORIAL DE PRECIOS DE VENTA';
        $this->rows[] = [$label, '', '', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Fecha', 'Producto', 'SKU', 'Anterior', 'Nuevo', 'Cambio $', 'Cambio %', 'Razón', 'Usuario'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $change = $item['change_amount'];
            $this->rows[] = [
                \Carbon\Carbon::parse($item['created_at'])->format('d/m/Y H:i'),
                $item['product_name'],
                $item['sku'] ?? '',
                $this->fmt($item['old_value']),
                $this->fmt($item['new_value']),
                $this->fmt($change),
                ($change > 0 ? '+' : '') . $item['change_percent'] . '%',
                $item['reason'] ?? '',
                $item['changed_by_name'] ?? '',
            ];
            $row++;
        }
    }

    private function buildProducts(array $data, int &$row): void
    {
        $this->maxCols = 10;
        $this->rows[0] = array_pad($this->rows[0], 10, '');
        $this->rows[1] = array_pad($this->rows[1], 10, '');
        $this->rows[2] = array_pad($this->rows[2], 10, '');

        $this->rows[] = ['CATÁLOGO DE PRODUCTOS', '', '', '', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Producto', 'SKU', 'Categoría', 'Marca', 'P. Venta', 'P. Compra', 'Stock', 'Mín.', 'IVA', 'Estado'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data['items'] ?? [] as $item) {
            $this->rows[] = [
                $item['name'],
                $item['sku'] ?? '',
                $item['category_name'] ?? '',
                $item['brand'] ?? '',
                $this->fmt($item['sale_price']),
                $this->fmt($item['purchase_price']),
                $item['current_stock'],
                $item['min_stock'],
                $item['tax_rate'] !== null ? $item['tax_rate'] . '%' : 'Excluido',
                $item['is_active'] ? 'Activo' : 'Inactivo',
            ];
            $row++;
        }
    }

    private function buildJournalBook(array $data, int &$row): void
    {
        $this->maxCols = 7;
        $this->rows[0] = array_pad($this->rows[0], 7, '');
        $this->rows[1] = array_pad($this->rows[1], 7, '');
        $this->rows[2] = array_pad($this->rows[2], 7, '');

        $this->rows[] = ['LIBRO DIARIO', '', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;

        foreach ($data as $entry) {
            // Entry header row
            $this->rows[] = [
                'Registro: ' . ($entry['entry_number'] ?? ''),
                'Fecha: ' . ($entry['date'] ?? ''),
                $entry['description'] ?? '',
                '',
                'Débito: ' . $this->fmtLabel((float) ($entry['total_debit'] ?? 0)),
                'Crédito: ' . $this->fmtLabel((float) ($entry['total_credit'] ?? 0)),
                '',
            ];
            $this->sectionHeaderRows[] = $row;
            $row++;

            // Column headers for lines
            $this->rows[] = ['Código', 'Cuenta', '', 'Descripción', '', 'Débito', 'Crédito'];
            $this->columnHeaderRows[] = $row;
            $row++;

            foreach ($entry['lines'] ?? [] as $line) {
                $account = $line['accounting_account'] ?? [];
                $this->rows[] = [
                    $account['code'] ?? '',
                    $account['name'] ?? '',
                    '',
                    $line['description'] ?? '',
                    '',
                    (float) ($line['debit'] ?? 0),
                    (float) ($line['credit'] ?? 0),
                ];
                $row++;
            }

            // Empty row between entries
            $this->rows[] = array_fill(0, 7, '');
            $row++;
        }
    }

    private function buildTrialBalance(array $data, int &$row): void
    {
        $this->rows[] = ['BALANCE DE COMPROBACIÓN', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Código', 'Nombre Cuenta', 'Saldo Anterior', 'Mov. Débito', 'Mov. Crédito', 'Saldo Final'];
        $this->columnHeaderRows[] = $row;
        $row++;

        $totalPrev = 0;
        $totalDebit = 0;
        $totalCredit = 0;
        $totalFinal = 0;

        foreach ($data as $item) {
            $prev   = (float) ($item['previous_balance'] ?? 0);
            $debit  = (float) ($item['debit_movement'] ?? $item['debit'] ?? 0);
            $credit = (float) ($item['credit_movement'] ?? $item['credit'] ?? 0);
            $final  = (float) ($item['final_balance'] ?? 0);

            $totalPrev   += $prev;
            $totalDebit  += $debit;
            $totalCredit += $credit;
            $totalFinal  += $final;

            $this->rows[] = [
                $item['account_code'] ?? $item['code'] ?? '',
                $item['account_name'] ?? $item['name'] ?? '',
                $this->fmt($prev),
                $this->fmt($debit),
                $this->fmt($credit),
                $this->fmt($final),
            ];
            $row++;
        }

        // Totals row
        $this->rows[] = [
            '',
            'TOTALES',
            $this->fmt($totalPrev),
            $this->fmt($totalDebit),
            $this->fmt($totalCredit),
            $this->fmt($totalFinal),
        ];
        $this->columnHeaderRows[] = $row;
        $row++;
    }

    private function buildGeneralLedger(array $data, int &$row): void
    {
        $this->rows[] = ['LIBRO MAYOR', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;
        $this->rows[] = ['Fecha', 'No. Registro', 'Descripción', 'Débito', 'Crédito', 'Saldo'];
        $this->columnHeaderRows[] = $row;
        $row++;
        foreach ($data as $item) {
            $this->rows[] = [
                $item['date'] ?? '',
                $item['entry_number'] ?? '',
                $item['description'] ?? '',
                (float) ($item['debit'] ?? 0),
                (float) ($item['credit'] ?? 0),
                (float) ($item['balance'] ?? 0),
            ];
            $row++;
        }
    }

    private function buildSectionReport(array $data, int &$row): void
    {
        $label = $this->reportType === 'income-statement' ? 'ESTADO DE RESULTADOS' : 'ESTADO DE SITUACIÓN FINANCIERA';
        $this->rows[] = [$label, '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;

        foreach ($data as $section) {
            // Section title
            $this->rows[] = [strtoupper($section['title'] ?? ''), '', '', '', '', ''];
            $this->sectionHeaderRows[] = $row;
            $row++;

            $this->rows[] = ['Código', 'Cuenta', '', '', '', 'Monto'];
            $this->columnHeaderRows[] = $row;
            $row++;

            foreach ($section['accounts'] ?? [] as $account) {
                $this->rows[] = [
                    $account['code'] ?? '',
                    $account['name'] ?? '',
                    '',
                    '',
                    '',
                    $this->fmt((float) ($account['amount'] ?? 0)),
                ];
                $row++;
            }

            // Section total
            $this->rows[] = [
                '',
                'Total ' . ($section['title'] ?? ''),
                '',
                '',
                '',
                $this->fmt((float) ($section['total'] ?? 0)),
            ];
            $this->columnHeaderRows[] = $row;
            $row++;

            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }
    }

    private function buildAccountSubledger(array $data, int &$row): void
    {
        $this->rows[] = ['AUXILIAR DE CUENTA CONTABLE', '', '', '', '', ''];
        $this->sectionHeaderRows[] = $row;
        $row++;

        foreach ($data as $entry) {
            $account = $entry['account'] ?? [];
            $this->rows[] = [
                ($account['code'] ?? '') . ' - ' . ($account['name'] ?? ''),
                '',
                '',
                'Débito: ' . $this->fmtLabel((float) ($entry['total_debit'] ?? 0)),
                'Crédito: ' . $this->fmtLabel((float) ($entry['total_credit'] ?? 0)),
                'Saldo: ' . $this->fmtLabel((float) ($entry['final_balance'] ?? 0)),
            ];
            $this->sectionHeaderRows[] = $row;
            $row++;

            $this->rows[] = ['Fecha', 'No. Registro', 'Descripción', 'Débito', 'Crédito', 'Saldo'];
            $this->columnHeaderRows[] = $row;
            $row++;

            foreach ($entry['movements'] ?? [] as $mov) {
                $this->rows[] = [
                    $mov['date'] ?? '',
                    $mov['entry_number'] ?? '',
                    $mov['description'] ?? '',
                    (float) ($mov['debit'] ?? 0),
                    (float) ($mov['credit'] ?? 0),
                    (float) ($mov['balance'] ?? 0),
                ];
                $row++;
            }

            $this->rows[] = array_fill(0, 6, '');
            $row++;
        }
    }

    public function array(): array
    {
        return $this->rows;
    }

    public function columnFormats(): array
    {
        $fmt = NumberFormat::FORMAT_NUMBER_COMMA_SEPARATED1; // #,##0.00
        $fmtInt = '#,##0';

        return match ($this->reportType) {
            'best-sellers' => [
                'E' => $fmtInt,
            ],
            'top-clients' => [
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'product-profit' => [
                'D' => $fmtInt,
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'monthly-growth' => [
                'C' => $fmtInt,
                'D' => $fmtInt,
                'E' => $fmtInt,
            ],
            'tax-collection' => [
                'C' => $fmtInt,
                'D' => $fmtInt,
                'E' => $fmtInt,
            ],
            'income-expenses' => [
                'B' => $fmtInt,
                'C' => $fmtInt,
                'D' => $fmtInt,
            ],
            'payments', 'entries', 'expenses' => [
                'E' => $fmtInt,
            ],
            'commissions' => [
                'C' => $fmtInt,
                'E' => $fmtInt,
            ],
            'sales-products' => [
                'E' => $fmtInt,
                'F' => $fmtInt,
                'G' => $fmtInt,
                'H' => $fmtInt,
            ],
            'inventory' => [
                'F' => $fmtInt,
                'G' => $fmtInt,
                'H' => $fmtInt,
            ],
            'cost-history', 'sale-price-history' => [
                'D' => $fmtInt,
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'products' => [
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'journal-book' => [
                'F' => $fmtInt,
                'G' => $fmtInt,
            ],
            'trial-balance' => [
                'C' => $fmtInt,
                'D' => $fmtInt,
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'general-ledger' => [
                'D' => $fmtInt,
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            'income-statement', 'balance-sheet' => [
                'F' => $fmtInt,
            ],
            'account-subledger' => [
                'D' => $fmtInt,
                'E' => $fmtInt,
                'F' => $fmtInt,
            ],
            default => [],
        };
    }

    public function styles(Worksheet $sheet)
    {
        $styles = [];
        $lastRow = count($this->rows);
        $lastCol = chr(64 + $this->maxCols); // A=65, so 6->F, 7->G, etc.

        // Style section headers
        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4F46E5'],
                ],
            ];
        }

        // Style column headers
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
        return $this->reportTitle;
    }
}
