<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Services\CompanyFileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['roles', 'company', 'branch']);

        // Excluir usuarios con rol de cliente (se gestionan en /clients)
        $query->whereDoesntHave('roles', function ($q) {
            $q->where('slug', 'client');
        });

        if (!$request->user()->isSuperAdmin()) {
            $query->where('company_id', $request->user()->company_id);
        } elseif ($request->company_id) {
            $query->where('company_id', $request->company_id);
        }

        $users = $query
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->role, function ($query, $role) {
                $query->whereHas('roles', fn($q) => $q->where('slug', $role));
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:users',
            'password' => ['required', Password::defaults()],
            'company_id' => 'nullable|exists:companies,id',
            'branch_id' => 'nullable|exists:branches,id',
            'document_type' => 'nullable|string|max:10',
            'document_id' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:100',
            'commune' => 'nullable|string|max:100',
            'referral_source' => 'nullable|string|max:50',
            'contact_preference' => 'nullable|string|max:50',
            'preferred_schedule' => 'nullable|string|max:100',
            'observations' => 'nullable|string|max:2000',
            'tags' => 'nullable|array',
            'social_networks' => 'nullable|array',
            'is_active' => 'boolean',
            'roles' => 'array',
            'roles.*' => 'exists:roles,id',
            'role_ids' => 'array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if (!$request->user()->isSuperAdmin()) {
            $validated['company_id'] = $request->user()->company_id;
        }

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        // Support both 'roles' and 'role_ids' for flexibility
        $roleIds = $validated['role_ids'] ?? $validated['roles'] ?? [];
        if (!empty($roleIds)) {
            $user->roles()->sync($roleIds);
        }

        return response()->json($user->load(['roles', 'company', 'branch']), 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($user->load(['roles.permissions', 'company', 'branch']));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'password' => ['sometimes', Password::defaults()],
            'document_type' => 'nullable|string|max:10',
            'document_id' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'whatsapp_country' => 'nullable|string|max:10',
            'whatsapp_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|max:20',
            'occupation' => 'nullable|string|max:100',
            'country_code' => 'nullable|string|max:10',
            'country_name' => 'nullable|string|max:100',
            'state_code' => 'nullable|string|max:10',
            'state_name' => 'nullable|string|max:100',
            'city_name' => 'nullable|string|max:100',
            'neighborhood' => 'nullable|string|max:100',
            'commune' => 'nullable|string|max:100',
            'branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
            // Employment fields
            'salary' => 'nullable|numeric|min:0',
            'contract_type' => 'nullable|string|max:50',
            'admission_date' => 'nullable|date',
            'bank_name' => 'nullable|string|max:100',
            'account_type' => 'nullable|string|max:20',
            'account_number' => 'nullable|string|max:50',
            'eps_name' => 'nullable|string|max:100',
            'pension_fund_name' => 'nullable|string|max:100',
            'arl_name' => 'nullable|string|max:100',
            'compensation_fund_name' => 'nullable|string|max:100',
            'risk_level' => 'nullable|integer|min:1|max:5',
            'roles' => 'array',
            'roles.*' => 'exists:roles,id',
            'role_ids' => 'array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Capture old values for activity log
        $oldValues = $user->only(array_keys($validated));
        $oldRoleIds = $user->roles()->pluck('roles.id')->toArray();

        $user->update($validated);

        // Support both 'roles' and 'role_ids' for flexibility
        $roleIds = $validated['role_ids'] ?? $validated['roles'] ?? null;
        if ($roleIds !== null) {
            $user->roles()->sync($roleIds);
        }

        // Log changes
        $changes = [];
        foreach ($validated as $key => $value) {
            if (in_array($key, ['password', 'roles', 'role_ids'])) continue;
            $old = $oldValues[$key] ?? null;
            if ($old != $value) {
                $changes[$key] = ['old' => $old, 'new' => $value];
            }
        }

        if ($roleIds !== null) {
            $newRoleIds = array_map('intval', $roleIds);
            sort($oldRoleIds);
            sort($newRoleIds);
            if ($oldRoleIds !== $newRoleIds) {
                $oldRoleNames = \App\Models\Role::whereIn('id', $oldRoleIds)->pluck('name')->toArray();
                $newRoleNames = \App\Models\Role::whereIn('id', $newRoleIds)->pluck('name')->toArray();
                $changes['roles'] = ['old' => $oldRoleNames, 'new' => $newRoleNames];
            }
        }

        if (!empty($changes)) {
            ActivityLog::log(
                'Información del usuario actualizada',
                'user.updated',
                $user,
                ['changes' => $changes]
            );
        }

        return response()->json($user->load(['roles', 'company', 'branch']));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta'], 400);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    public function userSummary(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $currentYear = now()->year;

        // Commission summary from sales
        $commissionSales = $user->salesAsSeller()
            ->where('status', 'completed')
            ->where('commission_amount', '>', 0)
            ->whereYear('created_at', $currentYear)
            ->get();

        $totalCommission = $commissionSales->sum('commission_amount');
        $totalSalesAmount = $commissionSales->sum('total_amount');
        $salesCount = $commissionSales->count();
        $avgPercentage = $salesCount > 0
            ? $commissionSales->avg('commission_percentage')
            : 0;

        // Sales as seller summary
        $sellerSales = $user->salesAsSeller()
            ->where('status', 'completed')
            ->whereYear('created_at', $currentYear);

        return response()->json([
            'salary_info' => [
                'salary' => $user->salary,
                'contract_type' => $user->contract_type,
                'admission_date' => $user->admission_date?->toDateString(),
                'bank_name' => $user->bank_name,
                'account_type' => $user->account_type,
                'account_number' => $user->account_number,
                'eps_name' => $user->eps_name,
                'pension_fund_name' => $user->pension_fund_name,
                'arl_name' => $user->arl_name,
                'compensation_fund_name' => $user->compensation_fund_name,
                'risk_level' => $user->risk_level,
            ],
            'commission_summary' => [
                'total_commission' => (float) $totalCommission,
                'total_sales' => (float) $totalSalesAmount,
                'sales_count' => $salesCount,
                'avg_percentage' => round((float) $avgPercentage, 2),
            ],
            'payroll_summary' => [
                'total_paid_year' => 0,
                'payroll_count_year' => 0,
                'last_payroll' => null,
            ],
            'sales_as_seller' => [
                'count' => $sellerSales->count(),
                'total' => (float) $sellerSales->sum('total_amount'),
            ],
        ]);
    }

    public function userCommissions(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $query = $user->salesAsSeller()
            ->where('status', 'completed')
            ->where('commission_amount', '>', 0)
            ->with(['client:id,name,document_id'])
            ->select(['id', 'invoice_number', 'client_id', 'total_amount', 'commission_percentage', 'commission_amount', 'commission_paid', 'commission_paid_at', 'created_at']);

        if (!empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (!empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }

        $sales = $query->orderByDesc('created_at')->paginate($request->per_page ?? 20);

        return response()->json($sales);
    }

    public function toggleCommissionPaid(Request $request, User $user, \App\Models\Sale $sale): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($sale->seller_id !== $user->id) {
            return response()->json(['message' => 'Esta venta no pertenece a este vendedor'], 422);
        }

        $newStatus = !$sale->commission_paid;
        $sale->update([
            'commission_paid' => $newStatus,
            'commission_paid_at' => $newStatus ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $sale->only(['id', 'commission_paid', 'commission_paid_at']),
            'message' => $newStatus ? 'Comisión marcada como pagada' : 'Comisión marcada como pendiente',
        ]);
    }

    public function userHistory(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $perPage = $request->per_page ?? 20;
        $page = $request->page ?? 1;

        $events = collect();

        // Commission sales
        $commissionSales = $user->salesAsSeller()
            ->where('status', 'completed')
            ->where('commission_amount', '>', 0)
            ->with('client:id,name')
            ->select(['id', 'invoice_number', 'client_id', 'total_amount', 'commission_percentage', 'commission_amount', 'created_at'])
            ->get();

        foreach ($commissionSales as $sale) {
            $events->push([
                'type' => 'commission',
                'icon' => 'dollar-sign',
                'title' => "Comisión por venta #{$sale->invoice_number}",
                'description' => "Cliente: " . ($sale->client->name ?? 'Sin definir') .
                    " | Venta: $" . number_format($sale->total_amount, 0, ',', '.') .
                    " | Comisión ({$sale->commission_percentage}%): $" . number_format($sale->commission_amount, 0, ',', '.'),
                'status' => 'completed',
                'date' => $sale->created_at,
                'meta' => [
                    'sale_id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'commission_amount' => $sale->commission_amount,
                ],
            ]);
        }

        // Activity logs (user edits)
        $activityLogs = ActivityLog::where('subject_type', User::class)
            ->where('subject_id', $user->id)
            ->with('causer:id,name')
            ->orderByDesc('created_at')
            ->get();

        $fieldLabels = $this->getFieldLabels();

        foreach ($activityLogs as $log) {
            $causerName = $log->causer?->name ?? 'Sistema';
            $changes = $log->properties['changes'] ?? [];
            $changedFields = array_keys($changes);
            $readableFields = array_map(fn($f) => $fieldLabels[$f] ?? $f, $changedFields);

            $events->push([
                'type' => 'edit',
                'icon' => 'edit',
                'title' => $log->description,
                'description' => "Por: $causerName | Campos: " . implode(', ', $readableFields),
                'status' => 'info',
                'date' => $log->created_at,
                'meta' => [
                    'causer' => $causerName,
                    'changes' => $changes,
                ],
            ]);
        }

        // Sort by date descending
        $sorted = $events->sortByDesc('date')->values();

        // Paginate manually
        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $offset = ($page - 1) * $perPage;
        $data = $sorted->slice($offset, $perPage)->values();

        return response()->json([
            'data' => $data,
            'current_page' => (int) $page,
            'last_page' => $lastPage,
            'per_page' => (int) $perPage,
            'total' => $total,
        ]);
    }

    private function getFieldLabels(): array
    {
        return [
            'name' => 'Nombre',
            'email' => 'Correo',
            'phone' => 'Teléfono',
            'address' => 'Dirección',
            'document_id' => 'Documento',
            'birth_date' => 'Fecha nacimiento',
            'is_active' => 'Estado',
            'branch_id' => 'Sucursal',
            'salary' => 'Salario',
            'contract_type' => 'Tipo contrato',
            'admission_date' => 'Fecha ingreso',
            'bank_name' => 'Banco',
            'account_type' => 'Tipo cuenta',
            'account_number' => 'No. cuenta',
            'eps_name' => 'EPS',
            'pension_fund_name' => 'Fondo pensión',
            'arl_name' => 'ARL',
            'compensation_fund_name' => 'Caja compensación',
            'risk_level' => 'Nivel riesgo',
            'roles' => 'Roles',
            'country_name' => 'País',
            'state_name' => 'Departamento',
            'city_name' => 'Ciudad',
        ];
    }

    public function uploadAvatar(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $company = $user->company;
        if (!$company) {
            return response()->json(['success' => false, 'message' => 'Usuario sin empresa'], 400);
        }

        $service = app(CompanyFileStorageService::class);

        if ($user->avatar_url) {
            $service->deleteFileFromUrl($user->avatar_url);
        }

        $url = $service->uploadUserAvatar($company, $request->file('avatar'));

        if (!$url) {
            return response()->json(['success' => false, 'message' => 'Error al subir la foto'], 500);
        }

        $user->update(['avatar_url' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['avatar_url' => $url],
            'message' => 'Foto de perfil actualizada',
        ]);
    }

    public function deleteAvatar(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($user->avatar_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($user->avatar_url);
            $user->update(['avatar_url' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => ['avatar_url' => null],
            'message' => 'Foto de perfil eliminada',
        ]);
    }

    public function uploadSignature(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $company = $user->company;
        if (!$company) {
            return response()->json(['success' => false, 'message' => 'Usuario sin empresa'], 400);
        }

        $service = app(CompanyFileStorageService::class);

        // Eliminar firma anterior
        if ($user->signature_url) {
            $service->deleteFileFromUrl($user->signature_url);
        }

        $url = null;

        // Opción 1: Subir imagen directa
        if ($request->hasFile('signature')) {
            $request->validate([
                'signature' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            ]);
            $url = $service->uploadUserSignature($company, $request->file('signature'));
        }
        // Opción 2: Firma dibujada en canvas (base64)
        elseif ($request->has('signature_base64')) {
            $request->validate([
                'signature_base64' => 'required|string',
            ]);
            $url = $service->uploadBase64File($company, $request->input('signature_base64'), 'users/signatures');
        } else {
            return response()->json(['success' => false, 'message' => 'No se envió firma'], 422);
        }

        if (!$url) {
            return response()->json(['success' => false, 'message' => 'Error al subir la firma'], 500);
        }

        $user->update(['signature_url' => $url]);

        return response()->json([
            'success' => true,
            'data' => ['signature_url' => $url],
            'message' => 'Firma actualizada',
        ]);
    }

    public function deleteSignature(Request $request, User $user): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $user->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($user->signature_url) {
            $service = app(CompanyFileStorageService::class);
            $service->deleteFileFromUrl($user->signature_url);
            $user->update(['signature_url' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => ['signature_url' => null],
            'message' => 'Firma eliminada',
        ]);
    }

    /**
     * Bulk salary update for multiple users
     */
    public function bulkSalaryUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'updates' => 'required|array|min:1',
            'updates.*.user_id' => 'required|integer|exists:users,id',
            'updates.*.salary' => 'required|numeric|min:0',
        ]);

        $user = $request->user();
        $updatedCount = 0;

        DB::beginTransaction();
        try {
            foreach ($validated['updates'] as $update) {
                $targetUser = User::find($update['user_id']);
                if (!$targetUser) continue;

                // Company scope check
                if (!$user->isSuperAdmin() && $targetUser->company_id !== $user->company_id) {
                    continue;
                }

                $oldSalary = $targetUser->salary;
                $newSalary = round($update['salary'], 2);

                if ($oldSalary != $newSalary) {
                    $targetUser->update(['salary' => $newSalary]);

                    // Log the change
                    \App\Models\ActivityLog::create([
                        'company_id' => $targetUser->company_id,
                        'user_id' => $user->id,
                        'action' => 'bulk_salary_update',
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $targetUser->id,
                        'description' => "Ajuste masivo de salario: " . number_format($oldSalary ?? 0, 0, ',', '.') . " → " . number_format($newSalary, 0, ',', '.'),
                        'old_values' => json_encode(['salary' => $oldSalary]),
                        'new_values' => json_encode(['salary' => $newSalary]),
                    ]);

                    $updatedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Se actualizaron {$updatedCount} salarios correctamente.",
                'data' => ['updated_count' => $updatedCount],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar salarios: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current payroll configuration (SMMLV)
     */
    public function getPayrollConfig(): JsonResponse
    {
        $config = \App\Models\PayrollConfig::current();

        if (!$config) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'No hay configuración de nómina registrada',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $config,
        ]);
    }
}
