<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralAuditLog extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['metadata' => 'array'];

    public function campaign() { return $this->belongsTo(ReferralCampaign::class, 'referral_campaign_id'); }
    public function reward() { return $this->belongsTo(ReferralReward::class, 'referral_reward_id'); }
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
}
