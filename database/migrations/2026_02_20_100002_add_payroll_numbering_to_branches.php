<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_payroll_software_id', 100)->nullable()->after('ei_pos_cn_current_consecutive');
            $table->string('ei_payroll_pin', 50)->nullable()->after('ei_payroll_software_id');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_payroll_software_id',
                'ei_payroll_pin',
            ]);
        });
    }
};
