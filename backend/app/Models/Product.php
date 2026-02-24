<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'store_id',
        'category_id',
        'sub_category_id',
        'name',
        'slug',
        'sku',
        'description',
        'short_description',
        'product_type',
        'price',
        'compare_at_price',
        'sale_start_date',
        'sale_end_date',
        'cost_price',
        'stock_quantity',
        'stock_status',
        'images',
        'frame_shape',
        'frame_material',
        'frame_color',
        'gender',
        'lens_type',
        'lens_index_options',
        'treatment_options',
        'rating',
        'review_count',
        'view_count',
        'is_featured',
        'is_active',
        'is_approved',
        'rejection_reason',
        'meta_title',
        'meta_description',
        'meta_keywords',
        // Contact Lens Specific Fields
        'base_curve_options',
        'diameter_options',
        'powers_range',
        'replacement_frequency',
        'contact_lens_brand',
        'contact_lens_color',
        'contact_lens_material',
        'contact_lens_type',
        'has_uv_filter',
        'can_sleep_with',
        'water_content',
        'is_medical_device',
        // Eye Hygiene Specific Fields
        'size_volume',
        'pack_type',
        'expiry_date',
        // Additional Fields
        'model_3d_url',
        'try_on_image',
        'color_images',
        'mm_calibers',
        'lens_colors',
        'lens_area_coordinates',
    ];

    protected $casts = [
        'images' => 'array',
        'lens_index_options' => 'array',
        'treatment_options' => 'array',
        'base_curve_options' => 'array',
        'diameter_options' => 'array',
        'powers_range' => 'array',
        'color_images' => 'array',
        'mm_calibers' => 'array',
        'lens_colors' => 'array',
        'lens_area_coordinates' => 'array',
        'price' => 'decimal:2',
        'compare_at_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'rating' => 'decimal:2',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'is_approved' => 'boolean',
        'has_uv_filter' => 'boolean',
        'can_sleep_with' => 'boolean',
        'is_medical_device' => 'boolean',
        'expiry_date' => 'datetime',
        'sale_start_date' => 'datetime',
        'sale_end_date' => 'datetime',
    ];

    /**
     * Get the store that owns the product.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the category.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Get the sub category.
     */
    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'sub_category_id');
    }

    /**
     * Get the product variants.
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Get the default variant.
     */
    public function defaultVariant()
    {
        return $this->hasOne(ProductVariant::class)->where('is_default', true);
    }

    /**
     * Get the first variant or default variant.
     */
    public function getFirstVariant()
    {
        return $this->variants()->where('is_default', true)->first() ?? $this->variants()->first();
    }

    /**
     * Get the frame sizes for this product.
     */
    public function frameSizes(): HasMany
    {
        return $this->hasMany(FrameSize::class);
    }

    /**
     * Get the lens types available for this product.
     */
    public function lensTypes(): BelongsToMany
    {
        return $this->belongsToMany(LensType::class, 'product_lens_types');
    }

    /**
     * Get the lens coatings available for this product.
     */
    public function lensCoatings(): BelongsToMany
    {
        return $this->belongsToMany(LensCoating::class, 'product_lens_coatings');
    }
}

