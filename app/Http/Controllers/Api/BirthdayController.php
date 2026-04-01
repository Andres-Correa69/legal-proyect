<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Http\Request;

class BirthdayController extends Controller
{
    /**
     * Get clients with birthday today
     */
    public function today(Request $request)
    {
        $companyId = auth()->user()->company_id;
        $today = Carbon::today('America/Bogota');

        $clients = User::where('company_id', $companyId)
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $today->month)
            ->whereDay('birth_date', $today->day)
            ->whereHas('roles', fn($q) => $q->where('slug', 'client'))
            ->select('id', 'name', 'first_name', 'last_name', 'email', 'phone', 'whatsapp_country', 'whatsapp_number', 'birth_date', 'document_id')
            ->get()
            ->map(fn($client) => $this->formatClient($client));

        return response()->json([
            'success' => true,
            'data' => $clients,
        ]);
    }

    /**
     * Get clients with upcoming birthdays
     */
    public function upcoming(Request $request)
    {
        $companyId = auth()->user()->company_id;
        $days = $request->input('days', 30);
        $today = Carbon::today('America/Bogota');

        $clients = User::where('company_id', $companyId)
            ->whereNotNull('birth_date')
            ->whereHas('roles', fn($q) => $q->where('slug', 'client'))
            ->select('id', 'name', 'first_name', 'last_name', 'email', 'phone', 'whatsapp_country', 'whatsapp_number', 'birth_date', 'document_id')
            ->get()
            ->map(function ($client) use ($today) {
                $birthDate = Carbon::parse($client->birth_date);
                $nextBirthday = $birthDate->copy()->year($today->year);

                if ($nextBirthday->lt($today)) {
                    $nextBirthday->addYear();
                }

                $client->next_birthday = $nextBirthday;
                $nextBirthday->shiftTimezone('America/Bogota');
            $client->days_until = (int) $today->copy()->diffInDays($nextBirthday, false);

                return $client;
            })
            ->filter(fn($client) => $client->days_until > 0 && $client->days_until <= $days)
            ->sortBy('days_until')
            ->values()
            ->map(fn($client) => $this->formatClient($client, true));

        return response()->json([
            'success' => true,
            'data' => $clients,
        ]);
    }

    /**
     * Get birthday stats for header alerts
     */
    public function stats(Request $request)
    {
        $companyId = auth()->user()->company_id;
        $today = Carbon::today('America/Bogota');

        $allClients = User::where('company_id', $companyId)
            ->whereNotNull('birth_date')
            ->whereHas('roles', fn($q) => $q->where('slug', 'client'))
            ->select('id', 'name', 'first_name', 'last_name', 'email', 'phone', 'whatsapp_country', 'whatsapp_number', 'birth_date', 'document_id')
            ->get();

        $todayClients = $allClients->filter(function ($client) use ($today) {
            $birth = Carbon::parse($client->birth_date);
            return $birth->month === $today->month && $birth->day === $today->day;
        })->values()->map(fn($c) => $this->formatClient($c));

        $weekClients = $allClients->map(function ($client) use ($today) {
            $birthDate = Carbon::parse($client->birth_date);
            $nextBirthday = $birthDate->copy()->year($today->year);
            if ($nextBirthday->lt($today)) {
                $nextBirthday->addYear();
            }
            $client->next_birthday = $nextBirthday;
            $nextBirthday->shiftTimezone('America/Bogota');
            $client->days_until = (int) $today->copy()->diffInDays($nextBirthday, false);
            return $client;
        })->filter(fn($c) => $c->days_until > 0 && $c->days_until <= 7)
            ->sortBy('days_until')
            ->values()
            ->map(fn($c) => $this->formatClient($c, true));

        $monthCount = $allClients->filter(function ($client) use ($today) {
            $birth = Carbon::parse($client->birth_date);
            return $birth->month === $today->month;
        })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'today' => $todayClients,
                'this_week' => $weekClients,
                'today_count' => $todayClients->count(),
                'week_count' => $weekClients->count(),
                'month_count' => $monthCount,
                'total_with_birthday' => $allClients->count(),
            ],
        ]);
    }

    /**
     * Get birthdays by month
     */
    public function byMonth(Request $request, int $month)
    {
        if ($month < 1 || $month > 12) {
            return response()->json(['success' => false, 'message' => 'Mes no válido'], 422);
        }

        $companyId = auth()->user()->company_id;
        $today = Carbon::today('America/Bogota');

        $clients = User::where('company_id', $companyId)
            ->whereNotNull('birth_date')
            ->whereMonth('birth_date', $month)
            ->whereHas('roles', fn($q) => $q->where('slug', 'client'))
            ->select('id', 'name', 'first_name', 'last_name', 'email', 'phone', 'whatsapp_country', 'whatsapp_number', 'birth_date', 'document_id')
            ->orderByRaw('DAY(birth_date)')
            ->get()
            ->map(function ($client) use ($today) {
                $birthDate = Carbon::parse($client->birth_date);
                $nextBirthday = $birthDate->copy()->year($today->year);
                if ($nextBirthday->lt($today)) {
                    $nextBirthday->addYear();
                }
                $nextBirthday->shiftTimezone('America/Bogota');
            $client->days_until = (int) $today->copy()->diffInDays($nextBirthday, false);
                return $this->formatClient($client, true);
            });

        return response()->json([
            'success' => true,
            'data' => $clients,
        ]);
    }

    protected function formatClient($client, bool $includeUpcoming = false): array
    {
        $birthDate = Carbon::parse($client->birth_date);
        $age = $birthDate->age;

        $whatsappUrl = null;
        if ($client->whatsapp_number) {
            $country = $client->whatsapp_country ?? '+57';
            $countryDigits = preg_replace('/\D/', '', $country);
            $numberDigits = preg_replace('/\D/', '', $client->whatsapp_number);
            $whatsappUrl = "https://wa.me/{$countryDigits}{$numberDigits}";
        }

        // Get last sale info
        $lastSale = Sale::where('client_id', $client->id)
            ->where('status', '!=', 'cancelled')
            ->latest('invoice_date')
            ->first();

        $totalPurchased = Sale::where('client_id', $client->id)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        $data = [
            'id' => $client->id,
            'name' => $client->name,
            'first_name' => $client->first_name,
            'last_name' => $client->last_name,
            'email' => $client->email,
            'phone' => $client->phone,
            'document_id' => $client->document_id,
            'birth_date' => $birthDate->format('Y-m-d'),
            'birth_day' => $birthDate->day,
            'birth_month' => $birthDate->month,
            'age' => $age,
            'turning_age' => $age + 1,
            'whatsapp_number' => $client->whatsapp_number,
            'whatsapp_url' => $whatsappUrl,
            'last_purchase_date' => $lastSale?->invoice_date?->format('Y-m-d'),
            'total_purchased' => $totalPurchased,
        ];

        if ($includeUpcoming) {
            $data['next_birthday'] = $client->next_birthday?->format('Y-m-d');
            $data['days_until'] = $client->days_until ?? 0;
        }

        return $data;
    }
}
