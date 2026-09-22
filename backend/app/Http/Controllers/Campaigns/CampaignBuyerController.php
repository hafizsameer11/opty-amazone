<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper as R;
use App\Models\{Product, DiscountCampaign};
use App\Services\Campaigns\{CommerceCampaignLifecycleService, DiscountPricingService, BannerDeliveryService};
use Illuminate\Http\Request;

class CampaignBuyerController extends Controller
{
    public function price(Request $r, Product $product, DiscountPricingService $s)
    {
        abort_unless($product->is_active && $product->is_approved && !$product->is_muted,404);
        $d=$r->validate(['quantity'=>'sometimes|integer|min:1|max:100000','selection'=>'sometimes|array']);
        return R::success($s->quote([['product'=>$product,'quantity'=>$d['quantity'] ?? 1,'selection'=>$d['selection'] ?? []]],$r->user('sanctum')?->id)[0]);
    }
    public function discount(Request $r, DiscountCampaign $campaign, DiscountPricingService $s, CommerceCampaignLifecycleService $lifecycle)
    {
        $lifecycle->refreshForStores([(int) $campaign->store_id]);
        $campaign->refresh()->load(['products', 'categories', 'variants']);
        abort_unless(in_array($campaign->status,['active','scheduled']) && !$campaign->starts_at->isFuture() && $campaign->ends_at->isFuture() && !$campaign->review_reason,404);
        $products=Product::where('store_id',$campaign->store_id)->visibleToBuyers()->get()->filter(function ($p) use ($campaign,$s) {
            return $campaign->scope === 'variants' ? $campaign->variants->contains('product_id',$p->id) : $s->matches($campaign,$p,[]);
        })->map(fn ($p)=>$s->product($p,$r->user('sanctum')?->id))->values();
        return R::success(['campaign'=>$campaign->only('id','name','description','starts_at','ends_at','minimum_quantity','minimum_order_amount'),'products'=>$products]);
    }
    public function banners(Request $r, string $placement, BannerDeliveryService $s)
    {
        $r->validate(['category_id'=>'required_if:placement,category_page|nullable|integer|exists:categories,id','store_id'=>'nullable|integer|exists:stores,id']);
        abort_if($placement==='category_page' && !$r->integer('category_id'),422);
        abort_if($placement==='store_page' && !$r->integer('store_id'),422);
        return R::success($s->deliver($r,$placement))->header('Cache-Control','private, no-store');
    }
    public function event(Request $r, BannerDeliveryService $s) { $s->event($r); return R::success(['accepted'=>true]); }
}
