<?php

namespace App\Http\Controllers\Api;

use App\Exports\ReportExport;
use App\Exports\ThirdPartySubledgerExport;
use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\AccountingService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AccountingReportController extends Controller
{
    public function __construct(protected AccountingService $accountingService)
    {
    }

    /**
     * Balance de Comprobacion
     */
    public function trialBalance(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            $data = $this->accountingService->getTrialBalance(
                $request->user()->company_id,
                $request->date_from,
                $request->date_to
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el balance de comprobacion: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Libro Mayor
     */
    public function generalLedger(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'account_id' => 'required|exists:accounting_accounts,id',
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            $data = $this->accountingService->getGeneralLedger(
                $request->account_id,
                $request->date_from,
                $request->date_to
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el libro mayor: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Libro Diario
     */
    public function journalBook(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            $entries = JournalEntry::where('company_id', $request->user()->company_id)
                ->where('status', 'posted')
                ->whereBetween('date', [$request->date_from, $request->date_to])
                ->with(['lines.accountingAccount:id,code,name', 'createdBy:id,name'])
                ->orderBy('date')
                ->orderBy('entry_number')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $entries,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el libro diario: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Estado de Resultados Integral (PyG)
     */
    public function incomeStatement(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            $data = $this->accountingService->getIncomeStatement(
                $request->user()->company_id,
                $request->date_from,
                $request->date_to
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el estado de resultados integral:' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Auxiliar de Cuenta Contable
     */
    public function accountSubledger(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'code_from' => 'nullable|string',
                'code_to' => 'nullable|string',
            ]);

            $data = $this->accountingService->getAccountSubledger(
                $request->user()->company_id,
                $request->date_from,
                $request->date_to,
                $request->code_from,
                $request->code_to
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el auxiliar de cuenta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Auxiliar por Tercero
     */
    public function thirdPartySubledger(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'account_id' => 'nullable|exists:accounting_accounts,id',
                'third_party_type' => 'nullable|in:supplier,client',
                'third_party_id' => 'nullable|integer',
            ]);

            $data = $this->accountingService->getThirdPartySubledger(
                $request->user()->company_id,
                $request->date_from,
                $request->date_to,
                $request->account_id ? (int) $request->account_id : null,
                $request->third_party_type,
                $request->third_party_id ? (int) $request->third_party_id : null
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el auxiliar por tercero: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exportar Auxiliar por Tercero a PDF o Excel
     */
    public function exportThirdPartySubledger(Request $request): BinaryFileResponse|JsonResponse|Response
    {
        ini_set('memory_limit', '512M');
        try {
            $request->validate([
                'format' => 'required|in:pdf,excel',
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'account_id' => 'nullable|exists:accounting_accounts,id',
                'third_party_type' => 'nullable|in:supplier,client',
                'third_party_id' => 'nullable|integer',
            ]);

            $companyId = $request->user()->company_id;
            $dateFrom = $request->date_from;
            $dateTo = $request->date_to;
            $format = $request->format;

            $data = $this->accountingService->getThirdPartySubledger(
                $companyId,
                $dateFrom,
                $dateTo,
                $request->account_id ? (int) $request->account_id : null,
                $request->third_party_type,
                $request->third_party_id ? (int) $request->third_party_id : null
            );

            $grandTotalDebit = array_sum(array_column($data, 'total_debit'));
            $grandTotalCredit = array_sum(array_column($data, 'total_credit'));
            $grandTotalDifference = $grandTotalDebit - $grandTotalCredit;

            $filename = 'auxiliar_tercero_' . now('America/Bogota')->format('Y-m-d_His');

            if ($format === 'excel') {
                $export = new ThirdPartySubledgerExport(
                    $data,
                    $grandTotalDebit,
                    $grandTotalCredit,
                    $grandTotalDifference,
                    $dateFrom,
                    $dateTo
                );

                return Excel::download($export, $filename . '.xlsx');
            }

            // PDF
            $company = $request->user()->company;

            $pdf = Pdf::loadView('pdf.third-party-subledger', [
                'company' => $company,
                'dateFrom' => $dateFrom,
                'dateTo' => $dateTo,
                'entries' => $data,
                'grandTotalDebit' => $grandTotalDebit,
                'grandTotalCredit' => $grandTotalCredit,
                'grandTotalDifference' => $grandTotalDifference,
            ])
                ->setPaper('letter', 'portrait')
                ->setOption('enable-local-file-access', true);

            return $pdf->download($filename . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar el auxiliar por tercero: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exportar reportes contables a PDF o Excel
     */
    public function exportReport(Request $request): BinaryFileResponse|JsonResponse|Response
    {
        ini_set('memory_limit', '512M');
        try {
            $validReports = [
                'trial-balance',
                'general-ledger',
                'journal-book',
                'income-statement',
                'balance-sheet',
                'account-subledger',
            ];

            $reportTitles = [
                'trial-balance' => 'Balance de Comprobación',
                'general-ledger' => 'Libro Mayor',
                'journal-book' => 'Libro Diario',
                'income-statement' => 'Estado de Resultados',
                'balance-sheet' => 'Estado de Situación Financiera',
                'account-subledger' => 'Auxiliar de Cuenta Contable',
            ];

            $request->validate([
                'format' => 'required|in:pdf,excel',
                'report_type' => 'required|in:' . implode(',', $validReports),
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'account_id' => 'nullable|exists:accounting_accounts,id',
                'code_from' => 'nullable|string',
                'code_to' => 'nullable|string',
            ]);

            $companyId = $request->user()->company_id;
            $dateFrom = $request->date_from;
            $dateTo = $request->date_to;
            $format = $request->format;
            $reportType = $request->report_type;

            // Get report data by calling the existing methods
            $data = $this->getReportData($request, $reportType, $companyId, $dateFrom, $dateTo);

            $title = $reportTitles[$reportType] ?? 'Reporte';
            $periodLabel = $dateFrom . ' a ' . $dateTo;
            $filename = str_replace(' ', '_', strtolower($title)) . '_' . now('America/Bogota')->format('Y-m-d_His');

            if ($format === 'excel') {
                return Excel::download(
                    new ReportExport($data, $reportType, $title, $periodLabel),
                    $filename . '.xlsx'
                );
            }

            // PDF
            $company = $request->user()->company ?? (object) [
                'name' => 'LEGAL SISTEMA',
                'tax_id' => '',
                'address' => '',
                'city' => '',
            ];

            $pdf = Pdf::loadView('pdf.report', [
                'data' => $data,
                'report_type' => $reportType,
                'title' => $title,
                'period_label' => $periodLabel,
                'company' => $company,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ])
                ->setPaper('letter', 'portrait')
                ->setOption('isHtml5ParserEnabled', true);

            return $pdf->download($filename . '.pdf');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar el reporte: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get report data based on report type
     */
    private function getReportData(Request $request, string $reportType, int $companyId, string $dateFrom, string $dateTo): array
    {
        $makeRequest = function (array $params) use ($request) {
            $sub = Request::create('', 'GET', $params);
            $sub->setUserResolver($request->getUserResolver());
            return $sub;
        };

        switch ($reportType) {
            case 'trial-balance':
                $response = $this->trialBalance($makeRequest([
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]));
                return json_decode($response->getContent(), true)['data'];

            case 'general-ledger':
                $response = $this->generalLedger($makeRequest([
                    'account_id' => $request->account_id,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]));
                return json_decode($response->getContent(), true)['data'];

            case 'journal-book':
                $response = $this->journalBook($makeRequest([
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]));
                return json_decode($response->getContent(), true)['data'];

            case 'income-statement':
                $response = $this->incomeStatement($makeRequest([
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]));
                return json_decode($response->getContent(), true)['data'];

            case 'balance-sheet':
                $response = $this->balanceSheet($makeRequest([
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]));
                return json_decode($response->getContent(), true)['data'];

            case 'account-subledger':
                $response = $this->accountSubledger($makeRequest([
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'code_from' => $request->code_from,
                    'code_to' => $request->code_to,
                ]));
                return json_decode($response->getContent(), true)['data'];

            default:
                return [];
        }
    }

    /**
     * Estado de Situacion Financiera
     */
    public function balanceSheet(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            $data = $this->accountingService->getBalanceSheet(
                $request->user()->company_id,
                $request->date_from,
                $request->date_to
            );

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el estado de situacion financiera: ' . $e->getMessage(),
            ], 500);
        }
    }
}
