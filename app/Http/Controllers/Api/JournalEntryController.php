<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Exports\JournalEntryExport;
use App\Exports\JournalEntryDetailExport;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class JournalEntryController extends Controller
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Lista registros contables con filtros
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $companyId = $request->user()->company_id;

            $entries = JournalEntry::where('company_id', $companyId)
                ->with(['createdBy:id,name', 'lines.accountingAccount:id,code,name'])
                ->when($request->date_from, fn ($q, $d) => $q->where('date', '>=', $d))
                ->when($request->date_to, fn ($q, $d) => $q->where('date', '<=', $d))
                ->when($request->status, fn ($q, $s) => $q->where('status', $s))
                ->when($request->source, fn ($q, $s) => $q->where('source', $s))
                ->when($request->search, function ($q, $search) {
                    $q->where(function ($q2) use ($search) {
                        $q2->where('entry_number', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                })
                ->orderByDesc('date')
                ->orderByDesc('id')
                ->paginate($request->per_page ?? 20);

            return response()->json([
                'success' => true,
                'data' => $entries,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los registros contables: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Detalle de un asiento con sus lineas
     */
    public function show(JournalEntry $entry): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $entry->load([
                    'lines.accountingAccount:id,code,name,type,nature',
                    'createdBy:id,name,email',
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el registro contable: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Crear asiento manual
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'date' => 'required|date',
                'description' => 'required|string|max:500',
                'notes' => 'nullable|string',
                'auto_post' => 'boolean',
                'lines' => 'required|array|min:2',
                'lines.*.account_id' => 'required|exists:accounting_accounts,id',
                'lines.*.debit' => 'required|numeric|min:0',
                'lines.*.credit' => 'required|numeric|min:0',
                'lines.*.description' => 'nullable|string|max:500',
            ]);

            $entry = $this->accountingService->createJournalEntry(
                [
                    'company_id' => $request->user()->company_id,
                    'branch_id' => $request->user()->branch_id,
                    'date' => $validated['date'],
                    'description' => $validated['description'],
                    'notes' => $validated['notes'] ?? null,
                    'lines' => $validated['lines'],
                ],
                $request->user()->id,
                $validated['auto_post'] ?? false
            );

            return response()->json([
                'success' => true,
                'data' => $entry->load('lines.accountingAccount'),
                'message' => 'Registro contable creado exitosamente',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos del registro invalidos. Verifique las lineas y cuentas.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo crear el registro: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Publicar un asiento borrador
     */
    public function post(JournalEntry $entry): JsonResponse
    {
        try {
            $this->accountingService->postEntry($entry);

            return response()->json([
                'success' => true,
                'data' => $entry->fresh()->load('lines.accountingAccount'),
                'message' => 'Registro publicado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo publicar el registro: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Anular un asiento publicado
     */
    public function void(Request $request, JournalEntry $entry): JsonResponse
    {
        try {
            $validated = $request->validate([
                'void_reason' => 'required|string|max:500',
            ]);

            $reversalEntry = $this->accountingService->voidEntry($entry, $validated['void_reason']);

            return response()->json([
                'success' => true,
                'data' => $reversalEntry->load('lines.accountingAccount'),
                'message' => 'Registro anulado exitosamente. Se creo registro de reverso.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'No se pudo anular el registro: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Exportar el detalle de un único asiento (PDF o Excel)
     */
    public function exportSingle(Request $request, JournalEntry $entry)
    {
        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
        ]);

        $entry->load([
            'lines.accountingAccount:id,code,name,type,nature',
            'createdBy:id,name',
        ]);

        $format   = $validated['format'];
        $filename = 'comprobante_' . $entry->entry_number . '_' . now('America/Bogota')->format('Y-m-d_His');

        if ($format === 'excel') {
            return Excel::download(
                new JournalEntryDetailExport($entry),
                $filename . '.xlsx'
            );
        }

        // PDF
        ini_set('memory_limit', '512M');

        $user    = $request->user();
        $company = $user->company ?? (object) ['name' => 'LEGAL SISTEMA', 'tax_id' => '', 'address' => ''];

        $pdf = Pdf::loadView('pdf.journal-entry-detail', [
            'entry'   => $entry,
            'company' => $company,
        ])
            ->setPaper('letter', 'portrait')
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }

    /**
     * Exportar registros contables en PDF o Excel
     */
    public function export(Request $request)
    {
        $validated = $request->validate([
            'format' => 'required|in:pdf,excel',
            'status' => 'nullable|in:draft,posted,voided',
            'source' => 'nullable|in:manual,automatic',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'search' => 'nullable|string',
        ]);

        $user = $request->user();
        $companyId = $user->company_id;
        $format = $validated['format'];

        $entries = JournalEntry::where('company_id', $companyId)
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->source, fn ($q, $s) => $q->where('source', $s))
            ->when($request->date_from, fn ($q, $d) => $q->where('date', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->where('date', '<=', $d))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q2) use ($search) {
                    $q2->where('entry_number', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        $items = $entries->map(fn ($e) => [
            'entry_number' => $e->entry_number,
            'date' => $e->date,
            'description' => $e->description,
            'total_debit' => $e->total_debit,
            'total_credit' => $e->total_credit,
            'source' => $e->source,
            'status' => $e->status,
        ])->toArray();

        $totals = [
            'total' => $entries->count(),
            'posted' => $entries->where('status', 'posted')->count(),
            'draft' => $entries->where('status', 'draft')->count(),
            'voided' => $entries->where('status', 'voided')->count(),
            'total_debit' => $entries->sum('total_debit'),
            'total_credit' => $entries->sum('total_credit'),
        ];

        $data = [
            'totals' => $totals,
            'items' => $items,
        ];

        $filename = 'registros_contables_' . now('America/Bogota')->format('Y-m-d_His');

        if ($format === 'excel') {
            return Excel::download(
                new JournalEntryExport($data),
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

        $pdf = Pdf::loadView('pdf.journal-entries', [
            'items' => $items,
            'totals' => $totals,
            'company' => $company,
            'dateFrom' => $request->date_from,
            'dateTo' => $request->date_to,
        ])
            ->setPaper('letter', 'portrait')
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }
}
