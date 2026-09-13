<?php

namespace App\Services\Campaigns;

use App\Models\{BannerCampaign, Product, Category, Store, DiscountCampaign};

class BannerDestinationService
{
    public function safeUrl(?string $url, bool $external): bool
    {
        if (!$url || preg_match('/[\x00-\x20\\\\]/', $url) || preg_match('/%0[ad]|%5c/i', $url)) { return false; }
        if (!$external) { return str_starts_with($url, '/') && !str_starts_with($url, '//') && !str_starts_with(rawurldecode($url), '//'); }
        if (!filter_var($url, FILTER_VALIDATE_URL)) { return false; }
        $p = parse_url($url); $host = strtolower($p['host'] ?? '');
        if (($p['scheme'] ?? '') !== 'https' || isset($p['user']) || isset($p['pass']) || (isset($p['port']) && $p['port'] !== 443)) { return false; }
        if (in_array($host, ['localhost','localhost.localdomain']) || str_ends_with($host,'.local') || !str_contains($host,'.')) { return false; }
        if (filter_var($host,FILTER_VALIDATE_IP) && !filter_var($host,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE)) { return false; }
        return true;
    }

    public function resolve(BannerCampaign $c, bool $editing = false): ?string
    {
        if (in_array($c->destination_type, ['internal_url','external_url'])) {
            return $this->safeUrl($c->destination_url, $c->destination_type === 'external_url') ? $c->destination_url : null;
        }
        if ($c->destination_type === 'product') {
            $p = Product::whereKey($c->destination_id)->where('store_id',$c->store_id)->visibleToBuyers()->first();
            return $p ? '/products/'.$p->id : null;
        }
        if ($c->destination_type === 'category') {
            $category = Category::whereKey($c->destination_id)->where('is_active',true)->first();
            return $category ? '/categories/'.$category->slug : null;
        }
        if ($c->destination_type === 'store') {
            $store = Store::whereKey($c->destination_id)->whereKey($c->store_id)->where('is_active',true)->where('status','active')->first();
            return $store ? '/stores/'.$store->id : null;
        }
        if ($c->destination_type === 'discount_campaign') {
            $discount = DiscountCampaign::whereKey($c->destination_id)->where('store_id',$c->store_id)->first();
            if (!$discount || $discount->review_reason) { return null; }
            if (!$editing && (!in_array($discount->status,['active','scheduled']) || $discount->starts_at->isFuture() || !$discount->ends_at->isFuture()
                || ($discount->usage_limit && $discount->usage_count >= $discount->usage_limit))) { return null; }
            return '/campaigns/'.$discount->id;
        }
        return null;
    }
}
