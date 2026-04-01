<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_account_sale_type', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            $table->foreignId('accounting_account_id')->constrained()->onDelete('cascade');
            $table->string('sale_type', 50);
            $table->string('transaction_type', 50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['company_id', 'sale_type', 'transaction_type'], 'acct_sale_type_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_account_sale_type');
    }
};
