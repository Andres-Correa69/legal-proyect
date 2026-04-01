<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\AppointmentReminder;
use App\Models\Sale;
use App\Models\InventoryPurchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AppointmentController extends Controller
{
    /**
     * Lista citas con filtros y paginación
     */
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::with(['client', 'supplier', 'relatedSale', 'createdBy', 'branch'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->when($request->type, fn($q, $type) => $q->where('type', $type))
            ->when($request->status, fn($q, $status) => $q->where('status', $status))
            ->when($request->priority, fn($q, $priority) => $q->where('priority', $priority))
            ->when($request->client_id, fn($q, $clientId) => $q->where('client_id', $clientId))
            ->when($request->date_from, function ($q, $dateFrom) {
                $q->where('starts_at', '>=', Carbon::parse($dateFrom)->startOfDay());
            })
            ->when($request->date_to, function ($q, $dateTo) {
                $q->where('starts_at', '<=', Carbon::parse($dateTo)->endOfDay());
            })
            ->orderBy('starts_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json($appointments);
    }

    /**
     * Citas + vencimientos de facturas para un rango de fechas (vista calendario)
     */
    public function byDateRange(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
        ]);

        $from = Carbon::parse($request->date_from)->startOfDay();
        $to = Carbon::parse($request->date_to)->endOfDay();
        $user = $request->user();

        // Citas en el rango
        $appointments = Appointment::with(['client', 'supplier', 'relatedSale', 'createdBy'])
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('starts_at', [$from, $to])
                  ->orWhere(function ($q2) use ($from, $to) {
                      $q2->where('starts_at', '<=', $to)
                         ->where('ends_at', '>=', $from);
                  });
            })
            ->orderBy('starts_at')
            ->get();

        // Facturas con due_date en el rango (no pagadas, no canceladas)
        $invoiceDueDates = Sale::with(['client'])
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->select(['id', 'invoice_number', 'type', 'status', 'payment_status', 'due_date', 'total_amount', 'balance', 'client_id'])
            ->orderBy('due_date')
            ->get();

        // Compras con credit_due_date en el rango (no pagadas, no canceladas)
        $purchaseDueDates = InventoryPurchase::with(['supplier:id,name'])
            ->whereNotNull('credit_due_date')
            ->whereBetween('credit_due_date', [$from->toDateString(), $to->toDateString()])
            ->whereIn('payment_status', ['pending', 'partial'])
            ->where('status', '!=', 'cancelled')
            ->select(['id', 'purchase_number', 'status', 'payment_status', 'credit_due_date', 'total_amount', 'balance_due', 'supplier_id'])
            ->orderBy('credit_due_date')
            ->get();

        // Stats
        $today = Carbon::today();
        $stats = [
            'total_appointments' => $appointments->count(),
            'upcoming_today' => $appointments->filter(function ($a) use ($today) {
                return $a->starts_at->isToday() && $a->status === 'scheduled';
            })->count(),
            'overdue_invoices' => Sale::whereNotNull('due_date')
                ->where('due_date', '<', $today)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->where('status', '!=', 'cancelled')
                ->count(),
            'overdue_purchases' => InventoryPurchase::whereNotNull('credit_due_date')
                ->where('credit_due_date', '<', $today)
                ->whereIn('payment_status', ['pending', 'partial'])
                ->where('status', '!=', 'cancelled')
                ->count(),
            'pending_reminders' => AppointmentReminder::forUser($user->id)
                ->unread()
                ->due()
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'appointments' => $appointments,
                'invoice_due_dates' => $invoiceDueDates,
                'purchase_due_dates' => $purchaseDueDates,
                'stats' => $stats,
            ],
        ]);
    }

    /**
     * Próximas citas
     */
    public function upcoming(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 5);

        $appointments = Appointment::with(['client', 'createdBy'])
            ->upcoming()
            ->limit($limit)
            ->get();

        return response()->json($appointments);
    }

    /**
     * Detalle de una cita
     */
    public function show(Appointment $appointment): JsonResponse
    {
        $appointment->load(['client', 'supplier', 'relatedSale', 'createdBy', 'branch', 'reminders']);

        return response()->json($appointment);
    }

    /**
     * Crear una cita
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:appointment,reminder,follow_up,call,meeting',
            'status' => 'nullable|in:scheduled,completed,cancelled,no_show',
            'priority' => 'nullable|in:low,normal,high,urgent',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'all_day' => 'nullable|boolean',
            'client_id' => 'nullable|exists:users,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'related_sale_id' => 'nullable|exists:sales,id',
            'color' => 'nullable|string|max:7',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'reminders' => 'nullable|array',
            'reminders.*.remind_at' => 'required_with:reminders|date',
        ]);

        $user = $request->user();
        $validated['company_id'] = $user->company_id;
        $validated['branch_id'] = $user->branch_id;
        $validated['created_by_user_id'] = $user->id;

        $remindersData = $validated['reminders'] ?? [];
        unset($validated['reminders']);

        $appointment = Appointment::create($validated);

        // Crear recordatorios
        foreach ($remindersData as $reminder) {
            AppointmentReminder::create([
                'company_id' => $user->company_id,
                'appointment_id' => $appointment->id,
                'user_id' => $user->id,
                'remind_at' => $reminder['remind_at'],
            ]);
        }

        return response()->json(
            $appointment->load(['client', 'supplier', 'relatedSale', 'createdBy', 'reminders']),
            201
        );
    }

    /**
     * Actualizar una cita
     */
    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'sometimes|in:appointment,reminder,follow_up,call,meeting',
            'status' => 'sometimes|in:scheduled,completed,cancelled,no_show',
            'priority' => 'sometimes|in:low,normal,high,urgent',
            'starts_at' => 'sometimes|required|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'all_day' => 'nullable|boolean',
            'client_id' => 'nullable|exists:users,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'related_sale_id' => 'nullable|exists:sales,id',
            'color' => 'nullable|string|max:7',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'reminders' => 'nullable|array',
            'reminders.*.remind_at' => 'required_with:reminders|date',
        ]);

        $remindersData = $validated['reminders'] ?? null;
        unset($validated['reminders']);

        $appointment->update($validated);

        // Reemplazar recordatorios si se enviaron
        if ($remindersData !== null) {
            $appointment->reminders()->delete();
            $user = $request->user();
            foreach ($remindersData as $reminder) {
                AppointmentReminder::create([
                    'company_id' => $appointment->company_id,
                    'appointment_id' => $appointment->id,
                    'user_id' => $user->id,
                    'remind_at' => $reminder['remind_at'],
                ]);
            }
        }

        return response()->json(
            $appointment->fresh()->load(['client', 'supplier', 'relatedSale', 'createdBy', 'reminders'])
        );
    }

    /**
     * Cambio rápido de estado
     */
    public function updateStatus(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,completed,cancelled,no_show',
        ]);

        $appointment->update(['status' => $validated['status']]);

        return response()->json(
            $appointment->fresh()->load(['client', 'createdBy'])
        );
    }

    /**
     * Eliminar cita (soft delete)
     */
    public function destroy(Appointment $appointment): JsonResponse
    {
        $appointment->delete();

        return response()->json(null, 204);
    }

    // ==================== Reminders ====================

    /**
     * Recordatorios no leídos del usuario actual
     */
    public function reminders(Request $request): JsonResponse
    {
        $reminders = AppointmentReminder::with(['appointment.client'])
            ->forUser($request->user()->id)
            ->unread()
            ->due()
            ->orderBy('remind_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json($reminders);
    }

    /**
     * Conteo de recordatorios pendientes (para badge del header)
     */
    public function remindersCount(Request $request): JsonResponse
    {
        $count = AppointmentReminder::forUser($request->user()->id)
            ->unread()
            ->due()
            ->count();

        // También contar citas de hoy pendientes
        $todayAppointments = Appointment::where('status', 'scheduled')
            ->whereDate('starts_at', Carbon::today())
            ->count();

        return response()->json([
            'reminders_count' => $count,
            'today_appointments' => $todayAppointments,
            'total' => $count + $todayAppointments,
        ]);
    }

    /**
     * Marcar un recordatorio como leído
     */
    public function markReminderRead(AppointmentReminder $reminder): JsonResponse
    {
        $reminder->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Marcar todos los recordatorios como leídos
     */
    public function markAllRemindersRead(Request $request): JsonResponse
    {
        AppointmentReminder::forUser($request->user()->id)
            ->unread()
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['success' => true]);
    }

    /**
     * Descartar un recordatorio
     */
    public function dismissReminder(AppointmentReminder $reminder): JsonResponse
    {
        $reminder->update([
            'is_dismissed' => true,
            'dismissed_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Tipos y constantes para el frontend
     */
    public function types(): JsonResponse
    {
        return response()->json([
            'types' => Appointment::TYPES,
            'statuses' => Appointment::STATUSES,
            'priorities' => Appointment::PRIORITIES,
        ]);
    }
}
