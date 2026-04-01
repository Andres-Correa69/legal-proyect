<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->string('type', 10)->default('ticket')->after('id'); // 'chat' or 'ticket'
            $table->string('ticket_number')->nullable()->change();
            $table->string('subject', 255)->nullable()->change();
            $table->text('description')->nullable()->change();

            $table->index(['type', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('support_conversations', function (Blueprint $table) {
            $table->dropIndex(['type', 'user_id']);
            $table->dropColumn('type');
            $table->string('ticket_number')->nullable(false)->change();
            $table->string('subject', 255)->nullable(false)->change();
            $table->text('description')->nullable(false)->change();
        });
    }
};
