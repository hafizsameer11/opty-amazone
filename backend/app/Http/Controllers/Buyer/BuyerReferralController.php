<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\ReferralAttribution;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;

class BuyerReferralController extends Controller
{
    public function dashboard(Request $request, ReferralService $referrals)
    {
        $data = $request->validate(['product_id' => 'nullable|integer|exists:products,id']);
        return R::success($referrals->buyerDashboard($request->user(), $data['product_id'] ?? null), 'Referral dashboard retrieved.');
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
