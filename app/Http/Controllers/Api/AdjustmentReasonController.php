<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAdjustmentReasonRequest;
use App\Http\Requests\UpdateAdjustmentReasonRequest;
use App\Models\AdjustmentReason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdjustmentReasonController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AdjustmentReason::query();

        // Filtros
        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ilike', "%{$search}%")
                    ->orWhere('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $reasons = $query->orderBy('name', 'asc')->get();

        return response()->json($reasons);
    }

    public function store(StoreAdjustmentReasonRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            $validated['company_id'] = $user->company_id;
        } else {
            if (!isset($validated['company_id']) || !$validated['company_id']) {
                if ($user->company_id) {
                    $validated['company_id'] = $user->company_id;
                } else {
                    return response()->json([
                        'message' => 'El campo company_id es requerido',
                        'errors' => ['company_id' => ['El campo company_id es requerido']],
                    ], 422);
                }
            }
        }

        if (isset($validated['company_id'])) {
            $existingReason = AdjustmentReason::where('code', $validated['code'])
                ->where('company_id', $validated['company_id'])
                ->first();

            if ($existingReason) {
                return response()->json([
                    'message' => 'Ya existe un motivo con este código en esta empresa',
                    'errors' => ['code' => ['Ya existe un motivo con este código en esta empresa']],
                ], 422);
            }
        }

        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $reason = AdjustmentReason::create($validated);

        return response()->json($reason->fresh(), 201);
    }

    public function show(AdjustmentReason $adjustmentReason): JsonResponse
    {
        return response()->json($adjustmentReason);
    }

    public function update(UpdateAdjustmentReasonRequest $request, AdjustmentReason $adjustmentReason): JsonResponse
    {
        $validated = $request->validated();

        $adjustmentReason->update($validated);

        return response()->json($adjustmentReason->fresh());
    }

    public function destroy(Request $request, AdjustmentReason $adjustmentReason): JsonResponse
    {
        $adjustmentReason->delete();

        return response()->json([
            'message' => 'Motivo de ajuste eliminado exitosamente',
        ]);
    }
}
