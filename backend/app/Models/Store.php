<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Store extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'description',
        'email',
        'phone',
        'profile_image',
        'banner_image',
        'theme_color',
        'phone_visibility',
        'status',
        'is_active',
        'onboarding_status',
        'onboarding_level',
        'onboarding_percent',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'onboarding_level' => 'integer',
        'onboarding_percent' => 'integer',
        'meta' => 'array',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($store) {
            if (empty($store->slug)) {
                $store->slug = Str::slug($store->name);
            }
        });
    }

    /**
     * Get the user that owns the store.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all social links for the store.
     */
    public function socialLinks(): HasMany
    {
        return $this->hasMany(StoreSocialLink::class);
    }

    /**
     * Get all followers of the store.
     */
    public function followers(): HasMany
    {
        return $this->hasMany(StoreFollower::class);
    }

    /**
     * Get all reviews for the store.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(StoreReview::class);
    }

    /**
     * Get all users associated with the store.
     */
    public function storeUsers(): HasMany
    {
        return $this->hasMany(StoreUser::class);
    }

    /**
     * Get the statistics for the store.
     */
    public function statistics(): HasOne
    {
        return $this->hasOne(StoreStatistic::class);
    }

    /**
     * Get the categories associated with the store.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'store_categories');
    }

    /**
     * Get lens types configured for a specific category.
     */
    public function categoryLensTypes(int $categoryId): BelongsToMany
    {
        return $this->belongsToMany(LensType::class, 'store_category_lens_types', 'store_id', 'lens_type_id')
            ->wherePivot('category_id', $categoryId)
            ->withTimestamps();
    }

    /**
     * Get lens treatments configured for a specific category.
     */
    public function categoryLensTreatments(int $categoryId): BelongsToMany
    {
        return $this->belongsToMany(LensTreatment::class, 'store_category_lens_treatments', 'store_id', 'lens_treatment_id')
            ->wherePivot('category_id', $categoryId)
            ->withTimestamps();
    }

    /**
     * Get lens coatings configured for a specific category.
     */
    public function categoryLensCoatings(int $categoryId): BelongsToMany
    {
        return $this->belongsToMany(LensCoating::class, 'store_category_lens_coatings', 'store_id', 'lens_coating_id')
            ->wherePivot('category_id', $categoryId)
            ->withTimestamps();
    }

    /**
     * Get lens thickness materials configured for a specific category.
     */
    public function categoryLensThicknessMaterials(int $categoryId): BelongsToMany
    {
        return $this->belongsToMany(LensThicknessMaterial::class, 'store_category_lens_thickness_materials', 'store_id', 'lens_thickness_material_id')
            ->wherePivot('category_id', $categoryId)
            ->withTimestamps();
    }

    /**
     * Get lens thickness options configured for a specific category.
     */
    public function categoryLensThicknessOptions(int $categoryId): BelongsToMany
    {
        return $this->belongsToMany(LensThicknessOption::class, 'store_category_lens_thickness_options', 'store_id', 'lens_thickness_option_id')
            ->wherePivot('category_id', $categoryId)
            ->withTimestamps();
    }

    /**
     * Get the URL for the store's profile image.
     */
    public function getProfileImageUrlAttribute(): ?string
    {
        if (!$this->profile_image) {
            return null;
        }

        return Storage::url($this->profile_image);
    }

    /**
     * Get the URL for the store's banner image.
     */
    public function getBannerImageUrlAttribute(): ?string
    {
        if (!$this->banner_image) {
            return null;
        }

        return Storage::url($this->banner_image);
    }
}
