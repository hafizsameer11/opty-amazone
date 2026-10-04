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

    /**
     * Mirrors the `stores.status` enum. `pending` is the "awaiting admin
     * review" state for both a brand-new registration and a submitted
     * verification, which is why the admin lifecycle keys off this column
     * alone rather than `onboarding_status`.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_ACTIVE,
        self::STATUS_SUSPENDED,
        self::STATUS_REJECTED,
    ];

    public const ONBOARDING_PENDING = 'pending';
    public const ONBOARDING_IN_PROGRESS = 'in_progress';
    public const ONBOARDING_PENDING_REVIEW = 'pending_review';
    public const ONBOARDING_APPROVED = 'approved';
    public const ONBOARDING_REJECTED = 'rejected';

    /** A registration is awaiting an admin decision. */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    /** Moderation/rejection reasons live in the unindexed `meta` JSON column. */
    public function rejectionReason(): ?string
    {
        $reason = data_get($this->meta, 'rejection_reason');

        return is_string($reason) && trim($reason) !== '' ? $reason : null;
    }

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
        'low_stock_threshold',
        'bank_account_holder',
        'bank_name',
        'verification_submitted_at',
        'store_setup_completed_at',
        'meta',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'onboarding_level' => 'integer',
        'onboarding_percent' => 'integer',
        'low_stock_threshold' => 'integer',
        'verification_submitted_at' => 'datetime',
        'store_setup_completed_at' => 'datetime',
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

    /** Buyer reports stay attached to the store for moderation/audit history. */
    public function reports(): HasMany
    {
        return $this->hasMany(StoreReport::class);
    }

    /** Seller requests to restore a suspended store. */
    public function reinstatementRequests(): HasMany
    {
        return $this->hasMany(StoreReinstatementRequest::class);
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

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function storeOrders(): HasMany
    {
        return $this->hasMany(StoreOrder::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(StoreAnnouncement::class);
    }

    public function banners(): HasMany
    {
        return $this->hasMany(StoreBanner::class);
    }

    public function sellerWallet(): HasOne
    {
        return $this->hasOne(SellerWallet::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function referralCampaigns(): HasMany
    {
        return $this->hasMany(ReferralCampaign::class);
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

        // Store uploads are written to the public disk. Resolving the URL
        // through the default disk can point at the private filesystem and
        // produce an unusable image URL when FILESYSTEM_DISK is `local`.
        return Storage::disk('public')->url($this->profile_image);
    }

    /**
     * Get the URL for the store's banner image.
     */
    public function getBannerImageUrlAttribute(): ?string
    {
        if (!$this->banner_image) {
            return null;
        }

        return Storage::disk('public')->url($this->banner_image);
    }
}
