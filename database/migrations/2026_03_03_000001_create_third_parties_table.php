<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('third_parties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');

            // Document info
            $table->string('document_type', 50)->nullable();
            $table->string('document_id', 50)->nullable();

            // Identity
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('business_name')->nullable();
            $table->string('legal_representative')->nullable();

            // Contact
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('whatsapp_country', 10)->nullable();
            $table->string('whatsapp_number', 30)->nullable();
            $table->string('address', 500)->nullable();

            // Location
            $table->string('country_code', 10)->nullable();
            $table->string('country_name', 100)->nullable();
            $table->string('state_code', 10)->nullable();
            $table->string('state_name', 100)->nullable();
            $table->string('city_name', 100)->nullable();
            $table->string('neighborhood', 150)->nullable();
            $table->string('commune', 100)->nullable();

            // Personal
            $table->date('birth_date')->nullable();
            $table->string('gender', 20)->nullable();
            $table->string('occupation', 100)->nullable();

            // Accounting
            $table->string('payment_terms')->nullable();

            // Observations
            $table->text('observations')->nullable();

            // Status
            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index('document_id');
            $table->index('is_active');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('third_parties');
    }
};
