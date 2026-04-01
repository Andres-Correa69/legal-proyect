<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->foreignId('cash_register_id')->nullable()->after('sale_id')->constrained('cash_registers')->nullOnDelete();
            $table->foreignId('cash_register_session_id')->nullable()->after('cash_register_id')->constrained('cash_register_sessions')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_payments', function (Blueprint $table) {
            $table->dropForeign(['cash_register_id']);
            $table->dropForeign(['cash_register_session_id']);
            $table->dropColumn(['cash_register_id', 'cash_register_session_id']);
        });
    }
};
