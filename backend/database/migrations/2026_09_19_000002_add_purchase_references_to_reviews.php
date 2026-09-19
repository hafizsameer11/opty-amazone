<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->foreignId('order_item_id')
                ->nullable()
                ->after('user_id')
                ->constrained('order_items')
                ->nullOnDelete();
            $table->unique('order_item_id');
        });

        Schema::table('store_reviews', function (Blueprint $table) {
            $table->foreignId('store_order_id')
                ->nullable()
                ->after('user_id')
                ->constrained('store_orders')
                ->nullOnDelete();
            $table->unique('store_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->dropUnique(['order_item_id']);
            $table->dropConstrainedForeignId('order_item_id');
        });

        Schema::table('store_reviews', function (Blueprint $table) {
            $table->dropUnique(['store_order_id']);
            $table->dropConstrainedForeignId('store_order_id');
        });
    }
};
