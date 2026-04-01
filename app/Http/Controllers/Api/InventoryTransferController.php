<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\InventoryTransfer;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryTransferController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $transfers = InventoryTransfer::with([
                'sourceWarehouse',
                'destinationWarehouse',
                'sourceLocation',
                'destinationLocation',
                'items.product',
                'requestedBy',
            ])
            ->when($request->search, function ($query, $search) {
                $query->where('transfer_number', 'like', "%{$search}%");
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->source_warehouse_id, function ($query, $warehouseId) {
                $query->where('source_warehouse_id', $warehouseId);
            })
            ->when($request->destination_warehouse_id, function ($query, $warehouseId) {
                $query->where('destination_warehouse_id', $warehouseId);
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($transfers);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_warehouse_id' => 'required|exists:warehouses,id',
            'destination_warehouse_id' => 'required|exists:warehouses,id|different:source_warehouse_id',
            'source_location_id' => 'nullable|exists:locations,id',
            'destination_location_id' => 'nullable|exists:locations,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_requested' => 'required|integer|min:1',
        ]);

        $transfer = DB::transaction(function () use ($validated, $request) {
            $transfer = InventoryTransfer::create([
                'source_warehouse_id' => $validated['source_warehouse_id'],
                'destination_warehouse_id' => $validated['destination_warehouse_id'],
                'source_location_id' => $validated['source_location_id'] ?? null,
                'destination_location_id' => $validated['destination_location_id'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'requested_by_user_id' => $request->user()->id,
                'status' => 'requested',
            ]);

            foreach ($validated['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity_requested'],
                ]);
            }

            return $transfer;
        });

        return response()->json($transfer->load([
            'sourceWarehouse',
            'destinationWarehouse',
            'items.product',
        ]), 201);
    }

    public function show(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        return response()->json($inventoryTransfer->load([
            'sourceWarehouse',
            'destinationWarehouse',
            'sourceLocation',
            'destinationLocation',
            'items.product',
            'requestedBy',
            'approvedBy',
            'completedBy',
        ]));
    }

    public function update(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if ($inventoryTransfer->status !== 'requested') {
            return response()->json(['message' => 'Solo se pueden editar transferencias solicitadas'], 400);
        }

        $validated = $request->validate([
            'source_warehouse_id' => 'sometimes|exists:warehouses,id',
            'destination_warehouse_id' => 'sometimes|exists:warehouses,id',
            'source_location_id' => 'nullable|exists:locations,id',
            'destination_location_id' => 'nullable|exists:locations,id',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_requested' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($validated, $inventoryTransfer) {
            $inventoryTransfer->update([
                'source_warehouse_id' => $validated['source_warehouse_id'] ?? $inventoryTransfer->source_warehouse_id,
                'destination_warehouse_id' => $validated['destination_warehouse_id'] ?? $inventoryTransfer->destination_warehouse_id,
                'source_location_id' => $validated['source_location_id'] ?? $inventoryTransfer->source_location_id,
                'destination_location_id' => $validated['destination_location_id'] ?? $inventoryTransfer->destination_location_id,
                'notes' => $validated['notes'] ?? $inventoryTransfer->notes,
            ]);

            if (isset($validated['items'])) {
                $inventoryTransfer->items()->delete();
                foreach ($validated['items'] as $item) {
                    $inventoryTransfer->items()->create([
                        'product_id' => $item['product_id'],
                        'quantity_requested' => $item['quantity_requested'],
                    ]);
                }
            }
        });

        return response()->json($inventoryTransfer->fresh()->load([
            'sourceWarehouse',
            'destinationWarehouse',
            'items.product',
        ]));
    }

    public function destroy(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if ($inventoryTransfer->status !== 'requested') {
            return response()->json(['message' => 'Solo se pueden eliminar transferencias solicitadas'], 400);
        }

        $inventoryTransfer->delete();

        return response()->json(null, 204);
    }

    public function approve(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if (!$inventoryTransfer->canBeApproved()) {
            return response()->json(['message' => 'Esta transferencia no puede ser aprobada'], 400);
        }

        $inventoryTransfer->update([
            'status' => 'approved',
            'approved_by_user_id' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json($inventoryTransfer->fresh()->load(['sourceWarehouse', 'destinationWarehouse', 'items.product']));
    }

    public function reject(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if (!$inventoryTransfer->canBeApproved()) {
            return response()->json(['message' => 'Esta transferencia no puede ser rechazada'], 400);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $inventoryTransfer->update([
            'status' => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return response()->json($inventoryTransfer->fresh());
    }

    public function startTransit(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if ($inventoryTransfer->status !== 'approved') {
            return response()->json(['message' => 'Solo se pueden poner en tránsito transferencias aprobadas'], 400);
        }

        $inventoryTransfer->update(['status' => 'in_transit']);

        return response()->json($inventoryTransfer->fresh());
    }

    public function complete(Request $request, InventoryTransfer $inventoryTransfer): JsonResponse
    {
        if (!$inventoryTransfer->canBeCompleted()) {
            return response()->json(['message' => 'Esta transferencia no puede ser completada'], 400);
        }

        // Items son opcionales - si no se envian, se usan las cantidades solicitadas
        $validated = $request->validate([
            'items' => 'nullable|array',
            'items.*.id' => 'required|exists:inventory_transfer_items,id',
            'items.*.quantity_transferred' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            $itemsToProcess = $validated['items'] ?? null;

            // Si no se enviaron items, usar todos los items con sus cantidades solicitadas
            if (!$itemsToProcess) {
                $itemsToProcess = $inventoryTransfer->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'quantity_transferred' => $item->quantity_requested - $item->quantity_transferred,
                    ];
                })->toArray();
            }

            foreach ($itemsToProcess as $itemData) {
                $item = $inventoryTransfer->items()->find($itemData['id']);

                if (!$item) continue;

                $quantityToTransfer = min(
                    $itemData['quantity_transferred'],
                    $item->quantity_requested - $item->quantity_transferred
                );

                if ($quantityToTransfer <= 0) continue;

                $originalProduct = $item->product;

                // ===== BUSCAR PRODUCTO EN UBICACIÓN ORIGEN =====
                $sourceProduct = Product::where('company_id', $inventoryTransfer->company_id)
                    ->where('sku', $originalProduct->sku)
                    ->where('location_id', $inventoryTransfer->source_location_id)
                    ->first();

                if (!$sourceProduct) {
                    throw new \Exception("Producto {$originalProduct->name} (SKU: {$originalProduct->sku}) no encontrado en ubicación origen");
                }

                // Validar stock disponible en origen
                $sourceProduct->refresh();
                $stockBeforeSource = $sourceProduct->current_stock;

                if ($stockBeforeSource < $quantityToTransfer) {
                    throw new \Exception("Stock insuficiente para {$originalProduct->name}. Disponible: {$stockBeforeSource}, Solicitado: {$quantityToTransfer}");
                }

                // ===== BUSCAR O CREAR PRODUCTO EN UBICACIÓN DESTINO =====
                $destinationProduct = Product::where('company_id', $inventoryTransfer->company_id)
                    ->where('sku', $originalProduct->sku)
                    ->where('location_id', $inventoryTransfer->destination_location_id)
                    ->first();

                // Si no existe, buscar con SKU modificado
                if (!$destinationProduct) {
                    $modifiedSku = $originalProduct->sku . '-LOC-' . $inventoryTransfer->destination_location_id;
                    $destinationProduct = Product::where('company_id', $inventoryTransfer->company_id)
                        ->where('sku', $modifiedSku)
                        ->where('location_id', $inventoryTransfer->destination_location_id)
                        ->first();
                }

                // Si aún no existe, crear el producto en destino
                if (!$destinationProduct) {
                    $destinationProduct = $sourceProduct->replicate();
                    $destinationProduct->location_id = $inventoryTransfer->destination_location_id;
                    $destinationProduct->current_stock = 0;
                    $destinationProduct->last_stock_update_by = $request->user()->id;

                    // SIEMPRE usar SKU modificado con sufijo de ubicación para evitar conflictos
                    // Ya que la restricción unique es ['company_id', 'sku']
                    // y el producto origen existe en la misma empresa con el mismo SKU
                    $destinationProduct->sku = $sourceProduct->sku . '-LOC-' . $inventoryTransfer->destination_location_id;

                    // También modificar barcode si existe
                    if ($sourceProduct->barcode) {
                        $destinationProduct->barcode = $sourceProduct->barcode . '-LOC-' . $inventoryTransfer->destination_location_id;
                    }

                    $destinationProduct->save();
                }

                // ===== ACTUALIZAR STOCKS =====
                $stockAfterSource = $stockBeforeSource - $quantityToTransfer;
                $stockBeforeDestination = $destinationProduct->current_stock;
                $stockAfterDestination = $stockBeforeDestination + $quantityToTransfer;

                // Actualizar producto ORIGEN (descuento)
                $sourceProduct->update([
                    'current_stock' => $stockAfterSource,
                    'last_stock_update_at' => now(),
                    'last_stock_update_by' => $request->user()->id,
                ]);

                // Actualizar producto DESTINO (incremento)
                $destinationProduct->update([
                    'current_stock' => $stockAfterDestination,
                    'last_stock_update_at' => now(),
                    'last_stock_update_by' => $request->user()->id,
                ]);

                // Actualizar item
                $item->increment('quantity_transferred', $quantityToTransfer);

                // ===== CREAR MOVIMIENTO DE SALIDA (origen) =====
                InventoryMovement::create([
                    'product_id' => $sourceProduct->id,
                    'company_id' => $inventoryTransfer->company_id,
                    'branch_id' => $request->user()->branch_id,
                    'type' => 'transfer',
                    'quantity' => -abs($quantityToTransfer), // Negativo para salida
                    'unit_cost' => $sourceProduct->average_cost,
                    'stock_before' => $stockBeforeSource,
                    'stock_after' => $stockAfterSource,
                    'reference_type' => InventoryTransfer::class,
                    'reference_id' => $inventoryTransfer->id,
                    'source_location_id' => $inventoryTransfer->source_location_id,
                    'destination_location_id' => $inventoryTransfer->destination_location_id,
                    'created_by_user_id' => $request->user()->id,
                    'notes' => "Transferencia {$inventoryTransfer->transfer_number} - Salida",
                ]);

                // ===== CREAR MOVIMIENTO DE ENTRADA (destino) =====
                InventoryMovement::create([
                    'product_id' => $destinationProduct->id,
                    'company_id' => $inventoryTransfer->company_id,
                    'branch_id' => $request->user()->branch_id,
                    'type' => 'transfer',
                    'quantity' => abs($quantityToTransfer), // Positivo para entrada
                    'unit_cost' => $destinationProduct->average_cost,
                    'stock_before' => $stockBeforeDestination,
                    'stock_after' => $stockAfterDestination,
                    'reference_type' => InventoryTransfer::class,
                    'reference_id' => $inventoryTransfer->id,
                    'source_location_id' => $inventoryTransfer->source_location_id,
                    'destination_location_id' => $inventoryTransfer->destination_location_id,
                    'created_by_user_id' => $request->user()->id,
                    'notes' => "Transferencia {$inventoryTransfer->transfer_number} - Entrada",
                ]);
            }

            $inventoryTransfer->update([
                'status' => 'completed',
                'completed_by_user_id' => $request->user()->id,
                'completed_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transferencia completada exitosamente',
                'data' => $inventoryTransfer->fresh()->load([
                    'sourceWarehouse',
                    'destinationWarehouse',
                    'sourceLocation',
                    'destinationLocation',
                    'items.product',
                ]),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
