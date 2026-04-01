<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingAccount;
use App\Models\CashRegister;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccountingConfigController extends Controller
{
    /**
     * Obtener mapeo de tipos de transaccion a cuentas contables (configuracion general)
     */
    public function getSaleTypeAccounts(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $mappings = DB::table('accounting_account_sale_type')
                ->where('company_id', $companyId)
                ->get();

            $result = $mappings->map(function ($mapping) {
                $account = AccountingAccount::find($mapping->accounting_account_id);
                return [
                    'id' => $mapping->id,
                    'transaction_type' => $mapping->transaction_type,
                    'accounting_account_id' => $mapping->accounting_account_id,
                    'is_active' => (bool) $mapping->is_active,
                    'accounting_account' => $account ? [
                        'id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener configuracion de cuentas por tipo de transaccion: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar mapeo de tipos de transaccion a cuentas contables (configuracion general)
     */
    public function updateSaleTypeAccounts(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'mappings' => 'required|array',
                'mappings.*.transaction_type' => 'required|string|max:50',
                'mappings.*.accounting_account_id' => 'required|exists:accounting_accounts,id',
            ]);

            $companyId = $request->user()->company_id;

            DB::transaction(function () use ($validated, $companyId) {
                foreach ($validated['mappings'] as $mapping) {
                    DB::table('accounting_account_sale_type')->updateOrInsert(
                        [
                            'company_id' => $companyId,
                            'transaction_type' => $mapping['transaction_type'],
                        ],
                        [
                            'accounting_account_id' => $mapping['accounting_account_id'],
                            'is_active' => true,
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Configuracion actualizada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la configuracion: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener cajas con sus cuentas contables vinculadas
     */
    public function getCashRegisterAccounts(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $cashRegisters = CashRegister::where('company_id', $companyId)
                ->with(['paymentMethod'])
                ->orderBy('name')
                ->get();

            $result = $cashRegisters->map(function ($cr) use ($companyId) {
                $account = AccountingAccount::where('company_id', $companyId)
                    ->whereHas('cashRegisters', function ($q) use ($cr) {
                        $q->where('cash_register_id', $cr->id)
                            ->where('accounting_account_cash_register.is_active', true);
                    })->first();

                return [
                    'cash_register' => [
                        'id' => $cr->id,
                        'name' => $cr->name,
                        'type' => $cr->type,
                        'bank_name' => $cr->bank_name,
                    ],
                    'account' => $account ? [
                        'id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cuentas de cajas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener proveedores con sus cuentas contables vinculadas
     */
    public function getSupplierAccounts(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $suppliers = Supplier::where('company_id', $companyId)->orderBy('name')->get();

            $result = $suppliers->map(function ($supplier) use ($companyId) {
                $account = AccountingAccount::where('company_id', $companyId)
                    ->whereHas('suppliers', function ($q) use ($supplier) {
                        $q->where('supplier_id', $supplier->id)
                            ->where('accounting_account_supplier.is_active', true);
                    })->first();

                return [
                    'supplier' => [
                        'id' => $supplier->id,
                        'name' => $supplier->name,
                        'document_number' => $supplier->document_number ?? null,
                    ],
                    'account' => $account ? [
                        'id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                    ] : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cuentas de proveedores: ' . $e->getMessage(),
            ], 500);
        }
    }
}
