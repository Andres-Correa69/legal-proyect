<?php

namespace App\Console\Commands;

use App\Models\AlertRule;
use App\Services\AlertCheckService;
use Illuminate\Console\Command;

class CheckAlerts extends Command
{
    protected $signature = 'alerts:check {--frequency=all : Check alerts by frequency (hourly, daily, weekly, all)}';
    protected $description = 'Check alert rules and send email notifications';

    public function handle(): int
    {
        $frequency = $this->option('frequency');
        $service = new AlertCheckService();

        $query = AlertRule::where('is_active', true);

        if ($frequency !== 'all') {
            $query->dueForCheck($frequency);
        }

        $rules = $query->get();

        $this->info("Checking {$rules->count()} alert rules...");

        $triggered = 0;
        foreach ($rules as $rule) {
            try {
                $log = $service->checkAlert($rule);
                if ($log) {
                    $triggered++;
                    $this->line("  [TRIGGERED] {$rule->name} ({$rule->type}) - " . count($log->data['items'] ?? []) . " items");
                } else {
                    $this->line("  [OK] {$rule->name} ({$rule->type})");
                }
            } catch (\Exception $e) {
                $this->error("  [ERROR] {$rule->name}: {$e->getMessage()}");
            }
        }

        $this->info("Done. {$triggered} alerts triggered out of {$rules->count()} checked.");

        return self::SUCCESS;
    }
}
