<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\AutoPurchaseOrderService;
use Illuminate\Database\Eloquent\Model;

class ProductObserver extends BaseObserver
{
    protected function getResourceName(): string
    {
        return 'Producto';
    }

    protected function getCreatedDescription($model): string
    {
        return "Producto creado: {$model->name} (SKU: {$model->sku})";
    }

    protected function getUpdatedDescription($model): string
    {
        return "Producto actualizado: {$model->name} (SKU: {$model->sku})";
    }

    protected function getDeletedDescription($model): string
    {
        return "Producto eliminado: {$model->name} (SKU: {$model->sku})";
    }

    /**
     * Handle the Product "updated" event.
     */
    public function updated(Model $model): void
    {
        parent::updated($model);

        // Solo procesar si es un Product
        if (!$model instanceof Product) {
            return;
        }

        // Si el stock cambio, verificar si necesita compra automatica
        if ($model->wasChanged('current_stock')) {
            $this->checkAndCreateAutoPurchaseOrder($model);
        }
    }

    /**
     * Verifica y crea una orden de compra automatica si es necesario
     */
    protected function checkAndCreateAutoPurchaseOrder(Product $product): void
    {
        // Solo si el stock bajo del minimo
        if (!$product->needsRestock()) {
            return;
        }

        // Solo si tiene compras automaticas habilitadas
        if (!$product->auto_purchase_enabled) {
            return;
        }

        // Solo si tiene proveedor asignado
        if (!$product->supplier_id) {
            return;
        }

        try {
            $autoPurchaseService = app(AutoPurchaseOrderService::class);
            $autoPurchaseService->createPurchaseOrderForProduct($product, auth()->user());
        } catch (\Exception $e) {
            // Log el error pero no interrumpir el flujo
            \Log::warning("Error al crear compra automatica para producto {$product->id}: " . $e->getMessage());
        }
    }
}
