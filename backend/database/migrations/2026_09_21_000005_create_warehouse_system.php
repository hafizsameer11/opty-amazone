<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('type', ['eyeglasses', 'contact_lenses', 'contact_lens_solutions']);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('warehouse_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('sku')->unique();
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->decimal('price', 15, 2);
            $table->decimal('shipping_fee', 15, 2)->default(0);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('low_stock_threshold')->default(10);
            // Eyeglass stock information. Contact lens/solution attributes are
            // held in `details`; prescription values are intentionally absent.
            $table->string('color')->nullable();
            $table->string('temple_size')->nullable();
            $table->string('lens_size')->nullable();
            $table->string('bridge_size')->nullable();
            $table->json('details')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['warehouse_category_id', 'is_active']);
            $table->index(['stock_quantity', 'is_active']);
        });

        Schema::create('warehouse_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->unique()->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('warehouse_cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->timestamps();
            $table->unique(['warehouse_cart_id', 'warehouse_product_id']);
        });

        Schema::create('warehouse_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('idempotency_key', 120)->nullable()->unique();
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
            $table->index(['seller_id', 'status']);
            $table->index(['status', 'created_at']);
        });

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

        DB::table('warehouse_categories')->insert([
            ['name' => 'Eyeglasses', 'slug' => 'eyeglasses', 'type' => 'eyeglasses', 'sort_order' => 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Contact Lenses', 'slug' => 'contact-lenses', 'type' => 'contact_lenses', 'sort_order' => 2, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Contact Lens Solutions', 'slug' => 'contact-lens-solutions', 'type' => 'contact_lens_solutions', 'sort_order' => 3, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
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
