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
        Schema::create('store_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->enum('status', [
                'pending',
                'accepted',
                'rejected',
                'paid',
                'processing',
                'out_for_delivery',
                'delivered',
                'cancelled'
            ])->default('pending');
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('delivery_code', 6)->nullable(); // OTP code for delivery verification
            $table->date('estimated_delivery_date')->nullable();
            $table->string('delivery_method')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('delivery_address_id')->nullable()->constrained('user_addresses')->onDelete('set null');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('out_for_delivery_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
            
            $table->index(['store_id', 'status']);
            $table->index(['order_id', 'status']);
            $table->index('delivery_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_orders');
    }
};

