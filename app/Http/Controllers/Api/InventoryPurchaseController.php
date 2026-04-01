<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\InventoryPurchase;
use App\Models\Product;
use App\Models\ProductPriceHistory;
use App\Models\Warehouse;
use App\Models\CashRegister;
use App\Models\PaymentMethod;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryPurchaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $purchases = InventoryPurchase::with(['supplier', 'warehouse', 'createdBy', 'receiptAcknowledgment', 'goodsReceipt', 'expressAcceptance', 'documentSupport'])
            ->when($request->search, function ($query, $search) {
                $query->where('purchase_number', 'like', "%{$search}%");
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->payment_status, function ($query, $paymentStatus) {
                $query->where('payment_status', $paymentStatus);
            })
            ->when($request->supplier_id, function ($query, $supplierId) {
                $query->where('supplier_id', $supplierId);
            })
            ->when($request->date_from, function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($purchases);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'expected_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_credit' => 'boolean',
            'credit_due_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|in:0,5,19',
            'retentions' => 'nullable|array',
        ]);

        $isCredit = $validated['is_credit'] ?? false;

        if ($isCredit && empty($validated['credit_due_date'])) {
            return response()->json([
                'message' => 'La fecha de vencimiento es requerida para compras a crédito',
                'errors' => ['credit_due_date' => ['La fecha de vencimiento es requerida para compras a crédito']],
            ], 422);
        }

        try {
            $purchase = DB::transaction(function () use ($validated, $request, $isCredit) {
                $warehouse = Warehouse::findOrFail($validated['warehouse_id']);

                // Calculate retention amount
                $retentionAmount = 0;
                if (!empty($validated['retentions'])) {
                    foreach ($validated['retentions'] as $retention) {
                        $retentionAmount += $retention['value'] ?? 0;
                    }
                }

                $purchase = InventoryPurchase::create([
                    'company_id' => $warehouse->company_id,
                    'branch_id' => $warehouse->branch_id,
                    'warehouse_id' => $validated['warehouse_id'],
                    'supplier_id' => $validated['supplier_id'],
                    'expected_date' => $validated['expected_date'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                    'is_credit' => $isCredit,
                    'credit_due_date' => $isCredit ? ($validated['credit_due_date'] ?? null) : null,
                    'retentions' => $validated['retentions'] ?? null,
                    'retention_amount' => $retentionAmount,
                    'created_by_user_id' => $request->user()->id,
                    'status' => 'draft',
                    'payment_status' => 'pending',
                ]);

                foreach ($validated['items'] as $item) {
                    $taxRate = $item['tax_rate'] ?? 0;
                    $itemSubtotal = $item['quantity_ordered'] * $item['unit_cost'];
                    $taxAmount = $itemSubtotal * ($taxRate / 100);

                    $purchase->items()->create([
                        'product_id' => $item['product_id'],
                        'quantity_ordered' => $item['quantity_ordered'],
                        'unit_cost' => $item['unit_cost'],
                        'tax_rate' => $taxRate,
                        'tax_amount' => $taxAmount,
                    ]);
                }

                $purchase->calculateTotals();

                return $purchase;
            });
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json($purchase->load(['supplier', 'warehouse', 'items.product']), 201);
    }

    public function show(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        return response()->json($inventoryPurchase->load([
            'supplier',
            'warehouse',
            'items.product',
            'createdBy',
            'approvedBy',
            'receivedBy',
            'receiptAcknowledgment',
            'goodsReceipt',
            'documentSupport',
            'payments' => function ($query) {
                $query->where('status', 'completed')
                      ->with(['paymentMethod', 'cashRegister'])
                      ->orderBy('payment_date', 'desc');
            },
        ]));
    }

    public function update(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if (!in_array($inventoryPurchase->status, ['draft', 'pending'])) {
            return response()->json(['message' => 'Solo se pueden editar compras en borrador o pendientes'], 400);
        }

        $validated = $request->validate([
            'warehouse_id' => 'sometimes|exists:warehouses,id',
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'expected_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|in:0,5,19',
            'retentions' => 'nullable|array',
        ]);

        DB::transaction(function () use ($validated, $inventoryPurchase) {
            $updateData = [
                'warehouse_id' => $validated['warehouse_id'] ?? $inventoryPurchase->warehouse_id,
                'supplier_id' => $validated['supplier_id'] ?? $inventoryPurchase->supplier_id,
                'expected_date' => $validated['expected_date'] ?? $inventoryPurchase->expected_date,
                'notes' => $validated['notes'] ?? $inventoryPurchase->notes,
            ];

            if (array_key_exists('retentions', $validated)) {
                $updateData['retentions'] = $validated['retentions'];
                $retentionAmount = 0;
                if (!empty($validated['retentions'])) {
                    foreach ($validated['retentions'] as $retention) {
                        $retentionAmount += $retention['value'] ?? 0;
                    }
                }
                $updateData['retention_amount'] = $retentionAmount;
            }

            $inventoryPurchase->update($updateData);

            if (isset($validated['items'])) {
                $inventoryPurchase->items()->delete();
                foreach ($validated['items'] as $item) {
                    $taxRate = $item['tax_rate'] ?? 0;
                    $itemSubtotal = $item['quantity_ordered'] * $item['unit_cost'];
                    $taxAmount = $itemSubtotal * ($taxRate / 100);

                    $inventoryPurchase->items()->create([
                        'product_id' => $item['product_id'],
                        'quantity_ordered' => $item['quantity_ordered'],
                        'unit_cost' => $item['unit_cost'],
                        'tax_rate' => $taxRate,
                        'tax_amount' => $taxAmount,
                    ]);
                }
                $inventoryPurchase->calculateTotals();
            }
        });

        return response()->json($inventoryPurchase->fresh()->load(['supplier', 'warehouse', 'items.product']));
    }

    public function destroy(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if ($inventoryPurchase->status !== 'draft') {
            return response()->json(['message' => 'Solo se pueden eliminar compras en borrador'], 400);
        }

        $inventoryPurchase->delete();

        return response()->json(null, 204);
    }

    public function approve(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if (!$inventoryPurchase->canBeApproved()) {
            return response()->json(['message' => 'Esta compra no puede ser aprobada'], 400);
        }

        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'nullable|numeric|min:0.01',
        ]);

        DB::beginTransaction();
        try {
            $inventoryPurchase->update([
                'status' => 'approved',
                'approved_by_user_id' => $request->user()->id,
            ]);

            // Procesar pago con la caja/banco seleccionada
            $inventoryPurchase->refresh();
            $balanceDue = $inventoryPurchase->calculateBalanceDue();
            $amount = isset($validated['amount']) ? (float) $validated['amount'] : (float) $balanceDue;

            if ($amount > $balanceDue) {
                throw new \Exception('El monto excede el saldo pendiente de la compra');
            }

            if ($balanceDue > 0 && $amount > 0) {
                $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);
                $paymentService = app(PaymentService::class);

                // Determinar método de pago: usar el de la caja si tiene, sino auto-detectar
                $paymentMethodId = $cashRegister->payment_method_id;
                if (!$paymentMethodId) {
                    $defaultCode = $cashRegister->isBank() ? 'BANK_TRANSFER' : 'CASH';
                    $defaultMethod = PaymentMethod::where('company_id', $inventoryPurchase->company_id)
                        ->where('code', $defaultCode)
                        ->where('is_active', true)
                        ->first();
                    if (!$defaultMethod) {
                        throw new \Exception('No se encontró un método de pago activo para esta caja.');
                    }
                    $paymentMethodId = $defaultMethod->id;
                }

                $paymentService->registerExpense(
                    $inventoryPurchase,
                    $cashRegister,
                    $paymentMethodId,
                    $amount,
                    $request->user()->id,
                    'Pago al aprobar compra'
                );

                $inventoryPurchase->refresh();
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($inventoryPurchase->fresh()->load(['supplier', 'warehouse', 'items.product']));
    }

    public function receive(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if (!$inventoryPurchase->canBeReceived()) {
            return response()->json(['message' => 'Esta compra no puede ser recibida'], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:inventory_purchase_items,id',
            'items.*.quantity_received' => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($validated, $inventoryPurchase, $request) {
            foreach ($validated['items'] as $itemData) {
                $item = $inventoryPurchase->items()->find($itemData['id']);

                if (!$item) continue;

                $quantityToReceive = min(
                    $itemData['quantity_received'],
                    $item->quantity_ordered - $item->quantity_received
                );

                if ($quantityToReceive <= 0) continue;

                $item->increment('quantity_received', $quantityToReceive);

                // Actualizar stock del producto
                $product = $item->product;
                $stockBefore = $product->current_stock;
                $stockAfter = $stockBefore + $quantityToReceive;

                // Crear movimiento de inventario
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'company_id' => $inventoryPurchase->company_id,
                    'branch_id' => $inventoryPurchase->branch_id,
                    'type' => 'purchase',
                    'quantity' => $quantityToReceive,
                    'unit_cost' => $item->unit_cost,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'reference_type' => InventoryPurchase::class,
                    'reference_id' => $inventoryPurchase->id,
                    'created_by_user_id' => $request->user()->id,
                ]);

                // Actualizar promedio de costo
                $product->updateAverageCost($item->unit_cost, $quantityToReceive);

                // Si el costo de compra cambió, actualizar purchase_price y registrar historial
                if (round($item->unit_cost, 2) != round($product->purchase_price, 2)) {
                    $oldPrice = $product->purchase_price;
                    $product->purchase_price = $item->unit_cost;

                    ProductPriceHistory::create([
                        'product_id' => $product->id,
                        'company_id' => $inventoryPurchase->company_id,
                        'field' => 'purchase_price',
                        'old_value' => $oldPrice,
                        'new_value' => $item->unit_cost,
                        'reason' => "Compra {$inventoryPurchase->purchase_number} recibida",
                        'reference_type' => InventoryPurchase::class,
                        'reference_id' => $inventoryPurchase->id,
                        'changed_by_user_id' => $request->user()->id,
                    ]);
                }

                $updateData = ['current_stock' => $stockAfter];
                if ($product->isDirty('purchase_price')) {
                    $updateData['purchase_price'] = $product->purchase_price;
                }
                $product->update($updateData);
            }

            // Actualizar estado de la compra
            $inventoryPurchase->refresh();

            if ($inventoryPurchase->isFullyReceived()) {
                $inventoryPurchase->update([
                    'status' => 'received',
                    'received_at' => now(),
                    'received_by_user_id' => $request->user()->id,
                ]);
            } else {
                $inventoryPurchase->update([
                    'status' => 'partial',
                    'received_by_user_id' => $request->user()->id,
                ]);
            }
        });

        return response()->json($inventoryPurchase->fresh()->load(['supplier', 'warehouse', 'items.product']));
    }

    public function cancel(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if (in_array($inventoryPurchase->status, ['received', 'cancelled'])) {
            return response()->json(['message' => 'Esta compra no puede ser cancelada'], 400);
        }

        $inventoryPurchase->update(['status' => 'cancelled']);

        return response()->json($inventoryPurchase->fresh());
    }

    /**
     * Registrar un pago (abono) a una compra
     */
    public function addPayment(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        if (!$request->user()->isSuperAdmin() && $inventoryPurchase->company_id !== $request->user()->company_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($inventoryPurchase->payment_status === 'paid') {
            return response()->json(['message' => 'Esta compra ya está completamente pagada'], 400);
        }

        if (!in_array($inventoryPurchase->status, ['approved', 'partial', 'received'])) {
            return response()->json(['message' => 'Solo se pueden registrar pagos para compras aprobadas o recibidas'], 400);
        }

        $validated = $request->validate([
            'cash_register_id' => 'required|exists:cash_registers,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $balanceDue = $inventoryPurchase->calculateBalanceDue();
        if ($validated['amount'] > $balanceDue) {
            return response()->json([
                'message' => 'El monto del pago excede el saldo pendiente',
                'balance_due' => $balanceDue,
            ], 400);
        }

        try {
            DB::beginTransaction();

            $cashRegister = CashRegister::findOrFail($validated['cash_register_id']);

            // Auto-detectar método de pago desde la caja
            $paymentMethodId = $cashRegister->payment_method_id;
            if (!$paymentMethodId) {
                $defaultCode = $cashRegister->isBank() ? 'BANK_TRANSFER' : 'CASH';
                $defaultMethod = PaymentMethod::where('company_id', $inventoryPurchase->company_id)
                    ->where('code', $defaultCode)
                    ->where('is_active', true)
                    ->first();
                if (!$defaultMethod) {
                    throw new \Exception('No se encontró un método de pago activo para esta caja.');
                }
                $paymentMethodId = $defaultMethod->id;
            }

            $paymentService = app(PaymentService::class);

            $payment = $paymentService->registerExpense(
                $inventoryPurchase,
                $cashRegister,
                $paymentMethodId,
                (float) $validated['amount'],
                $request->user()->id,
                $validated['notes'] ?? ('Abono a compra ' . $inventoryPurchase->purchase_number),
                null,
                $validated['payment_date']
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => $e->getMessage()], 400);
        }

        return response()->json([
            'payment' => $payment,
            'purchase' => $inventoryPurchase->fresh()->load([
                'supplier', 'warehouse', 'items.product',
                'createdBy', 'approvedBy', 'receivedBy',
                'receiptAcknowledgment', 'goodsReceipt', 'expressAcceptance', 'documentSupport',
                'payments' => function ($query) {
                    $query->where('status', 'completed')
                          ->with(['paymentMethod', 'cashRegister'])
                          ->orderBy('payment_date', 'desc');
                },
            ]),
        ], 201);
    }

    public function parseInvoice(Request $request): JsonResponse
    {
        $request->validate([
            'invoice_file' => 'nullable|file|mimes:pdf|max:10240',
            'extracted_text' => 'nullable|string',
        ]);

        $text = '';

        // Mode 1: PDF file upload — extract text with smalot/pdfparser
        if ($request->hasFile('invoice_file')) {
            try {
                $parser = new \Smalot\PdfParser\Parser();
                $pdf = $parser->parseFile($request->file('invoice_file')->getRealPath());
                $text = $pdf->getText();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo leer el PDF: ' . $e->getMessage(),
                ], 422);
            }
        }
        // Mode 2: Raw text from frontend OCR (tesseract.js)
        elseif ($request->filled('extracted_text')) {
            $text = $request->input('extracted_text');
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar un archivo PDF o texto extraído',
            ], 422);
        }

        // Normalize text
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $cleanText = trim($text);

        // Check if text extraction actually produced readable content
        if (mb_strlen($cleanText) < 20) {
            return response()->json([
                'success' => true,
                'data' => [
                    'items' => [],
                    'invoice_info' => ['supplier_name' => null, 'invoice_number' => null, 'date' => null],
                    'raw_text' => $cleanText,
                    'warning' => 'No se pudo extraer texto legible del PDF. Guarde el PDF usando "Guardar como PDF" en Chrome (no "Microsoft Print to PDF"), o suba una imagen (PNG/JPG) de la factura.',
                ],
            ]);
        }

        $lines = array_filter(array_map('trim', explode("\n", $text)), fn($l) => $l !== '');

        // Get company products for matching
        $companyId = $request->user()->company_id;
        $products = Product::where('company_id', $companyId)->get(['name', 'sku']);

        // Try to detect invoice info from header lines
        $invoiceInfo = $this->detectInvoiceInfo($lines);

        // Parse product lines
        $items = $this->parseProductLines($lines, $products);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'invoice_info' => $invoiceInfo,
                'raw_text' => $cleanText,
            ],
        ]);
    }

    private function detectInvoiceInfo(array $lines): array
    {
        $info = [
            'supplier_name' => null,
            'invoice_number' => null,
            'date' => null,
        ];

        $fullText = implode(' ', array_slice($lines, 0, min(20, count($lines))));

        // Detect invoice number patterns
        if (preg_match('/(?:factura|fact|invoice|fac|no\.?|n[uú]mero)[:\s#-]*([A-Z]{0,5}[-\s]?\d{2,}[-\d]*)/i', $fullText, $m)) {
            $info['invoice_number'] = trim($m[1]);
        }

        // Detect date patterns (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd)
        if (preg_match('/(?:fecha|date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i', $fullText, $m)) {
            $info['date'] = trim($m[1]);
        } elseif (preg_match('/(\d{4}-\d{2}-\d{2})/', $fullText, $m)) {
            $info['date'] = $m[1];
        } elseif (preg_match('/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/', $fullText, $m)) {
            $info['date'] = $m[1];
        }

        // Detect supplier name: typically the first prominent line or after NIT/RUT
        if (preg_match('/(?:NIT|RUT|CC)[:\s.]*[\d.\-]+\s*[-\s]*\s*\d*\s*\n?\s*(.+)/i', $fullText, $m)) {
            $name = trim($m[1]);
            if (strlen($name) > 3 && strlen($name) < 100) {
                $info['supplier_name'] = $name;
            }
        }
        // Fallback: first non-empty line that looks like a company name
        if (!$info['supplier_name'] && !empty($lines)) {
            foreach ($lines as $line) {
                $clean = trim($line);
                if (strlen($clean) > 5 && strlen($clean) < 80 && !preg_match('/^\d/', $clean) && !preg_match('/factura|invoice|fecha|date|nit|rut/i', $clean)) {
                    $info['supplier_name'] = $clean;
                    break;
                }
            }
        }

        return $info;
    }

    private function parseProductLines(array $lines, $products): array
    {
        $lines = array_values($lines);

        // Strategy 1: Single-line regex patterns
        $items = $this->parseSingleLinePatterns($lines, $products);
        if (!empty($items)) return $items;

        // Strategy 2: Multi-line row detection (PDF extractors often put each cell on its own line)
        $items = $this->parseMultiLineRows($lines, $products);
        if (!empty($items)) return $items;

        // Strategy 3: Scan full text for known product names from the catalog
        $items = $this->scanForProductNames($lines, $products);

        return $items;
    }

    private function isSkipLine(string $line): bool
    {
        return (bool) preg_match('/^(subtotal|total|iva|impuesto|descuento|observ|nota|item|producto|descripci[oó]n|cantidad|precio|cant|unit|#\s|---|\s*$)/i', trim($line));
    }

    private function parseSingleLinePatterns(array $lines, $products): array
    {
        $items = [];
        $patterns = [
            // #  Name  Qty  UnitPrice  Subtotal
            '/^\s*\d+\s+(.+?)\s+(\d+)\s+\$?\s*([\d.,]+)\s+\$?\s*([\d.,]+)\s*$/',
            // Qty  Name  UnitPrice  Subtotal
            '/^\s*(\d+)\s+(.+?)\s+\$?\s*([\d.,]+)\s+\$?\s*([\d.,]+)\s*$/',
            // Name  Qty  UnitPrice  Subtotal (double space sep)
            '/^\s*(.+?)\s{2,}(\d+)\s+\$?\s*([\d.,]+)\s+\$?\s*([\d.,]+)\s*$/',
            // #  Name  Qty  $UnitPrice  $Subtotal ($ attached)
            '/^\s*\d+\s+(.+?)\s+(\d+)\s+\$([\d.,]+)\s+\$([\d.,]+)\s*$/',
            // Name Qty $UnitPrice $Subtotal (single space, $ required)
            '/^\s*(.+?)\s+(\d+)\s+\$([\d.,]+)\s+\$([\d.,]+)\s*$/',
        ];

        foreach ($lines as $line) {
            if ($this->isSkipLine($line)) continue;

            foreach ($patterns as $patternIdx => $pattern) {
                if (preg_match($pattern, $line, $m)) {
                    if ($patternIdx <= 0 || $patternIdx === 3) {
                        $rawName = trim($m[1]);
                        $qty = (int) $m[2];
                        $unitCost = $this->parseNumber($m[3]);
                    } elseif ($patternIdx === 1) {
                        $qty = (int) $m[1];
                        $rawName = trim($m[2]);
                        $unitCost = $this->parseNumber($m[3]);
                    } else {
                        $rawName = trim($m[1]);
                        $qty = (int) $m[2];
                        $unitCost = $this->parseNumber($m[3]);
                    }

                    if ($qty <= 0 || $unitCost <= 0 || strlen($rawName) < 2) continue;

                    $match = $this->findProductMatch($rawName, $products);
                    $items[] = [
                        'raw_text' => $rawName,
                        'quantity' => $qty,
                        'unit_cost' => $unitCost,
                        'matched_product_id' => $match['product_id'],
                        'matched_product_name' => $match['product_name'],
                        'matched_product_sku' => $match['product_sku'],
                        'confidence' => $match['confidence'],
                    ];
                    break;
                }
            }
        }

        return $items;
    }

    private function parseMultiLineRows(array $lines, $products): array
    {
        $items = [];
        $count = count($lines);
        $i = 0;

        while ($i < $count) {
            $line = trim($lines[$i]);

            // Skip headers/totals
            if ($this->isSkipLine($line)) {
                $i++;
                continue;
            }

            // Pattern A: row number alone → name → qty → price → subtotal (5 lines per row)
            if (preg_match('/^\d{1,3}$/', $line) && $i + 3 < $count) {
                $nameCandidate = trim($lines[$i + 1] ?? '');
                $qtyCandidate = trim($lines[$i + 2] ?? '');
                $priceCandidate = trim($lines[$i + 3] ?? '');

                if (preg_match('/[a-záéíóúñ]/i', $nameCandidate)
                    && preg_match('/^\d+$/', $qtyCandidate)
                    && preg_match('/^\$?\s*[\d.,]+$/', $priceCandidate)) {

                    $qty = (int) $qtyCandidate;
                    $unitCost = $this->parseNumber(preg_replace('/[\$\s]/', '', $priceCandidate));

                    if ($qty > 0 && $unitCost > 0) {
                        $match = $this->findProductMatch($nameCandidate, $products);
                        $items[] = [
                            'raw_text' => $nameCandidate,
                            'quantity' => $qty,
                            'unit_cost' => $unitCost,
                            'matched_product_id' => $match['product_id'],
                            'matched_product_name' => $match['product_name'],
                            'matched_product_sku' => $match['product_sku'],
                            'confidence' => $match['confidence'],
                        ];
                        $i += 5; // skip all 5 lines of this row
                        continue;
                    }
                }
            }

            // Pattern B: name line → followed by numbers (qty, price on next lines)
            if (preg_match('/[a-záéíóúñ]{3,}/i', $line) && !preg_match('/^\d+$/', $line) && $i + 2 < $count) {
                $next1 = trim($lines[$i + 1] ?? '');
                $next2 = trim($lines[$i + 2] ?? '');

                if (preg_match('/^\d+$/', $next1) && preg_match('/^\$?\s*[\d.,]+$/', $next2)) {
                    $qty = (int) $next1;
                    $unitCost = $this->parseNumber(preg_replace('/[\$\s]/', '', $next2));

                    if ($qty > 0 && $unitCost > 0) {
                        $match = $this->findProductMatch($line, $products);
                        $items[] = [
                            'raw_text' => $line,
                            'quantity' => $qty,
                            'unit_cost' => $unitCost,
                            'matched_product_id' => $match['product_id'],
                            'matched_product_name' => $match['product_name'],
                            'matched_product_sku' => $match['product_sku'],
                            'confidence' => $match['confidence'],
                        ];
                        $i += 4; // skip name + qty + price + subtotal
                        continue;
                    }
                }
            }

            $i++;
        }

        return $items;
    }

    private function removeAccents(string $str): string
    {
        $map = [
            'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u',
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
            'ñ' => 'n', 'Ñ' => 'N', 'ü' => 'u', 'Ü' => 'U',
        ];
        return strtr($str, $map);
    }

    private function scanForProductNames(array $lines, $products): array
    {
        $items = [];
        $fullText = implode(' ', $lines);
        // Normalize: remove accents and lowercase for comparison
        $normalizedText = mb_strtolower($this->removeAccents($fullText));
        $usedProducts = [];

        foreach ($products as $product) {
            $productName = $product->name;
            $normalizedName = mb_strtolower($this->removeAccents($productName));

            if (in_array($normalizedName, $usedProducts)) continue;

            // Try exact name match (accent-insensitive)
            $pos = mb_strpos($normalizedText, $normalizedName);

            // If not found, try matching with significant words (3+ chars)
            if ($pos === false) {
                $words = array_filter(
                    preg_split('/[\s\-_]+/', $normalizedName),
                    fn($w) => mb_strlen($w) > 3
                );
                if (count($words) >= 2) {
                    $allFound = true;
                    foreach ($words as $word) {
                        if (mb_strpos($normalizedText, $word) === false) {
                            $allFound = false;
                            break;
                        }
                    }
                    if ($allFound) {
                        // Find approximate position using first word
                        $pos = mb_strpos($normalizedText, $words[0]);
                    }
                }
            }

            if ($pos === false) continue;

            $usedProducts[] = $normalizedName;

            // Look for numbers after the product name (within 100 chars)
            $after = mb_substr($fullText, $pos + mb_strlen($productName), 100);
            preg_match_all('/\$?\s*([\d.,]{1,15})/', $after, $nums);

            $qty = 0;
            $unitCost = 0;

            if (!empty($nums[1])) {
                $parsedNums = array_map(fn($n) => $this->parseNumber($n), $nums[1]);
                $parsedNums = array_filter($parsedNums, fn($n) => $n > 0);
                $parsedNums = array_values($parsedNums);

                if (count($parsedNums) >= 2) {
                    $qty = (int) $parsedNums[0];
                    $unitCost = $parsedNums[1];
                } elseif (count($parsedNums) === 1) {
                    $qty = 1;
                    $unitCost = $parsedNums[0];
                }
            }

            $items[] = [
                'raw_text' => $productName,
                'quantity' => max($qty, 1),
                'unit_cost' => $unitCost,
                'matched_product_id' => $product->id,
                'matched_product_name' => $product->name,
                'matched_product_sku' => $product->sku,
                'confidence' => 0.9,
            ];
        }

        return $items;
    }

    private function parseNumber(string $value): float
    {
        // Handle Colombian number format: 85.000 or 85,000 or 85000
        $value = trim($value);
        // If has dots and commas, dots are thousands separators
        if (str_contains($value, '.') && str_contains($value, ',')) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        }
        // If only dots and last segment is 3 digits, treat as thousands separator
        elseif (str_contains($value, '.')) {
            $parts = explode('.', $value);
            $lastPart = end($parts);
            if (strlen($lastPart) === 3 && count($parts) > 1) {
                $value = str_replace('.', '', $value);
            }
        }
        // If only commas, treat as thousands separator
        elseif (str_contains($value, ',')) {
            $parts = explode(',', $value);
            $lastPart = end($parts);
            if (strlen($lastPart) === 3) {
                $value = str_replace(',', '', $value);
            } else {
                $value = str_replace(',', '.', $value);
            }
        }

        return (float) $value;
    }

    private function findProductMatch(string $rawName, $products): array
    {
        $noMatch = [
            'product_id' => null,
            'product_name' => null,
            'product_sku' => null,
            'confidence' => 0,
        ];

        $rawLower = mb_strtolower(trim($rawName));
        $bestMatch = null;
        $bestScore = 0;

        foreach ($products as $product) {
            $productLower = mb_strtolower($product->name);

            // Exact match
            if ($rawLower === $productLower) {
                return [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'confidence' => 1.0,
                ];
            }

            // Contains match (one contains the other)
            if (str_contains($productLower, $rawLower) || str_contains($rawLower, $productLower)) {
                $score = 0.85;
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = $product;
                }
                continue;
            }

            // Word-based matching
            $rawWords = preg_split('/[\s\-_]+/', $rawLower);
            $productWords = preg_split('/[\s\-_]+/', $productLower);
            $rawWords = array_filter($rawWords, fn($w) => mb_strlen($w) > 2);
            $productWords = array_filter($productWords, fn($w) => mb_strlen($w) > 2);

            if (empty($rawWords) || empty($productWords)) continue;

            $matchedWords = 0;
            foreach ($rawWords as $rw) {
                foreach ($productWords as $pw) {
                    if (str_contains($pw, $rw) || str_contains($rw, $pw)) {
                        $matchedWords++;
                        break;
                    }
                    // Levenshtein for close typos (only for words > 4 chars)
                    if (mb_strlen($rw) > 4 && mb_strlen($pw) > 4) {
                        $lev = levenshtein($rw, $pw);
                        if ($lev <= 2) {
                            $matchedWords += 0.7;
                            break;
                        }
                    }
                }
            }

            $totalWords = max(count($rawWords), count($productWords));
            $score = $matchedWords / $totalWords;

            if ($score > $bestScore && $score >= 0.4) {
                $bestScore = $score;
                $bestMatch = $product;
            }
        }

        if ($bestMatch && $bestScore >= 0.4) {
            return [
                'product_id' => $bestMatch->id,
                'product_name' => $bestMatch->name,
                'product_sku' => $bestMatch->sku,
                'confidence' => round(min($bestScore, 0.95), 2),
            ];
        }

        return $noMatch;
    }
}
