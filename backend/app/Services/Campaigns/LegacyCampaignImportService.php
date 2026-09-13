<?php

namespace App\Services\Campaigns;

use App\Models\{ProductPromotion, StoreBanner, DiscountCampaign, BannerCampaign};
use Illuminate\Support\Facades\DB;

class LegacyCampaignImportService
{
    public function import(): array
    {
        $counts=['discounts'=>0,'banners'=>0,'skipped_ads'=>0];
        ProductPromotion::chunkById(100,function ($rows) use (&$counts) {
            foreach ($rows as $legacy) {
                if (!$legacy->applies_to_price || !in_array($legacy->discount_type,['percentage','fixed']) || (float) $legacy->budget > 0) { $counts['skipped_ads']++; continue; }
                DB::transaction(function () use ($legacy,&$counts) {
                    $locked=ProductPromotion::lockForUpdate()->find($legacy->id);
                    if (DiscountCampaign::where('legacy_promotion_id',$legacy->id)->exists()) { return; }
                    $c=DiscountCampaign::create(['store_id'=>$legacy->store_id,'name'=>'Legacy discount #'.$legacy->id,'scope'=>'products',
                        'discount_type'=>$legacy->discount_type,'discount_value'=>$legacy->discount_value ?? 0,'status'=>'draft',
                        'starts_at'=>$legacy->start_date ?? now(),'ends_at'=>$legacy->end_date ?? now(),
                        'legacy_promotion_id'=>$legacy->id,'legacy_snapshot'=>['promotion'=>$locked->getAttributes(),'product'=>$legacy->product?->only('id','price','compare_at_price')],
                        'review_reason'=>'Manual review required: the legacy promotion may already be embedded in product.price. Original price cannot be independently proven. Prices were preserved.']);
                    if ($legacy->product) { $c->products()->attach($legacy->product_id); }
                    CampaignAudit::record($c,'legacy_import',null,$c->review_reason); $counts['discounts']++;
                });
            }
        });
        StoreBanner::chunkById(100,function ($rows) use (&$counts) {
            foreach ($rows as $legacy) {
                DB::transaction(function () use ($legacy,&$counts) {
                    StoreBanner::lockForUpdate()->find($legacy->id);
                    if (BannerCampaign::where('legacy_banner_id',$legacy->id)->exists()) { return; }
                    $destination=app(BannerDestinationService::class);
                    $internal=$destination->safeUrl($legacy->link,false); $external=$destination->safeUrl($legacy->link,true);
                    $c=BannerCampaign::create(['store_id'=>$legacy->store_id,'name'=>$legacy->title ?: 'Legacy banner #'.$legacy->id,
                        'type'=>'organic','status'=>$legacy->is_active ? 'active' : 'paused','approval_status'=>$legacy->is_approved ? 'approved' : ($legacy->rejection_reason ? 'rejected':'pending'),
                        'rejection_reason'=>$legacy->rejection_reason,'starts_at'=>$legacy->created_at ?? now(),'ends_at'=>now()->addYear(),
                        'placement'=>$legacy->position === 'sidebar' ? 'sidebar' : ($legacy->is_home_boosted ? ($legacy->position==='top' ? 'homepage_hero':'homepage_featured') : 'store_page'),
                        'targeting'=>!$legacy->is_home_boosted && $legacy->position!=='sidebar' ? ['store_id'=>$legacy->store_id] : null,
                        'destination_type'=>$internal ? 'internal_url' : ($external ? 'external_url':'store'),
                        'destination_id'=>!$internal && !$external ? $legacy->store_id : null,'destination_url'=>$legacy->link,
                        'legacy_banner_id'=>$legacy->id,'legacy_snapshot'=>$legacy->getAttributes()]);
                    if ($legacy->link && !$internal && !$external) { $c->status='paused'; $c->save(); }
                    $c->creatives()->create(['desktop_image'=>$legacy->image,'title'=>$legacy->title ?: $c->name,'alt_text'=>$legacy->title ?: $c->name,
                        'sort_order'=>$legacy->sort_order,'is_active'=>$legacy->is_active,'cta_text'=>'Explore']);
                    CampaignAudit::record($c,'legacy_import',null,'Original images, links, approval and active state retained in legacy snapshot. Imported schedule ends after one year; review before renewal.'); $counts['banners']++;
                });
            }
        });
        return $counts;
    }
}
