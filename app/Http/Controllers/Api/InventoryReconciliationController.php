<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdjustmentReason;
use App\Models\InventoryAdjustment;
use App\Models\InventoryMovement;
use App\Models\InventoryReconciliation;
use App\Models\InventoryReconciliationItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryReconciliationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InventoryReconciliation::with(['warehouse', 'category', 'createdBy', 'countedBy', 'approvedBy'])
            ->withCount('items')
            ->when($request->search, function ($q, $search) {
                $q->where('reconciliation_number', 'like', "%{$search}%");
            })
            ->when($request->status, function ($q, $status) {
                $q->where('status', $status);
            })
            ->when($request->warehouse_id, function ($q, $warehouseId) {
                $q->where('warehouse_id', $warehouseId);
            })
            ->when($request->date_from, function ($q, $dateFrom) {
                $q->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($q, $dateTo) {
                $q->whereDate('created_at', '<=', $dateTo);
            })
            ->orderBy('created_at', 'desc');

        $reconciliations = $query->paginate($request->per_page ?? 15);

        return response()->json($reconciliations);
    }

    public function show(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        $inventoryReconciliation->load([
            'warehouse',
            'location',
            'category',
            'createdBy',
            'countedBy',
            'reviewedBy',
            'approvedBy',
            'appliedBy',
            'items.product',
        ]);

        return response()->json($inventoryReconciliation);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'location_id' => 'nullable|exists:locations,id',
            'category_id' => 'nullable|exists:product_categories,id',
            'is_blind_count' => 'boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // Query trackable, active products
        $productsQuery = Product::where('is_active', true)
            ->where('is_trackable', true)
            ->where('company_id', $user->company_id);

        if (!empty($validated['category_id'])) {
            $productsQuery->where('category_id', $validated['category_id']);
        }

        if (!empty($validated['location_id'])) {
            $productsQuery->where('location_id', $validated['location_id']);
        }

        $products = $productsQuery->get();

        if ($products->isEmpty()) {
            return response()->json(['message' => 'No se encontraron productos para conciliar con los filtros seleccionados'], 400);
        }

        $reconciliation = DB::transaction(function () use ($validated, $user, $products) {
            $reconciliation = InventoryReconciliation::create([
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id ?? 1,
                'warehouse_id' => $validated['warehouse_id'] ?? null,
                'location_id' => $validated['location_id'] ?? null,
                'category_id' => $validated['category_id'] ?? null,
                'is_blind_count' => $validated['is_blind_count'] ?? false,
                'notes' => $validated['notes'] ?? null,
                'total_products' => $products->count(),
                'created_by_user_id' => $user->id,
            ]);

            $items = $products->map(function ($product) use ($reconciliation) {
                return [
                    'inventory_reconciliation_id' => $reconciliation->id,
                    'product_id' => $product->id,
                    'system_stock' => $product->current_stock,
                    'unit_cost' => $product->average_cost ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })->toArray();

            InventoryReconciliationItem::insert($items);

            return $reconciliation;
        });

        return response()->json(
            $reconciliation->load(['warehouse', 'category', 'createdBy']),
            201
        );
    }

    public function update(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->isDraft()) {
            return response()->json(['message' => 'Solo se pueden editar conciliaciones en borrador'], 400);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
            'is_blind_count' => 'boolean',
        ]);

        $inventoryReconciliation->update($validated);

        return response()->json($inventoryReconciliation->fresh());
    }

    public function destroy(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->isDraft()) {
            return response()->json(['message' => 'Solo se pueden eliminar conciliaciones en borrador'], 400);
        }

        $inventoryReconciliation->delete();

        return response()->json(null, 204);
    }

    public function startCounting(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canStartCounting()) {
            return response()->json(['message' => 'Esta conciliación no puede iniciar conteo'], 400);
        }

        $inventoryReconciliation->update([
            'status' => 'in_progress',
            'counting_started_at' => now(),
            'counted_by_user_id' => $request->user()->id,
        ]);

        return response()->json($inventoryReconciliation->fresh()->load(['items.product', 'createdBy', 'countedBy']));
    }

    public function updateCounts(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->isInProgress()) {
            return response()->json(['message' => 'Solo se pueden actualizar conteos en progreso'], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|integer|exists:inventory_reconciliation_items,id',
            'items.*.physical_count' => 'required|integer|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $updatedItems = [];

        DB::transaction(function () use ($validated, $inventoryReconciliation, &$updatedItems) {
            foreach ($validated['items'] as $itemData) {
                $item = InventoryReconciliationItem::where('id', $itemData['item_id'])
                    ->where('inventory_reconciliation_id', $inventoryReconciliation->id)
                    ->firstOrFail();

                $difference = $itemData['physical_count'] - $item->system_stock;
                $financialImpact = $difference * $item->unit_cost;
                $variancePercentage = $item->system_stock > 0
                    ? round(($difference / $item->system_stock) * 100, 2)
                    : ($itemData['physical_count'] > 0 ? 100 : 0);

                $item->update([
                    'physical_count' => $itemData['physical_count'],
                    'difference' => $difference,
                    'financial_impact' => $financialImpact,
                    'variance_percentage' => $variancePercentage,
                    'is_counted' => true,
                    'notes' => $itemData['notes'] ?? $item->notes,
                ]);

                $updatedItems[] = $item->fresh()->load('product');
            }

            // Update total_counted
            $totalCounted = $inventoryReconciliation->items()->where('is_counted', true)->count();
            $inventoryReconciliation->update(['total_counted' => $totalCounted]);
        });

        return response()->json($updatedItems);
    }

    public function finishCounting(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canFinishCounting()) {
            return response()->json(['message' => 'Esta conciliación no puede finalizar conteo'], 400);
        }

        DB::transaction(function () use ($inventoryReconciliation, $request) {
            // Items not counted default to system_stock (no difference)
            $inventoryReconciliation->items()
                ->where('is_counted', false)
                ->update([
                    'physical_count' => DB::raw('system_stock'),
                    'difference' => 0,
                    'financial_impact' => 0,
                    'variance_percentage' => 0,
                    'is_counted' => true,
                ]);

            $inventoryReconciliation->update([
                'status' => 'review',
                'counting_completed_at' => now(),
                'reviewed_by_user_id' => $request->user()->id,
            ]);

            $inventoryReconciliation->recalculateSummary();
        });

        return response()->json($inventoryReconciliation->fresh()->load([
            'warehouse', 'category', 'createdBy', 'countedBy', 'items.product',
        ]));
    }

    public function approve(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canBeApproved()) {
            return response()->json(['message' => 'Esta conciliación no puede ser aprobada'], 400);
        }

        $inventoryReconciliation->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by_user_id' => $request->user()->id,
        ]);

        return response()->json($inventoryReconciliation->fresh()->load(['createdBy', 'countedBy', 'approvedBy']));
    }

    public function reject(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canBeApproved()) {
            return response()->json(['message' => 'Esta conciliación no puede ser rechazada'], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        // Reset counting - allow re-count
        DB::transaction(function () use ($inventoryReconciliation, $validated) {
            $inventoryReconciliation->items()->update([
                'is_counted' => false,
                'physical_count' => null,
                'difference' => 0,
                'financial_impact' => 0,
                'variance_percentage' => 0,
            ]);

            $inventoryReconciliation->update([
                'status' => 'in_progress',
                'notes' => ($inventoryReconciliation->notes ? $inventoryReconciliation->notes . "\n" : '') .
                    "[Rechazado] " . $validated['reason'],
                'counting_completed_at' => null,
                'reviewed_by_user_id' => null,
                'approved_at' => null,
                'approved_by_user_id' => null,
                'total_counted' => 0,
                'total_matches' => 0,
                'total_surpluses' => 0,
                'total_shortages' => 0,
                'total_surplus_value' => 0,
                'total_shortage_value' => 0,
                'net_financial_impact' => 0,
            ]);
        });

        return response()->json($inventoryReconciliation->fresh());
    }

    public function apply(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canBeApplied()) {
            return response()->json(['message' => 'Esta conciliación no puede ser aplicada'], 400);
        }

        $user = $request->user();

        // Get or create the reconciliation adjustment reason
        $reason = AdjustmentReason::firstOrCreate(
            ['code' => 'RECONCILIATION', 'company_id' => $inventoryReconciliation->company_id],
            [
                'name' => 'Conciliación de Inventario',
                'description' => 'Ajuste generado automáticamente por conciliación de inventario',
                'requires_approval' => false,
                'is_active' => true,
            ]
        );

        DB::transaction(function () use ($inventoryReconciliation, $user, $reason) {
            $itemsWithDifference = $inventoryReconciliation->items()
                ->where('difference', '!=', 0)
                ->with('product')
                ->get();

            foreach ($itemsWithDifference as $item) {
                $product = $item->product;
                $currentStock = $product->current_stock;
                $newStock = $item->physical_count;
                $adjustmentQty = $newStock - $currentStock;

                if ($adjustmentQty === 0) {
                    continue; // Stock already matches physical count
                }

                // Create InventoryAdjustment
                $adjustment = InventoryAdjustment::create([
                    'company_id' => $inventoryReconciliation->company_id,
                    'branch_id' => $inventoryReconciliation->branch_id,
                    'product_id' => $product->id,
                    'adjustment_reason_id' => $reason->id,
                    'quantity' => $adjustmentQty,
                    'stock_before' => $currentStock,
                    'stock_after' => $newStock,
                    'unit_cost' => $item->unit_cost,
                    'financial_impact' => abs($adjustmentQty) * $item->unit_cost,
                    'status' => 'auto_approved',
                    'notes' => "Conciliación: {$inventoryReconciliation->reconciliation_number}",
                    'created_by_user_id' => $user->id,
                ]);

                // Create InventoryMovement
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'company_id' => $inventoryReconciliation->company_id,
                    'branch_id' => $inventoryReconciliation->branch_id,
                    'type' => 'adjustment',
                    'quantity' => $adjustmentQty,
                    'unit_cost' => $item->unit_cost,
                    'stock_before' => $currentStock,
                    'stock_after' => $newStock,
                    'reference_type' => InventoryReconciliation::class,
                    'reference_id' => $inventoryReconciliation->id,
                    'created_by_user_id' => $user->id,
                    'notes' => "Conciliación: {$inventoryReconciliation->reconciliation_number}",
                ]);

                // Update product stock
                $product->update([
                    'current_stock' => $newStock,
                    'last_stock_update_at' => now(),
                    'last_stock_update_by' => $user->id,
                ]);

                // Link adjustment to item
                $item->update(['adjustment_id' => $adjustment->id]);
            }

            $inventoryReconciliation->update([
                'status' => 'applied',
                'applied_at' => now(),
                'applied_by_user_id' => $user->id,
            ]);

            $inventoryReconciliation->recalculateSummary();
        });

        return response()->json($inventoryReconciliation->fresh()->load([
            'warehouse', 'category', 'createdBy', 'countedBy', 'approvedBy', 'appliedBy', 'items.product',
        ]));
    }

    public function cancel(Request $request, InventoryReconciliation $inventoryReconciliation): JsonResponse
    {
        if (!$inventoryReconciliation->canBeCancelled()) {
            return response()->json(['message' => 'Esta conciliación no puede ser cancelada'], 400);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $inventoryReconciliation->update([
            'status' => 'cancelled',
            'cancellation_reason' => $validated['reason'] ?? null,
            'cancelled_at' => now(),
        ]);

        return response()->json($inventoryReconciliation->fresh());
    }

    public function stats(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $total = InventoryReconciliation::where('company_id', $companyId)->count();
        $inProgress = InventoryReconciliation::where('company_id', $companyId)->where('status', 'in_progress')->count();
        $pendingApproval = InventoryReconciliation::where('company_id', $companyId)->where('status', 'review')->count();
        $lastApplied = InventoryReconciliation::where('company_id', $companyId)
            ->where('status', 'applied')
            ->latest('applied_at')
            ->first();

        return response()->json([
            'total' => $total,
            'in_progress' => $inProgress,
            'pending_approval' => $pendingApproval,
            'last_applied_at' => $lastApplied?->applied_at,
        ]);
    }
}
