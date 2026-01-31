<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'billing_period',
        'max_products',
        'max_banners',
        'promotion_budget_limit',
        'has_analytics',
        'has_priority_support',
        'features',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'promotion_budget_limit' => 'decimal:2',
        'has_analytics' => 'boolean',
        'has_priority_support' => 'boolean',
        'features' => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Get subscriptions for this plan.
     */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}

