<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, SoftDeletes;

    protected static function booted(): void
    {
        static::created(function (self $user) {
            // Keep code allocation independent of wallets/points. The schema guard
            // makes deployments safe while the migration is being applied.
            if ($user->isBuyer() && Schema::hasTable('referral_codes')) {
                app(\App\Services\Referrals\ReferralService::class)->ensureBuyerCode($user);
            }
        });
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Check if user is a buyer
     */
    public function isBuyer(): bool
    {
        return $this->role === 'buyer';
    }

    /**
     * Check if user is a seller
     */
    public function isSeller(): bool
    {
        return $this->role === 'seller';
    }

    /**
     * Check if user is an admin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Get all addresses for the user.
     */
    public function addresses()
    {
        return $this->hasMany(UserAddress::class);
    }

    /**
     * Get the store owned by the user (for sellers).
     */
    public function store()
    {
        return $this->hasOne(Store::class);
    }

    /**
     * Get stores the user is associated with (multi-user support).
     */
    public function storeUsers()
    {
        return $this->hasMany(StoreUser::class);
    }

    /**
     * Get stores the user follows (for buyers).
     */
    public function followedStores()
    {
        return $this->hasMany(StoreFollower::class);
    }

    /**
     * Get store reviews written by the user.
     */
    public function storeReviews()
    {
        return $this->hasMany(StoreReview::class);
    }

    public function productReviews() { return $this->hasMany(ProductReview::class); }
    public function wishlistItems() { return $this->hasMany(WishlistItem::class); }
    public function supportTickets() { return $this->hasMany(SupportTicket::class); }
    public function orders() { return $this->hasMany(Order::class); }

    /**
     * Get the user's wallet.
     */
    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Get point transactions for the user.
     */
    public function pointTransactions()
    {
        return $this->hasMany(PointTransaction::class);
    }

    /** Financial referrals deliberately use the existing wallet, not PointService. */
    public function referralCode()
    {
        return $this->hasOne(ReferralCode::class);
    }

    public function referralConversion()
    {
        return $this->hasOne(ReferralConversion::class, 'referred_user_id');
    }

    public function referralsMade()
    {
        return $this->hasMany(ReferralConversion::class, 'referrer_user_id');
    }

    public function referralRewardsEarned()
    {
        return $this->hasMany(ReferralReward::class, 'referrer_user_id');
    }

    /**
     * Get the URL for the user's profile image.
     */
    public function getProfileImageUrlAttribute(): ?string
    {
        if (!$this->profile_image) {
            return null;
        }

        return Storage::url($this->profile_image);
    }
}
