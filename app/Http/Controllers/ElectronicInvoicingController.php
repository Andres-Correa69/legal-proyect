<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\ElectronicCreditNote;
use App\Models\ElectronicDebitNote;
use App\Models\ElectronicInvoice;
use App\Models\InventoryPurchase;
use App\Models\DocumentSupport;
use App\Models\ExpressAcceptance;
use App\Models\GoodsReceipt;
use App\Models\ReceiptAcknowledgment;
use App\Models\PayrollEmployee;
use App\Models\Sale;
use App\Services\ElectronicInvoicingService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ElectronicInvoicingController extends Controller
{
    protected ElectronicInvoicingService $service;

    public function __construct(ElectronicInvoicingService $service)
    {
        $this->service = $service;
    }

    /**
     * Resolve the branch for the authenticated user (cached per request)
     */
    protected function resolveBranch(Request $request): ?Branch
    {
        $user = $request->user();

        if (!$user || !$user->branch_id) {
            return null;
        }

        // Cache per request via relationship - avoids repeated queries
        return $user->relationLoaded('branch')
            ? $user->branch
            : $user->load('branch')->branch;
    }

    /**
     * Sync catalogs from the external API
     */
    public function syncCatalogs(): JsonResponse
    {
        $synced = $this->service->syncCatalogs();

        return response()->json([
            'success' => true,
            'message' => 'Catalogs synced successfully',
            'synced' => $synced,
        ]);
    }

    /**
     * Get all catalogs from local database
     */
    public function getCatalogs(): JsonResponse
    {
        $catalogs = $this->service->getCatalogs();

        return response()->json($catalogs);
    }

    /**
     * Get registration status for the current branch
     */
    public function status(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'registered' => false,
                'registered_at' => null,
                'has_token' => false,
                'branch_data' => null,
            ]);
        }

        return response()->json([
            'registered' => $branch->electronic_invoicing_registered,
            'registered_at' => $branch->electronic_invoicing_registered_at,
            'has_token' => !empty($branch->electronic_invoicing_token),
            'branch_data' => $branch->electronic_invoicing_registered ? [
                'tax_id' => $branch->ei_tax_id,
                'type_document_identification_id' => $branch->ei_type_document_identification_id,
                'type_organization_id' => $branch->ei_type_organization_id,
                'type_regime_id' => $branch->ei_type_regime_id,
                'type_liability_id' => $branch->ei_type_liability_id,
                'municipality_id' => $branch->ei_municipality_id,
                'business_name' => $branch->ei_business_name,
                'merchant_registration' => $branch->ei_merchant_registration,
                'address' => $branch->ei_address,
                'phone' => $branch->ei_phone,
                'email' => $branch->ei_email,
            ] : null,
        ]);
    }

    /**
     * Register branch in electronic invoicing (POST - initial registration)
     */
    public function register(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        // Check if already registered
        if ($branch->electronic_invoicing_registered) {
            return response()->json([
                'success' => false,
                'message' => 'La sede ya está registrada en facturación electrónica. Use PUT para actualizar.',
            ], 400);
        }

        $validated = $request->validate([
            'tax_id' => 'required|string|max:20', // NIT de la sede
            'type_document_identification_id' => 'required|integer',
            'type_organization_id' => 'required|integer',
            'type_regime_id' => 'required|integer',
            'type_liability_id' => 'required|integer',
            'business_name' => 'required|string|max:255',
            'merchant_registration' => 'required|string|max:255',
            'municipality_id' => 'required|integer',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'required|email|max:255',
        ]);

        // Call external API to register
        $result = $this->service->registerCompany($validated['tax_id'], $validated);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al registrar en facturación electrónica',
            ], 400);
        }

        // Save to database
        $branch->update([
            'ei_tax_id' => $validated['tax_id'],
            'ei_type_document_identification_id' => $validated['type_document_identification_id'],
            'ei_type_organization_id' => $validated['type_organization_id'],
            'ei_type_regime_id' => $validated['type_regime_id'],
            'ei_type_liability_id' => $validated['type_liability_id'],
            'ei_municipality_id' => $validated['municipality_id'],
            'ei_business_name' => $validated['business_name'],
            'ei_merchant_registration' => $validated['merchant_registration'],
            'ei_address' => $validated['address'],
            'ei_phone' => $validated['phone'],
            'ei_email' => $validated['email'],
            'electronic_invoicing_registered' => true,
            'electronic_invoicing_registered_at' => now(),
            'electronic_invoicing_token' => $result['token'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sede registrada exitosamente en facturación electrónica',
            'data' => [
                'tax_id' => $branch->ei_tax_id,
                'type_document_identification_id' => $branch->ei_type_document_identification_id,
                'type_organization_id' => $branch->ei_type_organization_id,
                'type_regime_id' => $branch->ei_type_regime_id,
                'type_liability_id' => $branch->ei_type_liability_id,
                'municipality_id' => $branch->ei_municipality_id,
                'business_name' => $branch->ei_business_name,
                'merchant_registration' => $branch->ei_merchant_registration,
                'address' => $branch->ei_address,
                'phone' => $branch->ei_phone,
                'email' => $branch->ei_email,
            ],
        ]);
    }

    /**
     * Update branch electronic invoicing data (PUT - updates, NIT cannot be changed)
     */
    public function update(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        // Must be registered first
        if (!$branch->electronic_invoicing_registered) {
            return response()->json([
                'success' => false,
                'message' => 'La sede no está registrada en facturación electrónica. Use POST para registrar.',
            ], 400);
        }

        // NIT (tax_id) and type_document_identification_id cannot be changed
        $validated = $request->validate([
            'type_organization_id' => 'required|integer',
            'type_regime_id' => 'required|integer',
            'type_liability_id' => 'required|integer',
            'business_name' => 'required|string|max:255',
            'merchant_registration' => 'required|string|max:255',
            'municipality_id' => 'required|integer',
            'address' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'required|email|max:255',
        ]);

        // Update only allowed fields (NOT type_document_identification_id which is tied to NIT)
        $branch->update([
            'ei_type_organization_id' => $validated['type_organization_id'],
            'ei_type_regime_id' => $validated['type_regime_id'],
            'ei_type_liability_id' => $validated['type_liability_id'],
            'ei_municipality_id' => $validated['municipality_id'],
            'ei_business_name' => $validated['business_name'],
            'ei_merchant_registration' => $validated['merchant_registration'],
            'ei_address' => $validated['address'],
            'ei_phone' => $validated['phone'],
            'ei_email' => $validated['email'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Datos de facturación electrónica actualizados',
            'data' => [
                'tax_id' => $branch->ei_tax_id,
                'type_document_identification_id' => $branch->ei_type_document_identification_id,
                'type_organization_id' => $branch->ei_type_organization_id,
                'type_regime_id' => $branch->ei_type_regime_id,
                'type_liability_id' => $branch->ei_type_liability_id,
                'municipality_id' => $branch->ei_municipality_id,
                'business_name' => $branch->ei_business_name,
                'merchant_registration' => $branch->ei_merchant_registration,
                'address' => $branch->ei_address,
                'phone' => $branch->ei_phone,
                'email' => $branch->ei_email,
            ],
        ]);
    }

    /**
     * Send electronic invoice to DIAN
     */
    public function sendInvoice(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        // Check if branch has token
        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'La sede no tiene token de facturación electrónica. Debe registrarse primero.',
            ], 400);
        }

        // Validate required invoice data
        $validated = $request->validate([
            'number' => 'required|integer',
            'sync' => 'required|boolean',
            'type_document_id' => 'required|integer',
            'resolution_id' => 'required|integer',
            'customer' => 'required|array',
            'customer.identification_number' => 'required|string',
            'customer.name' => 'required|string',
            'date' => 'required|date_format:Y-m-d',
            'invoice_lines' => 'required|array|min:1',
            'legal_monetary_totals' => 'required|array',
        ]);

        // Get the full invoice data from request (includes all fields)
        $invoiceData = $request->all();

        // Send to DIAN API
        $result = $this->service->sendInvoice($invoiceData, $branch->electronic_invoicing_token);

        if ($result['success'] && $result['is_valid']) {
            return response()->json([
                'success' => true,
                'is_valid' => true,
                'message' => 'Factura electrónica enviada exitosamente',
                'data' => $result['data'],
            ]);
        }

        return response()->json([
            'success' => false,
            'is_valid' => $result['is_valid'] ?? false,
            'message' => $result['message'] ?? 'Error enviando factura',
            'errors_messages' => $result['errors_messages'] ?? [],
            'errors' => $result['errors'] ?? [],
        ], 422);
    }

    /**
     * Get resolutions from DIAN API
     */
    public function getResolutions(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        $result = $this->service->getResolutions($branch->electronic_invoicing_token);

        return response()->json($result);
    }

    /**
     * Get FE configuration for the current branch
     */
    public function getConfig(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'has_token' => !empty($branch->electronic_invoicing_token),
                'resolution_id' => $branch->ei_resolution_id,
                'prefix' => $branch->ei_prefix,
                'consecutive_start' => $branch->ei_consecutive_start,
                'consecutive_end' => $branch->ei_consecutive_end,
                'current_consecutive' => $branch->ei_current_consecutive,
                // Credit Note numbering
                'cn_prefix' => $branch->ei_cn_prefix,
                'cn_consecutive_start' => $branch->ei_cn_consecutive_start,
                'cn_consecutive_end' => $branch->ei_cn_consecutive_end,
                'cn_current_consecutive' => $branch->ei_cn_current_consecutive,
                // Debit Note numbering
                'dn_prefix' => $branch->ei_dn_prefix,
                'dn_consecutive_start' => $branch->ei_dn_consecutive_start,
                'dn_consecutive_end' => $branch->ei_dn_consecutive_end,
                'dn_current_consecutive' => $branch->ei_dn_current_consecutive,
                // Receipt Acknowledgment numbering
                'ar_prefix' => $branch->ei_ar_prefix,
                'ar_consecutive_start' => $branch->ei_ar_consecutive_start,
                'ar_consecutive_end' => $branch->ei_ar_consecutive_end,
                'ar_current_consecutive' => $branch->ei_ar_current_consecutive,
                // Goods Receipt numbering
                'rb_prefix' => $branch->ei_rb_prefix,
                'rb_consecutive_start' => $branch->ei_rb_consecutive_start,
                'rb_consecutive_end' => $branch->ei_rb_consecutive_end,
                'rb_current_consecutive' => $branch->ei_rb_current_consecutive,
                // Express Acceptance numbering
                'ea_prefix' => $branch->ei_ea_prefix,
                'ea_consecutive_start' => $branch->ei_ea_consecutive_start,
                'ea_consecutive_end' => $branch->ei_ea_consecutive_end,
                'ea_current_consecutive' => $branch->ei_ea_current_consecutive,
                // Document Support
                'ds_prefix' => $branch->ei_ds_prefix,
                'ds_resolution' => $branch->ei_ds_resolution,
                'ds_resolution_date' => $branch->ei_ds_resolution_date?->format('Y-m-d'),
                'ds_consecutive_start' => $branch->ei_ds_consecutive_start,
                'ds_consecutive_end' => $branch->ei_ds_consecutive_end,
                'ds_current_consecutive' => $branch->ei_ds_current_consecutive,
                'ds_date_from' => $branch->ei_ds_date_from?->format('Y-m-d'),
                'ds_date_to' => $branch->ei_ds_date_to?->format('Y-m-d'),
                // Document Support Credit Note
                'ds_cn_prefix' => $branch->ei_ds_cn_prefix,
                'ds_cn_resolution' => $branch->ei_ds_cn_resolution,
                'ds_cn_resolution_date' => $branch->ei_ds_cn_resolution_date?->format('Y-m-d'),
                'ds_cn_consecutive_start' => $branch->ei_ds_cn_consecutive_start,
                'ds_cn_consecutive_end' => $branch->ei_ds_cn_consecutive_end,
                'ds_cn_current_consecutive' => $branch->ei_ds_cn_current_consecutive,
                'ds_cn_date_from' => $branch->ei_ds_cn_date_from?->format('Y-m-d'),
                'ds_cn_date_to' => $branch->ei_ds_cn_date_to?->format('Y-m-d'),
                // POS Electronic Invoice
                'pos_prefix' => $branch->ei_pos_prefix,
                'pos_resolution_id' => $branch->ei_pos_resolution_id,
                'pos_consecutive_start' => $branch->ei_pos_consecutive_start,
                'pos_consecutive_end' => $branch->ei_pos_consecutive_end,
                'pos_current_consecutive' => $branch->ei_pos_current_consecutive,
                'pos_software_id' => $branch->ei_pos_software_id,
                'pos_pin' => $branch->ei_pos_pin,
                // POS Credit Note (anulación POS)
                'pos_cn_prefix' => $branch->ei_pos_cn_prefix,
                'pos_cn_consecutive_start' => $branch->ei_pos_cn_consecutive_start,
                'pos_cn_consecutive_end' => $branch->ei_pos_cn_consecutive_end,
                'pos_cn_current_consecutive' => $branch->ei_pos_cn_current_consecutive,
                // Payroll (Nómina Electrónica) - global fields
                'payroll_software_id' => $branch->ei_payroll_software_id,
                'payroll_pin' => $branch->ei_payroll_pin,
                // Payroll numbering ranges
                'payroll_numbering_ranges' => $branch->payrollNumberingRanges()
                    ->orderBy('created_at', 'desc')
                    ->get(),
            ],
        ]);
    }

    /**
     * Update FE configuration for the current branch
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        $prefixRule = 'nullable|string|max:4';
        $cpPrefixRule = 'nullable|string|max:4|regex:/^CP/i';

        $validated = $request->validate([
            'resolution_id' => 'nullable|integer',
            'prefix' => $prefixRule,
            'consecutive_start' => 'nullable|integer|min:1',
            'consecutive_end' => 'nullable|integer|min:1',
            // Credit Note numbering
            'cn_prefix' => $prefixRule,
            'cn_consecutive_start' => 'nullable|integer|min:1',
            'cn_consecutive_end' => 'nullable|integer|min:1',
            // Debit Note numbering
            'dn_prefix' => $prefixRule,
            'dn_consecutive_start' => 'nullable|integer|min:1',
            'dn_consecutive_end' => 'nullable|integer|min:1',
            // Receipt Acknowledgment numbering
            'ar_prefix' => $cpPrefixRule,
            'ar_consecutive_start' => 'nullable|integer|min:1',
            'ar_consecutive_end' => 'nullable|integer|min:1',
            // Goods Receipt numbering
            'rb_prefix' => $cpPrefixRule,
            'rb_consecutive_start' => 'nullable|integer|min:1',
            'rb_consecutive_end' => 'nullable|integer|min:1',
            // Express Acceptance numbering
            'ea_prefix' => $cpPrefixRule,
            'ea_consecutive_start' => 'nullable|integer|min:1',
            'ea_consecutive_end' => 'nullable|integer|min:1',
            // Document Support
            'ds_prefix' => $prefixRule,
            'ds_resolution' => 'nullable|string|max:50',
            'ds_resolution_date' => 'nullable|date',
            'ds_consecutive_start' => 'nullable|integer|min:1',
            'ds_consecutive_end' => 'nullable|integer|min:1',
            'ds_date_from' => 'nullable|date',
            'ds_date_to' => 'nullable|date',
            // Document Support Credit Note
            'ds_cn_prefix' => $prefixRule,
            'ds_cn_resolution' => 'nullable|string|max:50',
            'ds_cn_resolution_date' => 'nullable|date',
            'ds_cn_consecutive_start' => 'nullable|integer|min:1',
            'ds_cn_consecutive_end' => 'nullable|integer|min:1',
            'ds_cn_date_from' => 'nullable|date',
            'ds_cn_date_to' => 'nullable|date',
            // POS Electronic Invoice
            'pos_prefix' => $prefixRule,
            'pos_resolution_id' => 'nullable|string|max:50',
            'pos_consecutive_start' => 'nullable|integer|min:1',
            'pos_consecutive_end' => 'nullable|integer|min:1',
            'pos_software_id' => 'nullable|string|max:100',
            'pos_pin' => 'nullable|string|max:50',
            // POS Credit Note (anulación POS)
            'pos_cn_prefix' => $cpPrefixRule,
            'pos_cn_consecutive_start' => 'nullable|integer|min:1',
            'pos_cn_consecutive_end' => 'nullable|integer|min:1',
            // Payroll (Nómina Electrónica) - global fields only
            'payroll_software_id' => 'nullable|string|max:100',
            'payroll_pin' => 'nullable|string|max:50',
        ], [
            '*.regex' => 'El prefijo debe iniciar con CP (máximo 4 caracteres).',
        ]);

        // Validate unique prefixes across document types
        $prefixFields = [
            'prefix' => 'Factura Electrónica',
            'cn_prefix' => 'Nota Crédito',
            'dn_prefix' => 'Nota Débito',
            'ar_prefix' => 'Acuse de Recibo',
            'rb_prefix' => 'Recibo de Bienes',
            'ea_prefix' => 'Aceptación Expresa',
            'ds_prefix' => 'Documento Soporte',
            'ds_cn_prefix' => 'NC Documento Soporte',
            'pos_prefix' => 'Factura POS',
            'pos_cn_prefix' => 'NC POS',
        ];

        $usedPrefixes = [];
        $errors = [];

        foreach ($prefixFields as $field => $label) {
            $value = strtoupper(trim($validated[$field] ?? ''));
            if ($value === '') continue;

            if (isset($usedPrefixes[$value])) {
                $errors[$field] = "El prefijo \"{$value}\" ya está en uso en {$usedPrefixes[$value]}.";
            } else {
                $usedPrefixes[$value] = $label;
            }
        }

        if (!empty($errors)) {
            return response()->json([
                'success' => false,
                'message' => 'Hay prefijos duplicados. Cada tipo de documento debe tener un prefijo único.',
                'errors' => $errors,
            ], 422);
        }

        $branch->update([
            'ei_resolution_id' => $validated['resolution_id'],
            'ei_prefix' => $validated['prefix'],
            'ei_consecutive_start' => $validated['consecutive_start'],
            'ei_consecutive_end' => $validated['consecutive_end'],
            // Credit Note numbering
            'ei_cn_prefix' => $validated['cn_prefix'] ?? null,
            'ei_cn_consecutive_start' => $validated['cn_consecutive_start'] ?? null,
            'ei_cn_consecutive_end' => $validated['cn_consecutive_end'] ?? null,
            // Debit Note numbering
            'ei_dn_prefix' => $validated['dn_prefix'] ?? null,
            'ei_dn_consecutive_start' => $validated['dn_consecutive_start'] ?? null,
            'ei_dn_consecutive_end' => $validated['dn_consecutive_end'] ?? null,
            // Receipt Acknowledgment numbering
            'ei_ar_prefix' => $validated['ar_prefix'] ?? null,
            'ei_ar_consecutive_start' => $validated['ar_consecutive_start'] ?? null,
            'ei_ar_consecutive_end' => $validated['ar_consecutive_end'] ?? null,
            // Goods Receipt numbering
            'ei_rb_prefix' => $validated['rb_prefix'] ?? null,
            'ei_rb_consecutive_start' => $validated['rb_consecutive_start'] ?? null,
            'ei_rb_consecutive_end' => $validated['rb_consecutive_end'] ?? null,
            // Express Acceptance numbering
            'ei_ea_prefix' => $validated['ea_prefix'] ?? null,
            'ei_ea_consecutive_start' => $validated['ea_consecutive_start'] ?? null,
            'ei_ea_consecutive_end' => $validated['ea_consecutive_end'] ?? null,
            // Document Support
            'ei_ds_prefix' => $validated['ds_prefix'] ?? null,
            'ei_ds_resolution' => $validated['ds_resolution'] ?? null,
            'ei_ds_resolution_date' => $validated['ds_resolution_date'] ?? null,
            'ei_ds_consecutive_start' => $validated['ds_consecutive_start'] ?? null,
            'ei_ds_consecutive_end' => $validated['ds_consecutive_end'] ?? null,
            'ei_ds_date_from' => $validated['ds_date_from'] ?? null,
            'ei_ds_date_to' => $validated['ds_date_to'] ?? null,
            // Document Support Credit Note
            'ei_ds_cn_prefix' => $validated['ds_cn_prefix'] ?? null,
            'ei_ds_cn_resolution' => $validated['ds_cn_resolution'] ?? null,
            'ei_ds_cn_resolution_date' => $validated['ds_cn_resolution_date'] ?? null,
            'ei_ds_cn_consecutive_start' => $validated['ds_cn_consecutive_start'] ?? null,
            'ei_ds_cn_consecutive_end' => $validated['ds_cn_consecutive_end'] ?? null,
            'ei_ds_cn_date_from' => $validated['ds_cn_date_from'] ?? null,
            'ei_ds_cn_date_to' => $validated['ds_cn_date_to'] ?? null,
            // POS Electronic Invoice
            'ei_pos_prefix' => $validated['pos_prefix'] ?? null,
            'ei_pos_resolution_id' => $validated['pos_resolution_id'] ?? null,
            'ei_pos_consecutive_start' => $validated['pos_consecutive_start'] ?? null,
            'ei_pos_consecutive_end' => $validated['pos_consecutive_end'] ?? null,
            'ei_pos_software_id' => $validated['pos_software_id'] ?? null,
            'ei_pos_pin' => $validated['pos_pin'] ?? null,
            // POS Credit Note (anulación POS)
            'ei_pos_cn_prefix' => $validated['pos_cn_prefix'] ?? null,
            'ei_pos_cn_consecutive_start' => $validated['pos_cn_consecutive_start'] ?? null,
            'ei_pos_cn_consecutive_end' => $validated['pos_cn_consecutive_end'] ?? null,
            // Payroll (Nómina Electrónica) - global fields only
            'ei_payroll_software_id' => $validated['payroll_software_id'] ?? null,
            'ei_payroll_pin' => $validated['payroll_pin'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Configuración de facturación electrónica actualizada',
        ]);
    }

    /**
     * Download the PDF of an electronic invoice
     */
    public function downloadPdf(ElectronicInvoice $electronicInvoice)
    {
        if (empty($electronicInvoice->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta factura electrónica.',
            ], 404);
        }

        $pdfContent = base64_decode($electronicInvoice->pdf_base64_bytes);
        $filename = 'FE-' . ($electronicInvoice->number ?? $electronicInvoice->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Generate electronic invoice from an existing Sale
     */
    public function generateFromSale(Request $request, Sale $sale): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Check if there's already an active (non-voided) electronic invoice
        $lastEI = $sale->electronicInvoices()->latest()->with(['creditNote', 'debitNote'])->first();
        if ($lastEI && !$lastEI->creditNote) {
            return response()->json([
                'success' => false,
                'message' => 'Esta venta ya tiene una factura electrónica activa. Debe anularla primero.',
            ], 400);
        }

        // Load sale relationships
        $sale->load(['items', 'client', 'payments']);

        // Validate client data
        $client = $sale->client;
        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'La venta no tiene cliente asociado.',
            ], 400);
        }

        if (empty($client->document_id)) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente no tiene número de documento.',
            ], 400);
        }

        try {
            $environment = (int) ($branch->ei_environment ?? 2);
            $isPruebas = $environment === 2;

            // Get next consecutive (start from consecutive_start if never used)
            $currentConsecutive = $branch->ei_current_consecutive ?? 0;
            $nextConsecutive = $currentConsecutive > 0
                ? $currentConsecutive + 1
                : (int) $branch->ei_consecutive_start;

            if ($branch->ei_consecutive_end && $nextConsecutive > $branch->ei_consecutive_end) {
                return response()->json([
                    'success' => false,
                    'message' => 'Se alcanzó el límite de consecutivos. Solicite nueva resolución DIAN.',
                ], 400);
            }

            // Build invoice lines from sale items
            $invoiceLines = [];
            $sumLineTax = 0;
            $sumTaxableAmount = 0;
            foreach ($sale->items as $item) {
                $taxRate = (float) ($item->tax_rate ?? 0);
                $taxAmount = (float) ($item->tax_amount ?? 0);
                $discount = (float) ($item->discount_amount ?? 0);
                $grossAmount = (float) $item->unit_price * (float) $item->quantity;
                // line_extension = neto (después de descuento), igual que el sistema viejo
                $lineExtension = $grossAmount - $discount;

                $sumLineTax += $taxAmount;
                $sumTaxableAmount += $lineExtension;

                $line = [
                    'unit_measure_id' => 642,
                    'invoiced_quantity' => number_format($item->quantity, 6, '.', ''),
                    'line_extension_amount' => number_format($lineExtension, 2, '.', ''),
                    'free_of_charge_indicator' => false,
                    'tax_totals' => [
                        [
                            'tax_id' => 1,
                            'tax_amount' => number_format($taxAmount, 2, '.', ''),
                            'taxable_amount' => number_format($lineExtension, 2, '.', ''),
                            'percent' => number_format($taxRate, 2, '.', ''),
                        ],
                    ],
                    'description' => $item->description ?? 'Producto/Servicio',
                    'code' => $item->product_id ? 'PROD-' . $item->product_id : ($item->service_id ? 'SRV-' . $item->service_id : 'ITEM-' . $item->id),
                    'type_item_identification_id' => 4,
                    'price_amount' => number_format((float) $item->unit_price, 2, '.', ''),
                    'base_quantity' => '1.000000',
                ];

                // Descuento a nivel de línea para que la DIAN lo muestre en el detalle
                if ($discount > 0) {
                    $line['allowance_charges'] = [
                        [
                            'charge_indicator' => false,
                            'allowance_charge_reason' => 'Descuento',
                            'amount' => number_format($discount, 2, '.', ''),
                            'base_amount' => number_format($grossAmount, 2, '.', ''),
                        ],
                    ];
                }

                $invoiceLines[] = $line;
            }

            // Build customer data
            $customer = [
                'identification_number' => $client->document_id,
                'name' => $client->name,
                'email' => $client->email ?? $branch->ei_email,
                'type_document_identification_id' => 6,
                'type_organization_id' => 1,
                'type_regime_id' => 1,
                'type_liabilitie_id' => 7,
            ];

            if (!empty($client->phone)) {
                $customer['phone'] = $client->phone;
            }
            if (!empty($client->address)) {
                $customer['address'] = $client->address;
            }

            // Totals - replica exacta del sistema viejo que funciona:
            // line_extension = sum(netos) - impuestos, tax_exclusive = base gravable
            // tax_inclusive = total con IVA, allowance = 0, payable = tax_inclusive
            $taxInclusive = $sumTaxableAmount + $sumLineTax;
            $lineExtensionTotal = $sumTaxableAmount;

            // Build payment forms
            $paymentForms = [
                [
                    'payment_form_id' => 1,
                    'payment_method_id' => 10,
                ],
            ];

            // Build invoice data
            // withholding_tax_totals are informational for DIAN and do NOT affect payable_amount
            $invoiceData = [
                'number' => $nextConsecutive,
                'sync' => true,
                'environment' => ['type_environment_id' => $environment],
                'type_document_id' => 1,
                'customer' => $customer,
                'date' => Carbon::now('America/Bogota')->format('Y-m-d'),
                'legal_monetary_totals' => [
                    'line_extension_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_exclusive_amount' => number_format($sumTaxableAmount, 2, '.', ''),
                    'tax_inclusive_amount' => number_format($taxInclusive, 2, '.', ''),
                    'allowance_total_amount' => '0.00',
                    'charge_total_amount' => '0.00',
                    'payable_amount' => number_format($taxInclusive, 2, '.', ''),
                ],
                'invoice_lines' => $invoiceLines,
                'payment_forms' => $paymentForms,
            ];

            // Add withholding taxes if present
            $withholdingTaxTotals = $this->buildWithholdingTaxTotals($sale);
            if (!empty($withholdingTaxTotals)) {
                $invoiceData['withholding_tax_totals'] = $withholdingTaxTotals;
            }

            // Add resolution only in production
            if (!$isPruebas && !empty($branch->ei_resolution_id)) {
                $invoiceData['resolution_id'] = $branch->ei_resolution_id;
            }

            // Prefix NOT sent in JSON - DIAN API does not require it

            Log::info('=== GENERANDO FACTURA ELECTRÓNICA ===', [
                'sale_id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'environment' => $isPruebas ? 'PRUEBAS' : 'PRODUCCIÓN',
                'consecutive' => $nextConsecutive,
                'date' => $invoiceData['date'],
            ]);

            Log::info('FE Request JSON:', ['invoice_data' => $invoiceData]);

            $token = $branch->electronic_invoicing_token;

            // Send to DIAN API (environment 2 = pruebas)
            $result = $this->service->sendInvoice($invoiceData, $token);

            Log::info('FE Response:', ['result' => $result]);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                // Update consecutive
                $branch->update(['ei_current_consecutive' => $nextConsecutive]);

                // Save DIAN response to database
                $responseData = $result['data'] ?? [];
                $electronicInvoice = ElectronicInvoice::create([
                    'sale_id' => $sale->id,
                    'number' => $responseData['number'] ?? null,
                    'uuid' => $responseData['uuid'] ?? null,
                    'issue_date' => $responseData['issue_date'] ?? null,
                    'expedition_date' => $responseData['expedition_date'] ?? null,
                    'status_description' => $responseData['status_description'] ?? null,
                    'status_message' => $responseData['status_message'] ?? null,
                    'xml_name' => $responseData['xml_name'] ?? null,
                    'zip_name' => $responseData['zip_name'] ?? null,
                    'qr_link' => $responseData['qr_link'] ?? null,
                    'xml_base64_bytes' => $responseData['xml_base64_bytes'] ?? null,
                    'pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                    'payload' => $responseData,
                    'request_payload' => $invoiceData,
                ]);

                Log::info('Factura electrónica generada exitosamente', [
                    'sale_id' => $sale->id,
                    'consecutive' => $nextConsecutive,
                    'electronic_invoice_id' => $electronicInvoice->id,
                ]);

                // Auto-send email
                $this->autoSendEmail($electronicInvoice->uuid, $sale, $branch, 'factura electrónica', $electronicInvoice);

                $electronicInvoice->refresh();
                $electronicInvoices = $sale->electronicInvoices()->with(['creditNote', 'debitNote'])->latest()->get();

                return response()->json([
                    'success' => true,
                    'message' => 'Factura electrónica generada exitosamente',
                    'electronic_invoice' => $electronicInvoice,
                    'electronic_invoices' => $electronicInvoices,
                    'consecutive' => $nextConsecutive,
                ]);
            }

            $errorMessage = $result['message'] ?? 'Error al generar factura electrónica';
            $errorsMessages = $result['errors_messages'] ?? [];
            $errors = $result['errors'] ?? [];

            Log::warning('FE Error al generar factura', [
                'sale_id' => $sale->id,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
            ]);

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'invoice_json' => $invoiceData,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error generando factura electrónica desde venta', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate POS electronic invoice from a sale and send to DIAN
     */
    public function generatePosFromSale(Request $request, Sale $sale): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Check POS config
        if (empty($branch->ei_pos_software_id) || empty($branch->ei_pos_pin)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado el software POS (ID y PIN). Vaya a Configuración FE.',
            ], 400);
        }

        // Check if there's already an active (non-voided) electronic invoice
        $lastEI = $sale->electronicInvoices()->latest()->with(['creditNote', 'debitNote'])->first();
        if ($lastEI && !$lastEI->creditNote) {
            return response()->json([
                'success' => false,
                'message' => 'Esta venta ya tiene una factura electrónica activa. Debe anularla primero.',
            ], 400);
        }

        // Load sale relationships
        $sale->load(['items', 'client', 'payments']);

        // Validate client data
        $client = $sale->client;
        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'La venta no tiene cliente asociado.',
            ], 400);
        }

        if (empty($client->document_id)) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente no tiene número de documento.',
            ], 400);
        }

        if (empty($client->email)) {
            return response()->json([
                'success' => false,
                'message' => 'El cliente no tiene correo electrónico.',
            ], 400);
        }

        try {
            $environment = (int) ($branch->ei_environment ?? 2);
            $isPruebas = $environment === 2;

            // Get next POS consecutive
            $currentConsecutive = $branch->ei_pos_current_consecutive ?? 0;
            $nextConsecutive = $currentConsecutive > 0
                ? $currentConsecutive + 1
                : (int) $branch->ei_pos_consecutive_start;

            if ($branch->ei_pos_consecutive_end && $nextConsecutive > $branch->ei_pos_consecutive_end) {
                return response()->json([
                    'success' => false,
                    'message' => 'Se alcanzó el límite de consecutivos POS. Solicite nueva resolución DIAN.',
                ], 400);
            }

            // Build invoice lines from sale items
            $invoiceLines = [];
            $sumLineTax = 0;
            $sumTaxableAmount = 0;
            foreach ($sale->items as $item) {
                $taxRate = (float) ($item->tax_rate ?? 0);
                $itemTaxAmount = (float) ($item->tax_amount ?? 0);
                $discount = (float) ($item->discount_amount ?? 0);
                $grossAmount = (float) $item->unit_price * (float) $item->quantity;
                // line_extension = neto (después de descuento), igual que el sistema viejo
                $lineExtension = $grossAmount - $discount;

                $sumLineTax += $itemTaxAmount;
                $sumTaxableAmount += $lineExtension;

                $line = [
                    'unit_measure_id' => 642,
                    'invoiced_quantity' => number_format($item->quantity, 6, '.', ''),
                    'line_extension_amount' => number_format($lineExtension, 2, '.', ''),
                    'free_of_charge_indicator' => false,
                    'tax_totals' => [
                        [
                            'tax_id' => 1,
                            'tax_amount' => number_format($itemTaxAmount, 2, '.', ''),
                            'taxable_amount' => number_format($lineExtension, 2, '.', ''),
                            'percent' => number_format($taxRate, 2, '.', ''),
                        ],
                    ],
                    'description' => $item->description ?? 'Producto/Servicio',
                    'code' => $item->product_id ? 'PROD-' . $item->product_id : ($item->service_id ? 'SRV-' . $item->service_id : 'ITEM-' . $item->id),
                    'type_item_identification_id' => 4,
                    'price_amount' => number_format((float) $item->unit_price, 2, '.', ''),
                    'base_quantity' => '1.000000',
                ];

                // Descuento a nivel de línea para que la DIAN lo muestre en el detalle
                if ($discount > 0) {
                    $line['allowance_charges'] = [
                        [
                            'charge_indicator' => false,
                            'allowance_charge_reason' => 'Descuento',
                            'amount' => number_format($discount, 2, '.', ''),
                            'base_amount' => number_format($grossAmount, 2, '.', ''),
                        ],
                    ];
                }

                $invoiceLines[] = $line;
            }

            // Build customer data
            $customer = [
                'identification_number' => $client->document_id,
                'name' => $client->name,
                'email' => $client->email,
                'type_document_identification_id' => 6,
                'type_organization_id' => 1,
                'type_regime_id' => 1,
                'type_liabilitie_id' => 7,
            ];

            if (!empty($client->phone)) {
                $customer['phone'] = $client->phone;
            }
            if (!empty($client->address)) {
                $customer['address'] = $client->address;
            }

            // Totals - replica del sistema viejo: allowance=0, payable=tax_inclusive
            $taxInclusive = $sumTaxableAmount + $sumLineTax;
            $lineExtensionTotal = $sumTaxableAmount;

            // Build payment forms from sale payments
            $paymentForms = [];
            if ($sale->payments && $sale->payments->count() > 0) {
                foreach ($sale->payments as $payment) {
                    $paymentMethodId = 10; // Default: efectivo
                    $method = strtolower($payment->payment_method ?? '');

                    switch ($method) {
                        case 'cash':
                        case 'efectivo':
                            $paymentMethodId = 10;
                            break;
                        case 'bank':
                        case 'banco':
                            $paymentMethodId = 48;
                            break;
                        case 'transfer':
                        case 'transferencia':
                            $paymentMethodId = 47;
                            break;
                        default:
                            $paymentMethodId = 10;
                            break;
                    }

                    $paymentForm = [
                        'payment_form_id' => 1,
                        'payment_method_id' => $paymentMethodId,
                    ];

                    $paymentForms[] = $paymentForm;
                }
            }

            if (empty($paymentForms)) {
                $paymentForms = [['payment_form_id' => 1, 'payment_method_id' => 10]];
            }

            $date = Carbon::now('America/Bogota')->format('Y-m-d');

            // Build POS invoice data
            // withholding_tax_totals are informational for DIAN and do NOT affect payable_amount
            $invoiceData = [
                'number' => $nextConsecutive,
                'sync' => true,
                'type_document_id' => 14,
                'environment' => [
                    'type_environment_id' => $environment,
                    'id' => $branch->ei_pos_software_id,
                    'pin' => $branch->ei_pos_pin,
                ],
                'software_manufacturer' => [
                    'names_and_surnames' => $branch->ei_business_name ?? 'LEGAL SISTEMA',
                    'business_name' => $branch->ei_business_name ?? 'LEGAL SISTEMA',
                    'software_name' => 'LEGAL SISTEMA',
                ],
                'buyer_benefit' => [
                    'code' => (string) ($branch->ei_tax_id ?? ''),
                    'names_and_surnames' => $branch->ei_business_name ?? '',
                    'points' => 0,
                ],
                'point_sale' => [
                    'box_plate' => 'POS001',
                    'location_box' => $branch->address ?? 'Sin dirección',
                    'cashier' => $request->user()->name ?? 'Cajero',
                    'type_box' => 'POS',
                    'sale_code' => (string) $sale->id,
                    'subtotal' => number_format($taxInclusive, 2, '.', ''),
                ],
                'customer' => $customer,
                'date' => $date,
                'legal_monetary_totals' => [
                    'line_extension_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_exclusive_amount' => number_format($sumTaxableAmount, 2, '.', ''),
                    'tax_inclusive_amount' => number_format($taxInclusive, 2, '.', ''),
                    'allowance_total_amount' => '0.00',
                    'charge_total_amount' => '0.00',
                    'payable_amount' => number_format($taxInclusive, 2, '.', ''),
                ],
                'invoice_lines' => $invoiceLines,
                'payment_forms' => $paymentForms,
            ];

            // Add withholding taxes if present
            $withholdingTaxTotals = $this->buildWithholdingTaxTotals($sale);
            if (!empty($withholdingTaxTotals)) {
                $invoiceData['withholding_tax_totals'] = $withholdingTaxTotals;
            }

            // Add resolution only in production
            if (!$isPruebas && !empty($branch->ei_pos_resolution_id)) {
                $invoiceData['resolution_id'] = $branch->ei_pos_resolution_id;
            }

            Log::info('=== GENERANDO FACTURA POS ELECTRÓNICA ===', [
                'sale_id' => $sale->id,
                'invoice_number' => $sale->invoice_number,
                'environment' => $isPruebas ? 'PRUEBAS' : 'PRODUCCIÓN',
                'consecutive' => $nextConsecutive,
                'date' => $date,
            ]);

            Log::info('POS FE Request JSON:', ['invoice_data' => $invoiceData]);

            $token = $branch->electronic_invoicing_token;

            $result = $this->service->sendPosInvoice($invoiceData, $token);

            Log::info('POS FE Response:', ['result' => $result]);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                // Update POS consecutive
                $branch->update(['ei_pos_current_consecutive' => $nextConsecutive]);

                // Save DIAN response to database
                $responseData = $result['data'] ?? [];
                $electronicInvoice = ElectronicInvoice::create([
                    'sale_id' => $sale->id,
                    'number' => $responseData['number'] ?? null,
                    'uuid' => $responseData['uuid'] ?? null,
                    'issue_date' => $responseData['issue_date'] ?? null,
                    'expedition_date' => $responseData['expedition_date'] ?? null,
                    'status_description' => $responseData['status_description'] ?? null,
                    'status_message' => $responseData['status_message'] ?? null,
                    'xml_name' => $responseData['xml_name'] ?? null,
                    'zip_name' => $responseData['zip_name'] ?? null,
                    'qr_link' => $responseData['qr_link'] ?? $responseData['qr_code'] ?? null,
                    'xml_base64_bytes' => $responseData['xml_base64_bytes'] ?? null,
                    'pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                    'payload' => $responseData,
                    'request_payload' => $invoiceData,
                ]);

                Log::info('Factura POS electrónica generada exitosamente', [
                    'sale_id' => $sale->id,
                    'consecutive' => $nextConsecutive,
                    'electronic_invoice_id' => $electronicInvoice->id,
                ]);

                // Auto-send email
                $this->autoSendEmail($electronicInvoice->uuid, $sale, $branch, 'factura POS electrónica', $electronicInvoice);

                $electronicInvoice->refresh();
                $electronicInvoices = $sale->electronicInvoices()->with(['creditNote', 'debitNote'])->latest()->get();

                return response()->json([
                    'success' => true,
                    'message' => 'Factura POS electrónica generada exitosamente',
                    'electronic_invoice' => $electronicInvoice,
                    'electronic_invoices' => $electronicInvoices,
                    'consecutive' => $nextConsecutive,
                ]);
            }

            $errorMessage = $result['message'] ?? 'Error al generar factura POS electrónica';
            $errorsMessages = $result['errors_messages'] ?? [];
            $errors = $result['errors'] ?? [];

            Log::warning('POS FE Error al generar factura', [
                'sale_id' => $sale->id,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
            ]);

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'invoice_json' => $invoiceData,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error generando factura POS electrónica desde venta', [
                'sale_id' => $sale->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Void an electronic invoice by sending a credit note to DIAN
     */
    public function voidInvoice(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Check if already voided (only void-type credit notes block, not adjustments)
        $voidCreditNote = $electronicInvoice->creditNotes()->where('type', 'void')->first();
        if ($voidCreditNote) {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura electrónica ya fue anulada.',
            ], 400);
        }

        // Need the original request payload
        $originalPayload = $electronicInvoice->request_payload;
        if (empty($originalPayload)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró el payload original de la factura. No se puede generar la nota crédito.',
            ], 400);
        }

        try {
            // Detect if original invoice was POS (type_document_id == 14)
            $isPosInvoice = ($originalPayload['type_document_id'] ?? null) == 14;

            if ($isPosInvoice) {
                // POS Credit Note numbering
                $cnCurrentConsecutive = $branch->ei_pos_cn_current_consecutive ?? 0;
                $cnNextConsecutive = $cnCurrentConsecutive > 0
                    ? $cnCurrentConsecutive + 1
                    : (int) $branch->ei_pos_cn_consecutive_start;

                if (!$cnNextConsecutive) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se ha configurado la numeración de notas crédito POS. Vaya a Configuración FE.',
                    ], 400);
                }

                if ($branch->ei_pos_cn_consecutive_end && $cnNextConsecutive > $branch->ei_pos_cn_consecutive_end) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Se alcanzó el límite de consecutivos de notas crédito POS.',
                    ], 400);
                }
            } else {
                // Regular Credit Note numbering
                $cnCurrentConsecutive = $branch->ei_cn_current_consecutive ?? 0;
                $cnNextConsecutive = $cnCurrentConsecutive > 0
                    ? $cnCurrentConsecutive + 1
                    : (int) $branch->ei_cn_consecutive_start;

                if (!$cnNextConsecutive) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se ha configurado la numeración de notas crédito. Vaya a Configuración FE.',
                    ], 400);
                }

                if ($branch->ei_cn_consecutive_end && $cnNextConsecutive > $branch->ei_cn_consecutive_end) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Se alcanzó el límite de consecutivos de notas crédito. Solicite nueva resolución DIAN.',
                    ], 400);
                }
            }

            // Transform the original invoice payload into a credit note payload
            $creditNoteData = $originalPayload;

            // Rename invoice_lines to credit_note_lines
            if (isset($creditNoteData['invoice_lines'])) {
                $creditNoteData['credit_note_lines'] = $creditNoteData['invoice_lines'];
                unset($creditNoteData['invoice_lines']);
            }

            // Set type_document_id: 15 for POS credit note, 5 for regular credit note
            $creditNoteData['type_document_id'] = $isPosInvoice ? 15 : 5;

            // Assign credit note consecutive number
            $creditNoteData['number'] = $cnNextConsecutive;

            // Remove resolution_id if present
            unset($creditNoteData['resolution_id']);

            // Update date to current
            $creditNoteData['date'] = Carbon::now('America/Bogota')->format('Y-m-d');

            // Add billing_reference (reference to the original invoice)
            $billingReference = [
                'number' => $electronicInvoice->number,
                'uuid' => $electronicInvoice->uuid,
                'issue_date' => $electronicInvoice->issue_date
                    ? $electronicInvoice->issue_date->format('Y-m-d')
                    : Carbon::now('America/Bogota')->format('Y-m-d'),
            ];

            // Add discrepancy response
            // POS uses correction_concept_id 17, regular uses 2
            $discrepancyResponse = [
                'correction_concept_id' => $isPosInvoice ? 17 : 2,
            ];

            // Remove null values recursively for POS (DIAN POS API is stricter)
            if ($isPosInvoice) {
                $creditNoteData = $this->removeNullValues($creditNoteData);

                // Remove empty address/email from customer
                if (isset($creditNoteData['customer']['address']) && $creditNoteData['customer']['address'] === '') {
                    unset($creditNoteData['customer']['address']);
                }
                if (isset($creditNoteData['customer']['email']) && $creditNoteData['customer']['email'] === '') {
                    unset($creditNoteData['customer']['email']);
                }
            }

            // Merge billing_reference and discrepancy at the beginning
            $creditNoteData = array_merge(
                [
                    'billing_reference' => $billingReference,
                    'discrepancy_response' => $discrepancyResponse,
                ],
                $creditNoteData
            );

            $docType = $isPosInvoice ? 'POS' : 'ELECTRÓNICA';
            Log::info("=== ANULANDO FACTURA {$docType} (NOTA CRÉDITO) ===", [
                'electronic_invoice_id' => $electronicInvoice->id,
                'original_number' => $electronicInvoice->number,
                'original_uuid' => $electronicInvoice->uuid,
                'is_pos' => $isPosInvoice,
            ]);

            $token = $branch->electronic_invoicing_token;

            // Use different service method for POS vs regular
            $result = $isPosInvoice
                ? $this->service->sendPosCreditNote($creditNoteData, $token)
                : $this->service->sendCreditNote($creditNoteData, $token);

            Log::info('NC Response:', ['result' => $result]);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                $responseData = $result['data'] ?? [];

                // Update credit note consecutive after successful DIAN response
                if ($isPosInvoice) {
                    $branch->update(['ei_pos_cn_current_consecutive' => $cnNextConsecutive]);
                } else {
                    $branch->update(['ei_cn_current_consecutive' => $cnNextConsecutive]);
                }

                $creditNote = ElectronicCreditNote::create([
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'type' => 'void',
                    'number' => $responseData['number'] ?? null,
                    'uuid' => $responseData['uuid'] ?? null,
                    'issue_date' => $responseData['issue_date'] ?? null,
                    'status_description' => $responseData['status_description'] ?? null,
                    'status_message' => $responseData['status_message'] ?? null,
                    'qr_link' => $responseData['qr_link'] ?? null,
                    'xml_base64_bytes' => $responseData['xml_base64_bytes'] ?? null,
                    'pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                    'payload' => $responseData,
                    'request_payload' => $creditNoteData,
                ]);

                $cnType = $isPosInvoice ? 'Factura POS' : 'Factura electrónica';
                Log::info("{$cnType} anulada exitosamente", [
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'credit_note_id' => $creditNote->id,
                ]);

                // Auto-send email
                $sale = $electronicInvoice->sale;
                $this->autoSendEmail($creditNote->uuid, $sale, $branch, $isPosInvoice ? 'nota crédito POS' : 'nota crédito', $creditNote);

                $electronicInvoices = $sale->electronicInvoices()->with(['creditNote', 'debitNote'])->latest()->get();

                return response()->json([
                    'success' => true,
                    'message' => "{$cnType} anulada exitosamente. Nota crédito generada.",
                    'credit_note' => $creditNote,
                    'electronic_invoices' => $electronicInvoices,
                    'request_payload' => $creditNoteData,
                ]);
            }

            $errorMessage = $result['message'] ?? 'Error al generar nota crédito';
            $errorsMessages = $result['errors_messages'] ?? [];
            $errors = $result['errors'] ?? [];

            Log::warning('NC Error al anular factura', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'is_pos' => $isPosInvoice,
            ]);

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'request_payload' => $creditNoteData,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error anulando factura electrónica', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download the PDF of an electronic credit note
     */
    public function downloadCreditNotePdf(ElectronicCreditNote $electronicCreditNote)
    {
        if (empty($electronicCreditNote->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta nota crédito.',
            ], 404);
        }

        $pdfContent = base64_decode($electronicCreditNote->pdf_base64_bytes);
        $filename = 'NC-' . ($electronicCreditNote->number ?? $electronicCreditNote->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Create a debit note for an electronic invoice (increase value)
     */
    public function createDebitNote(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Cannot create debit note if invoice is voided (only void-type blocks)
        $voidCreditNote = $electronicInvoice->creditNotes()->where('type', 'void')->first();
        if ($voidCreditNote) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede crear nota débito para una factura anulada.',
            ], 400);
        }

        // Cannot create debit note if one already exists
        if ($electronicInvoice->debitNote) {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura electrónica ya tiene una nota débito.',
            ], 400);
        }

        try {
            // Get original invoice payload
            $originalPayload = $electronicInvoice->request_payload;
            $customer = $originalPayload['customer'] ?? null;

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró la información del cliente en el payload original.',
                ], 400);
            }

            // Compare current sale items vs original invoice to detect changes
            $sale = $electronicInvoice->sale;
            $sale->load('items');
            $originalTotal = (float) ($originalPayload['legal_monetary_totals']['payable_amount'] ?? 0);
            $currentTotal = (float) $sale->total_amount;

            if ($currentTotal <= $originalTotal) {
                return response()->json([
                    'success' => false,
                    'message' => 'La venta no tiene cambios que justifiquen una nota débito. Debe agregar ítems o aumentar precios primero.',
                ], 400);
            }

            // Calculate the difference amount
            $originalSubtotal = (float) ($originalPayload['legal_monetary_totals']['line_extension_amount'] ?? 0);
            $currentSubtotal = (float) $sale->subtotal;
            $diffSubtotal = $currentSubtotal - $originalSubtotal;
            $diffTax = ($currentTotal - (float) $sale->tax_amount) > 0
                ? (float) $sale->tax_amount - (float) ($originalPayload['legal_monetary_totals']['tax_inclusive_amount'] ?? 0) + $originalSubtotal
                : 0;
            // Simpler: diff total = current total - original total
            $diffTotal = $currentTotal - $originalTotal;

            // Build debit note lines from current sale items (the full current list)
            // The DIAN debit note carries all the NEW items/lines that justify the increase
            $originalLines = $originalPayload['invoice_lines'] ?? [];

            // Build a lookup of original items by description+price for comparison
            $originalItemsMap = [];
            foreach ($originalLines as $origLine) {
                $key = ($origLine['description'] ?? '') . '|' . ($origLine['price_amount'] ?? '0') . '|' . ($origLine['invoiced_quantity'] ?? '0');
                $originalItemsMap[$key] = $origLine;
            }

            $debitNoteLines = [];
            $lineExtensionTotal = 0;
            $taxTotal = 0;

            foreach ($sale->items as $item) {
                $key = ($item->description ?? 'Producto/Servicio') . '|' . number_format((float) $item->unit_price, 2, '.', '') . '|' . number_format($item->quantity, 6, '.', '');

                // Skip items that existed in the original invoice (same description, price, quantity)
                if (isset($originalItemsMap[$key])) {
                    unset($originalItemsMap[$key]); // consume it so duplicates aren't skipped twice
                    continue;
                }

                $taxRate = (float) ($item->tax_rate ?? 0);
                $taxAmount = (float) ($item->tax_amount ?? 0);
                $lineExtension = (float) $item->subtotal;

                $lineExtensionTotal += $lineExtension;
                $taxTotal += $taxAmount;

                $debitNoteLines[] = [
                    'unit_measure_id' => 642,
                    'invoiced_quantity' => number_format($item->quantity, 6, '.', ''),
                    'line_extension_amount' => number_format($lineExtension, 2, '.', ''),
                    'free_of_charge_indicator' => false,
                    'tax_totals' => [
                        [
                            'tax_id' => 1,
                            'tax_amount' => number_format($taxAmount, 2, '.', ''),
                            'taxable_amount' => number_format($lineExtension, 2, '.', ''),
                            'percent' => number_format($taxRate, 2, '.', ''),
                        ],
                    ],
                    'description' => $item->description ?? 'Producto/Servicio',
                    'code' => $item->product_id ? 'PROD-' . $item->product_id : ($item->service_id ? 'SRV-' . $item->service_id : 'ITEM-' . $item->id),
                    'type_item_identification_id' => 4,
                    'price_amount' => number_format((float) $item->unit_price, 2, '.', ''),
                    'base_quantity' => '1.000000',
                ];
            }

            if (empty($debitNoteLines)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron ítems nuevos o con cambios de precio respecto a la factura original.',
                ], 400);
            }

            $taxInclusiveAmount = $lineExtensionTotal + $taxTotal;

            // Get next debit note consecutive
            $dnCurrentConsecutive = $branch->ei_dn_current_consecutive ?? 0;
            $dnNextConsecutive = $dnCurrentConsecutive > 0
                ? $dnCurrentConsecutive + 1
                : (int) $branch->ei_dn_consecutive_start;

            if (!$dnNextConsecutive) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se ha configurado la numeración de notas débito. Vaya a Configuración FE.',
                ], 400);
            }

            if ($branch->ei_dn_consecutive_end && $dnNextConsecutive > $branch->ei_dn_consecutive_end) {
                return response()->json([
                    'success' => false,
                    'message' => 'Se alcanzó el límite de consecutivos de notas débito. Solicite nueva resolución DIAN.',
                ], 400);
            }

            // Build debit note payload
            $debitNoteData = [
                'billing_reference' => [
                    'number' => $electronicInvoice->number,
                    'uuid' => $electronicInvoice->uuid,
                    'issue_date' => $electronicInvoice->issue_date
                        ? $electronicInvoice->issue_date->format('Y-m-d')
                        : Carbon::now('America/Bogota')->format('Y-m-d'),
                ],
                'discrepancy_response' => [
                    'correction_concept_id' => 10,
                ],
                'number' => $dnNextConsecutive,
                'sync' => true,
                'type_document_id' => 6,
                'customer' => $customer,
                'date' => Carbon::now('America/Bogota')->format('Y-m-d'),
                'requested_monetary_totals' => [
                    'line_extension_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_exclusive_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_inclusive_amount' => number_format($taxInclusiveAmount, 2, '.', ''),
                    'allowance_total_amount' => '0.00',
                    'charge_total_amount' => '0.00',
                    'payable_amount' => number_format($taxInclusiveAmount, 2, '.', ''),
                ],
                'debit_note_lines' => $debitNoteLines,
            ];

            // Add withholding taxes from original sale if present
            $withholdingTaxTotals = $this->buildWithholdingTaxTotals($sale);
            if (!empty($withholdingTaxTotals)) {
                $debitNoteData['withholding_tax_totals'] = $withholdingTaxTotals;
            }

            // Add environment if present in original
            if (isset($originalPayload['environment'])) {
                $debitNoteData['environment'] = $originalPayload['environment'];
            }

            Log::info('=== GENERANDO NOTA DÉBITO ===', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'original_number' => $electronicInvoice->number,
                'dn_consecutive' => $dnNextConsecutive,
                'diff_lines_count' => count($debitNoteLines),
                'diff_amount' => $taxInclusiveAmount,
            ]);

            $token = $branch->electronic_invoicing_token;
            $result = $this->service->sendDebitNote($debitNoteData, $token);

            Log::info('ND Response:', ['result' => $result]);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                $responseData = $result['data'] ?? [];

                $branch->update(['ei_dn_current_consecutive' => $dnNextConsecutive]);

                $debitNote = ElectronicDebitNote::create([
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'number' => $responseData['number'] ?? null,
                    'uuid' => $responseData['uuid'] ?? null,
                    'issue_date' => $responseData['issue_date'] ?? null,
                    'status_description' => $responseData['status_description'] ?? null,
                    'status_message' => $responseData['status_message'] ?? null,
                    'qr_link' => $responseData['qr_link'] ?? null,
                    'xml_base64_bytes' => $responseData['xml_base64_bytes'] ?? null,
                    'pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                    'payload' => $responseData,
                    'request_payload' => $debitNoteData,
                ]);

                Log::info('Nota débito generada exitosamente', [
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'debit_note_id' => $debitNote->id,
                ]);

                // Auto-send email
                $this->autoSendEmail($debitNote->uuid, $sale, $branch, 'nota débito', $debitNote);

                $electronicInvoices = $sale->electronicInvoices()
                    ->with(['creditNote', 'debitNote'])
                    ->latest()
                    ->get();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota débito generada exitosamente.',
                    'debit_note' => $debitNote,
                    'electronic_invoices' => $electronicInvoices,
                    'request_payload' => $debitNoteData,
                ]);
            }

            $errorMessage = $result['message'] ?? 'Error al generar nota débito';
            $errorsMessages = $result['errors_messages'] ?? [];
            $errors = $result['errors'] ?? [];

            Log::warning('ND Error al generar nota débito', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
            ]);

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'request_payload' => $debitNoteData,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error generando nota débito', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create an adjustment credit note (rebaja) for an electronic invoice
     */
    public function createAdjustmentCreditNote(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Cannot create adjustment if invoice is voided
        $voidCreditNote = $electronicInvoice->creditNotes()->where('type', 'void')->first();
        if ($voidCreditNote) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede crear nota crédito para una factura anulada.',
            ], 400);
        }

        // Cannot create adjustment if one already exists
        $existingAdjustment = $electronicInvoice->creditNotes()->where('type', 'adjustment')->first();
        if ($existingAdjustment) {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura electrónica ya tiene una nota crédito de ajuste.',
            ], 400);
        }

        try {
            // Get original invoice payload
            $originalPayload = $electronicInvoice->request_payload;
            $customer = $originalPayload['customer'] ?? null;

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontró la información del cliente en el payload original.',
                ], 400);
            }

            // Compare current sale items vs original invoice to detect reductions
            $sale = $electronicInvoice->sale;
            $sale->load('items');
            $originalTotal = (float) ($originalPayload['legal_monetary_totals']['payable_amount'] ?? 0);
            $currentTotal = (float) $sale->total_amount;

            if ($currentTotal >= $originalTotal) {
                return response()->json([
                    'success' => false,
                    'message' => 'La venta no tiene cambios que justifiquen una nota crédito. Debe reducir ítems o disminuir precios primero.',
                ], 400);
            }

            // Map original items by description|price → accumulated qty
            $originalLines = $originalPayload['invoice_lines'] ?? [];
            $originalItemsMap = [];
            foreach ($originalLines as $origLine) {
                $key = ($origLine['description'] ?? '') . '|' . ($origLine['price_amount'] ?? '0');
                if (isset($originalItemsMap[$key])) {
                    $originalItemsMap[$key]['quantity'] += (float) ($origLine['invoiced_quantity'] ?? 0);
                } else {
                    $originalItemsMap[$key] = [
                        'quantity' => (float) ($origLine['invoiced_quantity'] ?? 0),
                        'line' => $origLine,
                    ];
                }
            }

            // Map current items by description|price → accumulated qty
            $currentItemsMap = [];
            foreach ($sale->items as $item) {
                $key = ($item->description ?? 'Producto/Servicio') . '|' . number_format((float) $item->unit_price, 2, '.', '');
                if (isset($currentItemsMap[$key])) {
                    $currentItemsMap[$key] += (float) $item->quantity;
                } else {
                    $currentItemsMap[$key] = (float) $item->quantity;
                }
            }

            // Build credit note lines from differences
            $creditNoteLines = [];
            $lineExtensionTotal = 0;
            $taxTotal = 0;

            foreach ($originalItemsMap as $key => $originalData) {
                $currentQty = $currentItemsMap[$key] ?? 0;
                $diffQty = $originalData['quantity'] - $currentQty;

                if ($diffQty > 0) {
                    $origLine = $originalData['line'];
                    $priceAmount = (float) ($origLine['price_amount'] ?? 0);
                    $lineExtension = $diffQty * $priceAmount;

                    // Get tax info from original line
                    $taxInfo = $origLine['tax_totals'][0] ?? null;
                    $taxPercent = $taxInfo ? (float) ($taxInfo['percent'] ?? 0) : 0;
                    $taxAmount = $lineExtension * ($taxPercent / 100);

                    $lineExtensionTotal += $lineExtension;
                    $taxTotal += $taxAmount;

                    $creditNoteLines[] = [
                        'unit_measure_id' => $origLine['unit_measure_id'] ?? 642,
                        'invoiced_quantity' => number_format($diffQty, 6, '.', ''),
                        'line_extension_amount' => number_format($lineExtension, 2, '.', ''),
                        'free_of_charge_indicator' => false,
                        'tax_totals' => [
                            [
                                'tax_id' => $taxInfo['tax_id'] ?? 1,
                                'tax_amount' => number_format($taxAmount, 2, '.', ''),
                                'taxable_amount' => number_format($lineExtension, 2, '.', ''),
                                'percent' => number_format($taxPercent, 2, '.', ''),
                            ],
                        ],
                        'description' => $origLine['description'] ?? 'Producto/Servicio',
                        'code' => $origLine['code'] ?? 'ITEM',
                        'type_item_identification_id' => $origLine['type_item_identification_id'] ?? 4,
                        'price_amount' => number_format($priceAmount, 2, '.', ''),
                        'base_quantity' => $origLine['base_quantity'] ?? '1.000000',
                    ];
                }
            }

            if (empty($creditNoteLines)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se encontraron ítems reducidos o eliminados respecto a la factura original.',
                ], 400);
            }

            $taxInclusiveAmount = $lineExtensionTotal + $taxTotal;

            // Detect if POS invoice
            $isPosInvoice = ($originalPayload['type_document_id'] ?? null) == 14;

            // Get next credit note consecutive
            if ($isPosInvoice) {
                $cnCurrentConsecutive = $branch->ei_pos_cn_current_consecutive ?? 0;
                $cnNextConsecutive = $cnCurrentConsecutive > 0
                    ? $cnCurrentConsecutive + 1
                    : (int) $branch->ei_pos_cn_consecutive_start;

                if (!$cnNextConsecutive) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se ha configurado la numeración de NC POS. Vaya a Configuración FE.',
                    ], 400);
                }

                if ($branch->ei_pos_cn_consecutive_end && $cnNextConsecutive > $branch->ei_pos_cn_consecutive_end) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Se alcanzó el límite de consecutivos de NC POS.',
                    ], 400);
                }
            } else {
                $cnCurrentConsecutive = $branch->ei_cn_current_consecutive ?? 0;
                $cnNextConsecutive = $cnCurrentConsecutive > 0
                    ? $cnCurrentConsecutive + 1
                    : (int) $branch->ei_cn_consecutive_start;

                if (!$cnNextConsecutive) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No se ha configurado la numeración de notas crédito. Vaya a Configuración FE.',
                    ], 400);
                }

                if ($branch->ei_cn_consecutive_end && $cnNextConsecutive > $branch->ei_cn_consecutive_end) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Se alcanzó el límite de consecutivos de notas crédito.',
                    ], 400);
                }
            }

            // Build credit note payload
            $creditNoteData = [
                'billing_reference' => [
                    'number' => $electronicInvoice->number,
                    'uuid' => $electronicInvoice->uuid,
                    'issue_date' => $electronicInvoice->issue_date
                        ? $electronicInvoice->issue_date->format('Y-m-d')
                        : Carbon::now('America/Bogota')->format('Y-m-d'),
                ],
                'discrepancy_response' => [
                    'correction_concept_id' => 3,
                ],
                'number' => $cnNextConsecutive,
                'sync' => true,
                'customer' => $customer,
                'date' => Carbon::now('America/Bogota')->format('Y-m-d'),
                'legal_monetary_totals' => [
                    'line_extension_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_exclusive_amount' => number_format($lineExtensionTotal, 2, '.', ''),
                    'tax_inclusive_amount' => number_format($taxInclusiveAmount, 2, '.', ''),
                    'allowance_total_amount' => '0.00',
                    'charge_total_amount' => '0.00',
                    'payable_amount' => number_format($taxInclusiveAmount, 2, '.', ''),
                ],
                'credit_note_lines' => $creditNoteLines,
            ];

            // Add withholding taxes from original sale if present
            $withholdingTaxTotals = $this->buildWithholdingTaxTotals($sale);
            if (!empty($withholdingTaxTotals)) {
                $creditNoteData['withholding_tax_totals'] = $withholdingTaxTotals;
            }

            if ($isPosInvoice) {
                $creditNoteData['type_document_id'] = 15;
                $creditNoteData['correction_concept_id'] = 3;

                if (isset($originalPayload['environment'])) {
                    $creditNoteData['environment'] = $originalPayload['environment'];
                }

                // Remove null values for POS
                $creditNoteData = $this->removeNullValues($creditNoteData);
                if (isset($creditNoteData['customer']['address']) && empty($creditNoteData['customer']['address'])) {
                    unset($creditNoteData['customer']['address']);
                }
                if (isset($creditNoteData['customer']['email']) && empty($creditNoteData['customer']['email'])) {
                    unset($creditNoteData['customer']['email']);
                }
            } else {
                $creditNoteData['type_document_id'] = 5;
            }

            Log::info('=== GENERANDO NOTA CRÉDITO DE AJUSTE ===', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'original_number' => $electronicInvoice->number,
                'cn_consecutive' => $cnNextConsecutive,
                'diff_lines_count' => count($creditNoteLines),
                'diff_amount' => $taxInclusiveAmount,
                'is_pos' => $isPosInvoice,
            ]);

            $token = $branch->electronic_invoicing_token;

            if ($isPosInvoice) {
                $result = $this->service->sendPosCreditNote($creditNoteData, $token);
            } else {
                $result = $this->service->sendCreditNote($creditNoteData, $token);
            }

            Log::info('NC Ajuste Response:', ['result' => $result]);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                $responseData = $result['data'] ?? [];

                if ($isPosInvoice) {
                    $branch->update(['ei_pos_cn_current_consecutive' => $cnNextConsecutive]);
                } else {
                    $branch->update(['ei_cn_current_consecutive' => $cnNextConsecutive]);
                }

                $creditNote = ElectronicCreditNote::create([
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'type' => 'adjustment',
                    'number' => $responseData['number'] ?? null,
                    'uuid' => $responseData['uuid'] ?? null,
                    'issue_date' => $responseData['issue_date'] ?? null,
                    'status_description' => $responseData['status_description'] ?? null,
                    'status_message' => $responseData['status_message'] ?? null,
                    'qr_link' => $responseData['qr_link'] ?? null,
                    'xml_base64_bytes' => $responseData['xml_base64_bytes'] ?? null,
                    'pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                    'payload' => $responseData,
                    'request_payload' => $creditNoteData,
                ]);

                Log::info('NC Ajuste generada exitosamente', [
                    'electronic_invoice_id' => $electronicInvoice->id,
                    'credit_note_id' => $creditNote->id,
                ]);

                // Auto-send email
                $this->autoSendEmail($creditNote->uuid, $sale, $branch, 'nota crédito ajuste', $creditNote);

                $electronicInvoices = $sale->electronicInvoices()
                    ->with(['creditNote', 'debitNote'])
                    ->latest()
                    ->get();

                return response()->json([
                    'success' => true,
                    'message' => 'Nota crédito de ajuste generada exitosamente.',
                    'credit_note' => $creditNote,
                    'electronic_invoices' => $electronicInvoices,
                ]);
            }

            $errorMessage = $result['message'] ?? 'Error al generar nota crédito de ajuste';
            $errorsMessages = $result['errors_messages'] ?? [];
            $errors = $result['errors'] ?? [];

            Log::warning('NC Ajuste Error', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
            ]);

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
                'errors_messages' => $errorsMessages,
                'errors' => $errors,
                'request_payload' => $creditNoteData,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error generando nota crédito de ajuste', [
                'electronic_invoice_id' => $electronicInvoice->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download the PDF of an electronic debit note
     */
    public function downloadDebitNotePdf(ElectronicDebitNote $electronicDebitNote)
    {
        if (empty($electronicDebitNote->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta nota débito.',
            ], 404);
        }

        $pdfContent = base64_decode($electronicDebitNote->pdf_base64_bytes);
        $filename = 'ND-' . ($electronicDebitNote->number ?? $electronicDebitNote->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Send email for an electronic invoice
     */
    public function sendInvoiceEmail(Request $request, ElectronicInvoice $electronicInvoice): JsonResponse
    {
        return $this->sendDocumentEmail($request, $electronicInvoice->uuid, $electronicInvoice->sale, 'factura electrónica', $electronicInvoice);
    }

    /**
     * Send email for a credit note
     */
    public function sendCreditNoteEmail(Request $request, ElectronicCreditNote $electronicCreditNote): JsonResponse
    {
        $electronicInvoice = $electronicCreditNote->electronicInvoice;
        return $this->sendDocumentEmail($request, $electronicCreditNote->uuid, $electronicInvoice?->sale, 'nota crédito', $electronicCreditNote);
    }

    /**
     * Send email for a debit note
     */
    public function sendDebitNoteEmail(Request $request, ElectronicDebitNote $electronicDebitNote): JsonResponse
    {
        $electronicInvoice = $electronicDebitNote->electronicInvoice;
        return $this->sendDocumentEmail($request, $electronicDebitNote->uuid, $electronicInvoice?->sale, 'nota débito', $electronicDebitNote);
    }

    /**
     * Generic method to send document email via DIAN API
     */
    private function sendDocumentEmail(Request $request, ?string $uuid, ?Sale $sale, string $documentType, ?Model $document = null): JsonResponse
    {
        if (empty($uuid)) {
            return response()->json([
                'success' => false,
                'message' => "La {$documentType} no tiene UUID. No se puede enviar por correo.",
            ], 400);
        }

        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene token de facturación electrónica configurado.',
            ], 400);
        }

        // Build email recipients: company email as "to", client email as "cc"
        $companyEmail = $branch->ei_email ?? $request->user()?->email;
        $clientEmail = $sale?->client?->email;

        if (empty($companyEmail)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró un correo de la empresa para enviar.',
            ], 400);
        }

        $to = [$companyEmail];
        $cc = $clientEmail ? [$clientEmail] : [];

        $result = $this->service->sendEmail($uuid, $branch->electronic_invoicing_token, $to, $cc);

        if ($result['success']) {
            $document?->update(['email_status' => 'sent']);

            return response()->json([
                'success' => true,
                'message' => ucfirst($documentType) . ' enviada por correo exitosamente.',
                'data' => ['email_status' => 'sent'],
            ]);
        }

        $document?->update(['email_status' => 'pending']);

        return response()->json([
            'success' => false,
            'message' => $result['message'] ?? "Error al enviar {$documentType} por correo.",
            'data' => ['email_status' => 'pending'],
        ], 400);
    }

    /**
     * Auto-send email after document generation (fire-and-forget)
     */
    private function autoSendEmail(?string $uuid, ?Sale $sale, Branch $branch, string $documentType, ?Model $document = null): void
    {
        if (empty($uuid) || empty($branch->electronic_invoicing_token)) {
            return;
        }

        try {
            $companyEmail = $branch->ei_email ?? auth()->user()?->email;
            $clientEmail = $sale?->client?->email;

            if (empty($companyEmail)) {
                return;
            }

            $to = [$companyEmail];
            $cc = $clientEmail ? [$clientEmail] : [];

            $result = $this->service->sendEmail($uuid, $branch->electronic_invoicing_token, $to, $cc);

            $document?->update(['email_status' => $result['success'] ? 'sent' : 'pending']);

            Log::info("Auto-email {$documentType}: " . ($result['success'] ? 'enviado' : 'falló'), [
                'uuid' => $uuid,
                'to' => $to,
                'cc' => $cc,
                'result' => $result['success'],
            ]);
        } catch (\Exception $e) {
            $document?->update(['email_status' => 'pending']);

            Log::warning("Error al auto-enviar email de {$documentType}", [
                'uuid' => $uuid,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Remove null values recursively from an array
     */
    private function removeNullValues(array $arr): array
    {
        foreach ($arr as $key => &$value) {
            if (is_array($value)) {
                $value = $this->removeNullValues($value);
            }
            if (is_null($value)) {
                unset($arr[$key]);
            }
        }
        return $arr;
    }

    /**
     * Build withholding_tax_totals array from sale retentions for DIAN payload.
     * Maps: retefuente → tax_id 6 (ReteRenta), reteiva → tax_id 5 (ReteIVA),
     *        reteica → tax_id 7 (ReteICA)
     */
    private function buildWithholdingTaxTotals(Sale $sale): array
    {
        if (empty($sale->retentions) || !is_array($sale->retentions)) {
            return [];
        }

        $taxIdMap = [
            'retefuente' => 6,
            'reteiva' => 5,
            'reteica' => 7,
        ];

        $totals = [];
        $totalBeforeRetentions = (float) $sale->subtotal - (float) $sale->discount_amount + (float) $sale->tax_amount;

        foreach ($sale->retentions as $retention) {
            $type = $retention['type'] ?? null;
            $taxId = $taxIdMap[$type] ?? null;

            if (!$taxId) continue;

            $value = (float) ($retention['value'] ?? 0);
            $percentage = (float) ($retention['percentage'] ?? 0);

            if ($value <= 0) continue;

            $totals[] = [
                'tax_id' => $taxId,
                'tax_amount' => number_format($value, 2, '.', ''),
                'taxable_amount' => number_format($totalBeforeRetentions, 2, '.', ''),
                'percent' => number_format($percentage, 4, '.', ''),
            ];
        }

        return $totals;
    }

    // =========================================================================
    // Habilitación DIAN - Proceso para pasar a Producción (PDN)
    // =========================================================================

    /**
     * Payload fijo de prueba para habilitación DIAN (igual para todas las sedes)
     */
    private const HABILITACION_CUSTOMER = [
        'identification_number' => 1033341220,
        'name' => 'Miguel angel orrego',
        'address' => 'Urbanización las heliconias',
        'email' => 'orrego150217@gmail.com',
        'municipality_id' => 820,
    ];

    private const HABILITACION_INVOICE_LINES = [
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 25000.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [
                ['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 25000.00', 'percent' => '0.00'],
            ],
            'description' => 'Consulta diurna (excluido)',
            'code' => '0913',
            'type_item_identification_id' => 3,
            'price_amount' => '25000.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 75300.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [
                ['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 75300.00', 'percent' => '0.00'],
            ],
            'description' => 'Bravecto tab 10-20 KG (excluido)',
            'code' => '47',
            'type_item_identification_id' => 3,
            'price_amount' => '75300.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 16100.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [
                ['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 16100.00', 'percent' => '0.00'],
            ],
            'description' => 'Splend colirio (excluido)',
            'code' => '347',
            'type_item_identification_id' => 3,
            'price_amount' => '16100.00',
            'base_quantity' => '1.000000',
        ],
    ];

    private const HABILITACION_TOTALS = [
        'line_extension_amount' => ' 116400.00',
        'tax_exclusive_amount' => ' 116400.00',
        'tax_inclusive_amount' => '116400.00',
        'allowance_total_amount' => '0.00',
        'charge_total_amount' => '0.00',
        'payable_amount' => '116400.00',
    ];

    private const HABILITACION_DEBIT_NOTE_LINES = [
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 45000.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 45000.00', 'percent' => '0.00']],
            'description' => 'PROPLAN URINARY PERRO (excluido)',
            'code' => 'N0058',
            'type_item_identification_id' => 3,
            'price_amount' => '45000.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 8000.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 8000.00', 'percent' => '0.00']],
            'description' => 'ARTRIN PRO (excluido)',
            'code' => '96666',
            'type_item_identification_id' => 3,
            'price_amount' => '8000.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 10924.37',
            'free_of_charge_indicator' => false,
            'tax_totals' => [['tax_id' => 1, 'tax_amount' => '2076.00', 'taxable_amount' => ' 10924.37', 'percent' => '19.00']],
            'description' => 'firprostar',
            'code' => '1256497',
            'type_item_identification_id' => 4,
            'price_amount' => '10924.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 41000.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 41000.00', 'percent' => '0.00']],
            'description' => 'PROPLAN ADULTO GATO X 1KILO (excluido)',
            'code' => 'N0053',
            'type_item_identification_id' => 3,
            'price_amount' => '41000.00',
            'base_quantity' => '1.000000',
        ],
        [
            'unit_measure_id' => 642,
            'invoiced_quantity' => '1.000000',
            'line_extension_amount' => ' 37500.00',
            'free_of_charge_indicator' => false,
            'tax_totals' => [['tax_id' => 1, 'tax_amount' => '0.00', 'taxable_amount' => ' 37500.00', 'percent' => '0.00']],
            'description' => 'PROPLAN CACHORRO X 1 KILO PERO (excluido)',
            'code' => '7613034479006',
            'type_item_identification_id' => 3,
            'price_amount' => '37500.00',
            'base_quantity' => '1.000000',
        ],
    ];

    private const HABILITACION_DEBIT_TOTALS = [
        'line_extension_amount' => ' 142424.37',
        'tax_exclusive_amount' => ' 142424.37',
        'tax_inclusive_amount' => '144500.00',
        'allowance_total_amount' => '0.00',
        'charge_total_amount' => '0.00',
        'payable_amount' => '144500.00',
    ];

    /**
     * Get habilitación status for the current branch
     */
    public function habilitacionStatus(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        $habData = $branch->ei_habilitacion_data ?? [];
        $invoices = $habData['invoices'] ?? [];
        $creditNote = $habData['credit_note'] ?? null;
        $debitNote = $habData['debit_note'] ?? null;

        $invoicesCompleted = count(array_filter($invoices, fn($i) => $i['success'] ?? false));
        $allDocumentsReady = $invoicesCompleted >= 2
            && ($creditNote['success'] ?? false)
            && ($debitNote['success'] ?? false);

        return response()->json([
            'success' => true,
            'data' => [
                'registered' => (bool) $branch->electronic_invoicing_registered,
                'has_token' => !empty($branch->electronic_invoicing_token),
                'environment' => $branch->ei_environment,
                'test_uuid' => $branch->ei_test_uuid,
                'has_certificate' => !empty($branch->ei_software_id) && !empty($branch->ei_certificate),
                'software_id' => $branch->ei_software_id,
                'pin' => $branch->ei_pin,
                'environment_set' => $habData['environment_set'] ?? false,
                'invoices' => $invoices,
                'credit_note' => $creditNote,
                'debit_note' => $debitNote,
                'can_enable_production' => $allDocumentsReady,
                'is_production' => $branch->ei_environment === 1,
            ],
        ]);
    }

    /**
     * Configure DIAN environment (set certificate, pin, software_id)
     */
    public function habilitacionSetEnvironment(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe registrar la sede primero.',
            ], 400);
        }

        $validated = $request->validate([
            'type_environment_id' => 'required|integer|in:1,2',
            'software_id' => 'required|string|max:100',
            'pin' => 'required|string|max:20',
            'certificate' => 'required|string',
            'certificate_password' => 'required|string|max:255',
        ]);

        // Build API payload
        $apiData = [
            'type_environment_id' => $validated['type_environment_id'],
            'id' => $validated['software_id'],
            'pin' => $validated['pin'],
            'certificate' => $validated['certificate'],
            'password' => $validated['certificate_password'],
        ];

        $result = $this->service->setEnvironment($apiData, $branch->electronic_invoicing_token);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error configurando ambiente',
                'data' => $result['data'] ?? null,
            ], 422);
        }

        // Save certificate data and update habilitacion tracking
        $habData = $branch->ei_habilitacion_data ?? [];
        $habData['environment_set'] = true;

        $branch->update([
            'ei_software_id' => $validated['software_id'],
            'ei_pin' => $validated['pin'],
            'ei_certificate' => $validated['certificate'],
            'ei_certificate_password' => $validated['certificate_password'],
            'ei_environment' => $validated['type_environment_id'],
            'ei_habilitacion_data' => $habData,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ambiente configurado exitosamente',
            'data' => $result['data'] ?? null,
        ]);
    }

    /**
     * Send habilitación test invoice (auto-generated payload)
     */
    public function habilitacionSendInvoice(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe registrar la sede primero.',
            ], 400);
        }

        $habData = $branch->ei_habilitacion_data ?? [];
        $invoices = $habData['invoices'] ?? [];

        // Determine which invoice number to send (max 2)
        $successCount = count(array_filter($invoices, fn($i) => $i['success'] ?? false));
        if ($successCount >= 2) {
            return response()->json([
                'success' => false,
                'message' => 'Ya se enviaron las 2 facturas de prueba exitosamente.',
            ], 400);
        }

        $invoiceNumber = 990000001 + count($invoices);

        $invoiceData = [
            'number' => $invoiceNumber,
            'sync' => true,
            'type_document_id' => 1,
            'customer' => self::HABILITACION_CUSTOMER,
            'legal_monetary_totals' => self::HABILITACION_TOTALS,
            'invoice_lines' => self::HABILITACION_INVOICE_LINES,
        ];

        $testUuid = $branch->ei_test_uuid;
        $result = $this->service->sendInvoice($invoiceData, $branch->electronic_invoicing_token, $testUuid);

        $isSuccess = $result['success'] && ($result['is_valid'] ?? false);
        $responseData = $result['data'] ?? [];

        // Track this invoice attempt
        $invoices[] = [
            'number' => $responseData['number'] ?? "SETP{$invoiceNumber}",
            'uuid' => $responseData['uuid'] ?? null,
            'issue_date' => $responseData['issue_date'] ?? now()->format('Y-m-d'),
            'success' => $isSuccess,
        ];

        $habData['invoices'] = $invoices;
        $branch->update(['ei_habilitacion_data' => $habData]);

        if (!$isSuccess) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error enviando factura de prueba',
                'errors_messages' => $result['errors_messages'] ?? [],
                'data' => $responseData,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => "Factura de prueba #{$invoiceNumber} enviada exitosamente",
            'data' => [
                'number' => $responseData['number'] ?? null,
                'uuid' => $responseData['uuid'] ?? null,
                'issue_date' => $responseData['issue_date'] ?? null,
            ],
        ]);
    }

    /**
     * Send habilitación credit note (references invoice 1)
     */
    public function habilitacionSendCreditNote(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe registrar la sede primero.',
            ], 400);
        }

        $habData = $branch->ei_habilitacion_data ?? [];
        $invoices = $habData['invoices'] ?? [];

        // Need at least 1 successful invoice to reference
        $successfulInvoices = array_filter($invoices, fn($i) => $i['success'] ?? false);
        if (empty($successfulInvoices)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar al menos una factura de prueba exitosa antes de la nota crédito.',
            ], 400);
        }

        if (!empty($habData['credit_note']['success'])) {
            return response()->json([
                'success' => false,
                'message' => 'La nota crédito ya fue enviada exitosamente.',
            ], 400);
        }

        // Reference first successful invoice
        $refInvoice = reset($successfulInvoices);

        $creditNoteData = [
            'billing_reference' => [
                'number' => $refInvoice['number'],
                'uuid' => $refInvoice['uuid'],
                'issue_date' => $refInvoice['issue_date'],
            ],
            'discrepancy_response' => [
                'correction_concept_id' => 2,
            ],
            'number' => 1,
            'type_document_id' => 5,
            'customer' => self::HABILITACION_CUSTOMER,
            'legal_monetary_totals' => self::HABILITACION_TOTALS,
            'credit_note_lines' => self::HABILITACION_INVOICE_LINES,
        ];

        $testUuid = $branch->ei_test_uuid;
        $result = $this->service->sendCreditNote($creditNoteData, $branch->electronic_invoicing_token, $testUuid);

        $isSuccess = $result['success'] && ($result['is_valid'] ?? false);
        $responseData = $result['data'] ?? [];

        $habData['credit_note'] = [
            'number' => $responseData['number'] ?? 1,
            'uuid' => $responseData['uuid'] ?? null,
            'issue_date' => $responseData['issue_date'] ?? now()->format('Y-m-d'),
            'success' => $isSuccess,
        ];

        $branch->update(['ei_habilitacion_data' => $habData]);

        if (!$isSuccess) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error enviando nota crédito',
                'errors_messages' => $result['errors_messages'] ?? [],
                'data' => $responseData,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nota crédito enviada exitosamente',
            'data' => [
                'number' => $responseData['number'] ?? null,
                'uuid' => $responseData['uuid'] ?? null,
                'issue_date' => $responseData['issue_date'] ?? null,
            ],
        ]);
    }

    /**
     * Send habilitación debit note (references invoice 2)
     */
    public function habilitacionSendDebitNote(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe registrar la sede primero.',
            ], 400);
        }

        $habData = $branch->ei_habilitacion_data ?? [];
        $invoices = $habData['invoices'] ?? [];

        // Need at least 2 successful invoices (reference the second one)
        $successfulInvoices = array_values(array_filter($invoices, fn($i) => $i['success'] ?? false));
        if (count($successfulInvoices) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar las 2 facturas de prueba exitosas antes de la nota débito.',
            ], 400);
        }

        if (!empty($habData['debit_note']['success'])) {
            return response()->json([
                'success' => false,
                'message' => 'La nota débito ya fue enviada exitosamente.',
            ], 400);
        }

        // Reference second successful invoice
        $refInvoice = $successfulInvoices[1];

        $debitNoteData = [
            'billing_reference' => [
                'number' => $refInvoice['number'],
                'uuid' => $refInvoice['uuid'],
                'issue_date' => $refInvoice['issue_date'],
            ],
            'discrepancy_response' => [
                'correction_concept_id' => 10,
            ],
            'number' => 1,
            'type_document_id' => 6,
            'customer' => self::HABILITACION_CUSTOMER,
            'requested_monetary_totals' => self::HABILITACION_DEBIT_TOTALS,
            'debit_note_lines' => self::HABILITACION_DEBIT_NOTE_LINES,
        ];

        $testUuid = $branch->ei_test_uuid;
        $result = $this->service->sendDebitNote($debitNoteData, $branch->electronic_invoicing_token, $testUuid);

        $isSuccess = $result['success'] && ($result['is_valid'] ?? false);
        $responseData = $result['data'] ?? [];

        $habData['debit_note'] = [
            'number' => $responseData['number'] ?? 1,
            'uuid' => $responseData['uuid'] ?? null,
            'issue_date' => $responseData['issue_date'] ?? now()->format('Y-m-d'),
            'success' => $isSuccess,
        ];

        $branch->update(['ei_habilitacion_data' => $habData]);

        if (!$isSuccess) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error enviando nota débito',
                'errors_messages' => $result['errors_messages'] ?? [],
                'data' => $responseData,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nota débito enviada exitosamente',
            'data' => [
                'number' => $responseData['number'] ?? null,
                'uuid' => $responseData['uuid'] ?? null,
                'issue_date' => $responseData['issue_date'] ?? null,
            ],
        ]);
    }

    /**
     * Enable production (PDN) - switch environment to 1
     */
    public function habilitacionEnableProduction(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario',
            ], 400);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe registrar la sede primero.',
            ], 400);
        }

        // Verify all 4 documents are successful
        $habData = $branch->ei_habilitacion_data ?? [];
        $invoices = $habData['invoices'] ?? [];
        $successfulInvoices = count(array_filter($invoices, fn($i) => $i['success'] ?? false));

        if (
            $successfulInvoices < 2
            || empty($habData['credit_note']['success'])
            || empty($habData['debit_note']['success'])
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Debe completar los 4 documentos de prueba (2 facturas, 1 nota crédito, 1 nota débito) antes de habilitar producción.',
            ], 400);
        }

        // Set environment to production
        $apiData = [
            'type_environment_id' => 1,
            'id' => $branch->ei_software_id,
            'pin' => $branch->ei_pin,
            'certificate' => $branch->ei_certificate,
            'password' => $branch->ei_certificate_password,
        ];

        $result = $this->service->setEnvironment($apiData, $branch->electronic_invoicing_token);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error habilitando producción',
                'data' => $result['data'] ?? null,
            ], 422);
        }

        $branch->update(['ei_environment' => 1]);

        return response()->json([
            'success' => true,
            'message' => 'Habilitado a producción (PDN) exitosamente. Ahora configure la resolución DIAN.',
        ]);
    }

    /**
     * Document type mapping for DIAN API
     */
    private const DOCUMENT_TYPE_MAP = [
        'NIT' => 6,
        'CC'  => 3,
        'CE'  => 5,
        'PT'  => 41,
    ];

    /**
     * Create receipt acknowledgment (DIAN event 030) for a purchase order
     */
    public function createReceiptAcknowledgment(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        $validated = $request->validate([
            'uuid' => 'required|string|min:10',
        ]);

        // Validate purchase status
        if ($inventoryPurchase->status !== 'received') {
            return response()->json([
                'success' => false,
                'message' => 'La compra debe estar en estado "Recibida" para enviar acuse de recibo.',
            ], 422);
        }

        // Check no existing receipt acknowledgment
        if ($inventoryPurchase->receiptAcknowledgment) {
            return response()->json([
                'success' => false,
                'message' => 'Esta compra ya tiene un acuse de recibo registrado.',
            ], 422);
        }

        // Validate AR numbering is configured
        if (empty($branch->ei_ar_prefix) || empty($branch->ei_ar_consecutive_start) || empty($branch->ei_ar_consecutive_end)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado la numeración para acuse de recibo. Configure en Facturación DIAN > Configuración.',
            ], 422);
        }

        // Get next consecutive
        $arNextConsecutive = ($branch->ei_ar_current_consecutive ?? 0) + 1;

        if ($arNextConsecutive < $branch->ei_ar_consecutive_start) {
            $arNextConsecutive = $branch->ei_ar_consecutive_start;
        }

        if ($arNextConsecutive > $branch->ei_ar_consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha agotado el rango de consecutivos para acuse de recibo.',
            ], 422);
        }

        // Load supplier
        $inventoryPurchase->load('supplier');
        $supplier = $inventoryPurchase->supplier;

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró información del proveedor.',
            ], 422);
        }

        if (empty($supplier->tax_id)) {
            return response()->json([
                'success' => false,
                'message' => 'El proveedor no tiene número de documento/NIT registrado.',
            ], 422);
        }

        // Map document type - lookup from catalog, fallback to hardcoded map
        $documentType = $supplier->document_type ?? 'NIT';
        $docTypeRecord = \App\Models\TypeDocumentIdentification::where('name', $documentType)->first();
        $typeDocumentId = $docTypeRecord ? $docTypeRecord->id : (self::DOCUMENT_TYPE_MAP[$documentType] ?? 6);

        // Split supplier name for person fields
        $nameParts = explode(' ', trim($supplier->name), 2);
        $firstName = $nameParts[0];
        $familyName = $nameParts[1] ?? $firstName;

        // Build payload
        $payload = [
            'number' => $arNextConsecutive,
            'prefix' => $branch->ei_ar_prefix,
            'uuid' => $validated['uuid'],
            'sync' => true,
            'environment' => [
                'type_environment_id' => $branch->ei_environment ?? 2,
            ],
            'person' => [
                'type_document_identification_id' => $typeDocumentId,
                'identification_number' => $supplier->tax_id,
                'first_name' => $firstName,
                'family_name' => $familyName,
            ],
        ];

        Log::info('Sending receipt acknowledgment to DIAN', [
            'purchase_id' => $inventoryPurchase->id,
            'supplier' => $supplier->name,
            'cufe' => $validated['uuid'],
            'number' => $arNextConsecutive,
        ]);

        $result = $this->service->sendReceiptAcknowledgment($payload, $branch->electronic_invoicing_token);

        if (!$result['success'] || !($result['is_valid'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar acuse de recibo a la DIAN.',
                'errors_messages' => $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'data' => $result['data'] ?? null,
                'request_payload' => $payload,
            ], 422);
        }

        $data = $result['data'];

        // Update consecutive
        $branch->update(['ei_ar_current_consecutive' => $arNextConsecutive]);

        // Save receipt acknowledgment
        $acknowledgment = ReceiptAcknowledgment::create([
            'inventory_purchase_id' => $inventoryPurchase->id,
            'uuid_reference' => $validated['uuid'],
            'number' => $data['number'] ?? ($branch->ei_ar_prefix . $arNextConsecutive),
            'uuid' => $data['uuid'] ?? null,
            'issue_date' => $data['issue_date'] ?? now(),
            'status_description' => $data['status_description'] ?? null,
            'status_message' => $data['status_message'] ?? 'Acuse de recibo procesado correctamente',
            'qr_link' => $data['qr_link'] ?? null,
            'xml_base64_bytes' => $data['xml_base64_bytes'] ?? null,
            'pdf_base64_bytes' => $data['pdf_base64_bytes'] ?? null,
            'payload' => $data,
            'request_payload' => $payload,
        ]);

        Log::info('Receipt acknowledgment saved', [
            'id' => $acknowledgment->id,
            'purchase_id' => $inventoryPurchase->id,
            'number' => $acknowledgment->number,
        ]);

        // Auto-send email
        $this->autoSendEventEmail($acknowledgment->uuid, $branch);

        return response()->json([
            'success' => true,
            'message' => 'Acuse de recibo enviado correctamente. Número: ' . $acknowledgment->number,
            'receipt_acknowledgment' => $acknowledgment,
        ]);
    }

    /**
     * Create goods receipt (DIAN event 032) for a purchase order
     */
    public function createGoodsReceipt(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        $validated = $request->validate([
            'type_document_identification_id' => 'required|integer',
            'identification_number' => 'required|string',
            'first_name' => 'required|string|max:255',
            'family_name' => 'required|string|max:255',
            'job_title' => 'required|string|max:255',
        ]);

        // Validate purchase status
        if ($inventoryPurchase->status !== 'received') {
            return response()->json([
                'success' => false,
                'message' => 'La compra debe estar en estado "Recibida".',
            ], 422);
        }

        // Must have a receipt acknowledgment first
        $inventoryPurchase->load('receiptAcknowledgment');
        $acuse = $inventoryPurchase->receiptAcknowledgment;

        if (!$acuse) {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar primero el Acuse de Recibo (evento 030).',
            ], 422);
        }

        // Check no existing goods receipt
        if ($inventoryPurchase->goodsReceipt) {
            return response()->json([
                'success' => false,
                'message' => 'Esta compra ya tiene un Recibo del Bien registrado.',
            ], 422);
        }

        // Validate RB numbering is configured
        if (empty($branch->ei_rb_prefix) || empty($branch->ei_rb_consecutive_start) || empty($branch->ei_rb_consecutive_end)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado la numeración para Recibo del Bien. Configure en Facturación DIAN > Configuración.',
            ], 422);
        }

        // Get next consecutive
        $rbNextConsecutive = ($branch->ei_rb_current_consecutive ?? 0) + 1;

        if ($rbNextConsecutive < $branch->ei_rb_consecutive_start) {
            $rbNextConsecutive = $branch->ei_rb_consecutive_start;
        }

        if ($rbNextConsecutive > $branch->ei_rb_consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha agotado el rango de consecutivos para Recibo del Bien.',
            ], 422);
        }

        // Use the UUID returned by the acuse de recibo
        $uuidReference = $acuse->uuid_reference;

        if (empty($uuidReference)) {
            return response()->json([
                'success' => false,
                'message' => 'El Acuse de Recibo no tiene un UUID válido.',
            ], 422);
        }

        // Build payload
        $payload = [
            'number' => $rbNextConsecutive,
            'prefix' => $branch->ei_rb_prefix,
            'uuid' => $uuidReference,
            'sync' => true,
            'environment' => [
                'type_environment_id' => $branch->ei_environment ?? 2,
            ],
            'person' => [
                'type_document_identification_id' => $validated['type_document_identification_id'],
                'identification_number' => $validated['identification_number'],
                'first_name' => $validated['first_name'],
                'family_name' => $validated['family_name'],
                'job_title' => $validated['job_title'],
            ],
        ];

        Log::info('Sending goods receipt to DIAN', [
            'purchase_id' => $inventoryPurchase->id,
            'uuid_reference' => $uuidReference,
            'number' => $rbNextConsecutive,
        ]);

        $result = $this->service->sendGoodsReceipt($payload, $branch->electronic_invoicing_token);

        if (!$result['success'] || !($result['is_valid'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar recibo del bien a la DIAN.',
                'errors_messages' => $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'data' => $result['data'] ?? null,
                'request_payload' => $payload,
            ], 422);
        }

        $data = $result['data'];

        // Update consecutive
        $branch->update(['ei_rb_current_consecutive' => $rbNextConsecutive]);

        // Save goods receipt
        $goodsReceipt = GoodsReceipt::create([
            'inventory_purchase_id' => $inventoryPurchase->id,
            'receipt_acknowledgment_id' => $acuse->id,
            'uuid_reference' => $uuidReference,
            'number' => $data['number'] ?? ($branch->ei_rb_prefix . $rbNextConsecutive),
            'uuid' => $data['uuid'] ?? null,
            'issue_date' => $data['issue_date'] ?? now(),
            'status_description' => $data['status_description'] ?? null,
            'status_message' => $data['status_message'] ?? 'Recibo del bien procesado correctamente',
            'qr_link' => $data['qr_link'] ?? null,
            'xml_base64_bytes' => $data['xml_base64_bytes'] ?? null,
            'pdf_base64_bytes' => $data['pdf_base64_bytes'] ?? null,
            'payload' => $data,
            'request_payload' => $payload,
        ]);

        Log::info('Goods receipt saved', [
            'id' => $goodsReceipt->id,
            'purchase_id' => $inventoryPurchase->id,
            'number' => $goodsReceipt->number,
        ]);

        // Auto-send email
        $this->autoSendEventEmail($goodsReceipt->uuid, $branch);

        return response()->json([
            'success' => true,
            'message' => 'Recibo del Bien enviado correctamente. Número: ' . $goodsReceipt->number,
            'goods_receipt' => $goodsReceipt,
        ]);
    }

    /**
     * Download the PDF of a goods receipt
     */
    public function downloadGoodsReceiptPdf(GoodsReceipt $goodsReceipt)
    {
        if (empty($goodsReceipt->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para este recibo del bien.',
            ], 404);
        }

        $pdfContent = base64_decode($goodsReceipt->pdf_base64_bytes);
        $filename = 'RB-' . ($goodsReceipt->number ?? $goodsReceipt->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Send email for a receipt acknowledgment via DIAN API
     */
    public function sendReceiptAcknowledgmentEmail(Request $request, ReceiptAcknowledgment $receiptAcknowledgment): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'No se encontró token de facturación electrónica.'], 400);
        }

        if (empty($receiptAcknowledgment->uuid)) {
            return response()->json(['success' => false, 'message' => 'El acuse de recibo no tiene UUID.'], 422);
        }

        $companyEmail = $branch->ei_email ?? auth()->user()?->email;
        if (empty($companyEmail)) {
            return response()->json(['success' => false, 'message' => 'No se encontró email configurado.'], 422);
        }

        $result = $this->service->sendEmail($receiptAcknowledgment->uuid, $branch->electronic_invoicing_token, [$companyEmail]);

        $receiptAcknowledgment->update(['email_status' => $result['success'] ? 'sent' : 'pending']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'] ?? ($result['success'] ? 'Correo enviado exitosamente' : 'Error al enviar correo'),
            'data' => ['email_status' => $receiptAcknowledgment->email_status],
        ]);
    }

    /**
     * Send email for a goods receipt via DIAN API
     */
    public function sendGoodsReceiptEmail(Request $request, GoodsReceipt $goodsReceipt): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'No se encontró token de facturación electrónica.'], 400);
        }

        if (empty($goodsReceipt->uuid)) {
            return response()->json(['success' => false, 'message' => 'El recibo del bien no tiene UUID.'], 422);
        }

        $companyEmail = $branch->ei_email ?? auth()->user()?->email;
        if (empty($companyEmail)) {
            return response()->json(['success' => false, 'message' => 'No se encontró email configurado.'], 422);
        }

        $result = $this->service->sendEmail($goodsReceipt->uuid, $branch->electronic_invoicing_token, [$companyEmail]);

        $goodsReceipt->update(['email_status' => $result['success'] ? 'sent' : 'pending']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'] ?? ($result['success'] ? 'Correo enviado exitosamente' : 'Error al enviar correo'),
            'data' => ['email_status' => $goodsReceipt->email_status],
        ]);
    }

    /**
     * Create express acceptance (DIAN event 033) for a purchase order
     */
    public function createExpressAcceptance(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        $validated = $request->validate([
            'type_document_identification_id' => 'required|integer',
            'identification_number' => 'required|string',
            'first_name' => 'required|string|max:255',
            'family_name' => 'required|string|max:255',
            'job_title' => 'required|string|max:255',
        ]);

        // Validate purchase status
        if ($inventoryPurchase->status !== 'received') {
            return response()->json([
                'success' => false,
                'message' => 'La compra debe estar en estado "Recibida".',
            ], 422);
        }

        // Must have receipt acknowledgment and goods receipt first
        $inventoryPurchase->load(['receiptAcknowledgment', 'goodsReceipt']);
        $acuse = $inventoryPurchase->receiptAcknowledgment;

        if (!$acuse) {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar primero el Acuse de Recibo (evento 030).',
            ], 422);
        }

        if (!$inventoryPurchase->goodsReceipt) {
            return response()->json([
                'success' => false,
                'message' => 'Debe enviar primero el Recibo del Bien (evento 032).',
            ], 422);
        }

        // Check no existing express acceptance
        if ($inventoryPurchase->expressAcceptance) {
            return response()->json([
                'success' => false,
                'message' => 'Esta compra ya tiene una Aceptación Expresa registrada.',
            ], 422);
        }

        // Validate EA numbering is configured
        if (empty($branch->ei_ea_prefix) || empty($branch->ei_ea_consecutive_start) || empty($branch->ei_ea_consecutive_end)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado la numeración para Aceptación Expresa. Configure en Facturación DIAN > Configuración.',
            ], 422);
        }

        // Get next consecutive
        $eaNextConsecutive = ($branch->ei_ea_current_consecutive ?? 0) + 1;

        if ($eaNextConsecutive < $branch->ei_ea_consecutive_start) {
            $eaNextConsecutive = $branch->ei_ea_consecutive_start;
        }

        if ($eaNextConsecutive > $branch->ei_ea_consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha agotado el rango de consecutivos para Aceptación Expresa.',
            ], 422);
        }

        // Use the UUID returned by the acuse de recibo
        $uuidReference = $acuse->uuid_reference;

        if (empty($uuidReference)) {
            return response()->json([
                'success' => false,
                'message' => 'El Acuse de Recibo no tiene un UUID válido.',
            ], 422);
        }

        // Build payload
        $payload = [
            'number' => $eaNextConsecutive,
            'prefix' => $branch->ei_ea_prefix,
            'uuid' => $uuidReference,
            'sync' => true,
            'environment' => [
                'type_environment_id' => $branch->ei_environment ?? 2,
            ],
            'person' => [
                'type_document_identification_id' => $validated['type_document_identification_id'],
                'identification_number' => $validated['identification_number'],
                'first_name' => $validated['first_name'],
                'family_name' => $validated['family_name'],
                'job_title' => $validated['job_title'],
            ],
        ];

        Log::info('Sending express acceptance to DIAN', [
            'purchase_id' => $inventoryPurchase->id,
            'uuid_reference' => $uuidReference,
            'number' => $eaNextConsecutive,
        ]);

        $result = $this->service->sendExpressAcceptance($payload, $branch->electronic_invoicing_token);

        if (!$result['success'] || !($result['is_valid'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar aceptación expresa a la DIAN.',
                'errors_messages' => $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'data' => $result['data'] ?? null,
                'request_payload' => $payload,
            ], 422);
        }

        $data = $result['data'];

        // Update consecutive
        $branch->update(['ei_ea_current_consecutive' => $eaNextConsecutive]);

        // Save express acceptance
        $expressAcceptance = ExpressAcceptance::create([
            'inventory_purchase_id' => $inventoryPurchase->id,
            'receipt_acknowledgment_id' => $acuse->id,
            'uuid_reference' => $uuidReference,
            'number' => $data['number'] ?? ($branch->ei_ea_prefix . $eaNextConsecutive),
            'uuid' => $data['uuid'] ?? null,
            'issue_date' => $data['issue_date'] ?? now(),
            'status_description' => $data['status_description'] ?? null,
            'status_message' => $data['status_message'] ?? 'Aceptación expresa procesada correctamente',
            'qr_link' => $data['qr_link'] ?? null,
            'xml_base64_bytes' => $data['xml_base64_bytes'] ?? null,
            'pdf_base64_bytes' => $data['pdf_base64_bytes'] ?? null,
            'payload' => $data,
            'request_payload' => $payload,
        ]);

        Log::info('Express acceptance saved', [
            'id' => $expressAcceptance->id,
            'purchase_id' => $inventoryPurchase->id,
            'number' => $expressAcceptance->number,
        ]);

        // Save person data for auto-fill
        $branch->update([
            'ei_saved_person' => [
                'type_document_identification_id' => $validated['type_document_identification_id'],
                'identification_number' => $validated['identification_number'],
                'first_name' => $validated['first_name'],
                'family_name' => $validated['family_name'],
                'job_title' => $validated['job_title'],
            ],
        ]);

        // Auto-send email
        $this->autoSendEventEmail($expressAcceptance->uuid, $branch);

        return response()->json([
            'success' => true,
            'message' => 'Aceptación Expresa enviada correctamente. Número: ' . $expressAcceptance->number,
            'express_acceptance' => $expressAcceptance,
        ]);
    }

    /**
     * Download the PDF of an express acceptance
     */
    public function downloadExpressAcceptancePdf(ExpressAcceptance $expressAcceptance)
    {
        if (empty($expressAcceptance->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta aceptación expresa.',
            ], 404);
        }

        $pdfContent = base64_decode($expressAcceptance->pdf_base64_bytes);
        $filename = 'EA-' . ($expressAcceptance->number ?? $expressAcceptance->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Send email for an express acceptance via DIAN API
     */
    public function sendExpressAcceptanceEmail(Request $request, ExpressAcceptance $expressAcceptance): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'No se encontró token de facturación electrónica.'], 400);
        }

        if (empty($expressAcceptance->uuid)) {
            return response()->json(['success' => false, 'message' => 'La aceptación expresa no tiene UUID.'], 422);
        }

        $companyEmail = $branch->ei_email ?? auth()->user()?->email;
        if (empty($companyEmail)) {
            return response()->json(['success' => false, 'message' => 'No se encontró email configurado.'], 422);
        }

        $result = $this->service->sendEmail($expressAcceptance->uuid, $branch->electronic_invoicing_token, [$companyEmail]);

        $expressAcceptance->update(['email_status' => $result['success'] ? 'sent' : 'pending']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'] ?? ($result['success'] ? 'Correo enviado exitosamente' : 'Error al enviar correo'),
            'data' => ['email_status' => $expressAcceptance->email_status],
        ]);
    }

    /**
     * Get saved person data for event auto-fill
     */
    public function getSavedPerson(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json(['success' => false, 'message' => 'No se encontró sucursal.'], 400);
        }

        return response()->json([
            'success' => true,
            'data' => $branch->ei_saved_person,
        ]);
    }

    /**
     * Create document support for a purchase
     */
    public function createDocumentSupport(Request $request, InventoryPurchase $inventoryPurchase): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        // Validate purchase status
        if ($inventoryPurchase->status !== 'received') {
            return response()->json([
                'success' => false,
                'message' => 'La compra debe estar en estado "Recibida".',
            ], 422);
        }

        // Check no existing document support
        if ($inventoryPurchase->documentSupport) {
            return response()->json([
                'success' => false,
                'message' => 'Esta compra ya tiene un Documento Soporte registrado.',
            ], 422);
        }

        // Validate DS config
        if (empty($branch->ei_ds_prefix) || empty($branch->ei_ds_resolution) || empty($branch->ei_ds_consecutive_start) || empty($branch->ei_ds_consecutive_end)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado la resolución para Documento Soporte. Configure en Facturación DIAN > Configuración.',
            ], 422);
        }

        // Get next consecutive
        $dsNextConsecutive = ($branch->ei_ds_current_consecutive ?? 0) + 1;

        if ($dsNextConsecutive < $branch->ei_ds_consecutive_start) {
            $dsNextConsecutive = $branch->ei_ds_consecutive_start;
        }

        if ($dsNextConsecutive > $branch->ei_ds_consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha agotado el rango de consecutivos para Documento Soporte.',
            ], 422);
        }

        // Load relationships
        $inventoryPurchase->load(['items.product', 'supplier']);
        $supplier = $inventoryPurchase->supplier;

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'La compra no tiene proveedor asociado.',
            ], 422);
        }

        // Determine form_generation_transmission_id: 1 = same day as reception, 2 = different day
        $receivedDate = $inventoryPurchase->received_at ? $inventoryPurchase->received_at->format('Y-m-d') : now()->format('Y-m-d');
        $today = now()->format('Y-m-d');
        $formGenerationId = ($receivedDate === $today) ? 1 : 2;

        // Build invoice lines from purchase items
        $invoiceLines = [];
        foreach ($inventoryPurchase->items as $item) {
            $lineTotal = $item->quantity_ordered * $item->unit_cost;

            $line = [
                'unit_mesure_id' => 642,
                'invoiced_quantity' => number_format($item->quantity_ordered, 6, '.', ''),
                'vendor_code' => 'N/A',
                'invoice_period' => [
                    'start_date' => $receivedDate,
                    'form_generation_transmission_id' => $formGenerationId,
                ],
                'line_extension_amount' => $lineTotal,
                'description' => $item->product ? $item->product->name : 'Producto',
                'code' => (string) ($item->product_id ?? $item->id),
                'type_item_identification_id' => 3,
                'price_amount' => number_format($lineTotal, 2, '.', ''),
                'base_quantity' => '1.000000',
            ];

            $invoiceLines[] = $line;
        }

        if (empty($invoiceLines)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay items en esta compra.',
            ], 422);
        }

        // Build totals
        $subtotal = (float) $inventoryPurchase->subtotal;
        $taxAmount = (float) $inventoryPurchase->tax_amount;
        $totalAmount = (float) $inventoryPurchase->total_amount;

        // Build payload
        // Environment: 2 = pruebas, 1 = producción
        $environment = (int) ($branch->ei_environment ?? 2);
        $isPruebas = $environment === 2;

        $payload = [
            'number' => $dsNextConsecutive,
            'sync' => true,
            'type_document_id' => 12,
            'type_operation_id' => 28,
            'environment' => ['type_environment_id' => $environment],
        ];

        // Resolution only in production
        if (!$isPruebas) {
            $payload['resolution'] = [
                'prefix' => $branch->ei_ds_prefix,
                'resolution' => $branch->ei_ds_resolution,
                'resolution_date' => $branch->ei_ds_resolution_date?->format('Y-m-d') ?? '',
                'from' => $branch->ei_ds_consecutive_start,
                'to' => $branch->ei_ds_consecutive_end,
                'date_from' => $branch->ei_ds_date_from?->format('Y-m-d') ?? '',
                'date_to' => $branch->ei_ds_date_to?->format('Y-m-d') ?? '',
            ];
        }

        $payload += [
            'customer' => [
                'identification_number' => $supplier->tax_id ?? '',
                'name' => $supplier->name,
                'municipality_id' => $supplier->municipality_id ?? 1006,
                'address' => $supplier->address ?? '',
                'email' => $supplier->email ?? $branch->ei_email ?? '',
            ],
            'legal_monetary_totals' => [
                'line_extension_amount' => number_format($subtotal, 2, '.', ''),
                'tax_exclusive_amount' => number_format($taxAmount > 0 ? $taxAmount : 0, 2, '.', ''),
                'tax_inclusive_amount' => number_format($totalAmount, 2, '.', ''),
                'payable_amount' => number_format($totalAmount, 2, '.', ''),
            ],
            'invoice_lines' => $invoiceLines,
        ];

        // Add withholding taxes from purchase retentions
        // For documento soporte (type_document_id=12), only tax_id 5 (ReteIVA) and 6 (ReteRenta) are allowed
        // ReteICA (tax_id 7) is NOT valid for documento soporte
        if (!empty($inventoryPurchase->retentions) && is_array($inventoryPurchase->retentions)) {
            $taxIdMap = [
                'retefuente' => 6,
                'reteiva' => 5,
                ];

            $withholdingTaxTotals = [];
            foreach ($inventoryPurchase->retentions as $retention) {
                $type = $retention['type'] ?? null;
                $taxId = $taxIdMap[$type] ?? null;
                if (!$taxId) continue;

                $value = (float) ($retention['value'] ?? 0);
                $percentage = (float) ($retention['percentage'] ?? 0);
                if ($value <= 0) continue;

                $withholdingTaxTotals[] = [
                    'tax_id' => $taxId,
                    'tax_amount' => number_format($value, 2, '.', ''),
                    'taxable_amount' => number_format($totalAmount, 2, '.', ''),
                    'percent' => number_format($percentage, 4, '.', ''),
                ];
            }

            if (!empty($withholdingTaxTotals)) {
                $payload['withholding_tax_totals'] = $withholdingTaxTotals;
            }
        }

        Log::info('Sending document support to DIAN', [
            'purchase_id' => $inventoryPurchase->id,
            'number' => $dsNextConsecutive,
            'supplier' => $supplier->name,
        ]);

        $result = $this->service->sendDocumentSupport($payload, $branch->electronic_invoicing_token);

        if (!$result['success'] || !($result['is_valid'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar documento soporte a la DIAN.',
                'errors_messages' => $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'data' => $result['data'] ?? null,
                'request_payload' => $payload,
            ], 422);
        }

        $data = $result['data'];

        // Update consecutive
        $branch->update(['ei_ds_current_consecutive' => $dsNextConsecutive]);

        // Save document support
        $documentSupport = DocumentSupport::create([
            'inventory_purchase_id' => $inventoryPurchase->id,
            'number' => $data['number'] ?? ($branch->ei_ds_prefix . $dsNextConsecutive),
            'uuid' => $data['uuid'] ?? null,
            'expedition_date' => $data['expedition_date'] ?? now(),
            'status_description' => $data['status_description'] ?? null,
            'status_message' => $data['status_message'] ?? 'Documento soporte procesado correctamente',
            'qr_link' => $data['qr_link'] ?? null,
            'pdf_download_link' => $data['pdf_download_link'] ?? null,
            'xml_base64_bytes' => $data['xml_base64_bytes'] ?? null,
            'pdf_base64_bytes' => $data['pdf_base64_bytes'] ?? null,
            'payload' => $data,
            'request_payload' => $payload,
        ]);

        Log::info('Document support saved', [
            'id' => $documentSupport->id,
            'purchase_id' => $inventoryPurchase->id,
            'number' => $documentSupport->number,
        ]);

        // Auto-send email
        $this->autoSendEventEmail($documentSupport->uuid, $branch);

        return response()->json([
            'success' => true,
            'message' => 'Documento Soporte enviado correctamente. Número: ' . $documentSupport->number,
            'document_support' => $documentSupport,
        ]);
    }

    /**
     * Download the PDF of a document support
     */
    public function downloadDocumentSupportPdf(DocumentSupport $documentSupport)
    {
        if (empty($documentSupport->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para este documento soporte.',
            ], 404);
        }

        $pdfContent = base64_decode($documentSupport->pdf_base64_bytes);
        $filename = 'DS-' . ($documentSupport->number ?? $documentSupport->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Send email for a document support via DIAN API
     */
    public function sendDocumentSupportEmail(Request $request, DocumentSupport $documentSupport): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'No se encontró token de facturación electrónica.'], 400);
        }

        if (empty($documentSupport->uuid)) {
            return response()->json(['success' => false, 'message' => 'El documento soporte no tiene UUID.'], 422);
        }

        $companyEmail = $branch->ei_email ?? auth()->user()?->email;
        if (empty($companyEmail)) {
            return response()->json(['success' => false, 'message' => 'No se encontró email configurado.'], 422);
        }

        $result = $this->service->sendEmail($documentSupport->uuid, $branch->electronic_invoicing_token, [$companyEmail]);

        $documentSupport->update(['email_status' => $result['success'] ? 'sent' : 'pending']);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'] ?? ($result['success'] ? 'Correo enviado exitosamente' : 'Error al enviar correo'),
            'data' => ['email_status' => $documentSupport->email_status],
        ]);
    }

    /**
     * Void a document support by sending a credit note (type_document_id: 13) to DIAN
     */
    public function voidDocumentSupport(Request $request, DocumentSupport $documentSupport): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        // Check if already voided
        if ($documentSupport->voided) {
            return response()->json([
                'success' => false,
                'message' => 'Este documento soporte ya fue anulado.',
            ], 422);
        }

        // Validate DS CN config
        if (empty($branch->ei_ds_cn_prefix) || empty($branch->ei_ds_cn_resolution) || empty($branch->ei_ds_cn_consecutive_start) || empty($branch->ei_ds_cn_consecutive_end)) {
            return response()->json([
                'success' => false,
                'message' => 'No se ha configurado la resolución para Nota Crédito Documento Soporte. Configure en Facturación DIAN > Configuración.',
            ], 422);
        }

        // Get next consecutive
        $cnNextConsecutive = ($branch->ei_ds_cn_current_consecutive ?? 0) + 1;

        if ($cnNextConsecutive < $branch->ei_ds_cn_consecutive_start) {
            $cnNextConsecutive = $branch->ei_ds_cn_consecutive_start;
        }

        if ($cnNextConsecutive > $branch->ei_ds_cn_consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha agotado el rango de consecutivos para NC Documento Soporte.',
            ], 422);
        }

        $token = $branch->electronic_invoicing_token;

        // Get the original payload from the stored request_payload, or from DIAN logs
        $originalPayload = $documentSupport->request_payload;

        if (empty($originalPayload) && !empty($documentSupport->uuid)) {
            Log::info('Fetching original DS payload from DIAN logs', ['uuid' => $documentSupport->uuid]);
            $logsResult = $this->service->getDocumentLogs($documentSupport->uuid, $token);

            if ($logsResult['success'] && isset($logsResult['data']['payload'])) {
                $originalPayload = $logsResult['data']['payload'];
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo obtener el payload original del documento soporte.',
                ], 422);
            }
        }

        if (empty($originalPayload)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró el payload original del documento soporte.',
            ], 422);
        }

        try {
            // Transform invoice_lines to credit_note_lines
            $creditNoteLines = $originalPayload['invoice_lines'] ?? [];

            // Build the credit note payload
            $creditNoteData = [
                'number' => $cnNextConsecutive,
                'sync' => true,
                'type_document_id' => 13,
                'discrepancy_response' => [
                    'correction_concept_id' => 12,
                ],
                'billing_reference' => [
                    'number' => $documentSupport->number,
                    'uuid' => $documentSupport->uuid,
                    'issue_date' => $documentSupport->expedition_date
                        ? $documentSupport->expedition_date->format('Y-m-d')
                        : Carbon::now('America/Bogota')->format('Y-m-d'),
                ],
                'resolution' => [
                    'prefix' => $branch->ei_ds_cn_prefix,
                    'resolution' => $branch->ei_ds_cn_resolution,
                    'resolution_date' => $branch->ei_ds_cn_resolution_date?->format('Y-m-d') ?? '',
                    'from' => $branch->ei_ds_cn_consecutive_start,
                    'to' => $branch->ei_ds_cn_consecutive_end,
                    'date_from' => $branch->ei_ds_cn_date_from?->format('Y-m-d') ?? '',
                    'date_to' => $branch->ei_ds_cn_date_to?->format('Y-m-d') ?? '',
                ],
                'customer' => $originalPayload['customer'] ?? [],
                'legal_monetary_totals' => $originalPayload['legal_monetary_totals'] ?? [],
                'credit_note_lines' => $creditNoteLines,
            ];

            Log::info('=== ANULANDO DOCUMENTO SOPORTE (NOTA CRÉDITO DS) ===', [
                'document_support_id' => $documentSupport->id,
                'original_number' => $documentSupport->number,
                'original_uuid' => $documentSupport->uuid,
                'cn_number' => $cnNextConsecutive,
            ]);

            $result = $this->service->sendNoteDocumentSupport($creditNoteData, $token);

            Log::info('Note DS Response:', ['result' => $result]);

            if (!$result['success'] || !($result['is_valid'] ?? false)) {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'] ?? 'Error al anular documento soporte en la DIAN.',
                    'errors_messages' => $result['errors_messages'] ?? [],
                    'errors' => $result['errors'] ?? [],
                    'data' => $result['data'] ?? null,
                ], 422);
            }

            $responseData = $result['data'] ?? [];

            // Update consecutive
            $branch->update(['ei_ds_cn_current_consecutive' => $cnNextConsecutive]);

            // Update document support with void data
            $documentSupport->update([
                'voided' => true,
                'void_uuid' => $responseData['uuid'] ?? null,
                'void_number' => $responseData['number'] ?? ($branch->ei_ds_cn_prefix . $cnNextConsecutive),
                'void_date' => $responseData['expedition_date'] ?? now(),
                'void_pdf_base64_bytes' => $responseData['pdf_base64_bytes'] ?? null,
                'void_payload' => $responseData,
            ]);

            Log::info('Document support voided successfully', [
                'document_support_id' => $documentSupport->id,
                'void_number' => $documentSupport->void_number,
            ]);

            // Auto-send email for the void document
            $this->autoSendEventEmail($documentSupport->void_uuid, $branch);

            return response()->json([
                'success' => true,
                'message' => 'Documento Soporte anulado correctamente. NC: ' . $documentSupport->void_number,
                'document_support' => $documentSupport->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Exception voiding document support', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al anular: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download the void PDF of a document support
     */
    public function downloadDocumentSupportVoidPdf(DocumentSupport $documentSupport)
    {
        if (empty($documentSupport->void_pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para la anulación de este documento soporte.',
            ], 404);
        }

        $pdfContent = base64_decode($documentSupport->void_pdf_base64_bytes);
        $filename = 'NC-DS-' . ($documentSupport->void_number ?? $documentSupport->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Auto-send email for DIAN events (acuse, recibo del bien)
     */
    private function autoSendEventEmail(?string $uuid, Branch $branch): void
    {
        if (empty($uuid) || empty($branch->electronic_invoicing_token)) {
            return;
        }

        try {
            $companyEmail = $branch->ei_email ?? auth()->user()?->email;
            if (empty($companyEmail)) {
                return;
            }

            $result = $this->service->sendEmail($uuid, $branch->electronic_invoicing_token, [$companyEmail]);

            Log::info('Auto-email evento DIAN: ' . ($result['success'] ? 'enviado' : 'falló'), [
                'uuid' => $uuid,
                'to' => [$companyEmail],
            ]);
        } catch (\Exception $e) {
            Log::warning('Error al auto-enviar email de evento DIAN', [
                'uuid' => $uuid,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Download the PDF of a receipt acknowledgment
     */
    public function downloadReceiptAcknowledgmentPdf(ReceiptAcknowledgment $receiptAcknowledgment)
    {
        if (empty($receiptAcknowledgment->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para este acuse de recibo.',
            ], 404);
        }

        $pdfContent = base64_decode($receiptAcknowledgment->pdf_base64_bytes);
        $filename = 'AR-' . ($receiptAcknowledgment->number ?? $receiptAcknowledgment->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Send payroll (nómina electrónica) to DIAN
     */
    public function sendPayroll(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró la sede del usuario.',
            ], 422);
        }

        if (empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay token de facturación electrónica configurado.',
            ], 422);
        }

        $token = $branch->electronic_invoicing_token;

        $validated = $request->validate([
            // Environment
            'environment' => 'required|array',
            'environment.type_environment_id' => 'required|integer',
            'environment.id' => 'required|string',
            'environment.pin' => 'required|string',

            // Sequence number
            'xml_sequence_number' => 'required|array',
            'xml_sequence_number.prefix' => 'required|string',
            'xml_sequence_number.number' => 'required|integer',

            // General information
            'general_information' => 'required|array',
            'general_information.payroll_period_id' => 'required|integer',

            // Employer
            'employer' => 'required|array',
            'employer.identification_number' => 'required|string',
            'employer.name' => 'required|string',
            'employer.municipality_id' => 'required|integer',
            'employer.address' => 'required|string',

            // Employee
            'employee' => 'required|array',
            'employee.type_worker_id' => 'required|integer',
            'employee.subtype_worker_id' => 'required|integer',
            'employee.high_risk_pension' => 'required|boolean',
            'employee.type_document_identification_id' => 'required|integer',
            'employee.identification_number' => 'required|string',
            'employee.surname' => 'required|string',
            'employee.second_surname' => 'nullable|string',
            'employee.first_name' => 'required|string',
            'employee.other_names' => 'nullable|string',
            'employee.municipality_id' => 'required|integer',
            'employee.address' => 'required|string',
            'employee.integral_salary' => 'required|boolean',
            'employee.type_contract_id' => 'required|integer',
            'employee.salary' => 'required|numeric',

            // Period
            'period' => 'required|array',
            'period.admission_date' => 'required|date',
            'period.settlement_start_date' => 'required|date',
            'period.settlement_end_date' => 'required|date',
            'period.amount_time' => 'required|integer',
            'period.date_issue' => 'required|date',

            // Payment
            'payment' => 'required|array',
            'payment.payment_form_id' => 'required|integer',
            'payment.payment_method_id' => 'required|integer',
            'payment.bank' => 'nullable|string',
            'payment.account_type' => 'nullable|string',
            'payment.account_number' => 'nullable|string',

            // Payment dates
            'payment_dates' => 'required|array|min:1',
            'payment_dates.*.date' => 'required|date',

            // Earn (devengados)
            'earn' => 'required|array',

            // Deduction (deducciones) - optional
            'deduction' => 'nullable|array',

            // Totals
            'accrued_total' => 'required|numeric',
            'deductions_total' => 'required|numeric',
            'total' => 'required|numeric',
        ]);

        // Build payload - add sync flag
        $payload = array_merge(['sync' => true], $validated);

        try {
            $result = $this->service->sendPayroll($payload, $token);

            if ($result['success'] && ($result['is_valid'] ?? false)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Nómina electrónica enviada exitosamente.',
                    'data' => [
                        'uuid' => $result['data']['uuid'] ?? null,
                        'issue_date' => $result['data']['issue_date'] ?? null,
                        'qr_code' => $result['data']['qr_code'] ?? null,
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar la nómina electrónica.',
                'errors_messages' => $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'data' => $result['data'] ?? null,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Exception in sendPayroll controller', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al procesar la nómina: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ==================== STATUS ENDPOINTS ====================

    /**
     * Check document status — unified endpoint for all document types
     */
    public function checkDocumentStatus(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró token de facturación electrónica.',
            ], 400);
        }

        $validated = $request->validate([
            'type' => 'required|in:invoice,credit_note,debit_note,payroll',
            'id' => 'required|integer',
        ]);

        $model = match ($validated['type']) {
            'invoice' => ElectronicInvoice::find($validated['id']),
            'credit_note' => ElectronicCreditNote::find($validated['id']),
            'debit_note' => ElectronicDebitNote::find($validated['id']),
            'payroll' => PayrollEmployee::find($validated['id']),
        };

        if (!$model || !$model->uuid) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado o sin UUID.',
            ], 404);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        $result = $this->service->getDocumentStatus($model->uuid, $branch->electronic_invoicing_token, $environment);

        if ($result['success']) {
            $data = $result['data'] ?? [];
            $model->update([
                'status_description' => $data['status_description'] ?? $model->status_description,
                'status_message' => $data['status_message'] ?? $model->status_message,
            ]);
            $result['data']['local_updated'] = true;
        }

        return response()->json($result);
    }

    /**
     * Check ZIP processing status
     */
    public function checkZipStatus(Request $request, string $zipKey): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getZipStatus($zipKey, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Get full document information by UUID
     */
    public function getDocumentInformation(Request $request, string $uuid): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getDocumentInformation($uuid, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Check numbering ranges by UUID
     */
    public function getNumberRangeStatus(Request $request, string $uuid): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getNumberRangeStatus($uuid, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Get XML of a document by UUID
     */
    public function getDocumentXml(Request $request, string $uuid): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getDocumentXml($uuid, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Get credit notes linked to an invoice by UUID
     */
    public function getDocumentNotes(Request $request, string $uuid): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getDocumentNotes($uuid, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Get events linked to an invoice by UUID
     */
    public function getDocumentEvents(Request $request, string $uuid): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getDocumentEvents($uuid, $branch->electronic_invoicing_token, $environment)
        );
    }

    /**
     * Get acquirer data
     */
    public function getAcquirerData(Request $request): JsonResponse
    {
        $branch = $this->resolveBranch($request);
        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json(['success' => false, 'message' => 'Token no encontrado.'], 400);
        }

        $environment = (int) ($branch->ei_environment ?? 2);
        return response()->json(
            $this->service->getAcquirerData($branch->electronic_invoicing_token, $environment)
        );
    }
}
