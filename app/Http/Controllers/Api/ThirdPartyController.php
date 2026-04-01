<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ThirdParty;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ThirdPartyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $thirdParties = ThirdParty::query()
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('document_id', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('business_name', 'like', "%{$search}%");
                });
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->boolean('is_active'));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($thirdParties);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => 'nullable|string|max:50',
            'document_id' => 'nullable|string|max:50',
            'name' => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:150',
            'commune' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:255',
            'observations' => 'nullable|string|max:5000',
            'is_active' => 'boolean',
        ]);

        $thirdParty = ThirdParty::create($validated);

        return response()->json([
            'success' => true,
            'data' => $thirdParty,
            'message' => 'Tercero creado exitosamente',
        ], 201);
    }

    public function show(ThirdParty $thirdParty): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $thirdParty,
        ]);
    }

    public function update(Request $request, ThirdParty $thirdParty): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => 'nullable|string|max:50',
            'document_id' => 'nullable|string|max:50',
            'name' => 'sometimes|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:150',
            'commune' => 'nullable|string|max:100',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:255',
            'observations' => 'nullable|string|max:5000',
            'is_active' => 'boolean',
        ]);

        $thirdParty->update($validated);

        return response()->json([
            'success' => true,
            'data' => $thirdParty,
            'message' => 'Tercero actualizado exitosamente',
        ]);
    }

    public function destroy(ThirdParty $thirdParty): JsonResponse
    {
        $thirdParty->delete();

        return response()->json(null, 204);
    }
}
