<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('electronic_debit_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('electronic_invoice_id')->unique()->constrained('electronic_invoices')->onDelete('cascade');
            $table->string('number')->nullable();
            $table->string('uuid', 255)->nullable();
            $table->timestamp('issue_date')->nullable();
            $table->string('status_description')->nullable();
            $table->text('status_message')->nullable();
            $table->text('qr_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index('uuid');
            $table->index('number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electronic_debit_notes');
    }
};
