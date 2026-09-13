<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCampaignUsage extends Model
{
    protected $guarded = ['id'];
    public function campaign() { return $this->belongsTo(DiscountCampaign::class, 'discount_campaign_id'); }
    public function order() { return $this->belongsTo(Order::class); }
    public function buyer() { return $this->belongsTo(User::class, 'user_id'); }
}
