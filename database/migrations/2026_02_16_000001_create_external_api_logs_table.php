<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('external_api_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('api_client_id')->constrained('api_clients')->onDelete('cascade');
            $table->string('api_client_name');
            $table->string('method', 10);
            $table->string('endpoint');
            $table->string('action');
            $table->string('action_label');
            $table->string('company_name')->nullable();
            $table->string('company_nit')->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_email')->nullable();
            $table->json('request_payload')->nullable();
            $table->integer('response_status');
            $table->boolean('response_success');
            $table->string('response_summary')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->timestamps();

            $table->index('api_client_id');
            $table->index('action');
            $table->index('response_success');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_api_logs');
    }
};
