<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('concept')->nullable()->after('notes');
            $table->foreignId('accounting_account_id')
                ->nullable()
                ->after('concept')
                ->constrained('accounting_accounts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['accounting_account_id']);
            $table->dropColumn(['concept', 'accounting_account_id']);
        });
    }
};
