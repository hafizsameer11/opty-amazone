<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\User;
use App\Services\Admin\AdminActivityLogger;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Permanent removal of a store and everything it owns.
 *
 * Money is never destroyed here. A store that has taken an order, moved money
 * through its wallet, or spent ad budget is refused, because the schema makes
 * those rows RESTRICT and removing them would destroy the payment, ledger and
 * withdrawal audit trail. An admin who wants such a store gone must reject or
 * suspend it instead, which hides it from buyers while keeping the records.
 *
 * For a store with no commercial history the whole content graph is removed in
 * dependency order inside one transaction.
 */
class AdminStoreDeletionService
{
    /**
     * Rows that represent real money movement. Any of these blocks deletion.
     *
     * @return array<string, int>
     */
    public function financialHistory(Store $store): array
    {
        $productIds = $this->productIds($store);
        $walletId = $this->table('seller_wallets')->where('store_id', $store->id)->value('id');

        $balances = 0.0;
        if ($walletId) {
            $wallet = $this->table('seller_wallets')->where('id', $walletId)->first();
            if ($wallet) {
                foreach (['available_balance', 'pending_balance', 'reserved_balance', 'disputed_balance', 'debt_balance', 'total_earnings'] as $field) {
                    $balances += (float) ($wallet->{$field} ?? 0);
                }
            }
        }

        return [
            'store_orders' => $this->table('store_orders')->where('store_id', $store->id)->count(),
            'wallet_entries' => $walletId
                ? $this->table('seller_wallet_entries')->where('seller_wallet_id', $walletId)->count()
                : 0,
            'withdrawals' => $walletId
                ? $this->table('seller_withdrawals')->where('seller_wallet_id', $walletId)->count()
                : 0,
            'platform_ledger_entries' => $walletId
                ? $this->table('platform_ledger_entries')->where('seller_wallet_id', $walletId)->count()
                : 0,
            'paid_ad_campaigns' => $productIds->isEmpty()
                ? 0
                : $this->table('ad_campaigns')
                    ->whereIn('product_id', $productIds)
                    ->where(function ($query) {
                        $query->where('payment_status', 'paid')->orWhere('spent_cents', '>', 0);
                    })
                    ->count(),
            'wallet_balance' => $balances,
        ];
    }

    /**
     * True when the store carries no money movement, so its content graph can
     * be removed without destroying financial records.
 *
     * @param  array<string, int|float>  $history
 */
    public function isDeletable(array $history): bool
    {
        $counts = $history;
        unset($counts['wallet_balance']);

        return array_sum(array_map('intval', $counts)) === 0 && (float) $history['wallet_balance'] == 0.0;
    }

    /**
     * @throws ValidationException when the store carries financial history
     */
    public function assertDeletable(Store $store): void
    {
        $history = $this->financialHistory($store);

        if ($this->isDeletable($history)) {
            return;
        }

        $parts = [];
        if ($history['store_orders']) {
            $parts[] = $history['store_orders'].' order(s)';
        }
        if ($history['wallet_entries']) {
            $parts[] = $history['wallet_entries'].' wallet entr(ies)';
        }
        if ($history['withdrawals']) {
            $parts[] = $history['withdrawals'].' withdrawal(s)';
        }
        if ($history['platform_ledger_entries']) {
            $parts[] = $history['platform_ledger_entries'].' platform ledger entr(ies)';
        }
        if ($history['paid_ad_campaigns']) {
            $parts[] = $history['paid_ad_campaigns'].' paid ad campaign(s)';
        }
        if ($history['wallet_balance'] != 0.0) {
            $parts[] = 'a non-zero wallet balance';
        }

        throw ValidationException::withMessages([
            'store' => [
                'This store cannot be deleted because it has financial history ('.implode(', ', $parts)
                .'). Deleting it would destroy payment, wallet and withdrawal records. '
                .'Reject or suspend the store instead — that removes it from buyers while keeping the records intact.',
            ],
        ]);
    }

