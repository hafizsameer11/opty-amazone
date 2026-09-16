<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\ReferralCampaign;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SellerReferralCampaignController extends Controller
{
    private function owned(Request $request, int $id): ReferralCampaign
    {
        $campaign = ReferralCampaign::with(['products:id,name', 'categories:id,name', 'store:id,name'])->findOrFail($id);
        abort_unless($request->user()->store && $campaign->store_id === $request->user()->store->id, 404);
        return $campaign;
    }

    public function index(Request $request, ReferralService $referrals)
    {
        abort_unless($request->user()->store, 404, 'Store not found.');
        $referrals->activateDueCampaigns();
        $campaigns = ReferralCampaign::with(['products:id,name', 'categories:id,name'])
            ->where('store_id', $request->user()->store->id)->latest('id')->paginate(min(100, max(1, $request->integer('per_page', 25))));
        $campaigns->getCollection()->transform(fn (ReferralCampaign $campaign) => $campaign->setAttribute('analytics', $referrals->campaignAnalytics($campaign)));
        return R::success($campaigns);
    }

    public function store(Request $request, ReferralService $referrals)
    {
        return R::success($referrals->createCampaign($request->user(), $this->validated($request)), 'Referral campaign created.', 201);
    }

    public function show(Request $request, int $id, ReferralService $referrals)
    {
        $referrals->activateDueCampaigns();
        $campaign = $this->owned($request, $id);
        return R::success(['campaign' => $campaign, 'analytics' => $referrals->campaignAnalytics($campaign),
            'rewards' => $campaign->rewards()->with(['referred:id,name,email', 'referrer:id,name,email', 'order:id,order_no', 'storeOrder:id,store_id'])->latest('id')->paginate(25)]);
    }

    public function update(Request $request, int $id, ReferralService $referrals)
    {
        return R::success($referrals->updateCampaign($this->owned($request, $id), $request->user(), $this->validated($request, true)), 'Referral campaign updated.');
    }

    public function action(Request $request, int $id, ReferralService $referrals)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['pause', 'resume', 'archive'])]]);
        return R::success($referrals->setCampaignStatus($this->owned($request, $id), $request->user(), $data['action']), 'Referral campaign updated.');
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $rules = [
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'scope_type' => [$partial ? 'sometimes' : 'required', Rule::in(['store', 'products', 'categories', 'mixed'])],
            'reward_type' => [$partial ? 'sometimes' : 'required', Rule::in(['fixed', 'percentage'])],
            'reward_amount' => [$partial ? 'sometimes' : 'required', 'numeric', 'gt:0', 'max:100000'],
            'max_reward_per_order' => 'nullable|numeric|gt:0|max:100000',
            'budget_amount' => [$partial ? 'sometimes' : 'required', 'numeric', 'gt:0', 'max:1000000'],
            'usage_limit' => 'nullable|integer|min:1|max:1000000', 'monthly_reward_limit' => 'nullable|integer|min:1|max:1000000',
            'per_buyer_limit' => 'nullable|integer|min:1|max:1000', 'minimum_order_amount' => 'nullable|numeric|min:0|max:1000000',
            'minimum_quantity' => 'nullable|integer|min:1|max:10000', 'new_customer_only' => 'nullable|boolean',
            'platform_stacking' => ['nullable', Rule::in(['exclusive', 'allow_platform'])],
            'activation_mode' => [$partial ? 'sometimes' : 'required', Rule::in(['immediate', 'scheduled'])],
            'starts_at' => 'nullable|date', 'ends_at' => 'nullable|date',
            'product_ids' => 'nullable|array|max:1000', 'product_ids.*' => 'integer|distinct',
            'category_ids' => 'nullable|array|max:1000', 'category_ids.*' => 'integer|distinct', 'metadata' => 'nullable|array',
        ];
        $data = $request->validate($rules);
        if (($data['reward_type'] ?? null) === 'percentage') {
            validator($data, ['reward_amount' => 'numeric|gt:0|max:100'])->validate();
        }
        return $data;
    }
}
