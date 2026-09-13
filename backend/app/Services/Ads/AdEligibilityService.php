<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

class AdEligibilityService
{
    public function products(): Builder
    {
        return Product::visibleToBuyers()->where('stock_status', 'in_stock')
            ->where(function ($stock) {
                // Colour/size stock is maintained separately from the parent product.
                $stock->where(function ($plain) {
                    $plain->doesntHave('variants')->where('stock_quantity', '>', 0);
                })
                    ->orWhereHas('variants', fn ($v) => $v->where('stock_status', 'in_stock')->where('stock_quantity', '>', 0));
            })
            ->whereHas('store', fn ($q) => $q->where('is_active', true)->where('status', 'active')
                ->whereHas('user', fn ($u) => $u->where('role', 'seller')->where('is_blocked', false)));
    }

    public function productEligible(int $productId, ?int $sellerId = null): bool
    {
        return $this->products()->whereKey($productId)
            ->when($sellerId, fn ($q) => $q->whereHas('store', fn ($s) => $s->where('user_id', $sellerId)))
            ->exists();
    }

    public function deliverable(AdCampaign $c): bool
    {
        return $c->status === 'active' && $c->payment_status === 'reserved' && $c->paid_at
            && $c->approved_at && $c->starts_at->lte(now()) && $c->ends_at->gt(now())
            && $c->remaining_cents >= $c->bid_cents && $c->bid_cents > 0
            && $this->productEligible($c->product_id, $c->seller_id) && $this->dailyAvailable($c);
    }

    public function dailyAvailable(AdCampaign $c): bool
    {
        if ($c->budget_type !== 'daily') {
            return true;
        }
        $spent = $c->transactions()->where('type', 'spend')->where('created_at', '>=', now()->startOfDay())->sum('amount_cents');

        return $spent + $c->bid_cents <= $c->budget_amount_cents;
    }
}
