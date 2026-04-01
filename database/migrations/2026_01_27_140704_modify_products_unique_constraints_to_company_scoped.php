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
            // Eliminar restricciones unique globales
            $table->dropUnique(['sku']);
            $table->dropUnique(['barcode']);

            // Agregar restricciones unique por empresa
            $table->unique(['company_id', 'sku'], 'products_company_sku_unique');
            $table->unique(['company_id', 'barcode'], 'products_company_barcode_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Revertir: eliminar restricciones por empresa
            $table->dropUnique('products_company_sku_unique');
            $table->dropUnique('products_company_barcode_unique');

            // Restaurar restricciones globales
            $table->unique('sku');
            $table->unique('barcode');
        });
    }
};
