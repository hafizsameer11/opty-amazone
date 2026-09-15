<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StoreOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'redeemed_points', 'reward_points', 'payment_status', 'financial_version', 'delivery_address_snapshot', 'discount_total',
        'quote_key', 'quote_fingerprint', 'delivery_code_hash', 'delivery_code_encrypted',
        'delivery_code_expires_at', 'delivery_code_issued_at', 'delivery_code_attempts',
        'delivery_code_locked_until', 'delivery_verified_at', 'inventory_restored_at',
        'dispute_previous_status', 'dispute_reason',
        'order_id',
        'store_id',
        'status',
        'subtotal',
        'delivery_fee',
        'total',
        'delivery_code',
        'estimated_delivery_date',
        'delivery_method',
        'delivery_notes',
        'rejection_reason',
        'delivery_address_id',
        'accepted_at',
        'paid_at',
        'out_for_delivery_at',
        'delivered_at',
    ];

    protected $casts = [
        'delivery_address_snapshot' => 'array', 'discount_total' => 'decimal:2',
        'delivery_code_expires_at' => 'datetime', 'delivery_code_issued_at' => 'datetime',
        'delivery_code_locked_until' => 'datetime', 'delivery_verified_at' => 'datetime',
        'inventory_restored_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'total' => 'decimal:2',
        'estimated_delivery_date' => 'date',
        'accepted_at' => 'datetime',
        'paid_at' => 'datetime',
        'out_for_delivery_at' => 'datetime',
        'delivered_at' => 'datetime',
    ];

    protected $hidden = ['delivery_code', 'delivery_code_hash', 'delivery_code_encrypted', 'quote_fingerprint'];

    protected static function booted(): void
    {
        static::updating(function (self $order) {
            if ($order->getOriginal('delivery_address_snapshot') && $order->isDirty('delivery_address_snapshot')) {
                throw new \LogicException('Delivery address snapshots are immutable.');
            }
        });
    }

    public function payment(): HasOne
    {
        return $this->hasOne(MarketplacePayment::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the delivery address.
     */
    public function deliveryAddress(): BelongsTo
    {
        return $this->belongsTo(UserAddress::class, 'delivery_address_id');
    }

    /**
     * Get all order items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the escrow for this store order.
     */
    public function escrow(): HasOne
    {
        return $this->hasOne(Escrow::class);
    }

    /**
     * Generate delivery code (OTP).
     */
    public static function generateDeliveryCode(): string
    {
        return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
