<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\AccountingPlanExport;
use App\Models\AccountingAccount;
use App\Models\ActivityLog;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class AccountingAccountController extends Controller
{
    /**
     * Lista todas las cuentas (paginada, plana)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $accounts = AccountingAccount::where('company_id', $companyId)
                ->when($request->type, fn ($q, $type) => $q->where('type', $type))
                ->when($request->search, function ($q, $search) {
                    $q->where(function ($q2) use ($search) {
                        $q2->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
                })
                ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
                ->when($request->has('is_parent'), fn ($q) => $q->where('is_parent', $request->boolean('is_parent')))
                ->orderBy('code')
                ->paginate($request->per_page ?? 100);

            return response()->json([
                'success' => true,
                'data' => $accounts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener las cuentas contables',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Arbol jerarquico del plan de cuentas
     */
    public function tree(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $accounts = AccountingAccount::where('company_id', $companyId)
                ->whereNull('parent_id')
                ->with(['children' => function ($query) use ($companyId) {
                    $query->where('company_id', $companyId)->orderBy('code')
                        ->with(['children' => function ($q2) use ($companyId) {
                            $q2->where('company_id', $companyId)->orderBy('code')
                                ->with(['children' => function ($q3) use ($companyId) {
                                    $q3->where('company_id', $companyId)->orderBy('code')
                                        ->with(['children' => function ($q4) use ($companyId) {
                                            $q4->where('company_id', $companyId)->orderBy('code')
                                                ->with(['children' => fn ($q5) => $q5->where('company_id', $companyId)->orderBy('code')]);
                                        }]);
                                }]);
                        }]);
                }])
                ->orderBy('code')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $accounts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el arbol de cuentas',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Solo cuentas hoja (para selects/dropdowns)
     */
    public function leaf(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $accounts = AccountingAccount::where('company_id', $companyId)
                ->leaf()
                ->active()
                ->when($request->type, fn ($q, $type) => $q->where('type', $type))
                ->when($request->search, function ($q, $search) {
                    $q->where(function ($q2) use ($search) {
                        $q2->where('code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%");
                    });
                })
                ->orderBy('code')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $accounts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener cuentas hoja',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Detalle de una cuenta
     */
    public function show(AccountingAccount $account): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $account->load(['parent', 'children', 'cashRegisters', 'suppliers']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener la cuenta contable',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crear cuenta contable
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'code' => 'required|string|max:20',
                'name' => 'required|string|max:255',
                'type' => 'required|in:asset,liability,equity,revenue,expense,cost',
                'nature' => 'required|in:debit,credit',
                'parent_id' => 'nullable|exists:accounting_accounts,id',
                'level' => 'required|integer|min:1|max:6',
                'is_parent' => 'boolean',
                'description' => 'nullable|string',
            ]);

            $validated['company_id'] = $request->user()->company_id;
            $validated['is_active'] = true;

            $account = AccountingAccount::create($validated);

            ActivityLog::log(
                'Cuenta contable creada: ' . $account->code . ' - ' . $account->name,
                'created',
                $account
            );

            return response()->json([
                'success' => true,
                'data' => $account,
                'message' => 'Cuenta contable creada exitosamente',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validacion',
                'errors' => $e->errors(),
            ], 422);
        } catch (QueryException $e) {
            $message = str_contains($e->getMessage(), 'Duplicate entry')
                ? 'Ya existe una cuenta contable con el codigo ' . ($validated['code'] ?? '')
                : 'Error de base de datos al crear la cuenta contable';

            return response()->json([
                'success' => false,
                'message' => $message,
            ], 409);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear la cuenta contable: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar cuenta contable
     */
    public function update(Request $request, AccountingAccount $account): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'is_active' => 'sometimes|boolean',
                'is_parent' => 'sometimes|boolean',
            ]);

            $account->update($validated);

            return response()->json([
                'success' => true,
                'data' => $account->fresh(),
                'message' => 'Cuenta contable actualizada exitosamente',
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de base de datos al actualizar la cuenta contable',
            ], 409);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar la cuenta contable: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Eliminar cuenta contable
     */
    public function destroy(AccountingAccount $account): JsonResponse
    {
        try {
            // Verificar que no tenga movimientos
            if ($account->journalEntryLines()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar una cuenta con movimientos contables. Desactivela en su lugar.',
                ], 400);
            }

            // Verificar que no tenga hijos
            if ($account->children()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar una cuenta que tiene subcuentas',
                ], 400);
            }

            $account->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cuenta contable eliminada exitosamente',
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la cuenta porque tiene registros asociados en el sistema',
            ], 409);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la cuenta contable: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vincular caja a cuenta contable
     */
    public function linkCashRegister(Request $request, AccountingAccount $account): JsonResponse
    {
        try {
            $validated = $request->validate([
                'cash_register_id' => 'required|exists:cash_registers,id',
            ]);

            // Desvincular caja de cualquier otra cuenta primero
            \DB::table('accounting_account_cash_register')
                ->where('cash_register_id', $validated['cash_register_id'])
                ->delete();

            $account->cashRegisters()->attach($validated['cash_register_id'], ['is_active' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Caja vinculada exitosamente',
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Esta caja ya esta vinculada a esta cuenta contable',
            ], 409);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al vincular la caja: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Desvincular caja de cuenta contable
     */
    public function unlinkCashRegister(AccountingAccount $account, int $cashRegisterId): JsonResponse
    {
        try {
            $account->cashRegisters()->detach($cashRegisterId);

            return response()->json([
                'success' => true,
                'message' => 'Caja desvinculada exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al desvincular la caja: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vincular proveedor a cuenta contable
     */
    public function linkSupplier(Request $request, AccountingAccount $account): JsonResponse
    {
        try {
            $validated = $request->validate([
                'supplier_id' => 'required|exists:suppliers,id',
            ]);

            // Desvincular proveedor de cualquier otra cuenta primero
            \DB::table('accounting_account_supplier')
                ->where('supplier_id', $validated['supplier_id'])
                ->delete();

            $account->suppliers()->attach($validated['supplier_id'], ['is_active' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Proveedor vinculado exitosamente',
            ]);
        } catch (QueryException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Este proveedor ya esta vinculado a esta cuenta contable',
            ], 409);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al vincular el proveedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Desvincular proveedor de cuenta contable
     */
    public function unlinkSupplier(AccountingAccount $account, int $supplierId): JsonResponse
    {
        try {
            $account->suppliers()->detach($supplierId);

            return response()->json([
                'success' => true,
                'message' => 'Proveedor desvinculado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al desvincular el proveedor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exportar plan de cuentas en PDF o Excel
     */
    public function export(Request $request)
    {
        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
            'type_filter' => 'nullable|string',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;
        $format = $validated['format'];

        // Get tree data
        $accounts = AccountingAccount::where('company_id', $companyId)
            ->whereNull('parent_id')
            ->with(['children' => function ($query) use ($companyId) {
                $query->where('company_id', $companyId)->orderBy('code')
                    ->with(['children' => function ($q2) use ($companyId) {
                        $q2->where('company_id', $companyId)->orderBy('code')
                            ->with(['children' => function ($q3) use ($companyId) {
                                $q3->where('company_id', $companyId)->orderBy('code')
                                    ->with(['children' => function ($q4) use ($companyId) {
                                        $q4->where('company_id', $companyId)->orderBy('code')
                                            ->with(['children' => fn ($q5) => $q5->where('company_id', $companyId)->orderBy('code')]);
                                    }]);
                            }]);
                    }]);
            }])
            ->orderBy('code')
            ->get();

        // Flatten for counting
        $allAccounts = $this->flattenAccountsForExport($accounts->toArray());
        $total = count($allAccounts);
        $active = count(array_filter($allAccounts, fn($a) => $a['is_active']));
        $byType = [];
        foreach ($allAccounts as $a) {
            $type = $a['type'];
            $byType[$type] = ($byType[$type] ?? 0) + 1;
        }

        $data = [
            'totals' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $total - $active,
                'by_type' => $byType,
            ],
            'items' => $this->mapTreeForExport($accounts->toArray()),
        ];

        $filename = 'plan_de_cuentas_' . now('America/Bogota')->format('Y-m-d_His');

        if ($format === 'excel') {
            return Excel::download(
                new AccountingPlanExport($data),
                $filename . '.xlsx'
            );
        }

        // PDF
        ini_set('memory_limit', '512M');

        $company = $user->company ?? (object) [
            'name' => 'LEGAL SISTEMA',
            'tax_id' => '',
            'address' => '',
        ];

        $flatItems = $this->flattenTreeForPdf($data['items'] ?? []);

        $pdf = Pdf::loadView('pdf.accounting-plan', [
            'data' => $data,
            'flatItems' => $flatItems,
            'company' => $company,
        ])
            ->setPaper('letter', 'portrait')
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }

    private function flattenTreeForPdf(array $accounts, int $depth = 0): array
    {
        $result = [];
        foreach ($accounts as $account) {
            $result[] = [
                'code' => $account['code'],
                'name' => $account['name'],
                'type' => $account['type'],
                'nature' => $account['nature'],
                'level' => $account['level'] ?? ($depth + 1),
                'is_active' => (bool) $account['is_active'],
                'is_parent_row' => !empty($account['children']),
                'parent_code' => $account['parent_code'] ?? '',
                'depth' => $depth,
            ];
            if (!empty($account['children'])) {
                $result = array_merge($result, $this->flattenTreeForPdf($account['children'], $depth + 1));
            }
        }
        return $result;
    }

    private function flattenAccountsForExport(array $accounts): array
    {
        $result = [];
        foreach ($accounts as $account) {
            $result[] = $account;
            if (!empty($account['children'])) {
                $result = array_merge($result, $this->flattenAccountsForExport($account['children']));
            }
        }
        return $result;
    }

    private function mapTreeForExport(array $accounts, string $parentCode = ''): array
    {
        return array_map(function ($account) use ($parentCode) {
            $mapped = [
                'code' => $account['code'],
                'name' => $account['name'],
                'type' => $account['type'],
                'nature' => $account['nature'],
                'level' => $account['level'] ?? 1,
                'is_active' => (bool) $account['is_active'],
                'is_parent' => (bool) ($account['is_parent'] ?? false),
                'parent_code' => $parentCode,
                'children' => [],
            ];
            if (!empty($account['children'])) {
                $mapped['children'] = $this->mapTreeForExport($account['children'], $account['code']);
            }
            return $mapped;
        }, $accounts);
    }
}
