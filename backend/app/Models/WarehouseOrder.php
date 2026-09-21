<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseOrder extends Model
{
    public const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    protected $fillable = ['order_number', 'seller_id', 'store_id', 'status', 'payment_status', 'subtotal', 'shipping_fee', 'total', 'seller_wallet_entry_id', 'tracking_number', 'shipping_carrier', 'shipping_notes', 'shipping_address', 'paid_at', 'cancelled_at', 'delivered_at'];
    protected $casts = ['subtotal' => 'decimal:2', 'shipping_fee' => 'decimal:2', 'total' => 'decimal:2', 'shipping_address' => 'array', 'paid_at' => 'datetime', 'cancelled_at' => 'datetime', 'delivered_at' => 'datetime'];
    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function walletEntry(): BelongsTo { return $this->belongsTo(SellerWalletEntry::class, 'seller_wallet_entry_id'); }
    public function items(): HasMany { return $this->hasMany(WarehouseOrderItem::class); }
}
