<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'parent_id',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the parent category.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Get child categories.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Get products in this category.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Get lens types configured for this category by a specific store.
     */
    public function storeLensTypes(int $storeId): BelongsToMany
    {
        return $this->belongsToMany(LensType::class, 'store_category_lens_types', 'category_id', 'lens_type_id')
            ->wherePivot('store_id', $storeId)
            ->withTimestamps();
    }

    /**
     * Get lens treatments configured for this category by a specific store.
     */
    public function storeLensTreatments(int $storeId): BelongsToMany
    {
        return $this->belongsToMany(LensTreatment::class, 'store_category_lens_treatments', 'category_id', 'lens_treatment_id')
            ->wherePivot('store_id', $storeId)
            ->withTimestamps();
    }

    /**
     * Get lens coatings configured for this category by a specific store.
     */
    public function storeLensCoatings(int $storeId): BelongsToMany
    {
        return $this->belongsToMany(LensCoating::class, 'store_category_lens_coatings', 'category_id', 'lens_coating_id')
            ->wherePivot('store_id', $storeId)
            ->withTimestamps();
    }

    /**
     * Get lens thickness materials configured for this category by a specific store.
     */
    public function storeLensThicknessMaterials(int $storeId): BelongsToMany
    {
        return $this->belongsToMany(LensThicknessMaterial::class, 'store_category_lens_thickness_materials', 'category_id', 'lens_thickness_material_id')
            ->wherePivot('store_id', $storeId)
            ->withTimestamps();
    }

    /**
     * Get lens thickness options configured for this category by a specific store.
     */
    public function storeLensThicknessOptions(int $storeId): BelongsToMany
    {
        return $this->belongsToMany(LensThicknessOption::class, 'store_category_lens_thickness_options', 'category_id', 'lens_thickness_option_id')
            ->wherePivot('store_id', $storeId)
            ->withTimestamps();
    }
}

