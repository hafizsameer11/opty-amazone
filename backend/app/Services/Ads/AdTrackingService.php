<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdTrackingService
{
    public function __construct(private AdAudienceService $audience, private AdEligibilityService $eligibility,
        private AdBudgetService $budget, private AdCampaignService $campaigns) {}

    public function claims(Request $request, string $token, bool $extended = false): array
    {
        try {
            $data = json_decode(Crypt::decryptString($token), true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['tracking_token' => 'Invalid tracking token.']);
        }
        $valid = isset($data['campaign'], $data['visitor'], $data['issued'], $data['expires'], $data['delivery'], $data['product'], $data['placement'], $data['location'])
            && hash_equals($data['visitor'], $this->audience->fingerprint($request))
            && ($data['user'] === null || $data['user'] === $this->audience->user($request)?->id)
            && ($extended ? $data['issued'] + config('ads.attribution_days') * 86400 : $data['expires']) >= now()->timestamp;
        if (! $valid) {
            throw ValidationException::withMessages(['tracking_token' => 'Tracking token expired or does not match this visitor.']);
        }

        return $data;
    }

    public function track(Request $request, string $token, string $type, ?int $productId = null): array
    {
        $claims = $this->claims($request, $token, in_array($type, ['product_view', 'add_to_cart']));
        if ($productId !== null && $claims['product'] !== $productId) {
            throw ValidationException::withMessages(['tracking_token' => 'Token is for a different product.']);
        }
        if (! in_array($type, ['impression', 'click', 'product_view', 'add_to_cart'])) {
            abort(422);
        }

        return DB::transaction(function () use ($request, $claims, $type) {
            $c = AdCampaign::whereKey($claims['campaign'])->lockForUpdate()->firstOrFail();
            $user = $this->audience->user($request);
            if (($user && ($user->is_blocked || ! $user->isBuyer())) || ($user && $user->id === $c->seller_id)) {
                return ['accepted' => false];
            }
            $visitor = $claims['visitor'];
            $today = now()->startOfDay();
            $hour = now()->format('Y-m-d-H');
            // One counted impression per hour, one billable click per visitor/campaign/UTC day.
            $key = hash('sha256', $c->id.'|'.$visitor.'|'.$type.'|'.($type === 'impression' ? $hour : $today->toDateString()));
            $prior = AdEvent::where('event_key', $key)->first();
            if ($prior) {
                // A guest may log in after viewing the product. Link only that same
                // signed delivery, without counting or billing a second event.
                if ($user && ! $prior->user_id && $prior->delivery_id === $claims['delivery']
                    && in_array($type, ['product_view', 'add_to_cart'])) {
                    $prior->update(['user_id' => $user->id]);
                }

                return ['accepted' => true, 'duplicate' => true];
            }
            $click = $c->events()->where('type', 'click')->where('delivery_id', $claims['delivery'])->first();
            if (in_array($type, ['product_view', 'add_to_cart'])) {
                if (! $click || ! $this->eligibility->productEligible($c->product_id, $c->seller_id)) {
                    return ['accepted' => false];
                }
            } else {
                if (! $this->eligibility->deliverable($c) || ! in_array($claims['placement'], $c->placements, true)
                    || ! $this->audience->matches($c, $request, $this->audience->location($request))) {
                    return ['accepted' => false];
                }
                if ($type === 'click' && ! $c->events()->where('type', 'impression')->where('delivery_id', $claims['delivery'])->exists()) {
                    return ['accepted' => false, 'reason' => 'impression_required'];
                }
            }
            if ($type === 'click' && ! $this->budget->spend($c, $key)) {
                return ['accepted' => false];
            }
            $unique = $type === 'impression' && ! $c->events()->where('type', 'impression')->where('visitor_hash', $visitor)->where('occurred_at', '>=', $today)->exists();
            AdEvent::create(['ad_campaign_id' => $c->id, 'type' => $type, 'event_key' => $key,
                'delivery_id' => $claims['delivery'], 'visitor_hash' => $visitor, 'user_id' => $user?->id,
                'placement' => $claims['placement'], 'location' => $claims['location'],
                'is_unique' => $unique, 'cost_cents' => $type === 'click' ? $c->bid_cents : 0, 'occurred_at' => now()]);
            $counter = ['impression' => 'impressions', 'click' => 'clicks', 'product_view' => 'product_views', 'add_to_cart' => 'add_to_carts'][$type];
            $c->$counter += 1;
            if ($unique) {
                $c->unique_impressions += 1;
            }
            $c->save();
            if ($type === 'click' && $c->remaining_cents < $c->bid_cents) {
                $this->budget->release($c, null);
                $this->campaigns->transition($c, 'exhausted', 'budget_exhausted');
            }

            return ['accepted' => true, 'duplicate' => false];
        }, 3);
    }

    public function trackCart(Request $request, int $productId): void
    {
        if (! $request->filled('ad_tracking_token')) {
            return;
        }
        // Attribution must never break a legitimate cart operation.
        try {
            $this->track($request, $request->string('ad_tracking_token')->toString(), 'add_to_cart', $productId);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
