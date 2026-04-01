<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_supports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_purchase_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('number')->nullable();
            $table->string('uuid')->nullable();
            $table->date('expedition_date')->nullable();
            $table->string('status_description')->nullable();
            $table->text('status_message')->nullable();
            $table->string('qr_link')->nullable();
            $table->string('pdf_download_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('payload')->nullable();
            $table->json('request_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_supports');
    }
};
