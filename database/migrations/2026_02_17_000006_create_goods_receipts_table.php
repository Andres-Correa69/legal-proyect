<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('goods_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_purchase_id')->unique()->constrained()->onDelete('cascade');
            $table->foreignId('receipt_acknowledgment_id')->constrained()->onDelete('cascade');
            $table->string('uuid_reference')->nullable();
            $table->string('number')->nullable();
            $table->string('uuid')->nullable();
            $table->timestamp('issue_date')->nullable();
            $table->string('status_description')->nullable();
            $table->text('status_message')->nullable();
            $table->string('qr_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('payload')->nullable();
            $table->json('request_payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('goods_receipts');
    }
};
