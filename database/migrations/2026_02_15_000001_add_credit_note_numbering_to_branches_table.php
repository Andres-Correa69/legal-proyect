<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_cn_prefix', 10)->nullable()->after('ei_prefix');
            $table->unsignedInteger('ei_cn_consecutive_start')->nullable()->after('ei_cn_prefix');
            $table->unsignedInteger('ei_cn_consecutive_end')->nullable()->after('ei_cn_consecutive_start');
            $table->unsignedInteger('ei_cn_current_consecutive')->default(0)->after('ei_cn_consecutive_end');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_cn_prefix',
                'ei_cn_consecutive_start',
                'ei_cn_consecutive_end',
                'ei_cn_current_consecutive',
            ]);
        });
    }
};
