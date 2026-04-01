<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_software_id', 100)->nullable()->after('ei_prefix');
            $table->string('ei_pin', 20)->nullable()->after('ei_software_id');
            $table->longText('ei_certificate')->nullable()->after('ei_pin');
            $table->string('ei_certificate_password', 255)->nullable()->after('ei_certificate');
            $table->json('ei_habilitacion_data')->nullable()->after('ei_certificate_password');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_software_id',
                'ei_pin',
                'ei_certificate',
                'ei_certificate_password',
                'ei_habilitacion_data',
            ]);
        });
    }
};
