<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('support_conversations')->onDelete('cascade');
            $table->enum('sender_type', ['client', 'admin']);
            $table->unsignedBigInteger('sender_id');
            $table->string('sender_name');
            $table->text('body');
            $table->enum('type', ['text', 'system'])->default('text');
            $table->string('attachment_url')->nullable();
            $table->string('attachment_name')->nullable();
            $table->enum('attachment_type', ['image', 'video', 'audio', 'document'])->nullable();
            $table->unsignedInteger('attachment_size')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
