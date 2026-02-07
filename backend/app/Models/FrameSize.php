<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FrameSize extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'lens_width',
        'bridge_width',
        'temple_length',
        'frame_width',
        'frame_height',
        'size_label',
        'stock_quantity',
        'stock_status',
    ];

    protected $casts = [
        'lens_width' => 'decimal:2',
        'bridge_width' => 'decimal:2',
        'temple_length' => 'decimal:2',
        'frame_width' => 'decimal:2',
        'frame_height' => 'decimal:2',
        'stock_quantity' => 'integer',
    ];

    /**
     * Get the product that owns the frame size.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get formatted size string (e.g., "50-20-140").
     */
    public function getFormattedSizeAttribute(): string
    {
        return sprintf(
            '%s-%s-%s',
            number_format($this->lens_width, 0),
            number_format($this->bridge_width, 0),
            number_format($this->temple_length, 0)
        );
    }
}

