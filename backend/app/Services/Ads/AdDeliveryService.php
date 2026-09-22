<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdEvent;
use App\Services\Campaigns\DiscountPricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class AdDeliveryService
{
    public function __construct(private AdEligibilityService $eligibility, private AdAudienceService $audience) {}

    public function deliver(Request $request, array $data): array
    {
        $location = $this->audience->location($request);
        $fingerprint = $this->audience->fingerprint($request);
        $placement = $data['placement'];
        // Cross-placement frequency cap: do not keep showing the same product each navigation.
        $seen = AdEvent::where('visitor_hash', $fingerprint)->where('type', 'impression')
            ->where('occurred_at', '>=', now()->subMinutes(30))->pluck('ad_campaign_id');
        $q = AdCampaign::with('product')->where('status', 'active')->where('payment_status', 'reserved')
            ->whereNotNull('approved_at')->whereNotNull('paid_at')->where('starts_at', '<=', now())->where('ends_at', '>', now())
            ->whereColumn('remaining_cents', '>=', 'bid_cents')->whereNotIn('id', $seen)
            ->whereIn('product_id', $this->eligibility->products()->select('products.id'));
        if (! empty($data['exclude_product_id'])) {
            $q->where('product_id', '!=', $data['exclude_product_id']);
        }
        if (! empty($data['category_id'])) {
            $q->whereHas('product', fn ($p) => $p->where(fn ($category) => $category->where('category_id', $data['category_id'])->orWhere('sub_category_id', $data['category_id'])));
        }
        $query = trim($data['query'] ?? '');
        if ($placement === 'search') {
            if (mb_strlen($query) < 2) {
                return [];
            }
            $q->whereHas('product', fn ($p) => $p->where(fn ($s) => $s->where('name', 'like', '%'.addcslashes($query, '%_\\').'%')->orWhere('description', 'like', '%'.addcslashes($query, '%_\\').'%')));
        }
        $ranked = $q->get()->filter(fn ($c) => in_array($placement, $c->placements, true)
            && $this->audience->matches($c, $request, $location) && $this->eligibility->deliverable($c))
            ->sortByDesc(fn ($c) => $this->score($c, $location, $query))->unique('product_id')->take(3);

        return $ranked->map(function ($c) use ($request, $fingerprint, $location, $placement) {
            $claims = ['campaign' => $c->id, 'product' => $c->product_id, 'delivery' => (string) Str::uuid(),
                'visitor' => $fingerprint, 'user' => $this->audience->user($request)?->id,
                'placement' => $placement, 'location' => $location, 'issued' => now()->timestamp,
                'expires' => now()->addMinutes(config('ads.token_minutes'))->timestamp];

            // Ads are catalog cards too. Use the same central price quote as
            // every other Buyer surface; never fall back to a stale product
            // price just because the item is sponsored.
            $product = app(DiscountPricingService::class)->product(
                $c->product,
                $request->user('sanctum')?->id,
            );

            // Public payload deliberately excludes seller financial and moderation data.
            return ['product' => collect($product)->only(['id', 'name', 'images', 'price', 'compare_at_price', 'pricing', 'category_id'])->all(),
                'label' => 'Sponsored', 'placement' => $placement,
                'tracking_token' => Crypt::encryptString(json_encode($claims))];
        })->values()->all();
    }

    public function score(AdCampaign $c, string $location, string $query = ''): float
    {
        $target = in_array($location, $c->locations, true) ? 1.2 : 1.0;
        $relevance = $query !== '' && str_contains(mb_strtolower($c->product->name), mb_strtolower($query)) ? 1.3 : 1.0;
        $quality = 1 + min(5, (float) $c->product->rating) / 10;
        $pacing = 0.5 + 0.5 * min(1, $c->remaining_cents / max(1, $c->budget_cents));

        return $c->bid_cents * $target * $relevance * $quality * $pacing;
    }
}
