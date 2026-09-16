<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralConversion extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['registered_at' => 'datetime', 'first_qualifying_order_at' => 'datetime'];

    public function referred() { return $this->belongsTo(User::class, 'referred_user_id'); }
    public function referrer() { return $this->belongsTo(User::class, 'referrer_user_id'); }
    public function code() { return $this->belongsTo(ReferralCode::class, 'referral_code_id'); }
    public function attribution() { return $this->belongsTo(ReferralAttribution::class, 'initial_attribution_id'); }
    public function campaign() { return $this->belongsTo(ReferralCampaign::class, 'initial_campaign_id'); }
    public function rewards() { return $this->hasMany(ReferralReward::class); }
}
