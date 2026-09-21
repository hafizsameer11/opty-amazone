<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Coupon extends Model
{
    use HasFactory, SoftDeletes;

    public const SCOPES = ['store', 'products', 'categories', 'variants'];
    public const TYPES = ['percentage', 'fixed_amount', 'free_shipping'];

    protected $fillable = [
        'store_id', 'code', 'description', 'discount_type', 'scope', 'discount_value',
        'min_order_amount', 'usage_limit', 'usage_per_user', 'starts_at', 'ends_at', 'schedule_timezone', 'is_active',
        'status', 'is_public', 'followers_only', 'first_order_only', 'applicable_to', 'conditions',
        'archived_at', 'admin_disabled_at', 'admin_disabled_by', 'rule_snapshot',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2', 'min_order_amount' => 'decimal:2',
        'is_active' => 'boolean', 'is_public' => 'boolean', 'followers_only' => 'boolean',
        'first_order_only' => 'boolean', 'starts_at' => 'datetime', 'ends_at' => 'datetime',
        'archived_at' => 'datetime', 'admin_disabled_at' => 'datetime', 'rule_snapshot' => 'array',
    ];

    protected $appends = ['resolved_status'];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function usages(): HasMany { return $this->hasMany(CouponUsage::class); }
    public function products(): BelongsToMany { return $this->belongsToMany(Product::class, 'coupon_products')->withTimestamps(); }
    public function categories(): BelongsToMany { return $this->belongsToMany(Category::class, 'coupon_categories')->withTimestamps(); }
    public function variants(): BelongsToMany { return $this->belongsToMany(ProductVariant::class, 'coupon_variants')->withTimestamps(); }
    public function audits(): HasMany { return $this->hasMany(CouponAudit::class); }

    public function getResolvedStatusAttribute(): string
    {
        if ($this->trashed() || $this->archived_at) return 'archived';
        if ($this->admin_disabled_at) return 'disabled';
        if ($this->ends_at?->isPast()) return 'expired';
        if ($this->starts_at?->isFuture()) return 'scheduled';
        if ($this->usage_limit && ($this->usage_count + $this->reserved_count) >= $this->usage_limit) return 'exhausted';
        if ($this->status === 'paused') return 'paused';
        if (! $this->is_active || $this->status === 'inactive') return 'inactive';

        return 'active';
    }

    public function isAvailableNow(): bool { return $this->resolved_status === 'active'; }
}
