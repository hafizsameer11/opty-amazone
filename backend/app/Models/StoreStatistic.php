<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreStatistic extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'total_views',
        'total_clicks',
        'total_orders',
        'total_revenue',
        'total_products',
        'total_followers',
        'total_reviews',
        'average_rating',
        'last_calculated_at',
    ];

    protected $casts = [
        'total_views' => 'integer',
        'total_clicks' => 'integer',
        'total_orders' => 'integer',
        'total_revenue' => 'decimal:2',
        'total_products' => 'integer',
        'total_followers' => 'integer',
        'total_reviews' => 'integer',
        'average_rating' => 'decimal:2',
        'last_calculated_at' => 'datetime',
    ];

    /**
     * Get the store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
