<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCashRegisterRequest;
use App\Http\Requests\UpdateCashRegisterRequest;
use App\Models\ActivityLog;
use App\Models\CashRegister;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashRegisterController extends Controller
{
    /**
     * Lista todas las cajas registradoras
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $cashRegisters = CashRegister::with(['company', 'branch', 'current_session', 'paymentMethod'])
                ->when($request->type, function ($query, $type) {
                    $query->where('type', $type);
                })
                ->when($request->status, function ($query, $status) {
                    $query->where('status', $status);
                })
                ->when($request->search, function ($query, $search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('account_number', 'like', "%{$search}%");
                })
                ->when($request->has('is_active'), function ($query) use ($request) {
                    $query->where('is_active', $request->boolean('is_active'));
                })
                ->when($request->branch_id, function ($query, $branchId) {
                    $query->where('branch_id', $branchId);
                })
                ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
                ->orderBy('name')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $cashRegisters,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las cajas registradoras',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crea una nueva caja registradora
     */
    public function store(StoreCashRegisterRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();

            // Agregar company_id y branch_id del usuario autenticado si no están presentes
            if (!isset($validated['company_id'])) {
                $validated['company_id'] = $request->user()->company_id;
            }
            if (!isset($validated['branch_id']) && $request->user()->branch_id) {
                $validated['branch_id'] = $request->user()->branch_id;
            }

            $cashRegister = CashRegister::create($validated);

            // Registrar en el log de actividades
            ActivityLog::log(
                'Caja registradora creada: ' . $cashRegister->name,
                'created',
                $cashRegister,
                ['name' => $cashRegister->name, 'type' => $cashRegister->type]
            );

            return response()->json([
                'success' => true,
                'data' => $cashRegister->load(['company', 'branch', 'paymentMethod']),
                'message' => 'Caja registradora creada exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la caja registradora',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Muestra una caja registradora específica
     */
    public function show(CashRegister $cashRegister): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $cashRegister->load([
                    'company',
                    'branch',
                    'paymentMethod',
                    'sessions' => function ($query) {
                        $query->latest()->limit(10);
                    },
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la caja registradora',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualiza una caja registradora
     */
    public function update(UpdateCashRegisterRequest $request, CashRegister $cashRegister): JsonResponse
    {
        try {
            $oldData = $cashRegister->toArray();
            $cashRegister->update($request->validated());

            // Registrar en el log de actividades
            ActivityLog::log(
                'Caja registradora actualizada: ' . $cashRegister->name,
                'updated',
                $cashRegister,
                ['old' => $oldData, 'new' => $cashRegister->toArray()]
            );

            return response()->json([
                'success' => true,
                'data' => $cashRegister->load(['company', 'branch', 'paymentMethod']),
                'message' => 'Caja registradora actualizada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la caja registradora',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Elimina una caja registradora
     */
    public function destroy(Request $request, CashRegister $cashRegister): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-registers.manage')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para eliminar cajas registradoras',
                ], 403);
            }

            // Validar que la caja no esté abierta
            if ($cashRegister->status === 'open') {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar una caja abierta. Debe cerrarla primero.',
                ], 400);
            }

            // Validar que no tenga sesiones activas
            if ($cashRegister->sessions()->whereNull('closed_at')->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar una caja con sesiones activas',
                ], 400);
            }

            $cashRegisterName = $cashRegister->name;
            $cashRegister->delete();

            // Registrar en el log de actividades
            ActivityLog::log(
                'Caja registradora eliminada: ' . $cashRegisterName,
                'deleted',
                null,
                ['name' => $cashRegisterName]
            );

            return response()->json([
                'success' => true,
                'message' => 'Caja registradora eliminada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la caja registradora',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
