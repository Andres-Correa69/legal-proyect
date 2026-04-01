<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Limpiar datos existentes (requiere reconfigurar cuentas)
        DB::table('accounting_account_sale_type')->truncate();

        // MySQL/MariaDB: must drop FK before dropping index it depends on
        Schema::table('accounting_account_sale_type', function (Blueprint $table) {
            $table->dropForeign('accounting_account_sale_type_company_id_foreign');
        });

        Schema::table('accounting_account_sale_type', function (Blueprint $table) {
            $table->dropUnique('acct_sale_type_unique');
            $table->dropColumn('sale_type');
            $table->unique(['company_id', 'transaction_type'], 'acct_transaction_type_unique');
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        DB::table('accounting_account_sale_type')->truncate();

        Schema::table('accounting_account_sale_type', function (Blueprint $table) {
            $table->dropUnique('acct_transaction_type_unique');
            $table->string('sale_type', 50)->default('general');
            $table->unique(['company_id', 'sale_type', 'transaction_type'], 'acct_sale_type_unique');
        });
    }
};
