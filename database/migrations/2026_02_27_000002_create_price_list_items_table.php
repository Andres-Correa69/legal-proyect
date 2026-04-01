<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('price_list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('price_list_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained()->onDelete('cascade');
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('custom_price', 15, 2)->nullable();
            $table->timestamps();

            $table->unique(['price_list_id', 'product_id', 'service_id'], 'pli_list_product_service_unique');
            $table->index('product_id');
            $table->index('service_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_list_items');
    }
};
