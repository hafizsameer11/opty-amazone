<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL DDL is not transactional. If an earlier deployment failed
        // after creating a table but before Laravel recorded the migration,
        // resume the incomplete migration instead of failing on that table.
        if (! Schema::hasTable('warehouse_categories')) {
            Schema::create('warehouse_categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                // Use concise explicit index names: MySQL permits at most 64
                // characters for an identifier, while Laravel's generated
                // names can exceed that limit for warehouse_* tables.
                $table->string('slug')->unique('wh_cat_slug_uq');
                $table->enum('type', ['eyeglasses', 'contact_lenses', 'contact_lens_solutions']);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('warehouse_products')) {
            Schema::create('warehouse_products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouse_category_id')->constrained()->restrictOnDelete();
                $table->string('name');
                $table->string('sku')->unique('wh_product_sku_uq');
                $table->text('description')->nullable();
                $table->string('image_path')->nullable();
                $table->decimal('price', 15, 2);
                $table->decimal('shipping_fee', 15, 2)->default(0);
                $table->unsignedInteger('stock_quantity')->default(0);
                $table->unsignedInteger('low_stock_threshold')->default(10);
                // Eyeglass stock information. Contact lens/solution attributes
                // are held in `details`; prescription values are absent.
                $table->string('color')->nullable();
                $table->string('temple_size')->nullable();
                $table->string('lens_size')->nullable();
                $table->string('bridge_size')->nullable();
                $table->json('details')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
                $table->index(['warehouse_category_id', 'is_active'], 'wh_product_category_active_ix');
                $table->index(['stock_quantity', 'is_active'], 'wh_product_stock_active_ix');
            });
        }

        if (! Schema::hasTable('warehouse_carts')) {
            Schema::create('warehouse_carts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seller_id')->unique('wh_cart_seller_uq')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('warehouse_cart_items')) {
            Schema::create('warehouse_cart_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouse_cart_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_product_id')->constrained()->restrictOnDelete();
                $table->unsignedInteger('quantity');
                $table->timestamps();
                $table->unique(['warehouse_cart_id', 'warehouse_product_id'], 'wh_cart_item_cart_product_uq');
            });
        } elseif (! Schema::hasIndex('warehouse_cart_items', ['warehouse_cart_id', 'warehouse_product_id'], 'unique')) {
            // The first MySQL attempt can leave this table behind without its
            // final unique index, because that generated identifier was too
            // long. Add the short replacement before continuing.
            Schema::table('warehouse_cart_items', function (Blueprint $table) {
                $table->unique(['warehouse_cart_id', 'warehouse_product_id'], 'wh_cart_item_cart_product_uq');
            });
        }

        if (! Schema::hasTable('warehouse_orders')) {
            Schema::create('warehouse_orders', function (Blueprint $table) {
                $table->id();
                $table->string('order_number')->unique('wh_order_number_uq');
                $table->string('idempotency_key', 120)->nullable()->unique('wh_order_idempotency_uq');
                $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->enum('status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])->default('pending');
                $table->enum('payment_status', ['paid', 'refunded'])->default('paid');
                $table->decimal('subtotal', 15, 2);
                $table->decimal('shipping_fee', 15, 2)->default(0);
                $table->decimal('total', 15, 2);
                $table->foreignId('seller_wallet_entry_id')->nullable()->constrained()->nullOnDelete();
                $table->string('tracking_number')->nullable();
                $table->string('shipping_carrier')->nullable();
                $table->text('shipping_notes')->nullable();
                $table->json('shipping_address')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamps();
                $table->index(['seller_id', 'status'], 'wh_order_seller_status_ix');
                $table->index(['status', 'created_at'], 'wh_order_status_created_ix');
            });
        }

        if (! Schema::hasTable('warehouse_order_items')) {
            Schema::create('warehouse_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouse_order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('warehouse_product_id')->nullable()->constrained()->nullOnDelete();
                $table->string('product_name');
                $table->string('sku');
                $table->string('image_path')->nullable();
                $table->decimal('unit_price', 15, 2);
                $table->unsignedInteger('quantity');
                $table->decimal('line_total', 15, 2);
                $table->json('product_snapshot')->nullable();
                $table->timestamps();
            });
        }

        foreach ([
            ['name' => 'Eyeglasses', 'slug' => 'eyeglasses', 'type' => 'eyeglasses', 'sort_order' => 1],
            ['name' => 'Contact Lenses', 'slug' => 'contact-lenses', 'type' => 'contact_lenses', 'sort_order' => 2],
            ['name' => 'Contact Lens Solutions', 'slug' => 'contact-lens-solutions', 'type' => 'contact_lens_solutions', 'sort_order' => 3],
        ] as $category) {
            DB::table('warehouse_categories')->updateOrInsert(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_order_items');
        Schema::dropIfExists('warehouse_orders');
        Schema::dropIfExists('warehouse_cart_items');
        Schema::dropIfExists('warehouse_carts');
        Schema::dropIfExists('warehouse_products');
        Schema::dropIfExists('warehouse_categories');
    }
};
