<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Payroll;
use App\Models\PayrollEmission;
use App\Models\PayrollEmployee;
use App\Models\PayrollNumberingRange;
use App\Models\User;
use App\Services\ElectronicInvoicingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PayrollController extends Controller
{
    public function __construct(private ElectronicInvoicingService $service) {}

    /**
     * Get payroll-specific DIAN catalogs
     */
    public function getCatalogs(): JsonResponse
    {
        $catalogs = $this->service->getPayrollCatalogs();

        return response()->json([
            'success' => true,
            'data' => $catalogs,
        ]);
    }

    /**
     * Send a single employee's payroll to DIAN
     */
    public function sendEmployee(Request $request, Payroll $payroll, PayrollEmployee $payrollEmployee): JsonResponse
    {
        if ($payrollEmployee->accepted && !$payrollEmployee->annulled) {
            return response()->json([
                'success' => false,
                'message' => 'Esta nómina ya fue emitida y aceptada por la DIAN.',
            ], 422);
        }

        $branch = Branch::find($payroll->branch_id);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay token de facturación electrónica configurado para esta sede.',
            ], 422);
        }

        // Validate branch employer data (must be configured in sede)
        $missingBranch = [];
        if (!$branch->ei_tax_id) $missingBranch[] = 'NIT de la sede (ei_tax_id)';
        if (!$branch->ei_business_name) $missingBranch[] = 'Razón social de la sede (ei_business_name)';
        if (!$branch->ei_municipality_id) $missingBranch[] = 'Municipio de la sede (ei_municipality_id)';
        if (!$branch->ei_address) $missingBranch[] = 'Dirección de la sede (ei_address)';
        if (!$branch->ei_payroll_software_id) $missingBranch[] = 'Software ID de nómina (ei_payroll_software_id)';
        if (!$branch->ei_payroll_pin) $missingBranch[] = 'PIN de nómina (ei_payroll_pin)';

        if (count($missingBranch) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'La sede no tiene configurados los datos del empleador para nómina electrónica: ' . implode(', ', $missingBranch),
                'missing_fields' => $missingBranch,
            ], 422);
        }

        // Validate required employee fields
        $missing = [];
        if (!$payrollEmployee->type_document_identification_id) $missing[] = 'Tipo de documento';
        if (!$payrollEmployee->identification_number) $missing[] = 'Número de identificación';
        if (!$payrollEmployee->surname) $missing[] = 'Primer apellido';
        if (!$payrollEmployee->first_name) $missing[] = 'Primer nombre';
        if (!$payrollEmployee->municipality_id) $missing[] = 'Municipio';
        if (!$payrollEmployee->address) $missing[] = 'Dirección';
        if (!$payrollEmployee->admission_date) $missing[] = 'Fecha de ingreso';
        if (!$payrollEmployee->salary || $payrollEmployee->salary <= 0) $missing[] = 'Salario';

        if (count($missing) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Faltan datos obligatorios del empleado: ' . implode(', ', $missing),
                'missing_fields' => $missing,
            ], 422);
        }

        // Check earnings exist
        $earnings = $payrollEmployee->earnings()->where('is_active', true)->get();
        if ($earnings->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'El empleado debe tener al menos un devengado.',
            ], 422);
        }

        $token = $branch->electronic_invoicing_token;

        // Get active payroll numbering range and increment consecutive
        $range = PayrollNumberingRange::where('branch_id', $branch->id)
            ->where('type', 'payroll')
            ->where('is_active', true)
            ->first();

        if (!$range) {
            return response()->json([
                'success' => false,
                'message' => 'No hay un rango de numeración de nómina activo para esta sede.',
            ], 422);
        }

        $range->increment('current_consecutive');
        $range->refresh();
        $consecutive = $range->current_consecutive;

        if ($range->consecutive_end && $consecutive > $range->consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha superado el rango de consecutivos de nómina electrónica.',
            ], 422);
        }

        // Build DIAN payload
        $payload = [
            'sync' => true,
            'environment' => [
                'type_environment_id' => (int) ($branch->ei_environment ?? 2),
                'id' => $branch->ei_payroll_software_id ?? '',
                'pin' => $branch->ei_payroll_pin ?? '',
            ],
            'xml_sequence_number' => [
                'prefix' => $range->prefix,
                'number' => $consecutive,
            ],
            'general_information' => [
                'payroll_period_id' => $payroll->payroll_period_id ?? 1,
            ],
            'employer' => [
                'identification_number' => $branch->ei_tax_id,
                'name' => $branch->ei_business_name,
                'municipality_id' => (int) $branch->ei_municipality_id,
                'address' => $branch->ei_address,
            ],
            'employee' => [
                'type_worker_id' => $payrollEmployee->type_worker_id,
                'subtype_worker_id' => $payrollEmployee->subtype_worker_id,
                'high_risk_pension' => $payrollEmployee->high_risk_pension,
                'type_document_identification_id' => $payrollEmployee->type_document_identification_id,
                'identification_number' => $payrollEmployee->identification_number,
                'surname' => $payrollEmployee->surname,
                'second_surname' => $payrollEmployee->second_surname ?? '',
                'first_name' => $payrollEmployee->first_name,
                'other_names' => $payrollEmployee->other_names ?? '',
                'municipality_id' => $payrollEmployee->municipality_id,
                'address' => $payrollEmployee->address,
                'integral_salary' => $payrollEmployee->integral_salary,
                'type_contract_id' => $payrollEmployee->type_contract_id,
                'salary' => (float) $payrollEmployee->salary,
            ],
            'period' => [
                'admission_date' => $payrollEmployee->admission_date?->format('Y-m-d'),
                'settlement_start_date' => $payroll->settlement_start_date->format('Y-m-d'),
                'settlement_end_date' => $payroll->settlement_end_date->format('Y-m-d'),
                'amount_time' => $payrollEmployee->admission_date
                    ? (int) $payrollEmployee->admission_date->diffInDays(now())
                    : 30,
                'date_issue' => $payroll->issue_date->format('Y-m-d'),
            ],
            'payment' => [
                'payment_form_id' => $payrollEmployee->payment_form_id,
                'payment_method_id' => $payrollEmployee->payment_method_id,
                'bank' => $payrollEmployee->bank ?? '',
                'account_type' => $payrollEmployee->account_type ?? '',
                'account_number' => $payrollEmployee->account_number ?? '',
            ],
            'payment_dates' => [
                ['date' => $payroll->issue_date->format('Y-m-d')],
            ],
            'earn' => $this->buildEarnPayload($earnings),
            'deduction' => $this->buildDeductionPayload($payrollEmployee),
            'accrued_total' => (float) $payrollEmployee->accrued_total,
            'deductions_total' => (float) $payrollEmployee->deductions_total,
            'total' => (float) $payrollEmployee->total,
        ];

        try {
            $result = $this->service->sendPayroll($payload, $token);
            $dianData = $result['data'] ?? [];
            $isMock = $result['is_mock'] ?? false;

            $isValid = $result['success'] && ($result['is_valid'] ?? false);

            // Save emission record (history)
            $emission = PayrollEmission::create([
                'payroll_employee_id' => $payrollEmployee->id,
                'type' => 'emission',
                'uuid' => $dianData['uuid'] ?? null,
                'number' => $dianData['number'] ?? null,
                'issue_date_dian' => $dianData['issue_date'] ?? null,
                'expedition_date' => $dianData['expedition_date'] ?? null,
                'status_code' => $dianData['status_code'] ?? null,
                'status_description' => $dianData['status_description'] ?? null,
                'status_message' => $isValid
                    ? ($isMock ? '[MOCK] Nómina aceptada por la DIAN' : 'Nómina aceptada por la DIAN')
                    : ($result['message'] ?? 'Error al enviar la nómina'),
                'errors_messages' => $dianData['errors_messages'] ?? null,
                'xml_name' => $dianData['xml_name'] ?? null,
                'zip_name' => $dianData['zip_name'] ?? null,
                'qr_link' => $dianData['qr_link'] ?? null,
                'xml_base64_bytes' => $dianData['xml_base64_bytes'] ?? null,
                'pdf_base64_bytes' => $dianData['pdf_base64_bytes'] ?? null,
                'request_payload' => $payload,
                'response_payload' => $dianData,
                'is_valid' => $isValid,
                'sent_at' => now(),
            ]);

            // Also update payroll_employee with latest state (for quick access)
            $payrollEmployee->update([
                'request_payload' => $payload,
                'response_payload' => $dianData,
                'sent_at' => now(),
                'uuid' => $dianData['uuid'] ?? null,
                'number' => $dianData['number'] ?? null,
                'issue_date_dian' => $dianData['issue_date'] ?? null,
                'expedition_date' => $dianData['expedition_date'] ?? null,
                'status_code' => $dianData['status_code'] ?? null,
                'status_description' => $dianData['status_description'] ?? null,
                'errors_messages' => $dianData['errors_messages'] ?? null,
                'xml_name' => $dianData['xml_name'] ?? null,
                'zip_name' => $dianData['zip_name'] ?? null,
                'qr_link' => $dianData['qr_link'] ?? null,
                'xml_base64_bytes' => $dianData['xml_base64_bytes'] ?? null,
                'pdf_base64_bytes' => $dianData['pdf_base64_bytes'] ?? null,
            ]);

            if ($isValid) {
                $payrollEmployee->update([
                    'accepted' => true,
                    'rejected' => false,
                    'annulled' => false,
                    'status_message' => $isMock ? '[MOCK] Nómina aceptada por la DIAN' : 'Nómina aceptada por la DIAN',
                ]);

                $responseData = [
                    'payroll_employee_id' => $payrollEmployee->id,
                    'emission_id' => $emission->id,
                    'uuid' => $dianData['uuid'] ?? null,
                    'issue_date' => $dianData['issue_date'] ?? null,
                    'qr_link' => $dianData['qr_link'] ?? null,
                    'has_pdf' => !empty($dianData['pdf_base64_bytes']),
                    'status_description' => $dianData['status_description'] ?? null,
                    'errors_messages' => $dianData['errors_messages'] ?? [],
                ];

                if ($isMock) {
                    $responseData['is_mock'] = true;
                    $responseData['request_payload'] = $result['request_payload'] ?? $payload;
                }

                return response()->json([
                    'success' => true,
                    'message' => $isMock
                        ? '[MOCK] Nómina electrónica validada correctamente.'
                        : 'Nómina electrónica enviada y aceptada por la DIAN.',
                    'data' => $responseData,
                ]);
            }

            $payrollEmployee->update([
                'accepted' => false,
                'rejected' => true,
                'status_message' => $result['message'] ?? 'Error al enviar la nómina',
            ]);

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al enviar la nómina electrónica.',
                'errors_messages' => $dianData['errors_messages'] ?? $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'request_payload' => $payload,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Exception sending payroll for employee', [
                'payroll_id' => $payroll->id,
                'employee_id' => $payrollEmployee->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al enviar la nómina: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build earn payload from employee earnings
     */
    private function buildEarnPayload($earnings): array
    {
        $earn = [];
        foreach ($earnings as $earning) {
            $concept = $earning->concept;
            $data = $earning->data ?? [];
            $payment = (float) $earning->payment;

            if ($concept === 'basic') {
                $earn['basic'] = [
                    'worked_days' => (int) ($data['worked_days'] ?? 30),
                    'worker_salary' => (float) ($data['worker_salary'] ?? $payment),
                ];
            } elseif ($concept === 'transportation_assistance') {
                // API expects: transports: [{ transportation_assistance: number }]
                $earn['transports'][] = [
                    'transportation_assistance' => $payment,
                ];
            } elseif ($concept === 'vacation_common') {
                // API expects: vacation: { common: [...] }
                $entry = array_merge($data, ['payment' => $payment]);
                $earn['vacation']['common'][] = $entry;
            } elseif ($concept === 'vacation_compensated') {
                // API expects: vacation: { compensated: [...] }
                $entry = array_merge($data, ['payment' => $payment]);
                $earn['vacation']['compensated'][] = $entry;
            } elseif ($concept === 'licensings_maternity') {
                // API expects: licensings: { maternity_or_paternity_leaves: [...] }
                $entry = array_merge($data, ['payment' => $payment]);
                $earn['licensings']['maternity_or_paternity_leaves'][] = $entry;
            } elseif ($concept === 'licensings_paid') {
                // API expects: licensings: { permit_or_paid_licenses: [...] }
                $entry = array_merge($data, ['payment' => $payment]);
                $earn['licensings']['permit_or_paid_licenses'][] = $entry;
            } elseif ($concept === 'licensings_unpaid') {
                // API expects: licensings: { suspension_or_unpaid_leaves: [...] }
                $entry = $data; // unpaid leaves don't have payment
                $earn['licensings']['suspension_or_unpaid_leaves'][] = $entry;
            } elseif ($concept === 'compensation_indemnity') {
                // API expects: compensation: number
                $earn['compensation'] = $payment;
            } elseif (in_array($concept, ['sustainment_support', 'telecommuting', 'company_withdrawal_bonus', 'refund'])) {
                // API expects these as direct numbers at earn root
                $earn[$concept] = $payment;
            } elseif (in_array($concept, ['primas', 'layoffs'])) {
                // Single object concepts
                $entry = array_merge($data, ['payment' => $payment]);
                $earn[$concept] = $entry;
            } else {
                // Array-type concepts (overtime, incapacities, bonuses, compensations, etc.)
                $entry = array_merge($data, ['payment' => $payment]);
                $earn[$concept][] = $entry;
            }
        }
        return $earn;
    }

    /**
     * Build deduction payload from employee deductions
     */
    private function buildDeductionPayload(PayrollEmployee $pe): array
    {
        $deductions = $pe->deductions()->where('is_active', true)->get();
        $deduction = [];

        // Concepts that are direct numbers (not objects)
        $scalarConcepts = ['voluntary_pension', 'withholding_source', 'afc', 'cooperative', 'tax_lien', 'complementary_plans', 'education', 'refund', 'debt'];
        // Concepts that are single objects with multiple fields
        $objectConcepts = ['health', 'pension_fund', 'pension_security_fund'];

        foreach ($deductions as $ded) {
            $concept = $ded->concept;
            $data = $ded->data ?? [];
            $payment = (float) $ded->payment;

            if (in_array($concept, $scalarConcepts)) {
                // API expects these as direct numbers
                $deduction[$concept] = $payment;
            } elseif (in_array($concept, $objectConcepts)) {
                // API expects these as single objects with fields
                $deduction[$concept] = array_merge($data, ['payment' => $payment]);
            } else {
                // Array-type concepts (trade_unions, sanctions, libranzas, etc.)
                $entry = array_merge($data, ['payment' => $payment]);
                $deduction[$concept][] = $entry;
            }
        }

        return $deduction;
    }

    /**
     * List all payrolls with aggregated stats
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payroll::with(['createdBy:id,name', 'branch:id,name'])
            ->withCount([
                'employees as employees_count',
                'employees as issued_count' => function ($q) {
                    $q->where('accepted', true);
                },
                'employees as rejected_count' => function ($q) {
                    $q->where('rejected', true);
                },
            ]);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $payrolls = $query
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payrolls,
            'message' => 'Nóminas obtenidas exitosamente.',
        ]);
    }

    /**
     * Store a new payroll batch
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settlement_start_date' => 'required|date',
            'settlement_end_date' => 'required|date|after_or_equal:settlement_start_date',
            'issue_date' => 'required|date',
            'numbering_range_id' => 'required|integer|exists:payroll_numbering_ranges,id',
            'payroll_period_id' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $branch = $user->branch;

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no tiene una sucursal asignada.',
            ], 422);
        }

        $range = PayrollNumberingRange::where('id', $validated['numbering_range_id'])
            ->where('branch_id', $branch->id)
            ->where('is_active', true)
            ->first();

        if (!$range) {
            return response()->json([
                'success' => false,
                'message' => 'El rango de numeración seleccionado no es válido o no está activo.',
            ], 422);
        }

        // Increment consecutive
        $range->increment('current_consecutive');
        $consecutive = $range->current_consecutive;

        // Validate consecutive is within range
        if ($range->consecutive_end && $consecutive > $range->consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha superado el rango de consecutivos de nómina electrónica.',
            ], 422);
        }

        $payroll = Payroll::create([
            'company_id' => $user->company_id,
            'branch_id' => $branch->id,
            'prefix' => $range->prefix,
            'number' => $consecutive,
            'settlement_start_date' => $validated['settlement_start_date'],
            'settlement_end_date' => $validated['settlement_end_date'],
            'issue_date' => $validated['issue_date'],
            'payroll_period_id' => $validated['payroll_period_id'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'created_by_user_id' => $user->id,
            'status' => 'draft',
        ]);

        return response()->json([
            'success' => true,
            'data' => $payroll->load(['createdBy:id,name', 'branch:id,name']),
            'message' => 'Nómina creada exitosamente.',
        ], 201);
    }

    /**
     * Show a single payroll with employees and branch users
     */
    public function show(Request $request, Payroll $payroll): JsonResponse
    {
        $payroll->loadCount([
            'employees as employees_count',
            'employees as issued_count' => fn($q) => $q->where('accepted', true),
            'employees as rejected_count' => fn($q) => $q->where('rejected', true),
        ]);

        $payroll->load(['createdBy:id,name', 'branch:id,name']);

        // Get payroll employees (don't load heavy base64 blobs)
        $payrollEmployees = $payroll->employees()
            ->select([
                'id',
                'payroll_id',
                'employee_id',
                'identification_number',
                'employee_name',
                'salary',
                'accrued_total',
                'deductions_total',
                'total',
                'accepted',
                'rejected',
                'uuid',
                'number',
                'status_code',
                'status_description',
                'status_message',
                'errors_messages',
                'qr_link',
                'sent_at',
                'annulled',
                'annulment_uuid',
                'annulment_number',
                'annulment_qr_link',
                'annulled_at',
            ])
            ->selectRaw("(pdf_base64_bytes IS NOT NULL AND pdf_base64_bytes != '') as has_pdf")
            ->selectRaw("(annulment_pdf_base64_bytes IS NOT NULL AND annulment_pdf_base64_bytes != '') as has_annulment_pdf")
            ->get();

        // Get branch users (potential employees)
        $branchUsers = User::where('branch_id', $payroll->branch_id)
            ->where('is_active', true)
            ->select(['id', 'name', 'first_name', 'last_name', 'document_id', 'document_type', 'email'])
            ->orderBy('name')
            ->get();

        // Get active numbering ranges for this branch
        $numberingRanges = PayrollNumberingRange::where('branch_id', $payroll->branch_id)
            ->where('is_active', true)
            ->select(['id', 'name', 'type', 'prefix', 'consecutive_start', 'consecutive_end', 'current_consecutive'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'payroll' => $payroll,
                'payroll_employees' => $payrollEmployees,
                'branch_users' => $branchUsers,
                'numbering_ranges' => $numberingRanges,
            ],
        ]);
    }

    /**
     * Annul (nota de ajuste) a single employee's payroll at DIAN
     */
    public function annulEmployee(Request $request, Payroll $payroll, PayrollEmployee $payrollEmployee): JsonResponse
    {
        if (!$payrollEmployee->accepted || !$payrollEmployee->uuid) {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden anular nóminas que fueron aceptadas por la DIAN.',
            ], 422);
        }

        if ($payrollEmployee->annulled) {
            return response()->json([
                'success' => false,
                'message' => 'Esta nómina ya fue anulada.',
            ], 422);
        }

        $branch = Branch::find($payroll->branch_id);

        if (!$branch || empty($branch->electronic_invoicing_token)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay token de facturación electrónica configurado para esta sede.',
            ], 422);
        }

        // Validate branch employer data
        $missingBranch = [];
        if (!$branch->ei_tax_id) $missingBranch[] = 'NIT de la sede';
        if (!$branch->ei_municipality_id) $missingBranch[] = 'Municipio de la sede';
        if (!$branch->ei_address) $missingBranch[] = 'Dirección de la sede';
        if (!$branch->ei_payroll_software_id) $missingBranch[] = 'Software ID de nómina';
        if (!$branch->ei_payroll_pin) $missingBranch[] = 'PIN de nómina';

        if (count($missingBranch) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Faltan datos de la sede: ' . implode(', ', $missingBranch),
            ], 422);
        }

        // Find payroll_note numbering range for this branch
        $noteRangeId = $request->input('numbering_range_id');
        if ($noteRangeId) {
            $noteRange = PayrollNumberingRange::where('id', $noteRangeId)
                ->where('branch_id', $branch->id)
                ->where('type', 'payroll_note')
                ->first();
        } else {
            $noteRange = PayrollNumberingRange::where('branch_id', $branch->id)
                ->where('type', 'payroll_note')
                ->where('is_active', true)
                ->first();
        }

        if (!$noteRange) {
            return response()->json([
                'success' => false,
                'message' => 'No hay un rango de numeración de tipo "Nota de ajuste" activo para esta sede. Créelo en la configuración de nómina.',
            ], 422);
        }

        // Increment consecutive
        $noteRange->increment('current_consecutive');
        $consecutive = $noteRange->current_consecutive;

        if ($noteRange->consecutive_end && $consecutive > $noteRange->consecutive_end) {
            return response()->json([
                'success' => false,
                'message' => 'Se ha superado el rango de consecutivos para notas de ajuste de nómina.',
            ], 422);
        }

        $token = $branch->electronic_invoicing_token;

        $payload = [
            'sync' => true,
            'environment' => [
                'type_environment_id' => 1,
                'id' => $branch->ei_payroll_software_id,
                'pin' => $branch->ei_payroll_pin,
            ],
            'type_payroll_note_id' => 2,
            'payroll_reference' => [
                'number' => $payrollEmployee->number ?? '',
                'uuid' => $payrollEmployee->uuid,
                'issue_date' => $payrollEmployee->issue_date_dian ?? $payroll->issue_date->format('Y-m-d'),
            ],
            'xml_sequence_number' => [
                'prefix' => $noteRange->prefix,
                'number' => $consecutive,
            ],
            'general_information' => [
                'payroll_period_id' => $payroll->payroll_period_id ?? 5,
            ],
            'employer' => [
                'identification_number' => $branch->ei_tax_id,
                'municipality_id' => (int) $branch->ei_municipality_id,
                'address' => $branch->ei_address,
            ],
        ];

        try {
            $result = $this->service->annulPayroll($payload, $token);
            $dianData = $result['data'] ?? [];
            $isMock = $result['is_mock'] ?? false;

            $isValid = $result['success'] && ($result['is_valid'] ?? false);

            // Save annulment emission record (history)
            PayrollEmission::create([
                'payroll_employee_id' => $payrollEmployee->id,
                'type' => 'annulment',
                'uuid' => $dianData['uuid'] ?? null,
                'number' => $dianData['number'] ?? null,
                'issue_date_dian' => $dianData['issue_date'] ?? null,
                'status_code' => $dianData['status_code'] ?? null,
                'status_description' => $dianData['status_description'] ?? null,
                'status_message' => $isValid
                    ? ($isMock ? '[MOCK] Nómina anulada' : 'Nómina anulada ante la DIAN')
                    : ($result['message'] ?? 'Error al anular la nómina'),
                'errors_messages' => $dianData['errors_messages'] ?? null,
                'qr_link' => $dianData['qr_link'] ?? null,
                'pdf_base64_bytes' => $dianData['pdf_base64_bytes'] ?? null,
                'request_payload' => $payload,
                'response_payload' => $dianData,
                'is_valid' => $isValid,
                'sent_at' => now(),
            ]);

            // Also update payroll_employee with annulment state
            $payrollEmployee->update([
                'annulment_request_payload' => $payload,
                'annulment_response_payload' => $dianData,
            ]);

            if ($isValid) {
                $payrollEmployee->update([
                    'accepted' => false,
                    'annulled' => true,
                    'rejected' => true,
                    'annulment_uuid' => $dianData['uuid'] ?? null,
                    'annulment_number' => $dianData['number'] ?? null,
                    'annulment_issue_date' => $dianData['issue_date'] ?? null,
                    'annulment_qr_link' => $dianData['qr_link'] ?? null,
                    'annulment_pdf_base64_bytes' => $dianData['pdf_base64_bytes'] ?? null,
                    'annulled_at' => now(),
                    'status_message' => $isMock ? '[MOCK] Nómina anulada' : 'Nómina anulada ante la DIAN',
                ]);

                $responseData = [
                    'annulment_uuid' => $dianData['uuid'] ?? null,
                    'annulment_number' => $dianData['number'] ?? null,
                    'annulment_qr_link' => $dianData['qr_link'] ?? null,
                    'has_annulment_pdf' => !empty($dianData['pdf_base64_bytes']),
                ];

                if ($isMock) {
                    $responseData['is_mock'] = true;
                    $responseData['request_payload'] = $payload;
                }

                return response()->json([
                    'success' => true,
                    'message' => $isMock
                        ? '[MOCK] Nómina anulada correctamente.'
                        : 'Nómina anulada exitosamente ante la DIAN.',
                    'data' => $responseData,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Error al anular la nómina electrónica.',
                'errors_messages' => $dianData['errors_messages'] ?? $result['errors_messages'] ?? [],
                'errors' => $result['errors'] ?? [],
                'request_payload' => $payload,
            ], 422);
        } catch (\Exception $e) {
            Log::error('Exception annulling payroll for employee', [
                'payroll_id' => $payroll->id,
                'employee_id' => $payrollEmployee->id,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno al anular la nómina: ' . $e->getMessage(),
            ], 500);
        }
    }
}
