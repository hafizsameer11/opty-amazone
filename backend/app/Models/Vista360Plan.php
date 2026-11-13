<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vista360Plan extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'display_details' => 'array',
    ];

    public function prices(): HasMany
    {
        return $this->hasMany(Vista360PlanPrice::class);
    }

    public function features(): HasMany
    {
        return $this->hasMany(Vista360PlanFeature::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Vista360Subscription::class);
    }
}
