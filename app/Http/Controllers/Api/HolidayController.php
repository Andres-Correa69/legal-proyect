<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    /**
     * Get holidays for a given country and year.
     * Currently supports Colombia only.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'country' => 'required|string|in:CO',
            'year' => 'required|integer|min:2020|max:2050',
        ]);

        $year = (int) $request->year;
        $holidays = $this->getColombianHolidays($year);

        // Check which holidays are already imported
        $user = auth()->user();
        $companyId = $user->company_id ?? \App\Models\Company::value('id');
        $existingDates = Appointment::where('company_id', $companyId)
            ->where('type', 'holiday')
            ->whereYear('starts_at', $year)
            ->pluck('starts_at')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        $holidays = array_map(function ($h) use ($existingDates) {
            $h['imported'] = in_array($h['date'], $existingDates);
            return $h;
        }, $holidays);

        return response()->json([
            'success' => true,
            'data' => $holidays,
        ]);
    }

    /**
     * Import selected holidays as appointments
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'country' => 'required|string|in:CO',
            'year' => 'required|integer|min:2020|max:2050',
            'dates' => 'required|array|min:1',
            'dates.*' => 'date_format:Y-m-d',
        ]);

        $user = auth()->user();
        $companyId = $user->company_id ?? \App\Models\Company::value('id');
        $year = (int) $request->year;
        $allHolidays = collect($this->getColombianHolidays($year))->keyBy('date');

        $imported = 0;
        foreach ($request->dates as $date) {
            $holiday = $allHolidays->get($date);
            if (!$holiday) continue;

            // Skip if already exists
            $exists = Appointment::where('company_id', $companyId)
                ->where('type', 'holiday')
                ->whereDate('starts_at', $date)
                ->exists();

            if ($exists) continue;

            Appointment::create([
                'company_id' => $companyId,
                'branch_id' => $user->branch_id,
                'created_by_user_id' => $user->id,
                'title' => $holiday['name'],
                'type' => 'holiday',
                'priority' => 'normal',
                'status' => 'scheduled',
                'starts_at' => Carbon::parse($date)->startOfDay(),
                'ends_at' => Carbon::parse($date)->endOfDay(),
                'all_day' => true,
                'color' => '#ef4444', // red for holidays
                'description' => "Día festivo - {$holiday['name']} ({$request->country})",
            ]);
            $imported++;
        }

        return response()->json([
            'success' => true,
            'data' => ['imported' => $imported],
            'message' => "{$imported} días festivos importados correctamente.",
        ]);
    }

    /**
     * Remove all imported holidays for a year
     */
    public function remove(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer|min:2020|max:2050',
        ]);

        $user = auth()->user();
        $deleted = Appointment::where('company_id', $user->company_id)
            ->where('type', 'holiday')
            ->whereYear('starts_at', $request->year)
            ->delete();

        return response()->json([
            'success' => true,
            'data' => ['deleted' => $deleted],
            'message' => "{$deleted} días festivos eliminados.",
        ]);
    }

    /**
     * Colombian holidays with Ley Emiliani (Ley 51 de 1983)
     * Returns all 18+ holidays for a given year.
     */
    private function getColombianHolidays(int $year): array
    {
        $holidays = [];

        // ── Fixed holidays ──
        $holidays[] = ['date' => "$year-01-01", 'name' => 'Año Nuevo'];
        $holidays[] = ['date' => "$year-05-01", 'name' => 'Día del Trabajador'];
        $holidays[] = ['date' => "$year-07-20", 'name' => 'Declaración de la Independencia'];
        $holidays[] = ['date' => "$year-08-07", 'name' => 'Batalla del día de Boyacá'];
        $holidays[] = ['date' => "$year-12-08", 'name' => 'Inmaculada Concepción'];
        $holidays[] = ['date' => "$year-12-25", 'name' => 'Navidad'];

        // ── Ley Emiliani holidays (moved to next Monday) ──
        $holidays[] = ['date' => $this->nextMonday("$year-01-06"), 'name' => 'Día de los Reyes Magos'];
        $holidays[] = ['date' => $this->nextMonday("$year-03-19"), 'name' => 'Día de San José'];
        $holidays[] = ['date' => $this->nextMonday("$year-06-29"), 'name' => 'San Pedro y San Pablo'];
        $holidays[] = ['date' => $this->nextMonday("$year-08-15"), 'name' => 'Asunción de la Virgen'];
        $holidays[] = ['date' => $this->nextMonday("$year-10-12"), 'name' => 'Día de la Raza'];
        $holidays[] = ['date' => $this->nextMonday("$year-11-01"), 'name' => 'Día de Todos los Santos'];
        $holidays[] = ['date' => $this->nextMonday("$year-11-11"), 'name' => 'Independencia de Cartagena'];

        // ── Easter-based holidays ──
        $easter = Carbon::createFromTimestamp(easter_date($year));

        // Jueves Santo (Easter - 3 days)
        $holidays[] = ['date' => $easter->copy()->subDays(3)->format('Y-m-d'), 'name' => 'Jueves Santo'];
        // Viernes Santo (Easter - 2 days)
        $holidays[] = ['date' => $easter->copy()->subDays(2)->format('Y-m-d'), 'name' => 'Viernes Santo'];

        // Ascensión de Jesucristo (Easter + 39 days, moved to Monday)
        $holidays[] = ['date' => $this->nextMonday($easter->copy()->addDays(39)->format('Y-m-d')), 'name' => 'Fiesta de la Ascensión de Jesucristo'];
        // Corpus Christi (Easter + 60 days, moved to Monday)
        $holidays[] = ['date' => $this->nextMonday($easter->copy()->addDays(60)->format('Y-m-d')), 'name' => 'Corpus Christi'];
        // Sagrado Corazón (Easter + 68 days, moved to Monday)
        $holidays[] = ['date' => $this->nextMonday($easter->copy()->addDays(68)->format('Y-m-d')), 'name' => 'Sagrado Corazón'];

        // Sort by date
        usort($holidays, fn ($a, $b) => strcmp($a['date'], $b['date']));

        return $holidays;
    }

    /**
     * If the date is not a Monday, move it to the next Monday (Ley Emiliani).
     */
    private function nextMonday(string $date): string
    {
        $carbon = Carbon::parse($date);
        if ($carbon->dayOfWeek === Carbon::MONDAY) {
            return $carbon->format('Y-m-d');
        }
        return $carbon->next(Carbon::MONDAY)->format('Y-m-d');
    }
}
