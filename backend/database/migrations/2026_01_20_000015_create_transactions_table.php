<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('type'); // order_payment, wallet_topup, withdrawal, referral, etc.
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['success', 'pending', 'failed'])->default('pending');
            $table->text('description')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

