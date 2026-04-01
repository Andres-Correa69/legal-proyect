<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\GoogleCalendarToken;
use App\Models\GoogleCalendarSync;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    protected ?string $clientId;
    protected ?string $clientSecret;
    protected string $redirectUri;

    public function __construct()
    {
        $this->clientId = config('services.google.calendar.client_id');
        $this->clientSecret = config('services.google.calendar.client_secret');
        $this->redirectUri = config('services.google.calendar.redirect_uri')
            ?? url('/google-calendar/callback');
    }

    public function isConfigured(): bool
    {
        return !empty($this->clientId) && !empty($this->clientSecret);
    }

    /**
     * Genera la URL de autenticación OAuth de Google.
     */
    public function getAuthUrl(int $companyId, ?int $branchId = null): string
    {
        $scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly';
        $state = base64_encode(json_encode([
            'company_id' => $companyId,
            'branch_id' => $branchId,
        ]));

        $params = [
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => $scopes,
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ];

        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    /**
     * Maneja el callback de OAuth: intercambia el código por tokens.
     */
    public function handleCallback(string $code, string $state): GoogleCalendarToken
    {
        $stateData = json_decode(base64_decode($state), true);
        $companyId = $stateData['company_id'] ?? null;
        $branchId = $stateData['branch_id'] ?? null;

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri,
        ]);

        if (!$response->successful()) {
            throw new \Exception('Error al obtener tokens de Google: ' . $response->body());
        }

        $tokens = $response->json();

        $calendarInfo = $this->getCalendarInfo($tokens['access_token']);

        return GoogleCalendarToken::updateOrCreate(
            [
                'company_id' => $companyId,
                'branch_id' => $branchId,
                'calendar_id' => $calendarInfo['id'],
            ],
            [
                'calendar_name' => $calendarInfo['summary'] ?? 'Calendario Principal',
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'] ?? null,
                'token_expires_at' => isset($tokens['expires_in'])
                    ? now()->addSeconds($tokens['expires_in'])
                    : null,
                'scope' => $tokens['scope'] ?? null,
                'is_active' => true,
                'created_by_user_id' => auth()->id(),
            ]
        );
    }

    /**
     * Obtiene información del calendario primario del usuario.
     */
    protected function getCalendarInfo(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary');

        if (!$response->successful()) {
            throw new \Exception('Error al obtener información del calendario');
        }

        return $response->json();
    }

    /**
     * Obtiene los contactos de Google del usuario autenticado.
     */
    public function getContacts(GoogleCalendarToken $token, int $pageSize = 100): array
    {
        if ($token->needsRefresh()) {
            $this->refreshToken($token);
            $token->refresh();
        }

        $response = Http::withToken($token->access_token)
            ->get('https://people.googleapis.com/v1/people/me/connections', [
                'personFields' => 'names,emailAddresses,phoneNumbers,photos',
                'pageSize' => $pageSize,
                'sortOrder' => 'FIRST_NAME_ASCENDING',
            ]);

        if (!$response->successful()) {
            throw new \Exception('Error al obtener contactos: ' . $response->body());
        }

        $data = $response->json();
        $contacts = [];

        foreach ($data['connections'] ?? [] as $person) {
            $name = $person['names'][0]['displayName'] ?? null;
            $firstName = $person['names'][0]['givenName'] ?? null;
            $lastName = $person['names'][0]['familyName'] ?? null;
            $email = $person['emailAddresses'][0]['value'] ?? null;
            $phone = $person['phoneNumbers'][0]['value'] ?? null;
            $photo = $person['photos'][0]['url'] ?? null;
            $resourceName = $person['resourceName'] ?? null;

            if (!$name && !$email) continue;

            $contacts[] = [
                'resource_name' => $resourceName,
                'name' => $name ?? $email,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'phone' => $phone,
                'photo' => $photo,
            ];
        }

        return $contacts;
    }

    /**
     * Refresca un token expirado usando el refresh_token.
     */
    public function refreshToken(GoogleCalendarToken $token): void
    {
        if (!$token->refresh_token) {
            throw new \Exception('No hay refresh token disponible');
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $token->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (!$response->successful()) {
            $token->update(['is_active' => false]);
            throw new \Exception('Error al refrescar token: ' . $response->body());
        }

        $tokens = $response->json();

        $token->update([
            'access_token' => $tokens['access_token'],
            'token_expires_at' => isset($tokens['expires_in'])
                ? now()->addSeconds($tokens['expires_in'])
                : null,
        ]);
    }

    /**
     * Sincroniza una cita con todos los calendarios conectados de la empresa.
     */
    public function syncAppointmentToGoogle(Appointment $appointment): void
    {
        $tokens = GoogleCalendarToken::where('company_id', $appointment->company_id)
            ->where('is_active', true)
            ->get();

        if ($tokens->isEmpty()) {
            return;
        }

        foreach ($tokens as $token) {
            try {
                if ($token->needsRefresh()) {
                    $this->refreshToken($token);
                    $token->refresh();
                }

                $sync = GoogleCalendarSync::where('appointment_id', $appointment->id)
                    ->where('calendar_id', $token->calendar_id)
                    ->first();

                $eventData = $this->buildEventData($appointment);

                if ($sync && $sync->event_id) {
                    $this->updateEvent($token, $sync->event_id, $eventData);
                    $sync->update([
                        'last_synced_at' => now(),
                        'sync_status' => 'success',
                        'error_message' => null,
                    ]);
                } else {
                    $eventId = $this->createEvent($token, $eventData);

                    GoogleCalendarSync::updateOrCreate(
                        [
                            'appointment_id' => $appointment->id,
                            'calendar_id' => $token->calendar_id,
                        ],
                        [
                            'company_id' => $appointment->company_id,
                            'branch_id' => $appointment->branch_id,
                            'event_id' => $eventId,
                            'sync_direction' => 'to_google',
                            'last_synced_at' => now(),
                            'sync_status' => 'success',
                            'error_message' => null,
                        ]
                    );
                }
            } catch (\Exception $e) {
                Log::error('Error syncing appointment to Google Calendar', [
                    'appointment_id' => $appointment->id,
                    'calendar_id' => $token->calendar_id,
                    'error' => $e->getMessage(),
                ]);

                GoogleCalendarSync::updateOrCreate(
                    [
                        'appointment_id' => $appointment->id,
                        'calendar_id' => $token->calendar_id,
                    ],
                    [
                        'company_id' => $appointment->company_id,
                        'branch_id' => $appointment->branch_id,
                        'sync_status' => 'failed',
                        'error_message' => $e->getMessage(),
                    ]
                );
            }
        }
    }

    /**
     * Construye los datos del evento para Google Calendar.
     */
    protected function buildEventData(Appointment $appointment): array
    {
        $description = $appointment->description ?? '';

        if ($appointment->client) {
            $description .= "\nCliente: {$appointment->client->name}";
        }
        if ($appointment->supplier) {
            $description .= "\nProveedor: {$appointment->supplier->name}";
        }
        if ($appointment->notes) {
            $description .= "\n\nNotas: {$appointment->notes}";
        }

        $data = [
            'summary' => $appointment->title,
            'description' => trim($description),
            'location' => $appointment->location ?? '',
        ];

        if ($appointment->all_day) {
            $data['start'] = ['date' => $appointment->starts_at->format('Y-m-d')];
            $endDate = $appointment->ends_at
                ? $appointment->ends_at->addDay()->format('Y-m-d')
                : $appointment->starts_at->addDay()->format('Y-m-d');
            $data['end'] = ['date' => $endDate];
        } else {
            $timezone = config('app.timezone', 'America/Bogota');
            $data['start'] = [
                'dateTime' => $appointment->starts_at->toIso8601String(),
                'timeZone' => $timezone,
            ];
            $data['end'] = [
                'dateTime' => ($appointment->ends_at ?? $appointment->starts_at->addHour())->toIso8601String(),
                'timeZone' => $timezone,
            ];
        }

        return $data;
    }

    /**
     * Crea un evento en Google Calendar.
     */
    protected function createEvent(GoogleCalendarToken $token, array $eventData): string
    {
        $response = Http::withToken($token->access_token)
            ->post("https://www.googleapis.com/calendar/v3/calendars/{$token->calendar_id}/events", $eventData);

        if (!$response->successful()) {
            throw new \Exception('Error al crear evento: ' . $response->body());
        }

        return $response->json()['id'];
    }

    /**
     * Actualiza un evento en Google Calendar.
     */
    protected function updateEvent(GoogleCalendarToken $token, string $eventId, array $eventData): void
    {
        $response = Http::withToken($token->access_token)
            ->put("https://www.googleapis.com/calendar/v3/calendars/{$token->calendar_id}/events/{$eventId}", $eventData);

        if (!$response->successful()) {
            throw new \Exception('Error al actualizar evento: ' . $response->body());
        }
    }

    /**
     * Elimina todos los eventos de Google Calendar asociados a una cita.
     */
    public function deleteAppointmentFromGoogle(Appointment $appointment): void
    {
        $syncs = GoogleCalendarSync::where('appointment_id', $appointment->id)->get();

        if ($syncs->isEmpty()) {
            return;
        }

        foreach ($syncs as $sync) {
            try {
                $token = GoogleCalendarToken::where('calendar_id', $sync->calendar_id)
                    ->where('company_id', $appointment->company_id)
                    ->where('is_active', true)
                    ->first();

                if (!$token) {
                    $sync->delete();
                    continue;
                }

                if ($token->needsRefresh()) {
                    $this->refreshToken($token);
                    $token->refresh();
                }

                Http::withToken($token->access_token)
                    ->delete("https://www.googleapis.com/calendar/v3/calendars/{$sync->calendar_id}/events/{$sync->event_id}");

                $sync->delete();
            } catch (\Exception $e) {
                Log::error('Error deleting appointment from Google Calendar', [
                    'appointment_id' => $appointment->id,
                    'event_id' => $sync->event_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Desconecta un calendario (marca token como inactivo).
     */
    public function disconnectCalendar(int $tokenId): void
    {
        $token = GoogleCalendarToken::findOrFail($tokenId);
        $token->update(['is_active' => false]);
    }
}
