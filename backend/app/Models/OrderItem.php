<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_order_id',
        'product_id',
        'variant_id',
        'quantity',
        'price',
        'line_total',
        'product_name',
        'product_sku',
        'product_variant',
        'lens_configuration',
        'prescription_data',
        'product_images',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'product_variant' => 'array',
        'lens_configuration' => 'array',
        'prescription_data' => 'array',
        'product_images' => 'array',
    ];

    /**
     * Get the store order.
     */
    public function storeOrder(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class);
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
}

