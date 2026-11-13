<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vista360SubscriptionEvent extends Model
{
    protected $guarded = [];

    protected $casts = ['data' => 'array', 'occurred_at' => 'datetime'];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Vista360Subscription::class, 'vista360_subscription_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
