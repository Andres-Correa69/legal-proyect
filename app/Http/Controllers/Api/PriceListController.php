<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PriceList;
use App\Models\PriceListItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PriceListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PriceList::withCount(['items', 'sales']);

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $priceLists = $query->orderBy('priority')->orderBy('name')->get();

        return response()->json($priceLists);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('price_lists')->where(fn ($q) => $q->where('company_id', auth()->user()->company_id)),
            ],
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'priority' => 'nullable|integer|min:0',
        ]);

        $priceList = PriceList::create([
            'company_id' => auth()->user()->company_id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'priority' => $validated['priority'] ?? 0,
        ]);

        return response()->json($priceList, 201);
    }

    public function show(PriceList $priceList): JsonResponse
    {
        $priceList->load([
            'items.product:id,name,sku,sale_price,category_id,area_id',
            'items.product.category:id,name',
            'items.product.area:id,name',
            'items.service:id,name,slug,price',
        ]);
        $priceList->loadCount('sales');

        return response()->json($priceList);
    }

    public function sales(Request $request, PriceList $priceList): JsonResponse
    {
        $query = \App\Models\Sale::where('price_list_id', $priceList->id)
            ->with(['client:id,name,email', 'seller:id,name'])
            ->orderByDesc('invoice_date');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('date_from')) {
            $query->where('invoice_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('invoice_date', '<=', $request->date_to);
        }

        $sales = $query->get();

        return response()->json($sales);
    }

    public function update(Request $request, PriceList $priceList): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('price_lists')
                    ->where(fn ($q) => $q->where('company_id', auth()->user()->company_id))
                    ->ignore($priceList->id),
            ],
            'description' => 'nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
            'priority' => 'nullable|integer|min:0',
        ]);

        $priceList->update($validated);

        return response()->json($priceList);
    }

    public function destroy(PriceList $priceList): JsonResponse
    {
        $priceList->delete();

        return response()->json(['message' => 'Lista de precios eliminada']);
    }

    public function syncItems(Request $request, PriceList $priceList): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.service_id' => 'nullable|integer|exists:services,id',
            'items.*.discount_percentage' => 'required|numeric|min:0|max:100',
            'items.*.custom_price' => 'nullable|numeric|min:0',
        ]);

        // Delete existing items for this price list that match the incoming product/service ids
        $productIds = collect($validated['items'])->pluck('product_id')->filter()->values()->toArray();
        $serviceIds = collect($validated['items'])->pluck('service_id')->filter()->values()->toArray();

        // Remove items for these products/services (will be re-created)
        $priceList->items()
            ->where(function ($q) use ($productIds, $serviceIds) {
                if (!empty($productIds)) {
                    $q->whereIn('product_id', $productIds);
                }
                if (!empty($serviceIds)) {
                    $q->orWhereIn('service_id', $serviceIds);
                }
            })
            ->delete();

        // Create new items
        foreach ($validated['items'] as $item) {
            if (empty($item['product_id']) && empty($item['service_id'])) {
                continue;
            }
            // Skip items with 0 discount and no custom price (means "no list applies")
            if (($item['discount_percentage'] ?? 0) == 0 && empty($item['custom_price'])) {
                continue;
            }

            PriceListItem::create([
                'price_list_id' => $priceList->id,
                'product_id' => $item['product_id'] ?? null,
                'service_id' => $item['service_id'] ?? null,
                'discount_percentage' => $item['discount_percentage'],
                'custom_price' => $item['custom_price'] ?? null,
            ]);
        }

        $priceList->load(['items.product:id,name,sku,sale_price', 'items.service:id,name,slug,price']);

        return response()->json($priceList);
    }

    public function getItemsForSale(Request $request): JsonResponse
    {
        $request->validate([
            'price_list_id' => 'required|integer|exists:price_lists,id',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'integer',
        ]);

        $query = PriceListItem::where('price_list_id', $request->price_list_id);

        $query->where(function ($q) use ($request) {
            if ($request->has('product_ids') && !empty($request->product_ids)) {
                $q->whereIn('product_id', $request->product_ids);
            }
            if ($request->has('service_ids') && !empty($request->service_ids)) {
                $q->orWhereIn('service_id', $request->service_ids);
            }
        });

        $items = $query->get(['product_id', 'service_id', 'discount_percentage', 'custom_price']);

        return response()->json($items);
    }
}
