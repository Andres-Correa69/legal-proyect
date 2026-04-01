<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCashTransferRequest;
use App\Models\ActivityLog;
use App\Models\CashRegister;
use App\Models\CashRegisterTransfer;
use App\Services\CashRegisterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashRegisterTransferController extends Controller
{
    protected CashRegisterService $cashRegisterService;

    public function __construct(CashRegisterService $cashRegisterService)
    {
        $this->cashRegisterService = $cashRegisterService;
    }

    /**
     * Lista todas las transferencias entre cajas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $query = CashRegisterTransfer::with([
                'sourceCashRegister',
                'destinationCashRegister',
                'createdBy',
                'cancelledBy',
            ]);

            // Filtro por multiempresa
            if (!$user->isSuperAdmin()) {
                $query->where('company_id', $user->company_id);
            } elseif ($request->has('company_id') && $request->company_id !== 'all') {
                $query->where('company_id', $request->company_id);
            }

            // Filtros adicionales
            $query->when($request->search, function ($query, $search) {
                $query->where('transfer_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            })
            ->when($request->status, function ($query, $status) {
                if ($status !== 'all') {
                    $query->where('status', $status);
                }
            })
            ->when($request->source_cash_register_id, function ($query, $sourceId) {
                if ($sourceId !== 'all') {
                    $query->where('source_cash_register_id', $sourceId);
                }
            })
            ->when($request->destination_cash_register_id, function ($query, $destId) {
                if ($destId !== 'all') {
                    $query->where('destination_cash_register_id', $destId);
                }
            })
            ->when($request->date_from, function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            });

            $transfers = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            // Calcular summary
            $summaryQuery = clone $query->getQuery();
            $completedTransfers = $summaryQuery->where('status', 'completed')->get();
            $cancelledCount = $summaryQuery->where('status', 'cancelled')->count();

            $summary = [
                'total_amount' => $completedTransfers->sum('amount'),
                'total_transfers' => $completedTransfers->count(),
                'total_cancelled' => $cancelledCount,
            ];

            return response()->json([
                'success' => true,
                'data' => $transfers,
                'summary' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las transferencias',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crea una nueva transferencia entre cajas
     */
    public function store(StoreCashTransferRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            $source = CashRegister::findOrFail($validated['source_cash_register_id']);
            $destination = CashRegister::findOrFail($validated['destination_cash_register_id']);

            $transfer = $this->cashRegisterService->transferBetweenRegisters(
                $source,
                $destination,
                $validated['amount'],
                $request->user()->id,
                $validated['notes'] ?? null
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Transferencia creada entre cajas',
                'created',
                $transfer,
                [
                    'from' => $source->name,
                    'to' => $destination->name,
                    'amount' => $validated['amount'],
                    'transfer_number' => $transfer->transfer_number,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $transfer->load([
                    'sourceCashRegister',
                    'destinationCashRegister',
                    'createdBy',
                ]),
                'message' => 'Transferencia creada exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Muestra una transferencia específica
     */
    public function show(CashRegisterTransfer $transfer): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $transfer->load([
                    'sourceCashRegister',
                    'destinationCashRegister',
                    'createdBy',
                    'cancelledBy',
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la transferencia',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancela una transferencia
     */
    public function cancel(Request $request, CashRegisterTransfer $transfer): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-transfers.cancel')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para cancelar transferencias',
                ], 403);
            }

            // Validar que no esté cancelada
            if ($transfer->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'La transferencia ya está cancelada',
                ], 400);
            }

            $validated = $request->validate([
                'reason' => 'required|string|min:10|max:500',
            ]);

            $cancelledTransfer = $this->cashRegisterService->cancelTransfer(
                $transfer,
                $request->user()->id,
                $validated['reason']
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Transferencia cancelada: ' . $transfer->transfer_number,
                'cancelled',
                $cancelledTransfer,
                [
                    'transfer_number' => $transfer->transfer_number,
                    'reason' => $validated['reason'],
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $cancelledTransfer->load([
                    'sourceCashRegister',
                    'destinationCashRegister',
                    'createdBy',
                    'cancelledBy',
                ]),
                'message' => 'Transferencia cancelada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Exporta las transferencias a Excel o PDF
     */
    public function export(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-transfers.export')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para exportar transferencias',
                ], 403);
            }

            $validated = $request->validate([
                'format' => 'required|in:excel,pdf',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date',
                'status' => 'nullable|in:completed,cancelled',
            ]);

            // Aquí iría la lógica de exportación
            // Por ahora retornamos un mensaje indicando que está pendiente de implementación

            return response()->json([
                'success' => false,
                'message' => 'Funcionalidad de exportación pendiente de implementación',
            ], 501);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar transferencias',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

