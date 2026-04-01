<?php

namespace Database\Seeders;

use App\Models\AdjustmentReason;
use App\Models\Branch;
use App\Models\Company;
use App\Models\InventoryAdjustment;
use App\Models\InventoryMovement;
use App\Models\InventoryPurchase;
use App\Models\InventoryPurchaseItem;
use App\Models\InventoryTransfer;
use App\Models\InventoryTransferItem;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $companies = Company::all();

        foreach ($companies as $company) {
            $this->seedInventoryForCompany($company);
        }
    }

    private function seedInventoryForCompany(Company $company): void
    {
        // Skip if inventory data already exists for this company
        if (InventoryPurchase::withoutGlobalScopes()->where('company_id', $company->id)->exists()) {
            return;
        }

        $warehouses = Warehouse::where('company_id', $company->id)->get();
        $products = Product::where('company_id', $company->id)->get();
        $suppliers = Supplier::where('company_id', $company->id)->get();
        $users = User::where('company_id', $company->id)->get();
        $reasons = AdjustmentReason::where('company_id', $company->id)->get();

        if ($warehouses->isEmpty() || $products->isEmpty() || $suppliers->isEmpty() || $users->isEmpty()) {
            return;
        }

        $adminUser = $users->first();

        // Crear ordenes de compra de prueba
        $this->createPurchaseOrders($company, $warehouses, $products, $suppliers, $adminUser);

        // Crear transferencias de prueba (si hay mas de una bodega)
        if ($warehouses->count() > 1) {
            $this->createTransfers($company, $warehouses, $products, $adminUser);
        }

        // Crear ajustes de inventario de prueba
        $mainBranch = $warehouses->first()?->branch;
        if ($reasons->isNotEmpty() && $mainBranch) {
            $this->createAdjustments($company, $mainBranch, $products, $reasons, $adminUser);
        }
    }

    private function createPurchaseOrders(Company $company, $warehouses, $products, $suppliers, User $adminUser): void
    {
        $warehouse = $warehouses->first();
        $supplier = $suppliers->first();

        // Orden de compra en borrador
        $purchaseDraft = InventoryPurchase::create([
            'company_id' => $company->id,
            'branch_id' => $warehouse->branch_id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'status' => 'draft',
            'payment_status' => 'pending',
            'subtotal' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'expected_date' => now()->addDays(7),
            'notes' => 'Orden de compra de prueba en borrador',
            'created_by_user_id' => $adminUser->id,
        ]);

        $subtotal = 0;
        foreach ($products->take(3) as $product) {
            $quantity = rand(5, 20);
            $unitCost = $product->purchase_price;
            $itemSubtotal = $quantity * $unitCost;
            $subtotal += $itemSubtotal;

            InventoryPurchaseItem::create([
                'inventory_purchase_id' => $purchaseDraft->id,
                'product_id' => $product->id,
                'quantity_ordered' => $quantity,
                'quantity_received' => 0,
                'unit_cost' => $unitCost,
            ]);
        }

        $purchaseDraft->update([
            'subtotal' => $subtotal,
            'tax_amount' => $subtotal * 0.19,
            'total_amount' => $subtotal * 1.19,
        ]);

        // Orden de compra aprobada
        $purchaseApproved = InventoryPurchase::create([
            'company_id' => $company->id,
            'branch_id' => $warehouse->branch_id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $suppliers->count() > 1 ? $suppliers->skip(1)->first()->id : $supplier->id,
            'status' => 'approved',
            'payment_status' => 'pending',
            'subtotal' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'expected_date' => now()->addDays(3),
            'notes' => 'Orden de compra aprobada lista para recibir',
            'created_by_user_id' => $adminUser->id,
            'approved_by_user_id' => $adminUser->id,
        ]);

        $subtotal = 0;
        foreach ($products->skip(3)->take(2) as $product) {
            $quantity = rand(10, 30);
            $unitCost = $product->purchase_price;
            $itemSubtotal = $quantity * $unitCost;
            $subtotal += $itemSubtotal;

            InventoryPurchaseItem::create([
                'inventory_purchase_id' => $purchaseApproved->id,
                'product_id' => $product->id,
                'quantity_ordered' => $quantity,
                'quantity_received' => 0,
                'unit_cost' => $unitCost,
            ]);
        }

        $purchaseApproved->update([
            'subtotal' => $subtotal,
            'tax_amount' => $subtotal * 0.19,
            'total_amount' => $subtotal * 1.19,
        ]);

        // Orden de compra recibida (completada)
        $purchaseReceived = InventoryPurchase::create([
            'company_id' => $company->id,
            'branch_id' => $warehouse->branch_id,
            'warehouse_id' => $warehouse->id,
            'supplier_id' => $supplier->id,
            'status' => 'received',
            'payment_status' => 'paid',
            'subtotal' => 0,
            'tax_amount' => 0,
            'total_amount' => 0,
            'expected_date' => now()->subDays(5),
            'received_at' => now()->subDays(3),
            'notes' => 'Orden de compra recibida y pagada',
            'created_by_user_id' => $adminUser->id,
            'approved_by_user_id' => $adminUser->id,
            'received_by_user_id' => $adminUser->id,
        ]);

        $subtotal = 0;
        foreach ($products->skip(5)->take(3) as $product) {
            $quantity = rand(15, 40);
            $unitCost = $product->purchase_price;
            $itemSubtotal = $quantity * $unitCost;
            $subtotal += $itemSubtotal;

            InventoryPurchaseItem::create([
                'inventory_purchase_id' => $purchaseReceived->id,
                'product_id' => $product->id,
                'quantity_ordered' => $quantity,
                'quantity_received' => $quantity,
                'unit_cost' => $unitCost,
            ]);
        }

        $purchaseReceived->update([
            'subtotal' => $subtotal,
            'tax_amount' => $subtotal * 0.19,
            'total_amount' => $subtotal * 1.19,
        ]);
    }

    private function createTransfers(Company $company, $warehouses, $products, User $adminUser): void
    {
        $sourceWarehouse = $warehouses->first();
        $destinationWarehouse = $warehouses->skip(1)->first();

        // Transferencia solicitada
        $transferRequested = InventoryTransfer::create([
            'company_id' => $company->id,
            'source_warehouse_id' => $sourceWarehouse->id,
            'destination_warehouse_id' => $destinationWarehouse->id,
            'status' => 'requested',
            'notes' => 'Transferencia de prueba pendiente de aprobacion',
            'requested_by_user_id' => $adminUser->id,
            'requested_at' => now(),
        ]);

        foreach ($products->take(2) as $product) {
            InventoryTransferItem::create([
                'inventory_transfer_id' => $transferRequested->id,
                'product_id' => $product->id,
                'quantity_requested' => rand(3, 10),
                'quantity_transferred' => 0,
            ]);
        }

        // Transferencia aprobada
        $transferApproved = InventoryTransfer::create([
            'company_id' => $company->id,
            'source_warehouse_id' => $sourceWarehouse->id,
            'destination_warehouse_id' => $destinationWarehouse->id,
            'status' => 'approved',
            'notes' => 'Transferencia aprobada lista para envio',
            'requested_by_user_id' => $adminUser->id,
            'approved_by_user_id' => $adminUser->id,
            'requested_at' => now()->subDays(1),
            'approved_at' => now(),
        ]);

        foreach ($products->skip(2)->take(2) as $product) {
            InventoryTransferItem::create([
                'inventory_transfer_id' => $transferApproved->id,
                'product_id' => $product->id,
                'quantity_requested' => rand(5, 15),
                'quantity_transferred' => 0,
            ]);
        }

        // Transferencia completada
        $transferCompleted = InventoryTransfer::create([
            'company_id' => $company->id,
            'source_warehouse_id' => $destinationWarehouse->id,
            'destination_warehouse_id' => $sourceWarehouse->id,
            'status' => 'completed',
            'notes' => 'Transferencia completada exitosamente',
            'requested_by_user_id' => $adminUser->id,
            'approved_by_user_id' => $adminUser->id,
            'completed_by_user_id' => $adminUser->id,
            'requested_at' => now()->subDays(7),
            'approved_at' => now()->subDays(6),
            'completed_at' => now()->subDays(5),
        ]);

        foreach ($products->skip(4)->take(3) as $product) {
            $quantity = rand(8, 20);
            InventoryTransferItem::create([
                'inventory_transfer_id' => $transferCompleted->id,
                'product_id' => $product->id,
                'quantity_requested' => $quantity,
                'quantity_transferred' => $quantity,
            ]);
        }
    }

    private function createAdjustments(Company $company, Branch $branch, $products, $reasons, User $adminUser): void
    {
        // Ajuste pendiente de aprobacion
        $reasonDamage = $reasons->firstWhere('code', 'DAMAGE');
        if ($reasonDamage && $products->count() > 0) {
            $product = $products->first();
            InventoryAdjustment::create([
                'company_id' => $company->id,
                'branch_id' => $branch->id,
                'product_id' => $product->id,
                'adjustment_reason_id' => $reasonDamage->id,
                'quantity' => -3,
                'stock_before' => $product->current_stock,
                'stock_after' => $product->current_stock - 3,
                'unit_cost' => $product->average_cost,
                'financial_impact' => -3 * $product->average_cost,
                'status' => 'pending',
                'notes' => 'Productos dañados durante el almacenamiento',
                'created_by_user_id' => $adminUser->id,
            ]);
        }

        // Ajuste aprobado
        $reasonCount = $reasons->firstWhere('code', 'COUNT_ERROR');
        if ($reasonCount && $products->count() > 1) {
            $product = $products->skip(1)->first();
            InventoryAdjustment::create([
                'company_id' => $company->id,
                'branch_id' => $branch->id,
                'product_id' => $product->id,
                'adjustment_reason_id' => $reasonCount->id,
                'quantity' => 5,
                'stock_before' => $product->current_stock,
                'stock_after' => $product->current_stock + 5,
                'unit_cost' => $product->average_cost,
                'financial_impact' => 5 * $product->average_cost,
                'status' => 'approved',
                'notes' => 'Ajuste por diferencia en conteo fisico - producto encontrado',
                'created_by_user_id' => $adminUser->id,
                'approved_by_user_id' => $adminUser->id,
            ]);
        }

        // Ajuste auto-aprobado (por no requerir aprobacion)
        $reasonInitial = $reasons->firstWhere('code', 'INITIAL');
        if ($reasonInitial && $products->count() > 2) {
            $product = $products->skip(2)->first();
            InventoryAdjustment::create([
                'company_id' => $company->id,
                'branch_id' => $branch->id,
                'product_id' => $product->id,
                'adjustment_reason_id' => $reasonInitial->id,
                'quantity' => 100,
                'stock_before' => 0,
                'stock_after' => 100,
                'unit_cost' => $product->average_cost,
                'financial_impact' => 100 * $product->average_cost,
                'status' => 'auto_approved',
                'notes' => 'Carga de inventario inicial',
                'created_by_user_id' => $adminUser->id,
            ]);
        }

        // Ajuste rechazado
        $reasonLoss = $reasons->firstWhere('code', 'LOSS');
        if ($reasonLoss && $products->count() > 3) {
            $product = $products->skip(3)->first();
            InventoryAdjustment::create([
                'company_id' => $company->id,
                'branch_id' => $branch->id,
                'product_id' => $product->id,
                'adjustment_reason_id' => $reasonLoss->id,
                'quantity' => -20,
                'stock_before' => $product->current_stock,
                'stock_after' => $product->current_stock - 20,
                'unit_cost' => $product->average_cost,
                'financial_impact' => -20 * $product->average_cost,
                'status' => 'rejected',
                'notes' => 'Supuesta perdida de inventario',
                'rejection_reason' => 'Se requiere investigacion adicional antes de aprobar este ajuste',
                'created_by_user_id' => $adminUser->id,
                'approved_by_user_id' => $adminUser->id,
            ]);
        }
    }
}
