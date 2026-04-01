<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\InternalNote;
use App\Models\InternalNoteItem;
use App\Models\InventoryMovement;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InternalNoteController extends Controller
{
    /**
     * Listar notas internas de una venta
     */
    public function index(Request $request, Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && !$request->user()->canAccessCompany($sale->company_id)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $notes = $sale->internalNotes()
            ->with(['items.product', 'items.service', 'createdBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notes);
    }

    /**
     * Crear una nota crédito o débito interna
     */
    public function store(Request $request, Sale $sale): JsonResponse
    {
        // Validar que la venta sea de tipo account o credit
        if (!in_array($sale->type, ['account', 'credit'])) {
            return response()->json([
                'message' => 'Solo se pueden crear notas internas para facturas tipo Cuenta de Cobro o Crédito',
            ], 422);
        }

        if ($sale->status === 'cancelled') {
            return response()->json([
                'message' => 'No se pueden crear notas para una venta anulada',
            ], 422);
        }

        $validated = $request->validate([
            'type' => 'required|in:credit,debit',
            'reason' => 'required|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.sale_item_id' => 'nullable|integer',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            // Para reembolso automático en notas crédito
            'cash_register_id' => 'nullable|exists:cash_registers,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
        ]);

        $type = $validated['type'];

        // Para notas crédito: validar que los items referencien items de la venta original
        if ($type === 'credit') {
            foreach ($validated['items'] as $item) {
                if (empty($item['sale_item_id'])) {
                    return response()->json([
                        'message' => 'Las notas crédito deben referenciar items de la venta original',
                    ], 422);
                }

                $saleItem = $sale->items()->find($item['sale_item_id']);
                if (!$saleItem) {
                    return response()->json([
                        'message' => "El item #{$item['sale_item_id']} no pertenece a esta venta",
                    ], 422);
                }

                // Verificar cantidad disponible (original - ya devuelto)
                $alreadyReturned = InternalNoteItem::whereHas('internalNote', function ($q) use ($sale) {
                    $q->where('sale_id', $sale->id)
                        ->where('type', 'credit')
                        ->where('status', 'completed');
                })->where('sale_item_id', $item['sale_item_id'])->sum('quantity');

                $available = $saleItem->quantity - $alreadyReturned;
                if ($item['quantity'] > $available) {
                    return response()->json([
                        'message' => "Solo quedan {$available} unidades disponibles para devolver del item \"{$saleItem->description}\"",
                    ], 422);
                }
            }
        }

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

            $totalAmount = $subtotal - $totalDiscount + $totalTax;

            // Crear la nota interna
            $note = InternalNote::create([
                'company_id' => $sale->company_id,
                'branch_id' => $sale->branch_id,
                'sale_id' => $sale->id,
                'note_number' => InternalNote::generateNoteNumber($sale->company_id, $type),
                'type' => $type,
                'status' => 'completed',
                'reason' => $validated['reason'],
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                'tax_amount' => $totalTax,
                'total_amount' => $totalAmount,
                'issue_date' => now()->toDateString(),
                'created_by_user_id' => $request->user()->id,
            ]);

            // Crear items de la nota
            foreach ($validated['items'] as $item) {
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $discountPercentage = $item['discount_percentage'] ?? 0;
                $discountAmount = $itemSubtotal * ($discountPercentage / 100);
                $afterDiscount = $itemSubtotal - $discountAmount;
                $taxRate = $item['tax_rate'] ?? null;
                $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
                $total = $afterDiscount + $taxAmount;

                InternalNoteItem::create([
                    'internal_note_id' => $note->id,
                    'sale_item_id' => $item['sale_item_id'] ?? null,
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
                ]);

                // Ajustar inventario
                if (!empty($item['product_id'])) {
                    $product = Product::find($item['product_id']);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;

                        if ($type === 'credit') {
                            // Devolver al inventario
                            $product->increment('current_stock', $item['quantity']);
                            $movementType = 'return';
                            $movementQty = $item['quantity'];
                            $movementNotes = 'Devolución - Nota Crédito ' . $note->note_number;
                        } else {
                            // Descontar del inventario
                            $product->decrement('current_stock', $item['quantity']);
                            $movementType = 'sale';
                            $movementQty = -$item['quantity'];
                            $movementNotes = 'Cargo adicional - Nota Débito ' . $note->note_number;
                        }

                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $sale->branch_id,
                            'type' => $movementType,
                            'quantity' => $movementQty,
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore + $movementQty,
                            'reference_type' => InternalNote::class,
                            'reference_id' => $note->id,
                            'created_by_user_id' => $request->user()->id,
                            'notes' => $movementNotes,
                        ]);
                    }
                }
            }

            // Actualizar montos en la venta
            if ($type === 'credit') {
                $sale->credit_note_amount = $sale->internalNotes()
                    ->where('type', 'credit')
                    ->where('status', 'completed')
                    ->sum('total_amount');
            } else {
                $sale->debit_note_amount = $sale->internalNotes()
                    ->where('type', 'debit')
                    ->where('status', 'completed')
                    ->sum('total_amount');
            }
            $sale->save();

            // Recalcular estado de pago
            $sale->updatePaymentStatus();

            // Para notas crédito: crear reembolso automático si hay caja
            if ($type === 'credit' && !empty($validated['cash_register_id']) && !empty($validated['payment_method_id'])) {
                $this->createRefundPayment($request, $sale, $note, $totalAmount, $validated);
            }

            DB::commit();

            return response()->json(
                $note->load(['items.product', 'items.service', 'createdBy']),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear la nota interna: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Anular una nota interna
     */
    public function cancel(Request $request, InternalNote $internalNote): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && !$request->user()->canAccessCompany($internalNote->company_id)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($internalNote->status === 'cancelled') {
            return response()->json(['message' => 'La nota ya está anulada'], 422);
        }

        try {
            DB::beginTransaction();

            // Revertir inventario
            foreach ($internalNote->items as $item) {
                if ($item->product_id) {
                    $product = Product::find($item->product_id);
                    if ($product && $product->is_trackable) {
                        $stockBefore = $product->current_stock;

                        if ($internalNote->isCredit()) {
                            // Fue devolución, ahora descontar de nuevo
                            $product->decrement('current_stock', $item->quantity);
                            $qty = -$item->quantity;
                        } else {
                            // Fue cargo adicional, ahora devolver
                            $product->increment('current_stock', $item->quantity);
                            $qty = $item->quantity;
                        }

                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'company_id' => $product->company_id,
                            'branch_id' => $internalNote->branch_id,
                            'type' => 'adjustment',
                            'quantity' => $qty,
                            'unit_cost' => $product->purchase_price ?? 0,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockBefore + $qty,
                            'reference_type' => InternalNote::class,
                            'reference_id' => $internalNote->id,
                            'created_by_user_id' => $request->user()->id,
                            'notes' => 'Anulación de nota ' . $internalNote->note_number,
                        ]);
                    }
                }
            }

            // Anular la nota
            $internalNote->update(['status' => 'cancelled']);

            // Recalcular montos en la venta
            $sale = $internalNote->sale;
            $sale->credit_note_amount = $sale->internalNotes()
                ->where('type', 'credit')
                ->where('status', 'completed')
                ->sum('total_amount');
            $sale->debit_note_amount = $sale->internalNotes()
                ->where('type', 'debit')
                ->where('status', 'completed')
                ->sum('total_amount');
            $sale->save();

            $sale->updatePaymentStatus();

            DB::commit();

            return response()->json($internalNote->load(['items.product', 'items.service', 'createdBy']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al anular la nota: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Crear pago de reembolso automático para notas crédito
     */
    private function createRefundPayment(Request $request, Sale $sale, InternalNote $note, float $amount, array $validated): void
    {
        $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
        $paymentMethod = PaymentMethod::findOrFail($validated['payment_method_id']);

        // Obtener sesión activa si es caja menor
        $sessionId = null;
        if ($cashRegister->type === 'minor') {
            $session = CashRegisterSession::withoutGlobalScopes()
                ->where('cash_register_id', $cashRegister->id)
                ->whereNull('closed_at')
                ->first();
            if ($session) {
                $sessionId = $session->id;
            }
        }

        // Crear pago negativo en SalePayment (reembolso)
        SalePayment::create([
            'sale_id' => $sale->id,
            'cash_register_id' => $cashRegister->id,
            'cash_register_session_id' => $sessionId,
            'payment_method_id' => $paymentMethod->id,
            'payment_method_name' => $paymentMethod->name,
            'amount' => -$amount,
            'payment_date' => now()->toDateString(),
            'notes' => 'Reembolso - Nota Crédito ' . $note->note_number,
            'created_by_user_id' => $request->user()->id,
        ]);

        // Crear registro en módulo de pagos
        Payment::create([
            'company_id' => $sale->company_id,
            'branch_id' => $sale->branch_id,
            'cash_register_id' => $cashRegister->id,
            'cash_register_session_id' => $sessionId,
            'payment_method_id' => $paymentMethod->id,
            'type' => 'expense',
            'reference_type' => InternalNote::class,
            'reference_id' => $note->id,
            'payment_number' => Payment::generatePaymentNumber(),
            'amount' => $amount,
            'payment_date' => now(),
            'status' => 'completed',
            'notes' => 'Reembolso por Nota Crédito ' . $note->note_number . ' - Venta ' . $sale->invoice_number,
            'created_by_user_id' => $request->user()->id,
        ]);

        // Descontar de la caja
        $cashRegister->subtractFromBalance($amount);

        // Actualizar sesión si existe
        if ($sessionId) {
            $session = CashRegisterSession::withoutGlobalScopes()->find($sessionId);
            if ($session) {
                $session->total_expense += $amount;
                $session->save();
            }
        }

        // Recalcular estado de pago de la venta
        $sale->updatePaymentStatus();
    }
}
