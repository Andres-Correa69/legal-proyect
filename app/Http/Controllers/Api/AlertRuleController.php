<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AlertLog;
use App\Models\AlertRule;
use App\Services\AlertCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AlertRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AlertRule::with('creator:id,name')
            ->withCount('logs');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $rules = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $rules,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:' . implode(',', AlertRule::TYPES),
            'conditions' => 'required|array',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'email',
            'frequency' => 'required|string|in:' . implode(',', AlertRule::FREQUENCIES),
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $rule = AlertRule::create([
            'company_id' => auth()->user()->company_id,
            'created_by' => auth()->id(),
            'name' => $request->name,
            'type' => $request->type,
            'conditions' => $request->conditions,
            'recipients' => $request->recipients,
            'frequency' => $request->frequency,
            'is_active' => $request->is_active ?? true,
        ]);

        $rule->load('creator:id,name');
        $rule->loadCount('logs');

        return response()->json([
            'success' => true,
            'data' => $rule,
            'message' => 'Regla de alerta creada exitosamente',
        ], 201);
    }

    public function show(AlertRule $alertRule): JsonResponse
    {
        $alertRule->load('creator:id,name');
        $alertRule->loadCount('logs');

        return response()->json([
            'success' => true,
            'data' => $alertRule,
        ]);
    }

    public function update(Request $request, AlertRule $alertRule): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|in:' . implode(',', AlertRule::TYPES),
            'conditions' => 'sometimes|required|array',
            'recipients' => 'sometimes|required|array|min:1',
            'recipients.*' => 'email',
            'frequency' => 'sometimes|required|string|in:' . implode(',', AlertRule::FREQUENCIES),
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $alertRule->update($request->only([
            'name', 'type', 'conditions', 'recipients', 'frequency', 'is_active',
        ]));

        $alertRule->load('creator:id,name');
        $alertRule->loadCount('logs');

        return response()->json([
            'success' => true,
            'data' => $alertRule,
            'message' => 'Regla de alerta actualizada exitosamente',
        ]);
    }

    public function destroy(AlertRule $alertRule): JsonResponse
    {
        $alertRule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Regla de alerta eliminada exitosamente',
        ]);
    }

    public function toggleActive(AlertRule $alertRule): JsonResponse
    {
        $alertRule->update(['is_active' => !$alertRule->is_active]);

        return response()->json([
            'success' => true,
            'data' => $alertRule,
            'message' => $alertRule->is_active ? 'Alerta activada' : 'Alerta pausada',
        ]);
    }

    public function test(AlertRule $alertRule): JsonResponse
    {
        $service = new AlertCheckService();
        $log = $service->checkAlert($alertRule);

        return response()->json([
            'success' => true,
            'data' => [
                'triggered' => $log !== null,
                'log' => $log,
            ],
            'message' => $log
                ? 'Alerta disparada. Se envió email a los destinatarios.'
                : 'No se encontraron items que cumplan las condiciones.',
        ]);
    }

    public function logs(AlertRule $alertRule, Request $request): JsonResponse
    {
        $logs = $alertRule->logs()
            ->orderBy('triggered_at', 'desc')
            ->limit($request->input('limit', 20))
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    public function stats(): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $totalRules = AlertRule::where('company_id', $companyId)->count();
        $activeRules = AlertRule::where('company_id', $companyId)->where('is_active', true)->count();
        $todayTriggers = AlertLog::where('company_id', $companyId)
            ->whereDate('triggered_at', today())
            ->count();
        $emailsSent = AlertLog::where('company_id', $companyId)
            ->where('email_sent', true)
            ->whereDate('triggered_at', today())
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_rules' => $totalRules,
                'active_rules' => $activeRules,
                'today_triggers' => $todayTriggers,
                'emails_sent' => $emailsSent,
            ],
        ]);
    }

    public function recentLogs(): JsonResponse
    {
        $logs = AlertLog::where('company_id', auth()->user()->company_id)
            ->with('alertRule:id,name,type')
            ->orderBy('triggered_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
