<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('client_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->onDelete('set null');

            $table->string('order_number', 20)->index();
            $table->enum('status', ['pending', 'in_progress', 'on_hold', 'completed', 'cancelled', 'invoiced'])->default('pending');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('type', ['repair', 'maintenance', 'installation', 'inspection', 'custom'])->default('repair');

            $table->string('title');
            $table->text('description')->nullable();
            $table->string('equipment_info')->nullable();

            $table->date('scheduled_date')->nullable();
            $table->time('scheduled_time')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('estimated_duration')->nullable()->comment('minutes');
            $table->integer('actual_duration')->nullable()->comment('minutes');

            $table->text('diagnosis')->nullable();
            $table->text('resolution_notes')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'order_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_orders');
    }
};
