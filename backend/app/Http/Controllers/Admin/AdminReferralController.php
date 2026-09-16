<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\ReferralCampaign;
use App\Models\ReferralConversion;
use App\Models\ReferralReward;
use App\Models\ReferralAuditLog;
use App\Services\Admin\AdminActivityLogger;
use App\Services\Referrals\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminReferralController extends Controller
{
    public function settings(ReferralService $referrals) { return R::success($referrals->settings()); }

    public function updateSettings(Request $request, ReferralService $referrals)
    {
        $data = $request->validate([
            'platform_referrals_enabled' => 'sometimes|boolean', 'platform_referral_reward_type' => ['sometimes', Rule::in(['fixed', 'percentage'])],
            'platform_referral_reward_amount' => 'sometimes|numeric|gt:0|max:100000', 'platform_referral_max_reward_per_order' => 'nullable|numeric|gt:0|max:100000',
            'platform_referral_minimum_order_amount' => 'sometimes|numeric|min:0|max:1000000', 'referral_attribution_days' => 'sometimes|integer|min:1|max:365',
            'referral_reward_waiting_days' => 'sometimes|integer|min:0|max:365', 'platform_referral_monthly_reward_limit' => 'nullable|integer|min:1|max:1000000',
            'platform_referral_per_buyer_limit' => 'nullable|integer|min:1|max:1000', 'seller_referrals_require_approval' => 'sometimes|boolean',
            'seller_referrals_allow_existing_buyers' => 'sometimes|boolean', 'referral_require_email_verification' => 'sometimes|boolean',
            'referral_require_phone_verification' => 'sometimes|boolean', 'referral_allow_platform_stacking' => 'sometimes|boolean',
        ]);
        if (($data['platform_referral_reward_type'] ?? null) === 'percentage') validator($data, ['platform_referral_reward_amount' => 'numeric|gt:0|max:100'])->validate();
        PlatformSetting::setMany($data);
        AdminActivityLogger::log($request->user(), 'referrals.settings.update', 'platform_settings', null, true, $data, $request);
        return R::success($referrals->settings(), 'Referral settings updated.');
    }

    public function campaigns(Request $request, ReferralService $referrals)
    {
        $referrals->activateDueCampaigns();
        $rows = ReferralCampaign::with(['store:id,name', 'seller:id,name,email', 'products:id,name', 'categories:id,name'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('approval_status'), fn ($q) => $q->where('approval_status', $request->string('approval_status')))->latest('id')->paginate(25);
        $rows->getCollection()->transform(fn (ReferralCampaign $campaign) => $campaign->setAttribute('analytics', $referrals->campaignAnalytics($campaign)));
        return R::success($rows);
    }

    public function campaignAction(Request $request, int $id, ReferralService $referrals)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['approve', 'reject', 'suspend', 'archive'])], 'reason' => 'nullable|string|max:2000']);
        if (in_array($data['action'], ['reject', 'suspend']) && empty($data['reason'])) abort(422, 'A reason is required.');
        return R::success($referrals->setCampaignStatus(ReferralCampaign::findOrFail($id), $request->user(), $data['action'], $data['reason'] ?? null));
    }

    public function conversions(Request $request)
    {
        return R::success(ReferralConversion::with(['referrer:id,name,email', 'referred:id,name,email', 'campaign:id,name,identifier', 'attribution'])
            ->when($request->filled('campaign_id'), fn ($q) => $q->where('initial_campaign_id', $request->integer('campaign_id')))->latest('id')->paginate(25));
    }

    public function rewards(Request $request)
    {
        return R::success(ReferralReward::with(['campaign:id,name,identifier,store_id', 'referrer:id,name,email', 'referred:id,name,email', 'order:id,order_no', 'storeOrder:id,store_id', 'buyerTransaction', 'sellerWalletEntry', 'platformLedgerEntry', 'reversal'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('source'), fn ($q) => $q->where('source', $request->string('source')))
            ->when($request->filled('campaign_id'), fn ($q) => $q->where('referral_campaign_id', $request->integer('campaign_id')))->latest('id')->paginate(25));
    }

    public function rewardAction(Request $request, int $id, ReferralService $referrals)
    {
        $data = $request->validate(['action' => ['required', Rule::in(['approve', 'reject', 'suspend', 'reverse'])], 'reason' => 'required|string|min:3|max:2000']);
        $reward = $referrals->adminRewardAction(ReferralReward::findOrFail($id), $request->user(), $data['action'], $data['reason']);
        AdminActivityLogger::log($request->user(), 'referrals.reward.'.$data['action'], 'referral_rewards', $id, true, ['reason' => $data['reason']], $request);
        return R::success($reward->fresh(['buyerTransaction', 'sellerWalletEntry', 'platformLedgerEntry', 'reversal']));
    }

    public function audit(Request $request)
    {
        return R::success(ReferralAuditLog::with(['actor:id,name,email', 'campaign:id,name', 'reward:id,status,amount'])->latest('id')->paginate(50));
    }

    public function export(Request $request)
    {
        $rows = ReferralReward::with(['campaign:id,name,identifier', 'referrer:id,name,email', 'referred:id,name,email', 'order:id,order_no'])->latest('id')->get();
        $filename = 'referral-finance-'.now()->format('Ymd-His').'.csv';
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Reward ID', 'Source', 'Status', 'Campaign', 'Referrer', 'Referred buyer', 'Order', 'Eligible subtotal', 'Reward amount', 'Funded at', 'Reversed at']);
            foreach ($rows as $row) fputcsv($out, [$row->id, $row->source, $row->status, $row->campaign?->name, $row->referrer?->email, $row->referred?->email, $row->order?->order_no, $row->eligible_subtotal, $row->amount, optional($row->rewarded_at)->toIso8601String(), optional($row->reversed_at)->toIso8601String()]);
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
