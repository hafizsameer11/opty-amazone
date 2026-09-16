<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_no', 32)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('user_role', 20);
            $table->string('subject', 180);
            $table->string('category', 40);
            $table->text('description');
            $table->string('priority', 20)->default('normal');
            $table->string('status', 30)->default('open');
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assigned_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'user_role', 'status']);
            $table->index(['status', 'priority']);
        });

        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('sender_role', 20);
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->string('attachment_type', 20)->nullable();
            $table->string('attachment_name')->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();
            $table->index(['support_ticket_id', 'created_at']);
        });

        Schema::create('support_ticket_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('support_ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->string('event', 50);
            $table->text('details')->nullable();
            $table->timestamps();
            $table->index(['support_ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_ticket_events');
        Schema::dropIfExists('support_messages');
        Schema::dropIfExists('support_tickets');
    }
};
