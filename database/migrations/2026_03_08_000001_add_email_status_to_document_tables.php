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
            if (Schema::hasTable($table) && !Schema::hasColumn($table, 'email_status')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->string('email_status', 20)->nullable()->comment('sent, pending (failed/waiting resend)');
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
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'email_status')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('email_status');
                });
            }
        }
    }
};
