<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;

class ReferralAttributionController extends Controller
{
    public function store(Request $request, ReferralService $referrals)
    {
        $data = $request->validate([
            'referrer_code' => 'required|string|max:48',
            'campaign_identifier' => 'nullable|string|max:80',
            'product_id' => 'nullable|integer',
        ]);
        return R::success($referrals->createAttribution($data['referrer_code'], $data['campaign_identifier'] ?? null,
            $data['product_id'] ?? null, $request->user(), $request->ip(), $request->userAgent()), 'Referral visit recorded.');
    }
}
