<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('credit_note_amount', 15, 2)->default(0)->after('balance');
            $table->decimal('debit_note_amount', 15, 2)->default(0)->after('credit_note_amount');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['credit_note_amount', 'debit_note_amount']);
        });
    }
};
