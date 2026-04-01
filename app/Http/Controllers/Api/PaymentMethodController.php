<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentMethodRequest;
use App\Http\Requests\UpdatePaymentMethodRequest;
use App\Models\ActivityLog;
use App\Models\PaymentMethod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    /**
     * Lista todos los métodos de pago
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            // Usar withoutGlobalScopes para evitar que incluya franquicias
            // y filtrar SOLO por la empresa del usuario
            $paymentMethods = PaymentMethod::withoutGlobalScopes()
                ->when($user->company_id && !$request->boolean('all'), function ($query) use ($user) {
                    // Filtrar estrictamente por la empresa del usuario (sin franquicias)
                    $query->where('company_id', $user->company_id);
                })
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                })
                ->when($request->has('is_active'), function ($query) use ($request) {
                    $query->where('is_active', $request->boolean('is_active'));
                })
                ->when($request->type, function ($query, $type) {
                    $query->where('type', $type);
                })
                ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
                ->whereNull('deleted_at') // Respetar soft deletes
                ->orderBy('name')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $paymentMethods,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los métodos de pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crea un nuevo método de pago
     */
    public function store(StorePaymentMethodRequest $request): JsonResponse
    {
        try {
            $paymentMethod = PaymentMethod::create($request->validated());

            // Registrar en el log de actividades
            ActivityLog::log(
                'Método de pago creado: ' . $paymentMethod->name,
                'created',
                $paymentMethod,
                ['name' => $paymentMethod->name, 'type' => $paymentMethod->type]
            );

            return response()->json([
                'success' => true,
                'data' => $paymentMethod,
                'message' => 'Método de pago creado exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear el método de pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Muestra un método de pago específico
     */
    public function show(PaymentMethod $paymentMethod): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $paymentMethod,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el método de pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualiza un método de pago
     */
    public function update(UpdatePaymentMethodRequest $request, PaymentMethod $paymentMethod): JsonResponse
    {
        try {
            $oldData = $paymentMethod->toArray();
            $paymentMethod->update($request->validated());

            // Registrar en el log de actividades
            ActivityLog::log(
                'Método de pago actualizado: ' . $paymentMethod->name,
                'updated',
                $paymentMethod,
                ['old' => $oldData, 'new' => $paymentMethod->toArray()]
            );

            return response()->json([
                'success' => true,
                'data' => $paymentMethod,
                'message' => 'Método de pago actualizado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el método de pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Elimina un método de pago
     */
    public function destroy(Request $request, PaymentMethod $paymentMethod): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('payment-methods.manage')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para eliminar métodos de pago',
                ], 403);
            }

            // Validar que no sea del sistema
            if ($paymentMethod->type === 'system') {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar un método de pago del sistema',
                ], 400);
            }

            // Validar que no tenga pagos asociados
            if ($paymentMethod->payments()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar un método de pago con pagos asociados',
                ], 400);
            }

            $paymentMethodName = $paymentMethod->name;
            $paymentMethod->delete();

            // Registrar en el log de actividades
            ActivityLog::log(
                'Método de pago eliminado: ' . $paymentMethodName,
                'deleted',
                null,
                ['name' => $paymentMethodName]
            );

            return response()->json([
                'success' => true,
                'message' => 'Método de pago eliminado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el método de pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

