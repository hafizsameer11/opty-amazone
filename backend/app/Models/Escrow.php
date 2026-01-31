<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Escrow extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'store_order_id',
        'amount',
        'shipping_fee',
        'status',
        'locked_at',
        'released_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'locked_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    /**
     * Get the parent order.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the store order.
     */
    public function storeOrder(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class);
    }
}

