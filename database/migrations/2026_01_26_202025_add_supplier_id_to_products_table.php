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
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('location_id')->constrained()->nullOnDelete();
            $table->timestamp('last_stock_update_at')->nullable()->after('is_trackable');
            $table->foreignId('last_stock_update_by')->nullable()->after('last_stock_update_at')->constrained('users')->nullOnDelete();
            $table->boolean('auto_purchase_enabled')->default(false)->after('is_trackable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
            $table->dropForeign(['last_stock_update_by']);
            $table->dropColumn(['last_stock_update_at', 'last_stock_update_by', 'auto_purchase_enabled']);
        });
    }
};
