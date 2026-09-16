<?php

namespace App\Services\Referrals;

use App\Models\Category;
use App\Models\Order;
use App\Models\PlatformLedgerEntry;
use App\Models\PlatformSetting;
use App\Models\Product;
use App\Models\ReferralAttribution;
use App\Models\ReferralAuditLog;
use App\Models\ReferralCampaign;
use App\Models\ReferralClick;
use App\Models\ReferralCode;
use App\Models\ReferralConversion;
use App\Models\ReferralReward;
use App\Models\ReferralRewardReversal;
use App\Models\StoreOrder;
use App\Models\User;
use App\Services\Marketplace\BuyerWalletService;
use App\Services\Marketplace\Money;
use App\Services\Marketplace\SellerWalletService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Referral orchestration. This service never keeps a balance of its own: all
 * money changes are delegated to the marketplace wallet/ledger services.
 */
class ReferralService
{
    private const SETTINGS = [
        'platform_referrals_enabled' => true,
        'platform_referral_reward_type' => 'fixed',
        'platform_referral_reward_amount' => 10,
        'platform_referral_max_reward_per_order' => null,
        'platform_referral_minimum_order_amount' => 0,
        'referral_attribution_days' => 30,
        'referral_reward_waiting_days' => 14,
        'platform_referral_monthly_reward_limit' => null,
        'platform_referral_per_buyer_limit' => 1,
        'seller_referrals_require_approval' => true,
        'seller_referrals_allow_existing_buyers' => false,
        'referral_require_email_verification' => true,
        'referral_require_phone_verification' => false,
        'referral_allow_platform_stacking' => false,
    ];

    public function __construct(private BuyerWalletService $buyers, private SellerWalletService $sellers) {}

    public function settings(): array
    {
        return array_merge(self::SETTINGS, PlatformSetting::allCached());
    }

