<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('users')->onDelete('cascade');
            $table->string('identification_number');
            $table->string('employee_name');

            // Employee labor data (required by DIAN payroll API)
            $table->unsignedInteger('type_worker_id')->default(1);
            $table->unsignedInteger('subtype_worker_id')->default(1);
            $table->unsignedInteger('type_contract_id')->default(2);
            $table->boolean('integral_salary')->default(false);
            $table->boolean('high_risk_pension')->default(false);
            $table->unsignedInteger('type_document_identification_id')->nullable();
            $table->string('surname', 100)->nullable();
            $table->string('second_surname', 100)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('other_names', 100)->nullable();
            $table->unsignedInteger('municipality_id')->nullable();
            $table->string('address', 255)->nullable();
            $table->date('admission_date')->nullable();

            // Financials
            $table->decimal('salary', 15, 2)->default(0);
            $table->decimal('accrued_total', 15, 2)->default(0);
            $table->decimal('deductions_total', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            // Payment data
            $table->unsignedInteger('payment_form_id')->default(1);
            $table->unsignedInteger('payment_method_id')->default(42);
            $table->string('bank', 100)->nullable();
            $table->string('account_type', 20)->nullable();
            $table->string('account_number', 50)->nullable();

            // DIAN emission status
            $table->boolean('accepted')->default(false);
            $table->boolean('rejected')->default(false);
            $table->string('uuid')->nullable();
            $table->string('number')->nullable();
            $table->string('issue_date_dian')->nullable();
            $table->string('expedition_date')->nullable();
            $table->string('status_code')->nullable();
            $table->string('status_description')->nullable();
            $table->string('status_message')->nullable();
            $table->json('errors_messages')->nullable();
            $table->string('xml_name')->nullable();
            $table->string('zip_name')->nullable();
            $table->text('qr_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('sent_at')->nullable();

            // DIAN annulment (nota de ajuste)
            $table->boolean('annulled')->default(false);
            $table->string('annulment_uuid')->nullable();
            $table->string('annulment_number')->nullable();
            $table->string('annulment_issue_date')->nullable();
            $table->text('annulment_qr_link')->nullable();
            $table->json('annulment_request_payload')->nullable();
            $table->json('annulment_response_payload')->nullable();
            $table->longText('annulment_pdf_base64_bytes')->nullable();
            $table->timestamp('annulled_at')->nullable();

            $table->timestamps();

            $table->index('payroll_id');
            $table->index('company_id');
            $table->index('employee_id');
            $table->index('accepted');
            $table->index('rejected');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_employees');
    }
};
