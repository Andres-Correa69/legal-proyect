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
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->string('code')->nullable()->after('name');
            $table->boolean('requires_reference')->default(false)->after('is_active');
            $table->softDeletes();

            // Add unique constraint for company_id + code combination
            $table->unique(['company_id', 'code'], 'payment_methods_company_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropUnique('payment_methods_company_code_unique');
            $table->dropSoftDeletes();
            $table->dropColumn(['code', 'requires_reference']);
        });
    }
};
