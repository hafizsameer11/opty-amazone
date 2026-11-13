<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vista360SubscriptionPayment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount_cents' => 'integer',
        'provider_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Vista360Subscription::class, 'vista360_subscription_id');
    }

    public function price(): BelongsTo
    {
        return $this->belongsTo(Vista360PlanPrice::class, 'vista360_plan_price_id');
    }
}
