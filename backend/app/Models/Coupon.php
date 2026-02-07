<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'code',
        'description',
        'discount_type',
        'discount_value',
        'max_discount',
        'min_order_amount',
        'usage_limit',
        'usage_per_user',
        'starts_at',
        'ends_at',
        'is_active',
        'applicable_to',
        'conditions',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    /**
     * Get the store that owns the coupon.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get all coupon usages.
     */
    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class);
    }

    /**
     * Get total usage count.
     */
    public function getTotalUsageCountAttribute(): int
    {
        return $this->usages()->count();
    }

    /**
     * Get usage count for a specific user.
     */
    public function getUsageCountForUser(int $userId): int
    {
        return $this->usages()->where('user_id', $userId)->count();
    }

    /**
     * Check if coupon is valid.
     */
    public function isValid(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        if ($this->usage_limit && $this->total_usage_count >= $this->usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Check if coupon can be used by user.
     */
    public function canBeUsedBy(int $userId): bool
    {
        if (!$this->isValid()) {
            return false;
        }

        if ($this->usage_per_user) {
            $userUsageCount = $this->getUsageCountForUser($userId);
            if ($userUsageCount >= $this->usage_per_user) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate discount amount for order total.
     */
    public function calculateDiscount(float $orderTotal): float
    {
        if ($this->min_order_amount && $orderTotal < $this->min_order_amount) {
            return 0;
        }

        $discount = 0;

        switch ($this->discount_type) {
            case 'percentage':
                $discount = ($orderTotal * $this->discount_value) / 100;
                if ($this->max_discount) {
                    $discount = min($discount, $this->max_discount);
                }
                break;
            case 'fixed_amount':
                $discount = min($this->discount_value, $orderTotal);
                break;
            case 'free_shipping':
                // This will be handled separately in order processing
                $discount = 0;
                break;
            case 'bogo':
                // Buy One Get One - handled separately
                $discount = 0;
                break;
        }

        return round($discount, 2);
    }
}
