<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrashController extends Controller
{
    private function getModelRegistry(): array
    {
        return [
            'sales' => [
                'model' => Sale::class,
                'relations' => ['client', 'seller', 'branch'],
                'searchable' => ['invoice_number'],
                'restorable' => false,
            ],
            'clients' => [
                'model' => User::class,
                'relations' => ['roles'],
                'searchable' => ['name', 'email', 'document_id', 'phone'],
                'scope' => 'clients',
                'restorable' => true,
            ],
            'products' => [
                'model' => Product::class,
                'relations' => ['category', 'area', 'supplier'],
                'searchable' => ['name', 'sku', 'barcode'],
                'restorable' => true,
            ],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type', 'products');
        $registry = $this->getModelRegistry();

        if (!isset($registry[$type])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Tipo no válido',
            ], 400);
        }

        $config = $registry[$type];
        $modelClass = $config['model'];

        $query = $modelClass::onlyTrashed()->with($config['relations']);

        $this->applyCompanyScope($query, $request, $config);

        if ($request->search) {
            $search = $request->search;
            $searchable = $config['searchable'];
            $query->where(function ($q) use ($search, $searchable) {
                foreach ($searchable as $column) {
                    $q->orWhere($column, 'like', "%{$search}%");
                }
            });
        }

        $query->orderBy('deleted_at', 'desc');

        $perPage = $request->query('per_page', 15);
        $items = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'restorable' => $config['restorable'],
            ],
            'message' => 'Elementos eliminados obtenidos',
        ]);
    }

    public function restore(Request $request, string $type, int $id): JsonResponse
    {
        $registry = $this->getModelRegistry();

        if (!isset($registry[$type])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Tipo no válido',
            ], 400);
        }

        $config = $registry[$type];

        if (!$config['restorable']) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Este tipo de registro no se puede restaurar',
            ], 403);
        }

        $modelClass = $config['model'];

        $query = $modelClass::onlyTrashed();
        $this->applyCompanyScope($query, $request, $config);

        $record = $query->find($id);

        if (!$record) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Registro no encontrado en la papelera',
            ], 404);
        }

        $record->restore();

        return response()->json([
            'success' => true,
            'data' => $record->load($config['relations']),
            'message' => 'Registro restaurado exitosamente',
        ]);
    }

    private function applyCompanyScope($query, Request $request, array $config): void
    {
        $scope = $config['scope'] ?? null;

        if ($scope === 'clients') {
            $clientRole = Role::where('slug', 'client')->first();
            if ($clientRole) {
                $query->whereHas('roles', function ($q) use ($clientRole) {
                    $q->where('roles.id', $clientRole->id);
                });
            }
            if (!$request->user()->isSuperAdmin()) {
                $query->where('company_id', $request->user()->company_id);
            }
        }
        // Product y Sale usan BelongsToCompany → CompanyScope se aplica automáticamente
    }
}
