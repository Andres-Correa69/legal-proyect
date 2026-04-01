<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_ds_prefix')->nullable()->after('ei_rb_current_consecutive');
            $table->string('ei_ds_resolution')->nullable()->after('ei_ds_prefix');
            $table->date('ei_ds_resolution_date')->nullable()->after('ei_ds_resolution');
            $table->integer('ei_ds_consecutive_start')->nullable()->after('ei_ds_resolution_date');
            $table->integer('ei_ds_consecutive_end')->nullable()->after('ei_ds_consecutive_start');
            $table->integer('ei_ds_current_consecutive')->nullable()->after('ei_ds_consecutive_end');
            $table->date('ei_ds_date_from')->nullable()->after('ei_ds_current_consecutive');
            $table->date('ei_ds_date_to')->nullable()->after('ei_ds_date_from');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_ds_prefix',
                'ei_ds_resolution',
                'ei_ds_resolution_date',
                'ei_ds_consecutive_start',
                'ei_ds_consecutive_end',
                'ei_ds_current_consecutive',
                'ei_ds_date_from',
                'ei_ds_date_to',
            ]);
        });
    }
};
