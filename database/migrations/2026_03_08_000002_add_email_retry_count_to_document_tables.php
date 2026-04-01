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
        $tables = [
            'sales',
            'electronic_invoices',
            'electronic_credit_notes',
            'electronic_debit_notes',
            'receipt_acknowledgments',
            'goods_receipts',
            'document_supports',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'email_retry_count')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->unsignedTinyInteger('email_retry_count')->default(0);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'sales',
            'electronic_invoices',
            'electronic_credit_notes',
            'electronic_debit_notes',
            'receipt_acknowledgments',
            'goods_receipts',
            'document_supports',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'email_retry_count')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('email_retry_count');
                });
            }
        }
    }
};
