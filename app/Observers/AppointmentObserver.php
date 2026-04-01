<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Services\GoogleCalendarService;
use Illuminate\Support\Facades\Log;

class AppointmentObserver
{
    public function created(Appointment $appointment): void
    {
        $this->syncToGoogle($appointment);
    }

    public function updated(Appointment $appointment): void
    {
        if ($appointment->status === 'cancelled') {
            $this->deleteFromGoogle($appointment);
        } else {
            $this->syncToGoogle($appointment);
        }
    }

    public function deleted(Appointment $appointment): void
    {
        $this->deleteFromGoogle($appointment);
    }

    private function syncToGoogle(Appointment $appointment): void
    {
        if ($appointment->type === 'holiday') return;

        try {
            app(GoogleCalendarService::class)->syncAppointmentToGoogle($appointment);
        } catch (\Throwable $e) {
            Log::warning("Google Calendar sync failed for appointment {$appointment->id}: " . $e->getMessage());
        }
    }

    private function deleteFromGoogle(Appointment $appointment): void
    {
        if ($appointment->type === 'holiday') return;

        try {
            app(GoogleCalendarService::class)->deleteAppointmentFromGoogle($appointment);
        } catch (\Throwable $e) {
            Log::warning("Google Calendar delete failed for appointment {$appointment->id}: " . $e->getMessage());
        }
    }
}
