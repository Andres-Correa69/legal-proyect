<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $logs = ActivityLog::with(['causer', 'subject'])
            ->when($request->search, function ($query, $search) {
                $query->where('description', 'like', "%{$search}%");
            })
            ->when($request->event, function ($query, $event) {
                $query->where('event', $event);
            })
            ->when($request->causer_id, function ($query, $causerId) {
                $query->where('causer_id', $causerId)
                    ->where('causer_type', 'App\\Models\\User');
            })
            ->when($request->subject_type, function ($query, $subjectType) {
                $query->where('subject_type', 'like', "%{$subjectType}%");
            })
            ->when($request->date_from, function ($query, $dateFrom) {
                $query->whereDate('created_at', '>=', $dateFrom);
            })
            ->when($request->date_to, function ($query, $dateTo) {
                $query->whereDate('created_at', '<=', $dateTo);
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json($logs);
    }

    public function show(Request $request, ActivityLog $activityLog): JsonResponse
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($activityLog->load(['causer', 'subject']));
    }
}
