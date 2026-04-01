<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\GoogleCalendarToken;
use App\Models\User;
use App\Models\Role;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GoogleCalendarController extends Controller
{
    protected GoogleCalendarService $googleCalendarService;

    public function __construct(GoogleCalendarService $googleCalendarService)
    {
        $this->googleCalendarService = $googleCalendarService;
    }

    /**
     * Obtiene la URL de autenticación OAuth de Google.
     */
    public function getAuthUrl(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$this->googleCalendarService->isConfigured()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Google Calendar no está configurado. Contacta al administrador para agregar las credenciales GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.',
                ], 422);
            }

            $companyId = $user->company_id ?? \App\Models\Company::value('id');

            if (!$user || !$companyId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes una empresa asignada',
                ], 422);
            }

            $branchId = $request->input('branch_id');
            $authUrl = $this->googleCalendarService->getAuthUrl($companyId, $branchId);

            return response()->json([
                'success' => true,
                'data' => ['auth_url' => $authUrl],
            ]);
        } catch (\Exception $e) {
            \Log::error('Error en getAuthUrl: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al generar URL de autenticación: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Maneja el callback de OAuth (recibe code y state del popup).
     */
    public function callback(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'state' => 'required|string',
        ]);

        try {
            $token = $this->googleCalendarService->handleCallback(
                $validated['code'],
                $validated['state']
            );

            return response()->json([
                'success' => true,
                'message' => 'Calendario conectado exitosamente',
                'data' => $token,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in Google Calendar callback: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Lista los calendarios conectados de la empresa del usuario.
     */
    public function getCalendars(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || !$user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes una empresa asignada',
            ], 422);
        }

        $query = GoogleCalendarToken::where('company_id', $user->company_id)
            ->where('is_active', true);

        if ($request->has('branch_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('branch_id', $request->input('branch_id'))
                    ->orWhereNull('branch_id');
            });
        }

        $calendars = $query->get();

        return response()->json([
            'success' => true,
            'data' => $calendars->toArray(),
        ]);
    }

    /**
     * Desconecta un calendario.
     */
    public function disconnect(Request $request, int $tokenId): JsonResponse
    {
        try {
            $this->googleCalendarService->disconnectCalendar($tokenId);

            return response()->json([
                'success' => true,
                'message' => 'Calendario desconectado exitosamente',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Sincroniza manualmente una cita con Google Calendar.
     */
    public function syncAppointment(Request $request, Appointment $appointment): JsonResponse
    {
        try {
            $this->googleCalendarService->syncAppointmentToGoogle($appointment);

            return response()->json([
                'success' => true,
                'message' => 'Cita sincronizada exitosamente con Google Calendar',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Obtiene los contactos de Google del usuario.
     */
    public function getContacts(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $companyId = $user->company_id ?? \App\Models\Company::value('id');

            $token = GoogleCalendarToken::where('company_id', $companyId)
                ->where('is_active', true)
                ->first();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No hay una cuenta de Google conectada.',
                ], 422);
            }

            $contacts = $this->googleCalendarService->getContacts($token);

            // Mark which ones are already imported (by email)
            $existingEmails = User::where('company_id', $companyId)
                ->whereNotNull('email')
                ->pluck('email')
                ->toArray();

            $contacts = array_map(function ($c) use ($existingEmails) {
                $c['imported'] = $c['email'] && in_array($c['email'], $existingEmails);
                return $c;
            }, $contacts);

            return response()->json([
                'success' => true,
                'data' => $contacts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Importa contactos seleccionados de Google como clientes.
     */
    public function importContacts(Request $request): JsonResponse
    {
        $request->validate([
            'contacts' => 'required|array|min:1',
            'contacts.*.name' => 'required|string',
            'contacts.*.email' => 'nullable|email',
            'contacts.*.phone' => 'nullable|string',
            'contacts.*.first_name' => 'nullable|string',
            'contacts.*.last_name' => 'nullable|string',
        ]);

        $user = $request->user();
        $companyId = $user->company_id ?? \App\Models\Company::value('id');

        $clientRole = Role::where('slug', 'client')->first();
        $imported = 0;
        $skipped = 0;

        foreach ($request->contacts as $contact) {
            // Skip if email already exists
            if ($contact['email'] && User::where('email', $contact['email'])->exists()) {
                $skipped++;
                continue;
            }

            $newUser = User::create([
                'name' => $contact['name'],
                'first_name' => $contact['first_name'] ?? null,
                'last_name' => $contact['last_name'] ?? null,
                'email' => $contact['email'] ?? null,
                'phone' => $contact['phone'] ?? null,
                'company_id' => $companyId,
                'password' => Hash::make(Str::random(16)),
            ]);

            if ($clientRole) {
                $newUser->roles()->attach($clientRole->id);
            }

            $imported++;
        }

        return response()->json([
            'success' => true,
            'data' => ['imported' => $imported, 'skipped' => $skipped],
            'message' => "{$imported} contactos importados como clientes.",
        ]);
    }
}
