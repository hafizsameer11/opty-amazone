<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'coupon_id', 'user_id', 'order_id', 'store_order_id', 'status', 'reservation_key', 'idempotency_key',
        'discount_amount', 'shipping_discount', 'eligible_subtotal', 'order_total', 'snapshot', 'affected_items',
        'redeemed_at', 'released_at', 'refunded_at', 'expires_at',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2', 'shipping_discount' => 'decimal:2',
        'eligible_subtotal' => 'decimal:2', 'order_total' => 'decimal:2',
        'snapshot' => 'array', 'affected_items' => 'array', 'redeemed_at' => 'datetime',
        'released_at' => 'datetime', 'refunded_at' => 'datetime', 'expires_at' => 'datetime',
    ];

    public function coupon(): BelongsTo { return $this->belongsTo(Coupon::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function storeOrder(): BelongsTo { return $this->belongsTo(StoreOrder::class); }
}
