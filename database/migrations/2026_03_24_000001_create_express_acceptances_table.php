<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('express_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_purchase_id')->unique()->constrained()->onDelete('cascade');
            $table->foreignId('receipt_acknowledgment_id')->constrained()->onDelete('cascade');
            $table->string('uuid_reference')->nullable();
            $table->string('number')->nullable();
            $table->string('uuid')->nullable();
            $table->timestamp('issue_date')->nullable();
            $table->string('status_description')->nullable();
            $table->text('status_message')->nullable();
            $table->string('qr_link')->nullable();
            $table->longText('xml_base64_bytes')->nullable();
            $table->longText('pdf_base64_bytes')->nullable();
            $table->json('payload')->nullable();
            $table->json('request_payload')->nullable();
            $table->string('email_status')->nullable();
            $table->integer('email_retry_count')->default(0);
            $table->timestamps();
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->string('ei_ea_prefix')->nullable()->after('ei_rb_current_consecutive');
            $table->integer('ei_ea_consecutive_start')->nullable()->after('ei_ea_prefix');
            $table->integer('ei_ea_consecutive_end')->nullable()->after('ei_ea_consecutive_start');
            $table->integer('ei_ea_current_consecutive')->nullable()->after('ei_ea_consecutive_end');
            $table->json('ei_saved_person')->nullable()->after('ei_ea_current_consecutive');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('express_acceptances');

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'ei_ea_prefix',
                'ei_ea_consecutive_start',
                'ei_ea_consecutive_end',
                'ei_ea_current_consecutive',
                'ei_saved_person',
            ]);
        });
    }
};
