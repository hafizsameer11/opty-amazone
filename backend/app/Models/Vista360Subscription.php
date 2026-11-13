<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vista360Subscription extends Model
{
    public const PENDING = 'pending';
    public const SCHEDULED = 'scheduled';
    public const ACTIVE = 'active';
    public const EXPIRED = 'expired';
    public const SUSPENDED = 'suspended';
    public const CANCELLED = 'cancelled';
    public const PAYMENT_FAILED = 'payment_failed';

    protected $guarded = [];

    protected $casts = [
        'plan_snapshot' => 'array',
        'features_snapshot' => 'array',
        'price_snapshot' => 'array',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'activated_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'suspended_at' => 'datetime',
        'expired_at' => 'datetime',
        'entitlement_version' => 'integer',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Vista360Plan::class, 'vista360_plan_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Vista360SubscriptionPayment::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Vista360SubscriptionEvent::class);
    }
}
