<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_emissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_employee_id')->constrained('payroll_employees')->onDelete('cascade');
            $table->string('type', 20); // 'emission' or 'annulment'
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
            $table->string('qr_link')->nullable();
            $table->text('xml_base64_bytes')->nullable();
            $table->text('pdf_base64_bytes')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->boolean('is_valid')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_emissions');
    }
};
