<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralAttribution extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['expires_at' => 'datetime', 'claimed_at' => 'datetime'];

    public function click() { return $this->belongsTo(ReferralClick::class, 'referral_click_id'); }
    public function code() { return $this->belongsTo(ReferralCode::class, 'referral_code_id'); }
    public function referrer() { return $this->belongsTo(User::class, 'referrer_user_id'); }
    public function campaign() { return $this->belongsTo(ReferralCampaign::class, 'referral_campaign_id'); }
    public function product() { return $this->belongsTo(Product::class); }
    public function referred() { return $this->belongsTo(User::class, 'referred_user_id'); }
}
