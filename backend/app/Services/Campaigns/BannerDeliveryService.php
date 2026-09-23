<?php

namespace App\Services\Campaigns;

use App\Models\{BannerCampaign, BannerCreative, BannerEvent, StoreOrder};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Crypt, DB};
use Illuminate\Support\Str;

class BannerDeliveryService
{
    public const PLACEMENTS = ['homepage_hero','homepage_featured','category_page','store_page','sidebar'];
    public function __construct(private BannerDestinationService $destination) {}

    public function eligible(BannerCampaign $c): bool
    {
        return $c->type === 'organic' && $c->approval_status === 'approved' && in_array($c->status,['active','scheduled'])
            && !$c->starts_at->isFuture() && $c->ends_at->isFuture() && $c->store?->is_active && $c->store->status === 'active'
            && $this->destination->resolve($c) !== null;
    }

    public function visitor(Request $request): string
    {
        $visitor = (string) $request->header('X-Campaign-Visitor', '');
        abort_unless(Str::isUuid($visitor),422,'A valid campaign visitor ID is required.');
        return hash_hmac('sha256',$visitor,config('app.key'));
    }

    public function deliver(Request $request, string $placement): array
    {
        abort_unless(in_array($placement,self::PLACEMENTS),404);
        $visitor = $this->visitor($request);
        $now = now('UTC')->toImmutable();
        app(CommerceCampaignLifecycleService::class)->refreshForStores(
            BannerCampaign::query()->where('type', 'organic')->where('placement', $placement)->pluck('store_id')->all(),
            $now,
        );

        $all = BannerCampaign::with('store','creatives')->where('type','organic')->where('approval_status','approved')
            ->where('status', 'active')->where('starts_at','<=',$now)->where('ends_at','>',$now)->where('placement',$placement)->get();
        // Rotate fairly across stores; a store can occupy at most one slot per placement.
        $all = $all->filter(fn ($c) => $this->eligible($c)
            && (empty($c->targeting['category_id']) || (int) $c->targeting['category_id'] === (int) $request->input('category_id'))
            && (empty($c->targeting['store_id']) || (int) $c->targeting['store_id'] === (int) $request->input('store_id')))
            ->sortBy(fn ($c) => hash('sha256',$visitor.now()->format('YmdHi').$c->store_id))->groupBy('store_id');
        $out = [];
        foreach ($all as $storeCampaigns) {
            $c = $storeCampaigns->sortByDesc('priority')->first();
            $creative = $c->creatives->where('is_active',true)->sortBy('sort_order')->first();
            if (!$creative || !$creative->alt_text) { continue; }
            $nonce = (string) Str::uuid();
            $token = Crypt::encryptString(json_encode(['campaign'=>$c->id,'creative'=>$creative->id,'revision'=>$c->revision,
                'visitor'=>$visitor,'nonce'=>$nonce,'expires'=>now()->addMinutes(30)->timestamp,'placement'=>$placement]));
            $out[] = ['id'=>$c->id,'name'=>$c->name,'placement'=>$placement,'ends_at'=>$c->ends_at->utc()->toISOString(),'creative'=>$creative,
                'destination'=>$this->destination->resolve($c),'tracking_token'=>$token];
            // Homepage banner placements are client-side carousels. Keep a fair one
            // campaign per store, but deliver enough approved campaigns for a
            // useful rotation instead of silently reducing it to one card.
            if (count($out) >= (in_array($placement, ['homepage_hero', 'homepage_featured']) ? 10 : 6)) { break; }
        }
        return $out;
    }

    public function event(Request $request): void
    {
        $data = $request->validate(['tracking_token'=>'required|string|max:8192','type'=>'required|in:impression,click']);
        try { $token = json_decode(Crypt::decryptString($data['tracking_token']),true,512,JSON_THROW_ON_ERROR); }
        catch (\Throwable) { abort(422,'Invalid tracking token.'); }
        abort_unless(($token['expires'] ?? 0) >= now()->timestamp && hash_equals($token['visitor'] ?? '', $this->visitor($request)),403);
        DB::transaction(function () use ($request,$data,$token) {
            $c = BannerCampaign::lockForUpdate()->findOrFail($token['campaign']);
            abort_unless($this->eligible($c) && (int) $token['revision'] === (int) $c->revision && $token['placement'] === $c->placement,422);
            abort_unless($c->creatives()->whereKey($token['creative'])->where('is_active',true)->exists(),422);
            if ($data['type'] === 'click') {
                abort_unless(BannerEvent::where('nonce',$token['nonce'])->where('type','impression')->exists(),422,'Impression required.');
            }
            BannerEvent::firstOrCreate(['nonce'=>$token['nonce'],'type'=>$data['type']],
                ['banner_campaign_id'=>$c->id,'banner_creative_id'=>$token['creative'],'visitor_hash'=>$token['visitor'],
                    'user_id'=>$request->user('sanctum')?->id]);
        });
    }

    public function associateClick(Request $request): void
    {
        if (!$request->filled('banner_tracking_token') || !$request->user()) { return; }
        try {
            $token=json_decode(Crypt::decryptString($request->input('banner_tracking_token')),true,512,JSON_THROW_ON_ERROR);
            if (!hash_equals($token['visitor'] ?? '',$this->visitor($request))) { return; }
            BannerEvent::where('nonce',$token['nonce'])->where('type','click')->where('visitor_hash',$token['visitor'])
                ->where('created_at','>=',now()->subDays(7))->whereNull('user_id')->update(['user_id'=>$request->user()->id]);
        } catch (\Throwable) { /* Invalid attribution must not prevent a legitimate cart update. */ }
    }

    /** Last eligible click, attributed only by a trusted paid order transition. */
    public function convert(StoreOrder $order): void
    {
        if (!in_array($order->status,['paid','out_for_delivery','delivered']) || !$order->escrow()->whereIn('status',['locked','released'])->exists()) { return; }
        DB::transaction(function () use ($order) {
            $locked = StoreOrder::lockForUpdate()->findOrFail($order->id);
            if (BannerEvent::where('store_order_id',$locked->id)->exists()) { return; }
            $clicks = BannerEvent::where('type','click')->where('user_id',$locked->order->user_id)->where('created_at','>=',$locked->created_at->copy()->subDays(7))
                ->where('created_at','<=',$locked->created_at)->latest('id')->get();
            foreach ($clicks as $click) {
                $c = $click->campaign;
                if (!$c || (int) $c->store_id !== (int) $locked->store_id) { continue; }
                $items = $locked->items;
                if ($c->destination_type === 'product') { $items = $items->where('product_id',$c->destination_id); }
                if ($c->destination_type === 'category') { $items = $items->filter(fn ($i) => in_array($c->destination_id,[$i->product?->category_id,$i->product?->sub_category_id])); }
                if ($c->destination_type === 'discount_campaign') { $items = $items->filter(fn ($i) => collect($i->campaign_pricing['campaigns'] ?? [])->contains('id',$c->destination_id)); }
                if ($items->isEmpty()) { continue; }
                BannerEvent::create(['banner_campaign_id'=>$c->id,'banner_creative_id'=>$click->banner_creative_id,'type'=>'conversion',
                    'visitor_hash'=>$click->visitor_hash,'nonce'=>(string) Str::uuid(),'user_id'=>$locked->order->user_id,'store_order_id'=>$locked->id,'revenue'=>$items->sum('line_total')]);
                break;
            }
        });
    }
}
