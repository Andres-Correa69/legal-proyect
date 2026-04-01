<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentExpenseRequest;
use App\Http\Requests\StorePaymentFreeExpenseRequest;
use App\Http\Requests\StorePaymentIncomeRequest;
use App\Http\Requests\CancelPaymentRequest;
use App\Models\AccountingAccount;
use App\Models\ActivityLog;
use App\Models\CashRegister;
use App\Models\InventoryPurchase;
use App\Models\Sale;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Lista todos los pagos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $payments = Payment::with([
                'cashRegister',
                'paymentMethod',
                'createdBy',
                'cancelledBy',
            ])
                ->when($request->type, function ($query, $type) {
                    $query->where('type', $type);
                })
                ->when($request->status, function ($query, $status) {
                    $query->where('status', $status);
                })
                ->when($request->payment_method_id, function ($query, $paymentMethodId) {
                    $query->where('payment_method_id', $paymentMethodId);
                })
                ->when($request->cash_register_id, function ($query, $cashRegisterId) {
                    $query->where('cash_register_id', $cashRegisterId);
                })
                ->when($request->reference_type, function ($query, $referenceType) {
                    $query->where('reference_type', $referenceType);
                })
                ->when($request->reference_id, function ($query, $referenceId) {
                    $query->where('reference_id', $referenceId);
                })
                ->when($request->search, function ($query, $search) {
                    $query->where('payment_number', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                })
                ->when($request->date_from, function ($query, $dateFrom) {
                    $query->whereDate('payment_date', '>=', $dateFrom);
                })
                ->when($request->date_to, function ($query, $dateTo) {
                    $query->whereDate('payment_date', '<=', $dateTo);
                })
                ->when($request->company_id, fn($q, $id) => $q->where('company_id', $id))
                ->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 15);

            return response()->json([
                'success' => true,
                'data' => $payments,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener los pagos',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Registra un pago de egreso (gasto/pago a proveedor por compra de inventario)
     */
    public function storeExpense(StorePaymentExpenseRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
            $purchase = InventoryPurchase::findOrFail($validated['purchase_id']);

            $payment = $this->paymentService->registerExpense(
                $purchase,
                $cashRegister,
                $validated['payment_method_id'],
                $validated['amount'],
                $request->user()->id,
                $validated['notes'] ?? null,
                $validated['installments'] ?? null
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Pago de egreso registrado',
                'created',
                $payment,
                [
                    'payment_number' => $payment->payment_number,
                    'amount' => $validated['amount'],
                    'cash_register' => $cashRegister->name,
                    'purchase_number' => $purchase->purchase_number,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $payment->load([
                    'cashRegister',
                    'paymentMethod',
                    'createdBy',
                    'installments',
                    'reference',
                ]),
                'message' => 'Pago de egreso registrado exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Registra un egreso libre con cuenta contable directa
     */
    public function storeFreeExpense(StorePaymentFreeExpenseRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $user = $request->user();

            $account = AccountingAccount::where('id', $validated['accounting_account_id'])
                ->where('company_id', $user->company_id)
                ->firstOrFail();

            $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);

            $payment = $this->paymentService->registerFreeExpense(
                $account,
                $cashRegister,
                $validated['payment_method_id'],
                $validated['amount'],
                $user->id,
                $validated['concept'],
                $user->company_id,
                $user->branch_id ?? null,
                $validated['notes'] ?? null
            );

            ActivityLog::log(
                'Egreso libre registrado',
                'created',
                $payment,
                [
                    'payment_number'  => $payment->payment_number,
                    'amount'          => $validated['amount'],
                    'concept'         => $validated['concept'],
                    'account'         => $account->code . ' - ' . $account->name,
                    'cash_register'   => $cashRegister->name,
                ]
            );

            return response()->json([
                'success' => true,
                'data'    => $payment->load(['cashRegister', 'paymentMethod', 'createdBy', 'accountingAccount']),
                'message' => 'Egreso libre registrado exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Registra un pago de ingreso (abono de cliente por venta)
     */
    public function storeIncome(StorePaymentIncomeRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $sale = Sale::findOrFail($validated['sale_id']);
            $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);

            $payment = $this->paymentService->registerIncomeFromSale(
                $sale,
                $cashRegister,
                $validated['payment_method_id'],
                $validated['amount'],
                $request->user()->id,
                $validated['reference'] ?? null,
                $validated['notes'] ?? null
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Pago de ingreso registrado',
                'created',
                $payment,
                [
                    'sale_id' => $sale->id,
                    'invoice_number' => $sale->invoice_number,
                    'amount' => $validated['amount'],
                    'cash_register' => $cashRegister->name,
                ]
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'payment' => $payment,
                    'sale' => $sale->fresh(['client', 'payments']),
                ],
                'message' => 'Pago de ingreso registrado exitosamente',
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Muestra un pago específico
     */
    public function show(Payment $payment): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $payment->load([
                    'cashRegister',
                    'paymentMethod',
                    'createdBy',
                    'cancelledBy',
                    'installments',
                    'reference',
                ]),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el pago',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancela un pago
     */
    public function cancel(CancelPaymentRequest $request, Payment $payment): JsonResponse
    {
        try {
            $validated = $request->validated();

            $cancelledPayment = $this->paymentService->cancelPayment(
                $payment,
                $request->user()->id,
                $validated['cancellation_reason']
            );

            // Registrar en el log de actividades
            ActivityLog::log(
                'Pago cancelado: ' . $payment->payment_number,
                'cancelled',
                $cancelledPayment,
                [
                    'payment_number' => $payment->payment_number,
                    'reason' => $validated['cancellation_reason'],
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $cancelledPayment->load([
                    'cashRegister',
                    'paymentMethod',
                    'createdBy',
                    'cancelledBy',
                ]),
                'message' => 'Pago cancelado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Obtiene el resumen de pagos de una compra
     */
    public function purchaseSummary(Request $request, InventoryPurchase $purchase): JsonResponse
    {
        try {
            $summary = $this->paymentService->getPurchasePaymentSummary($purchase);

            return response()->json([
                'success' => true,
                'data' => $summary,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener el resumen de pagos',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene las ventas con saldo pendiente para pagos de ingreso
     */
    public function salesWithPendingBalance(Request $request): JsonResponse
    {
        try {
            $sales = Sale::with('client')
                ->whereIn('payment_status', ['pending', 'partial'])
                ->where('status', '!=', 'cancelled')
                ->orderBy('invoice_date', 'desc')
                ->get()
                ->map(function ($sale) {
                    return [
                        'id' => $sale->id,
                        'invoice_number' => $sale->invoice_number,
                        'client_name' => $sale->client?->name ?? 'Sin cliente',
                        'client_id' => $sale->client_id,
                        'total_amount' => (float)$sale->total_amount,
                        'paid_amount' => (float)($sale->paid_amount ?? 0),
                        'balance' => (float)($sale->balance ?? $sale->total_amount),
                        'payment_status' => $sale->payment_status,
                        'invoice_date' => $sale->invoice_date,
                        'due_date' => $sale->due_date,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $sales,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener ventas pendientes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtiene las compras de inventario con saldo pendiente para pagos de egreso
     */
    public function purchasesWithPendingBalance(Request $request): JsonResponse
    {
        try {
            $purchases = InventoryPurchase::with('supplier')
                ->whereIn('payment_status', ['pending', 'partial'])
                ->where('status', '!=', 'cancelled')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($purchase) {
                    $totalPaid = (float)($purchase->total_paid ?? 0);
                    $balanceDue = (float)$purchase->total_amount - $totalPaid;

                    return [
                        'id' => $purchase->id,
                        'purchase_number' => $purchase->purchase_number,
                        'supplier_name' => $purchase->supplier?->name ?? 'Sin proveedor',
                        'supplier_id' => $purchase->supplier_id,
                        'total_amount' => (float)$purchase->total_amount,
                        'total_paid' => $totalPaid,
                        'balance_due' => $balanceDue,
                        'payment_status' => $purchase->payment_status,
                        'created_at' => $purchase->created_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $purchases,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener compras pendientes',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

