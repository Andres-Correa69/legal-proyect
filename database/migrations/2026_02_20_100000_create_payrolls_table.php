<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('prefix', 10)->nullable();
            $table->unsignedInteger('number')->nullable();
            $table->date('settlement_start_date');
            $table->date('settlement_end_date');
            $table->date('issue_date');
            $table->string('status', 20)->default('draft');
            $table->unsignedInteger('payroll_period_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index('company_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('settlement_start_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};
