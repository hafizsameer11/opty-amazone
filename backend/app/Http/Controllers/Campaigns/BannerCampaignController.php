<?php

namespace App\Http\Controllers\Campaigns;

use App\Http\Controllers\Controller;
use App\Http\Requests\Campaigns\BannerCampaignRequest;
use App\Helpers\ResponseHelper as R;
use App\Models\BannerCampaign;
use App\Services\Campaigns\{BannerCampaignService, CampaignAnalyticsService};
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{Gate, DB};

class BannerCampaignController extends Controller
{
    private function role(Request $r): void { abort_unless($r->is('api/admin/*') ? $r->user()->isAdmin() : $r->user()->role === 'seller' && $r->user()->store,403); }
    public function index(Request $r, CampaignAnalyticsService $analytics)
    {
        $this->role($r); $q=BannerCampaign::with('creatives','store:id,name');
        if (!$r->user()->isAdmin()) { $q->where('store_id',$r->user()->store->id); }
        foreach (['status','approval_status','placement','store_id','type'] as $f) { if ($r->filled($f)) { $q->where($f,$r->input($f)); } }
        if ($r->filled('search')) { $q->where('name','like','%'.$r->input('search').'%'); }
        $p=$q->latest()->paginate(min(100,max(1,(int) $r->input('per_page',20))));
        $p->getCollection()->transform(fn ($c)=>$c->toArray()+['analytics'=>$analytics->metrics($c)]); return R::success($p);
    }
    public function store(BannerCampaignRequest $r, BannerCampaignService $s)
    {
        $campaign = $s->save($r->user(), $r->validated());
        return R::success($s->action($campaign, $r->user(), 'submit'), 'Request sent to Admin for approval', 201);
    }
    public function update(BannerCampaignRequest $r, BannerCampaign $campaign, BannerCampaignService $s) { return R::success($s->save($r->user(),$r->validated(),$campaign)); }
    public function show(Request $r, BannerCampaign $campaign, CampaignAnalyticsService $s)
    {
        $this->role($r); Gate::authorize('view',$campaign); return R::success($campaign->load('creatives','store')->toArray()+['analytics'=>$s->metrics($campaign)]);
    }
    public function action(Request $r, BannerCampaign $campaign, BannerCampaignService $s)
    {
        $this->role($r); $d=$r->validate(['action'=>'required|in:submit,approve,reject,pause,resume,cancel,terminate,delete,duplicate','reason'=>'nullable|string|max:2000']);
        return R::success($s->action($campaign,$r->user(),$d['action'],$d['reason'] ?? null));
    }
    public function analytics(Request $r, BannerCampaign $campaign, CampaignAnalyticsService $s)
    {
        $this->role($r); Gate::authorize('view',$campaign); return R::success(['metrics'=>$s->metrics($campaign)]);
    }
    public function audits(Request $r, BannerCampaign $campaign)
    {
        $this->role($r); Gate::authorize('view',$campaign);
        $audits = DB::table('commerce_campaign_audits')->where('campaign_type','banner')->where('campaign_id',$campaign->id)->latest('id')->paginate(25);
        $audits->getCollection()->transform(function ($audit) {
            $audit->created_at = CarbonImmutable::parse($audit->created_at, 'UTC')->toISOString();
            $audit->updated_at = CarbonImmutable::parse($audit->updated_at, 'UTC')->toISOString();
            return $audit;
        });
        return R::success($audits);
    }
}
