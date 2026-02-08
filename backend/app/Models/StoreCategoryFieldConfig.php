<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreCategoryFieldConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'category_id',
        'field_config',
    ];

    protected $casts = [
        'field_config' => 'array',
    ];

    /**
     * Get the store that owns this configuration.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the category for this configuration.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
