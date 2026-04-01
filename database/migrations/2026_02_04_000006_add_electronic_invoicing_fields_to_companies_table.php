<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Check if companies table exists before adding fields
        if (Schema::hasTable('companies')) {
            Schema::table('companies', function (Blueprint $table) {
                if (!Schema::hasColumn('companies', 'electronic_invoicing_token')) {
                    $table->text('electronic_invoicing_token')->nullable();
                }
                if (!Schema::hasColumn('companies', 'electronic_invoicing_registered')) {
                    $table->boolean('electronic_invoicing_registered')->default(false);
                }
                if (!Schema::hasColumn('companies', 'electronic_invoicing_registered_at')) {
                    $table->timestamp('electronic_invoicing_registered_at')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('companies')) {
            Schema::table('companies', function (Blueprint $table) {
                $table->dropColumn([
                    'electronic_invoicing_token',
                    'electronic_invoicing_registered',
                    'electronic_invoicing_registered_at',
                ]);
            });
        }
    }
};
