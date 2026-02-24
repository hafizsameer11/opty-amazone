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
        // New specific fields
        'frame_size_id',
        'prescription_id',
        'lens_index',
        'lens_type',
        'lens_thickness_material_id',
        'lens_thickness_option_id',
        'treatment_ids',
        'lens_coatings',
        'photochromic_color_id',
        'prescription_sun_color_id',
        'progressive_variant_id',
        // Contact lens fields
        'contact_lens_left_base_curve',
        'contact_lens_left_diameter',
        'contact_lens_left_power',
        'contact_lens_left_qty',
        'contact_lens_left_cylinder',
        'contact_lens_left_axis',
        'contact_lens_right_base_curve',
        'contact_lens_right_diameter',
        'contact_lens_right_power',
        'contact_lens_right_qty',
        'contact_lens_right_cylinder',
        'contact_lens_right_axis',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'product_variant' => 'array',
        'lens_configuration' => 'array',
        'prescription_data' => 'array',
        'product_images' => 'array',
        'treatment_ids' => 'array',
        'lens_index' => 'decimal:2',
        'contact_lens_left_base_curve' => 'decimal:2',
        'contact_lens_left_diameter' => 'decimal:2',
        'contact_lens_left_power' => 'decimal:2',
        'contact_lens_left_cylinder' => 'decimal:2',
        'contact_lens_right_base_curve' => 'decimal:2',
        'contact_lens_right_diameter' => 'decimal:2',
        'contact_lens_right_power' => 'decimal:2',
        'contact_lens_right_cylinder' => 'decimal:2',
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

