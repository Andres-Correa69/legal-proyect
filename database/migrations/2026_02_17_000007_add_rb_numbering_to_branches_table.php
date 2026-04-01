<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_rb_prefix')->nullable()->after('ei_ar_current_consecutive');
            $table->integer('ei_rb_consecutive_start')->nullable()->after('ei_rb_prefix');
            $table->integer('ei_rb_consecutive_end')->nullable()->after('ei_rb_consecutive_start');
            $table->integer('ei_rb_current_consecutive')->nullable()->after('ei_rb_consecutive_end');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_rb_prefix',
                'ei_rb_consecutive_start',
                'ei_rb_consecutive_end',
                'ei_rb_current_consecutive',
            ]);
        });
    }
};
