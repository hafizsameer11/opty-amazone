<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('admin_store_chat_conversations')) {
            Schema::create('admin_store_chat_conversations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('admin_unread_count')->default(0);
                $table->unsignedInteger('seller_unread_count')->default(0);
                $table->timestamp('last_message_at')->nullable();
                $table->string('last_message_preview', 255)->nullable();
                $table->timestamps();

                $table->unique('store_id');
            });
        }

        if (!Schema::hasTable('admin_store_chat_messages')) {
            Schema::create('admin_store_chat_messages', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('admin_store_chat_conversation_id');
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->string('sender_role', 16); // admin|seller
                $table->text('body')->nullable();
                $table->string('attachment_path')->nullable();
                $table->string('attachment_type', 16)->nullable();
                $table->string('attachment_name')->nullable();
                $table->timestamps();

                $table->foreign('admin_store_chat_conversation_id', 'asc_msgs_conv_fk')
                    ->references('id')
                    ->on('admin_store_chat_conversations')
                    ->cascadeOnDelete();
                $table->index(['admin_store_chat_conversation_id', 'id'], 'asc_msgs_conv_id_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_store_chat_messages');
        Schema::dropIfExists('admin_store_chat_conversations');
    }
};
