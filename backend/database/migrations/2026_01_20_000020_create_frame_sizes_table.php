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
        Schema::create('frame_sizes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->decimal('lens_width', 5, 2);
            $table->decimal('bridge_width', 5, 2);
            $table->decimal('temple_length', 5, 2);
            $table->decimal('frame_width', 5, 2)->nullable();
            $table->decimal('frame_height', 5, 2)->nullable();
            $table->string('size_label', 50)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->enum('stock_status', ['in_stock', 'out_of_stock', 'backorder'])->default('in_stock');
            $table->timestamps();
            
            $table->index('product_id');
            $table->index(['product_id', 'stock_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('frame_sizes');
    }
};

