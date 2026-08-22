<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductSizeVolume extends Model
{
    protected $fillable = [
        'product_id',
        'size_volume',
        'pack_type',
        'price',
        'compare_at_price',
        'cost_price',
        'stock_quantity',
        'stock_status',
        'sku',
        'expiry_date',
        'image_url',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'expiry_date' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
