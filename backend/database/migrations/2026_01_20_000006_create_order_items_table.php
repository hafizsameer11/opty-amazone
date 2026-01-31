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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(1);
            $table->decimal('price', 10, 2);
            $table->decimal('line_total', 10, 2);
            $table->string('product_name'); // Snapshot at time of order
            $table->string('product_sku'); // Snapshot
            $table->json('product_variant')->nullable(); // Snapshot
            $table->json('lens_configuration')->nullable(); // Snapshot
            $table->json('prescription_data')->nullable(); // Snapshot
            $table->json('product_images')->nullable(); // Snapshot
            $table->timestamps();
            
            $table->index('store_order_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};

