<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPromotion extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'budget',
        'discount_type',
        'discount_value',
        'applies_to_price',
        'spent',
        'duration_days',
        'start_date',
        'end_date',
        'target_audience',
        'status',
        'views',
        'clicks',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'spent' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'target_audience' => 'array',
        'applies_to_price' => 'boolean',
    ];

    /**
     * Get the store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}

