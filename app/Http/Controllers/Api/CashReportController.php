<?php

namespace App\Http\Controllers\Api;

use App\Exports\CashFlowExport;
use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CashRegister;
use App\Models\CashRegisterSession;
use App\Models\CashRegisterTransfer;
use App\Models\InventoryPurchase;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Sale;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class CashReportController extends Controller
{
    /**
     * Reporte de flujo de caja
     */
    public function cashFlow(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-reports.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para ver reportes de caja',
                ], 403);
            }

            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'cash_register_id' => 'nullable|exists:cash_registers,id',
                'session_id' => 'nullable|exists:cash_register_sessions,id',
                'branch_id' => 'nullable|exists:branches,id',
            ]);

            // Obtener saldo inicial (pagos antes de date_from)
            $openingBalanceQuery = Payment::where('status', 'completed')
                ->whereDate('payment_date', '<', $validated['date_from'])
                ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                    $query->where('cash_register_id', $cashRegisterId);
                })
                ->when($request->session_id, function ($query, $sessionId) {
                    $query->where('cash_register_session_id', $sessionId);
                })
                ->when($request->branch_id, function ($query, $branchId) {
                    $query->where('branch_id', $branchId);
                });

            $openingIncome = (clone $openingBalanceQuery)->where('type', 'income')->sum('amount');
            $openingExpense = (clone $openingBalanceQuery)->where('type', 'expense')->sum('amount');
            $openingBalance = (float) ($openingIncome - $openingExpense);

            // Obtener pagos en el rango de fechas
            $payments = Payment::with([
                    'cashRegister', 'paymentMethod', 'createdBy',
                    'reference' => function ($morphTo) {
                        $morphTo->morphWith([
                            Sale::class => ['client:id,name,document_id', 'seller:id,name', 'items'],
                            InventoryPurchase::class => ['supplier:id,name,tax_id', 'items'],
                        ]);
                    },
                ])
                ->whereBetween('payment_date', [$validated['date_from'], $validated['date_to']])
                ->where('status', 'completed')
                ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                    $query->where('cash_register_id', $cashRegisterId);
                })
                ->when($request->session_id, function ($query, $sessionId) {
                    $query->where('cash_register_session_id', $sessionId);
                })
                ->when($request->branch_id, function ($query, $branchId) {
                    $query->where('branch_id', $branchId);
                })
                ->orderBy('payment_date')
                ->orderBy('id')
                ->get();

            // Calcular totales
            $totalIncome = (float) $payments->where('type', 'income')->sum('amount');
            $totalExpense = (float) $payments->where('type', 'expense')->sum('amount');
            $closingBalance = $openingBalance + $totalIncome - $totalExpense;

            // Construir array de transacciones con saldo corrido
            $runningBalance = $openingBalance;
            $transactions = $payments->map(function ($payment) use (&$runningBalance) {
                if ($payment->type === 'income') {
                    $runningBalance += (float) $payment->amount;
                } else {
                    $runningBalance -= (float) $payment->amount;
                }

                return array_merge([
                    'date' => $payment->payment_date->toISOString(),
                    'type' => $payment->type,
                    'concept' => $payment->concept ?? $payment->notes ?? 'Sin concepto',
                    'amount' => (float) $payment->amount,
                    'balance' => $runningBalance,
                    'payment_number' => $payment->payment_number,
                    'payment_method' => $payment->paymentMethod->name ?? 'N/A',
                    'cash_register' => $payment->cashRegister->name ?? 'N/A',
                ], $this->getTransactionReferenceData($payment));
            })->values()->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'period_start' => $validated['date_from'],
                    'period_end' => $validated['date_to'],
                    'opening_balance' => $openingBalance,
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'closing_balance' => $closingBalance,
                    'transactions' => $transactions,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el reporte de flujo de caja',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reporte por caja registradora específica
     */
    public function byRegister(Request $request, CashRegister $cashRegister): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-reports.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para ver reportes de caja',
                ], 403);
            }

            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
            ]);

            // Obtener sesiones de la caja en el período (solo para cajas menores)
            $sessions = collect();
            if ($cashRegister->type === 'minor') {
                $sessions = CashRegisterSession::where('cash_register_id', $cashRegister->id)
                    ->where(function ($query) use ($validated) {
                        $query->whereBetween('opened_at', [$validated['date_from'], $validated['date_to'] . ' 23:59:59'])
                            ->orWhere(function ($q) use ($validated) {
                                $q->where('opened_at', '<', $validated['date_from'])
                                    ->where(function ($q2) use ($validated) {
                                        $q2->whereNull('closed_at')
                                            ->orWhere('closed_at', '>=', $validated['date_from']);
                                    });
                            });
                    })
                    ->with(['openedBy', 'closedBy'])
                    ->orderBy('opened_at', 'desc')
                    ->get()
                    ->map(function ($session) {
                        return [
                            'session_number' => 'SES-' . str_pad($session->id, 6, '0', STR_PAD_LEFT),
                            'opened_at' => $session->opened_at->toISOString(),
                            'closed_at' => $session->closed_at?->toISOString(),
                            'status' => $session->closed_at ? 'closed' : 'open',
                            'opening_balance' => (float) $session->opening_balance,
                            'closing_balance' => $session->closed_at ? (float) ($session->closing_balance ?? ($session->opening_balance + $session->total_income - $session->total_expense)) : null,
                            'total_income' => (float) $session->total_income,
                            'total_expense' => (float) $session->total_expense,
                            'opened_by' => $session->openedBy?->name,
                            'closed_by' => $session->closedBy?->name,
                        ];
                    });
            }

            // Obtener totales de pagos en el período
            $payments = Payment::where('cash_register_id', $cashRegister->id)
                ->whereBetween('payment_date', [$validated['date_from'], $validated['date_to']])
                ->where('status', 'completed')
                ->with([
                    'paymentMethod',
                    'reference' => function ($morphTo) {
                        $morphTo->morphWith([
                            Sale::class => ['client:id,name,document_id', 'seller:id,name', 'items'],
                            InventoryPurchase::class => ['supplier:id,name,tax_id', 'items'],
                        ]);
                    },
                ])
                ->get();

            $totalIncome = (float) $payments->where('type', 'income')->sum('amount');
            $totalExpense = (float) $payments->where('type', 'expense')->sum('amount');

            // Obtener detalle de pagos para la tabla de transacciones
            $paymentTransactions = $payments->map(function ($payment) {
                return array_merge([
                    'date' => $payment->payment_date?->toISOString(),
                    'payment_number' => $payment->payment_number,
                    'type' => $payment->type,
                    'concept' => $payment->concept,
                    'payment_method' => $payment->paymentMethod?->name ?? '-',
                    'amount' => (float) $payment->amount,
                ], $this->getTransactionReferenceData($payment));
            });

            // Obtener transferencias enviadas (registros individuales)
            $transfersSentRecords = CashRegisterTransfer::where('source_cash_register_id', $cashRegister->id)
                ->whereBetween('created_at', [$validated['date_from'], $validated['date_to'] . ' 23:59:59'])
                ->where('status', 'completed')
                ->with('destinationCashRegister')
                ->get();

            // Obtener transferencias recibidas (registros individuales)
            $transfersReceivedRecords = CashRegisterTransfer::where('destination_cash_register_id', $cashRegister->id)
                ->whereBetween('created_at', [$validated['date_from'], $validated['date_to'] . ' 23:59:59'])
                ->where('status', 'completed')
                ->with('sourceCashRegister')
                ->get();

            $transfersSent = (float) $transfersSentRecords->sum('amount');
            $transfersReceived = (float) $transfersReceivedRecords->sum('amount');

            // Mapear transferencias enviadas como transacciones de egreso
            $transferSentTransactions = $transfersSentRecords->map(function ($transfer) {
                return [
                    'date' => $transfer->created_at->toISOString(),
                    'payment_number' => $transfer->transfer_number,
                    'type' => 'transfer_out',
                    'concept' => 'Transferencia a ' . ($transfer->destinationCashRegister?->name ?? '-'),
                    'payment_method' => 'Transferencia',
                    'amount' => (float) $transfer->amount,
                ];
            });

            // Mapear transferencias recibidas como transacciones de ingreso
            $transferReceivedTransactions = $transfersReceivedRecords->map(function ($transfer) {
                return [
                    'date' => $transfer->created_at->toISOString(),
                    'payment_number' => $transfer->transfer_number,
                    'type' => 'transfer_in',
                    'concept' => 'Transferencia desde ' . ($transfer->sourceCashRegister?->name ?? '-'),
                    'payment_method' => 'Transferencia',
                    'amount' => (float) $transfer->amount,
                ];
            });

            // Combinar pagos y transferencias, ordenar por fecha
            $transactions = $paymentTransactions
                ->concat($transferSentTransactions)
                ->concat($transferReceivedTransactions)
                ->sortByDesc('date')
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'cash_register' => [
                        'id' => $cashRegister->id,
                        'name' => $cashRegister->name,
                        'type' => $cashRegister->type,
                        'current_balance' => (float) $cashRegister->current_balance,
                        'status' => $cashRegister->status,
                    ],
                    'period_start' => $validated['date_from'],
                    'period_end' => $validated['date_to'],
                    'sessions_count' => $sessions->count(),
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'total_transfers_sent' => $transfersSent,
                    'total_transfers_received' => $transfersReceived,
                    'transactions' => $transactions,
                    'sessions' => $sessions,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el reporte por caja',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reporte global de cajas
     */
    public function global(Request $request): JsonResponse
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-reports.view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para ver reportes de caja',
                ], 403);
            }

            $validated = $request->validate([
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'branch_id' => 'nullable|exists:branches,id',
            ]);

            // Obtener pagos en el período
            $paymentsQuery = Payment::whereBetween('payment_date', [$validated['date_from'], $validated['date_to']])
                ->where('status', 'completed')
                ->when($request->branch_id, function ($query, $branchId) {
                    $query->where('branch_id', $branchId);
                });

            $payments = $paymentsQuery->get();

            // Calcular totales generales
            $totalIncome = (float) $payments->where('type', 'income')->sum('amount');
            $totalExpense = (float) $payments->where('type', 'expense')->sum('amount');
            $netCashFlow = $totalIncome - $totalExpense;

            // Agrupar por sucursal
            $byBranch = $payments->groupBy('branch_id')->map(function ($branchPayments, $branchId) {
                $branch = Branch::find($branchId);
                $income = (float) $branchPayments->where('type', 'income')->sum('amount');
                $expense = (float) $branchPayments->where('type', 'expense')->sum('amount');

                return [
                    'branch_id' => (int) $branchId,
                    'branch_name' => $branch?->name ?? 'Sin sucursal',
                    'total_income' => $income,
                    'total_expense' => $expense,
                    'net_cash_flow' => $income - $expense,
                ];
            })->values()->toArray();

            // Agrupar por método de pago
            $byPaymentMethod = $payments->groupBy('payment_method_id')->map(function ($methodPayments, $methodId) {
                $method = PaymentMethod::find($methodId);
                $income = (float) $methodPayments->where('type', 'income')->sum('amount');
                $expense = (float) $methodPayments->where('type', 'expense')->sum('amount');

                return [
                    'payment_method_id' => (int) $methodId,
                    'payment_method_name' => $method?->name ?? 'Sin método',
                    'total_income' => $income,
                    'total_expense' => $expense,
                    'net_amount' => $income - $expense,
                ];
            })->values()->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'period_start' => $validated['date_from'],
                    'period_end' => $validated['date_to'],
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'net_cash_flow' => $netCashFlow,
                    'by_branch' => $byBranch,
                    'by_payment_method' => $byPaymentMethod,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar el reporte global',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exporta un reporte a Excel o PDF
     */
    public function export(Request $request): BinaryFileResponse|JsonResponse|Response
    {
        try {
            // Verificar permisos
            if (!$request->user()->hasPermission('cash-reports.export')) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tiene permisos para exportar reportes',
                ], 403);
            }

            $validated = $request->validate([
                'report_type' => 'required|in:cash_flow,by_register,global',
                'format' => 'required|in:excel,pdf',
                'date_from' => 'required|date',
                'date_to' => 'required|date|after_or_equal:date_from',
                'cash_register_id' => 'nullable|exists:cash_registers,id',
                'session_id' => 'nullable|exists:cash_register_sessions,id',
                'branch_id' => 'nullable|exists:branches,id',
            ]);

            $reportType = $validated['report_type'];
            $format = $validated['format'];
            $dateFrom = $validated['date_from'];
            $dateTo = $validated['date_to'];

            // Obtener datos según el tipo de reporte
            $data = $this->getExportData($request, $reportType, $dateFrom, $dateTo);

            $filename = 'reporte_caja_' . $reportType . '_' . now('America/Bogota')->format('Y-m-d_His');

            if ($format === 'excel') {
                return $this->exportToExcel($data, $reportType, $dateFrom, $dateTo, $filename);
            }

            return $this->exportToPdf($data, $reportType, $dateFrom, $dateTo, $filename);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar el reporte',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene los datos para exportar según el tipo de reporte
     */
    private function getExportData(Request $request, string $reportType, string $dateFrom, string $dateTo): array
    {
        switch ($reportType) {
            case 'cash_flow':
                return $this->getCashFlowExportData($request, $dateFrom, $dateTo);
            case 'by_register':
                return $this->getByRegisterExportData($request, $dateFrom, $dateTo);
            case 'global':
                return $this->getGlobalExportData($request, $dateFrom, $dateTo);
            default:
                return [];
        }
    }

    /**
     * Datos de flujo de caja para exportar
     */
    private function getCashFlowExportData(Request $request, string $dateFrom, string $dateTo): array
    {
        // Obtener saldo inicial
        $openingBalanceQuery = Payment::where('status', 'completed')
            ->whereDate('payment_date', '<', $dateFrom)
            ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                $query->where('cash_register_id', $cashRegisterId);
            })
            ->when($request->session_id, function ($query, $sessionId) {
                $query->where('cash_register_session_id', $sessionId);
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            });

        $openingIncome = (clone $openingBalanceQuery)->where('type', 'income')->sum('amount');
        $openingExpense = (clone $openingBalanceQuery)->where('type', 'expense')->sum('amount');
        $openingBalance = (float) ($openingIncome - $openingExpense);

        $payments = Payment::with(['cashRegister', 'paymentMethod', 'createdBy'])
            ->whereBetween('payment_date', [$dateFrom, $dateTo])
            ->where('status', 'completed')
            ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                $query->where('cash_register_id', $cashRegisterId);
            })
            ->when($request->session_id, function ($query, $sessionId) {
                $query->where('cash_register_session_id', $sessionId);
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            })
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get();

        $runningBalance = $openingBalance;
        $transactions = $payments->map(function ($payment) use (&$runningBalance) {
            if ($payment->type === 'income') {
                $runningBalance += (float) $payment->amount;
            } else {
                $runningBalance -= (float) $payment->amount;
            }

            return [
                'date' => $payment->payment_date->format('d/m/Y H:i'),
                'type' => $payment->type,
                'payment_number' => $payment->payment_number,
                'concept' => $payment->concept ?? $payment->notes ?? 'Sin concepto',
                'cash_register' => $payment->cashRegister->name ?? 'N/A',
                'payment_method' => $payment->paymentMethod->name ?? 'N/A',
                'amount' => (float) $payment->amount,
                'balance' => $runningBalance,
            ];
        })->toArray();

        $byDate = $payments->groupBy(function ($payment) {
            return $payment->payment_date->format('Y-m-d');
        })->map(function ($dayPayments, $date) {
            return [
                'date' => $date,
                'income' => $dayPayments->where('type', 'income')->sum('amount'),
                'expense' => $dayPayments->where('type', 'expense')->sum('amount'),
                'net_flow' => $dayPayments->where('type', 'income')->sum('amount') - $dayPayments->where('type', 'expense')->sum('amount'),
            ];
        })->values()->toArray();

        $byPaymentMethod = $payments->groupBy('payment_method_id')->map(function ($methodPayments) {
            return [
                'payment_method' => $methodPayments->first()->paymentMethod->name ?? 'N/A',
                'income' => $methodPayments->where('type', 'income')->sum('amount'),
                'expense' => $methodPayments->where('type', 'expense')->sum('amount'),
                'net_flow' => $methodPayments->where('type', 'income')->sum('amount') - $methodPayments->where('type', 'expense')->sum('amount'),
            ];
        })->values()->toArray();

        $totalIncome = (float) $payments->where('type', 'income')->sum('amount');
        $totalExpense = (float) $payments->where('type', 'expense')->sum('amount');

        $totals = [
            'opening_balance' => $openingBalance,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'closing_balance' => $openingBalance + $totalIncome - $totalExpense,
            'net_flow' => $totalIncome - $totalExpense,
        ];

        return [
            'transactions' => $transactions,
            'byDate' => $byDate,
            'byPaymentMethod' => $byPaymentMethod,
            'totals' => $totals,
            'reportTitle' => 'Flujo de Caja',
        ];
    }

    /**
     * Datos por caja para exportar
     */
    private function getByRegisterExportData(Request $request, string $dateFrom, string $dateTo): array
    {
        $cashRegisterId = $request->cash_register_id;
        $cashRegister = $cashRegisterId ? CashRegister::find($cashRegisterId) : null;

        if ($cashRegister) {
            // Reporte de una caja específica
            $sessions = CashRegisterSession::where('cash_register_id', $cashRegister->id)
                ->whereBetween('opened_at', [$dateFrom, $dateTo . ' 23:59:59'])
                ->with(['openedBy', 'closedBy'])
                ->orderBy('opened_at', 'desc')
                ->get()
                ->map(function ($session) {
                    return [
                        'session_number' => 'SES-' . str_pad($session->id, 6, '0', STR_PAD_LEFT),
                        'opened_at' => $session->opened_at->format('d/m/Y H:i'),
                        'closed_at' => $session->closed_at?->format('d/m/Y H:i') ?? 'Abierta',
                        'opening_balance' => (float) $session->opening_balance,
                        'closing_balance' => (float) ($session->closing_balance ?? ($session->opening_balance + $session->total_income - $session->total_expense)),
                        'total_income' => (float) $session->total_income,
                        'total_expense' => (float) $session->total_expense,
                        'opened_by' => $session->openedBy?->name ?? 'N/A',
                        'closed_by' => $session->closedBy?->name ?? 'N/A',
                    ];
                })->toArray();

            $payments = Payment::where('cash_register_id', $cashRegister->id)
                ->whereBetween('payment_date', [$dateFrom, $dateTo])
                ->where('status', 'completed')
                ->get();

            $totals = [
                'total_income' => (float) $payments->where('type', 'income')->sum('amount'),
                'total_expense' => (float) $payments->where('type', 'expense')->sum('amount'),
                'net_flow' => (float) $payments->where('type', 'income')->sum('amount') - $payments->where('type', 'expense')->sum('amount'),
                'sessions_count' => count($sessions),
            ];

            return [
                'cashRegister' => $cashRegister->name,
                'sessions' => $sessions,
                'totals' => $totals,
                'reportTitle' => 'Reporte de Caja: ' . $cashRegister->name,
            ];
        }

        // Reporte de todas las cajas
        $cashRegisters = CashRegister::with(['branch', 'company'])
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            })
            ->get()
            ->map(function ($cashRegister) use ($dateFrom, $dateTo) {
                $sessions = CashRegisterSession::where('cash_register_id', $cashRegister->id)
                    ->whereBetween('opened_at', [$dateFrom, $dateTo . ' 23:59:59'])
                    ->count();

                $payments = Payment::where('cash_register_id', $cashRegister->id)
                    ->whereBetween('payment_date', [$dateFrom, $dateTo])
                    ->where('status', 'completed')
                    ->get();

                return [
                    'name' => $cashRegister->name,
                    'type' => $cashRegister->type,
                    'current_balance' => (float) $cashRegister->current_balance,
                    'sessions_count' => $sessions,
                    'total_income' => $payments->where('type', 'income')->sum('amount'),
                    'total_expense' => $payments->where('type', 'expense')->sum('amount'),
                    'net_flow' => $payments->where('type', 'income')->sum('amount') - $payments->where('type', 'expense')->sum('amount'),
                ];
            })->toArray();

        $totals = [
            'total_income' => collect($cashRegisters)->sum('total_income'),
            'total_expense' => collect($cashRegisters)->sum('total_expense'),
            'net_flow' => collect($cashRegisters)->sum('net_flow'),
            'total_balance' => collect($cashRegisters)->sum('current_balance'),
        ];

        return [
            'cashRegisters' => $cashRegisters,
            'totals' => $totals,
            'reportTitle' => 'Reporte por Caja',
        ];
    }

    /**
     * Datos globales para exportar
     */
    private function getGlobalExportData(Request $request, string $dateFrom, string $dateTo): array
    {
        $payments = Payment::with(['cashRegister', 'paymentMethod', 'createdBy', 'branch'])
            ->whereBetween('payment_date', [$dateFrom, $dateTo])
            ->where('status', 'completed')
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('branch_id', $branchId);
            })
            ->orderBy('payment_date', 'desc')
            ->get();

        $transactions = $payments->map(function ($payment) {
            return [
                'date' => $payment->payment_date->format('d/m/Y H:i'),
                'type' => $payment->type,
                'payment_number' => $payment->payment_number,
                'concept' => $payment->concept ?? $payment->notes ?? 'Sin concepto',
                'cash_register' => $payment->cashRegister->name ?? 'N/A',
                'payment_method' => $payment->paymentMethod->name ?? 'N/A',
                'amount' => (float) $payment->amount,
            ];
        })->take(100)->toArray();

        $byDate = $payments->groupBy(function ($payment) {
            return $payment->payment_date->format('Y-m-d');
        })->map(function ($dayPayments, $date) {
            return [
                'date' => $date,
                'income' => (float) $dayPayments->where('type', 'income')->sum('amount'),
                'expense' => (float) $dayPayments->where('type', 'expense')->sum('amount'),
                'net_flow' => (float) ($dayPayments->where('type', 'income')->sum('amount') - $dayPayments->where('type', 'expense')->sum('amount')),
            ];
        })->values()->toArray();

        $byPaymentMethod = $payments->groupBy('payment_method_id')->map(function ($methodPayments) {
            return [
                'payment_method' => $methodPayments->first()->paymentMethod->name ?? 'N/A',
                'income' => (float) $methodPayments->where('type', 'income')->sum('amount'),
                'expense' => (float) $methodPayments->where('type', 'expense')->sum('amount'),
                'net_flow' => (float) ($methodPayments->where('type', 'income')->sum('amount') - $methodPayments->where('type', 'expense')->sum('amount')),
            ];
        })->values()->toArray();

        $activeSessions = CashRegisterSession::with(['cashRegister', 'openedBy'])
            ->whereNull('closed_at')
            ->get()
            ->map(function ($session) {
                return [
                    'cash_register' => $session->cashRegister->name,
                    'opened_by' => $session->openedBy->name,
                    'opened_at' => $session->opened_at->format('d/m/Y H:i'),
                    'opening_balance' => (float) $session->opening_balance,
                    'current_balance' => (float) ($session->opening_balance + $session->total_income - $session->total_expense),
                    'total_income' => (float) $session->total_income,
                    'total_expense' => (float) $session->total_expense,
                ];
            })->toArray();

        $totals = [
            'total_income' => (float) $payments->where('type', 'income')->sum('amount'),
            'total_expense' => (float) $payments->where('type', 'expense')->sum('amount'),
            'net_flow' => (float) ($payments->where('type', 'income')->sum('amount') - $payments->where('type', 'expense')->sum('amount')),
            'total_balance' => (float) CashRegister::where('is_active', true)->sum('current_balance'),
            'active_sessions' => count($activeSessions),
        ];

        return [
            'transactions' => $transactions,
            'byDate' => $byDate,
            'byPaymentMethod' => $byPaymentMethod,
            'activeSessions' => $activeSessions,
            'totals' => $totals,
            'reportTitle' => 'Reporte Global',
        ];
    }

    /**
     * Exporta a Excel
     */
    private function exportToExcel(array $data, string $reportType, string $dateFrom, string $dateTo, string $filename): BinaryFileResponse
    {
        $transactions = $data['transactions'] ?? [];
        $totals = $data['totals'] ?? [];

        $export = new CashFlowExport($transactions, $totals, $dateFrom, $dateTo);

        return Excel::download($export, $filename . '.xlsx');
    }

    /**
     * Extrae datos de referencia (factura/compra) de un pago para las transacciones
     */
    private function getTransactionReferenceData(Payment $payment): array
    {
        $ref = $payment->reference;

        if (!$ref) {
            return [
                'ref_type' => null,
                'ref_id' => null,
                'ref_number' => null,
                'ref_summary' => null,
            ];
        }

        if ($payment->reference_type === Sale::class) {
            return [
                'ref_type' => 'sale',
                'ref_id' => $payment->reference_id,
                'ref_number' => $ref->invoice_number,
                'ref_summary' => [
                    'number' => $ref->invoice_number,
                    'client_name' => $ref->client?->name ?? '—',
                    'client_document' => $ref->client?->document_id ?? '—',
                    'seller_name' => $ref->seller?->name ?? '—',
                    'date' => $ref->invoice_date?->toISOString(),
                    'subtotal' => (float) ($ref->subtotal ?? 0),
                    'tax' => (float) ($ref->tax_amount ?? 0),
                    'discount' => (float) ($ref->discount_amount ?? 0),
                    'total' => (float) ($ref->total_amount ?? 0),
                    'paid' => (float) ($ref->paid_amount ?? 0),
                    'balance' => (float) ($ref->balance ?? 0),
                    'status' => $ref->status,
                    'payment_status' => $ref->payment_status,
                    'items_count' => $ref->items?->count() ?? 0,
                ],
            ];
        }

        if ($payment->reference_type === InventoryPurchase::class) {
            return [
                'ref_type' => 'purchase',
                'ref_id' => $payment->reference_id,
                'ref_number' => $ref->purchase_number,
                'ref_summary' => [
                    'number' => $ref->purchase_number,
                    'supplier_name' => $ref->supplier?->name ?? '—',
                    'supplier_tax_id' => $ref->supplier?->tax_id ?? '—',
                    'date' => $ref->created_at?->toISOString(),
                    'subtotal' => (float) ($ref->subtotal ?? 0),
                    'tax' => (float) ($ref->tax_amount ?? 0),
                    'total' => (float) ($ref->total_amount ?? 0),
                    'paid' => (float) ($ref->total_paid ?? 0),
                    'balance' => (float) ($ref->balance_due ?? 0),
                    'status' => $ref->status,
                    'payment_status' => $ref->payment_status,
                    'items_count' => $ref->items?->count() ?? 0,
                ],
            ];
        }

        return [
            'ref_type' => null,
            'ref_id' => null,
            'ref_number' => null,
            'ref_summary' => null,
        ];
    }

    /**
     * Exporta a PDF
     */
    private function exportToPdf(array $data, string $reportType, string $dateFrom, string $dateTo, string $filename): \Illuminate\Http\Response
    {
        $user = auth()->user();
        $company = $user->company ?? (object) [
            'name' => 'LEGAL SISTEMA',
            'nit' => '900123456-7',
            'address' => '',
            'city' => '',
        ];

        $pdf = Pdf::loadView('pdf.cash-report', [
            'reportTitle' => $data['reportTitle'] ?? 'Reporte de Caja',
            'company' => $company,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
            'totals' => $data['totals'] ?? [],
            'transactions' => $data['transactions'] ?? [],
            'byDate' => $data['byDate'] ?? [],
            'byPaymentMethod' => $data['byPaymentMethod'] ?? [],
            'cashRegisters' => $data['cashRegisters'] ?? [],
            'activeSessions' => $data['activeSessions'] ?? [],
            'sessions' => $data['sessions'] ?? [],
        ])
            ->setPaper('letter', 'portrait')
            ->setOption('enable-local-file-access', true)
            ->setOption('isHtml5ParserEnabled', true);

        return $pdf->download($filename . '.pdf');
    }
}
