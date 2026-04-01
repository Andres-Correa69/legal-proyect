<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('remember_token')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->after('company_id')->constrained()->onDelete('set null');
            $table->string('document_id')->nullable()->after('branch_id');
            $table->string('phone')->nullable()->after('document_id');
            $table->string('address')->nullable()->after('phone');
            $table->date('birth_date')->nullable()->after('address');
            $table->boolean('is_active')->default(true)->after('birth_date');
            $table->string('country_code')->nullable()->after('is_active');
            $table->string('country_name')->nullable()->after('country_code');
            $table->string('state_code')->nullable()->after('country_name');
            $table->string('state_name')->nullable()->after('state_code');
            $table->string('city_name')->nullable()->after('state_name');
            $table->text('two_factor_secret')->nullable()->after('city_name');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
            $table->softDeletes();

            $table->index('company_id');
            $table->index('branch_id');
            $table->index('is_active');
            $table->index(['company_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['branch_id']);
            $table->dropIndex(['company_id']);
            $table->dropIndex(['branch_id']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['company_id', 'branch_id']);
            $table->dropColumn([
                'company_id',
                'branch_id',
                'document_id',
                'phone',
                'address',
                'birth_date',
                'is_active',
                'country_code',
                'country_name',
                'state_code',
                'state_name',
                'city_name',
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
                'deleted_at',
            ]);
        });
    }
};
