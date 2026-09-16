<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReferralCampaign extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'reward_amount' => 'decimal:2', 'max_reward_per_order' => 'decimal:2', 'budget_amount' => 'decimal:2',
        'budget_reserved' => 'decimal:2', 'budget_spent' => 'decimal:2', 'minimum_order_amount' => 'decimal:2',
        'new_customer_only' => 'boolean', 'starts_at' => 'datetime', 'ends_at' => 'datetime', 'archived_at' => 'datetime',
        'approved_at' => 'datetime', 'metadata' => 'array',
    ];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function products(): BelongsToMany { return $this->belongsToMany(Product::class, 'referral_campaign_products'); }
    public function categories(): BelongsToMany { return $this->belongsToMany(Category::class, 'referral_campaign_categories'); }
    public function rewards(): HasMany { return $this->hasMany(ReferralReward::class); }
    public function attributions(): HasMany { return $this->hasMany(ReferralAttribution::class); }

    public function isLive(): bool
    {
        return $this->status === 'active' && $this->approval_status === 'approved' && $this->starts_at->lte(now())
            && (! $this->ends_at || $this->ends_at->isFuture());
    }
}
