<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OpenCashSessionRequest;
use App\Http\Requests\CloseCashSessionRequest;
use App\Models\ActivityLog;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Services\CashRegisterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashRegisterSessionController extends Controller
{
    protected CashRegisterService $cashRegisterService;

    public function __construct(CashRegisterService $cashRegisterService)
    {
        $this->cashRegisterService = $cashRegisterService;
    }

    /**
     * Lista todas las sesiones de caja
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $sessions = CashRegisterSession::with([
                'cashRegister',
                'openedBy',
                'closedBy',
            ])
                ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                    $query->where('cash_register_id', $cashRegisterId);
                })
                ->when($request->status, function ($query, $status) {
                    if ($status === 'open') {
                        $query->whereNull('closed_at');
                    } elseif ($status === 'closed') {
                        $query->whereNotNull('closed_at');
                    }
                })
                ->when($request->date_from, function ($query, $dateFrom) {
                    $query->whereDate('opened_at', '>=', $dateFrom);
                })
                ->when($request->date_to, function ($query, $dateTo) {
                    $query->whereDate('opened_at', '<=', $dateTo);
                })
                ->when($request->search, function ($query, $search) {
                    $query->whereHas('cashRegister', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
                })
                ->orderBy('opened_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $sessions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las sesiones de caja',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Abre una sesión de caja
     */
    public function open(OpenCashSessionRequest $request, CashRegister $cashRegister): JsonResponse
    {
        try {
            $validated = $request->validated();

            $session = $this->cashRegisterService->openSession(
                $cashRegister,
                $validated['opening_balance'],
                $request->user()->id
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Sesión de caja abierta: ' . $cashRegister->name,
                'opened',
                $session,
                [
                    'cash_register' => $cashRegister->name,
                    'opening_balance' => $validated['opening_balance'],
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => $session->load(['cashRegister', 'openedBy']),
                    'cash_register' => $cashRegister->fresh(['current_session', 'branch']),
                ],
                'message' => 'Sesión de caja abierta exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Cierra una sesión de caja
     */
    public function close(CloseCashSessionRequest $request, CashRegisterSession $session): JsonResponse
    {
        try {
            $validated = $request->validated();

            $closedSession = $this->cashRegisterService->closeSession(
                $session,
                $validated['closing_balance'],
                $request->user()->id,
                $validated['transfer_to_cash_register_id'] ?? null,
                $validated['notes'] ?? null
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Sesión de caja cerrada: ' . $closedSession->cashRegister->name,
                'closed',
                $closedSession,
                [
                    'cash_register' => $closedSession->cashRegister->name,
                    'closing_balance' => $validated['closing_balance'],
                    'expected_balance' => $closedSession->expected_balance,
                    'difference' => $closedSession->difference,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => $closedSession->load(['cashRegister', 'openedBy', 'closedBy']),
                    'cash_register' => $closedSession->cashRegister->fresh(),
                ],
                'message' => 'Sesión de caja cerrada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Muestra el resumen de una sesión
     */
    public function summary(Request $request, CashRegisterSession $session): JsonResponse
    {
        try {
            $summary = $this->cashRegisterService->getSessionSummary($session);

            // Obtener detalles de pagos por tipo
            $paymentsByMethod = $session->payments()
                ->with('paymentMethod')
                ->where('status', 'completed')
                ->get()
                ->groupBy('payment_method_id')
                ->map(function ($payments) {
                    return [
                        'method' => $payments->first()->paymentMethod->name,
                        'income' => $payments->where('type', 'income')->sum('amount'),
                        'expense' => $payments->where('type', 'expense')->sum('amount'),
                        'count' => $payments->count(),
                    ];
                })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'session' => $session->load(['cashRegister', 'openedBy', 'closedBy']),
                    'summary' => $summary,
                    'payments_by_method' => $paymentsByMethod,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el resumen de la sesión',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene la sesión actual de una caja
     */
    public function current(Request $request, CashRegister $cashRegister): JsonResponse
    {
        try {
            $session = $cashRegister->currentSession();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay sesión activa para esta caja',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $session->load([
                    'cashRegister',
                    'openedBy',
                    'payments' => function ($query) {
                        $query->latest()->limit(20);
                    },
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la sesión actual',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Muestra una sesión específica
     */
    public function show(CashRegisterSession $session): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $session->load([
                    'cashRegister',
                    'openedBy',
                    'closedBy',
                    'payments.paymentMethod',
                    'payments.createdBy',
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la sesión',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
