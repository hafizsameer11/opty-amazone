<?php

namespace App\Http\Controllers\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\AdActionRequest;
use App\Http\Requests\Ads\AdListRequest;
use App\Http\Requests\Ads\CreateAdCampaignRequest;
use App\Models\AdCampaign;
use App\Models\Country;
use App\Models\Wallet;
use App\Services\Ads\AdAnalyticsService;
use App\Services\Ads\AdCampaignService;
use App\Services\Ads\AdEligibilityService;
use App\Services\Ads\AdMoney;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AdCampaignController extends Controller
{
    public function __construct(private AdCampaignService $campaigns, private AdAnalyticsService $analytics) {}

    private function scopeRole(Request $request): void
    {
        abort_unless($request->is('api/admin/*') ? $request->user()->isAdmin() : $request->user()->isSeller(), 403);
        Gate::authorize('viewAny', AdCampaign::class);
    }

    public function index(AdListRequest $request)
    {
        $this->scopeRole($request);
        $q = AdCampaign::with(['product:id,name,images,price,stock_quantity,is_approved', 'seller:id,name']);
        if (! $request->user()->isAdmin()) {
            $q->where('seller_id', $request->user()->id);
        }
        foreach (['status', 'payment_status', 'product_id', 'seller_id'] as $field) {
            if ($request->filled($field)) {
                $q->where($field, $request->validated($field));
            }
        }
        if ($request->filled('from')) {
            $q->whereDate('starts_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $q->whereDate('starts_at', '<=', $request->to);
        }
        $page = $q->latest('id')->paginate($request->integer('per_page', 20));
        $page->getCollection()->transform(fn ($c) => $this->analytics->summary($c));

        return response()->json(['data' => $page]);
    }

    public function options(Request $request, AdEligibilityService $eligibility)
    {
        $this->scopeRole($request);
        Gate::authorize('create', AdCampaign::class);
        $request->validate(['search' => 'sometimes|nullable|string|max:100', 'page' => 'sometimes|integer|min:1']);
        $products = $eligibility->products()->whereHas('store', fn ($q) => $q->where('user_id', $request->user()->id))
            ->whereNotIn('id', AdCampaign::whereNotIn('status', AdCampaign::TERMINAL)->select('product_id'))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->search.'%'))
            ->select(['id', 'name', 'images', 'price', 'stock_quantity', 'is_approved', 'stock_status'])
            ->withSum(['variants as available_variant_stock' => fn ($v) => $v->where('stock_status', 'in_stock')], 'stock_quantity')
            ->orderBy('id')->paginate(20);
        $products->getCollection()->each(function ($p) {
            if ($p->available_variant_stock !== null) {
                $p->stock_quantity = (int) $p->available_variant_stock;
            }
        });
        $wallet = Wallet::where('user_id', $request->user()->id)->first();

        return response()->json(['data' => [
            'products' => $products, 'locations' => Country::where('is_active', true)->orderBy('name')->get(['code', 'name']),
            'placements' => config('ads.placements'), 'bid_types' => ['cpc'], 'currency' => 'EUR',
            'review_required' => (bool) config('ads.review_required'),
            'ad_credit_cents' => $wallet ? AdMoney::cents($wallet->ad_credit) : 0,
            'shopping_cents' => $wallet ? AdMoney::cents($wallet->shopping_balance) : 0,
        ]]);
    }

    public function store(CreateAdCampaignRequest $request)
    {
        $this->scopeRole($request);
        $c = $this->campaigns->create($request->user(), $request->validated());

        return response()->json(['data' => $this->analytics->summary($c->refresh()->load('product'))], 201);
    }

    public function show(Request $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        Gate::authorize('view', $campaign);

        return response()->json(['data' => $this->analytics->summary($campaign->load('product', 'seller:id,name'))]);
    }

    public function action(AdActionRequest $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        $c = $this->campaigns->action($campaign, $request->user(), $request->action, $request->reason);

        return response()->json(['data' => $this->analytics->summary($c->load('product'))]);
    }

    public function analytics(Request $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        Gate::authorize('view', $campaign);

        return response()->json(['data' => $this->analytics->report($campaign)]);
    }

    public function transactions(Request $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        Gate::authorize('view', $campaign);

        return response()->json(['data' => $campaign->transactions()->latest('id')->paginate(30)]);
    }

    public function audits(Request $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        Gate::authorize('review', $campaign);

        return response()->json(['data' => $campaign->audits()->latest('id')->paginate(30)]);
    }

    public function duplicate(Request $request, AdCampaign $campaign)
    {
        $this->scopeRole($request);
        Gate::authorize('manage', $campaign);
        abort_unless($campaign->terminal(), 422, 'Only finished campaigns can be duplicated.');

        // Return a template for explicit review and NEW reservation, never charge on duplicate.
        return response()->json(['data' => [
            'product_id' => $campaign->product_id, 'name' => $campaign->name.' (copy)',
            'budget_type' => $campaign->budget_type, 'budget_amount' => AdMoney::decimal($campaign->budget_amount_cents),
            'bid_type' => 'cpc', 'bid_amount' => AdMoney::decimal($campaign->bid_cents),
            'locations' => $campaign->locations, 'placements' => $campaign->placements,
        ]]);
    }
}
