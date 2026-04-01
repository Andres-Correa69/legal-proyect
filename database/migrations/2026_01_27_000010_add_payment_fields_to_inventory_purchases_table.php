<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->decimal('total_paid', 15, 2)->default(0)->after('total_amount');
            $table->decimal('balance_due', 15, 2)->default(0)->after('total_paid');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_purchases', function (Blueprint $table) {
            $table->dropColumn(['total_paid', 'balance_due']);
        });
    }
};
