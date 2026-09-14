<?php

namespace App\Services\Campaigns;

use App\Models\{BannerCampaign, User};
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\{DB, Gate};
use Illuminate\Validation\ValidationException;

class BannerCampaignService
{
    public function __construct(private BannerDestinationService $destinations) {}

    public function save(User $user, array $data, ?BannerCampaign $campaign = null): BannerCampaign
    {
        Gate::forUser($user)->authorize($campaign ? 'manage' : 'create', $campaign ?? BannerCampaign::class);
        return DB::transaction(function () use ($user,$data,$campaign) {
            $c = $campaign ? BannerCampaign::lockForUpdate()->findOrFail($campaign->id) : new BannerCampaign(['store_id'=>$user->store->id,'creator_id'=>$user->id,'status'=>'draft']);
            $isUpdate = $c->exists;
            if ($c->exists && in_array($c->status,['cancelled','expired','completed'])) { throw ValidationException::withMessages(['status'=>'Duplicate a finished campaign to create a new one.']); }
            $timezone = $data['schedule_timezone'] ?? $c->schedule_timezone ?? 'UTC';
            $data['schedule_timezone'] = $timezone;
            $data['starts_at'] = CarbonImmutable::parse($data['starts_at'], $timezone)->utc();
            $data['ends_at'] = CarbonImmutable::parse($data['ends_at'], $timezone)->utc();
            $c->fill(collect($data)->only(['name','type','starts_at','ends_at','schedule_timezone','placement','targeting','destination_type','destination_id','destination_url'])->all());
            if (!$this->destinations->resolve($c,true)) { throw ValidationException::withMessages(['destination_id'=>'Choose an eligible destination belonging to your store, or a safe URL.']); }
            if ($c->placement === 'category_page' && empty($c->targeting['category_id'])) { throw ValidationException::withMessages(['targeting.category_id'=>'Choose the category placement.']); }
            if ($c->placement === 'store_page') { $c->targeting = ['store_id'=>$c->store_id]; }
            if (!empty($c->targeting['store_id']) && (int) $c->targeting['store_id'] !== (int) $c->store_id) { abort(403); }
            // Every edit invalidates old delivery tokens and requires a fresh review.
            // It must return to a scheduled state until an administrator approves it again.
            if ($isUpdate) { $c->status = 'scheduled'; }
            $c->approval_status = 'pending'; $c->rejection_reason = null; $c->revision = ($c->revision ?? 0) + 1; $c->save();
            $creative = $c->creatives()->firstOrNew();
            foreach (['desktop_image','mobile_image'] as $field) {
                if (!empty($data[$field])) {
                    $path = $data[$field]->store('campaigns/'.$c->store_id.'/'.$c->id, 'public');
                    if (!$path) { throw new \RuntimeException('Image upload failed.'); }
                    $creative->$field = $path;
                }
            }
            $creative->fill(collect($data)->only(['title','description','alt_text','cta_text','sort_order','is_active'])->all());
            $creative->save(); CampaignAudit::record($c,$campaign ? 'updated_pending_review' : 'created',$user->id);
            return $c->load('creatives');
        });
    }

    public function action(BannerCampaign $campaign, User $user, string $action, ?string $reason = null): BannerCampaign
    {
        Gate::forUser($user)->authorize('manage',$campaign);
        return DB::transaction(function () use ($campaign,$user,$action,$reason) {
            $c = BannerCampaign::lockForUpdate()->findOrFail($campaign->id);
            if (!$user->isAdmin() && in_array($action,['approve','reject','terminate'])) { abort(403); }
            if ($action === 'duplicate' && !$user->isAdmin()) {
                $copy = $c->replicate(['legacy_banner_id','legacy_snapshot']); $copy->name .= ' (copy)'; $copy->status = 'draft';
                $copy->approval_status = 'pending'; $copy->rejection_reason = null; $copy->revision = 1;
                $copy->starts_at = now(); $copy->ends_at = now()->addDays(7); $copy->save();
                foreach ($c->creatives as $creative) { $new = $creative->replicate(); $new->banner_campaign_id = $copy->id; $new->save(); }
                CampaignAudit::record($copy,'duplicated',$user->id); return $copy->load('creatives');
            }
            if (in_array($c->status,['expired','cancelled','completed']) && $action !== 'delete') { throw ValidationException::withMessages(['status'=>'Campaign is finished.']); }
            if ($user->isAdmin() && in_array($action,['reject','terminate']) && !trim($reason ?? '')) { throw ValidationException::withMessages(['reason'=>'A reason is required for rejection or termination.']); }
            if (in_array($action,['approve','submit','resume'])) {
                if (!$c->ends_at->isFuture() || !$this->destinations->resolve($c,true) || !$c->creatives()->where('is_active',true)->where('alt_text','!=','')->exists()) {
                    throw ValidationException::withMessages(['campaign'=>'Check dates, destination and active creative before submission.']);
                }
            }
            switch ($action) {
                case 'submit':
                    if (!in_array($c->status,['draft','paused'])) { throw ValidationException::withMessages(['status'=>'Campaign already submitted.']); }
                    $c->approval_status='pending'; $c->status='scheduled'; break;
                case 'approve':
                    if ($c->approval_status !== 'pending') { throw ValidationException::withMessages(['approval_status'=>'Only pending campaigns can be approved.']); }
                    $c->approval_status='approved'; $c->rejection_reason=null; $c->status=$c->starts_at->isFuture() ? 'scheduled' : 'active'; break;
                case 'reject': $c->approval_status='rejected'; $c->rejection_reason=$reason; $c->status='paused'; break;
                case 'pause':
                    if (!in_array($c->status,['active','scheduled'])) { throw ValidationException::withMessages(['status'=>'Only running campaigns can be paused.']); }
                    $c->status='paused'; break;
                case 'resume':
                    if ($c->status !== 'paused') { throw ValidationException::withMessages(['status'=>'Only paused campaigns can be resumed.']); }
                    if ($c->approval_status !== 'approved') { throw ValidationException::withMessages(['approval_status'=>'An approved review is required before this banner can resume.']); }
                    $c->status=$c->starts_at->isFuture() ? 'scheduled' : 'active'; break;
                case 'cancel': case 'terminate': case 'delete': $c->status='cancelled'; break;
                default: throw ValidationException::withMessages(['action'=>'Unsupported action.']);
            }
            $c->revision++; $c->save(); CampaignAudit::record($c,$action,$user->id,$reason);
            if ($action === 'delete') { $c->delete(); }
            return $c->load('creatives');
        });
    }
}
