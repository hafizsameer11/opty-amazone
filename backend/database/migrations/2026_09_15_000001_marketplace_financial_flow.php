<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Some installations have these legacy columns only through an SQL import.
        if (! Schema::hasColumn('products', 'shipping_type')) {
            Schema::table('products', fn (Blueprint $t) => $t->string('shipping_type')->default('free'));
        }
        if (! Schema::hasColumn('products', 'shipping_fee')) {
            Schema::table('products', fn (Blueprint $t) => $t->decimal('shipping_fee', 10, 2)->default(0));
        }
        // Do not silently discard duplicate historical liabilities.
        if (DB::table('escrows')->select('store_order_id')->groupBy('store_order_id')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Reconcile duplicate historical escrows before migrating.');
        }
        Schema::table('orders', function (Blueprint $t) {
            $t->string('payment_status', 32)->default('pending')->change();
            $t->json('delivery_address_snapshot')->nullable();
            $t->timestamp('rewards_awarded_at')->nullable();
        });
        Schema::table('store_orders', function (Blueprint $t) {
            $t->string('status', 32)->default('pending')->change();
            $t->string('payment_status', 32)->default('pending');
            $t->unsignedTinyInteger('financial_version')->default(0);
            $t->json('delivery_address_snapshot')->nullable();
            $t->decimal('discount_total', 10, 2)->default(0);
            $t->decimal('redeemed_points', 15, 2)->default(0);
            $t->decimal('reward_points', 15, 2)->default(0);
            $t->string('quote_key', 100)->nullable();
            $t->string('quote_fingerprint', 64)->nullable();
            $t->string('delivery_code_hash')->nullable();
            $t->text('delivery_code_encrypted')->nullable();
            $t->timestamp('delivery_code_expires_at')->nullable();
            $t->timestamp('delivery_code_issued_at')->nullable();
            $t->unsignedInteger('delivery_code_attempts')->default(0);
            $t->timestamp('delivery_code_locked_until')->nullable();
            $t->timestamp('delivery_verified_at')->nullable();
            $t->timestamp('inventory_restored_at')->nullable();
            $t->string('dispute_previous_status')->nullable();
            $t->text('dispute_reason')->nullable();
        });
        Schema::table('escrows', function (Blueprint $t) {
            $t->string('status', 32)->default('locked')->change();
            $t->string('dispute_previous_status')->nullable();
            $t->timestamp('refunded_at')->nullable();
            $t->unique('store_order_id');
        });
        Schema::create('marketplace_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_order_id')->unique()->constrained()->restrictOnDelete();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->string('idempotency_key', 150)->unique();
            $t->decimal('amount', 15, 2);
            $t->string('method');
            $t->string('status');
            $t->foreignId('transaction_id')->constrained()->restrictOnDelete();
            $t->foreignId('refund_transaction_id')->nullable()->constrained('transactions')->restrictOnDelete();
            $t->text('refund_reason')->nullable();
            $t->timestamps();
        });
        Schema::create('seller_wallets', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->unique()->constrained()->restrictOnDelete();
            foreach (['available_balance', 'pending_balance', 'reserved_balance', 'disputed_balance', 'debt_balance', 'total_earnings'] as $field) {
                $t->decimal($field, 15, 2)->default(0);
            }
            $t->timestamps();
        });
        Schema::create('seller_withdrawals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('seller_wallet_id')->constrained()->restrictOnDelete();
            $t->string('idempotency_key', 150)->unique();
            $t->decimal('amount', 15, 2);
            $t->string('status')->default('pending');
            $t->text('bank_details');
            $t->string('payout_reference')->nullable()->unique();
            $t->foreignId('processed_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->text('notes')->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('seller_wallet_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('seller_wallet_id')->constrained()->restrictOnDelete();
            $t->foreignId('store_order_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('withdrawal_id')->nullable()->constrained('seller_withdrawals')->restrictOnDelete();
            $t->string('reference')->unique();
            $t->string('type');
            $t->string('status')->default('success');
            $t->decimal('amount', 15, 2);
            $t->json('deltas');
            $t->json('balances_after');
            $t->text('description')->nullable();
            $t->timestamps();
        });
        // Legacy codes are revoked; legacy balances require reconciliation, never guessed transfers.
        DB::table('store_orders')->update(['delivery_code' => null]);
        DB::table('store_orders')->where('status', 'accepted')->update(['status' => 'awaiting_payment']);
        DB::table('store_orders')->where('status', 'rejected')->update(['status' => 'cancelled']);
        DB::table('store_orders')->whereIn('status', ['paid', 'processing', 'out_for_delivery', 'delivered'])
            ->update(['payment_status' => 'legacy_review']);
        DB::table('store_orders')->where('status', 'cancelled')->update(['payment_status' => 'cancelled']);
        DB::table('store_orders')->orderBy('id')->each(function ($so) {
            $address = DB::table('user_addresses')->where('id', $so->delivery_address_id)->first();
            if (! $address) {
                return;
            }
            $snapshot = (array) $address;
            unset($snapshot['user_id'], $snapshot['deleted_at']);
            foreach (['country', 'state', 'city'] as $relation) {
                $table = $relation === 'country' ? 'countries' : ($relation === 'city' ? 'cities' : 'states');
                $snapshot[$relation] = DB::table($table)->where('id', $snapshot[$relation.'_id'])->value('name');
            }
            $snapshot['source'] = 'legacy_address_at_migration';
            DB::table('store_orders')->where('id', $so->id)->update(['delivery_address_snapshot' => json_encode($snapshot)]);
            DB::table('orders')->where('id', $so->order_id)->whereNull('delivery_address_snapshot')->update(['delivery_address_snapshot' => json_encode($snapshot)]);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Financial migration is forward-only. Restore a verified backup for rollback.');
    }
};
