<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The existing buyer visibility scope already requires this field, but some
        // installations have no migration for it. Advertising must respect mute state.
        if (! Schema::hasColumn('products', 'is_muted')) {
            Schema::table('products', fn (Blueprint $t) => $t->boolean('is_muted')->default(false));
        }
        Schema::create('ad_campaigns', function (Blueprint $t) {
            $t->id();
            // Restrict hard deletes: financial history must survive soft deletion.
            $t->foreignId('seller_id')->constrained('users')->restrictOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->string('name', 120);
            $t->string('status', 32)->default('pending_payment');
            $t->string('payment_status', 32)->default('unpaid');
            $t->string('payment_method')->default('wallet');
            $t->string('currency', 3)->default('EUR');
            $t->dateTime('starts_at');
            $t->dateTime('ends_at');
            $t->string('budget_type', 10);
            $t->unsignedBigInteger('budget_amount_cents');
            $t->unsignedBigInteger('budget_cents');
            $t->string('bid_type', 3)->default('cpc');
            $t->unsignedBigInteger('bid_cents');
            $t->json('locations');
            $t->json('placements');
            $t->unsignedBigInteger('reserved_cents')->default(0);
            $t->unsignedBigInteger('ad_credit_cents')->default(0);
            $t->unsignedBigInteger('shopping_cents')->default(0);
            $t->unsignedBigInteger('spent_cents')->default(0);
            $t->unsignedBigInteger('released_cents')->default(0);
            $t->unsignedBigInteger('remaining_cents')->default(0);
            $t->unsignedBigInteger('impressions')->default(0);
            $t->unsignedBigInteger('unique_impressions')->default(0);
            $t->unsignedBigInteger('clicks')->default(0);
            $t->unsignedBigInteger('product_views')->default(0);
            $t->unsignedBigInteger('add_to_carts')->default(0);
            $t->unsignedBigInteger('conversions')->default(0);
            $t->unsignedBigInteger('revenue_cents')->default(0);
            $t->dateTime('paid_at')->nullable();
            $t->dateTime('approved_at')->nullable();
            $t->text('rejection_reason')->nullable();
            $t->string('pause_source')->nullable();
            $t->string('idempotency_key', 64);
            $t->string('request_hash', 64);
            $t->unsignedBigInteger('legacy_product_id')->nullable()->unique();
            $t->json('legacy_snapshot')->nullable();
            $t->timestamps();
            $t->unique(['seller_id', 'idempotency_key']);
            $t->index(['status', 'payment_status', 'starts_at', 'ends_at'], 'ad_delivery_eligibility');
            $t->index(['product_id', 'status']);
        });
        Schema::create('ad_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ad_campaign_id')->constrained()->restrictOnDelete();
            $t->string('type', 24);
            $t->string('event_key', 64)->unique();
            $t->string('delivery_id', 36)->nullable()->index();
            $t->string('visitor_hash', 64)->index();
            $t->unsignedBigInteger('user_id')->nullable()->index();
            $t->string('placement', 32);
            $t->string('location', 16);
            $t->unsignedBigInteger('cost_cents')->default(0);
            $t->bigInteger('revenue_cents')->default(0);
            $t->boolean('is_unique')->default(false);
            $t->unsignedBigInteger('order_item_id')->nullable()->index();
            $t->dateTime('occurred_at')->index();
            $t->index(['ad_campaign_id', 'type', 'occurred_at']);
        });
        Schema::create('ad_budget_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ad_campaign_id')->constrained()->restrictOnDelete();
            $t->string('type', 24);
            $t->string('idempotency_key', 100)->unique();
            $t->unsignedBigInteger('amount_cents');
            $t->unsignedBigInteger('balance_after_cents');
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->json('metadata')->nullable();
            $t->dateTime('created_at');
            $t->index(['ad_campaign_id', 'type']);
        });
        Schema::create('ad_audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ad_campaign_id')->constrained()->restrictOnDelete();
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->string('action');
            $t->string('from_status')->nullable();
            $t->string('to_status');
            $t->text('reason')->nullable();
            $t->json('metadata')->nullable();
            $t->dateTime('created_at');
        });
        Schema::create('ad_daily_metrics', function (Blueprint $t) {
            $t->id();
            $t->foreignId('ad_campaign_id')->constrained()->restrictOnDelete();
            $t->date('day');
            $t->string('placement', 32);
            $t->string('location', 16);
            foreach (['impressions', 'unique_impressions', 'clicks', 'product_views', 'add_to_carts', 'spent_cents'] as $field) {
                $t->unsignedBigInteger($field)->default(0);
            }
            $t->bigInteger('conversions')->default(0);
            $t->bigInteger('revenue_cents')->default(0);
            $t->unique(['ad_campaign_id', 'day', 'placement', 'location'], 'ad_daily_dimensions');
        });
        Schema::table('transactions', function (Blueprint $t) {
            $t->string('payment_reference')->nullable()->unique();
        });
    }

    public function down(): void
    {
        // Explicit rollback only; never drops the legacy product fields.
        Schema::table('transactions', fn (Blueprint $t) => $t->dropColumn('payment_reference'));
        foreach (['ad_daily_metrics', 'ad_audit_logs', 'ad_budget_transactions', 'ad_events', 'ad_campaigns'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
