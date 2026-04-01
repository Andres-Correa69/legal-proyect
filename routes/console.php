<?php

use App\Jobs\RetryPendingEmailsJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Alert checks
Schedule::command('alerts:check --frequency=hourly')->hourly();
Schedule::command('alerts:check --frequency=daily')->dailyAt('08:00');
Schedule::command('alerts:check --frequency=weekly')->weeklyOn(1, '08:00');

// Reintentar envío de correos pendientes cada 5 minutos
Schedule::job(new RetryPendingEmailsJob)->everyFiveMinutes()->withoutOverlapping();
