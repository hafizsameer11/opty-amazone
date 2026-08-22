<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('buyer_unread_count')->default(0);
            $table->unsignedInteger('seller_unread_count')->default(0);
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 255)->nullable();
            $table->timestamps();

            $table->unique(['store_id', 'buyer_id']);
        });

        Schema::create('store_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_chat_conversation_id')
                ->constrained('store_chat_conversations')
                ->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['store_chat_conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_chat_messages');
        Schema::dropIfExists('store_chat_conversations');
    }
};
