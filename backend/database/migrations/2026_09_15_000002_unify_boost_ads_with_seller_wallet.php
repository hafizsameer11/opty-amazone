<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_wallets', function (Blueprint $table) {
            foreach (['ad_reserved_balance', 'ad_spend_total', 'top_up_total'] as $column) {
                if (! Schema::hasColumn('seller_wallets', $column)) {
                    $table->decimal($column, 15, 2)->default(0);
                }
            }
        });
        Schema::table('seller_wallet_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('seller_wallet_entries', 'ad_campaign_id')) {
                $table->foreignId('ad_campaign_id')->nullable()->constrained()->restrictOnDelete();
            }
            if (! Schema::hasColumn('seller_wallet_entries', 'metadata')) {
                $table->json('metadata')->nullable();
            }
        });
        Schema::table('ad_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('ad_campaigns', 'seller_wallet_id')) {
                $table->foreignId('seller_wallet_id')->nullable()->constrained()->restrictOnDelete();
            }
            if (! Schema::hasColumn('ad_campaigns', 'funding_source')) {
                // Existing reservations remain tied to the legacy user wallet. Their
                // original split cannot safely be moved after the fact.
                $table->string('funding_source', 32)->default('legacy_user_wallet');
            }
        });
        Schema::create('platform_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('type', 64);
            $table->decimal('amount', 15, 2);
            $table->foreignId('seller_wallet_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('ad_campaign_id')->nullable()->constrained()->restrictOnDelete();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_ledger_entries');
        Schema::table('ad_campaigns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('seller_wallet_id');
            $table->dropColumn('funding_source');
        });
        Schema::table('seller_wallet_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ad_campaign_id');
            $table->dropColumn('metadata');
        });
        Schema::table('seller_wallets', function (Blueprint $table) {
            $table->dropColumn(['ad_reserved_balance', 'ad_spend_total', 'top_up_total']);
        });
    }
};
