<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('discount_campaigns', function (Blueprint $t) {
            $t->id(); $t->foreignId('store_id')->constrained(); $t->foreignId('creator_id')->nullable()->constrained('users');
            $t->string('name'); $t->text('description')->nullable(); $t->string('scope');
            $t->string('discount_type'); $t->decimal('discount_value', 12, 2);
            $t->string('status')->default('draft')->index(); $t->dateTime('starts_at'); $t->dateTime('ends_at');
            $t->decimal('minimum_order_amount', 12, 2)->default(0); $t->unsignedInteger('minimum_quantity')->default(1);
            $t->decimal('maximum_discount', 12, 2)->nullable(); $t->unsignedInteger('usage_limit')->nullable();
            $t->unsignedInteger('per_buyer_limit')->nullable(); $t->unsignedInteger('usage_count')->default(0);
            $t->integer('priority')->default(0); $t->boolean('stacking')->default(false);
            $t->unsignedBigInteger('legacy_promotion_id')->nullable()->unique(); $t->json('legacy_snapshot')->nullable();
            $t->text('review_reason')->nullable(); $t->timestamps(); $t->index(['store_id', 'status', 'starts_at', 'ends_at'], 'discount_delivery');
        });
        Schema::create('discount_campaign_products', function (Blueprint $t) {
            $t->id(); $t->foreignId('discount_campaign_id')->constrained(); $t->foreignId('product_id')->constrained();
            $t->unique(['discount_campaign_id', 'product_id'], 'discount_product_unique');
        });
        Schema::create('discount_campaign_variants', function (Blueprint $t) {
            $t->id(); $t->foreignId('discount_campaign_id')->constrained(); $t->foreignId('product_id')->constrained();
            $t->string('variant_type'); $t->unsignedBigInteger('variant_id');
            $t->unique(['discount_campaign_id', 'variant_type', 'variant_id'], 'discount_variant_unique');
        });
        Schema::create('discount_campaign_categories', function (Blueprint $t) {
            $t->id(); $t->foreignId('discount_campaign_id')->constrained(); $t->foreignId('category_id')->constrained();
            $t->unique(['discount_campaign_id', 'category_id'], 'discount_category_unique');
        });
        Schema::create('discount_campaign_usages', function (Blueprint $t) {
            $t->id(); $t->foreignId('discount_campaign_id')->constrained(); $t->foreignId('order_id')->constrained();
            $t->foreignId('user_id')->constrained(); $t->unsignedInteger('units');
            $t->decimal('revenue', 12, 2); $t->decimal('discount_amount', 12, 2); $t->timestamps();
            $t->unique(['discount_campaign_id', 'order_id'], 'discount_usage_order_unique'); $t->index(['discount_campaign_id', 'user_id']);
        });
        foreach (['cart_items', 'order_items'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->decimal('original_price', 12, 2)->nullable(); $t->decimal('campaign_discount_amount', 12, 2)->default(0);
                $t->json('campaign_pricing')->nullable();
            });
        }
        Schema::create('banner_campaigns', function (Blueprint $t) {
            $t->id(); $t->foreignId('store_id')->constrained(); $t->foreignId('creator_id')->nullable()->constrained('users');
            $t->string('name'); $t->string('type')->default('organic'); $t->string('status')->default('draft')->index();
            $t->string('approval_status')->default('pending')->index(); $t->text('rejection_reason')->nullable();
            $t->dateTime('starts_at'); $t->dateTime('ends_at'); $t->string('placement')->index();
            $t->json('targeting')->nullable(); $t->string('destination_type'); $t->unsignedBigInteger('destination_id')->nullable();
            $t->text('destination_url')->nullable(); $t->integer('priority')->default(0); $t->unsignedInteger('revision')->default(1);
            $t->unsignedBigInteger('legacy_banner_id')->nullable()->unique(); $t->json('legacy_snapshot')->nullable();
            $t->json('paid_settings')->nullable(); $t->timestamps(); $t->softDeletes();
        });
        Schema::create('banner_creatives', function (Blueprint $t) {
            $t->id(); $t->foreignId('banner_campaign_id')->constrained(); $t->text('desktop_image'); $t->text('mobile_image')->nullable();
            $t->string('title'); $t->text('description')->nullable(); $t->string('alt_text'); $t->string('cta_text')->default('Explore');
            $t->integer('sort_order')->default(0); $t->boolean('is_active')->default(true); $t->timestamps();
        });
        Schema::create('banner_events', function (Blueprint $t) {
            $t->id(); $t->foreignId('banner_campaign_id')->constrained(); $t->foreignId('banner_creative_id')->constrained();
            $t->string('type'); $t->string('visitor_hash', 64); $t->string('nonce', 64); $t->unsignedBigInteger('user_id')->nullable();
            $t->unsignedBigInteger('store_order_id')->nullable(); $t->decimal('revenue', 12, 2)->default(0); $t->timestamps();
            $t->unique(['nonce', 'type'], 'banner_event_replay'); $t->unique(['store_order_id'], 'banner_conversion_once');
            $t->index(['banner_campaign_id', 'type', 'created_at'], 'banner_analytics'); $t->index(['user_id', 'type', 'created_at'], 'banner_attribution');
        });
        Schema::create('commerce_campaign_audits', function (Blueprint $t) {
            $t->id(); $t->string('campaign_type'); $t->unsignedBigInteger('campaign_id'); $t->unsignedBigInteger('actor_id')->nullable();
            $t->string('action'); $t->json('snapshot'); $t->text('reason')->nullable(); $t->timestamps();
            $t->index(['campaign_type', 'campaign_id'], 'commerce_audit_campaign');
        });
        Schema::create('commerce_campaign_analytics', function (Blueprint $t) {
            $t->id(); $t->string('campaign_type'); $t->unsignedBigInteger('campaign_id'); $t->json('metrics'); $t->timestamps();
            $t->unique(['campaign_type', 'campaign_id'], 'commerce_analytics_unique');
        });
    }

    public function down(): void
    {
        // Deliberately preserve campaign history and order price snapshots on rollback.
        // Roll forward with a corrective migration instead of deleting commerce data.
    }
};
