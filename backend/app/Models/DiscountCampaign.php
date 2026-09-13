<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountCampaign extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['starts_at'=>'immutable_datetime','ends_at'=>'immutable_datetime','stacking'=>'boolean','legacy_snapshot'=>'array','discount_value'=>'decimal:2','minimum_order_amount'=>'decimal:2','maximum_discount'=>'decimal:2'];
    public function store() { return $this->belongsTo(Store::class); }
    public function products() { return $this->belongsToMany(Product::class, 'discount_campaign_products'); }
    public function categories() { return $this->belongsToMany(Category::class, 'discount_campaign_categories'); }
    public function variants() { return $this->hasMany(DiscountCampaignVariant::class); }
    public function usages() { return $this->hasMany(DiscountCampaignUsage::class); }
}
