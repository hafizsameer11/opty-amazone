<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSocialLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'platform',
        'url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the store that owns the social link.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
