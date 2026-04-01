<?php

namespace App\Observers;

use App\Models\InventoryAdjustment;
use App\Services\AccountingService;
use Illuminate\Support\Facades\Log;

class AccountingAdjustmentObserver
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Cuando un ajuste de inventario se aprueba:
     * - Aumento (sobrante): DR Inventario (14350101) / CR Aprovechamientos (42950501)
     * - Disminucion (faltante/daño): DR Gastos diversos (52959505) / CR Inventario (14350101)
     */
    public function updated(InventoryAdjustment $adjustment): void
    {
        try {
            if (!$adjustment->isDirty('status')) {
                return;
            }

            $newStatus = $adjustment->status;

            // Solo generar asiento cuando se aprueba
            if (in_array($newStatus, ['approved', 'auto_approved'])) {
                if (!$this->accountingService->hasAccountingConfigured($adjustment->company_id)) {
                    return;
                }

                $this->createAdjustmentEntry($adjustment);
            }
        } catch (\Exception $e) {
            Log::error('AccountingAdjustmentObserver::updated - Error creando registro contable', [
                'adjustment_id' => $adjustment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function createAdjustmentEntry(InventoryAdjustment $adjustment): void
    {
        $lines = [];
        $financialImpact = abs((float) $adjustment->financial_impact);

        if ($financialImpact <= 0) {
            return;
        }

        $inventoryAccount = $this->accountingService->getAccountByCode($adjustment->company_id, '14350101');

        if (!$inventoryAccount) {
            Log::warning('AccountingAdjustmentObserver: Cuenta de inventario no encontrada', [
                'adjustment_id' => $adjustment->id,
                'company_id' => $adjustment->company_id,
            ]);
            return;
        }

        $adjustment->load('adjustmentReason');
        $reasonName = $adjustment->adjustmentReason?->name ?? 'Ajuste';

        if ($adjustment->isPositiveAdjustment()) {
            // Sobrante/aumento: DR Inventario / CR Aprovechamientos
            $incomeAccount = $this->accountingService->getAccountByCode($adjustment->company_id, '42950501');

            if (!$incomeAccount) {
                Log::warning('AccountingAdjustmentObserver: Cuenta de aprovechamientos no encontrada', [
                    'adjustment_id' => $adjustment->id,
                ]);
                return;
            }

            $lines[] = [
                'account_id' => $inventoryAccount->id,
                'debit' => $financialImpact,
                'credit' => 0,
                'description' => "Entrada inventario {$adjustment->adjustment_number} - {$reasonName}",
            ];

            $lines[] = [
                'account_id' => $incomeAccount->id,
                'debit' => 0,
                'credit' => $financialImpact,
                'description' => "Sobrante inventario {$adjustment->adjustment_number} - {$reasonName}",
            ];
        } else {
            // Faltante/disminucion: DR Gastos diversos / CR Inventario
            $expenseAccount = $this->accountingService->getAccountByCode($adjustment->company_id, '52959505');

            if (!$expenseAccount) {
                Log::warning('AccountingAdjustmentObserver: Cuenta de gastos diversos no encontrada', [
                    'adjustment_id' => $adjustment->id,
                ]);
                return;
            }

            $lines[] = [
                'account_id' => $expenseAccount->id,
                'debit' => $financialImpact,
                'credit' => 0,
                'description' => "Faltante inventario {$adjustment->adjustment_number} - {$reasonName}",
            ];

            $lines[] = [
                'account_id' => $inventoryAccount->id,
                'debit' => 0,
                'credit' => $financialImpact,
                'description' => "Salida inventario {$adjustment->adjustment_number} - {$reasonName}",
            ];
        }

        $this->accountingService->createAutoEntry(
            $adjustment,
            'inventory_adjustment_approved',
            $lines,
            "Ajuste inventario {$adjustment->adjustment_number} - {$reasonName}"
        );
    }
}
