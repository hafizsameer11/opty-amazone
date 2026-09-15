<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformLedgerEntry extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['amount' => 'decimal:2', 'metadata' => 'array'];

    public function campaign()
    {
        return $this->belongsTo(AdCampaign::class, 'ad_campaign_id')->withTrashed();
    }

    public function sellerWallet()
    {
        return $this->belongsTo(SellerWallet::class);
    }
}
