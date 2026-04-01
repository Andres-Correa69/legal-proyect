<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ServiceProduct;
use App\Models\InventoryMovement;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\PaymentMethod;
use App\Mail\SaleInvoiceMail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SaleController extends Controller
{
    /**
     * Lista todas las ventas
     */
    public function index(Request $request): JsonResponse
    {
        $query = Sale::with(['client', 'seller', 'branch', 'createdBy', 'items', 'payments']);

        // Filtrar por empresa si no es super admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        } elseif ($request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        // Filtros
        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->date_from) {
            $query->whereDate('invoice_date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('invoice_date', '<=', $request->date_to);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('client', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('document_id', 'like', "%{$search}%");
                    });
            });
        }

        $sales = $query
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($sales);
    }

    /**
     * Crear una nueva venta
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'type' => 'required|in:pos,electronic,account,credit',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'retentions' => 'nullable|array',
            'price_list_id' => 'nullable|integer|exists:price_lists,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_note' => 'nullable|string|max:255',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'payments' => 'required|array|min:1',
            'payments.*.cash_register_id' => 'required|exists:cash_registers,id',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0',
            'payments.*.date' => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            // Calcular totales
            $subtotal = 0;
            $totalDiscount = 0;
            $totalTax = 0;

            foreach ($validated['items'] as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discountAmount = $itemSubtotal * (($item['discount_percentage'] ?? 0) / 100);
                $afterDiscount = $itemSubtotal - $discountAmount;
                $taxRate = $item['tax_rate'] ?? 0;
                $taxAmount = $afterDiscount * ($taxRate / 100);

                $subtotal += $itemSubtotal;
                $totalDiscount += $discountAmount;
                $totalTax += $taxAmount;
            }

            $totalBeforeRetentions = $subtotal - $totalDiscount + $totalTax;

            // Calcular retenciones
            $retentionAmount = 0;
            if (!empty($validated['retentions'])) {
                foreach ($validated['retentions'] as $retention) {
                    $retentionAmount += $retention['value'] ?? 0;
                }
            }

            $totalAmount = $totalBeforeRetentions - $retentionAmount;

            // Calcular total pagado
            $paidAmount = array_sum(array_column($validated['payments'], 'amount'));
            $balance = $totalAmount - $paidAmount;

            // Determinar estado de pago
            $paymentStatus = 'pending';
            if ($paidAmount >= $totalAmount) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            // Validar fecha de vencimiento cuando el pago es parcial
            if ($paymentStatus !== 'paid' && empty($validated['due_date'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe seleccionar una fecha de vencimiento cuando el pago no es completo',
                ], 422);
            }

            // Calcular comision
            $commissionPercentage = $validated['commission_percentage'] ?? 0;
            $commissionAmount = $totalAmount * ($commissionPercentage / 100);

            // Crear la venta
            $sale = Sale::create([
                'company_id' => $request->user()->company_id,
                'branch_id' => $request->user()->branch_id,
                'client_id' => $validated['client_id'],
                'seller_id' => $validated['seller_id'] ?? null,
                'invoice_number' => Sale::generateInvoiceNumber($request->user()->company_id, $validated['type']),
                'type' => $validated['type'],
                'status' => 'completed',
                'payment_status' => $paymentStatus,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'retention_amount' => $retentionAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'balance' => max(0, $balance),
                'commission_percentage' => $commissionPercentage,
                'commission_amount' => $commissionAmount,
                'notes' => $validated['notes'] ?? null,
                'retentions' => $validated['retentions'] ?? null,
                'created_by_user_id' => $request->user()->id,
                'price_list_id' => $validated['price_list_id'] ?? null,
            ]);

            // Crear items
            foreach ($validated['items'] as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discountPercentage = $item['discount_percentage'] ?? 0;
                $discountAmount = $itemSubtotal * ($discountPercentage / 100);
                $afterDiscount = $itemSubtotal - $discountAmount;
                $taxRate = $item['tax_rate'] ?? null;
                $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
                $total = $afterDiscount + $taxAmount;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'] ?? null,
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $discountAmount,
                    'discount_note' => $item['discount_note'] ?? null,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'subtotal' => $itemSubtotal,
                    'total' => $total,
                ]);

                // Descontar del inventario si es un producto con seguimiento
                if ($item['product_id']) {
                    $product = Product::find($item['product_id']);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;
                        $product->decrement('current_stock', $item['quantity']);
                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $request->user()->branch_id,
                            'type' => 'sale',
                            'quantity' => -$item['quantity'],
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore - $item['quantity'],
                            'reference_type' => Sale::class,
                            'reference_id' => $sale->id,
                            'created_by_user_id' => $request->user()->id,
                            'notes' => 'Venta ' . $sale->invoice_number,
                        ]);
                    }
                }

                // Expandir productos incluidos del servicio (para inventario y COGS)
                if (!empty($item['service_id'])) {
                    $serviceProducts = ServiceProduct::where('service_id', $item['service_id'])
                        ->where('is_included', true)
                        ->with('product')
                        ->get();

                    foreach ($serviceProducts as $sp) {
                        $spProduct = $sp->product;
                        if (!$spProduct) continue;

                        $totalQty = $item['quantity'] * $sp->quantity;

                        // Crear SaleItem con precio 0 para tracking de COGS
                        SaleItem::create([
                            'sale_id' => $sale->id,
                            'product_id' => $spProduct->id,
                            'service_id' => $item['service_id'],
                            'from_service_product' => true,
                            'description' => $spProduct->name . ' (incluido en ' . $item['description'] . ')',
                            'quantity' => $totalQty,
                            'unit_price' => 0,
                            'discount_percentage' => 0,
                            'discount_amount' => 0,
                            'tax_rate' => null,
                            'tax_amount' => 0,
                            'subtotal' => 0,
                            'total' => 0,
                        ]);

                        // Descontar inventario del producto incluido
                        if ($spProduct->is_trackable) {
                            $stockBefore = $spProduct->current_stock;
                            $spProduct->decrement('current_stock', $totalQty);
                            InventoryMovement::create([
                                'product_id' => $spProduct->id,
                                'company_id' => $spProduct->company_id,
                                'branch_id' => $request->user()->branch_id,
                                'type' => 'sale',
                                'quantity' => -$totalQty,
                                'unit_cost' => $spProduct->purchase_price ?? 0,
                                'stock_before' => $stockBefore,
                                'stock_after' => $stockBefore - $totalQty,
                                'reference_type' => Sale::class,
                                'reference_id' => $sale->id,
                                'created_by_user_id' => $request->user()->id,
                                'notes' => 'Venta ' . $sale->invoice_number . ' (servicio)',
                            ]);
                        }
                    }
                }
            }

            // Crear pagos y actualizar cajas
            foreach ($validated['payments'] as $paymentData) {
                $cashRegister = CashRegister::findOrFail($paymentData['cash_register_id']);
                $paymentMethod = PaymentMethod::findOrFail($paymentData['payment_method_id']);

                // Validar que la caja esté activa
                if (!$cashRegister->is_active) {
                    throw new \Exception('La caja "' . $cashRegister->name . '" no está activa');
                }

                // Obtener sesión activa si es caja menor
                $sessionId = null;
                if ($cashRegister->type === 'minor') {
                    $session = CashRegisterSession::withoutGlobalScopes()
                        ->where('cash_register_id', $cashRegister->id)
                        ->whereNull('closed_at')
                        ->first();
                    if (!$session) {
                        throw new \Exception('La caja menor "' . $cashRegister->name . '" no tiene una sesión abierta');
                    }
                    $sessionId = $session->id;
                }

                // Crear el pago de la venta (SalePayment)
                SalePayment::create([
                    'sale_id' => $sale->id,
                    'cash_register_id' => $cashRegister->id,
                    'cash_register_session_id' => $sessionId,
                    'payment_method_id' => $paymentMethod->id,
                    'payment_method_name' => $paymentMethod->name,
                    'amount' => $paymentData['amount'],
                    'payment_date' => $paymentData['date'],
                    'created_by_user_id' => $request->user()->id,
                ]);

                // También crear un registro en la tabla Payment para visualización en el módulo de pagos
                Payment::create([
                    'company_id' => $sale->company_id,
                    'branch_id' => $sale->branch_id ?? null,
                    'cash_register_id' => $cashRegister->id,
                    'cash_register_session_id' => $sessionId,
                    'payment_method_id' => $paymentMethod->id,
                    'type' => 'income',
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                    'payment_number' => Payment::generatePaymentNumber(),
                    'amount' => $paymentData['amount'],
                    'payment_date' => now(),
                    'is_partial' => $paidAmount < $totalAmount,
                    'is_initial_payment' => true,
                    'status' => 'completed',
                    'notes' => 'Pago de venta ' . $sale->invoice_number,
                    'created_by_user_id' => $request->user()->id,
                ]);

                // Actualizar saldo de la caja (SUMA para ingresos)
                $cashRegister->addToBalance($paymentData['amount']);

                // Actualizar totales de la sesión si existe
                if ($sessionId) {
                    $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
                    if ($session) {
                        $session->total_income += $paymentData['amount'];
                        $session->save();
                    }
                }
            }

            DB::commit();

            return response()->json(
                $sale->load(['client', 'seller', 'branch', 'items', 'payments', 'createdBy']),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear la venta: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Mostrar una venta especifica
     */
    public function show(Request $request, Sale $sale): JsonResponse
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($sale->load(['client', 'seller', 'branch', 'items.product', 'payments.cashRegister', 'createdBy', 'priceList', 'electronicInvoices.creditNote', 'electronicInvoices.debitNote', 'internalNotes.items.product', 'internalNotes.items.service', 'internalNotes.createdBy']));
    }

    /**
     * Agregar un pago/abono a una venta
     */
    public function addPayment(Request $request, Sale $sale): JsonResponse
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->payment_status === 'paid') {
            return response()->json(['message' => 'Esta venta ya esta completamente pagada'], 400);
        }

        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'payment_method_id' => 'required|exists:payment_methods,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Verificar que el monto no exceda el saldo
        if ($validated['amount'] > $sale->balance) {
            return response()->json([
                'message' => 'El monto del pago excede el saldo pendiente',
                'balance' => $sale->balance
            ], 400);
        }

        try {
            DB::beginTransaction();

            $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
            $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

            // Validar que la caja esté activa
            if (!$cashRegister->is_active) {
                throw new \Exception('La caja no está activa');
            }

            // Obtener sesión activa si es caja menor
            $sessionId = null;
            if ($cashRegister->type === 'minor') {
                $session = CashRegisterSession::withoutGlobalScopes()
                    ->where('cash_register_id', $cashRegister->id)
                    ->whereNull('closed_at')
                    ->first();
                if (!$session) {
                    throw new \Exception('La caja menor no tiene una sesión abierta');
                }
                $sessionId = $session->id;
            }

            $salePayment = SalePayment::create([
                'sale_id' => $sale->id,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethod->id,
                'payment_method_name' => $paymentMethod->name,
                'amount' => $validated['amount'],
                'payment_date' => $validated['payment_date'],
                'reference' => $validated['reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by_user_id' => $request->user()->id,
            ]);

            // También crear un registro en la tabla Payment para visualización en el módulo de pagos
            Payment::create([
                'company_id' => $sale->company_id,
                'branch_id' => $sale->branch_id ?? null,
                'cash_register_id' => $cashRegister->id,
                'cash_register_session_id' => $sessionId,
                'payment_method_id' => $paymentMethod->id,
                'type' => 'income',
                'reference_type' => Sale::class,
                'reference_id' => $sale->id,
                'payment_number' => Payment::generatePaymentNumber(),
                'amount' => $validated['amount'],
                'payment_date' => now(),
                'is_partial' => $validated['amount'] < $sale->balance,
                'status' => 'completed',
                'notes' => $validated['notes'] ?? ('Pago de venta ' . $sale->invoice_number),
                'created_by_user_id' => $request->user()->id,
            ]);

            // Actualizar saldo de la caja (SUMA para ingresos)
            $cashRegister->addToBalance($validated['amount']);

            // Actualizar totales de la sesión si existe
            if ($sessionId) {
                $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
                if ($session) {
                    $session->total_income += $validated['amount'];
                    $session->save();
                }
            }

            // Actualizar estado de pago
            $sale->updatePaymentStatus();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 400);
        }

        return response()->json([
            'payment' => $salePayment,
            'sale' => $sale->fresh()->load(['client', 'seller', 'branch', 'items', 'payments', 'createdBy'])
        ], 201);
    }

    /**
     * Actualizar items de una venta (para nota débito)
     */
    public function updateItems(Request $request, Sale $sale): JsonResponse
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->status === 'cancelled') {
            return response()->json(['message' => 'No se puede editar una venta cancelada'], 400);
        }

        // Verificar que tiene FE activa sin nota débito
        $activeEI = $sale->electronicInvoices()
            ->whereDoesntHave('creditNote')
            ->first();

        if (!$activeEI) {
            return response()->json(['message' => 'La venta debe tener una factura electrónica activa para editar items'], 400);
        }

        if ($activeEI->debitNote) {
            return response()->json(['message' => 'Ya existe una nota débito para esta factura. No se pueden editar los items'], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer|exists:sale_items,id',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            $existingItems = $sale->items()->get()->keyBy('id');
            $incomingExistingIds = collect($validated['items'])
                ->pluck('id')
                ->filter()
                ->toArray();

            // Verificar que no se eliminaron items originales
            foreach ($existingItems as $existingItem) {
                if (!in_array($existingItem->id, $incomingExistingIds)) {
                    throw new \Exception('No se pueden eliminar items de la factura original. Item: ' . $existingItem->description);
                }
            }

            $subtotal = 0;
            $totalDiscount = 0;
            $totalTax = 0;

            foreach ($validated['items'] as $itemData) {
                $itemSubtotal = $itemData['quantity'] * $itemData['unit_price'];
                $discountPercentage = $itemData['discount_percentage'] ?? 0;
                $discountAmount = $itemSubtotal * ($discountPercentage / 100);
                $afterDiscount = $itemSubtotal - $discountAmount;
                $taxRate = $itemData['tax_rate'] ?? null;
                $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
                $total = $afterDiscount + $taxAmount;

                $subtotal += $itemSubtotal;
                $totalDiscount += $discountAmount;
                $totalTax += $taxAmount;

                if (!empty($itemData['id'])) {
                    // Actualizar item existente
                    $existing = $existingItems->get($itemData['id']);
                    if (!$existing) {
                        throw new \Exception('Item no encontrado: ' . $itemData['id']);
                    }

                    // Validar restricciones: solo se puede aumentar valor
                    if ($itemData['quantity'] < $existing->quantity) {
                        throw new \Exception('No se puede disminuir la cantidad del item: ' . $existing->description);
                    }
                    if ($itemData['unit_price'] < (float) $existing->unit_price) {
                        throw new \Exception('No se puede disminuir el precio del item: ' . $existing->description);
                    }
                    if ($discountPercentage > (float) $existing->discount_percentage) {
                        throw new \Exception('No se puede aumentar el descuento del item: ' . $existing->description);
                    }

                    // Ajustar inventario si la cantidad aumentó
                    $quantityDiff = $itemData['quantity'] - $existing->quantity;
                    if ($quantityDiff > 0 && $existing->product_id) {
                        $product = Product::find($existing->product_id);
                        if ($product && $product->is_trackable) {
                            $stockBefore = $product->current_stock;
                            $product->decrement('current_stock', $quantityDiff);
                            InventoryMovement::create([
                                'product_id' => $product->id,
                                'company_id' => $product->company_id,
                                'branch_id' => $request->user()->branch_id,
                                'type' => 'sale',
                                'quantity' => -$quantityDiff,
                                'unit_cost' => $product->purchase_price ?? 0,
                                'stock_before' => $stockBefore,
                                'stock_after' => $stockBefore - $quantityDiff,
                                'reference_type' => Sale::class,
                                'reference_id' => $sale->id,
                                'created_by_user_id' => $request->user()->id,
                                'notes' => 'Nota débito ' . $sale->invoice_number,
                            ]);
                        }
                    }

                    $existing->update([
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'discount_percentage' => $discountPercentage,
                        'discount_amount' => $discountAmount,
                        'tax_rate' => $taxRate,
                        'tax_amount' => $taxAmount,
                        'subtotal' => $itemSubtotal,
                        'total' => $total,
                    ]);
                } else {
                    // Crear nuevo item
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $itemData['product_id'] ?? null,
                        'service_id' => $itemData['service_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'discount_percentage' => $discountPercentage,
                        'discount_amount' => $discountAmount,
                        'tax_rate' => $taxRate,
                        'tax_amount' => $taxAmount,
                        'subtotal' => $itemSubtotal,
                        'total' => $total,
                    ]);

                    // Descontar inventario si es producto trackable
                    if (!empty($itemData['product_id'])) {
                        $product = Product::find($itemData['product_id']);
                        if ($product && $product->is_trackable) {
                            $stockBefore = $product->current_stock;
                            $product->decrement('current_stock', $itemData['quantity']);
                            InventoryMovement::create([
                                'product_id' => $product->id,
                                'company_id' => $product->company_id,
                                'branch_id' => $request->user()->branch_id,
                                'type' => 'sale',
                                'quantity' => -$itemData['quantity'],
                                'unit_cost' => $product->purchase_price ?? 0,
                                'stock_before' => $stockBefore,
                                'stock_after' => $stockBefore - $itemData['quantity'],
                                'reference_type' => Sale::class,
                                'reference_id' => $sale->id,
                                'created_by_user_id' => $request->user()->id,
                                'notes' => 'Nota débito ' . $sale->invoice_number,
                            ]);
                        }
                    }
                }
            }

            // Recalcular totales de la venta
            $retentionAmount = (float) $sale->retention_amount;
            $totalAmount = $subtotal - $totalDiscount + $totalTax - $retentionAmount;
            $paidAmount = (float) $sale->paid_amount;
            $balance = max(0, $totalAmount - $paidAmount);

            $paymentStatus = 'pending';
            if ($paidAmount >= $totalAmount) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            $sale->update([
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'total_amount' => $totalAmount,
                'balance' => $balance,
                'payment_status' => $paymentStatus,
            ]);

            DB::commit();

            return response()->json(
                $sale->fresh()->load(['client', 'seller', 'branch', 'items.product', 'payments', 'createdBy', 'electronicInvoices.creditNote', 'electronicInvoices.debitNote'])
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Cancelar una venta
     */
    public function cancel(Request $request, Sale $sale): JsonResponse
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->status === 'cancelled') {
            return response()->json(['message' => 'Esta venta ya esta cancelada'], 400);
        }

        try {
            DB::beginTransaction();

            // Restaurar inventario
            foreach ($sale->items as $item) {
                if ($item->product_id) {
                    $product = Product::find($item->product_id);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;
                        $product->increment('current_stock', $item->quantity);
                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $request->user()->branch_id,
                            'type' => 'return',
                            'quantity' => $item->quantity,
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore + $item->quantity,
                            'reference_type' => Sale::class,
                            'reference_id' => $sale->id,
                            'created_by_user_id' => $request->user()->id,
                            'notes' => 'Anulación venta ' . $sale->invoice_number,
                        ]);
                    }
                }
            }

            $sale->update(['status' => 'cancelled']);

            DB::commit();

            return response()->json($sale->fresh()->load(['client', 'seller', 'branch', 'items', 'payments']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al cancelar la venta: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Actualizar fecha de vencimiento de una venta
     */
    public function updateDueDate(Request $request, Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'due_date' => 'nullable|date',
        ]);

        $sale->update(['due_date' => $validated['due_date']]);

        return response()->json([
            'success' => true,
            'data' => $sale->fresh()->load(['client', 'seller', 'branch', 'items', 'payments']),
            'message' => 'Fecha de vencimiento actualizada',
        ]);
    }

    /**
     * Guardar borrador de venta
     */
    public function storeDraft(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'type' => 'nullable|in:pos,electronic,account,credit',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'retentions' => 'nullable|array',
            'price_list_id' => 'nullable|integer|exists:price_lists,id',
            'items' => 'nullable|array',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_note' => 'nullable|string|max:255',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            [$subtotal, $totalDiscount, $totalTax] = $this->calculateItemTotals($validated['items'] ?? []);
            $retentionAmount = $this->calculateRetentions($validated['retentions'] ?? []);
            $totalAmount = $subtotal - $totalDiscount + $totalTax - $retentionAmount;
            $commissionPercentage = $validated['commission_percentage'] ?? 0;
            $commissionAmount = $totalAmount * ($commissionPercentage / 100);

            $draftNumber = $this->generateDraftNumber($request->user()->company_id);

            $sale = Sale::create([
                'company_id' => $request->user()->company_id,
                'branch_id' => $request->user()->branch_id,
                'client_id' => $validated['client_id'] ?? null,
                'seller_id' => $validated['seller_id'] ?? null,
                'invoice_number' => $draftNumber,
                'type' => $validated['type'] ?? 'pos',
                'status' => 'draft',
                'payment_status' => 'pending',
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'retention_amount' => $retentionAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'balance' => max(0, $totalAmount),
                'commission_percentage' => $commissionPercentage,
                'commission_amount' => $commissionAmount,
                'notes' => $validated['notes'] ?? null,
                'retentions' => $validated['retentions'] ?? null,
                'created_by_user_id' => $request->user()->id,
                'price_list_id' => $validated['price_list_id'] ?? null,
            ]);

            $this->createDraftItems($sale, $validated['items'] ?? []);

            DB::commit();

            return response()->json(
                $sale->load(['client', 'seller', 'branch', 'items', 'payments', 'createdBy']),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al guardar borrador: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Actualizar borrador existente
     */
    public function updateDraft(Request $request, Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Solo se pueden editar borradores'], 400);
        }

        $validated = $request->validate([
            'client_id' => 'nullable|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'type' => 'nullable|in:pos,electronic,account,credit',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'retentions' => 'nullable|array',
            'price_list_id' => 'nullable|integer|exists:price_lists,id',
            'items' => 'nullable|array',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_note' => 'nullable|string|max:255',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        try {
            DB::beginTransaction();

            $sale->items()->delete();

            [$subtotal, $totalDiscount, $totalTax] = $this->calculateItemTotals($validated['items'] ?? []);
            $retentionAmount = $this->calculateRetentions($validated['retentions'] ?? []);
            $totalAmount = $subtotal - $totalDiscount + $totalTax - $retentionAmount;
            $commissionPercentage = $validated['commission_percentage'] ?? 0;
            $commissionAmount = $totalAmount * ($commissionPercentage / 100);

            $sale->update([
                'client_id' => $validated['client_id'] ?? null,
                'seller_id' => $validated['seller_id'] ?? null,
                'type' => $validated['type'] ?? $sale->type,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'retention_amount' => $retentionAmount,
                'total_amount' => $totalAmount,
                'balance' => max(0, $totalAmount),
                'commission_percentage' => $commissionPercentage,
                'commission_amount' => $commissionAmount,
                'notes' => $validated['notes'] ?? null,
                'retentions' => $validated['retentions'] ?? null,
                'price_list_id' => $validated['price_list_id'] ?? null,
            ]);

            $this->createDraftItems($sale, $validated['items'] ?? []);

            DB::commit();

            return response()->json(
                $sale->fresh()->load(['client', 'seller', 'branch', 'items', 'payments', 'createdBy'])
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar borrador: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Finalizar borrador (convertir a venta real)
     */
    public function finalizeDraft(Request $request, Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Solo se pueden finalizar borradores'], 400);
        }

        $validated = $request->validate([
            'client_id' => 'required|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'type' => 'required|in:pos,electronic,account,credit',
            'invoice_date' => 'required|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
            'retentions' => 'nullable|array',
            'price_list_id' => 'nullable|exists:price_lists,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_note' => 'nullable|string|max:255',
            'payments' => 'required|array|min:1',
            'payments.*.cash_register_id' => 'required|exists:cash_registers,id',
            'payments.*.payment_method_id' => 'required|exists:payment_methods,id',
            'payments.*.amount' => 'required|numeric|min:0',
            'payments.*.date' => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            // Delete old draft items
            $sale->items()->delete();

            // Calculate totals
            [$subtotal, $totalDiscount, $totalTax] = $this->calculateItemTotals($validated['items']);
            $totalBeforeRetentions = $subtotal - $totalDiscount + $totalTax;
            $retentionAmount = $this->calculateRetentions($validated['retentions'] ?? []);
            $totalAmount = $totalBeforeRetentions - $retentionAmount;
            $paidAmount = array_sum(array_column($validated['payments'], 'amount'));
            $balance = $totalAmount - $paidAmount;

            $paymentStatus = 'pending';
            if ($paidAmount >= $totalAmount) {
                $paymentStatus = 'paid';
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
            }

            if ($paymentStatus !== 'paid' && empty($validated['due_date'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe seleccionar una fecha de vencimiento cuando el pago no es completo',
                ], 422);
            }

            $commissionPercentage = $validated['commission_percentage'] ?? 0;
            $commissionAmount = $totalAmount * ($commissionPercentage / 100);

            // Generate real invoice number
            $invoiceNumber = Sale::generateInvoiceNumber($sale->company_id, $validated['type']);

            $sale->update([
                'client_id' => $validated['client_id'],
                'seller_id' => $validated['seller_id'] ?? null,
                'invoice_number' => $invoiceNumber,
                'type' => $validated['type'],
                'status' => 'completed',
                'payment_status' => $paymentStatus,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'retention_amount' => $retentionAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'balance' => max(0, $balance),
                'commission_percentage' => $commissionPercentage,
                'commission_amount' => $commissionAmount,
                'notes' => $validated['notes'] ?? null,
                'retentions' => $validated['retentions'] ?? null,
                'price_list_id' => $validated['price_list_id'] ?? null,
            ]);

            // Create items WITH inventory decrement
            foreach ($validated['items'] as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discountPercentage = $item['discount_percentage'] ?? 0;
                $discountAmount = $itemSubtotal * ($discountPercentage / 100);
                $afterDiscount = $itemSubtotal - $discountAmount;
                $taxRate = $item['tax_rate'] ?? null;
                $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
                $total = $afterDiscount + $taxAmount;

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'] ?? null,
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $discountAmount,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $taxAmount,
                    'subtotal' => $itemSubtotal,
                    'total' => $total,
                    'discount_note' => $item['discount_note'] ?? null,
                ]);

                if ($item['product_id']) {
                    $product = Product::find($item['product_id']);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;
                        $product->decrement('current_stock', $item['quantity']);
                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $request->user()->branch_id,
                            'type' => 'sale',
                            'quantity' => -$item['quantity'],
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore - $item['quantity'],
                            'reference_type' => Sale::class,
                            'reference_id' => $sale->id,
                            'created_by_user_id' => $request->user()->id,
                            'notes' => 'Venta POS ' . $sale->invoice_number,
                        ]);
                    }
                }
            }

            // Process payments
            foreach ($validated['payments'] as $paymentData) {
                $cashRegister = CashRegister::findOrFail($paymentData['cash_register_id']);
                $paymentMethod = PaymentMethod::findOrFail($paymentData['payment_method_id']);

                if (!$cashRegister->is_active) {
                    throw new \Exception('La caja "' . $cashRegister->name . '" no está activa');
                }

                $sessionId = null;
                if ($cashRegister->type === 'minor') {
                    $session = CashRegisterSession::withoutGlobalScopes()
                        ->where('cash_register_id', $cashRegister->id)
                        ->whereNull('closed_at')
                        ->first();
                    if (!$session) {
                        throw new \Exception('La caja menor "' . $cashRegister->name . '" no tiene una sesión abierta');
                    }
                    $sessionId = $session->id;
                }

                SalePayment::create([
                    'sale_id' => $sale->id,
                    'cash_register_id' => $cashRegister->id,
                    'cash_register_session_id' => $sessionId,
                    'payment_method_id' => $paymentMethod->id,
                    'payment_method_name' => $paymentMethod->name,
                    'amount' => $paymentData['amount'],
                    'payment_date' => $paymentData['date'],
                    'created_by_user_id' => $request->user()->id,
                ]);

                Payment::create([
                    'company_id' => $sale->company_id,
                    'branch_id' => $sale->branch_id ?? null,
                    'cash_register_id' => $cashRegister->id,
                    'cash_register_session_id' => $sessionId,
                    'payment_method_id' => $paymentMethod->id,
                    'type' => 'income',
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                    'payment_number' => Payment::generatePaymentNumber(),
                    'amount' => $paymentData['amount'],
                    'payment_date' => now(),
                    'is_partial' => $paidAmount < $totalAmount,
                    'status' => 'completed',
                    'notes' => 'Pago de venta ' . $sale->invoice_number,
                    'created_by_user_id' => $request->user()->id,
                ]);

                $cashRegister->addToBalance($paymentData['amount']);

                if ($sessionId) {
                    $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
                    if ($session) {
                        $session->total_income += $paymentData['amount'];
                        $session->save();
                    }
                }
            }

            DB::commit();

            return response()->json(
                $sale->fresh()->load(['client', 'seller', 'branch', 'items', 'payments', 'createdBy']),
                200
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al finalizar borrador: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Eliminar borrador
     */
    public function deleteDraft(Request $request, Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Solo se pueden eliminar borradores'], 400);
        }

        $sale->items()->delete();
        $sale->delete();

        return response()->json(['message' => 'Borrador eliminado exitosamente']);
    }

    /**
     * Calculate item totals without persisting
     */
    private function calculateItemTotals(array $items): array
    {
        $subtotal = 0;
        $totalDiscount = 0;
        $totalTax = 0;

        foreach ($items as $item) {
            $itemSubtotal = $item['quantity'] * $item['unit_price'];
            $discountAmount = $itemSubtotal * (($item['discount_percentage'] ?? 0) / 100);
            $afterDiscount = $itemSubtotal - $discountAmount;
            $taxAmount = $afterDiscount * (($item['tax_rate'] ?? 0) / 100);

            $subtotal += $itemSubtotal;
            $totalDiscount += $discountAmount;
            $totalTax += $taxAmount;
        }

        return [$subtotal, $totalDiscount, $totalTax];
    }

    /**
     * Calculate retention total
     */
    private function calculateRetentions(array $retentions): float
    {
        $total = 0;
        foreach ($retentions as $retention) {
            $total += $retention['value'] ?? 0;
        }
        return $total;
    }

    /**
     * Create sale items without inventory decrement (for drafts)
     */
    private function createDraftItems(Sale $sale, array $items): void
    {
        foreach ($items as $item) {
            $itemSubtotal = $item['quantity'] * $item['unit_price'];
            $discountPercentage = $item['discount_percentage'] ?? 0;
            $discountAmount = $itemSubtotal * ($discountPercentage / 100);
            $afterDiscount = $itemSubtotal - $discountAmount;
            $taxRate = $item['tax_rate'] ?? null;
            $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
            $total = $afterDiscount + $taxAmount;

            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $item['product_id'] ?? null,
                'service_id' => $item['service_id'] ?? null,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'discount_percentage' => $discountPercentage,
                'discount_amount' => $discountAmount,
                'discount_note' => $item['discount_note'] ?? null,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'subtotal' => $itemSubtotal,
                'total' => $total,
            ]);
        }
    }

    /**
     * Generate draft invoice number
     */
    private function generateDraftNumber(int $companyId): string
    {
        $lastDraft = Sale::where('company_id', $companyId)
            ->where('status', 'draft')
            ->where('invoice_number', 'like', 'BORR-%')
            ->orderBy('id', 'desc')
            ->first();

        $lastNumber = 0;
        if ($lastDraft) {
            preg_match('/(\d+)$/', $lastDraft->invoice_number, $matches);
            $lastNumber = isset($matches[1]) ? (int) $matches[1] : 0;
        }

        return 'BORR-' . str_pad($lastNumber + 1, 8, '0', STR_PAD_LEFT);
    }

    /**
     * Obtener estadisticas de ventas
     */
    public function stats(Request $request): JsonResponse
    {
        $query = Sale::whereNotIn('status', ['cancelled', 'draft']);

        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        }

        $stats = [
            'total_sales' => $query->count(),
            'total_amount' => $query->sum('total_amount'),
            'total_paid' => $query->sum('paid_amount'),
            'total_pending' => $query->sum('balance'),
            'by_type' => $query->clone()
                ->selectRaw('type, COUNT(*) as count, SUM(total_amount) as total')
                ->groupBy('type')
                ->get(),
            'by_payment_status' => $query->clone()
                ->selectRaw('payment_status, COUNT(*) as count, SUM(total_amount) as total')
                ->groupBy('payment_status')
                ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Generar PDF de la venta (Cuenta de Cobro)
     */
    public function generatePdf(Request $request, Sale $sale): Response
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            abort(403, 'No autorizado');
        }

        // Cargar relaciones necesarias
        $sale->load(['client', 'items', 'payments.cashRegister', 'seller', 'branch']);

        // Obtener datos de la empresa
        $company = auth()->user()->company ?? (object) [
            'name' => 'LEGAL SISTEMA',
            'nit' => '900123456-7',
            'address' => '',
            'city' => '',
            'phone' => '',
            'email' => '',
            'logo_url' => null,
        ];

        // Determinar la plantilla segun el tipo
        $template = 'pdf.cuenta-cobro';

        $pdf = Pdf::loadView($template, [
            'sale' => $sale,
            'company' => $company,
        ]);

        // Configurar el PDF
        $pdf->setPaper('letter', 'portrait');
        $pdf->setOption('isRemoteEnabled', true);

        $filename = $sale->invoice_number . '.pdf';

        // Si se solicita descarga directa
        if ($request->boolean('download')) {
            return $pdf->download($filename);
        }

        // Por defecto mostrar en el navegador (stream)
        return $pdf->stream($filename);
    }

    /**
     * Enviar factura por correo al cliente via SMTP
     */
    public function sendEmail(Request $request, Sale $sale): JsonResponse
    {
        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $sale->company_id !== $request->user()->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado.',
            ], 403);
        }

        $sale->load(['client', 'items', 'payments', 'seller', 'branch.company']);

        $clientEmail = $sale->client?->email;

        if (empty($clientEmail)) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente no tiene correo electrónico registrado.',
            ], 400);
        }

        try {
            // Get company/branch data
            $branch = $sale->branch;
            $companyModel = $branch?->company;

            $company = (object) [
                'name' => $branch?->ei_business_name ?? $companyModel?->name ?? 'Empresa',
                'nit' => $branch?->ei_tax_id ?? $companyModel?->tax_id ?? '',
                'address' => $branch?->address ?? $companyModel?->address ?? '',
                'city' => $branch?->city ?? '',
                'phone' => $branch?->phone ?? $companyModel?->phone ?? '',
                'email' => $branch?->email ?? $companyModel?->email ?? '',
                'logo_url' => $companyModel?->logo_url ?? null,
            ];

            // Generate PDF to attach
            $pdf = Pdf::loadView('pdf.cuenta-cobro', [
                'sale' => $sale,
                'company' => $company,
            ]);
            $pdf->setPaper('letter', 'portrait');
            $pdf->setOption('isRemoteEnabled', true);
            $pdfContent = $pdf->output();

            Mail::to($clientEmail)->send(new SaleInvoiceMail(
                sale: $sale,
                companyName: $company->name,
                pdfContent: $pdfContent,
            ));

            $sale->update(['email_status' => 'sent']);

            Log::info('Email de factura enviado', [
                'sale_id' => $sale->id,
                'to' => $clientEmail,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Factura enviada por correo a {$clientEmail}.",
                'data' => ['email_status' => 'sent'],
            ]);
        } catch (\Exception $e) {
            $sale->update(['email_status' => 'pending']);

            Log::error('Error al enviar email de factura', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al enviar correo: ' . $e->getMessage(),
                'data' => ['email_status' => 'pending'],
            ], 500);
        }
    }
}
