<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Company;
use App\Models\ElectronicCreditNote;
use App\Models\ElectronicDebitNote;
use App\Models\ElectronicInvoice;
use App\Models\InternalNote;
use App\Models\Sale;
use App\Models\SalePayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $query = Sale::withoutGlobalScopes()
            ->withTrashed()
            ->with([
                'company:id,name,tax_id',
                'client:id,name,email',
                'createdBy:id,name',
                'electronicInvoices.creditNote',
                'electronicInvoices.debitNote',
                'internalNotes',
            ]);

        // Filters
        $query->when($request->company_id, function ($q, $companyId) {
            $q->where('company_id', $companyId);
        });

        $query->when($request->type, function ($q, $type) {
            $q->where('type', $type);
        });

        $query->when($request->status, function ($q, $status) {
            $q->where('status', $status);
        });

        $query->when($request->date_from, function ($q, $dateFrom) {
            $q->whereDate('created_at', '>=', $dateFrom);
        });

        $query->when($request->date_to, function ($q, $dateTo) {
            $q->whereDate('created_at', '<=', $dateTo);
        });

        $query->when($request->search, function ($q, $search) {
            $q->where('invoice_number', 'like', "%{$search}%");
        });

        $sales = $query->orderBy('created_at', 'desc')
            ->limit(500)
            ->get();

        // Get activity logs for these sales
        $saleIds = $sales->pluck('id')->toArray();
        $activityLogs = [];

        if (!empty($saleIds)) {
            // Build mappings: related model ID -> sale_id

            // SalePayment -> Sale
            $paymentIdToSaleId = SalePayment::whereIn('sale_id', $saleIds)
                ->pluck('sale_id', 'id')
                ->toArray();

            // ElectronicInvoice -> Sale
            $eiIdToSaleId = ElectronicInvoice::whereIn('sale_id', $saleIds)
                ->pluck('sale_id', 'id')
                ->toArray();

            // ElectronicCreditNote -> Sale (via ElectronicInvoice)
            $creditNoteIdToSaleId = [];
            if (!empty($eiIdToSaleId)) {
                $creditNotes = ElectronicCreditNote::whereIn('electronic_invoice_id', array_keys($eiIdToSaleId))
                    ->get(['id', 'electronic_invoice_id']);
                foreach ($creditNotes as $cn) {
                    $creditNoteIdToSaleId[$cn->id] = $eiIdToSaleId[$cn->electronic_invoice_id];
                }
            }

            // ElectronicDebitNote -> Sale (via ElectronicInvoice)
            $debitNoteIdToSaleId = [];
            if (!empty($eiIdToSaleId)) {
                $debitNotes = ElectronicDebitNote::whereIn('electronic_invoice_id', array_keys($eiIdToSaleId))
                    ->get(['id', 'electronic_invoice_id']);
                foreach ($debitNotes as $dn) {
                    $debitNoteIdToSaleId[$dn->id] = $eiIdToSaleId[$dn->electronic_invoice_id];
                }
            }

            // InternalNote -> Sale
            $internalNoteIdToSaleId = InternalNote::withoutGlobalScopes()
                ->withTrashed()
                ->whereIn('sale_id', $saleIds)
                ->pluck('sale_id', 'id')
                ->toArray();

            $logs = ActivityLog::whereIn('subject_type', [
                    'App\\Models\\Sale',
                    'App\\Models\\SalePayment',
                    'App\\Models\\ElectronicInvoice',
                    'App\\Models\\ElectronicCreditNote',
                    'App\\Models\\ElectronicDebitNote',
                    'App\\Models\\InternalNote',
                ])
                ->with('causer:id,name')
                ->orderBy('created_at', 'asc')
                ->get();

            // Map logs to sale IDs
            foreach ($logs as $log) {
                $saleId = match ($log->subject_type) {
                    'App\\Models\\Sale' => in_array($log->subject_id, $saleIds) ? $log->subject_id : null,
                    'App\\Models\\SalePayment' => $paymentIdToSaleId[$log->subject_id] ?? null,
                    'App\\Models\\ElectronicInvoice' => $eiIdToSaleId[$log->subject_id] ?? null,
                    'App\\Models\\ElectronicCreditNote' => $creditNoteIdToSaleId[$log->subject_id] ?? null,
                    'App\\Models\\ElectronicDebitNote' => $debitNoteIdToSaleId[$log->subject_id] ?? null,
                    'App\\Models\\InternalNote' => $internalNoteIdToSaleId[$log->subject_id] ?? null,
                    default => null,
                };

                if ($saleId) {
                    $activityLogs[$saleId][] = [
                        'id' => $log->id,
                        'event' => $log->event,
                        'description' => $log->description,
                        'user' => $log->causer?->name ?? 'Sistema',
                        'ip_address' => $log->ip_address,
                        'properties' => $log->properties,
                        'created_at' => $log->created_at->toISOString(),
                    ];
                }
            }
        }

        // Group by company
        $grouped = $sales->groupBy('company_id');
        $companies = [];

        foreach ($grouped as $companyId => $companySales) {
            $company = $companySales->first()->company;

            $companySalesData = $companySales->map(function ($sale) use ($activityLogs) {
                $creditNote = null;
                $debitNote = null;

                foreach ($sale->electronicInvoices as $ei) {
                    if ($ei->creditNote) {
                        $creditNote = $ei->creditNote;
                    }
                    if ($ei->debitNote) {
                        $debitNote = $ei->debitNote;
                    }
                }

                return [
                    'id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'type' => $sale->type,
                    'type_label' => $sale->getTypeLabel(),
                    'status' => $sale->status,
                    'status_label' => $sale->getStatusLabel(),
                    'payment_status' => $sale->payment_status,
                    'payment_status_label' => $sale->getPaymentStatusLabel(),
                    'total_amount' => (float) $sale->total_amount,
                    'client_name' => $sale->client?->name ?? 'Sin cliente',
                    'created_by' => $sale->createdBy?->name ?? 'Sistema',
                    'created_at' => $sale->created_at->toISOString(),
                    'deleted_at' => $sale->deleted_at?->toISOString(),
                    'has_credit_note' => $creditNote !== null,
                    'credit_note_type' => $creditNote?->type,
                    'credit_note_number' => $creditNote?->number,
                    'has_debit_note' => $debitNote !== null,
                    'debit_note_number' => $debitNote?->number,
                    'has_internal_credit_note' => $sale->internalNotes->where('type', 'credit')->where('status', 'completed')->isNotEmpty(),
                    'has_internal_debit_note' => $sale->internalNotes->where('type', 'debit')->where('status', 'completed')->isNotEmpty(),
                    'internal_credit_note_total' => (float) $sale->internalNotes->where('type', 'credit')->where('status', 'completed')->sum('total_amount'),
                    'internal_debit_note_total' => (float) $sale->internalNotes->where('type', 'debit')->where('status', 'completed')->sum('total_amount'),
                    'is_cancelled' => $sale->status === 'cancelled' || $sale->deleted_at !== null,
                    'events' => $activityLogs[$sale->id] ?? [],
                ];
            })->values();

            $companies[] = [
                'id' => $company?->id ?? $companyId,
                'name' => $company?->name ?? 'Empresa desconocida',
                'nit' => $company?->tax_id ?? '',
                'sales_count' => $companySales->count(),
                'sales' => $companySalesData,
            ];
        }

        // Summary
        $summary = [
            'total_sales' => $sales->count(),
            'by_type' => [
                'pos' => $sales->where('type', 'pos')->count(),
                'electronic' => $sales->where('type', 'electronic')->count(),
                'account' => $sales->where('type', 'account')->count(),
                'credit' => $sales->where('type', 'credit')->count(),
            ],
            'total_credit_notes' => $sales->filter(fn ($s) =>
                $s->electronicInvoices->contains(fn ($ei) => $ei->creditNote !== null)
            )->count(),
            'total_debit_notes' => $sales->filter(fn ($s) =>
                $s->electronicInvoices->contains(fn ($ei) => $ei->debitNote !== null)
            )->count(),
            'total_cancelled' => $sales->where('status', 'cancelled')->count() + $sales->whereNotNull('deleted_at')->count(),
            'total_internal_credit_notes' => $sales->sum(fn ($s) => $s->internalNotes->where('type', 'credit')->where('status', 'completed')->count()),
            'total_internal_debit_notes' => $sales->sum(fn ($s) => $s->internalNotes->where('type', 'debit')->where('status', 'completed')->count()),
        ];

        // Companies list for filter
        $allCompanies = Company::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'companies' => $companies,
                'summary' => $summary,
                'available_companies' => $allCompanies,
            ],
            'message' => 'Auditoría de facturación cargada correctamente',
        ]);
    }
}
