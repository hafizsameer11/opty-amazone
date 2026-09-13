<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Http\Requests\Campaigns\DiscountCampaignRequest;
use App\Helpers\ResponseHelper as R;
use App\Models\{DiscountCampaign, Product, Category};
use App\Services\Campaigns\{DiscountCampaignService, DiscountPricingService, CampaignAnalyticsService};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Gate, DB};

class DiscountCampaignController extends Controller
{
    private function role(Request $r): void { abort_unless($r->is('api/admin/*') ? $r->user()->isAdmin() : $r->user()->role === 'seller' && $r->user()->store,403); }
    public function index(Request $r, CampaignAnalyticsService $analytics)
    {
        $this->role($r); $q = DiscountCampaign::with('store:id,name','products:id,name','categories:id,name','variants');
        if (!$r->user()->isAdmin()) { $q->where('store_id',$r->user()->store->id); }
        foreach (['status','scope','store_id'] as $f) { if ($r->filled($f)) { $q->where($f,$r->input($f)); } }
        if ($r->filled('search')) { $q->where('name','like','%'.$r->input('search').'%'); }
        $p=$q->latest()->paginate(min(100,max(1,(int) $r->input('per_page',20))));
        $p->getCollection()->transform(fn ($c) => $c->toArray()+['analytics'=>$analytics->metrics($c)]); return R::success($p);
    }
    public function options(Request $r)
    {
        $this->role($r); return R::success(['products'=>Product::where('store_id',$r->user()->store->id)->with('variants','frameSizes','sizeVolumeVariants','eyeHygieneVariants')->get(),
            'categories'=>Category::where('is_active',true)->get(['id','name','slug']), 'discount_campaigns'=>DiscountCampaign::where('store_id',$r->user()->store->id)->get(['id','name','status']),
            'store'=>$r->user()->store->only('id','name')]);
    }
    public function store(DiscountCampaignRequest $r, DiscountCampaignService $s) { return R::success($s->save($r->user(),$r->validated()),'Created',201); }
    public function update(DiscountCampaignRequest $r, DiscountCampaign $campaign, DiscountCampaignService $s) { return R::success($s->save($r->user(),$r->validated(),$campaign)); }
    public function show(Request $r, DiscountCampaign $campaign, CampaignAnalyticsService $s)
    {
        $this->role($r); Gate::authorize('view',$campaign); return R::success($campaign->load('products','categories','variants','store')->toArray()+['analytics'=>$s->metrics($campaign)]);
    }
    public function action(Request $r, DiscountCampaign $campaign, DiscountCampaignService $s)
    {
        $this->role($r); $d=$r->validate(['action'=>'required|in:publish,pause,resume,cancel,duplicate','reason'=>'nullable|string|max:2000']);
        return R::success($s->action($campaign,$r->user(),$d['action'],$d['reason'] ?? null));
    }
    public function analytics(Request $r, DiscountCampaign $campaign, CampaignAnalyticsService $s)
    {
        $this->role($r); Gate::authorize('view',$campaign); return R::success(['metrics'=>$s->metrics($campaign),'usage'=>$campaign->usages()->latest()->paginate(25)]);
    }
    public function audits(Request $r, DiscountCampaign $campaign)
    {
        $this->role($r); Gate::authorize('view',$campaign); return R::success(DB::table('commerce_campaign_audits')->where('campaign_type','discount')->where('campaign_id',$campaign->id)->latest('id')->paginate(25));
    }
    public function preview(DiscountCampaignRequest $r, DiscountPricingService $pricing)
    {
        // Run the complete validation and scope construction, then roll back the temporary draft.
        DB::beginTransaction();
        try {
            $c=app(DiscountCampaignService::class)->save($r->user(),$r->validated());
            $c->status='active'; $c->starts_at=now()->subSecond(); $c->ends_at=now()->addMinute(); $c->save();
            $rows=[];
            foreach (Product::where('store_id',$c->store_id)->get() as $p) {
                $selections=$c->scope==='variants' ? $c->variants->where('product_id',$p->id)->map(fn ($v)=>[$v->variant_type=>$v->variant_id])->all() : [[]];
                foreach ($selections as $selection) {
                    if (isset($selection['frame_size_id'])) { $selection['variant_id']=\App\Models\FrameSize::find($selection['frame_size_id'])->product_variant_id; }
                    if ($pricing->matches($c,$p,$selection)) { $rows[]=['product'=>$p,'selection'=>$selection,'quantity'=>1]; }
                }
            }
            $quotes=$pricing->quote($rows,$r->user()->id);
            return R::success(['prices'=>array_map(fn ($i)=>['product_id'=>$rows[$i]['product']->id,'name'=>$rows[$i]['product']->name,'selection'=>$rows[$i]['selection']]+$quotes[$i],array_keys($quotes)),
                'note'=>'Preview uses one unit of each selected option and includes existing campaigns. Minimum quantity and amount rules still apply.']);
        } finally { DB::rollBack(); }
    }
}
