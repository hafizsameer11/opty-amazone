<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'color_name',
        'color_code',
        'images',
        'price',
        'barcode',
        'purchase_code',
        'stock_quantity',
        'stock_status',
        'is_default',
        'sort_order',
    ];

    protected $casts = [
        'images' => 'array',
        'price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'is_default' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the product that owns the variant.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** Frame sizes belonging to this color. */
    public function frameSizes(): HasMany
    {
        return $this->hasMany(FrameSize::class, 'product_variant_id')->orderBy('lens_width')->orderBy('id');
    }

    /** Recalculate color stock from its sizes (when sizes exist). */
    public function syncStockFromSizes(): void
    {
        $sizes = $this->frameSizes()->get(['stock_quantity', 'stock_status']);
        if ($sizes->isEmpty()) {
            return;
        }
        $total = (int) $sizes->sum('stock_quantity');
        $this->stock_quantity = $total;
        $this->stock_status = $total > 0 ? 'in_stock' : 'out_of_stock';
        $this->save();
    }

    /**
     * Scope a query to only include default variants.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope a query to only include in-stock variants.
     */
    public function scopeInStock($query)
    {
        return $query->where('stock_status', 'in_stock');
    }

    /**
     * A colour is a visual/stock variation, never a separate price tier.
     * Pack-based contact-lens options are not colour variants and retain
     * their existing price behavior for backwards compatibility.
     */
    public function getEffectivePriceAttribute()
    {
        $product = $this->product;

        if (in_array($product?->product_type, ['frame', 'sunglasses'], true)) {
            return $product->price;
        }

        return $this->price ?? $product?->price;
    }
}

