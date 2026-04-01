<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('type'); // low_stock, sales_decrease, inactive_clients, no_movement_products, sales_target, upcoming_invoices, high_expenses
            $table->json('conditions'); // { threshold: number, days: number, percentage: number, etc. }
            $table->json('recipients'); // ["email1@test.com", "email2@test.com"]
            $table->enum('frequency', ['hourly', 'daily', 'weekly'])->default('daily');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamp('last_triggered_at')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'is_active']);
            $table->index(['type', 'is_active']);
        });

        Schema::create('alert_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_rule_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->json('data'); // { items_found: [...], summary: "..." }
            $table->boolean('email_sent')->default(false);
            $table->string('email_error')->nullable();
            $table->timestamp('triggered_at');
            $table->timestamps();

            $table->index(['alert_rule_id', 'triggered_at']);
            $table->index(['company_id', 'triggered_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_logs');
        Schema::dropIfExists('alert_rules');
    }
};
