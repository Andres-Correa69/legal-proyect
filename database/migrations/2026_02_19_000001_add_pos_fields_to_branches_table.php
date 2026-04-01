<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // POS Electronic Invoice
            $table->string('ei_pos_prefix', 10)->nullable();
            $table->string('ei_pos_resolution_id', 50)->nullable();
            $table->unsignedInteger('ei_pos_consecutive_start')->nullable();
            $table->unsignedInteger('ei_pos_consecutive_end')->nullable();
            $table->unsignedInteger('ei_pos_current_consecutive')->nullable();
            $table->string('ei_pos_software_id', 100)->nullable();
            $table->string('ei_pos_pin', 50)->nullable();
            // POS Credit Note (anulación POS)
            $table->string('ei_pos_cn_prefix', 10)->nullable();
            $table->unsignedInteger('ei_pos_cn_consecutive_start')->nullable();
            $table->unsignedInteger('ei_pos_cn_consecutive_end')->nullable();
            $table->unsignedInteger('ei_pos_cn_current_consecutive')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_pos_prefix',
                'ei_pos_resolution_id',
                'ei_pos_consecutive_start',
                'ei_pos_consecutive_end',
                'ei_pos_current_consecutive',
                'ei_pos_software_id',
                'ei_pos_pin',
                'ei_pos_cn_prefix',
                'ei_pos_cn_consecutive_start',
                'ei_pos_cn_consecutive_end',
                'ei_pos_cn_current_consecutive',
            ]);
        });
    }
};