    /**
     * Permanently delete the store and all store-owned content.
     *
     * @return array<string, int> counts of removed rows per area
     */
    public function delete(Store $store, User $admin): array
    {
        $this->assertDeletable($store);

        $removed = DB::transaction(function () use ($store, &$removed) {
            $locked = Store::query()->lockForUpdate()->findOrFail($store->id);

            $productIds = $this->productIds($locked);
            $storeOrderIds = $this->table('store_orders')->where('store_id', $locked->id)->pluck('id');
            $walletId = $this->table('seller_wallets')->where('store_id', $locked->id)->value('id');

            $removed = [];

            $removed['ad_campaigns'] = $this->purgeAdCampaigns($productIds, $walletId);
            $removed['discount_campaigns'] = $this->purgeDiscountCampaigns($locked->id);
            $removed['banner_campaigns'] = $this->purgeBannerCampaigns($locked->id);
            $removed['referral_campaigns'] = $this->purgeReferralCampaigns($locked->id);
            $removed['wallet'] = $this->purgeWallet($walletId);
            $removed['store_orders'] = $this->purgeStoreOrders($storeOrderIds);

            // Everything below cascades from `stores`, but the counts are taken
            // first so the admin gets an accurate summary of what disappeared.
            $removed['products'] = $productIds->count();
            $removed['store_banners'] = $this->table('store_banners')->where('store_id', $locked->id)->count();
            $removed['announcements'] = $this->table('store_announcements')->where('store_id', $locked->id)->count();
            $removed['coupons'] = $this->table('coupons')->where('store_id', $locked->id)->count();
            $removed['subscriptions'] = $this->table('subscriptions')->where('store_id', $locked->id)->count();
            $removed['reviews'] = $this->table('store_reviews')->where('store_id', $locked->id)->count();
            $removed['followers'] = $this->table('store_followers')->where('store_id', $locked->id)->count();
            $removed['reports'] = $this->table('store_reports')->where('store_id', $locked->id)->count();
            $removed['reinstatement_requests'] = $this->table('store_reinstatement_requests')->where('store_id', $locked->id)->count();
            $removed['conversations'] = $this->table('store_chat_conversations')->where('store_id', $locked->id)->count()
                + $this->table('admin_store_chat_conversations')->where('store_id', $locked->id)->count();

            $files = array_filter([$locked->profile_image, $locked->banner_image]);
            $locked->forceDelete();

            $this->deleteFiles($files);

            return $removed;
        });

        AdminActivityLogger::log(
            $admin,
            'store.deleted',
            'store',
            (int) $store->id,
            true,
            ['store' => ['id' => $store->id, 'name' => $store->name, 'slug' => $store->slug], 'removed' => $removed]
        );

        return $removed;
    }

    private function purgeAdCampaigns(Collection $productIds, $walletId): int
    {
        $query = $this->table('ad_campaigns')->whereIn('product_id', $productIds);
        if ($walletId) {
            $query->orWhere('seller_wallet_id', $walletId);
        }

        $ids = (clone $query)->pluck('id');
        if ($ids->isEmpty()) {
            return 0;
        }

        foreach (['ad_events', 'ad_budget_transactions', 'ad_audit_logs', 'ad_daily_metrics'] as $child) {
            if ($this->hasTable($child) && Schema::hasColumn($child, 'ad_campaign_id')) {
                $this->table($child)->whereIn('ad_campaign_id', $ids)->delete();
            }
        }

        return $this->table('ad_campaigns')->whereIn('id', $ids)->delete();
    }

    private function purgeDiscountCampaigns(int $storeId): int
    {
        $ids = $this->table('discount_campaigns')->where('store_id', $storeId)->pluck('id');
        if ($ids->isEmpty()) {
            return 0;
        }

        foreach (['discount_campaign_products', 'discount_campaign_variants', 'discount_campaign_categories', 'discount_campaign_usages'] as $pivot) {
            $this->table($pivot)->whereIn('discount_campaign_id', $ids)->delete();
        }
        $this->purgeCommerceSidecars('discount_campaign', $ids);

        return $this->table('discount_campaigns')->whereIn('id', $ids)->delete();
    }

