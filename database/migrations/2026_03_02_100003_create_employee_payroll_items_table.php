<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_payroll_entry_id')->constrained('employee_payroll_entries')->onDelete('cascade');
            $table->string('type', 20); // earning, deduction
            $table->string('concept', 50);
            $table->string('description', 255)->nullable();
            $table->decimal('quantity', 8, 2)->nullable();
            $table->decimal('rate', 12, 2)->nullable();
            $table->decimal('amount', 12, 2);
            $table->boolean('is_automatic')->default(false);
            $table->timestamps();

            $table->index(['employee_payroll_entry_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_payroll_items');
    }
};
