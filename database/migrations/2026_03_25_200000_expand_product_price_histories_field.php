<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change column type to varchar(100)
        DB::statement("ALTER TABLE product_price_histories ALTER COLUMN field TYPE VARCHAR(100)");

        // Add text columns for non-numeric changes
        Schema::table('product_price_histories', function (Blueprint $table) {
            $table->string('old_text', 500)->nullable();
            $table->string('new_text', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('product_price_histories', function (Blueprint $table) {
            $table->dropColumn(['old_text', 'new_text']);
        });

        // Revert to varchar(20)
        DB::table('product_price_histories')->whereNotIn('field', ['purchase_price', 'sale_price'])->delete();
        DB::statement("ALTER TABLE product_price_histories ALTER COLUMN field TYPE VARCHAR(20)");
    }
};
