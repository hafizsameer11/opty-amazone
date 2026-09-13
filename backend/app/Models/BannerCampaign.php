<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BannerCampaign extends Model
{
    use \Illuminate\Database\Eloquent\SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['starts_at'=>'immutable_datetime','ends_at'=>'immutable_datetime','targeting'=>'array','legacy_snapshot'=>'array','paid_settings'=>'array'];
    public function store() { return $this->belongsTo(Store::class); }
    public function creatives() { return $this->hasMany(BannerCreative::class); }
    public function events() { return $this->hasMany(BannerEvent::class); }
}
