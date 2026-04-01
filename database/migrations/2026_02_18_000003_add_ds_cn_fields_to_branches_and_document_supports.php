<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add DS Credit Note numbering fields to branches
        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_ds_cn_prefix')->nullable()->after('ei_ds_date_to');
            $table->string('ei_ds_cn_resolution')->nullable()->after('ei_ds_cn_prefix');
            $table->date('ei_ds_cn_resolution_date')->nullable()->after('ei_ds_cn_resolution');
            $table->integer('ei_ds_cn_consecutive_start')->nullable()->after('ei_ds_cn_resolution_date');
            $table->integer('ei_ds_cn_consecutive_end')->nullable()->after('ei_ds_cn_consecutive_start');
            $table->integer('ei_ds_cn_current_consecutive')->nullable()->after('ei_ds_cn_consecutive_end');
            $table->date('ei_ds_cn_date_from')->nullable()->after('ei_ds_cn_current_consecutive');
            $table->date('ei_ds_cn_date_to')->nullable()->after('ei_ds_cn_date_from');
        });

        // Add anulation fields to document_supports
        Schema::table('document_supports', function (Blueprint $table) {
            $table->boolean('voided')->default(false)->after('request_payload');
            $table->string('void_uuid')->nullable()->after('voided');
            $table->string('void_number')->nullable()->after('void_uuid');
            $table->date('void_date')->nullable()->after('void_number');
            $table->longText('void_pdf_base64_bytes')->nullable()->after('void_date');
            $table->json('void_payload')->nullable()->after('void_pdf_base64_bytes');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_ds_cn_prefix',
                'ei_ds_cn_resolution',
                'ei_ds_cn_resolution_date',
                'ei_ds_cn_consecutive_start',
                'ei_ds_cn_consecutive_end',
                'ei_ds_cn_current_consecutive',
                'ei_ds_cn_date_from',
                'ei_ds_cn_date_to',
            ]);
        });

        Schema::table('document_supports', function (Blueprint $table) {
            $table->dropColumn([
                'voided',
                'void_uuid',
                'void_number',
                'void_date',
                'void_pdf_base64_bytes',
                'void_payload',
            ]);
        });
    }
};
