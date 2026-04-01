<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderAttachment;
use App\Models\ServiceOrderItem;
use App\Models\ServiceOrderStatusHistory;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ServiceOrderController extends Controller
{
    /**
     * Lista todas las ordenes de servicio con filtros
     */
    public function index(Request $request): JsonResponse
    {
        $query = ServiceOrder::with(['client', 'assignedTo', 'createdBy']);

        // Filtrar por empresa si no es super admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        } elseif ($request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        // Filtro de busqueda por titulo u order_number
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('order_number', 'like', "%{$search}%");
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->priority) {
            $query->where('priority', $request->priority);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->assigned_to) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $orders = $query
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $orders,
            'message' => 'Ordenes de servicio obtenidas exitosamente',
        ]);
    }

    /**
     * Crear una nueva orden de servicio
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'nullable|string|in:repair,maintenance,installation,inspection,custom',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'client_id' => 'nullable|exists:users,id',
            'assigned_to' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'equipment_info' => 'nullable|string',
            'scheduled_date' => 'nullable|date',
            'scheduled_time' => 'nullable|string',
            'estimated_duration' => 'nullable|integer|min:1',
            'items' => 'nullable|array',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.type' => 'nullable|string|in:service,product,labor',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            $user = $request->user();

            $order = ServiceOrder::create([
                'company_id' => $user->company_id,
                'branch_id' => $user->branch_id,
                'created_by' => $user->id,
                'order_number' => ServiceOrder::generateOrderNumber($user->company_id),
                'title' => $validated['title'],
                'type' => $validated['type'] ?? 'repair',
                'priority' => $validated['priority'] ?? 'normal',
                'status' => 'pending',
                'client_id' => $validated['client_id'] ?? null,
                'assigned_to' => $validated['assigned_to'] ?? null,
                'description' => $validated['description'] ?? null,
                'equipment_info' => $validated['equipment_info'] ?? null,
                'scheduled_date' => $validated['scheduled_date'] ?? null,
                'scheduled_time' => $validated['scheduled_time'] ?? null,
                'estimated_duration' => $validated['estimated_duration'] ?? null,
                'subtotal' => 0,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => 0,
            ]);

            // Crear items si se proporcionan
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $itemData) {
                    $quantity = $itemData['quantity'];
                    $unitPrice = $itemData['unit_price'];
                    $taxRate = $itemData['tax_rate'] ?? 0;
                    $subtotal = $quantity * $unitPrice;
                    $taxAmount = $subtotal * ($taxRate / 100);
                    $total = $subtotal + $taxAmount;

                    ServiceOrderItem::create([
                        'service_order_id' => $order->id,
                        'description' => $itemData['description'],
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'type' => $itemData['type'] ?? 'service',
                        'service_id' => $itemData['service_id'] ?? null,
                        'product_id' => $itemData['product_id'] ?? null,
                        'tax_rate' => $taxRate,
                        'discount_amount' => 0,
                        'subtotal' => $subtotal,
                        'tax_amount' => $taxAmount,
                        'total' => $total,
                    ]);
                }

                $order->recalculateTotals();
            }

            // Crear entrada de historial de estado (null -> pending)
            ServiceOrderStatusHistory::create([
                'service_order_id' => $order->id,
                'changed_by' => $user->id,
                'from_status' => null,
                'to_status' => 'pending',
                'notes' => 'Orden de servicio creada',
            ]);

            DB::commit();

            $order->load(['client', 'assignedTo', 'createdBy', 'items']);

            return response()->json([
                'success' => true,
                'data' => $order,
                'message' => 'Orden de servicio creada exitosamente',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al crear orden de servicio: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al crear la orden de servicio',
            ], 500);
        }
    }

    /**
     * Mostrar una orden de servicio con todas sus relaciones
     */
    public function show(ServiceOrder $serviceOrder): JsonResponse
    {
        $serviceOrder->load([
            'items.service',
            'items.product',
            'attachments.uploadedBy',
            'statusHistory.changedBy',
            'client',
            'assignedTo',
            'createdBy',
            'sale',
        ]);

        return response()->json([
            'success' => true,
            'data' => $serviceOrder,
            'message' => 'Orden de servicio obtenida exitosamente',
        ]);
    }

    /**
     * Actualizar una orden de servicio (solo si esta pendiente o en progreso)
     */
    public function update(Request $request, ServiceOrder $serviceOrder): JsonResponse
    {
        if (!in_array($serviceOrder->status, ['pending', 'in_progress'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Solo se pueden editar ordenes en estado pendiente o en progreso',
            ], 422);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'type' => 'nullable|string|in:repair,maintenance,installation,inspection,custom',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'client_id' => 'nullable|exists:users,id',
            'assigned_to' => 'nullable|exists:users,id',
            'description' => 'nullable|string',
            'equipment_info' => 'nullable|string',
            'scheduled_date' => 'nullable|date',
            'scheduled_time' => 'nullable|string',
            'estimated_duration' => 'nullable|integer|min:1',
            'diagnosis' => 'nullable|string',
            'resolution_notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.type' => 'nullable|string|in:service,product,labor',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            // Actualizar campos de la orden
            $orderFields = collect($validated)->except('items')->toArray();
            $serviceOrder->update($orderFields);

            // Reemplazar items si se proporcionan
            if (array_key_exists('items', $validated)) {
                // Eliminar items existentes
                $serviceOrder->items()->delete();

                if (!empty($validated['items'])) {
                    foreach ($validated['items'] as $itemData) {
                        $quantity = $itemData['quantity'];
                        $unitPrice = $itemData['unit_price'];
                        $taxRate = $itemData['tax_rate'] ?? 0;
                        $subtotal = $quantity * $unitPrice;
                        $taxAmount = $subtotal * ($taxRate / 100);
                        $total = $subtotal + $taxAmount;

                        ServiceOrderItem::create([
                            'service_order_id' => $serviceOrder->id,
                            'description' => $itemData['description'],
                            'quantity' => $quantity,
                            'unit_price' => $unitPrice,
                            'type' => $itemData['type'] ?? 'service',
                            'service_id' => $itemData['service_id'] ?? null,
                            'product_id' => $itemData['product_id'] ?? null,
                            'tax_rate' => $taxRate,
                            'discount_amount' => 0,
                            'subtotal' => $subtotal,
                            'tax_amount' => $taxAmount,
                            'total' => $total,
                        ]);
                    }
                }

                $serviceOrder->recalculateTotals();
            }

            DB::commit();

            $serviceOrder->load(['client', 'assignedTo', 'createdBy', 'items']);

            return response()->json([
                'success' => true,
                'data' => $serviceOrder,
                'message' => 'Orden de servicio actualizada exitosamente',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar orden de servicio: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al actualizar la orden de servicio',
            ], 500);
        }
    }

    /**
     * Eliminar (soft delete) una orden de servicio (solo si esta pendiente)
     */
    public function destroy(ServiceOrder $serviceOrder): JsonResponse
    {
        if ($serviceOrder->status !== 'pending') {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Solo se pueden eliminar ordenes en estado pendiente',
            ], 422);
        }

        $serviceOrder->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Orden de servicio eliminada exitosamente',
        ]);
    }

    /**
     * Actualizar el estado de una orden de servicio con validacion de transiciones
     */
    public function updateStatus(Request $request, ServiceOrder $serviceOrder): JsonResponse
    {
        $validTransitions = [
            'pending' => ['in_progress', 'cancelled'],
            'in_progress' => ['on_hold', 'completed', 'cancelled'],
            'on_hold' => ['in_progress', 'cancelled'],
            'completed' => ['invoiced'],
        ];

        $currentStatus = $serviceOrder->status;
        $allowedStatuses = $validTransitions[$currentStatus] ?? [];

        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', $allowedStatuses),
            'notes' => 'nullable|string',
        ]);

        if (empty($allowedStatuses)) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => "No se puede cambiar el estado desde '{$currentStatus}'",
            ], 422);
        }

        try {
            DB::beginTransaction();

            $newStatus = $validated['status'];

            // Establecer timestamps segun la transicion
            if ($newStatus === 'in_progress' && !$serviceOrder->started_at) {
                $serviceOrder->started_at = now();
            }

            if ($newStatus === 'completed') {
                $serviceOrder->completed_at = now();
            }

            $serviceOrder->status = $newStatus;
            $serviceOrder->save();

            // Crear entrada de historial
            ServiceOrderStatusHistory::create([
                'service_order_id' => $serviceOrder->id,
                'changed_by' => $request->user()->id,
                'from_status' => $currentStatus,
                'to_status' => $newStatus,
                'notes' => $validated['notes'] ?? null,
            ]);

            DB::commit();

            $serviceOrder->load(['client', 'assignedTo', 'createdBy', 'statusHistory.changedBy']);

            return response()->json([
                'success' => true,
                'data' => $serviceOrder,
                'message' => 'Estado de la orden actualizado exitosamente',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar estado de orden: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al actualizar el estado de la orden',
            ], 500);
        }
    }

    /**
     * Asignar una orden de servicio a un usuario
     */
    public function assignTo(Request $request, ServiceOrder $serviceOrder): JsonResponse
    {
        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id',
        ]);

        $serviceOrder->update([
            'assigned_to' => $validated['assigned_to'],
        ]);

        $serviceOrder->load(['client', 'assignedTo', 'createdBy']);

        return response()->json([
            'success' => true,
            'data' => $serviceOrder,
            'message' => 'Orden de servicio asignada exitosamente',
        ]);
    }

    /**
     * Convertir una orden de servicio completada en una factura (Sale)
     */
    public function convertToInvoice(Request $request, ServiceOrder $serviceOrder): JsonResponse
    {
        if ($serviceOrder->status !== 'completed') {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Solo se pueden facturar ordenes en estado completado',
            ], 422);
        }

        if ($serviceOrder->sale_id) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Esta orden ya fue facturada',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $user = $request->user();

            // Crear la venta a partir de la orden de servicio
            $sale = Sale::create([
                'company_id' => $serviceOrder->company_id,
                'branch_id' => $serviceOrder->branch_id,
                'client_id' => $serviceOrder->client_id ?? $user->id,
                'seller_id' => $user->id,
                'invoice_number' => Sale::generateInvoiceNumber((int) $serviceOrder->company_id, 'pos'),
                'type' => 'pos',
                'status' => 'completed',
                'payment_status' => 'pending',
                'invoice_date' => now()->toDateString(),
                'subtotal' => $serviceOrder->subtotal,
                'discount_amount' => $serviceOrder->discount_amount,
                'tax_amount' => $serviceOrder->tax_amount,
                'retention_amount' => 0,
                'total_amount' => $serviceOrder->total_amount,
                'paid_amount' => 0,
                'balance' => $serviceOrder->total_amount,
                'notes' => "Generada desde orden de servicio #{$serviceOrder->order_number}",
                'created_by_user_id' => $user->id,
            ]);

            // Copiar items de la orden de servicio a items de venta
            $serviceOrder->load('items');
            foreach ($serviceOrder->items as $item) {
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item->product_id,
                    'service_id' => $item->service_id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount_percentage' => 0,
                    'discount_amount' => $item->discount_amount ?? 0,
                    'tax_rate' => $item->tax_rate,
                    'tax_amount' => $item->tax_amount,
                    'subtotal' => $item->subtotal,
                    'total' => $item->total,
                ]);

                // Descontar stock si es producto de inventario
                if ($item->product_id) {
                    $product = \App\Models\Product::find($item->product_id);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;
                        $product->decrement('current_stock', $item->quantity);
                        \App\Models\InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $user->branch_id,
                            'type' => 'sale',
                            'quantity' => -$item->quantity,
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore - $item->quantity,
                            'reference_type' => Sale::class,
                            'reference_id' => $sale->id,
                            'created_by_user_id' => $user->id,
                            'notes' => "Orden de servicio {$serviceOrder->order_number}",
                        ]);
                    }
                }
            }

            // Vincular la venta a la orden y cambiar estado
            $serviceOrder->sale_id = $sale->id;
            $serviceOrder->status = 'invoiced';
            $serviceOrder->save();

            // Crear entrada de historial de estado
            ServiceOrderStatusHistory::create([
                'service_order_id' => $serviceOrder->id,
                'changed_by' => $user->id,
                'from_status' => 'completed',
                'to_status' => 'invoiced',
                'notes' => "Factura #{$sale->invoice_number} generada",
            ]);

            DB::commit();

            $sale->load(['client', 'items']);

            return response()->json([
                'success' => true,
                'data' => $sale,
                'message' => 'Factura generada exitosamente desde la orden de servicio',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al convertir orden de servicio a factura: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al generar la factura',
            ], 500);
        }
    }

    /**
     * Agregar un adjunto a una orden de servicio
     */
    public function addAttachment(Request $request, ServiceOrder $serviceOrder): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240',
            'category' => 'nullable|string|in:photo,document,diagnostic,other',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $user = $request->user();
            $company = $user->company;
            $file = $request->file('file');

            $storageService = app(CompanyFileStorageService::class);
            $fileUrl = $storageService->uploadServiceOrderAttachment($company, $file);

            if (!$fileUrl) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Error al subir el archivo',
                ], 500);
            }

            $attachment = ServiceOrderAttachment::create([
                'service_order_id' => $serviceOrder->id,
                'uploaded_by' => $user->id,
                'file_url' => $fileUrl,
                'file_name' => $file->getClientOriginalName(),
                'file_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'category' => $request->category ?? 'other',
                'notes' => $request->notes,
            ]);

            $attachment->load('uploadedBy');

            return response()->json([
                'success' => true,
                'data' => $attachment,
                'message' => 'Adjunto agregado exitosamente',
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error al agregar adjunto a orden de servicio: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al agregar el adjunto',
            ], 500);
        }
    }

    /**
     * Eliminar un adjunto de una orden de servicio
     */
    public function removeAttachment(ServiceOrderAttachment $attachment): JsonResponse
    {
        try {
            $storageService = app(CompanyFileStorageService::class);
            $storageService->deleteFileFromUrl($attachment->file_url);

            $attachment->delete();

            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Adjunto eliminado exitosamente',
            ]);
        } catch (\Exception $e) {
            Log::error('Error al eliminar adjunto de orden de servicio: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Error al eliminar el adjunto',
            ], 500);
        }
    }
}
