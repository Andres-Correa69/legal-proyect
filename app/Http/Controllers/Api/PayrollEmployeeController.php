<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\PayrollEmployee;
use App\Models\PayrollEmployeeDeduction;
use App\Models\PayrollEmployeeEarning;
use App\Models\PayrollEmission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollEmployeeController extends Controller
{
    /**
     * Get or create a payroll employee record, return with earnings + deductions
     */
    public function show(Request $request, Payroll $payroll, User $user): JsonResponse
    {
        // Try to copy labor data from the most recent payroll record for this employee
        $latestPe = PayrollEmployee::where('employee_id', $user->id)
            ->where('company_id', $payroll->company_id)
            ->where('payroll_id', '!=', $payroll->id)
            ->orderByDesc('created_at')
            ->first();

        $defaults = [
            'company_id' => $payroll->company_id,
            'employee_name' => $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
            'salary' => 0,
            'accrued_total' => 0,
            'deductions_total' => 0,
            'total' => 0,
        ];

        // Auto-fill labor/payment data from previous record (overrides user defaults)
        if ($latestPe) {
            $laborFields = [
                'type_worker_id', 'subtype_worker_id', 'type_contract_id',
                'integral_salary', 'high_risk_pension', 'type_document_identification_id',
                'identification_number', 'surname', 'second_surname', 'first_name', 'other_names',
                'municipality_id', 'address', 'admission_date', 'salary',
                'payment_form_id', 'payment_method_id', 'bank', 'account_type', 'account_number',
            ];
            foreach ($laborFields as $field) {
                if ($latestPe->{$field} !== null) {
                    $defaults[$field] = $latestPe->{$field};
                }
            }
        }

        $pe = PayrollEmployee::firstOrCreate(
            [
                'payroll_id' => $payroll->id,
                'employee_id' => $user->id,
            ],
            $defaults
        );

        // Fill employee_name from user profile if empty
        if (!$pe->wasRecentlyCreated && empty($pe->employee_name)) {
            $pe->employee_name = $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
            $pe->save();
        }

        // Auto-create basic earning if new and has no earnings
        if ($pe->wasRecentlyCreated && $pe->earnings()->count() === 0) {
            $salary = (float) $pe->salary;
            $pe->earnings()->create([
                'concept' => 'basic',
                'data' => ['worked_days' => 30, 'worker_salary' => $salary],
                'payment' => $salary,
                'is_active' => true,
            ]);
            // Update totals
            $pe->update([
                'accrued_total' => $salary,
                'total' => $salary - (float) $pe->deductions_total,
            ]);
        }

        $pe->load(['earnings', 'deductions']);
        $pe->has_pdf = !empty($pe->pdf_base64_bytes);
        $pe->has_annulment_pdf = !empty($pe->annulment_pdf_base64_bytes);

        // Get emission history from payroll_emissions table
        $employeeIds = PayrollEmployee::where('employee_id', $user->id)
            ->where('company_id', $payroll->company_id)
            ->pluck('id');

        $emissionHistory = \App\Models\PayrollEmission::whereIn('payroll_employee_id', $employeeIds)
            ->select(['id', 'payroll_employee_id', 'type', 'uuid', 'number', 'qr_link', 'is_valid', 'status_message', 'sent_at'])
            ->selectRaw("(pdf_base64_bytes IS NOT NULL AND pdf_base64_bytes != '') as has_pdf")
            ->with(['payrollEmployee:id,payroll_id,accrued_total,deductions_total,total', 'payrollEmployee.payroll:id,prefix,number,settlement_start_date,settlement_end_date,issue_date'])
            ->orderBy('sent_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'payroll_employee' => $pe,
                'payroll' => $payroll->load(['createdBy:id,name', 'branch:id,name']),
                'employee' => $user->only([
                    'id', 'name', 'first_name', 'last_name', 'document_id', 'document_type',
                    'email', 'phone', 'address', 'city_name', 'state_name', 'country_name',
                    'occupation', 'gender',
                ]),
                'emission_history' => $emissionHistory,
            ],
        ]);
    }

    /**
     * Create a new earning for a payroll employee
     */
    public function storeEarning(Request $request, PayrollEmployee $payrollEmployee): JsonResponse
    {
        $validated = $request->validate([
            'concept' => 'required|string|max:50',
            'data' => 'required|array',
            'data.*' => 'required',
            'payment' => 'required|numeric|min:0',
        ]);

        $earning = $payrollEmployee->earnings()->create([
            'concept' => $validated['concept'],
            'data' => $validated['data'] ?? null,
            'payment' => $validated['payment'],
            'is_active' => true,
        ]);

        $this->recalculateTotals($payrollEmployee);

        return response()->json([
            'success' => true,
            'data' => $earning,
            'message' => 'Devengado creado exitosamente.',
        ], 201);
    }

    /**
     * Update an existing earning
     */
    public function updateEarning(Request $request, PayrollEmployeeEarning $earning): JsonResponse
    {
        $validated = $request->validate([
            'concept' => 'sometimes|string|max:50',
            'data' => 'nullable|array',
            'payment' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $earning->update($validated);
        $this->recalculateTotals($earning->payrollEmployee);

        return response()->json([
            'success' => true,
            'data' => $earning->fresh(),
            'message' => 'Devengado actualizado exitosamente.',
        ]);
    }

    /**
     * Delete an earning
     */
    public function destroyEarning(PayrollEmployeeEarning $earning): JsonResponse
    {
        $pe = $earning->payrollEmployee;
        $earning->delete();
        $this->recalculateTotals($pe);

        return response()->json([
            'success' => true,
            'message' => 'Devengado eliminado exitosamente.',
        ]);
    }

    /**
     * Create a new deduction for a payroll employee
     */
    public function storeDeduction(Request $request, PayrollEmployee $payrollEmployee): JsonResponse
    {
        $validated = $request->validate([
            'concept' => 'required|string|max:50',
            'data' => 'required|array',
            'data.*' => 'required',
            'payment' => 'required|numeric|min:0',
        ]);

        $deduction = $payrollEmployee->deductions()->create([
            'concept' => $validated['concept'],
            'data' => $validated['data'] ?? null,
            'payment' => $validated['payment'],
            'is_active' => true,
        ]);

        $this->recalculateTotals($payrollEmployee);

        return response()->json([
            'success' => true,
            'data' => $deduction,
            'message' => 'Deducción creada exitosamente.',
        ], 201);
    }

    /**
     * Update an existing deduction
     */
    public function updateDeduction(Request $request, PayrollEmployeeDeduction $deduction): JsonResponse
    {
        $validated = $request->validate([
            'concept' => 'sometimes|string|max:50',
            'data' => 'nullable|array',
            'payment' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $deduction->update($validated);
        $this->recalculateTotals($deduction->payrollEmployee);

        return response()->json([
            'success' => true,
            'data' => $deduction->fresh(),
            'message' => 'Deducción actualizada exitosamente.',
        ]);
    }

    /**
     * Delete a deduction
     */
    public function destroyDeduction(PayrollEmployeeDeduction $deduction): JsonResponse
    {
        $pe = $deduction->payrollEmployee;
        $deduction->delete();
        $this->recalculateTotals($pe);

        return response()->json([
            'success' => true,
            'message' => 'Deducción eliminada exitosamente.',
        ]);
    }

    /**
     * Update labor and payment data for a payroll employee
     */
    public function updateLaborData(Request $request, PayrollEmployee $payrollEmployee): JsonResponse
    {
        $validated = $request->validate([
            'type_worker_id' => 'sometimes|integer',
            'subtype_worker_id' => 'sometimes|integer',
            'type_contract_id' => 'sometimes|integer',
            'integral_salary' => 'sometimes|boolean',
            'high_risk_pension' => 'sometimes|boolean',
            'type_document_identification_id' => 'sometimes|integer',
            'identification_number' => 'sometimes|string|max:50',
            'surname' => 'sometimes|string|max:100',
            'second_surname' => 'nullable|string|max:100',
            'first_name' => 'sometimes|string|max:100',
            'other_names' => 'nullable|string|max:100',
            'municipality_id' => 'sometimes|integer',
            'address' => 'sometimes|string|max:255',
            'admission_date' => 'sometimes|date',
            'salary' => 'sometimes|numeric|min:0',
            'payment_form_id' => 'sometimes|integer',
            'payment_method_id' => 'sometimes|integer',
            'bank' => 'nullable|string|max:100',
            'account_type' => 'nullable|string|max:20',
            'account_number' => 'nullable|string|max:50',
        ]);

        // Validate unique identification_number within the same payroll
        if (isset($validated['identification_number']) && !empty($validated['identification_number'])) {
            $duplicate = PayrollEmployee::where('payroll_id', $payrollEmployee->payroll_id)
                ->where('id', '!=', $payrollEmployee->id)
                ->where('identification_number', $validated['identification_number'])
                ->first();

            if ($duplicate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya existe otro empleado con el número de identificación "' . $validated['identification_number'] . '" en esta nómina.',
                ], 422);
            }
        }

        $payrollEmployee->update($validated);

        // Sync basic earning with salary when salary changes
        if (isset($validated['salary'])) {
            $salary = (float) $validated['salary'];
            $basicEarning = $payrollEmployee->earnings()->where('concept', 'basic')->first();
            if ($basicEarning) {
                $data = $basicEarning->data ?? [];
                $data['worker_salary'] = $salary;
                $basicEarning->update([
                    'data' => $data,
                    'payment' => $salary,
                ]);
                // Recalculate totals
                $accrued = $payrollEmployee->earnings()->where('is_active', true)->sum('payment');
                $deductions = $payrollEmployee->deductions()->where('is_active', true)->sum('payment');
                $payrollEmployee->update([
                    'accrued_total' => $accrued,
                    'deductions_total' => $deductions,
                    'total' => $accrued - $deductions,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $payrollEmployee->fresh(['earnings', 'deductions']),
            'message' => 'Datos del empleado actualizados exitosamente.',
        ]);
    }

    /**
     * Get previous payroll records for an employee (for "copy from" feature)
     */
    public function previousRecords(Request $request, int $employeeId): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $records = PayrollEmployee::where('employee_id', $employeeId)
            ->where('company_id', $companyId)
            ->whereNotNull('identification_number')
            ->with([
                'payroll:id,prefix,number,settlement_start_date,settlement_end_date',
                'earnings',
                'deductions',
            ])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    /**
     * Download PDF of a payroll employee's DIAN document
     */
    public function downloadPdf(PayrollEmployee $payrollEmployee)
    {
        if (empty($payrollEmployee->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta nómina.',
            ], 404);
        }

        $pdfContent = base64_decode($payrollEmployee->pdf_base64_bytes);
        $filename = 'NE-' . ($payrollEmployee->number ?? $payrollEmployee->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Download PDF of a payroll employee's annulment document
     */
    public function downloadAnnulmentPdf(PayrollEmployee $payrollEmployee)
    {
        if (empty($payrollEmployee->annulment_pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF de anulación disponible para esta nómina.',
            ], 404);
        }

        $pdfContent = base64_decode($payrollEmployee->annulment_pdf_base64_bytes);
        $filename = 'NA-' . ($payrollEmployee->annulment_number ?? $payrollEmployee->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    /**
     * Download PDF from a payroll emission record
     */
    public function downloadEmissionPdf(PayrollEmission $payrollEmission)
    {
        if (empty($payrollEmission->pdf_base64_bytes)) {
            return response()->json([
                'success' => false,
                'message' => 'No hay PDF disponible para esta emisión.',
            ], 404);
        }

        $pdfContent = base64_decode($payrollEmission->pdf_base64_bytes);
        $prefix = $payrollEmission->type === 'annulment' ? 'NA' : 'NE';
        $filename = $prefix . '-' . ($payrollEmission->number ?? $payrollEmission->id) . '.pdf';

        return response($pdfContent, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    private function recalculateTotals(PayrollEmployee $pe): void
    {
        $accrued = $pe->earnings()->where('is_active', true)->sum('payment');
        $deductions = $pe->deductions()->where('is_active', true)->sum('payment');

        $pe->update([
            'accrued_total' => $accrued,
            'deductions_total' => $deductions,
            'total' => $accrued - $deductions,
        ]);
    }
}
