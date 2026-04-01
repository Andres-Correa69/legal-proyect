<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('salary', 12, 2)->nullable()->after('is_active');
            $table->string('contract_type', 50)->nullable()->after('salary');
            $table->date('admission_date')->nullable()->after('contract_type');
            $table->string('bank_name', 100)->nullable()->after('admission_date');
            $table->string('account_type', 20)->nullable()->after('bank_name');
            $table->string('account_number', 50)->nullable()->after('account_type');
            $table->string('eps_name', 100)->nullable()->after('account_number');
            $table->string('pension_fund_name', 100)->nullable()->after('eps_name');
            $table->string('arl_name', 100)->nullable()->after('pension_fund_name');
            $table->string('compensation_fund_name', 100)->nullable()->after('arl_name');
            $table->unsignedTinyInteger('risk_level')->nullable()->after('compensation_fund_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'salary',
                'contract_type',
                'admission_date',
                'bank_name',
                'account_type',
                'account_number',
                'eps_name',
                'pension_fund_name',
                'arl_name',
                'compensation_fund_name',
                'risk_level',
            ]);
        });
    }
};
