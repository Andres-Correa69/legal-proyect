<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Models\Product;
use App\Models\Sale;
use App\Services\CompanyFileStorageService;
use App\Services\RutParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $companies = Company::with('branches')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json($companies);
    }

    public function parseRut(Request $request, RutParserService $rutParser): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'rut_file' => 'required|file|mimes:pdf|max:5120',
        ]);

        try {
            $data = $rutParser->parse($request->file('rut_file'));

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'RUT procesado correctamente',
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el PDF. Verifique que sea un RUT válido.',
            ], 422);
        }
    }

    public function createFromRut(Request $request, RutParserService $rutParser, CompanyFileStorageService $fileStorage): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'rut_file' => 'required|file|mimes:pdf|max:5120',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
        ]);

        try {
            return DB::transaction(function () use ($request, $fileStorage) {
                // 1. Create company
                $baseSlug = Str::slug($request->name);
                $slug = $baseSlug;
                $counter = 1;
                while (Company::where('slug', $slug)->exists()) {
                    $slug = $baseSlug . '-' . $counter;
                    $counter++;
                }

                $company = Company::create([
                    'name' => $request->name,
                    'slug' => $slug,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'address' => $request->address,
                    'tax_id' => $request->tax_id,
                    'is_active' => true,
                ]);

                // 2. Upload RUT PDF to S3
                $rutUrl = null;
                if ($request->hasFile('rut_file')) {
                    $rutUrl = $fileStorage->uploadFile($company, $request->file('rut_file'), 'rut');
                }

                // 3. Update the main branch (created by CompanyObserver) with location + RUT
                $mainBranch = $company->mainBranch();
                if ($mainBranch) {
                    $mainBranch->update([
                        'address' => $request->address,
                        'city' => $request->city,
                        'state' => $request->department,
                        'email' => $request->email,
                        'phone' => $request->phone,
                        'country' => 'CO',
                        'rut_url' => $rutUrl,
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'data' => $company->load('branches'),
                    'message' => 'Empresa creada exitosamente desde RUT',
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la empresa: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function uploadBranchRut(Request $request, int $branchId, CompanyFileStorageService $fileStorage): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'rut_file' => 'required|file|mimes:pdf|max:5120',
        ]);

        $branch = \App\Models\Branch::findOrFail($branchId);
        $company = $branch->company;

        // Delete old RUT if exists
        if ($branch->rut_url) {
            $fileStorage->deleteFileFromUrl($branch->rut_url);
        }

        $rutUrl = $fileStorage->uploadFile($company, $request->file('rut_file'), 'rut');
        $branch->update(['rut_url' => $rutUrl]);

        return response()->json([
            'success' => true,
            'data' => $branch,
            'message' => 'RUT actualizado',
        ]);
    }

    public function deleteBranchRut(Request $request, int $branchId, CompanyFileStorageService $fileStorage): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $branch = \App\Models\Branch::findOrFail($branchId);

        if ($branch->rut_url) {
            $fileStorage->deleteFileFromUrl($branch->rut_url);
            $branch->update(['rut_url' => null]);
        }

        return response()->json([
            'success' => true,
            'message' => 'RUT eliminado',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:companies',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',
            'parent_id' => 'nullable|exists:companies,id',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
            'logo_url' => 'nullable|url',
        ]);

        // Generar slug automaticamente si no se proporciona
        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['name']);
            $slug = $baseSlug;
            $counter = 1;
            while (Company::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $company = Company::create($validated);

        return response()->json($company, 201);
    }

    public function show(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && !$request->user()->canAccessCompany($company->id)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($company->load('branches', 'parent', 'children'));
    }

    /**
     * Resumen/estadísticas de una empresa
     */
    public function summary(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $branchesCount = $company->branches()->count();
        $activeBranches = $company->branches()->where('is_active', true)->count();
        $usersCount = User::where('company_id', $company->id)->count();
        $activeUsers = User::where('company_id', $company->id)->where('is_active', true)->count();
        $productsCount = Product::where('company_id', $company->id)->count();
        $salesCount = Sale::where('company_id', $company->id)->count();
        $salesTotalYear = Sale::where('company_id', $company->id)
            ->whereYear('created_at', now()->year)
            ->sum('total_amount');

        $recentUsers = User::where('company_id', $company->id)
            ->with('roles')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $recentSales = Sale::where('company_id', $company->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'branches_count' => $branchesCount,
            'active_branches' => $activeBranches,
            'users_count' => $usersCount,
            'active_users' => $activeUsers,
            'products_count' => $productsCount,
            'sales_count' => $salesCount,
            'sales_total_year' => $salesTotalYear,
            'recent_users' => $recentUsers,
            'recent_sales' => $recentSales,
            'created_at' => $company->created_at,
            'is_franchise' => $company->parent_id !== null,
            'has_electronic_invoicing' => $company->electronic_invoicing_registered,
        ]);
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:companies,slug,' . $company->id,
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:500',
            'tax_id' => 'nullable|string|max:50',
            'parent_id' => 'nullable|exists:companies,id',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
            'logo_url' => 'nullable|url',
        ]);

        $company->update($validated);

        return response()->json($company);
    }

    public function destroy(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $company->delete();

        return response()->json(null, 204);
    }

    /**
     * Activar/desactivar una empresa
     */
    public function toggleActive(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $company->update(['is_active' => !$company->is_active]);

        return response()->json($company->load('branches'));
    }

    /**
     * Toggle a superpower (premium module) for a specific company.
     * Only Super Admin can do this.
     */
    public function toggleSuperpower(Request $request, Company $company): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'superpower' => 'required|string|in:service_orders_enabled',
            'enabled' => 'required|boolean',
        ]);

        $settings = $company->settings ?? [];
        $settings[$validated['superpower']] = $validated['enabled'];
        $company->settings = $settings;
        $company->save();

        return response()->json([
            'success' => true,
            'data' => ['settings' => $company->settings],
            'message' => $validated['enabled']
                ? 'Superpoder activado correctamente'
                : 'Superpoder desactivado correctamente',
        ]);
    }
}
