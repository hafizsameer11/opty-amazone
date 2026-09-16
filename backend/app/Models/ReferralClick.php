<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralClick extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['clicked_at' => 'datetime'];

    public function code() { return $this->belongsTo(ReferralCode::class, 'referral_code_id'); }
    public function referrer() { return $this->belongsTo(User::class, 'referrer_user_id'); }
    public function campaign() { return $this->belongsTo(ReferralCampaign::class, 'referral_campaign_id'); }
    public function product() { return $this->belongsTo(Product::class); }
    public function attribution() { return $this->hasOne(ReferralAttribution::class); }
}
