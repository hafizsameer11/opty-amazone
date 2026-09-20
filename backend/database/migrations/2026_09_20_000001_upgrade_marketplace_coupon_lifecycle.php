<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->string('scope', 20)->default('store')->after('discount_type');
            $table->string('status', 20)->default('active')->after('is_active');
            $table->boolean('is_public')->default(true)->after('status');
            $table->boolean('followers_only')->default(false)->after('is_public');
            $table->boolean('first_order_only')->default(false)->after('followers_only');
            $table->unsignedInteger('usage_count')->default(0)->after('usage_per_user');
            $table->unsignedInteger('reserved_count')->default(0)->after('usage_count');
            $table->timestamp('archived_at')->nullable()->after('ends_at');
            $table->timestamp('admin_disabled_at')->nullable()->after('archived_at');
            // Keep the upgrade additive on SQLite too. SQLite rebuilds a legacy
            // table when adding an FK and can lose pre-existing columns/data.
            $table->unsignedBigInteger('admin_disabled_by')->nullable()->after('admin_disabled_at');
            $table->json('rule_snapshot')->nullable()->after('conditions');
            $table->softDeletes();
            $table->index(['store_id', 'status', 'is_public']);
        });
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('coupons', function (Blueprint $table) {
                $table->foreign('admin_disabled_by')->references('id')->on('users')->nullOnDelete();
            });
        }

        Schema::create('coupon_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['coupon_id', 'product_id']);
        });

        Schema::create('coupon_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['coupon_id', 'category_id']);
        });

        Schema::create('coupon_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['coupon_id', 'product_variant_id']);
        });

        Schema::table('coupon_usages', function (Blueprint $table) {
            $table->unsignedBigInteger('store_order_id')->nullable()->after('order_id');
            $table->string('status', 20)->default('redeemed')->after('store_order_id');
            $table->string('reservation_key', 120)->nullable()->after('status');
            $table->string('idempotency_key', 120)->nullable()->after('reservation_key');
            $table->decimal('eligible_subtotal', 12, 2)->default(0)->after('order_total');
            $table->decimal('shipping_discount', 12, 2)->default(0)->after('eligible_subtotal');
            $table->json('snapshot')->nullable()->after('shipping_discount');
            $table->json('affected_items')->nullable()->after('snapshot');
            $table->timestamp('redeemed_at')->nullable()->after('affected_items');
            $table->timestamp('released_at')->nullable()->after('redeemed_at');
            $table->timestamp('refunded_at')->nullable()->after('released_at');
            $table->timestamp('expires_at')->nullable()->after('refunded_at');
            $table->index(['coupon_id', 'status']);
            $table->index(['user_id', 'coupon_id', 'status']);
            $table->index(['store_order_id', 'status']);
            $table->unique('reservation_key');
        });
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('coupon_usages', function (Blueprint $table) {
                $table->foreign('store_order_id')->references('id')->on('store_orders')->nullOnDelete();
            });
        }

        Schema::table('store_orders', function (Blueprint $table) {
            $table->string('coupon_code', 50)->nullable()->after('discount_total');
            $table->decimal('coupon_discount', 12, 2)->default(0)->after('coupon_code');
            $table->decimal('coupon_shipping_discount', 12, 2)->default(0)->after('coupon_discount');
            $table->json('coupon_snapshot')->nullable()->after('coupon_shipping_discount');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('checkout_key', 120)->nullable()->after('order_no');
            $table->unique(['user_id', 'checkout_key']);
        });

        Schema::create('coupon_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 50);
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->json('context')->nullable();
            $table->timestamps();
            $table->index(['coupon_id', 'created_at']);
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_audits');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'checkout_key']);
            $table->dropColumn('checkout_key');
        });
        Schema::table('store_orders', function (Blueprint $table) {
            $table->dropColumn(['coupon_code', 'coupon_discount', 'coupon_shipping_discount', 'coupon_snapshot']);
        });
        Schema::table('coupon_usages', function (Blueprint $table) {
            $table->dropUnique(['reservation_key']);
            $table->dropIndex(['coupon_id', 'status']);
            $table->dropIndex(['user_id', 'coupon_id', 'status']);
            $table->dropIndex(['store_order_id', 'status']);
            if (Schema::getConnection()->getDriverName() !== 'sqlite') $table->dropForeign(['store_order_id']);
            $table->dropColumn(['store_order_id', 'status', 'reservation_key', 'idempotency_key', 'eligible_subtotal', 'shipping_discount', 'snapshot', 'affected_items', 'redeemed_at', 'released_at', 'refunded_at', 'expires_at']);
        });
        Schema::dropIfExists('coupon_variants');
        Schema::dropIfExists('coupon_categories');
        Schema::dropIfExists('coupon_products');
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'status', 'is_public']);
            if (Schema::getConnection()->getDriverName() !== 'sqlite') $table->dropForeign(['admin_disabled_by']);
            $table->dropSoftDeletes();
            $table->dropColumn(['scope', 'status', 'is_public', 'followers_only', 'first_order_only', 'usage_count', 'reserved_count', 'archived_at', 'admin_disabled_at', 'admin_disabled_by', 'rule_snapshot']);
        });
    }
};
