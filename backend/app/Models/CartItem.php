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
        'product_variant' => 'array',
        'lens_configuration' => 'array',
        'prescription_data' => 'array',
        'treatment_ids' => 'array',
        'price' => 'decimal:2',
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
     * Get the frame size.
     */
    public function frameSize(): BelongsTo
    {
        return $this->belongsTo(FrameSize::class);
    }

    /**
     * Get the prescription.
     */
    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    /**
     * Get the lens thickness material.
     */
    public function lensThicknessMaterial(): BelongsTo
    {
        return $this->belongsTo(LensThicknessMaterial::class);
    }

    /**
     * Get the lens thickness option.
     */
    public function lensThicknessOption(): BelongsTo
    {
        return $this->belongsTo(LensThicknessOption::class);
    }

    /**
     * Calculate line total.
     */
    public function getLineTotalAttribute(): float
    {
        return $this->price * $this->quantity;
    }
}

