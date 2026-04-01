<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingPeriod;
use App\Services\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingPeriodController extends Controller
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Lista todos los periodos contables de la empresa
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $periods = AccountingPeriod::where('company_id', $companyId)
                ->with('closedBy:id,name')
                ->orderByDesc('year')
                ->orderByDesc('month')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $periods,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los periodos contables: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cerrar un periodo contable
     */
    public function close(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'year' => 'required|integer|min:2020|max:2100',
                'month' => 'required|integer|min:1|max:12',
            ]);

            $period = $this->accountingService->closePeriod(
                $request->user()->company_id,
                $validated['year'],
                $validated['month'],
                $request->user()->id
            );

            return response()->json([
                'success' => true,
                'data' => $period->load('closedBy:id,name'),
                'message' => 'Periodo cerrado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo cerrar el periodo: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reabrir un periodo contable
     */
    public function reopen(AccountingPeriod $period): JsonResponse
    {
        try {
            if ($period->isOpen()) {
                return response()->json([
                    'success' => false,
                    'message' => 'El periodo ya esta abierto',
                ], 400);
            }

            $period->reopen();

            return response()->json([
                'success' => true,
                'data' => $period->fresh(),
                'message' => 'Periodo reabierto exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo reabrir el periodo: ' . $e->getMessage(),
            ], 400);
        }
    }
}
