<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('electronic_credit_notes', function (Blueprint $table) {
            $table->string('type', 20)->default('void')->after('electronic_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('electronic_credit_notes', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
