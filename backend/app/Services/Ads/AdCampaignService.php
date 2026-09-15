<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class AdCampaignService
{
    public function __construct(private AdBudgetService $budget, private AdEligibilityService $eligibility) {}

    public function create(User $seller, array $data): AdCampaign
    {
        Gate::forUser($seller)->authorize('create', AdCampaign::class);
        $hash = hash('sha256', json_encode($data));

        return DB::transaction(function () use ($seller, $data, $hash) {
            User::whereKey($seller->id)->lockForUpdate()->firstOrFail();
            $existing = AdCampaign::where('seller_id', $seller->id)->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                $this->require($existing->request_hash === $hash, 'idempotency_key', 'This request key was used for different campaign settings.');

                return $existing;
            }
            Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            $this->require($this->eligibility->productEligible($data['product_id'], $seller->id), 'product_id', 'Select your own approved, visible, in-stock product from an active store.');
            $this->require(! AdCampaign::where('product_id', $data['product_id'])->whereNotIn('status', AdCampaign::TERMINAL)->exists(), 'product_id', 'This product already has an open campaign.');
            // Match Discount Campaigns and Banners: interpret a wall-clock value in the
            // zone reported by the seller's device, then persist one unambiguous UTC
            // instant. A run-now campaign deliberately uses server time so approval
            // activates it immediately regardless of client clock skew.
            $timezone = $data['schedule_timezone'];
            $now = now('UTC')->toImmutable();
            $start = $data['launch_mode'] === 'run_now'
                ? $now
                : CarbonImmutable::parse($data['starts_at'], $timezone)->utc();
            $end = CarbonImmutable::parse($data['ends_at'], $timezone)->utc();
            if ($data['launch_mode'] === 'schedule') {
                $this->require($start->gt($now), 'starts_at', 'Choose a future start time when scheduling a campaign.');
            }
            $this->require($end->gt($start), 'ends_at', 'Choose an end time after the campaign start time.');
            $days = (int) $start->startOfDay()->diffInDays($end->subSecond()->startOfDay()) + 1;
            $this->require($days <= config('ads.max_days'), 'ends_at', 'Campaigns may run for at most 90 UTC calendar days.');
            $amount = AdMoney::cents($data['budget_amount']);
            $bid = AdMoney::cents($data['bid_amount']);
            $total = $data['budget_type'] === 'daily' ? $amount * $days : $amount;
            $this->require($amount >= 100 && $bid >= 1 && $bid <= $amount && $total <= config('ads.max_budget_cents'), 'budget_amount', 'Budget must be at least EUR 1, cover the bid, and total at most EUR 100,000.');
            $c = AdCampaign::create([
                'seller_id' => $seller->id, 'product_id' => $data['product_id'], 'name' => $data['name'],
                'starts_at' => $start, 'ends_at' => $end, 'schedule_timezone' => $timezone, 'budget_type' => $data['budget_type'],
                'budget_amount_cents' => $amount, 'budget_cents' => $total, 'bid_cents' => $bid,
                'bid_type' => 'cpc', 'locations' => $data['locations'], 'placements' => $data['placements'],
                'status' => 'pending_payment', 'payment_status' => 'unpaid', 'funding_source' => 'seller_wallet',
                'idempotency_key' => $data['idempotency_key'], 'request_hash' => $hash,
            ]);
            $this->audit($c, 'created', null, $seller->id);

            return $this->payLocked($c, $seller);
        }, 3);
    }

    public function action(AdCampaign $campaign, User $actor, string $action, ?string $reason = null): AdCampaign
    {
        $admin = $actor->isAdmin();
        Gate::forUser($actor)->authorize($admin ? ($action === 'refund' ? 'refund' : 'review') : 'manage', $campaign);

        return DB::transaction(function () use ($campaign, $actor, $action, $reason, $admin) {
            $c = AdCampaign::whereKey($campaign->id)->lockForUpdate()->firstOrFail();
            $this->require($c->status !== 'reconciliation_hold', 'campaign', 'Financial reconciliation is required before any action.');
            if ($action === 'approve' && $admin && $c->approved_at && in_array($c->status, ['scheduled', 'active'])) {
                return $c;
            }
            if ($action === 'pay') {
                $this->require(! $admin, 'action', 'Only the seller can authorize wallet reservation.');

                return $this->payLocked($c, $actor);
            }
            if (in_array($action, ['cancel', 'reject', 'terminate', 'refund'])) {
                $this->require($action === 'cancel' || $admin, 'action', 'Admin permission required.');
                if ($c->terminal()) {
                    return $c;
                }
                $this->require($action !== 'reject' || in_array($c->status, ['pending_review', 'legacy_review']), 'status', 'Only campaigns awaiting review can be rejected.');
                $status = ['cancel' => 'cancelled', 'reject' => 'rejected', 'terminate' => 'terminated', 'refund' => 'terminated'][$action];
                if ($action === 'reject') {
                    $c->rejection_reason = $reason;
                }
                $this->budget->release($c, $actor->id, $action === 'refund' ? 'refund' : 'release');
                $this->transition($c, $status, $action, $actor->id, $reason);

                return $c;
            }
            $this->require(! $c->terminal() && $c->payment_status === 'reserved', 'status', 'Campaign must have reserved funds and not be finished.');
            if ($action === 'pause') {
                if ($c->status === 'paused') {
                    if ($admin && $c->pause_source !== 'admin') {
                        $c->pause_source = 'admin';
                        $c->save();
                        $this->audit($c, 'admin_pause_hold', 'paused', $actor->id, $reason);
                    }

                    return $c;
                }
                $this->require(in_array($c->status, ['active', 'scheduled']), 'status', 'Only active or scheduled campaigns can be paused.');
                $c->pause_source = $admin ? 'admin' : 'seller';
                $this->transition($c, 'paused', 'paused', $actor->id, $reason);
            } elseif ($action === 'approve' || $action === 'resume') {
                $this->require($action !== 'approve' || ($admin && $c->status === 'pending_review'), 'status', 'Only admins can approve campaigns awaiting review.');
                $this->require($action !== 'resume' || ($c->status === 'paused' && ($admin || $c->pause_source !== 'admin')), 'status', 'This campaign cannot be resumed by this account.');
                $this->require($c->ends_at->gt(now()) && $c->remaining_cents >= $c->bid_cents && $this->eligibility->productEligible($c->product_id, $c->seller_id), 'campaign', 'Check campaign dates, stock, product approval and remaining budget.');
                $c->approved_at ??= now();
                $c->pause_source = null;
                $this->transition($c, $c->starts_at->gt(now()) ? 'scheduled' : 'active', $action, $actor->id, $reason);
            } else {
                $this->require(false, 'action', 'Unsupported campaign action.');
            }

            return $c;
        }, 3);
    }

    /**
     * Soft-delete only after delivery has stopped and all safely releasable money has
     * been returned. The financial, event and audit rows stay attached for traceability.
     */
    public function delete(AdCampaign $campaign, User $seller): void
    {
        Gate::forUser($seller)->authorize('manage', $campaign);

        DB::transaction(function () use ($campaign, $seller) {
            $c = AdCampaign::whereKey($campaign->id)->lockForUpdate()->firstOrFail();
            $this->require($c->status !== 'reconciliation_hold', 'campaign', 'Financial reconciliation is required before deletion.');

            if (! $c->terminal()) {
                $this->budget->release($c, $seller->id);
                $this->transition($c, 'cancelled', 'deleted', $seller->id, 'Seller deleted the campaign.');
            } else {
                $this->audit($c, 'deleted', $c->status, $seller->id, 'Seller deleted the campaign.');
            }

            $c->delete();
        }, 3);
    }

    private function payLocked(AdCampaign $c, User $actor): AdCampaign
    {
        if ($c->payment_status === 'reserved') {
            return $c;
        }
        $this->require(in_array($c->status, ['pending_payment', 'payment_failed']), 'status', 'This campaign cannot be paid. Legacy payments require reconciliation.');
        $this->require($c->ends_at->gt(now()) && $this->eligibility->productEligible($c->product_id, $c->seller_id), 'campaign', 'Product or campaign dates are no longer eligible.');
        if (! $this->budget->reserve($c, $actor->id)) {
            $c->payment_status = 'failed';
            $this->transition($c, 'payment_failed', 'reservation_failed', $actor->id, 'Insufficient available wallet funds.');

            return $c;
        }
        if (! config('ads.review_required')) {
            $c->approved_at = now();
        }
        $status = config('ads.review_required') ? 'pending_review' : ($c->starts_at->gt(now()) ? 'scheduled' : 'active');
        $this->transition($c, $status, 'funds_reserved', $actor->id);

        return $c;
    }

    public function refreshLifecycle(int $id): void
    {
        DB::transaction(function () use ($id) {
            $c = AdCampaign::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($c->terminal() || $c->status === 'legacy_review' || $c->status === 'reconciliation_hold') {
                return;
            }
            $status = null;
            if (! $this->eligibility->productEligible($c->product_id, $c->seller_id)) {
                $status = 'invalid';
            } elseif ($c->ends_at->lte(now())) {
                $status = 'completed';
            } elseif ($c->payment_status === 'reserved' && $c->remaining_cents < $c->bid_cents) {
                $status = 'exhausted';
            } elseif ($c->status === 'scheduled' && $c->starts_at->lte(now()) && $c->payment_status === 'reserved' && $c->approved_at) {
                $status = 'active';
            }
            if ($status) {
                if ($status !== 'active') {
                    $this->budget->release($c, null);
                }
                $this->transition($c, $status, 'lifecycle', null, $status === 'invalid' ? 'Product or seller is no longer eligible.' : null);
            }
        }, 3);
    }

    public function transition(AdCampaign $c, string $status, string $action, ?int $actor = null, ?string $reason = null): void
    {
        $old = $c->status;
        $c->status = $status;
        $c->save();
        if ($old !== $status) {
            $this->audit($c, $action, $old, $actor, $reason);
        }
    }

    public function audit(AdCampaign $c, string $action, ?string $from, ?int $actor = null, ?string $reason = null, array $metadata = []): void
    {
        $c->audits()->create(['actor_id' => $actor, 'action' => $action, 'from_status' => $from,
            'to_status' => $c->status, 'reason' => $reason, 'metadata' => $metadata, 'created_at' => now()]);
    }

    private function require(bool $condition, string $field, string $message): void
    {
        if (! $condition) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }
}
