<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->decimal('retention_amount', 15, 2)->default(0)->after('total_amount');
            $table->json('retentions')->nullable()->after('retention_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->dropColumn(['retention_amount', 'retentions']);
        });
    }
};
