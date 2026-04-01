<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('electronic_credit_notes', function (Blueprint $table) {
            $table->json('request_payload')->nullable()->after('payload');
        });

        Schema::table('electronic_debit_notes', function (Blueprint $table) {
            $table->json('request_payload')->nullable()->after('payload');
        });
    }

    public function down(): void
    {
        Schema::table('electronic_credit_notes', function (Blueprint $table) {
            $table->dropColumn('request_payload');
        });

        Schema::table('electronic_debit_notes', function (Blueprint $table) {
            $table->dropColumn('request_payload');
        });
    }
};
