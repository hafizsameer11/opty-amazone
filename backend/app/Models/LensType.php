<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class LensType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'index',
        'thickness_factor',
        'price_adjustment',
        'is_active',
    ];

    protected $casts = [
        'index' => 'decimal:2',
        'thickness_factor' => 'decimal:2',
        'price_adjustment' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the products that use this lens type.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_lens_types');
    }

    /**
     * Scope a query to only include active lens types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

