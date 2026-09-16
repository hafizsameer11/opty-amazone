<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\ReferralAttribution;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class BuyerReferralController extends Controller
{
    public function dashboard(Request $request, ReferralService $referrals)
    {
        if (! $this->referralSchemaIsReady()) {
            return R::error('The referral program is being updated. Please try again shortly.', null, 503);
        }

        $data = $request->validate(['product_id' => 'nullable|integer|exists:products,id']);

        return R::success($referrals->buyerDashboard($request->user(), $data['product_id'] ?? null), 'Referral dashboard retrieved.');
    }

    private function referralSchemaIsReady(): bool
    {
        foreach (['referral_codes', 'referral_campaigns', 'referral_campaign_products', 'referral_campaign_categories',
            'referral_clicks', 'referral_attributions', 'referral_conversions', 'referral_rewards'] as $table) {
            if (! Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    public function claim(Request $request, ReferralService $referrals)
    {
        $data = $request->validate(['token' => 'required|string|size:64']);

        return R::success($referrals->claimAttribution($request->user(), $data['token']), 'Referral attribution saved.');
    }

    public function attribution(Request $request, ReferralAttribution $attribution)
    {
        abort_unless($attribution->referred_user_id === $request->user()->id, 404);

        return R::success($attribution->load(['campaign.store:id,name', 'product:id,name', 'referrer:id,name']));
    }
}
