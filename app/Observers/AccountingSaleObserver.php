<?php

namespace App\Observers;

use App\Models\Payment;
use App\Models\Product;
use App\Models\Sale;
use App\Services\AccountingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountingSaleObserver
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Cuando se crea una venta completada:
     * - Contado: DR Caja/Banco → CR Ingresos + IVA
     * - Parcial: DR Caja (pagado) + DR CxC (saldo) → CR Ingresos + IVA
     * - Credito: DR CxC → CR Ingresos + IVA
     */
    public function created(Sale $sale): void
    {
        if ($sale->status !== 'completed') {
            return;
        }

        $companyId = $sale->company_id;
        $saleId = $sale->id;
        $accountingService = $this->accountingService;

        DB::afterCommit(function () use ($saleId, $companyId, $accountingService) {
            try {
                if (!$accountingService->hasAccountingConfigured($companyId)) {
                    return;
                }

                $sale = Sale::find($saleId);
                if (!$sale || $sale->status !== 'completed') {
                    return;
                }

                $this->createSaleEntry($sale);
                $this->createCostEntry($sale);
            } catch (\Exception $e) {
                Log::error('AccountingSaleObserver::created - Error creando registro contable', [
                    'sale_id' => $saleId,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    /**
     * Cuando se cancela una venta, reversar el asiento original
     */
    public function updated(Sale $sale): void
    {
        try {
            if (!$sale->isDirty('status') || $sale->status !== 'cancelled') {
                return;
            }

            if (!$this->accountingService->hasAccountingConfigured($sale->company_id)) {
                return;
            }

            $this->reverseSaleEntry($sale);
        } catch (\Exception $e) {
            Log::error('AccountingSaleObserver::updated - Error reversando registro contable', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function createSaleEntry(Sale $sale): void
    {
        $lines = [];
        $companyId = $sale->company_id;

        // Cuenta CxC (solo se usa si hay saldo pendiente)
        $cxcAccount = $this->accountingService->getSaleTypeAccount($companyId, 'sale_cxc')
            ?? $this->accountingService->getAccountByCode($companyId, '13050501');

        if (!$cxcAccount) {
            Log::warning('AccountingSaleObserver: Cuenta CxC no configurada', [
                'company_id' => $companyId,
            ]);
            return;
        }

        // Agrupar items por (producto|servicio) × tasa_iva → subtotales
        $sale->load('items');

        $subtotals = [];
        $taxByRate = [];

        foreach ($sale->items as $item) {
            $isService = !is_null($item->service_id);
            $prefix = $isService ? 'sale_revenue_services' : 'sale_revenue_products';
            $rate = $item->tax_rate;

            $suffix = match (true) {
                is_null($rate)  => 'excluded',
                (float)$rate == 0.0  => 'exempt',
                (float)$rate == 5.0  => '5',
                (float)$rate == 19.0 => '19',
                default         => 'excluded',
            };

            $key = "{$prefix}_{$suffix}";
            $subtotals[$key] = ($subtotals[$key] ?? 0) + (float) $item->subtotal;

            if (!is_null($rate) && (float)$rate > 0) {
                $taxByRate[(float)$rate] = ($taxByRate[(float)$rate] ?? 0) + (float) $item->tax_amount;
            }
        }

        if (empty($subtotals)) {
            return;
        }

        // ── LADO DEBITO: Caja/Banco para pagos iniciales, CxC para saldo ──
        $netAmount = (float) $sale->total_amount - (float) $sale->retention_amount;

        // Cargar pagos iniciales (creados durante la venta)
        $initialPayments = Payment::where('reference_type', Sale::class)
            ->where('reference_id', $sale->id)
            ->where('is_initial_payment', true)
            ->where('status', 'completed')
            ->get();

        $totalInitialPaid = $initialPayments->sum('amount');
        $totalInitialPaid = min($totalInitialPaid, $netAmount); // No exceder el neto

        if ($totalInitialPaid > 0) {
            // Agrupar pagos por caja para evitar lineas duplicadas
            $paymentsByCashRegister = $initialPayments->groupBy('cash_register_id');

            foreach ($paymentsByCashRegister as $cashRegisterId => $payments) {
                $totalForRegister = $payments->sum('amount');

                $cashAccount = $this->accountingService->getCashRegisterAccount($cashRegisterId)
                    ?? $this->accountingService->getAccountByCode($companyId, '11050501');

                if ($cashAccount && $totalForRegister > 0) {
                    $lines[] = [
                        'account_id' => $cashAccount->id,
                        'debit' => round($totalForRegister, 2),
                        'credit' => 0,
                        'description' => "Recaudo Venta {$sale->invoice_number}",
                    ];
                }
            }
        }

        // CxC por el saldo restante (si hay)
        $cxcAmount = max(0, round($netAmount - $totalInitialPaid, 2));
        if ($cxcAmount > 0) {
            $lines[] = [
                'account_id' => $cxcAccount->id,
                'debit' => $cxcAmount,
                'credit' => 0,
                'description' => "CxC Venta {$sale->invoice_number}",
            ];
        }

        // ── LADO CREDITO: Ingresos + IVA + Retenciones (sin cambios) ──

        // CR: Ingresos por cada grupo (producto/servicio × tasa)
        $defaultRevenueCode = '41350101';
        foreach ($subtotals as $transactionType => $amount) {
            if ($amount <= 0) {
                continue;
            }

            $account = $this->accountingService->getSaleTypeAccount($companyId, $transactionType)
                ?? $this->accountingService->getAccountByCode($companyId, $defaultRevenueCode);

            if ($account) {
                $label = str_contains($transactionType, '_services') ? 'Venta Servicios' : 'Venta Productos';
                $lines[] = [
                    'account_id' => $account->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => "{$label} {$sale->invoice_number}",
                ];
            }
        }

        // CR: IVA por tasa (5% y 19%)
        $ivaRateConfig = [
            5.0  => ['transaction' => 'sale_tax_5',  'default_code' => '24080501', 'label' => 'IVA 5%'],
            19.0 => ['transaction' => 'sale_tax_19', 'default_code' => '24080501', 'label' => 'IVA 19%'],
        ];

        foreach ($ivaRateConfig as $rate => $config) {
            $taxAmount = $taxByRate[$rate] ?? 0;
            if ($taxAmount <= 0) {
                continue;
            }

            $ivaAccount = $this->accountingService->getSaleTypeAccount($companyId, $config['transaction'])
                ?? $this->accountingService->getAccountByCode($companyId, $config['default_code']);

            if ($ivaAccount) {
                $lines[] = [
                    'account_id' => $ivaAccount->id,
                    'debit' => 0,
                    'credit' => $taxAmount,
                    'description' => "{$config['label']} Venta {$sale->invoice_number}",
                ];
            }
        }

        // DR: Retenciones (reducen el CxC pero son un pasivo)
        if (!empty($sale->retentions) && is_array($sale->retentions)) {
            $retentionConfig = [
                'retefuente' => ['transaction' => 'sale_retention_fuente', 'default_code' => '23654001'],
                'reteiva'    => ['transaction' => 'sale_retention_iva',    'default_code' => '23670101'],
                'reteica'    => ['transaction' => 'sale_retention_ica',    'default_code' => '23680501'],
                'retecree'   => ['transaction' => 'sale_retention_fuente', 'default_code' => '23654001'],
            ];

            foreach ($sale->retentions as $retention) {
                $retentionValue = (float) ($retention['value'] ?? 0);
                if ($retentionValue <= 0) {
                    continue;
                }

                $retentionType = $retention['type'] ?? '';
                $config = $retentionConfig[$retentionType] ?? ['transaction' => 'sale_retention_fuente', 'default_code' => '23654001'];

                $retentionAccount = $this->accountingService->getSaleTypeAccount($companyId, $config['transaction'])
                    ?? $this->accountingService->getAccountByCode($companyId, $config['default_code']);

                if ($retentionAccount) {
                    $lines[] = [
                        'account_id' => $retentionAccount->id,
                        'debit' => $retentionValue,
                        'credit' => 0,
                        'description' => "Retencion {$retention['name']} Venta {$sale->invoice_number}",
                    ];
                }
            }
        }

        if (count($lines) >= 2) {
            $this->accountingService->createAutoEntry(
                $sale,
                'sale_completed',
                $lines,
                "Venta {$sale->invoice_number} - {$sale->type}"
            );
        }
    }

    /**
     * Costo de venta: DR Costo Venta (6135) / CR Inventario (1435)
     */
    private function createCostEntry(Sale $sale): void
    {
        $costAccount = $this->accountingService->getSaleTypeAccount($sale->company_id, 'sale_cost_of_goods')
            ?? $this->accountingService->getAccountByCode($sale->company_id, '61350501');

        $inventoryAccount = $this->accountingService->getSaleTypeAccount($sale->company_id, 'sale_inventory')
            ?? $this->accountingService->getAccountByCode($sale->company_id, '14350101');

        if (!$costAccount || !$inventoryAccount) {
            return;
        }

        $sale->load('items');
        $totalCost = 0;

        foreach ($sale->items as $item) {
            if (!$item->product_id) {
                continue;
            }

            $product = Product::find($item->product_id);
            if (!$product || $product->average_cost <= 0) {
                continue;
            }

            $totalCost += $product->average_cost * $item->quantity;
        }

        if ($totalCost <= 0) {
            return;
        }

        $totalCost = round($totalCost, 2);

        $lines = [
            [
                'account_id' => $costAccount->id,
                'debit' => $totalCost,
                'credit' => 0,
                'description' => "Costo de venta {$sale->invoice_number}",
            ],
            [
                'account_id' => $inventoryAccount->id,
                'debit' => 0,
                'credit' => $totalCost,
                'description' => "Salida inventario {$sale->invoice_number}",
            ],
        ];

        $this->accountingService->createAutoEntry(
            $sale,
            'sale_cost',
            $lines,
            "Costo de venta {$sale->invoice_number}"
        );
    }

    private function reverseSaleEntry(Sale $sale): void
    {
        $revenueEntry = \App\Models\JournalEntry::where('reference_type', Sale::class)
            ->where('reference_id', $sale->id)
            ->where('status', 'posted')
            ->where('auto_source', 'sale_completed')
            ->first();

        if ($revenueEntry) {
            $revenueEntry->load('lines');
            $this->accountingService->createReversalEntry($revenueEntry, "Anulacion de venta {$sale->invoice_number}");
        }

        $costEntry = \App\Models\JournalEntry::where('reference_type', Sale::class)
            ->where('reference_id', $sale->id)
            ->where('status', 'posted')
            ->where('auto_source', 'sale_cost')
            ->first();

        if ($costEntry) {
            $costEntry->load('lines');
            $this->accountingService->createReversalEntry($costEntry, "Reverso costo de venta {$sale->invoice_number}");
        }
    }
}
