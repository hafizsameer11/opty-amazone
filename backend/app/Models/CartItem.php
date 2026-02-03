<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'cart_id',
        'product_id',
        'variant_id',
        'store_id',
        'quantity',
        'price',
        'product_variant',
        'lens_configuration',
        'prescription_data',
    ];

    protected $casts = [
        'product_variant' => 'array',
        'lens_configuration' => 'array',
        'prescription_data' => 'array',
        'price' => 'decimal:2',
    ];

    /**
     * Get the cart.
     */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    /**
     * Get the product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the variant.
     */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /**
     * Get the store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Calculate line total.
     */
    public function getLineTotalAttribute(): float
    {
        return $this->price * $this->quantity;
    }
}

