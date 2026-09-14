<?php

namespace App\Services\Campaigns;

use App\Models\{DiscountCampaign, Product, User};
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\{DB, Gate};
use Illuminate\Validation\ValidationException;

class DiscountCampaignService
{
    public function save(User $user, array $data, ?DiscountCampaign $campaign = null): DiscountCampaign
    {
        Gate::forUser($user)->authorize($campaign ? 'manage' : 'create', $campaign ?? DiscountCampaign::class);
        return DB::transaction(function () use ($user, $data, $campaign) {
            $c = $campaign ? DiscountCampaign::lockForUpdate()->findOrFail($campaign->id) : new DiscountCampaign(['store_id'=>$user->store->id,'creator_id'=>$user->id]);
            if ($c->exists && !in_array($c->status, ['draft','scheduled'])) { throw ValidationException::withMessages(['status'=>'Only draft or scheduled campaigns can be edited.']); }
            $timezone = $data['schedule_timezone'] ?? $c->schedule_timezone ?? 'UTC';
            $data['schedule_timezone'] = $timezone;
            $data['starts_at'] = CarbonImmutable::parse($data['starts_at'], $timezone)->utc();
            $data['ends_at'] = CarbonImmutable::parse($data['ends_at'], $timezone)->utc();
            $variants = [];
            foreach ($data['variants'] ?? [] as $v) {
                $model = ConfigurationPriceService::VARIANTS[$v['variant_type']]::findOrFail($v['variant_id']);
                if (!Product::whereKey($model->product_id)->where('store_id',$c->store_id)->exists()) { abort(403); }
                $variants[] = $v + ['product_id'=>$model->product_id];
            }
            foreach ($data['product_ids'] ?? [] as $id) { if (!Product::whereKey($id)->where('store_id', $c->store_id)->exists()) { abort(403); } }
            $fields = collect($data)->except(['product_ids','category_ids','variants'])->all();
            $c->fill($fields); $c->save();
            $c->products()->sync($data['scope'] === 'products' ? $data['product_ids'] : []);
            $c->categories()->sync($data['scope'] === 'categories' ? $data['category_ids'] : []);
            $c->variants()->delete();
            if ($data['scope'] === 'variants') { $c->variants()->createMany($variants); }
            CampaignAudit::record($c, $campaign ? 'updated' : 'created', $user->id);
            return $c->load('products','categories','variants');
        });
    }

    public function action(DiscountCampaign $campaign, User $user, string $action, ?string $reason = null): DiscountCampaign
    {
        Gate::forUser($user)->authorize('manage', $campaign);
        return DB::transaction(function () use ($campaign,$user,$action,$reason) {
            $c = DiscountCampaign::lockForUpdate()->findOrFail($campaign->id);
            if ($user->isAdmin() && !in_array($action,['pause','resume','cancel','delete'])) { abort(403); }
            if ($action === 'duplicate') {
                $copy = $c->replicate(['legacy_promotion_id','legacy_snapshot','review_reason']);
                $copy->name .= ' (copy)'; $copy->status = 'draft'; $copy->usage_count = 0; $copy->creator_id = $user->id;
                $copy->starts_at = now(); $copy->ends_at = now()->addDays(7); $copy->save();
                $copy->products()->sync($c->products->modelKeys()); $copy->categories()->sync($c->categories->modelKeys());
                foreach ($c->variants as $v) { $copy->variants()->create($v->only('product_id','variant_type','variant_id')); }
                CampaignAudit::record($copy,'duplicated',$user->id); return $copy;
            }
            if ($action === 'delete') {
                $c->status = 'cancelled';
                $c->save();
                CampaignAudit::record($c, 'deleted', $user->id, $reason);
                $c->delete();
                return $c;
            }
            $allowed = ['pause'=>['active','scheduled'], 'resume'=>['paused'], 'cancel'=>['draft','scheduled','active','paused'], 'publish'=>['draft']];
            if (!in_array($c->status, $allowed[$action] ?? [])) { throw ValidationException::withMessages(['status'=>'Invalid campaign transition.']); }
            if (in_array($action,['resume','publish']) && ($c->review_reason || $c->ends_at->isPast() || ($c->usage_limit && $c->usage_count >= $c->usage_limit))) {
                throw ValidationException::withMessages(['status'=>'Review the campaign, dates, and usage limit before activation.']);
            }
            $c->status = match($action) { 'pause'=>'paused', 'cancel'=>'cancelled', default=>$c->starts_at->isFuture() ? 'scheduled' : 'active' };
            $c->save(); CampaignAudit::record($c,$action,$user->id,$reason); return $c;
        });
    }
}
