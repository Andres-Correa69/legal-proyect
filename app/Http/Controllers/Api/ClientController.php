<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ClientController extends Controller
{
    /**
     * Obtiene el rol de cliente
     */
    private function getClientRole(): ?Role
    {
        return Role::where('slug', 'client')->first();
    }

    /**
     * Lista todos los clientes (usuarios con rol 'client')
     */
    public function index(Request $request): JsonResponse
    {
        $clientRole = $this->getClientRole();

        if (!$clientRole) {
            return response()->json(['message' => 'Rol de cliente no encontrado'], 500);
        }

        $query = User::with(['company', 'branch'])
            ->withCount(['salesAsClient as invoices_count' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }])
            ->withSum(['salesAsClient as total_invoiced' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }], 'total_amount')
            ->withMax(['salesAsClient as last_sale_date' => function ($q) {
                $q->where('status', '!=', 'cancelled');
            }], 'created_at')
            ->whereHas('roles', function ($q) use ($clientRole) {
                $q->where('roles.id', $clientRole->id);
            });

        // Filtrar por empresa si no es super admin
        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        } elseif ($request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        $clients = $query
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('document_id', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->is_active !== null, function ($query) use ($request) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($clients);
    }

    /**
     * Crear un nuevo cliente
     */
    public function store(Request $request): JsonResponse
    {
        $clientRole = $this->getClientRole();

        if (!$clientRole) {
            return response()->json(['message' => 'Rol de cliente no encontrado'], 500);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => ['nullable', Password::defaults()],
            'company_id' => 'nullable|exists:companies,id',
            'branch_id' => 'nullable|exists:branches,id',
            'document_id' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:150',
            'commune' => 'nullable|string|max:100',
            'referral_source' => 'nullable|string|max:100',
            'contact_preference' => 'nullable|string|max:50',
            'preferred_schedule' => 'nullable|string|max:50',
            'observations' => 'nullable|string|max:5000',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'social_networks' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        // Si no es super admin, asignar la empresa y sede del usuario
        if (!$request->user()->isSuperAdmin()) {
            $validated['company_id'] = $request->user()->company_id;
            $validated['branch_id'] = $request->user()->branch_id;
        }

        // Generar contraseña si no se proporciona
        $validated['password'] = Hash::make($validated['password'] ?? 'cliente123');

        $client = User::create($validated);

        // Asignar rol de cliente
        $client->roles()->sync([$clientRole->id]);

        return response()->json($client->load(['company', 'branch']), 201);
    }

    /**
     * Mostrar un cliente específico
     */
    public function show(Request $request, User $client): JsonResponse
    {
        $clientRole = $this->getClientRole();

        // Verificar que es un cliente
        if (!$client->roles()->where('roles.id', $clientRole?->id)->exists()) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $client->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($client->load(['company', 'branch']));
    }

    /**
     * Actualizar un cliente
     */
    public function update(Request $request, User $client): JsonResponse
    {
        $clientRole = $this->getClientRole();

        // Verificar que es un cliente
        if (!$client->roles()->where('roles.id', $clientRole?->id)->exists()) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $client->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'legal_representative' => 'nullable|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $client->id,
            'password' => ['sometimes', Password::defaults()],
            'branch_id' => 'nullable|exists:branches,id',
            'document_id' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:150',
            'commune' => 'nullable|string|max:100',
            'referral_source' => 'nullable|string|max:100',
            'contact_preference' => 'nullable|string|max:50',
            'preferred_schedule' => 'nullable|string|max:50',
            'observations' => 'nullable|string|max:5000',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'social_networks' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $client->update($validated);

        return response()->json($client->load(['company', 'branch']));
    }

    /**
     * Eliminar un cliente
     */
    public function destroy(Request $request, User $client): JsonResponse
    {
        $clientRole = $this->getClientRole();

        // Verificar que es un cliente
        if (!$client->roles()->where('roles.id', $clientRole?->id)->exists()) {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        // Verificar acceso
        if (!$request->user()->isSuperAdmin() && $client->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $client->delete();

        return response()->json(null, 204);
    }
}
