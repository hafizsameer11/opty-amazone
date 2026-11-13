<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vista360_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('display_details')->nullable();
            $table->timestamps();
        });

        Schema::create('vista360_plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vista360_plan_id')->constrained('vista360_plans')->cascadeOnDelete();
            $table->unsignedTinyInteger('duration_months');
            $table->unsignedInteger('amount_cents');
            $table->char('currency', 3)->default('EUR');
            $table->unsignedInteger('version')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamp('available_from')->nullable();
            $table->timestamp('available_until')->nullable();
            $table->timestamps();

            $table->unique(['vista360_plan_id', 'duration_months', 'version'], 'vista360_price_version_unique');
            $table->index(['vista360_plan_id', 'duration_months', 'is_active'], 'vista360_price_lookup');
        });

        Schema::create('vista360_plan_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vista360_plan_id')->constrained('vista360_plans')->cascadeOnDelete();
            $table->string('feature_key', 120);
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->json('value')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['vista360_plan_id', 'feature_key'], 'vista360_feature_plan_unique');
            $table->index(['vista360_plan_id', 'is_active'], 'vista360_feature_lookup');
        });

        Schema::create('vista360_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('vista360_plan_id')->nullable()->constrained('vista360_plans')->nullOnDelete();
            $table->string('status', 32)->default('pending');
            $table->string('source', 32)->default('stripe');
            $table->json('plan_snapshot');
            $table->json('features_snapshot');
            $table->json('price_snapshot');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('suspended_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->string('status_reason', 1000)->nullable();
            $table->unsignedBigInteger('entitlement_version')->default(1);
            $table->timestamps();

            $table->index(['seller_id', 'store_id', 'status'], 'vista360_subscription_owner_status');
            $table->index(['status', 'expires_at'], 'vista360_subscription_expiry');
        });

        Schema::create('vista360_subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vista360_subscription_id')->constrained('vista360_subscriptions')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('vista360_plan_price_id')->nullable()->constrained('vista360_plan_prices')->nullOnDelete();
            $table->string('provider', 40)->default('stripe');
            $table->string('provider_session_id', 255)->nullable()->unique();
            $table->string('provider_payment_id', 255)->nullable()->unique();
            $table->string('status', 32)->default('pending');
            $table->unsignedInteger('amount_cents');
            $table->char('currency', 3)->default('EUR');
            $table->string('idempotency_key', 120)->unique();
            $table->json('provider_payload')->nullable();
            $table->string('failure_code', 100)->nullable();
            $table->text('failure_message')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'store_id', 'status'], 'vista360_payment_owner_status');
        });

        Schema::create('vista360_subscription_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vista360_subscription_id')->nullable()->constrained('vista360_subscriptions')->nullOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('event', 100);
            $table->string('external_event_id', 255)->nullable()->unique();
            $table->json('data')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['vista360_subscription_id', 'occurred_at'], 'vista360_event_subscription_time');
            $table->index(['seller_id', 'store_id', 'occurred_at'], 'vista360_event_owner_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vista360_subscription_events');
        Schema::dropIfExists('vista360_subscription_payments');
        Schema::dropIfExists('vista360_subscriptions');
        Schema::dropIfExists('vista360_plan_features');
        Schema::dropIfExists('vista360_plan_prices');
        Schema::dropIfExists('vista360_plans');
    }
};
