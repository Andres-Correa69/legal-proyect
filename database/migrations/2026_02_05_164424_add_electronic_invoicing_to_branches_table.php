<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // Electronic Invoicing fields
            $table->string('electronic_invoicing_token')->nullable()->after('settings');
            $table->boolean('electronic_invoicing_registered')->default(false)->after('electronic_invoicing_token');
            $table->timestamp('electronic_invoicing_registered_at')->nullable()->after('electronic_invoicing_registered');

            // DIAN catalog references
            $table->unsignedBigInteger('ei_type_document_identification_id')->nullable()->after('electronic_invoicing_registered_at');
            $table->unsignedBigInteger('ei_type_organization_id')->nullable()->after('ei_type_document_identification_id');
            $table->unsignedBigInteger('ei_type_regime_id')->nullable()->after('ei_type_organization_id');
            $table->unsignedBigInteger('ei_type_liability_id')->nullable()->after('ei_type_regime_id');
            $table->unsignedBigInteger('ei_municipality_id')->nullable()->after('ei_type_liability_id');

            // DIAN business info
            $table->string('ei_business_name')->nullable()->after('ei_municipality_id');
            $table->string('ei_merchant_registration')->nullable()->after('ei_business_name');
            $table->string('ei_address')->nullable()->after('ei_merchant_registration');
            $table->string('ei_phone')->nullable()->after('ei_address');
            $table->string('ei_email')->nullable()->after('ei_phone');

            // NIT for DIAN (can be different from company)
            $table->string('ei_tax_id')->nullable()->after('ei_email');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'electronic_invoicing_token',
                'electronic_invoicing_registered',
                'electronic_invoicing_registered_at',
                'ei_type_document_identification_id',
                'ei_type_organization_id',
                'ei_type_regime_id',
                'ei_type_liability_id',
                'ei_municipality_id',
                'ei_business_name',
                'ei_merchant_registration',
                'ei_address',
                'ei_phone',
                'ei_email',
                'ei_tax_id',
            ]);
        });
    }
};
