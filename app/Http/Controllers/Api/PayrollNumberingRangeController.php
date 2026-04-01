<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollNumberingRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollNumberingRangeController extends Controller
{
    /**
     * List all payroll numbering ranges for the current branch
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $branch = $user->branch;

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no tiene una sucursal asignada.',
            ], 400);
        }

        $ranges = PayrollNumberingRange::where('branch_id', $branch->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $ranges,
        ]);
    }

    /**
     * Create a new payroll numbering range
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'sometimes|string|in:payroll,payroll_note',
            'prefix' => ['required', 'string', 'max:4', 'regex:/^CP/i'],
            'consecutive_start' => 'required|integer|min:1',
            'consecutive_end' => 'required|integer|min:1',
        ], [
            'prefix.regex' => 'El prefijo debe iniciar con CP (máximo 4 caracteres).',
        ]);

        $user = $request->user();
        $branch = $user->branch;

        if (!$branch) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no tiene una sucursal asignada.',
            ], 400);
        }

        // Validate unique prefix within branch
        $exists = PayrollNumberingRange::where('branch_id', $branch->id)
            ->where('prefix', $validated['prefix'])
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe un rango de numeración con el prefijo "' . $validated['prefix'] . '" en esta sucursal.',
            ], 422);
        }

        $range = PayrollNumberingRange::create([
            'company_id' => $user->company_id,
            'branch_id' => $branch->id,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'payroll',
            'prefix' => $validated['prefix'],
            'consecutive_start' => $validated['consecutive_start'],
            'consecutive_end' => $validated['consecutive_end'],
            'current_consecutive' => 0,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'data' => $range,
            'message' => 'Rango de numeración creado exitosamente.',
        ], 201);
    }

    /**
     * Update a payroll numbering range
     */
    public function update(Request $request, PayrollNumberingRange $payrollNumberingRange): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'sometimes|string|in:payroll,payroll_note',
            'prefix' => ['required', 'string', 'max:4', 'regex:/^CP/i'],
            'consecutive_start' => 'required|integer|min:1',
            'consecutive_end' => 'required|integer|min:1',
            'is_active' => 'nullable|boolean',
        ], [
            'prefix.regex' => 'El prefijo debe iniciar con CP (máximo 4 caracteres).',
        ]);

        $user = $request->user();
        $branch = $user->branch;

        if (!$branch || $payrollNumberingRange->branch_id !== $branch->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permiso para modificar este rango.',
            ], 403);
        }

        // Validate unique prefix within branch (excluding self)
        $exists = PayrollNumberingRange::where('branch_id', $branch->id)
            ->where('prefix', $validated['prefix'])
            ->where('id', '!=', $payrollNumberingRange->id)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe un rango de numeración con el prefijo "' . $validated['prefix'] . '" en esta sucursal.',
            ], 422);
        }

        $payrollNumberingRange->update([
            'name' => $validated['name'],
            'type' => $validated['type'] ?? $payrollNumberingRange->type,
            'prefix' => $validated['prefix'],
            'consecutive_start' => $validated['consecutive_start'],
            'consecutive_end' => $validated['consecutive_end'],
            'is_active' => $validated['is_active'] ?? $payrollNumberingRange->is_active,
        ]);

        return response()->json([
            'success' => true,
            'data' => $payrollNumberingRange->fresh(),
            'message' => 'Rango de numeración actualizado exitosamente.',
        ]);
    }

    /**
     * Delete a payroll numbering range
     */
    public function destroy(Request $request, PayrollNumberingRange $payrollNumberingRange): JsonResponse
    {
        $user = $request->user();
        $branch = $user->branch;

        if (!$branch || $payrollNumberingRange->branch_id !== $branch->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene permiso para eliminar este rango.',
            ], 403);
        }

        // Check if this range has been used in any payroll
        $usedInPayroll = \App\Models\Payroll::where('prefix', $payrollNumberingRange->prefix)
            ->where('branch_id', $branch->id)
            ->exists();

        if ($usedInPayroll) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar este rango porque ya ha sido utilizado en nóminas.',
            ], 422);
        }

        $payrollNumberingRange->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rango de numeración eliminado exitosamente.',
        ]);
    }
}
