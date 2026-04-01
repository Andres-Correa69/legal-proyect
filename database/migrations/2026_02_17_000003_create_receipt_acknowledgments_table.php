<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_acknowledgments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_purchase_id')->unique()->constrained('inventory_purchases')->onDelete('cascade');
            $table->string('uuid_reference', 255);
            $table->string('number')->nullable();
            $table->string('uuid', 255)->nullable();
            $table->timestamp('issue_date')->nullable();
            $table->string('status_description')->nullable();
            $table->text('status_message')->nullable();
            $table->text('qr_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('payload')->nullable();
            $table->json('request_payload')->nullable();
            $table->timestamps();

            $table->index('uuid');
            $table->index('uuid_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_acknowledgments');
    }
};