    private function purgeBannerCampaigns(int $storeId): int
    {
        $ids = $this->table('banner_campaigns')->where('store_id', $storeId)->pluck('id');
        if ($ids->isEmpty()) {
            return 0;
        }

        $this->table('banner_creatives')->whereIn('banner_campaign_id', $ids)->delete();
        // banner_events also references banner_creative_id, so clear it first.
        $this->table('banner_events')->whereIn('banner_campaign_id', $ids)->delete();
        $this->purgeCommerceSidecars('banner_campaign', $ids);

        return $this->table('banner_campaigns')->whereIn('id', $ids)->delete();
    }

    private function purgeReferralCampaigns(int $storeId): int
    {
        $ids = $this->table('referral_campaigns')->where('store_id', $storeId)->pluck('id');
        if ($ids->isEmpty()) {
            return 0;
        }

        $rewardIds = $this->table('referral_rewards')->whereIn('campaign_id', $ids)->pluck('id');
        if ($rewardIds->isNotEmpty()) {
            $this->table('referral_reward_reversals')->whereIn('reward_id', $rewardIds)->delete();
        }
        $this->table('referral_rewards')->whereIn('campaign_id', $ids)->delete();
        $this->table('referral_clicks')->whereIn('campaign_id', $ids)->delete();
        $this->table('referral_conversions')->whereIn('campaign_id', $ids)->delete();
        $this->table('referral_audit_logs')->whereIn('campaign_id', $ids)->delete();
        $this->table('referral_campaign_products')->whereIn('referral_campaign_id', $ids)->delete();
        $this->table('referral_campaign_categories')->whereIn('referral_campaign_id', $ids)->delete();

        return $this->table('referral_campaigns')->whereIn('id', $ids)->delete();
    }

    private function purgeWallet($walletId): int
    {
        if (! $walletId) {
            return 0;
        }

        $this->table('seller_wallet_entries')->where('seller_wallet_id', $walletId)->delete();
        $this->table('seller_withdrawals')->where('seller_wallet_id', $walletId)->delete();
        $this->table('platform_ledger_entries')->where('seller_wallet_id', $walletId)->delete();
        // ad_campaigns.seller_wallet_id and platform_ledger_entries restrict the
        // wallet, so detach anything still pointing at it before removal.
        if ($this->hasTable('ad_campaigns') && Schema::hasColumn('ad_campaigns', 'seller_wallet_id')) {
            $this->table('ad_campaigns')->where('seller_wallet_id', $walletId)->update(['seller_wallet_id' => null]);
        }

        return $this->table('seller_wallets')->where('id', $walletId)->delete();
    }

    /**
     * Defensive: the guard normally means there are none, but a store can gain
     * an unpaid store_order between the check and the delete.
     */
    private function purgeStoreOrders(Collection $storeOrderIds): int
    {
        if ($storeOrderIds->isEmpty()) {
            return 0;
        }

        $this->table('marketplace_payments')->whereIn('store_order_id', $storeOrderIds)->delete();
        $this->table('escrows')->whereIn('store_order_id', $storeOrderIds)->delete();
        $this->table('order_items')->whereIn('store_order_id', $storeOrderIds)->delete();

        return $this->table('store_orders')->whereIn('id', $storeOrderIds)->delete();
    }

    /** commerce_campaign_audits/analytics are untyped and unconstrained. */
    private function purgeCommerceSidecars(string $type, Collection $ids): void
    {
        foreach (['commerce_campaign_audits', 'commerce_campaign_analytics'] as $sidecar) {
            if ($this->hasTable($sidecar) && Schema::hasColumn($sidecar, 'campaign_type')) {
                $this->table($sidecar)->where('campaign_type', $type)->whereIn('campaign_id', $ids)->delete();
            }
        }
    }

    private function productIds(Store $store): Collection
    {
        return $this->table('products')->where('store_id', $store->id)->pluck('id');
    }

    private function deleteFiles(array $paths): void
    {
        foreach ($paths as $path) {
            try {
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            } catch (\Throwable $e) {
                // A missing or unreadable upload must not abort the deletion.
                report($e);
            }
        }
    }

    private function table(string $name)
    {
        return DB::table($name);
    }

    private function hasTable(string $name): bool
    {
        return Schema::hasTable($name);
    }
}