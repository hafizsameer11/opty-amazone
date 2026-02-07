<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LensCoating extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'type',
        'description',
        'price_adjustment',
        'is_active',
    ];

    protected $casts = [
        'price_adjustment' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the products that use this lens coating.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_lens_coatings');
    }

    /**
     * Scope a query to only include active coatings.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

