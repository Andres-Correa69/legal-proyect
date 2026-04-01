<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_account_cash_register', function (Blueprint $table) {
            $table->id();
            $table->foreignId('accounting_account_id')->constrained()->onDelete('cascade');
            $table->foreignId('cash_register_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['accounting_account_id', 'cash_register_id'], 'acct_cash_register_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_account_cash_register');
    }
};
