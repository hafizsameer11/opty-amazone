<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PointRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'points_per_euro',
        'fixed_points',
        'min_purchase_amount',
        'max_points_per_transaction',
        'points_expiry_days',
        'redemption_rate',
        'min_redemption_points',
        'max_redemption_per_order',
        'is_active',
        'conditions',
    ];

    protected $casts = [
        'points_per_euro' => 'decimal:2',
        'fixed_points' => 'decimal:2',
        'min_purchase_amount' => 'decimal:2',
        'max_points_per_transaction' => 'decimal:2',
        'redemption_rate' => 'decimal:2',
        'min_redemption_points' => 'decimal:2',
        'max_redemption_per_order' => 'decimal:2',
        'is_active' => 'boolean',
        'conditions' => 'array',
    ];

    /**
     * Get active rule by type.
     */
    public static function getActiveRule(string $type): ?self
    {
        return self::where('type', $type)
            ->where('is_active', true)
            ->first();
    }
}
