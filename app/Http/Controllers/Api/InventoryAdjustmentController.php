<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdjustmentReason;
use App\Models\InventoryAdjustment;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryAdjustmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $adjustments = InventoryAdjustment::with([
                'product',
                'adjustmentReason',
                'createdBy',
            ])
            ->when($request->search, function ($query, $search) {
                $query->where('adjustment_number', 'like', "%{$search}%");
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->product_id, function ($query, $productId) {
                $query->where('product_id', $productId);
            })
            ->when($request->adjustment_reason_id, function ($query, $reasonId) {
                $query->where('adjustment_reason_id', $reasonId);
            })
            ->when($request->date_from, function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($adjustments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'adjustment_reason_id' => 'required|exists:adjustment_reasons,id',
            'quantity' => 'required|integer|not_in:0',
            'notes' => 'nullable|string',
        ]);

        $product = Product::findOrFail($validated['product_id']);
        $reason = AdjustmentReason::findOrFail($validated['adjustment_reason_id']);

        $stockBefore = $product->current_stock;
        $stockAfter = $stockBefore + $validated['quantity'];

        if ($stockAfter < 0) {
            return response()->json(['message' => 'El ajuste resultaría en stock negativo'], 400);
        }

        $financialImpact = abs($validated['quantity']) * $product->average_cost;

        // Determinar si requiere aprobación
        $requiresApproval = $reason->requiresApprovalFor(
            $validated['quantity'],
            $financialImpact
        );

        $status = $requiresApproval ? 'pending' : 'auto_approved';

        $adjustment = DB::transaction(function () use (
            $validated,
            $product,
            $stockBefore,
            $stockAfter,
            $financialImpact,
            $status,
            $request
        ) {
            $adjustment = InventoryAdjustment::create([
                'company_id' => $product->company_id,
                'branch_id' => $product->branch_id ?? $request->user()->branch_id,
                'product_id' => $validated['product_id'],
                'adjustment_reason_id' => $validated['adjustment_reason_id'],
                'quantity' => $validated['quantity'],
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'unit_cost' => $product->average_cost,
                'financial_impact' => $financialImpact,
                'status' => $status,
                'notes' => $validated['notes'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]);

            // Si es auto-aprobado, aplicar inmediatamente
            if ($status === 'auto_approved') {
                $this->applyAdjustment($adjustment, $request->user()->id);
            }

            return $adjustment;
        });

        return response()->json($adjustment->load(['product', 'adjustmentReason', 'createdBy']), 201);
    }

    public function show(Request $request, InventoryAdjustment $inventoryAdjustment): JsonResponse
    {
        return response()->json($inventoryAdjustment->load([
            'product',
            'adjustmentReason',
            'createdBy',
            'approvedBy',
        ]));
    }

    public function update(Request $request, InventoryAdjustment $inventoryAdjustment): JsonResponse
    {
        if (!$inventoryAdjustment->isPending()) {
            return response()->json(['message' => 'Solo se pueden editar ajustes pendientes'], 400);
        }

        $validated = $request->validate([
            'quantity' => 'sometimes|integer|not_in:0',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['quantity'])) {
            $product = $inventoryAdjustment->product;
            $stockAfter = $product->current_stock + $validated['quantity'];

            if ($stockAfter < 0) {
                return response()->json(['message' => 'El ajuste resultaría en stock negativo'], 400);
            }

            $financialImpact = abs($validated['quantity']) * $product->average_cost;

            $inventoryAdjustment->update([
                'quantity' => $validated['quantity'],
                'stock_before' => $product->current_stock,
                'stock_after' => $stockAfter,
                'financial_impact' => $financialImpact,
                'notes' => $validated['notes'] ?? $inventoryAdjustment->notes,
            ]);
        } else {
            $inventoryAdjustment->update($validated);
        }

        return response()->json($inventoryAdjustment->fresh()->load(['product', 'adjustmentReason']));
    }

    public function destroy(Request $request, InventoryAdjustment $inventoryAdjustment): JsonResponse
    {
        if (!$inventoryAdjustment->isPending()) {
            return response()->json(['message' => 'Solo se pueden eliminar ajustes pendientes'], 400);
        }

        $inventoryAdjustment->delete();

        return response()->json(null, 204);
    }

    public function approve(Request $request, InventoryAdjustment $inventoryAdjustment): JsonResponse
    {
        if (!$inventoryAdjustment->canBeApproved()) {
            return response()->json(['message' => 'Este ajuste no puede ser aprobado'], 400);
        }

        // Recalcular con stock actual
        $product = $inventoryAdjustment->product;
        $stockBefore = $product->current_stock;
        $stockAfter = $stockBefore + $inventoryAdjustment->quantity;

        if ($stockAfter < 0) {
            return response()->json(['message' => 'El ajuste resultaría en stock negativo'], 400);
        }

        DB::transaction(function () use ($inventoryAdjustment, $stockBefore, $stockAfter, $request) {
            $inventoryAdjustment->update([
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'status' => 'approved',
                'approved_by_user_id' => $request->user()->id,
            ]);

            $this->applyAdjustment($inventoryAdjustment, $request->user()->id);
        });

        return response()->json($inventoryAdjustment->fresh()->load(['product', 'adjustmentReason', 'approvedBy']));
    }

    public function reject(Request $request, InventoryAdjustment $inventoryAdjustment): JsonResponse
    {
        if (!$inventoryAdjustment->canBeApproved()) {
            return response()->json(['message' => 'Este ajuste no puede ser rechazado'], 400);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $inventoryAdjustment->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json($inventoryAdjustment->fresh());
    }

    private function applyAdjustment(InventoryAdjustment $adjustment, int $userId): void
    {
        $product = $adjustment->product;

        // Crear movimiento de inventario
        InventoryMovement::create([
            'product_id' => $product->id,
            'company_id' => $adjustment->company_id,
            'branch_id' => $adjustment->branch_id,
            'type' => 'adjustment',
            'quantity' => $adjustment->quantity,
            'unit_cost' => $adjustment->unit_cost,
            'stock_before' => $adjustment->stock_before,
            'stock_after' => $adjustment->stock_after,
            'reference_type' => InventoryAdjustment::class,
            'reference_id' => $adjustment->id,
            'created_by_user_id' => $userId,
            'notes' => "Ajuste: {$adjustment->adjustment_number}",
        ]);

        // Actualizar stock del producto
        $product->update(['current_stock' => $adjustment->stock_after]);
    }
}
