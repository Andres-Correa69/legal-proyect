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
        Schema::table('cash_register_transfers', function (Blueprint $table) {
            $table->text('cancellation_reason')->nullable()->after('status');
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users')->onDelete('set null')->after('cancellation_reason');
            $table->timestamp('cancelled_at')->nullable()->after('cancelled_by_user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_register_transfers', function (Blueprint $table) {
            $table->dropForeign(['cancelled_by_user_id']);
            $table->dropColumn(['cancellation_reason', 'cancelled_by_user_id', 'cancelled_at']);
        });
    }
};
