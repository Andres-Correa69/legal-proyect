<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');

            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['appointment', 'reminder', 'follow_up', 'call', 'meeting'])->default('appointment');
            $table->enum('status', ['scheduled', 'completed', 'cancelled', 'no_show'])->default('scheduled');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');

            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->boolean('all_day')->default(false);

            $table->foreignId('client_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->onDelete('set null');
            $table->foreignId('related_sale_id')->nullable()->constrained('sales')->onDelete('set null');

            $table->string('color', 7)->nullable();
            $table->string('location')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'starts_at']);
            $table->index(['company_id', 'status']);
            $table->index('client_id');
            $table->index('type');
            $table->index('related_sale_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
