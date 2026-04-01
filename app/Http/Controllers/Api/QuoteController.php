<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Auto-expirar quotes vencidos
        Quote::where('status', 'active')
            ->where('valid_until', '<', now()->toDateString())
            ->update(['status' => 'expired']);

        $query = Quote::with(['client', 'seller', 'items', 'createdBy']);

        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->status && $request->status !== 'todos') {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('concept', 'ilike', "%{$search}%")
                  ->orWhere('quote_number', 'ilike', "%{$search}%")
                  ->orWhere('notes', 'ilike', "%{$search}%");
            });
        }

        if ($request->date_from) {
            $query->where('quote_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->where('quote_date', '<=', $request->date_to);
        }

        $quotes = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json($quotes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'concept' => 'required|string|max:255',
            'quote_date' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:quote_date',
            'notes' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
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

            $quote = Quote::create([
                'company_id' => $request->user()->company_id,
                'branch_id' => $request->user()->branch_id,
                'client_id' => $validated['client_id'],
                'seller_id' => $validated['seller_id'] ?? null,
                'quote_number' => Quote::generateQuoteNumber($request->user()->company_id),
                'concept' => $validated['concept'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'active',
                'quote_date' => $validated['quote_date'],
                'valid_until' => $validated['valid_until'],
                'created_by_user_id' => $request->user()->id,
            ]);

            $this->createItems($quote, $validated['items']);
            $this->recalculateTotals($quote);

            DB::commit();

            return response()->json(
                $quote->load(['client', 'seller', 'items', 'createdBy']),
                201
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear presupuesto: ' . $e->getMessage()], 500);
        }
    }

    public function show(Request $request, Quote $quote): JsonResponse
    {
        return response()->json(
            $quote->load(['client', 'seller', 'items.product', 'items.service', 'createdBy', 'convertedSale'])
        );
    }

    public function update(Request $request, Quote $quote): JsonResponse
    {
        if ($quote->status !== 'active') {
            return response()->json(['message' => 'Solo se pueden editar presupuestos vigentes.'], 422);
        }

        $validated = $request->validate([
            'client_id' => 'sometimes|exists:users,id',
            'seller_id' => 'nullable|exists:users,id',
            'concept' => 'sometimes|string|max:255',
            'quote_date' => 'sometimes|date',
            'valid_until' => 'sometimes|date',
            'notes' => 'nullable|string|max:2000',
            'items' => 'sometimes|array|min:1',
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

            $quote->update(collect($validated)->except('items')->toArray());

            if (isset($validated['items'])) {
                $quote->items()->delete();
                $this->createItems($quote, $validated['items']);
                $this->recalculateTotals($quote);
            }

            DB::commit();

            return response()->json(
                $quote->fresh()->load(['client', 'seller', 'items', 'createdBy'])
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar presupuesto: ' . $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request, Quote $quote): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:active,accepted,expired,rejected',
        ]);

        $quote->update(['status' => $validated['status']]);

        return response()->json($quote->fresh()->load(['client', 'seller', 'items', 'createdBy']));
    }

    public function destroy(Request $request, Quote $quote): JsonResponse
    {
        $quote->items()->delete();
        $quote->delete();

        return response()->json(null, 204);
    }

    private function createItems(Quote $quote, array $items): void
    {
        foreach ($items as $item) {
            $itemSubtotal = $item['quantity'] * $item['unit_price'];
            $discountPercentage = $item['discount_percentage'] ?? 0;
            $discountAmount = $itemSubtotal * ($discountPercentage / 100);
            $afterDiscount = $itemSubtotal - $discountAmount;
            $taxRate = $item['tax_rate'] ?? null;
            $taxAmount = $afterDiscount * (($taxRate ?? 0) / 100);
            $total = $afterDiscount + $taxAmount;

            QuoteItem::create([
                'quote_id' => $quote->id,
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
        }
    }

    private function recalculateTotals(Quote $quote): void
    {
        $quote->load('items');
        $quote->update([
            'subtotal' => $quote->items->sum('subtotal'),
            'discount_amount' => $quote->items->sum('discount_amount'),
            'tax_amount' => $quote->items->sum('tax_amount'),
            'total_amount' => $quote->items->sum('total'),
        ]);
    }
}
