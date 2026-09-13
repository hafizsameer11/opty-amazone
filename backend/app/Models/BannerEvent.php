<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BannerEvent extends Model
{
    protected $guarded = ['id'];
    public function campaign() { return $this->belongsTo(BannerCampaign::class, 'banner_campaign_id'); }
}
