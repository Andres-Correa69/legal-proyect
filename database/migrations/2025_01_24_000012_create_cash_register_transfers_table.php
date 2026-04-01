<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_register_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('transfer_number')->unique();
            $table->foreignId('source_cash_register_id')->constrained('cash_registers')->onDelete('cascade');
            $table->foreignId('destination_cash_register_id')->constrained('cash_registers')->onDelete('cascade');
            $table->decimal('amount', 15, 2);
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['completed', 'cancelled'])->default('completed');
            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index('branch_id');
            $table->index('transfer_number');
            $table->index('source_cash_register_id');
            $table->index('destination_cash_register_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_register_transfers');
    }
};
