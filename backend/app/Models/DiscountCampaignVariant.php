<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCampaignVariant extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];
    public function campaign() { return $this->belongsTo(DiscountCampaign::class, 'discount_campaign_id'); }
    public function product() { return $this->belongsTo(Product::class); }
}