    public function ensureBuyerCode(User $user): ReferralCode
    {
        abort_unless($user->isBuyer(), 422, 'Only buyers can own a referral code.');

        return DB::transaction(function () use ($user) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($code = ReferralCode::where('user_id', $user->id)->first()) {
                return $code;
            }
            for ($attempt = 0; $attempt < 5; $attempt++) {
                try {
                    return ReferralCode::create(['user_id' => $user->id,
                        'code' => 'BUYER'.strtoupper(base_convert((string) $user->id, 10, 36)).strtoupper(Str::random(6)),
                        'is_active' => true]);
                } catch (QueryException $exception) {
                    if ($attempt === 4) {
                        throw $exception;
                    }
                }
            }
            throw new \LogicException('Unable to allocate referral code.');
        }, 5);
    }

    /** Creates a tokenized, privacy-minimised public referral visit. */
    public function createAttribution(string $codeValue, ?string $campaignIdentifier, ?int $productId, ?User $viewer, ?string $ip, ?string $userAgent): array
    {
        $this->activateDueCampaigns();
        $code = ReferralCode::with('user')->where('code', strtoupper(trim($codeValue)))->where('is_active', true)->first();
        if (! $code || ! $code->user?->isBuyer()) {
            throw ValidationException::withMessages(['ref' => ['This referral code is invalid or inactive.']]);
        }
        if ($viewer && $viewer->id === $code->user_id) {
            throw ValidationException::withMessages(['ref' => ['You cannot use your own referral link.']]);
        }

        $campaign = null;
        if ($campaignIdentifier) {
            $campaign = ReferralCampaign::with('products:id', 'categories:id')->where('identifier', $campaignIdentifier)->first();
            if (! $campaign || ! $campaign->isLive()) {
                throw ValidationException::withMessages(['campaign' => ['This referral campaign is inactive or expired.']]);
            }
        }
        $product = $productId ? Product::withTrashed()->find($productId) : null;
        if ($productId && ! $product) {
            throw ValidationException::withMessages(['product_id' => ['The referral product is unavailable.']]);
        }
        if ($campaign && $product && ! $this->campaignIncludesProduct($campaign, $product)) {
            throw ValidationException::withMessages(['product_id' => ['The linked product is not eligible for this campaign.']]);
        }

        return DB::transaction(function () use ($code, $campaign, $product, $ip, $userAgent) {
            $token = Str::random(64);
            $click = ReferralClick::create([
                'referral_code_id' => $code->id, 'referrer_user_id' => $code->user_id,
                'referral_campaign_id' => $campaign?->id, 'product_id' => $product?->id,
                'attribution_token' => $token, 'ip_hash' => $ip ? hash('sha256', $ip) : null,
                'device_hash' => $userAgent ? hash('sha256', $userAgent) : null, 'clicked_at' => now(),
            ]);
            $attribution = ReferralAttribution::create([
                'referral_click_id' => $click->id, 'referral_code_id' => $code->id,
                'referrer_user_id' => $code->user_id, 'referral_campaign_id' => $campaign?->id,
                'product_id' => $product?->id, 'token' => $token,
                'expires_at' => now()->addDays(max(1, (int) $this->settings()['referral_attribution_days'])),
            ]);

            return ['token' => $attribution->token, 'expires_at' => $attribution->expires_at,
                'campaign' => $campaign?->only(['id', 'identifier', 'name']), 'product_id' => $product?->id];
        }, 5);
    }

    /** Attach an active campaign visit to an authenticated buyer without overwriting permanent acquisition. */
    public function claimAttribution(User $buyer, string $token): ReferralAttribution
    {
        abort_unless($buyer->isBuyer(), 403);
        return DB::transaction(function () use ($buyer, $token) {
            $attribution = ReferralAttribution::where('token', $token)->lockForUpdate()->first();
            abort_unless($attribution && $attribution->expires_at->isFuture(), 422, 'Referral attribution has expired.');
            abort_if($attribution->referrer_user_id === $buyer->id, 422, 'You cannot refer yourself.');
            abort_if($attribution->referred_user_id && $attribution->referred_user_id !== $buyer->id, 409, 'Referral attribution belongs to another buyer.');
            $attribution->update(['referred_user_id' => $buyer->id, 'claimed_at' => now()]);

            return $attribution;
        }, 5);
    }

    /** Called only as part of buyer registration; the unique conversion enforces one permanent referrer. */
    public function recordRegistration(User $buyer, ?string $token, ?string $manualCode, ?string $ip = null, ?string $userAgent = null): ?ReferralConversion
    {
        $this->ensureBuyerCode($buyer);
        if (! $token && ! $manualCode) {
            return null;
        }

        return DB::transaction(function () use ($buyer, $token, $manualCode, $ip, $userAgent) {
            User::whereKey($buyer->id)->lockForUpdate()->firstOrFail();
            if ($existing = ReferralConversion::where('referred_user_id', $buyer->id)->first()) {
                return $existing;
            }
            $attribution = $token ? ReferralAttribution::where('token', $token)->lockForUpdate()->first() : null;
            if ($attribution) {
                if (! $attribution->expires_at->isFuture()) {
                    throw ValidationException::withMessages(['referral_attribution_token' => ['This referral link has expired.']]);
                }
                if ($attribution->referrer_user_id === $buyer->id || ($attribution->referred_user_id && $attribution->referred_user_id !== $buyer->id)) {
                    throw ValidationException::withMessages(['referral_attribution_token' => ['This referral link cannot be used for this buyer.']]);
                }
                $attribution->update(['referred_user_id' => $buyer->id, 'claimed_at' => now()]);
            } elseif ($manualCode) {
                $created = $this->createAttribution($manualCode, null, null, $buyer, $ip, $userAgent);
                $attribution = ReferralAttribution::where('token', $created['token'])->lockForUpdate()->firstOrFail();
                $attribution->update(['referred_user_id' => $buyer->id, 'claimed_at' => now()]);
            }
            if (! $attribution) {
                return null;
            }

            return ReferralConversion::create([
                'referred_user_id' => $buyer->id, 'referrer_user_id' => $attribution->referrer_user_id,
                'referral_code_id' => $attribution->referral_code_id, 'initial_attribution_id' => $attribution->id,
                'initial_campaign_id' => $attribution->referral_campaign_id, 'registered_at' => now(),
            ]);
        }, 5);
    }

    public function createCampaign(User $seller, array $data): ReferralCampaign
    {
        abort_unless($seller->isSeller() && $seller->store, 403, 'A verified seller store is required.');
        return DB::transaction(function () use ($seller, $data) {
            $store = $seller->store;
            $needsApproval = (bool) $this->settings()['seller_referrals_require_approval'];
            $activation = $this->campaignActivationAttributes($data);
            $budget = Money::cents($data['budget_amount']);
            abort_if($budget <= 0, 422, 'Campaign budget must be positive.');
            $wallet = $this->sellers->locked($store->id);
            abort_if(Money::cents($wallet->available_balance) < $budget, 422, 'Insufficient Seller Wallet balance to fund this campaign.');
            $campaign = ReferralCampaign::create([
                'store_id' => $store->id, 'seller_id' => $seller->id, 'name' => $data['name'],
                'identifier' => $this->campaignIdentifier($store->id), 'scope_type' => $data['scope_type'],
                'status' => $needsApproval ? 'pending_approval' : $this->approvedCampaignStatus($activation['activation_mode'], $activation['starts_at']),
                'approval_status' => $needsApproval ? 'pending' : 'approved',
                'approved_at' => $needsApproval ? null : now(), 'reward_type' => $data['reward_type'],
                'reward_amount' => $data['reward_amount'], 'max_reward_per_order' => $data['max_reward_per_order'] ?? null,
                'budget_amount' => Money::decimal($budget), 'budget_reserved' => Money::decimal($budget),
                'usage_limit' => $data['usage_limit'] ?? null, 'monthly_reward_limit' => $data['monthly_reward_limit'] ?? null,
                'per_buyer_limit' => $data['per_buyer_limit'] ?? null, 'minimum_order_amount' => $data['minimum_order_amount'] ?? 0,
                'minimum_quantity' => $data['minimum_quantity'] ?? 1, 'new_customer_only' => $data['new_customer_only'] ?? true,
                'platform_stacking' => $data['platform_stacking'] ?? 'exclusive', 'activation_mode' => $activation['activation_mode'], 'starts_at' => $activation['starts_at'],
                'ends_at' => $data['ends_at'] ?? null, 'metadata' => $data['metadata'] ?? null,
            ]);
            $this->syncScope($campaign, $data['product_ids'] ?? [], $data['category_ids'] ?? []);
            $this->sellers->entry($wallet, "referral-campaign:{$campaign->id}:reserve", 'referral_campaign_reserve', -$budget,
                ['available_balance' => -$budget, 'reserved_balance' => $budget], null, null, null,
                "Referral campaign reserve: {$campaign->name}", ['referral_campaign_id' => $campaign->id]);
            $this->audit('campaign.created', $seller, $campaign, null, null, ['budget' => Money::decimal($budget)]);
            return $campaign->fresh(['products:id,name', 'categories:id,name']);
        }, 5);
    }

    public function updateCampaign(ReferralCampaign $input, User $seller, array $data): ReferralCampaign
    {
        abort_unless($seller->isSeller() && $input->seller_id === $seller->id, 403);
        return DB::transaction(function () use ($input, $seller, $data) {
            $campaign = ReferralCampaign::whereKey($input->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($campaign->status, ['archived', 'suspended']), 409, 'Archived or suspended campaigns cannot be edited.');
            $payload = array_intersect_key($data, array_flip(['name', 'scope_type', 'reward_type', 'reward_amount', 'max_reward_per_order', 'usage_limit', 'monthly_reward_limit', 'per_buyer_limit', 'minimum_order_amount', 'minimum_quantity', 'new_customer_only', 'platform_stacking', 'ends_at', 'metadata']));
            if (array_key_exists('activation_mode', $data) || array_key_exists('starts_at', $data)) {
                $activation = $this->campaignActivationAttributes($data, $campaign);
                $payload['activation_mode'] = $activation['activation_mode'];
                $payload['starts_at'] = $activation['starts_at'];
                if ($campaign->approval_status === 'approved' && $campaign->status !== 'paused') {
                    $payload['status'] = $this->approvedCampaignStatus($activation['activation_mode'], $activation['starts_at']);
                }
            }
            $newBudget = array_key_exists('budget_amount', $data) ? Money::cents($data['budget_amount']) : Money::cents($campaign->budget_amount);
            $spent = Money::cents($campaign->budget_spent);
            abort_if($newBudget < $spent, 422, 'Campaign budget cannot be lower than rewarded referral cost.');
            $wantedReserved = $newBudget - $spent;
            $currentReserved = Money::cents($campaign->budget_reserved);
            $delta = $wantedReserved - $currentReserved;
            if ($delta !== 0) {
                $wallet = $this->sellers->locked($campaign->store_id);
                abort_if($delta > 0 && Money::cents($wallet->available_balance) < $delta, 422, 'Insufficient Seller Wallet balance for the new campaign budget.');
                $this->sellers->entry($wallet, "referral-campaign:{$campaign->id}:budget:".hash('sha256', $newBudget.':'.$spent),
                    'referral_campaign_budget_adjustment', -$delta, ['available_balance' => -$delta, 'reserved_balance' => $delta],
                    null, null, null, "Referral campaign budget adjustment: {$campaign->name}", ['referral_campaign_id' => $campaign->id]);
            }
            $payload['budget_amount'] = Money::decimal($newBudget);
            $payload['budget_reserved'] = Money::decimal($wantedReserved);
            $campaign->update($payload);
            if (array_key_exists('product_ids', $data) || array_key_exists('category_ids', $data)) {
                $this->syncScope($campaign, $data['product_ids'] ?? $campaign->products()->pluck('products.id')->all(), $data['category_ids'] ?? $campaign->categories()->pluck('categories.id')->all());
            }
            $this->audit('campaign.updated', $seller, $campaign);
            return $campaign->fresh(['products:id,name', 'categories:id,name']);
        }, 5);
    }

    public function setCampaignStatus(ReferralCampaign $input, User $actor, string $action, ?string $reason = null): ReferralCampaign
    {
        return DB::transaction(function () use ($input, $actor, $action, $reason) {
            $campaign = ReferralCampaign::whereKey($input->id)->lockForUpdate()->firstOrFail();
            $isOwner = $actor->isSeller() && $campaign->seller_id === $actor->id;
            abort_unless($isOwner || $actor->isAdmin(), 403);
            if (in_array($action, ['approve', 'reject', 'suspend']) && ! $actor->isAdmin()) {
                abort(403);
            }
            match ($action) {
                'pause' => (function () use ($campaign) { abort_unless(in_array($campaign->status, ['active', 'scheduled']), 409, 'Only active or scheduled campaigns can be paused.'); $campaign->update(['status' => 'paused']); })(),
                'resume' => (function () use ($campaign) { abort_unless($campaign->status === 'paused' && $campaign->approval_status === 'approved', 409, 'Campaign approval is required before resuming.'); $campaign->update(['status' => $this->approvedCampaignStatus($campaign->activation_mode, $campaign->starts_at)]); })(),
                'approve' => (function () use ($campaign, $actor) { abort_unless($campaign->status === 'pending_approval', 409, 'Only pending campaigns can be approved.'); $campaign->update(['status' => $this->approvedCampaignStatus($campaign->activation_mode, $campaign->starts_at), 'approval_status' => 'approved', 'approved_by' => $actor->id, 'approved_at' => now(), 'rejection_reason' => null]); })(),
                'suspend' => $campaign->update(['status' => 'suspended', 'approval_status' => 'suspended', 'rejection_reason' => $reason]),
                'reject' => $this->rejectCampaign($campaign, $actor, (string) $reason),
                'archive' => (function () use ($campaign, $actor) { abort_if($campaign->status === 'archived', 409, 'Campaign is already archived.'); $this->archiveCampaign($campaign, $actor); })(),
                default => abort(422, 'Unsupported campaign action.'),
            };
            $this->audit('campaign.'.$action, $actor, $campaign, null, $reason);
            return $campaign->fresh(['products:id,name', 'categories:id,name']);
        }, 5);
    }

    /** Payment success is the earliest moment a financial referral candidate can exist. */
    public function captureOrderCandidates(StoreOrder $input): void
    {
        $this->activateDueCampaigns();
        DB::transaction(function () use ($input) {
            $storeOrder = StoreOrder::with(['order.user.referralConversion', 'items.product' => fn ($q) => $q->withTrashed()])->lockForUpdate()->findOrFail($input->id);
            if ($storeOrder->payment_status !== 'paid' || $storeOrder->status === 'refunded') {
                return;
            }
            $buyer = $storeOrder->order->user;
            $activeAttribution = ReferralAttribution::with('campaign.products:id', 'campaign.categories:id')
                ->where('referred_user_id', $buyer->id)->where('expires_at', '>', now())->latest('id')->first();
            $conversion = $buyer->referralConversion;
            // A successful registration preserves acquisition indefinitely. An
            // unregistered visit expires normally; it cannot turn an existing buyer
            // into a platform-referred buyer after the attribution window.
            $attribution = $activeAttribution ?: $conversion?->attribution?->loadMissing('campaign.products:id', 'campaign.categories:id');
            $sellerCandidate = false;
            if ($attribution?->referral_campaign_id && $attribution->campaign?->isLive() && $attribution->referrer_user_id !== $buyer->id) {
                $sellerCandidate = $this->createSellerCandidate($storeOrder, $attribution);
            }
            if ($conversion && (bool) $this->settings()['platform_referrals_enabled']) {
                $allowsStacking = $attribution?->campaign?->platform_stacking === 'allow_platform'
                    && (bool) $this->settings()['referral_allow_platform_stacking'];
                if (! $sellerCandidate || $allowsStacking) {
                    $this->createPlatformCandidate($storeOrder->order, $storeOrder, $conversion);
                } else {
                    ReferralReward::where('idempotency_key', 'platform:order:'.$storeOrder->order_id)->where('status', 'pending')
                        ->update(['status' => 'rejected', 'reason' => 'Seller campaign has priority for this purchase.', 'rejected_at' => now()]);
                }
            }
        }, 5);
    }

    /** Promote approved scheduled campaigns exactly once when their start time arrives. */
    public function activateDueCampaigns(int $limit = 250): int
    {
        return DB::transaction(function () use ($limit) {
            $campaigns = ReferralCampaign::query()
                ->where('status', 'scheduled')
                ->where('approval_status', 'approved')
                ->where('activation_mode', 'scheduled')
                ->where('starts_at', '<=', now())
                ->orderBy('starts_at')
                ->limit(max(1, min($limit, 1000)))
                ->lockForUpdate()
                ->get();

            foreach ($campaigns as $campaign) {
                $campaign->update(['status' => 'active']);
            }

            return $campaigns->count();
        }, 5);
    }

    /** Marks candidate rewards payable after a configurable return/dispute protection period. */
    public function markDelivered(StoreOrder $input): void
    {
        DB::transaction(function () use ($input) {
            $storeOrder = StoreOrder::whereKey($input->id)->lockForUpdate()->firstOrFail();
            ReferralReward::where('store_order_id', $storeOrder->id)->where('status', 'pending')->lockForUpdate()
                ->get()->each(fn (ReferralReward $reward) => $reward->update(['qualifies_at' => now()->addDays(max(0, (int) $this->settings()['referral_reward_waiting_days']))]));
            ReferralReward::where('order_id', $storeOrder->order_id)->whereNull('store_order_id')->where('status', 'pending')->lockForUpdate()
                ->get()->each(fn (ReferralReward $reward) => $reward->update(['qualifies_at' => now()->addDays(max(0, (int) $this->settings()['referral_reward_waiting_days']))]));
        }, 5);
        $this->qualifyDueRewards();
    }

    public function qualifyDueRewards(int $limit = 100): int
    {
        $ids = ReferralReward::where('status', 'pending')->whereNotNull('qualifies_at')->where('qualifies_at', '<=', now())
            ->orderBy('id')->limit($limit)->pluck('id');
        foreach ($ids as $id) {
            $this->qualifyAndFund((int) $id);
        }
        return $ids->count();
    }

    public function suspendStoreOrder(StoreOrder $input, string $reason, ?User $actor = null): void
    {
        DB::transaction(function () use ($input, $reason, $actor) {
            $rewards = ReferralReward::where(function (Builder $q) use ($input) {
                $q->where('store_order_id', $input->id)
                    ->orWhere(fn (Builder $q) => $q->where('order_id', $input->order_id)->whereNull('store_order_id'));
            })->whereIn('status', ['pending', 'qualified'])->lockForUpdate()->get();
            foreach ($rewards as $reward) {
                $reward->update(['status' => 'suspended', 'suspended_at' => now(), 'reason' => $reason]);
                $this->audit('reward.suspended', $actor, null, $reward, $reason);
            }
        }, 5);
    }

    public function invalidateStoreOrder(StoreOrder $input, string $reason, ?User $actor = null): void
    {
        $rewardIds = DB::transaction(function () use ($input, $reason, $actor) {
            // A platform reward represents the buyer's first qualifying parent order;
            // a refund/cancellation makes that order ineligible rather than silently
            // paying from a subtotal that no longer matches its captured terms.
            $rewards = ReferralReward::where(function (Builder $q) use ($input) {
                $q->where('store_order_id', $input->id)
                    ->orWhere(fn (Builder $q) => $q->where('order_id', $input->order_id)->whereNull('store_order_id'));
            })->lockForUpdate()->get();
            $ids = [];
            foreach ($rewards as $reward) {
                if (in_array($reward->status, ['pending', 'qualified', 'suspended'])) {
                    $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => $reason]);
                    $this->audit('reward.rejected', $actor, null, $reward, $reason);
                } elseif ($reward->status === 'rewarded') {
                    $ids[] = $reward->id;
                }
            }
            return $ids;
        }, 5);
        foreach ($rewardIds as $id) {
            $this->reverseReward((int) $id, $actor, $reason, 'order:'.$input->id.':invalidated');
        }
    }

    public function reverseReward(int|ReferralReward $input, ?User $actor, string $reason, ?string $idempotencyKey = null): ReferralRewardReversal
    {
        $rewardId = $input instanceof ReferralReward ? $input->id : $input;
        return DB::transaction(function () use ($rewardId, $actor, $reason, $idempotencyKey) {
            $reward = ReferralReward::with('campaign')->whereKey($rewardId)->lockForUpdate()->firstOrFail();
            if ($existing = ReferralRewardReversal::where('referral_reward_id', $reward->id)->first()) {
                return $existing;
            }
            abort_unless($reward->status === 'rewarded', 409, 'Only rewarded referrals can be reversed.');
            $cents = Money::cents($reward->amount);
            $key = $idempotencyKey ?: 'referral-reversal:'.$reward->id;
            $meta = $this->ledgerMeta($reward) + ['reversal_reason' => $reason, 'allow_negative_balance' => true];
            $buyerTransaction = $this->buyers->change($reward->referrer, -$cents, "referral-reversal:{$reward->id}:buyer", 'referral_reward_reversal', $meta);
            $sellerEntry = null;
            $platformEntry = null;
            if ($reward->source === 'seller_campaign') {
                $campaign = ReferralCampaign::whereKey($reward->referral_campaign_id)->lockForUpdate()->firstOrFail();
                $wallet = $this->sellers->locked($campaign->store_id);
                $returnToReserve = in_array($campaign->status, ['active', 'paused', 'pending_approval']);
                $deltas = $returnToReserve ? ['reserved_balance' => $cents] : ['available_balance' => $cents];
                $sellerEntry = $this->sellers->entry($wallet, "referral-reversal:{$reward->id}:seller", 'referral_commission_reversal', $cents,
                    $deltas, $reward->store_order_id, null, null, 'Referral commission reversal', $this->ledgerMeta($reward));
                $campaign->update(['budget_spent' => Money::decimal(max(0, Money::cents($campaign->budget_spent) - $cents)),
                    'budget_reserved' => Money::decimal(Money::cents($campaign->budget_reserved) + ($returnToReserve ? $cents : 0))]);
            } else {
                $platformEntry = PlatformLedgerEntry::firstOrCreate(['reference' => "referral-reversal:{$reward->id}:platform"], [
                    'type' => 'platform_referral_reward_reversal', 'amount' => Money::decimal($cents),
                    'description' => 'Platform referral reward reversal', 'metadata' => $this->ledgerMeta($reward),
                ]);
            }
            $reversal = ReferralRewardReversal::create(['referral_reward_id' => $reward->id, 'idempotency_key' => $key,
                'actor_id' => $actor?->id, 'buyer_transaction_id' => $buyerTransaction->id, 'seller_wallet_entry_id' => $sellerEntry?->id,
                'platform_ledger_entry_id' => $platformEntry?->id, 'amount' => Money::decimal($cents), 'reason' => $reason]);
            $reward->update(['status' => 'reversed', 'reversed_at' => now(), 'reason' => $reason]);
            $this->audit('reward.reversed', $actor, $reward->campaign, $reward, $reason, ['reversal_id' => $reversal->id]);
            return $reversal;
        }, 5);
    }

    public function adminRewardAction(ReferralReward $reward, User $admin, string $action, string $reason): ReferralReward
    {
        abort_unless($admin->isAdmin(), 403);
        if ($action === 'reverse') {
            $this->reverseReward($reward, $admin, $reason, 'admin:referral-reversal:'.$reward->id);
            return $reward->fresh();
        }
        return DB::transaction(function () use ($reward, $admin, $action, $reason) {
            $locked = ReferralReward::whereKey($reward->id)->lockForUpdate()->firstOrFail();
            if ($action === 'approve') {
                abort_unless(in_array($locked->status, ['pending', 'suspended']), 409, 'Referral is not available for approval.');
                $terms = $locked->terms_snapshot ?? [];
                $terms['admin_override'] = ['approved_by' => $admin->id, 'approved_at' => now()->toIso8601String(), 'reason' => $reason];
                $locked->update(['status' => 'pending', 'suspended_at' => null, 'reason' => 'Manual approval: '.$reason,
                    'qualifies_at' => now(), 'terms_snapshot' => $terms]);
            } elseif ($action === 'reject') {
                abort_unless(in_array($locked->status, ['pending', 'qualified', 'suspended']), 409, 'Referral is not available for rejection.');
                $locked->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => $reason]);
            } elseif ($action === 'suspend') {
                abort_unless(in_array($locked->status, ['pending', 'qualified']), 409, 'Referral is not available for suspension.');
                $locked->update(['status' => 'suspended', 'suspended_at' => now(), 'reason' => $reason]);
            } else {
                abort(422, 'Unsupported reward action.');
            }
            $this->audit('reward.'.$action, $admin, $locked->campaign, $locked, $reason);
            return $locked;
        }, 5);
    }

    public function buyerDashboard(User $buyer, ?int $eligibleProductId = null): array
    {
        $this->activateDueCampaigns();
        $code = $this->ensureBuyerCode($buyer);
        $rewards = ReferralReward::with(['campaign:id,name,identifier', 'order:id,order_no', 'storeOrder:id,store_id', 'referred:id,name,email'])
            ->where('referrer_user_id', $buyer->id)->latest('id');
        // The history query is ordered by ID. Clear that order before grouping,
        // because MySQL's ONLY_FULL_GROUP_BY mode rejects ORDER BY id here.
        $counts = (clone $rewards)->reorder()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        $campaigns = ReferralCampaign::with(['store:id,name', 'products:id,name', 'categories:id,name'])
            ->where('status', 'active')->where('approval_status', 'approved')->where('starts_at', '<=', now())
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))->orderBy('ends_at')->get();
        if ($eligibleProductId) {
            $product = Product::withTrashed()->find($eligibleProductId);
            $campaigns = $campaigns->filter(fn (ReferralCampaign $campaign) => $product && $this->campaignIncludesProduct($campaign, $product))->values();
        }
        return [
            'platform' => ['code' => $code->code, 'link' => '/auth/register/buyer?ref='.$code->code,
                'attribution_days' => (int) $this->settings()['referral_attribution_days']],
            'stats' => ['clicks' => ReferralClick::where('referrer_user_id', $buyer->id)->count(),
                'registrations' => ReferralConversion::where('referrer_user_id', $buyer->id)->count(),
                'pending' => (int) ($counts['pending'] ?? 0), 'qualified' => (int) ($counts['qualified'] ?? 0),
                'rewarded' => (int) ($counts['rewarded'] ?? 0), 'rejected' => (int) ($counts['rejected'] ?? 0),
                'reversed' => (int) ($counts['reversed'] ?? 0), 'total_rewards' => (float) (clone $rewards)->where('status', 'rewarded')->sum('amount')],
            'campaigns' => $campaigns, 'history' => $rewards->paginate(25),
        ];
    }

    public function campaignAnalytics(ReferralCampaign $campaign): array
    {
        $rewards = $campaign->rewards();
        $clicks = ReferralClick::where('referral_campaign_id', $campaign->id)->count();
        $orders = (clone $rewards)->whereNotNull('store_order_id')->distinct('store_order_id')->count('store_order_id');
        $revenue = (float) (clone $rewards)->whereIn('status', ['qualified', 'rewarded', 'reversed'])->sum('eligible_subtotal');
        $cost = (float) (clone $rewards)->where('status', 'rewarded')->sum('amount');
        return ['clicks' => $clicks, 'registrations' => ReferralConversion::where('initial_campaign_id', $campaign->id)->count(),
            'orders' => $orders, 'qualified_conversions' => (clone $rewards)->whereIn('status', ['qualified', 'rewarded'])->count(),
            'pending_rewards' => (clone $rewards)->where('status', 'pending')->count(), 'rewarded_conversions' => (clone $rewards)->where('status', 'rewarded')->count(),
            'reversed_rewards' => (clone $rewards)->where('status', 'reversed')->count(), 'revenue_generated' => $revenue,
            'referral_commission_cost' => $cost, 'net_revenue' => $revenue - $cost,
            'conversion_rate' => $clicks ? round($orders / $clicks * 100, 2) : 0,
            'average_order_value' => $orders ? round($revenue / $orders, 2) : 0,
            'budget_used' => (float) $campaign->budget_spent, 'budget_remaining' => (float) $campaign->budget_reserved];
    }

    /** @return array{activation_mode:string,starts_at:\Illuminate\Support\Carbon} */
    private function campaignActivationAttributes(array $data, ?ReferralCampaign $campaign = null): array
    {
        $mode = $data['activation_mode'] ?? $campaign?->activation_mode ?? 'immediate';
        if ($mode === 'immediate') {
            $startsAt = now();
            if (! empty($data['ends_at']) && now()->parse($data['ends_at'])->lte($startsAt)) {
                throw ValidationException::withMessages(['ends_at' => ['The campaign end time must be after its activation time.']]);
            }
            return ['activation_mode' => 'immediate', 'starts_at' => $startsAt];
        }

        $startsAt = array_key_exists('starts_at', $data) ? now()->parse($data['starts_at']) : $campaign?->starts_at;
        if (! $startsAt) {
            throw ValidationException::withMessages(['starts_at' => ['Choose a future activation time for a scheduled campaign.']]);
        }
        if (! $startsAt->isFuture()) {
            throw ValidationException::withMessages(['starts_at' => ['A scheduled campaign must start in the future. Choose Run now to activate after approval.']]);
        }
        if (! empty($data['ends_at']) && now()->parse($data['ends_at'])->lte($startsAt)) {
            throw ValidationException::withMessages(['ends_at' => ['The campaign end time must be after its activation time.']]);
        }

        return ['activation_mode' => 'scheduled', 'starts_at' => $startsAt];
    }

    private function approvedCampaignStatus(string $activationMode, \Illuminate\Support\Carbon $startsAt): string
    {
        return $activationMode === 'scheduled' && $startsAt->isFuture() ? 'scheduled' : 'active';
    }

    private function createSellerCandidate(StoreOrder $storeOrder, ReferralAttribution $attribution): bool
    {
        $campaign = $attribution->campaign;
        if (! $campaign || $campaign->store_id !== $storeOrder->store_id) {
            return false;
        }
        [$subtotal, $quantity, $products] = $this->eligibleLines($campaign, $storeOrder);
        $reason = $this->campaignCandidateRejection($campaign, $storeOrder, $subtotal, $quantity);
        $amount = $this->rewardCents($campaign->reward_type, $campaign->reward_amount, $subtotal, $campaign->max_reward_per_order);
        if ($amount <= 0) { $reason ??= 'Campaign produced no payable referral reward.'; }
        $risk = $this->riskFlags($storeOrder->order->user, $attribution);
        $status = $reason ? 'rejected' : (array_key_exists('unverified_email', $risk) || array_key_exists('unverified_phone', $risk) ? 'suspended' : 'pending');
        $reward = ReferralReward::firstOrCreate(['idempotency_key' => "seller:campaign:{$campaign->id}:store-order:{$storeOrder->id}"], [
            'source' => 'seller_campaign', 'status' => $status, 'referral_conversion_id' => $storeOrder->order->user->referralConversion?->id,
            'referral_attribution_id' => $attribution->id, 'referral_campaign_id' => $campaign->id,
            'referrer_user_id' => $attribution->referrer_user_id, 'referred_user_id' => $storeOrder->order->user_id,
            'order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id, 'reward_type' => $campaign->reward_type,
            'reward_value' => $campaign->reward_amount, 'eligible_subtotal' => Money::decimal($subtotal), 'eligible_quantity' => $quantity,
            'amount' => Money::decimal($amount), 'reason' => $reason, 'rejected_at' => $status === 'rejected' ? now() : null,
            'suspended_at' => $status === 'suspended' ? now() : null, 'risk_flags' => $risk,
            'terms_snapshot' => $this->campaignTerms($campaign, $products),
        ]);
        if ($status !== 'pending') { $this->audit('reward.'.$status, null, $campaign, $reward, $reason, ['risk_flags' => $risk]); }
        return $status !== 'rejected';
    }

    private function createPlatformCandidate(Order $order, StoreOrder $trigger, ReferralConversion $conversion): void
    {
        $settings = $this->settings();
        $order->loadMissing('storeOrders.items.product');
        $subtotal = 0;
        $quantity = 0;
        $products = [];
        foreach ($order->storeOrders as $shipment) {
            foreach ($shipment->items as $item) {
                $subtotal += Money::cents($item->line_total);
                $quantity += (int) $item->quantity;
                $products[] = $item->product_name;
            }
        }
        $reason = $subtotal < Money::cents($settings['platform_referral_minimum_order_amount']) ? 'Order is below the platform referral minimum.' : null;
        $amount = $this->rewardCents((string) $settings['platform_referral_reward_type'], $settings['platform_referral_reward_amount'], $subtotal, $settings['platform_referral_max_reward_per_order']);
        $risk = $this->riskFlags($order->user, $conversion->attribution);
        $status = $reason ? 'rejected' : ((isset($risk['unverified_email']) || isset($risk['unverified_phone'])) ? 'suspended' : 'pending');
        ReferralReward::firstOrCreate(['idempotency_key' => 'platform:order:'.$order->id], [
            'source' => 'platform', 'status' => $status, 'referral_conversion_id' => $conversion->id,
            'referral_attribution_id' => $conversion->initial_attribution_id, 'referrer_user_id' => $conversion->referrer_user_id,
            'referred_user_id' => $order->user_id, 'order_id' => $order->id, 'reward_type' => $settings['platform_referral_reward_type'],
            'reward_value' => $settings['platform_referral_reward_amount'], 'eligible_subtotal' => Money::decimal($subtotal), 'eligible_quantity' => $quantity,
            'amount' => Money::decimal($amount), 'reason' => $reason, 'rejected_at' => $status === 'rejected' ? now() : null,
            'suspended_at' => $status === 'suspended' ? now() : null, 'risk_flags' => $risk,
            'terms_snapshot' => ['program' => 'platform', 'trigger_store_order_id' => $trigger->id, 'settings' => $settings,
                'products' => array_values(array_unique($products))],
        ]);
    }

    private function qualifyAndFund(int $id): void
    {
        DB::transaction(function () use ($id) {
            $reward = ReferralReward::with(['campaign', 'order.storeOrders', 'storeOrder', 'referrer', 'referred', 'conversion'])->whereKey($id)->lockForUpdate()->first();
            if (! $reward || $reward->status !== 'pending' || ! $reward->qualifies_at?->isPast()) { return; }
            if (! $this->rewardOrderIsQualifying($reward)) { return; }
            $risk = ($reward->terms_snapshot['admin_override'] ?? false) ? [] : $this->riskFlags($reward->referred, $reward->attribution);
            if ($risk) {
                if (isset($risk['unverified_email']) || isset($risk['unverified_phone'])) {
                    $reward->update(['status' => 'suspended', 'suspended_at' => now(), 'risk_flags' => $risk, 'reason' => 'Buyer verification is required.']);
                    return;
                }
            }
            if ($reward->source === 'platform') {
                if (ReferralReward::where('source', 'seller_campaign')->where('order_id', $reward->order_id)
                    ->whereIn('status', ['pending', 'qualified', 'rewarded'])->whereHas('campaign', fn ($q) => $q->where('platform_stacking', 'exclusive'))->exists()) {
                    $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => 'Seller campaign has priority for this purchase.']);
                    return;
                }
                $alreadyPaid = ReferralReward::where('source', 'platform')->where('referred_user_id', $reward->referred_user_id)
                    ->where('id', '!=', $reward->id)->whereIn('status', ['qualified', 'rewarded'])->exists();
                if ($alreadyPaid) {
                    $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => 'Platform referral reward was already used.']);
                    return;
                }
                $monthlyLimit = (int) ($this->settings()['platform_referral_monthly_reward_limit'] ?? 0);
                if ($monthlyLimit > 0 && ReferralReward::where('source', 'platform')
                    ->where('referrer_user_id', $reward->referrer_user_id)
                    ->where('id', '!=', $reward->id)
                    ->whereIn('status', ['qualified', 'rewarded'])
                    ->where('created_at', '>=', now()->startOfMonth())
                    ->count() >= $monthlyLimit) {
                    $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => 'Platform monthly reward limit reached.']);
                    return;
                }
            }
            if ($reward->source === 'seller_campaign' && ! $this->canFundSellerReward($reward)) { return; }
            $reward->update(['status' => 'qualified', 'qualified_at' => now()]);
            $this->fund($reward->fresh(['campaign', 'referrer', 'referred', 'storeOrder.items']));
        }, 5);
    }

    private function fund(ReferralReward $reward): void
    {
        $cents = Money::cents($reward->amount);
        abort_if($cents <= 0, 422, 'Referral reward amount must be positive.');
        $meta = $this->ledgerMeta($reward);
        $buyerTransaction = $this->buyers->change($reward->referrer, $cents, "referral-reward:{$reward->id}:buyer", 'referral_reward', $meta);
        $sellerEntry = null;
        $platformEntry = null;
        if ($reward->source === 'seller_campaign') {
            $campaign = ReferralCampaign::whereKey($reward->referral_campaign_id)->lockForUpdate()->firstOrFail();
            $wallet = $this->sellers->locked($campaign->store_id);
            $sellerEntry = $this->sellers->entry($wallet, "referral-reward:{$reward->id}:seller", 'referral_commission', -$cents,
                ['reserved_balance' => -$cents], $reward->store_order_id, null, null, 'Referral commission', $meta);
            $campaign->update(['budget_reserved' => Money::decimal(Money::cents($campaign->budget_reserved) - $cents),
                'budget_spent' => Money::decimal(Money::cents($campaign->budget_spent) + $cents)]);
        } else {
            $platformEntry = PlatformLedgerEntry::firstOrCreate(['reference' => "referral-reward:{$reward->id}:platform"], [
                'type' => 'platform_referral_reward', 'amount' => Money::decimal(-$cents),
                'description' => 'Platform-funded referral reward', 'metadata' => $meta,
            ]);
        }
        $reward->update(['status' => 'rewarded', 'rewarded_at' => now(), 'buyer_transaction_id' => $buyerTransaction->id,
            'seller_wallet_entry_id' => $sellerEntry?->id, 'platform_ledger_entry_id' => $platformEntry?->id]);
        if ($reward->conversion && ! $reward->conversion->first_qualifying_order_at) {
            $reward->conversion->update(['first_qualifying_order_at' => now()]);
        }
        $this->audit('reward.rewarded', null, $reward->campaign, $reward, null, ['buyer_transaction_id' => $buyerTransaction->id]);
    }

    private function canFundSellerReward(ReferralReward $reward): bool
    {
        $campaign = ReferralCampaign::whereKey($reward->referral_campaign_id)->lockForUpdate()->firstOrFail();
        $cents = Money::cents($reward->amount);
        $reason = null;
        if (Money::cents($campaign->budget_reserved) < $cents) { $reason = 'Campaign budget is exhausted.'; }
        if (! $reason && $campaign->usage_limit && $campaign->rewards()->where('id', '!=', $reward->id)->whereIn('status', ['pending', 'qualified', 'rewarded'])->count() >= $campaign->usage_limit) { $reason = 'Campaign usage limit reached.'; }
        if (! $reason && $campaign->monthly_reward_limit && $campaign->rewards()->where('id', '!=', $reward->id)->whereIn('status', ['pending', 'qualified', 'rewarded'])->where('created_at', '>=', now()->startOfMonth())->count() >= $campaign->monthly_reward_limit) { $reason = 'Campaign monthly reward limit reached.'; }
        if (! $reason && $campaign->per_buyer_limit && $campaign->rewards()->where('id', '!=', $reward->id)->where('referred_user_id', $reward->referred_user_id)->whereIn('status', ['pending', 'qualified', 'rewarded'])->count() >= $campaign->per_buyer_limit) { $reason = 'Campaign per-buyer limit reached.'; }
        if ($reason) {
            $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => $reason]);
            return false;
        }
        return true;
    }

    private function rewardOrderIsQualifying(ReferralReward $reward): bool
    {
        if ($reward->source === 'seller_campaign') {
            if (! $reward->storeOrder || $reward->storeOrder->status !== 'delivered' || $reward->storeOrder->payment_status !== 'paid') { return false; }
            if ($reward->campaign?->status === 'suspended') { $reward->update(['status' => 'suspended', 'suspended_at' => now(), 'reason' => 'Campaign is suspended.']); }
            return $reward->status === 'pending';
        }
        $shipments = $reward->order->storeOrders;
        if ($shipments->contains(fn ($so) => ! in_array($so->status, ['delivered', 'cancelled', 'refunded']))) { return false; }
        if (! $shipments->contains(fn ($so) => $so->status === 'delivered' && $so->payment_status === 'paid')) {
            $reward->update(['status' => 'rejected', 'rejected_at' => now(), 'reason' => 'Order has no delivered qualifying shipment.']);
            return false;
        }
        return true;
    }

    private function campaignCandidateRejection(ReferralCampaign $campaign, StoreOrder $storeOrder, int $subtotal, int $quantity): ?string
    {
        if ($subtotal <= 0) return 'No campaign-eligible product lines were purchased.';
        if ($subtotal < Money::cents($campaign->minimum_order_amount)) return 'Eligible subtotal is below the campaign minimum.';
        if ($quantity < $campaign->minimum_quantity) return 'Eligible quantity is below the campaign minimum.';
        if ($campaign->new_customer_only && ! (bool) $this->settings()['seller_referrals_allow_existing_buyers']) {
            $hasPrevious = StoreOrder::where('store_id', $campaign->store_id)->where('id', '!=', $storeOrder->id)
                ->whereHas('order', fn ($q) => $q->where('user_id', $storeOrder->order->user_id))
                ->where(fn ($q) => $q->whereNotNull('paid_at')->orWhere('status', 'delivered'))->exists();
            if ($hasPrevious) return 'Campaign is limited to new customers of this store.';
        }
        return null;
    }

    /** @return array{0:int,1:int,2:array<int,string>} */
    private function eligibleLines(ReferralCampaign $campaign, StoreOrder $storeOrder): array
    {
        $subtotal = 0; $quantity = 0; $products = [];
        foreach ($storeOrder->items as $item) {
            $product = $item->product;
            if ($product && $this->campaignIncludesProduct($campaign, $product)) {
                $subtotal += Money::cents($item->line_total); $quantity += (int) $item->quantity; $products[] = $item->product_name;
            }
        }
        return [$subtotal, $quantity, array_values(array_unique($products))];
    }

    private function campaignIncludesProduct(ReferralCampaign $campaign, Product $product): bool
    {
        if ($product->store_id !== $campaign->store_id) return false;
        return match ($campaign->scope_type) {
            'store' => true,
            'products' => $campaign->products->contains('id', $product->id),
            'categories' => $campaign->categories->contains('id', $product->category_id) || $campaign->categories->contains('id', $product->sub_category_id),
            'mixed' => $campaign->products->contains('id', $product->id) || $campaign->categories->contains('id', $product->category_id) || $campaign->categories->contains('id', $product->sub_category_id),
            default => false,
        };
    }

    private function rewardCents(string $type, mixed $value, int $subtotal, mixed $cap): int
    {
        $amount = $type === 'percentage' ? (int) round($subtotal * ((float) $value / 100)) : Money::cents($value);
        if ($cap !== null && $cap !== '') { $amount = min($amount, Money::cents($cap)); }
        return max(0, $amount);
    }

    private function riskFlags(User $buyer, ?ReferralAttribution $attribution): array
    {
        $settings = $this->settings(); $flags = [];
        if ((bool) $settings['referral_require_email_verification'] && ! $buyer->email_verified_at) $flags['unverified_email'] = true;
        if ((bool) $settings['referral_require_phone_verification'] && ! $buyer->phone_verified_at) $flags['unverified_phone'] = true;
        if ($attribution && $attribution->click?->ip_hash && ReferralClick::where('referral_code_id', $attribution->referral_code_id)
            ->where('ip_hash', $attribution->click->ip_hash)->where('id', '!=', $attribution->referral_click_id)->exists()) $flags['shared_ip_signal'] = true;
        if ($attribution && $attribution->click?->device_hash && ReferralClick::where('referral_code_id', $attribution->referral_code_id)
            ->where('device_hash', $attribution->click->device_hash)->where('id', '!=', $attribution->referral_click_id)->exists()) $flags['shared_device_signal'] = true;
        return $flags;
    }

    private function ledgerMeta(ReferralReward $reward): array
    {
        $reward->loadMissing(['campaign.store', 'storeOrder.items', 'order', 'referrer', 'referred']);
        return ['referral_reward_id' => $reward->id, 'source' => $reward->source, 'campaign_id' => $reward->referral_campaign_id,
            'campaign_name' => $reward->campaign?->name, 'seller_id' => $reward->campaign?->seller_id, 'store_id' => $reward->campaign?->store_id ?? $reward->storeOrder?->store_id,
            'referring_buyer_id' => $reward->referrer_user_id, 'referred_buyer_id' => $reward->referred_user_id,
            'order_id' => $reward->order_id, 'order_no' => $reward->order?->order_no, 'store_order_id' => $reward->store_order_id,
            'products' => $reward->terms_snapshot['products'] ?? $reward->storeOrder?->items?->pluck('product_name')->values()->all() ?? [], 'eligible_subtotal' => $reward->eligible_subtotal,
            'eligible_quantity' => $reward->eligible_quantity, 'reward_type' => $reward->reward_type, 'reward_value' => $reward->reward_value,
            'reward_amount' => $reward->amount, 'reward_status' => $reward->status];
    }

    private function campaignTerms(ReferralCampaign $campaign, array $products): array
    {
        return ['campaign_id' => $campaign->id, 'identifier' => $campaign->identifier, 'scope_type' => $campaign->scope_type,
            'reward_type' => $campaign->reward_type, 'reward_amount' => $campaign->reward_amount, 'max_reward_per_order' => $campaign->max_reward_per_order,
            'minimum_order_amount' => $campaign->minimum_order_amount, 'minimum_quantity' => $campaign->minimum_quantity,
            'new_customer_only' => $campaign->new_customer_only, 'products' => $products];
    }

    private function syncScope(ReferralCampaign $campaign, array $productIds, array $categoryIds): void
    {
        $productIds = array_values(array_unique(array_map('intval', $productIds)));
        $categoryIds = array_values(array_unique(array_map('intval', $categoryIds)));
        if (in_array($campaign->scope_type, ['products', 'mixed']) && ! $productIds) throw ValidationException::withMessages(['product_ids' => ['Select at least one product for this campaign scope.']]);
        if (in_array($campaign->scope_type, ['categories', 'mixed']) && ! $categoryIds) throw ValidationException::withMessages(['category_ids' => ['Select at least one category for this campaign scope.']]);
        if ($productIds && Product::whereIn('id', $productIds)->where('store_id', $campaign->store_id)->count() !== count($productIds)) throw ValidationException::withMessages(['product_ids' => ['Each selected product must belong to your store.']]);
        if ($categoryIds && Category::whereIn('id', $categoryIds)->count() !== count($categoryIds)) throw ValidationException::withMessages(['category_ids' => ['One or more selected categories do not exist.']]);
        $campaign->products()->sync(in_array($campaign->scope_type, ['products', 'mixed']) ? $productIds : []);
        $campaign->categories()->sync(in_array($campaign->scope_type, ['categories', 'mixed']) ? $categoryIds : []);
    }

    private function campaignIdentifier(int $storeId): string
    {
        do { $value = 'RC'.strtoupper(base_convert((string) $storeId, 10, 36)).'-'.strtoupper(Str::random(10)); }
        while (ReferralCampaign::where('identifier', $value)->exists());
        return $value;
    }

    private function archiveCampaign(ReferralCampaign $campaign, User $actor): void
    {
        $reserved = Money::cents($campaign->budget_reserved);
        // Archiving stops new traffic but preserves funding for paid-order
        // candidates already awaiting their qualification decision.
        $committed = Money::cents($campaign->rewards()->whereIn('status', ['pending', 'qualified', 'suspended'])->sum('amount'));
        $releasable = max(0, $reserved - $committed);
        if ($releasable > 0) {
            $wallet = $this->sellers->locked($campaign->store_id);
            $this->sellers->entry($wallet, "referral-campaign:{$campaign->id}:release", 'referral_campaign_release', $releasable,
                ['available_balance' => $releasable, 'reserved_balance' => -$releasable], null, null, null,
                "Referral campaign release: {$campaign->name}", ['referral_campaign_id' => $campaign->id]);
        }
        $campaign->update(['status' => 'archived', 'archived_at' => now(), 'budget_reserved' => Money::decimal($reserved - $releasable)]);
    }

    private function rejectCampaign(ReferralCampaign $campaign, User $actor, string $reason): void
    {
        $this->archiveCampaign($campaign, $actor);
        $campaign->update(['approval_status' => 'rejected', 'rejection_reason' => $reason]);
    }

    private function audit(string $action, ?User $actor, ?ReferralCampaign $campaign = null, ?ReferralReward $reward = null, ?string $reason = null, array $metadata = []): void
    {
        ReferralAuditLog::create(['referral_campaign_id' => $campaign?->id, 'referral_reward_id' => $reward?->id,
            'actor_id' => $actor?->id, 'action' => $action, 'reason' => $reason, 'metadata' => $metadata]);
    }
}
