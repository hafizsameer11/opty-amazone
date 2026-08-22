<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreBanner extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'image',
        'title',
        'link',
        'position',
        'sort_order',
        'is_active',
        'is_home_boosted',
        'is_approved',
        'rejection_reason',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_home_boosted' => 'boolean',
        'is_approved' => 'boolean',
    ];

    /**
     * Get the store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}

