<?php

namespace App\Services;

use App\Models\InventoryPurchase;
use App\Models\InventoryPurchaseItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;

class AutoPurchaseOrderService
{
    /**
     * Verifica si se debe crear una compra automatica para el producto
     */
    public function shouldCreatePurchaseOrder(Product $product): bool
    {
        // 1. Debe ser rastreable
        if (!$product->is_trackable) {
            return false;
        }

        // 2. Debe tener compras automaticas habilitadas
        if (!$product->auto_purchase_enabled) {
            return false;
        }

        // 3. Debe tener min_stock definido
        if ($product->min_stock === null) {
            return false;
        }

        // 4. Debe estar por debajo del nivel minimo
        if ($product->current_stock > $product->min_stock) {
            return false;
        }

        // 5. Debe tener proveedor asignado
        if (!$product->supplier_id) {
            return false;
        }

        // 6. No debe tener una compra pendiente para este producto
        $hasPendingPurchase = InventoryPurchaseItem::whereHas('purchase', function ($query) {
            $query->whereIn('status', ['draft', 'pending', 'approved']);
        })
        ->where('product_id', $product->id)
        ->exists();

        if ($hasPendingPurchase) {
            return false;
        }

        return true;
    }

    /**
     * Crea una orden de compra automatica para un producto con stock bajo
     */
    public function createPurchaseOrderForProduct(Product $product, ?User $user = null): ?InventoryPurchase
    {
        if (!$this->shouldCreatePurchaseOrder($product)) {
            return null;
        }

        // Obtener todos los productos del mismo proveedor que necesiten compra
        $productsNeedingPurchase = $this->getProductsNeedingPurchaseForSupplier(
            $product->supplier_id,
            $product->company_id
        );

        if ($productsNeedingPurchase->isEmpty()) {
            return null;
        }

        return $this->createPurchaseOrder($productsNeedingPurchase, $product->company_id, $user);
    }

    /**
     * Obtiene todos los productos de un proveedor que necesitan compra
     */
    protected function getProductsNeedingPurchaseForSupplier(int $supplierId, int $companyId)
    {
        return Product::where('supplier_id', $supplierId)
            ->where('company_id', $companyId)
            ->where('is_trackable', true)
            ->where('auto_purchase_enabled', true)
            ->whereNotNull('min_stock')
            ->whereRaw('current_stock <= min_stock')
            ->whereDoesntHave('purchaseItems', function ($query) {
                $query->whereHas('purchase', function ($q) {
                    $q->whereIn('status', ['draft', 'pending', 'approved']);
                });
            })
            ->get();
    }

    /**
     * Crea la orden de compra con multiples productos
     */
    protected function createPurchaseOrder($products, int $companyId, ?User $user = null): InventoryPurchase
    {
        return DB::transaction(function () use ($products, $companyId, $user) {
            $firstProduct = $products->first();
            $supplier = $firstProduct->supplier;

            // Obtener bodega por defecto de la empresa
            $warehouse = Warehouse::where('company_id', $companyId)
                ->where('is_default', true)
                ->first();

            if (!$warehouse) {
                $warehouse = Warehouse::where('company_id', $companyId)->first();
            }

            // Crear la compra
            $purchase = InventoryPurchase::create([
                'company_id' => $companyId,
                'branch_id' => $warehouse?->branch_id,
                'warehouse_id' => $warehouse?->id,
                'supplier_id' => $supplier->id,
                'status' => 'draft',
                'payment_status' => 'pending',
                'notes' => 'Compra automatica generada por stock bajo',
                'created_by_user_id' => $user?->id,
                'expected_date' => now()->addDays(7),
            ]);

            // Crear items de compra
            foreach ($products as $product) {
                $quantity = $this->calculateSuggestedQuantity($product);

                InventoryPurchaseItem::create([
                    'inventory_purchase_id' => $purchase->id,
                    'product_id' => $product->id,
                    'quantity_ordered' => $quantity,
                    'quantity_received' => 0,
                    'unit_cost' => $product->purchase_price ?? 0,
                ]);
            }

            // Calcular totales
            $purchase->calculateTotals();

            return $purchase;
        });
    }

    /**
     * Calcula la cantidad sugerida de compra para un producto
     */
    protected function calculateSuggestedQuantity(Product $product): int
    {
        $currentStock = $product->current_stock ?? 0;
        $minStock = $product->min_stock ?? 0;

        // Si tiene max_stock, comprar hasta ese nivel
        if ($product->max_stock !== null) {
            return max($minStock, $product->max_stock - $currentStock);
        }

        // Si no, comprar 2x el stock minimo menos el stock actual
        return max($minStock, ($minStock * 2) - $currentStock);
    }

    /**
     * Verifica todos los productos y crea compras automaticas necesarias
     */
    public function checkAndCreateAutoPurchases(?int $companyId = null): array
    {
        $query = Product::where('is_trackable', true)
            ->where('auto_purchase_enabled', true)
            ->whereNotNull('min_stock')
            ->whereNotNull('supplier_id')
            ->whereRaw('current_stock <= min_stock');

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        $products = $query->get();

        // Agrupar productos por proveedor
        $groupedBySupplier = $products->groupBy('supplier_id');

        $createdPurchases = [];

        foreach ($groupedBySupplier as $supplierId => $supplierProducts) {
            // Verificar si ya existe una compra pendiente para este proveedor
            $companyId = $supplierProducts->first()->company_id;

            $existingPurchase = InventoryPurchase::where('supplier_id', $supplierId)
                ->where('company_id', $companyId)
                ->whereIn('status', ['draft', 'pending', 'approved'])
                ->first();

            if ($existingPurchase) {
                continue;
            }

            $purchase = $this->createPurchaseOrder($supplierProducts, $companyId, null);
            $createdPurchases[] = $purchase;
        }

        return $createdPurchases;
    }
}
