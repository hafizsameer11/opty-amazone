<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdEvent extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = ['occurred_at' => 'datetime', 'is_unique' => 'boolean'];

    public function campaign()
    {
        return $this->belongsTo(AdCampaign::class, 'ad_campaign_id');
    }
}
