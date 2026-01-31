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
