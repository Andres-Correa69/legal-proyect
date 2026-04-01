<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_reconciliation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_reconciliation_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('system_stock');
            $table->integer('physical_count')->nullable();
            $table->integer('difference')->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->decimal('financial_impact', 15, 2)->default(0);
            $table->decimal('variance_percentage', 8, 2)->default(0);
            $table->text('notes')->nullable();
            $table->boolean('is_counted')->default(false);
            $table->foreignId('adjustment_id')->nullable()->constrained('inventory_adjustments')->onDelete('set null');
            $table->timestamps();

            $table->unique(['inventory_reconciliation_id', 'product_id'], 'rec_item_product_unique');
            $table->index('inventory_reconciliation_id');
            $table->index('product_id');
            $table->index('is_counted');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_reconciliation_items');
    }
};
