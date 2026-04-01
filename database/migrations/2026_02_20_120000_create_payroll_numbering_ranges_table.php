<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_numbering_ranges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('name', 100);
            $table->string('type', 20)->default('payroll'); // 'payroll' or 'payroll_note'
            $table->string('prefix', 10);
            $table->unsignedBigInteger('consecutive_start')->nullable();
            $table->unsignedBigInteger('consecutive_end')->nullable();
            $table->unsignedBigInteger('current_consecutive')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['branch_id', 'prefix']);
            $table->index('company_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_numbering_ranges');
    }
};
