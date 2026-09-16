<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->string('code', 48)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('referral_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->restrictOnDelete();
            $table->foreignId('seller_id')->constrained('users')->restrictOnDelete();
            $table->string('name', 120);
            $table->string('identifier', 80)->unique();
            $table->string('scope_type', 24); // store, products, categories, mixed
            $table->string('status', 24)->default('pending_approval');
            $table->string('approval_status', 24)->default('pending');
            // Immediate campaigns start as soon as approval is granted. Scheduled
            // campaigns remain scheduled until their explicit start time.
            $table->string('activation_mode', 16)->default('immediate');
            $table->foreignId('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->dateTime('approved_at')->nullable();
            $table->string('reward_type', 16); // fixed, percentage
            $table->decimal('reward_amount', 15, 2);
            $table->decimal('max_reward_per_order', 15, 2)->nullable();
            $table->decimal('budget_amount', 15, 2);
            $table->decimal('budget_reserved', 15, 2)->default(0);
            $table->decimal('budget_spent', 15, 2)->default(0);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('monthly_reward_limit')->nullable();
            $table->unsignedInteger('per_buyer_limit')->nullable();
            $table->decimal('minimum_order_amount', 15, 2)->default(0);
            $table->unsignedInteger('minimum_quantity')->default(1);
            $table->boolean('new_customer_only')->default(true);
            $table->string('platform_stacking', 24)->default('exclusive'); // exclusive, allow_platform
            // DATETIME avoids legacy MySQL's implicit/default TIMESTAMP limits.
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status', 'starts_at', 'ends_at'], 'referral_campaign_eligibility');
        });

        Schema::create('referral_campaign_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_campaign_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['referral_campaign_id', 'product_id'], 'ref_campaign_product_unique');
        });

        Schema::create('referral_campaign_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_campaign_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['referral_campaign_id', 'category_id'], 'ref_campaign_category_unique');
        });

        Schema::create('referral_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_code_id')->constrained()->restrictOnDelete();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referral_campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('attribution_token', 64)->unique();
            $table->string('ip_hash', 64)->nullable()->index();
            $table->string('device_hash', 64)->nullable()->index();
            $table->dateTime('clicked_at');
            $table->timestamps();
            $table->index(['referral_campaign_id', 'clicked_at']);
        });

        Schema::create('referral_attributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_click_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('referral_code_id')->constrained()->restrictOnDelete();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referral_campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('referred_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('token', 64)->unique();
            $table->dateTime('expires_at');
            $table->dateTime('claimed_at')->nullable();
            $table->timestamps();
            $table->index(['referred_user_id', 'expires_at']);
            $table->index(['referral_campaign_id', 'referred_user_id'], 'ref_attr_campaign_user_idx');
        });

        Schema::create('referral_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referred_user_id')->unique()->constrained('users')->restrictOnDelete();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referral_code_id')->constrained()->restrictOnDelete();
            $table->foreignId('initial_attribution_id')->nullable()->constrained('referral_attributions')->restrictOnDelete();
            $table->foreignId('initial_campaign_id')->nullable()->constrained('referral_campaigns')->restrictOnDelete();
            $table->dateTime('registered_at');
            $table->dateTime('first_qualifying_order_at')->nullable();
            $table->timestamps();
        });

        Schema::create('referral_rewards', function (Blueprint $table) {
            $table->id();
            $table->string('idempotency_key', 150)->unique();
            $table->string('source', 24); // platform, seller_campaign
            $table->string('status', 24)->default('pending');
            $table->foreignId('referral_conversion_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('referral_attribution_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('referral_campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('referrer_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('referred_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('store_order_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('buyer_transaction_id')->nullable()->constrained('transactions')->restrictOnDelete();
            $table->foreignId('seller_wallet_entry_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('platform_ledger_entry_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('reward_type', 16);
            $table->decimal('reward_value', 15, 2);
            $table->decimal('eligible_subtotal', 15, 2);
            $table->unsignedInteger('eligible_quantity')->default(0);
            $table->decimal('amount', 15, 2);
            $table->dateTime('qualifies_at')->nullable();
            $table->dateTime('qualified_at')->nullable();
            $table->dateTime('rewarded_at')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('suspended_at')->nullable();
            $table->dateTime('reversed_at')->nullable();
            $table->text('reason')->nullable();
            $table->json('risk_flags')->nullable();
            $table->json('terms_snapshot')->nullable();
            $table->timestamps();
            $table->index(['status', 'qualifies_at']);
            $table->index(['referral_campaign_id', 'status']);
            $table->index(['referrer_user_id', 'status']);
            $table->index(['referred_user_id', 'status']);
        });

        Schema::create('referral_reward_reversals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_reward_id')->unique()->constrained()->restrictOnDelete();
            $table->string('idempotency_key', 150)->unique();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('buyer_transaction_id')->nullable()->constrained('transactions')->restrictOnDelete();
            $table->foreignId('seller_wallet_entry_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('platform_ledger_entry_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->text('reason');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('referral_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('referral_reward_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('action', 64);
            $table->text('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['referral_campaign_id', 'created_at']);
            $table->index(['referral_reward_id', 'created_at']);
        });

        // New buyers receive a code from User's created hook. Backfill existing
        // buyers once so every buyer has a permanent platform referral code.
        DB::table('users')->where('role', 'buyer')->orderBy('id')->select('id')->each(function (object $buyer): void {
            do {
                $code = 'BUYER'.strtoupper(base_convert((string) $buyer->id, 10, 36)).strtoupper(Str::random(6));
            } while (DB::table('referral_codes')->where('code', $code)->exists());
            DB::table('referral_codes')->insert(['user_id' => $buyer->id, 'code' => $code, 'is_active' => true,
                'created_at' => now(), 'updated_at' => now()]);
        });
    }

    public function down(): void
    {
        foreach (['referral_audit_logs', 'referral_reward_reversals', 'referral_rewards', 'referral_conversions', 'referral_attributions', 'referral_clicks', 'referral_campaign_categories', 'referral_campaign_products', 'referral_campaigns', 'referral_codes'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
