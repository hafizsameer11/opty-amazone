<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BannerCreative extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['is_active'=>'boolean'];
    protected $appends = ['desktop_url','mobile_url'];
    public function campaign() { return $this->belongsTo(BannerCampaign::class, 'banner_campaign_id'); }
    public function getDesktopUrlAttribute() { return $this->url($this->desktop_image); }
    public function getMobileUrlAttribute() { return $this->url($this->mobile_image ?: $this->desktop_image); }
    private function url($path) { return preg_match('~^https?://~i', $path ?? '') ? $path : \Illuminate\Support\Facades\Storage::disk('public')->url($path); }
}
