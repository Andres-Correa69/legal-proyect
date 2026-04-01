<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('reconciliation_number')->unique();
            $table->foreignId('warehouse_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('location_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('category_id')->nullable()->constrained('product_categories')->onDelete('set null');
            $table->enum('status', ['draft', 'in_progress', 'review', 'approved', 'applied', 'cancelled'])->default('draft');
            $table->boolean('is_blind_count')->default(false);
            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();

            // Summary fields
            $table->integer('total_products')->default(0);
            $table->integer('total_counted')->default(0);
            $table->integer('total_matches')->default(0);
            $table->integer('total_surpluses')->default(0);
            $table->integer('total_shortages')->default(0);
            $table->decimal('total_surplus_value', 15, 2)->default(0);
            $table->decimal('total_shortage_value', 15, 2)->default(0);
            $table->decimal('net_financial_impact', 15, 2)->default(0);

            // User tracking
            $table->foreignId('created_by_user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('counted_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('reviewed_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('applied_by_user_id')->nullable()->constrained('users')->onDelete('set null');

            // Phase timestamps
            $table->timestamp('counting_started_at')->nullable();
            $table->timestamp('counting_completed_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('company_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('warehouse_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_reconciliations');
    }
};
