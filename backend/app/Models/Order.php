<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'delivery_address_snapshot', 'rewards_awarded_at',
        'user_id',
        'order_no',
        'payment_method',
        'payment_status',
        'items_total',
        'shipping_total',
        'platform_fee',
        'discount_total',
        'grand_total',
        'meta',
    ];

    protected $casts = [
        'delivery_address_snapshot' => 'array', 'rewards_awarded_at' => 'datetime',
        'items_total' => 'decimal:2',
        'shipping_total' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'discount_total' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'meta' => 'array',
    ];

    protected static function booted(): void
    {
        static::updating(function (self $order) {
            if ($order->getOriginal('delivery_address_snapshot') && $order->isDirty('delivery_address_snapshot')) {
                throw new \LogicException('Delivery address snapshots are immutable.');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all store orders for this order.
     */
    public function storeOrders(): HasMany
    {
        return $this->hasMany(StoreOrder::class);
    }

    public function referralRewards(): HasMany
    {
        return $this->hasMany(ReferralReward::class);
    }

    /**
     * Generate unique order number.
     */
    public static function generateOrderNumber(): string
    {
        $prefix = 'COL';
        $date = now()->format('Ymd');
        $random = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);

        return "{$prefix}-{$date}-{$random}";
    }
}
