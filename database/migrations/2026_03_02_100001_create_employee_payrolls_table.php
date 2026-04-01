<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
            $table->smallInteger('period_year');
            $table->tinyInteger('period_month');
            $table->date('settlement_start_date');
            $table->date('settlement_end_date');
            $table->string('status', 20)->default('draft');
            $table->decimal('total_earnings', 14, 2)->default(0);
            $table->decimal('total_deductions', 14, 2)->default(0);
            $table->decimal('total_net_pay', 14, 2)->default(0);
            $table->unsignedInteger('employees_count')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'period_year', 'period_month'], 'employee_payrolls_company_period_unique');
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'period_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_payrolls');
    }
};
