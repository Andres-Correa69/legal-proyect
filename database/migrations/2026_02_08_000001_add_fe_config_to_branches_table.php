<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->unsignedInteger('ei_resolution_id')->nullable()->after('ei_tax_id');
            $table->unsignedInteger('ei_consecutive_start')->nullable()->after('ei_resolution_id');
            $table->unsignedInteger('ei_consecutive_end')->nullable()->after('ei_consecutive_start');
            $table->unsignedInteger('ei_current_consecutive')->default(0)->after('ei_consecutive_end');
            $table->tinyInteger('ei_environment')->default(2)->after('ei_current_consecutive'); // 1=Producción, 2=Pruebas
            $table->string('ei_test_uuid', 255)->nullable()->after('ei_environment');
            $table->date('ei_date_expiration')->nullable()->after('ei_test_uuid');
            $table->string('ei_prefix', 10)->nullable()->after('ei_date_expiration');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_resolution_id',
                'ei_consecutive_start',
                'ei_consecutive_end',
                'ei_current_consecutive',
                'ei_environment',
                'ei_test_uuid',
                'ei_date_expiration',
                'ei_prefix',
            ]);
        });
    }
};
