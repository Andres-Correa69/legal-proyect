<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryMovementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $movements = InventoryMovement::with([
                'product',
                'createdBy',
                'sourceLocation',
                'destinationLocation',
            ])
            ->when($request->product_id, function ($query, $productId) {
                $query->where('product_id', $productId);
            })
            ->when($request->type, function ($query, $type) {
                $query->where('type', $type);
            })
            ->when($request->reference_type, function ($query, $referenceType) {
                $query->where('reference_type', 'like', "%{$referenceType}%");
            })
            ->when($request->date_from, function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json($movements);
    }

    public function show(Request $request, InventoryMovement $inventoryMovement): JsonResponse
    {
        $inventoryMovement->load([
            'product',
            'createdBy',
            'sourceLocation',
            'destinationLocation',
            'reference',
        ]);

        // Load extra relations on the reference depending on its type
        if ($inventoryMovement->reference) {
            $ref = $inventoryMovement->reference;
            if ($ref instanceof \App\Models\Sale) {
                $ref->load(['client', 'items.product']);
            } elseif ($ref instanceof \App\Models\InventoryPurchase) {
                $ref->load(['supplier', 'items.product']);
            } elseif ($ref instanceof \App\Models\InventoryTransfer) {
                $ref->load(['items.product', 'sourceWarehouse', 'destinationWarehouse']);
            }
        }

        return response()->json($inventoryMovement);
    }
}
