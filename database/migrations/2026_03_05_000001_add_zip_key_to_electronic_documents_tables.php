<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('electronic_invoices', 'zip_key')) {
            Schema::table('electronic_invoices', function (Blueprint $table) {
                $table->string('zip_key', 255)->nullable()->after('zip_name')->index();
            });
        }

        if (!Schema::hasColumn('electronic_credit_notes', 'zip_key')) {
            Schema::table('electronic_credit_notes', function (Blueprint $table) {
                $table->string('zip_key', 255)->nullable()->after('status_message')->index();
            });
        }

        if (!Schema::hasColumn('electronic_debit_notes', 'zip_key')) {
            Schema::table('electronic_debit_notes', function (Blueprint $table) {
                $table->string('zip_key', 255)->nullable()->after('status_message')->index();
            });
        }
    }

    public function down(): void
    {
        Schema::table('electronic_invoices', function (Blueprint $table) {
            $table->dropColumn('zip_key');
        });

        Schema::table('electronic_credit_notes', function (Blueprint $table) {
            $table->dropColumn('zip_key');
        });

        Schema::table('electronic_debit_notes', function (Blueprint $table) {
            $table->dropColumn('zip_key');
        });
    }
};
