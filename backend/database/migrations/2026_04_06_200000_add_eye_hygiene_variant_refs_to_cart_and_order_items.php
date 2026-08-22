<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            if (!Schema::hasColumn('cart_items', 'product_size_volume_id')) {
                $table->foreignId('product_size_volume_id')
                    ->nullable()
                    ->after('variant_id')
                    ->constrained('product_size_volumes')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('cart_items', 'eye_hygiene_variant_id')) {
                $table->foreignId('eye_hygiene_variant_id')
                    ->nullable()
                    ->after('product_size_volume_id')
                    ->constrained('eye_hygiene_variants')
                    ->nullOnDelete();
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'product_size_volume_id')) {
                $table->foreignId('product_size_volume_id')
                    ->nullable()
                    ->after('variant_id')
                    ->constrained('product_size_volumes')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('order_items', 'eye_hygiene_variant_id')) {
                $table->foreignId('eye_hygiene_variant_id')
                    ->nullable()
                    ->after('product_size_volume_id')
                    ->constrained('eye_hygiene_variants')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            if (Schema::hasColumn('cart_items', 'eye_hygiene_variant_id')) {
                $table->dropForeign(['eye_hygiene_variant_id']);
                $table->dropColumn('eye_hygiene_variant_id');
            }
            if (Schema::hasColumn('cart_items', 'product_size_volume_id')) {
                $table->dropForeign(['product_size_volume_id']);
                $table->dropColumn('product_size_volume_id');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'eye_hygiene_variant_id')) {
                $table->dropForeign(['eye_hygiene_variant_id']);
                $table->dropColumn('eye_hygiene_variant_id');
            }
            if (Schema::hasColumn('order_items', 'product_size_volume_id')) {
                $table->dropForeign(['product_size_volume_id']);
                $table->dropColumn('product_size_volume_id');
            }
        });
    }
};
