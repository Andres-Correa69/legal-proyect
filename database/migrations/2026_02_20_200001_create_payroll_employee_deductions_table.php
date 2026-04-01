<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_employee_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_employee_id')->constrained('payroll_employees')->onDelete('cascade');
            $table->string('concept', 50);
            $table->json('data')->nullable();
            $table->decimal('payment', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('payroll_employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_employee_deductions');
    }
};
